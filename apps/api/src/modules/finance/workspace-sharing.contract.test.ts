import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const preview = readFileSync(new URL('./phoenix-preview-read.ts', import.meta.url), 'utf8');
const previewEvents = readFileSync(new URL('./phoenix-preview-events.ts', import.meta.url), 'utf8');
const phoenixRead = readFileSync(new URL('./phoenix-read.ts', import.meta.url), 'utf8');
const eventMutation = readFileSync(new URL('./event-mutation.ts', import.meta.url), 'utf8');
const benefitMutation = readFileSync(new URL('./benefit-event-mutation.ts', import.meta.url), 'utf8');
const transfer = readFileSync(new URL('./transfer-service.ts', import.meta.url), 'utf8');
const bulk = readFileSync(new URL('./event-bulk-mutation.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const payable = readFileSync(new URL('../payables/service.ts', import.meta.url), 'utf8');
const payableCreate = readFileSync(new URL('../payables/create-service.ts', import.meta.url), 'utf8');
const receivable = readFileSync(new URL('../receivables/service.ts', import.meta.url), 'utf8');
const receivableRoutes = readFileSync(new URL('../receivables/routes.ts', import.meta.url), 'utf8');

assert.match(preview, /const context = await resolveWorkspaceContext\(userId\);[\s\S]*const dataOwnerId = context\.workspace\.ownerId;/,
  'Snapshot Phoenix deve resolver o proprietário financeiro do workspace.');
assert.match(preview, /canonicalSummary\(dataOwnerId, month\)/,
  'Saldo exibido deve vir da base compartilhada do workspace.');
assert.match(preview, /prisma\.account\.findMany\(\{ where: \{ userId: dataOwnerId \}/,
  'Contas do snapshot devem ser as contas da base compartilhada.');
assert.match(preview, /monthlyEvents\(dataOwnerId, month\)/,
  'Lançamentos do snapshot devem ser compartilhados entre membros autorizados.');
assert.match(previewEvents, /userId: dataOwnerId/,
  'Consulta Tudo/intervalo deve usar a mesma base financeira compartilhada.');
assert.match(phoenixRead, /userId: dataOwnerId/,
  'Leituras auxiliares de lançamentos e benefício devem usar o proprietário do workspace.');

assert.match(eventMutation, /const dataOwnerId = workspace\.workspace\.ownerId;/,
  'Novo lançamento deve separar ator autenticado do proprietário da base.');
assert.match(eventMutation, /assertActiveCatalogReferences\(tx, dataOwnerId, input\)/,
  'Novo lançamento deve validar os catálogos compartilhados.');
assert.match(eventMutation, /userId: dataOwnerId,[\s\S]*workspaceId: workspace\.workspaceId/,
  'Novo lançamento deve permanecer na base oficial do workspace.');
assert.match(benefitMutation, /benefitBalanceAt\(tx, dataOwnerId,/,
  'Saldo do Vale Alimentação deve ser único por base compartilhada.');
assert.match(transfer, /sourceAccountBalanceAt\(tx, dataOwnerId,/,
  'Transferência deve conferir o saldo da base compartilhada.');
assert.match(bulk, /readEditableEvents\(tx, dataOwnerId, ids\)/,
  'Edição e exclusão em lote devem alcançar os lançamentos oficiais do workspace.');

assert.match(routes, /async function financialDataOwnerId\(userId: string\)/,
  'Rotas financeiras devem possuir resolução explícita da base do workspace.');
assert.match(routes, /prisma\.account\.findMany\(\{ where: \{ userId: dataOwnerId \}/,
  'Contas devem ser compartilhadas entre membros autorizados.');
assert.match(routes, /prisma\.category\.findMany\(\{ where: \{ userId: dataOwnerId \}/,
  'Categorias devem ser compartilhadas entre membros autorizados.');
assert.match(routes, /prisma\.paymentMethod\.findMany\(\{ where: \{ userId: dataOwnerId \}/,
  'Formas de pagamento devem ser compartilhadas entre membros autorizados.');

assert.match(payable, /listPayables[\s\S]*const dataOwnerId = context\.workspace\.ownerId/,
  'Pendentes devem ser lidos da base do workspace.');
assert.match(payableCreate, /userId: dataOwnerId/,
  'Novas contas a pagar devem nascer na base compartilhada.');
assert.match(receivable, /const dataOwnerId = workspace\.workspace\.ownerId/,
  'Recebíveis devem separar ator de proprietário da base.');
assert.match(receivableRoutes, /where: \{ userId: context\.workspace\.ownerId \}/,
  'Clientes e recebíveis devem ser visíveis aos membros da mesma base.');

for (const source of [eventMutation, benefitMutation, transfer, payable, payableCreate, receivable]) {
  assert.match(source, /actorId: userId/,
    'Auditoria deve continuar registrando quem executou a operação, mesmo com dados compartilhados.');
}

console.log('Contrato de base financeira compartilhada por workspace validado.');
