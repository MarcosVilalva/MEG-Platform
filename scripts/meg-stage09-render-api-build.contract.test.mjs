/** Build seguro: nao executa banco, rede ou script shell durante este contrato. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const root = JSON.parse(read('package.json'));
const api = JSON.parse(read('apps/api/package.json'));
const database = JSON.parse(read('packages/database/package.json'));
const expected = [
  'set -Eeuo pipefail',
  'cd "$(dirname "$0")/.."',
  'node scripts/meg-stage09-render-api-build.contract.test.mjs',
  "export DATABASE_URL='postgresql://build:build@127.0.0.1:65431/meg_stage09_build_only?schema=public'",
  'export npm_config_ignore_scripts=true',
  'npm ci --include=dev --ignore-scripts --audit=false --fund=false',
  'npm run --ignore-scripts db:generate',
  'npm run --ignore-scripts build:api',
  "echo 'MEG_STAGE09_SAFE_BUILD=BUILT_WITHOUT_DATABASE_SCHEMA_ACTIONS'",
];

export function validateBuildScript(script) {
  // Echo tambem e comparado: substituicoes de comando nao podem escapar.
  const statements = script.split('\n').map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  assert.deepEqual(statements, expected, 'Comando inesperado no build seguro.');
}

export function validatePackages(root, api, database) {
  assert.equal(root.scripts['db:generate'], 'npm --workspace packages/database run db:generate');
  assert.equal(root.scripts['build:api'], 'npm --workspace apps/api run build');
  assert.equal(database.scripts['db:generate'], 'prisma generate');
  assert.equal(api.scripts.build, 'tsc -p tsconfig.json');
  for (const pkg of [root, api, database]) {
    for (const hook of ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish',
      'predb:generate', 'postdb:generate', 'prebuild:api', 'postbuild:api', 'prebuild', 'postbuild']) {
      assert.equal(pkg.scripts[hook], undefined, 'Lifecycle nao autorizado: ' + hook);
    }
  }
}

export function verify() {
  validateBuildScript(read('scripts/meg-stage09-render-api-build.sh'));
  validatePackages(root, api, database);
  console.log('STAGE09_RENDER_SAFE_BUILD_CONTRACT=PASS');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) verify();
