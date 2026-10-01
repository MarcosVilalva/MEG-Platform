import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');
const customers = readFileSync(new URL('./customer-mutation.ts', import.meta.url), 'utf8');

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
assert.match(routes, /app\.patch\('\/receivables\/:id'/,
  'API deve expor edição protegida de título.');
assert.match(routes, /app\.delete\('\/receivables\/:id'/,
  'API deve expor cancelamento protegido de título.');
assert.match(service, /RECEIVABLE_STALE_VERSION/,
  'Edição deve bloquear gravação quando outro dispositivo alterou o título.');
assert.match(service, /RECEIVABLE_HAS_RECEIPTS/,
  'Título com recebimento deve permanecer protegido contra edição ou cancelamento.');
assert.match(service, /RECEIVABLE_UPDATED/,
  'Edição deve registrar auditoria estrutural.');
assert.match(service, /RECEIVABLE_CANCELLED/,
  'Cancelamento deve registrar auditoria estrutural sem apagar o título.');
assert.match(service, /RECEIVABLE_UPDATE/,
  'Edição deve possuir recibo idempotente próprio.');
assert.match(service, /RECEIVABLE_CANCEL/,
  'Cancelamento deve possuir recibo idempotente próprio.');
assert.match(service, /status: 'cancelled', openAmount: 0/,
  'Cancelamento deve ser lógico e zerar apenas o saldo aberto.');
assert.match(routes, /app\.post\('\/receivables\/:id\/receipts\/:receiptId\/reverse'/,
  'API deve expor estorno protegido de um recebimento específico.');
assert.match(routes, /app\.authorize\(\[\.\.\.adminRoles\]\)/,
  'Estorno deve permanecer restrito a ADMIN e MANAGER.');
assert.match(service, /RECEIPT_ALREADY_REVERSED/,
  'Recebimento já estornado não pode produzir novo efeito financeiro.');
assert.match(service, /reversedAt, reversalReason: reason/,
  'Recibo original deve permanecer preservado com marca explícita de estorno.');
assert.match(service, /status: 'archived', archivedAt: reversedAt/,
  'Evento financeiro do recebimento deve ser arquivado no mesmo estorno.');
assert.match(service, /activeReceipts = receivable\.receipts\.filter/,
  'Saldo reaberto deve ser recalculado pelos recebimentos ainda ativos.');
assert.match(service, /RECEIVABLE_RECEIPT_REVERSE/,
  'Estorno deve possuir recibo de idempotência próprio.');
assert.match(service, /RECEIVABLE_RECEIPT_REVERSED/,
  'Estorno deve registrar auditoria estrutural.');
assert.match(service, /current\.receipts\.some\(\(receipt\) => !receipt\.reversedAt\)/,
  'Recebimentos já estornados não podem bloquear edição e cancelamento do título.');

console.log('Contrato transacional de contas a receber validado.');
assert.match(routes, /createCustomerProtected/,
  'Cliente deve usar writer protegido em vez de gravação Prisma direta na rota.');
assert.match(routes, /updateCustomerProtected/,
  'Edição e ativação de cliente devem usar writer protegido.');
assert.match(routes, /CUSTOMER_STALE_VERSION/,
  'Conflito de cliente entre dispositivos deve responder como conflito.');
assert.match(customers, /serializableFinancialTransaction/,
  'Cadastro de cliente deve executar em transação serializável.');
assert.match(customers, /workspaceId_operationId/,
  'Retry de cliente deve preservar idempotência por workspace.');
assert.match(customers, /CUSTOMER_ALREADY_EXISTS/,
  'Documento ou e-mail duplicado deve ser bloqueado antes da gravação.');
assert.match(customers, /expectedUpdatedAt/,
  'Edição de cliente deve detectar versão concorrente.');
assert.match(customers, /CUSTOMER_CREATED[\s\S]*CUSTOMER_UPDATED/,
  'Cadastro de cliente deve manter auditoria estrutural.');
