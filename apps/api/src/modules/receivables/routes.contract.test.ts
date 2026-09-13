import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');

assert.match(routes, /createReceivableProtected/,
  'Criação de conta a receber deve passar pelo gateway transacional idempotente.');
assert.match(routes, /receiveReceivableProtected/,
  'Recebimento deve passar pelo gateway transacional protegido.');
assert.match(routes, /operationIdSchema/,
  'Criação e recebimento devem aceitar chave de idempotência.');
assert.match(service, /const workspace = await resolveWorkspaceContext\(userId\)/,
  'Criação e recebimento devem resolver o workspace mesmo sem operationId.');
assert.match(service, /workspaceId: workspace\.workspaceId/,
  'Evento financeiro gerado pelo recebimento deve persistir o workspace.');
assert.match(service, /serializableFinancialTransaction/,
  'Criação e recebimento devem executar em transação serializável.');
assert.match(service, /cloudMutationReceipt/,
  'Criação e recebimento devem consultar recibos de idempotência.');
assert.match(service, /RECEIVABLE_CREATE/,
  'Criação deve registrar recibo de mutação próprio.');
assert.match(service, /RECEIVABLE_CREATED/,
  'Criação deve gerar auditoria financeira estrutural.');
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
assert.match(service, /INVALID_CUSTOMER/,
  'Cliente informado na criação precisa pertencer ao usuário e estar ativo.');

console.log('Contrato transacional de contas a receber validado.');