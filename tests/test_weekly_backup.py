import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
spec = importlib.util.spec_from_file_location('weekly', SCRIPTS / 'meg-stage09-weekly-backup.py')
weekly = importlib.util.module_from_spec(spec)
spec.loader.exec_module(weekly)


class WeeklyBackupTests(unittest.TestCase):
    def fixture(self, folder):
        archive = folder / 'meg-financas-full-20261114T120000Z-123.pgdump.age'
        archive.write_bytes(b'FICTITIOUS-ENCRYPTED-ARCHIVE-FOR-COPY-CONTRACT')
        manifest = folder / 'meg-financas-full-20261114T120000Z-123.manifest.txt'
        fields = dict(project_ref=weekly.PROJECT, archive_name=archive.name,
                      archive_verified='age_decrypt_and_pg_restore_list', public_table_count=32,
                      archive_size_bytes=archive.stat().st_size, archive_sha256=weekly.digest(archive))
        manifest.write_text('\n'.join(f'{k}={v}' for k, v in fields.items()))
        return archive, manifest

    def test_copy_only_encrypted_pair_and_no_claim_of_cloud_upload(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); source = root / 'source'; source.mkdir()
            archive, manifest = self.fixture(source)
            (source / 'identity.txt').write_text('PRIVATE-IDENTITY-MUST-NOT-BE-COPIED')
            result = weekly.copy_encrypted_pair(source, root / 'cloud')
            self.assertTrue(result['encrypted_copy_hash_verified'])
            self.assertFalse(result['remote_upload_verified'])
            self.assertEqual({p.name for p in (root / 'cloud').iterdir()}, {archive.name, manifest.name})
            with self.assertRaises(FileExistsError):
                weekly.copy_encrypted_pair(source, root / 'cloud')

    def test_corrupt_or_wrong_project_archive_is_not_copied(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); source = root / 'source'; source.mkdir()
            archive, manifest = self.fixture(source)
            archive.write_bytes(b'TRUNCATED')
            with self.assertRaises(ValueError):
                weekly.copy_encrypted_pair(source, root / 'cloud')
            self.assertFalse((root / 'cloud').exists())
            archive, manifest = self.fixture(source)
            manifest.write_text(manifest.read_text().replace(weekly.PROJECT, 'another-project'))
            with self.assertRaises(ValueError):
                weekly.copy_encrypted_pair(source, root / 'cloud')

    def test_manifest_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); _, manifest = self.fixture(root)
            manifest.write_text(manifest.read_text().replace('archive_name=meg-', 'archive_name=../meg-'))
            with self.assertRaises(ValueError):
                weekly.manifest_pair(root)

    def test_no_second_automatic_attempt_same_day(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(weekly.Path, 'home', return_value=Path(tmp)):
            root = Path(tmp) / '.meg-stage09-weekly'; root.mkdir(mode=0o700)
            (root / 'last-attempt.txt').write_text(weekly.dt.datetime.now(weekly.dt.timezone.utc).date().isoformat())
            with patch.object(weekly.subprocess, 'run', side_effect=AssertionError('must not connect')):
                self.assertEqual(weekly.run({}, 'SECRET')['status'], 'ATTEMPT_ALREADY_MADE_TODAY')

    def test_weekly_due_guard_does_not_connect(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(weekly.Path, 'home', return_value=Path(tmp)):
            root = Path(tmp) / '.meg-stage09-weekly'; root.mkdir(mode=0o700)
            (root / 'last-success.json').write_text(json.dumps({'created_at_utc':weekly.dt.datetime.now(weekly.dt.timezone.utc).isoformat()}))
            with patch.object(weekly.subprocess, 'run', side_effect=AssertionError('must not connect')):
                self.assertEqual(weekly.run({}, 'SECRET')['status'], 'NOT_DUE')

    def test_stdout_cannot_leak_password_or_private_exception(self):
        with patch.object(weekly.sys, 'stdin', io.StringIO('invalid input PASSWORD-SECRET')):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                self.assertEqual(weekly.main(), 1)
            self.assertNotIn('PASSWORD-SECRET', out.getvalue())
            self.assertEqual(json.loads(out.getvalue())['status'], 'FAILED_REQUIRES_LOCAL_REVIEW')

    def test_ps1_keeps_credential_out_of_argv_and_no_executionpolicy_bypass(self):
        installer = (SCRIPTS / 'MEG-INSTALAR-BACKUP-SEMANAL.ps1').read_text()
        runner = (SCRIPTS / 'MEG-EXECUTAR-BACKUP-SEMANAL.ps1').read_text()
        self.assertIn('Export-Clixml', installer)
        self.assertIn('-LogonType Interactive -RunLevel Limited', installer)
        self.assertIn('-StartWhenAvailable', installer)
        self.assertIn('FIRST_BACKUP_FAILED_TASK_NOT_REGISTERED', installer)
        self.assertIn('$encoded | & wsl.exe', runner)
        self.assertNotIn('-ExecutionPolicy Bypass', installer + runner)


if __name__ == '__main__':
    unittest.main()
