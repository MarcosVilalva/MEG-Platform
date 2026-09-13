import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');
const createService = readFileSync(new URL('./create-service.ts', import.meta.url), 'utf8');
const monetaryProtection = readFileSync(new URL('../finance/monetary-protection.ts', import.meta.url), 'utf8');

const getStart = routes.indexOf("app.get('/',");
const postStart = routes.indexOf("app.post('/',", getStart);
assert.ok(getStart >= 0 && postStart > getStart, 'Rota GET de pendências não localizada.');
const getBlock = routes.slice(getStart, postStart);

assert.match(getBlock, /listPayables\(request\.user\.sub, parsed\.data\.month\)/);
assert.doesNotMatch(getBlock, /create|update|createMany|materialize|generateRecurring/i,
  'GET /payables deve ser leitura pura, sem materialização ou escrita.');

assert.match(routes, /createPayablesProtected/,
  'Criação parcelada deve passar pelo gateway transacional idempotente.');
assert.match(routes, /payPayableProtected/,
  'Baixa deve passar pelo serviço transacional de proteção de saldo.');
assert.match(routes, /operationIdSchema/,
  'Criação, recorrência e baixa devem aceitar chave de idempotência.');
assert.match(routes, /occurrenceCount/,
  'Recorrência deve aceitar término por quantidade de ocorrências.');
assert.match(createService, /const workspace = await resolveWorkspaceContext\(userId\)/,
  'Criação parcelada deve resolver o workspace mesmo sem operationId.');
assert.match(createService, /workspaceId: workspace\.workspaceId/,
  'Auditoria de criação parcelada deve carregar o workspace resolvido.');
assert.match(createService, /serializableFinancialTransaction/,
  'Criação parcelada deve executar em transação serializável.');
assert.match(createService, /cloudMutationReceipt/,
  'Criação parcelada deve consultar recibos de mutação.');
assert.match(createService, /PAYABLE_CREATE/,
  'Criação parcelada deve registrar recibo de idempotência próprio.');
assert.match(createService, /PAYABLE_CREATED/,
  'Cada conta criada deve gerar auditoria financeira estrutural.');
assert.match(service, /RECURRING_EXPENSE_CREATE/,
  'Recorrência deve registrar recibo de idempotência próprio.');
assert.match(service, /cloudMutationReceipt/,
  'Recorrência e baixa devem reutilizar recibos de mutação para idempotência.');
assert.match(service, /const workspace = await resolveWorkspaceContext\(userId\)/,
  'Recorrência e baixa devem resolver contexto de workspace independentemente da idempotência.');
assert.match(service, /workspaceId: workspace\.workspaceId/,
  'Evento financeiro gerado pela baixa deve persistir o workspace.');
assert.match(service, /serializableFinancialTransaction/,
  'Baixa e recorrência devem reutilizar a política transacional compartilhada.');
assert.match(monetaryProtection, /TransactionIsolationLevel\.Serializable/,
  'Política monetária deve executar em transação serializável.');
assert.match(service, /INSUFFICIENT_MONETARY_BALANCE/,
  'Servidor deve bloquear baixa monetária sem saldo suficiente.');
assert.match(service, /FUTURE_PAYMENT_NOT_ALLOWED/,
  'Pagamento futuro não pode nascer diretamente como pago.');
assert.match(monetaryProtection, /monetaryBalanceAt/,
  'Cálculo de saldo monetário deve estar centralizado.');

console.log('Contrato transacional de contas a pagar validado.');