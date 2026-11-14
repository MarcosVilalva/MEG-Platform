/** Inventario de riscos de startup Render, sem executar codigo de negocio ou conectar em DB. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relative) => readFileSync(new URL('../' + relative, import.meta.url), 'utf8');
const server = read('apps/api/src/server.ts');

const knownWriters = Object.freeze([
  {
    name: 'ensureCommercialFoundation',
    file: 'apps/api/src/modules/platform-admin/service.ts',
    witness: 'prisma.plan.upsert(',
  },
  {
    name: 'refreshCommercialBillingStatuses',
    file: 'apps/api/src/modules/billing/service.ts',
    witness: 'prisma.workspaceInvoice.updateMany(',
  },
  {
    name: 'materializeRecurringExpenses',
    file: 'apps/api/src/modules/payables/service.ts',
    witness: 'prisma.$transaction((tx) => materializeTemplate(tx, template, horizon))',
  },
  {
    name: 'migrateLegacyCardsForAllWorkspaces',
    file: 'apps/api/src/modules/cards/service.ts',
    witness: 'created += await migrateLegacyCards(',
  },
  {
    name: 'ensurePrimaryWorkspace',
    file: 'apps/api/src/modules/workspaces/service.ts',
    witness: 'prisma.workspace.create(',
  },
  {
    name: 'reconcilePrimaryAppStateFromNormalized',
    file: 'apps/api/src/modules/app-state/normalized-primary-writeback.ts',
    witness: 'writeBackNormalizedEventsToAppState(',
  },
  {
    name: 'activateNormalizationPrimary',
    file: 'apps/api/src/modules/app-state/normalization-migration.ts',
    witness: 'prisma.appState.updateMany(',
  },
  {
    name: 'repairLegacyImportedEvents',
    file: 'apps/api/src/modules/imports/repair.ts',
    witness: 'prisma.financialEvent.updateMany(',
  },
]);

test('o start da API expõe caminhos de escrita conhecidos e não é um smoke read-only', () => {
  assert.equal(knownWriters.length, 8);
  for (const { name, file, witness } of knownWriters) {
    assert.ok(server.includes(name + '('), 'Chamador de startup nao reconhecido: ' + name);
    const source = read(file);
    assert.ok(source.includes('export async function ' + name + '('), 'Implementacao mudou: ' + name);
    assert.ok(source.includes(witness), 'Efeito de escrita deve ser reavaliado: ' + name);
  }
  assert.ok(server.includes("runFinancialMaintenance('startup')"));
  assert.ok(server.includes('}, 6 * 60 * 60 * 1000)'));
  assert.ok(server.includes('}, 15 * 60 * 1000)'));
});

test('reparo de importacao é condicional e não deve ser chamado de inofensivo', () => {
  assert.ok(server.includes('if (config.runLegacyRepair)'));
  assert.ok(read('apps/api/src/config.ts').includes('RUN_LEGACY_REPAIR: z.coerce.boolean().default(false)'));
  assert.ok(read('apps/api/src/modules/imports/repair.ts').includes('prisma.financialEvent.updateMany('));
});

test('o build legado contém DELETE financeiro e db push com data loss', () => {
  const prepare = read('packages/database/prisma/prepare-production.ts');
  const indexes = read('packages/database/prisma/ensure-performance-indexes.ts');
  const database = JSON.parse(read('packages/database/package.json'));
  const main = read('render.yaml');
  assert.ok(prepare.includes('DELETE FROM "Budget"'));
  assert.ok(prepare.includes('ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC'));
  assert.ok(indexes.includes('CREATE INDEX IF NOT EXISTS'));
  assert.ok(database.scripts['db:push:production'].includes('--accept-data-loss'));
  // Declaracao candidata, nao configuracao produtiva efetiva.
  assert.ok(main.includes('buildCommand: bash scripts/meg-stage09-render-api-build.sh'));
  assert.ok(!read('scripts/meg-stage09-render-api-build.sh').includes('db:prepare:production'));
  assert.ok(!read('scripts/meg-stage09-render-api-build.sh').includes('db:push:production'));
});

test('inventario nao libera deploy nem substitui o gate do Render', () => {
  assert.ok(read('docs/MEG-STAGE09-RENDER-BUILD-SEGURO-20261114.md').includes('Issue #691 permanece aberta'));
});

console.log('STAGE09_RENDER_STARTUP_WRITER_INVENTORY=KNOWN_MUTATIONS_PRESENT;DEPLOY_NOT_AUTHORIZED');
