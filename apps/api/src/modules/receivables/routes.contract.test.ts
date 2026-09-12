import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');

assert.match(routes, /receiveReceivableProtected/,
  'Recebimento deve passar pelo gateway transacional protegido.');
assert.match(routes, /operationId/,
  'Recebimento deve aceitar chave de idempotência.');
assert.match(service, /serializableFinancialTransaction/,
  'Recebimento deve executar em transação serializável.');
assert.match(service, /cloudMutationReceipt/,
  'Recebimento deve consultar recibo de idempotência.');
assert.match(service, /RECEIVABLE_RECEIPT/,
  'Recebimento deve registrar recibo de mutação próprio.');
assert.match(service, /RECEIVABLE_RECEIVED/,
  'Recebimento deve gerar auditoria financeira estrutural.');
assert.match(service, /FUTURE_RECEIPT_NOT_ALLOWED/,
  'Recebimento futuro não pode nascer como recebido.');
assert.match(service, /INVALID_ACCOUNT/,
  'Conta informada precisa estar ativa.');
assert.match(service, /INVALID_PAYMENT_METHOD/,
  'Forma de pagamento informada precisa estar ativa.');

console.log('Contrato transacional de contas a receber validado.');
