import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');

const getStart = routes.indexOf("app.get('/',");
const postStart = routes.indexOf("app.post('/',", getStart);
assert.ok(getStart >= 0 && postStart > getStart, 'Rota GET de pendências não localizada.');
const getBlock = routes.slice(getStart, postStart);

assert.match(getBlock, /listPayables\(request\.user\.sub, parsed\.data\.month\)/);
assert.doesNotMatch(getBlock, /create|update|createMany|materialize|generateRecurring/i,
  'GET /payables deve ser leitura pura, sem materialização ou escrita.');

assert.match(routes, /payPayableProtected/,
  'Baixa deve passar pelo serviço transacional de proteção de saldo.');
assert.match(routes, /operationId/,
  'Baixa deve aceitar chave de idempotência.');
assert.match(routes, /occurrenceCount/,
  'Recorrência deve aceitar término por quantidade de ocorrências.');
assert.match(service, /TransactionIsolationLevel\.Serializable/,
  'Proteção de saldo deve executar em transação serializável.');
assert.match(service, /INSUFFICIENT_MONETARY_BALANCE/,
  'Servidor deve bloquear baixa monetária sem saldo suficiente.');
assert.match(service, /FUTURE_PAYMENT_NOT_ALLOWED/,
  'Pagamento futuro não pode nascer diretamente como pago.');
assert.match(service, /cloudMutationReceipt/,
  'Baixa deve reutilizar recibos de mutação para idempotência.');

console.log('Contrato transacional de contas a pagar validado.');
