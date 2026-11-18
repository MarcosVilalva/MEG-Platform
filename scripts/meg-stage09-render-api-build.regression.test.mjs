import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateBuildScript, validatePackages, verify } from './meg-stage09-render-api-build.contract.test.mjs';
import { installedApiLockEntries } from './installed-api-audit-inventory.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const script = read('scripts/meg-stage09-render-api-build.sh');
verify();
for (const mutation of [
  script + '\nprisma db push --accept-data-loss\n',
  script.replace("echo 'MEG_STAGE09_SAFE_BUILD=BUILT_WITHOUT_DATABASE_SCHEMA_ACTIONS'", 'echo "$(prisma db push)"'),
  script.replace('npm_config_ignore_scripts=true', 'npm_config_ignore_scripts=false'),
  script.replace('--include=dev --ignore-scripts', '--include=dev'),
  script.replace('--workspace apps/api --workspace packages/database', ''),
  script.replace('--installed-api --audit-level=high', '--installed-api --audit-level=critical'),
  script.replace('npm run --ignore-scripts db:generate', 'npm run db:prepare:production'),
  script.replace('127.0.0.1:65431', 'db.example.invalid:5432'),
]) assert.throws(() => validateBuildScript(mutation));

const original = ['package.json', 'apps/api/package.json', 'packages/database/package.json'].map(p => JSON.parse(read(p)));
for (const index of [0, 1, 2]) {
  for (const hook of ['postinstall', 'prepare', 'prebuild', 'predb:generate', 'postbuild:api']) {
    const packages = structuredClone(original);
    packages[index].scripts[hook] = 'prisma db push --accept-data-loss';
    assert.throws(() => validatePackages(...packages));
  }
}
const fixture = mkdtempSync(join(tmpdir(), 'meg-api-inventory-'));
function addPackage(path, name, version) {
  const directory = join(fixture, path);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name, version }));
}
try {
  const path = 'node_modules/@qa/dependency';
  const lock = { [path]: { version: '1.0.0' }, 'node_modules/vite': { version: '6.4.4' } };
  addPackage(path, '@qa/dependency', '1.0.0');
  assert.equal(installedApiLockEntries(fixture, lock)[path].name, '@qa/dependency');
  assert.equal(installedApiLockEntries(fixture, lock)['node_modules/vite'], undefined);
  addPackage(path, '@qa/dependency', '2.0.0');
  assert.throws(() => installedApiLockEntries(fixture, lock), /differs from lockfile/);
  addPackage(path, '@qa/dependency', '1.0.0');
  addPackage('node_modules/vite', 'vite', '6.4.4');
  assert.throws(() => installedApiLockEntries(fixture, lock), /Web tool found/);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
console.log('STAGE09_BUILD_REJECTS_UNEXPECTED_SQL_LIFECYCLES_AND_DEPENDENCIES=PASS');
