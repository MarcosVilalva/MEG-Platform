import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBuildScript, validatePackages, verify } from './meg-stage09-render-api-build.contract.test.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const script = read('scripts/meg-stage09-render-api-build.sh');
verify();
for (const mutation of [
  script + '\nprisma db push --accept-data-loss\n',
  script.replace("echo 'MEG_STAGE09_SAFE_BUILD=BUILT_WITHOUT_DATABASE_SCHEMA_ACTIONS'", 'echo "$(prisma db push)"'),
  script.replace('npm_config_ignore_scripts=true', 'npm_config_ignore_scripts=false'),
  script.replace('--include=dev --ignore-scripts', '--include=dev'),
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
console.log('STAGE09_BUILD_REJECTS_UNEXPECTED_SQL_LIFECYCLES_AND_COMMAND_SUBSTITUTION=PASS');
