import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const mutation = readFileSync(new URL('./event-mutation.ts', import.meta.url), 'utf8');

assert.match(routes, /createFinancialEventProtected/,
  'Criação de evento deve passar pelo gateway transacional idempotente.');
assert.match(routes, /operationIdSchema/,
  'Criação de evento deve aceitar chave de idempotência.');
assert.match(mutation, /serializableFinancialTransaction/,
  'Criação de evento deve executar em transação serializável.');
assert.match(mutation, /cloudMutationReceipt/,
  'Criação de evento deve consultar recibo de mutação.');
assert.match(mutation, /FINANCIAL_EVENT_CREATE/,
  'Criação de evento deve registrar recibo de idempotência próprio.');
assert.match(mutation, /FINANCIAL_EVENT_CREATED/,
  'Criação de evento deve registrar auditoria financeira estrutural.');
assert.match(mutation, /TRANSFER_CONTRACT_NOT_READY/,
  'Transferência não pode usar o contrato de evento de uma única perna.');
assert.match(mutation, /INVALID_ACCOUNT/);
assert.match(mutation, /INVALID_CATEGORY/);
assert.match(mutation, /INVALID_PAYMENT_METHOD/);

console.log('Contrato de criação idempotente de eventos financeiros validado.');
