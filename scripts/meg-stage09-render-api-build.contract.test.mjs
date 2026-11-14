/**
 * Etapa 09: contrato fail-closed do build seguro Render, sem banco e sem rede.
 * Testa os comandos exatos e sua expansão conhecida no repositorio.
 * Não altera o serviço ativo, não executa migração/DDL e não lê segredos.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const root = JSON.parse(read('package.json'));
const api = JSON.parse(read('apps/api/package.json'));
const database = JSON.parse(read('packages/database/package.json'));
const script = read('scripts/meg-stage09-render-api-build.sh');
const shellStatements = script.split('\n').map((line) => line.trim()).filter((line) =>
  line !== '' && !line.startsWith('#') && !line.startsWith('echo '),
);

assert.deepEqual(shellStatements, [
  'set -Eeuo pipefail',
  'cd "$(dirname "$0")/.."',
  'npm ci --audit=false --fund=false',
  'npm run db:generate',
  'npm run build:api',
], 'Build não pode conter alteração de banco nem comandos extras.');

assert.equal(root.scripts['db:generate'], 'npm --workspace packages/database run db:generate');
assert.equal(root.scripts['build:api'], 'npm --workspace apps/api run build');
assert.equal(database.scripts['db:generate'], 'prisma generate');
assert.equal(api.scripts.build, 'tsc -p tsconfig.json');
assert.equal(root.scripts.preinstall, undefined);
assert.equal(root.scripts.postinstall, undefined);

// Não existe implicação tácita de que a configuração ativa no Render mudou.
// As dependências perigosas continuam segregadas até uma migração controlada.
assert.match(database.scripts['db:push:production'], /--accept-data-loss/);
assert.match(database.scripts['db:prepare:production'], /prepare-production\.ts/);

console.log('STAGE09_RENDER_SAFE_BUILD_CONTRACT=' + JSON.stringify({
  safeBuildContainsOnlyCompileSteps: true,
  rootAndWorkspaceScriptsValidated: true,
  existingProductionDatabaseTasksNotInvoked: true,
  isolatedProposalOnly: true,
}));
