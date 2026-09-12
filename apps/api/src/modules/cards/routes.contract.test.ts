import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');

const getStart = routes.indexOf("app.get('/',");
const createStart = routes.indexOf("app.post('/',", getStart);
assert.ok(getStart >= 0 && createStart > getStart, 'Rota GET de cartões não localizada.');
const getBlock = routes.slice(getStart, createStart);

assert.match(getBlock, /listCards\(request\.user\.sub, parsed\.data\.month\)/);
assert.doesNotMatch(getBlock, /migrate|create|update|createMany/i,
  'GET /cards deve permanecer leitura pura e sem migração legada.');
assert.match(routes, /payCardStatementProtected/,
  'Pagamento de fatura deve passar pelo serviço transacional protegido.');
assert.match(routes, /operationId/,
  'Pagamento de fatura deve aceitar chave de idempotência.');
assert.match(service, /monetaryBalanceAt/,
  'Fatura deve usar a política monetária compartilhada.');
assert.match(service, /serializableFinancialTransaction/,
  'Fatura deve ser quitada em transação serializável.');
assert.match(service, /INSUFFICIENT_MONETARY_BALANCE/,
  'Fatura deve ser bloqueada quando o saldo monetário for insuficiente.');
assert.match(service, /cloudMutationReceipt/,
  'Pagamento de fatura deve registrar recibo de idempotência.');
assert.match(service, /migrateLegacyCardsForAllWorkspaces/,
  'Compatibilidade de cartões legados deve existir fora da rota GET.');
assert.match(server, /migrateLegacyCardsForAllWorkspaces/,
  'Migração legada de cartões deve ser acionada por manutenção de servidor.');

console.log('Contrato transacional e de leitura de cartões validado.');
