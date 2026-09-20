import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./event-bulk-routes.ts', import.meta.url), 'utf8');
const mutation = readFileSync(new URL('./event-bulk-mutation.ts', import.meta.url), 'utf8');
const monetaryProtection = readFileSync(new URL('./monetary-protection.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');

assert.match(server, /financeBulkMutationRoutes/,
  'Servidor deve registrar as rotas financeiras em massa.');
assert.match(routes, /\/events\/bulk\/update/,
  'API deve expor edição em massa.');
assert.match(routes, /\/events\/bulk\/archive/,
  'API deve expor exclusão lógica em massa.');
assert.match(routes, /max\(200\)/,
  'Uma operação em massa deve ter limite explícito.');
assert.match(routes, /app\.authorize\(\[\.\.\.adminRoles\]\)/,
  'Exclusão em massa deve permanecer restrita a ADMIN ou MANAGER.');

assert.match(mutation, /serializableFinancialTransaction/,
  'Alterações em massa devem ser atômicas e serializáveis.');
assert.match(monetaryProtection, /timeout:\s*options\.timeoutMs\s*\?\?\s*30_000/,
  'Transações financeiras protegidas precisam suportar o write-back do AppState sem expirar em 5 segundos.');
assert.match(monetaryProtection, /maxWait:\s*options\.maxWaitMs\s*\?\?\s*10_000/,
  'Transações financeiras protegidas devem tolerar espera de conexão/lock sem perder atomicidade.');
assert.match(mutation, /cloudMutationReceipt/,
  'Operações em massa devem ser idempotentes por operationId.');
assert.match(mutation, /FINANCIAL_EVENT_BULK_UPDATE/);
assert.match(mutation, /FINANCIAL_EVENT_BULK_ARCHIVE/);
assert.match(mutation, /FINANCIAL_EVENT_UPDATED/,
  'Cada lançamento alterado deve gerar auditoria estruturada.');
assert.match(mutation, /FINANCIAL_EVENT_ARCHIVED/,
  'Cada lançamento excluído deve gerar auditoria estruturada.');
assert.match(mutation, /FINANCIAL_EVENT_LINKED_DOMAIN/,
  'Eventos vinculados a contas a receber/pagar não podem ser alterados fora do domínio de origem.');
assert.match(mutation, /rebuildLedgers/,
  'Mudanças de data ou conta devem reconstruir o ledger dentro da mesma transação.');
assert.match(mutation, /OPERATION_ID_REUSED/,
  'Reuso divergente do operationId deve ser rejeitado.');
assert.match(routes, /expectedUpdatedAtById/,
  'API deve aceitar a versão conhecida pelo cliente antes de editar ou excluir.');
assert.match(routes, /FINANCIAL_EVENT_STALE_VERSION/,
  'Conflito de versão deve retornar 409 em vez de sobrescrever silenciosamente.');
assert.match(mutation, /assertExpectedEventVersions/,
  'Mutação deve validar a versão do lançamento dentro da transação serializável.');
assert.match(mutation, /event\.updatedAt\.toISOString\(\)/,
  'Versão concorrente deve usar updatedAt autoritativo do banco.');
assert.match(mutation, /expectedUpdatedAtById: input\.expectedUpdatedAtById \|\| null/,
  'Idempotência deve incluir a versão esperada no hash do comando.');
assert.match(mutation, /P2002/,
  'Corrida concorrente de recibos deve ser tratada.');

console.log('Contrato de edição/exclusão em massa validado.');
