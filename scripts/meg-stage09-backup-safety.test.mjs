import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const sourceDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const testDir = mkdtempSync(join(tmpdir(), 'meg-backup-contract-'));
const bin = join(testDir, 'bin');
const target = join(testDir, 'external-offsite-placeholder');
const vaultTarget = join(testDir, 'separate-vault-offsite-placeholder');
mkdirSync(bin);
mkdirSync(target);
mkdirSync(vaultTarget);
const ageKey = join(testDir, 'recovery-key-only-for-tests.txt');
writeFileSync(ageKey, 'AGE-SECRET-KEY-FAKE-FOR-TESTS\n');
const restoredFlag = join(testDir, 'is-restored');
const mock = (name, source) => {
  const f = join(bin, name);
  writeFileSync(f, `#!/usr/bin/env node\n${source}`);
  chmodSync(f, 0o755);
};
mock('psql', `
const args=process.argv.slice(2); const q=args[args.indexOf('-Atc')+1]||'';
if (q.includes('current_database')) console.log('postgres');
else if (q.includes('count(*)')) console.log(process.env.PGDATABASE==='meg_restore_drill' ? (require('node:fs').existsSync(process.env.MEG_MOCK_RESTORED_FLAG)?'32':'0'):'32');
else process.exit(44);
`);
mock('pg_dump', `process.stdout.write('MOCK-PGDUMP-ARCHIVE-ONLY-TEST-DATA');`);
mock('curl', `
process.stdin.resume();
process.stdin.on('end',()=>process.stdout.write('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'));
`);
mock('age', `
const fs=require('node:fs'); const args=process.argv.slice(2);
if (args.includes('-d')) {
  const file=args[args.length-1],v=fs.readFileSync(file,'utf8');
  if(!v.startsWith('MOCK-AGE-ENCRYPTED:')) process.exit(40);
  process.stdout.write(v.replace(/^MOCK-AGE-ENCRYPTED:/,''));
} else {
  const dest=args[args.indexOf('-o')+1];
  let data='';process.stdin.setEncoding('utf8');
  process.stdin.on('data',c=>data+=c);
  process.stdin.on('end',()=>fs.writeFileSync(dest,'MOCK-AGE-ENCRYPTED:'+data));
}
`);
mock('pg_restore', `
const fs=require('node:fs'); let v='';
process.stdin.setEncoding('utf8');process.stdin.on('data',c=>v+=c);
process.stdin.on('end',()=>{
  if(v!=='MOCK-PGDUMP-ARCHIVE-ONLY-TEST-DATA') process.exit(55);
  if(process.argv.includes('--list')) {
    console.log('1; 0 1 TABLE DATA public Transaction postgres');
    console.log('2; 0 1 TABLE DATA vault secrets postgres');
  } else fs.writeFileSync(process.env.MEG_MOCK_RESTORED_FLAG,'YES');
});
`);
const env = {
  ...process.env,
  PATH: `${bin}:${process.env.PATH}`,
  PGHOST: 'db.ugbiqzaqnrhulhetevby.supabase.co', PGUSER: 'postgres',
  PGPASSWORD: 'DUMMY-ONLY-FOR-FAKE-TEST', PGSSLMODE: 'require', PGPORT:'5432', PGDATABASE:'postgres',
  MEG_AGE_RECIPIENT:'age1fakesafeoutputonly', MEG_AGE_IDENTITY:ageKey,
  MEG_BACKUP_DIR:target, MEG_MOCK_RESTORED_FLAG: restoredFlag,
};
const run = (file, options = {}) => spawnSync('bash', [join(sourceDir,file)], {
  cwd: testDir, env: {...env,...options}, encoding:'utf8', timeout:10000,
});
try {
  let r=run('meg-stage09-safe-backup.sh');
  assert.equal(r.status,0,r.stderr+'\n'+r.stdout);
  const files=readdirSync(target);
  const backup=join(target,files.find(x=>x.endsWith('.pgdump.age')));
  const manifest=join(target,files.find(x=>x.endsWith('.manifest.txt')));
  assert.ok(existsSync(backup) && existsSync(manifest));
  assert.match(readFileSync(backup,'utf8'),/^MOCK-AGE-ENCRYPTED:/);
  assert.match(readFileSync(manifest,'utf8'),/vault_root_key_included=NO/);
  assert.match(readFileSync(manifest,'utf8'),/vault_secrets_table_found=yes/);
  assert.equal(readFileSync(manifest,'utf8').includes(env.PGPASSWORD),false);
  r=run('meg-stage09-safe-restore-drill.sh',{
    MEG_BACKUP_FILE:backup,MEG_RESTORE_ISOLATED_OK:'YES',
    MEG_RESTORE_PASSWORD:'DUMMY-ONLY-FOR-FAKE-TEST',
  });
  assert.equal(r.status,0,r.stderr+'\n'+r.stdout);
  assert.match(r.stdout,/DRILL DE public APROVADO/);
  assert.ok(existsSync(restoredFlag));
  rmSync(restoredFlag);
  r=run('meg-stage09-safe-restore-drill.sh',{
    MEG_BACKUP_FILE:backup, MEG_RESTORE_ISOLATED_OK:'YES',
    MEG_RESTORE_HOST:'db.ugbiqzaqnrhulhetevby.supabase.co',
    MEG_RESTORE_PASSWORD:'DUMMY-ONLY-FOR-FAKE-TEST',
  });
  assert.notEqual(r.status,0,'restore must never be able to target remote Postgres');
  r=run('meg-stage09-safe-backup.sh',{PGHOST:'db.other-project.supabase.co'});
  assert.notEqual(r.status,0,'backup must be restricted to MEG project');
  r=run('meg-stage09-safe-vault-rootkey.sh',{
    SUPABASE_ACCESS_TOKEN:'TEST-PRIVATE-TOKEN-NOT-REAL',
    MEG_VAULT_KEY_BACKUP_DIR:vaultTarget,
  });
  assert.equal(r.status,0,r.stderr+'\n'+r.stdout);
  assert.equal(r.stdout.includes('aaaaaaaaaaaaaaaa'),false,'Vault root key must never be printed');
  assert.equal(r.stdout.includes('TEST-PRIVATE-TOKEN'),false,'PAT must never be printed');
  const vaultFiles=readdirSync(vaultTarget);
  const encryptedVault=join(vaultTarget,vaultFiles.find(x=>x.endsWith('.rootkey.age')));
  assert.ok(existsSync(encryptedVault));
  assert.match(readFileSync(encryptedVault,'utf8'),/^MOCK-AGE-ENCRYPTED:/);
  r=run('meg-stage09-safe-vault-rootkey.sh',{
    SUPABASE_ACCESS_TOKEN:'BAD\nINJECT', MEG_VAULT_KEY_BACKUP_DIR:vaultTarget,
  });
  assert.notEqual(r.status,0,'token injection must be rejected');
  console.log('MEG backup contract: encrypted dump, isolated restore, remote guard and encrypted Vault key OK (mock tools only)');
} finally {
  rmSync(testDir,{force:true,recursive:true});
}
