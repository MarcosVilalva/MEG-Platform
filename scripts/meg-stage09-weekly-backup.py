#!/usr/bin/env python3
"""Private WSL runner. Credential arrives on stdin, never on argv or disk.

Copies only encrypted archives + manifests. A OneDrive local copy is NOT
evidence of a completed remote upload. No restore or Vault operation here.
"""
import base64
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import fcntl

PROJECT = "ugbiqzaqnrhulhetevby"


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def manifest_pair(folder):
    manifests = list(Path(folder).glob("*.manifest.txt"))
    if len(manifests) != 1:
        raise ValueError("MANIFEST_COUNT")
    manifest = manifests[0]
    fields = dict(line.split("=", 1) for line in manifest.read_text().splitlines() if "=" in line)
    name = fields.get("archive_name", "")
    if not re.fullmatch(r"meg-financas-full-[0-9TZ]+-[0-9]+\.pgdump\.age", name):
        raise ValueError("ARCHIVE_NAME")
    archive = manifest.parent / name
    if archive.is_symlink() or manifest.is_symlink() or not archive.is_file():
        raise ValueError("ARCHIVE_FILE")
    if fields.get("project_ref") != PROJECT:
        raise ValueError("PROJECT_REF")
    if fields.get("archive_verified") != "age_decrypt_and_pg_restore_list":
        raise ValueError("ARCHIVE_NOT_VERIFIED")
    if int(fields.get("public_table_count", "0")) <= 0:
        raise ValueError("PUBLIC_TABLES")
    if archive.stat().st_size <= 0 or archive.stat().st_size != int(fields["archive_size_bytes"]):
        raise ValueError("ARCHIVE_SIZE")
    if not re.fullmatch(r"[0-9a-f]{64}", fields.get("archive_sha256", "")):
        raise ValueError("HASH_FORMAT")
    if digest(archive) != fields["archive_sha256"]:
        raise ValueError("ARCHIVE_HASH")
    return archive, manifest


def copy_encrypted_pair(source, destination):
    archive, manifest = manifest_pair(source)
    destination = Path(destination)
    destination.mkdir(mode=0o700, parents=False, exist_ok=False)
    for item in (archive, manifest):
        target = destination / item.name
        with open(item, "rb") as src, open(target, "xb") as dst:
            shutil.copyfileobj(src, dst)
            dst.flush()
            os.fsync(dst.fileno())
        if digest(item) != digest(target):
            raise ValueError("COPY_HASH")
    manifest_pair(destination)
    return {"encrypted_copy_hash_verified": True, "remote_upload_verified": False}


def run(config, password, force=False):
    root = Path.home() / ".meg-stage09-weekly"
    root.mkdir(mode=0o700, exist_ok=True)
    if root.is_symlink() or root.stat().st_uid != os.getuid() or root.stat().st_mode & 0o077:
        raise ValueError("PRIVATE_DIRECTORY_REQUIRED")
    with open(root / "lock", "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        now = dt.datetime.now(dt.timezone.utc)
        success_file = root / "last-success.json"
        attempt_file = root / "last-attempt.txt"
        if not force:
            if success_file.exists():
                previous = json.loads(success_file.read_text())
                age = (now - dt.datetime.fromisoformat(previous["created_at_utc"])).total_seconds()
                if 0 <= age < 7 * 86400:
                    return {"status": "NOT_DUE", "remote_upload_verified": False}
            if attempt_file.exists() and attempt_file.read_text().strip() == now.date().isoformat():
                return {"status": "ATTEMPT_ALREADY_MADE_TODAY", "remote_upload_verified": False}

        host = config["host"]
        if host == f"db.{PROJECT}.supabase.co":
            username = "postgres"
        elif re.fullmatch(r"[a-zA-Z0-9.-]+\.pooler\.supabase\.com", host):
            username = f"postgres.{PROJECT}"
        else:
            raise ValueError("HOST_NOT_ALLOWED")
        identity = Path(config["identity"])
        ca = Path(config["ca"])
        for path in (identity, ca):
            if not path.is_absolute() or not path.is_file() or not path.stat().st_size:
                raise ValueError("PRIVATE_PREREQUISITE_MISSING")
        if identity.is_symlink() or identity.stat().st_uid != os.getuid() or identity.stat().st_mode & 0o077:
            raise ValueError("IDENTITY_PERMISSIONS")
        script = Path(__file__).with_name("meg-stage09-safe-backup.sh")
        if digest(script) != config["backup_sha256"]:
            raise ValueError("BACKUP_SCRIPT_HASH")
        recipient = subprocess.run(["age-keygen", "-y", str(identity)], capture_output=True, text=True, timeout=15)
        if recipient.returncode or not recipient.stdout.strip().startswith("age1"):
            raise ValueError("AGE_IDENTITY_UNAVAILABLE")
        cloud = Path(config["onedrive_linux"])
        if not str(cloud).startswith("/mnt/") or not cloud.is_dir():
            raise ValueError("ONEDRIVE_LOCAL_FOLDER_MISSING")
        if identity.resolve().is_relative_to(cloud.resolve()):
            raise ValueError("IDENTITY_MUST_NOT_BE_IN_ONEDRIVE")
        cloud_root = cloud / "MEG-Backups-Semanais"
        cloud_root.mkdir(exist_ok=True)
        stamp = now.strftime("%Y%m%dT%H%M%SZ")
        target = cloud_root / (stamp + "-" + str(os.getpid()))
        local = root / ("backup-" + stamp + "-" + str(os.getpid()))
        local.mkdir(mode=0o700)
        env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
        env.update(PGHOST=host, PGUSER=username, PGPASSWORD=password, PGPORT="5432", PGDATABASE="postgres",
                   PGSSLMODE="verify-full", PGSSLROOTCERT=str(ca), PGCONNECT_TIMEOUT="15",
                   MEG_BACKUP_DIR=str(local), MEG_AGE_IDENTITY=str(identity),
                   MEG_AGE_RECIPIENT=recipient.stdout.strip())
        attempt_file.write_text(now.date().isoformat())
        # Do not emit subprocess output: it may contain private filesystem paths.
        result = subprocess.run(["bash", str(script)], env=env, stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL, timeout=2400)
        env.pop("PGPASSWORD", None)
        if result.returncode:
            raise ValueError("BACKUP_FAILED_NO_AUTOMATIC_RETRY")
        evidence = copy_encrypted_pair(local, target)
        report = {"status": "ENCRYPTED_BACKUP_AND_LOCAL_ONEDRIVE_COPY_OK",
                  "created_at_utc": now.isoformat(), **evidence,
                  "restore_this_archive_tested": False, "vault_root_key_included": False}
        temporary = root / "last-success.tmp"
        temporary.write_text(json.dumps(report, indent=2))
        temporary.replace(success_file)
        (target / "receipt.json").write_text(json.dumps(report, indent=2))
        return report


def main():
    try:
        request = json.loads(base64.b64decode(sys.stdin.read().strip(), validate=True))
        config = request["config"]
        password = request.pop("password")
        result = run(config, password, request.get("force", False))
        del password
        print(json.dumps(result))
        return 0
    except Exception:
        # No exception text, connection strings, paths or secrets in task logs.
        print(json.dumps({"status": "FAILED_REQUIRES_LOCAL_REVIEW", "remote_upload_verified": False}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
