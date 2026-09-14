import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./event-bulk-routes.ts', import.meta.url), 'utf8');
const edit = readFileSync(new URL('./event-edit.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.post\('\/events\/:id\/update-protected'/,
  'Edição individual deve possuir endpoint POST protegido para o preview.');
assert.match(routes, /editFinancialEventProtected/,
  'Endpoint deve delegar ao writer protegido.');
assert.match(routes, /modality:\s*z\.enum\(\['À VISTA', 'CRÉDITO', 'CREDIÁRIO', 'ALIMENTAÇÃO', 'DINHEIRO', 'PIX', 'TRANSFERÊNCIA BANCÁRIA', 'VEROCARD'\]\)/,
  'Contrato deve preservar as modalidades validadas pelo MEG.');
assert.match(routes, /operationIdSchema/,
  'Edição deve exigir operationId idempotente.');

assert.match(edit, /serializableFinancialTransaction/,
  'Edição deve ser atômica e serializável.');
assert.match(edit, /cloudMutationReceipt/,
  'Edição deve usar recibo idempotente.');
assert.match(edit, /FINANCIAL_EVENT_UPDATE_PROTECTED/,
  'Edição deve registrar mutationType próprio.');
assert.match(edit, /FINANCIAL_EVENT_UPDATED/,
  'Edição deve produzir auditoria estrutural.');
assert.match(edit, /writeBackNormalizedEventsToAppState/,
  'Edição deve manter AppState normalizado sincronizado.');
assert.match(edit, /ledgerEntry\.deleteMany/,
  'Edição deve reconstruir o efeito contábil antes de confirmar.');
assert.match(edit, /ledgerEntry\.create/,
  'Evento realizado deve voltar ao ledger com os novos dados.');
assert.match(edit, /source\.modality = modality\.trim\(\)/,
  'Modalidade deve permanecer no sourcePayload do evento.');
assert.match(edit, /FINANCIAL_EVENT_LINKED_DOMAIN/,
  'Eventos vinculados a domínios protegidos não podem ser alterados por esse fluxo.');
assert.match(edit, /OPERATION_ID_REUSED/,
  'Reuso divergente de operationId deve ser bloqueado.');

console.log('Contrato da edição protegida de lançamento validado.');
