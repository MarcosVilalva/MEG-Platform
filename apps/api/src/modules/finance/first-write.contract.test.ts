import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const mutation = readFileSync(new URL('./event-mutation.ts', import.meta.url), 'utf8');
const audit = readFileSync(new URL('./audit.ts', import.meta.url), 'utf8');
const catalogScope = readFileSync(new URL('./catalog-scope.ts', import.meta.url), 'utf8');
const protection = readFileSync(new URL('./monetary-protection.ts', import.meta.url), 'utf8');

assert.match(routes, /createFinancialEventProtected/,
  'POST de evento deve usar o gateway protegido.');
assert.match(routes, /operationIdSchema/,
  'Criação de evento deve aceitar operationId para idempotência.');
assert.match(routes, /app\.get\('\/audit'/,
  'Auditoria financeira deve ser consultável para validação do primeiro writer.');

assert.match(protection, /TransactionIsolationLevel\.Serializable/,
  'Writer financeiro deve executar com isolamento serializável.');
assert.match(mutation, /serializableFinancialTransaction/);
assert.match(mutation, /cloudMutationReceipt/,
  'Writer deve consultar recibo antes de gravar.');
assert.match(mutation, /FINANCIAL_EVENT_CREATE/,
  'Writer deve registrar recibo próprio após sucesso.');
assert.match(mutation, /OPERATION_ID_REUSED/,
  'Mesmo operationId com conteúdo diferente deve ser rejeitado.');
assert.match(mutation, /idempotentReplay:\s*true/,
  'Retry idêntico deve retornar o mesmo comando identificado como replay.');
assert.match(mutation, /const workspace = await resolveWorkspaceContext\(userId\)/,
  'Todo novo evento deve resolver o workspace financeiro.');
assert.match(mutation, /workspaceId: workspace\.workspaceId/,
  'Todo novo evento deve persistir o workspace resolvido.');
assert.match(mutation, /FINANCIAL_EVENT_CREATED/,
  'Todo novo evento deve produzir auditoria estrutural.');
assert.match(mutation, /TRANSFER_CONTRACT_NOT_READY/,
  'Transferência não pode cair no contrato simples de uma perna.');

assert.match(catalogScope, /where: \{ id, userId, isActive: true \}/,
  'Referências devem ser ativas e pertencer ao usuário.');
assert.match(catalogScope, /INVALID_ACCOUNT/);
assert.match(catalogScope, /INVALID_CATEGORY/);
assert.match(catalogScope, /INVALID_PAYMENT_METHOD/);

assert.match(routes, /prisma\.account\.findMany\(\{ where: \{ userId: request\.user\.sub \}/,
  'Leitura de contas deve ser isolada pelo usuário autenticado.');
assert.match(routes, /prisma\.category\.findMany\(\{ where: \{ userId: request\.user\.sub \}/,
  'Leitura de categorias deve ser isolada pelo usuário autenticado.');
assert.match(routes, /prisma\.paymentMethod\.findMany\(\{ where: \{ userId: request\.user\.sub \}/,
  'Leitura de formas de pagamento deve ser isolada pelo usuário autenticado.');
assert.match(routes, /prisma\.account\.create\(\{ data: \{ userId: request\.user\.sub/,
  'Novas contas devem nascer vinculadas ao usuário autenticado.');
assert.match(routes, /prisma\.category\.create\(\{ data: \{ userId: request\.user\.sub/,
  'Novas categorias devem nascer vinculadas ao usuário autenticado.');
assert.match(routes, /prisma\.paymentMethod\.create\(\{ data: \{ userId: request\.user\.sub/,
  'Novas formas de pagamento devem nascer vinculadas ao usuário autenticado.');

assert.match(audit, /schemaVersion:\s*1/);
assert.match(audit, /resolveWorkspaceContext/,
  'Consulta da auditoria deve respeitar o workspace do ator.');

console.log('Contrato do primeiro writer financeiro Phoenix validado.');
