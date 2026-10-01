import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const writeback = readFileSync(new URL('./normalized-primary-writeback.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.post\('\/normalization-reconcile-primary'/,
  'API deve expor endpoint específico para reconciliar o espelho do AppState.');
assert.match(routes, /app\.authorize\(\['ADMIN'\]\)/,
  'Reconciliação do espelho deve permanecer restrita a ADMIN.');
assert.match(routes, /RECONCILIAR_ESPELHO_APPSTATE/,
  'Rota deve exigir confirmação explícita e não aceitar reparo silencioso.');
assert.match(routes, /expectedRevision/,
  'Rota deve exigir a revisão previamente conferida.');
assert.match(routes, /assertWriteAccess/,
  'Reconciliação deve respeitar o bloqueio comercial de escrita do workspace.');
assert.match(routes, /before\.primary/,
  'Rota deve recusar a operação quando a base normalizada não for primária.');
assert.match(routes, /after\.reconciled/,
  'Rota deve conferir o resultado final antes de declarar sucesso.');

assert.match(writeback, /NORMALIZATION_PRIMARY_REQUIRED/,
  'Reconciliador deve falhar fechado fora do modo normalized-primary.');
assert.match(writeback, /NORMALIZATION_REVISION_CONFLICT/,
  'Reconciliador deve cancelar quando a revisão mudou.');
assert.match(writeback, /writeBackNormalizedEventsToAppState/,
  'Reconciliador deve usar o writer oficial do espelho, não substituição bruta.');
assert.match(writeback, /NORMALIZATION_PRIMARY_RECONCILED/,
  'Mudança efetiva deve registrar auditoria.');
assert.match(writeback, /activeLegacyEvents/,
  'Auditoria deve registrar contexto da reconciliação.');
assert.match(writeback, /removedLegacyIds/,
  'Reconciliador deve contabilizar espelhos obsoletos removidos.');

console.log('normalized-primary reconciliation contract tests passed');
