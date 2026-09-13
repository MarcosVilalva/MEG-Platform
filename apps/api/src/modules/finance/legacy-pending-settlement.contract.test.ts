import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const settlement = readFileSync(new URL('./event-settlement.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.post\('\/events\/:id\/settle'/,
  'Baixa de compatibilidade deve possuir endpoint dedicado.');
assert.match(routes, /settleLegacyFinancialEventProtected/,
  'Endpoint deve usar o gateway protegido.');
assert.match(routes, /operationId:\s*z\.string\(\).*min\(8\).*max\(128\)/s,
  'operationId deve ser obrigatório no contrato de baixa.');

assert.match(settlement, /serializableFinancialTransaction/,
  'Baixa deve ser atômica e serializável.');
assert.match(settlement, /cloudMutationReceipt/,
  'Baixa deve usar recibo idempotente.');
assert.match(settlement, /FINANCIAL_EVENT_SETTLE_COMPAT/,
  'Baixa deve registrar mutationType específico.');
assert.match(settlement, /OPERATION_ID_REUSED/,
  'Reuso divergente de operationId deve ser bloqueado.');
assert.match(settlement, /P2002/,
  'Corrida concorrente deve ser tratada.');
assert.match(settlement, /status:\s*'paid'/,
  'Evento planejado deve virar pago apenas dentro do writer protegido.');
assert.match(settlement, /date:\s*paidAt/,
  'Data do evento realizado deve refletir a data efetiva do pagamento.');
assert.match(settlement, /originalDueDate/,
  'Vencimento original deve permanecer registrado na auditoria/resposta.');
assert.match(settlement, /ledgerEntry\.deleteMany/,
  'Writer deve normalizar o ledger antes da confirmação.');
assert.match(settlement, /ledgerEntry\.create/,
  'Baixa confirmada deve gerar lançamento no ledger.');
assert.match(settlement, /FINANCIAL_EVENT_SETTLED_COMPAT/,
  'Baixa deve produzir auditoria estrutural.');
assert.match(settlement, /FINANCIAL_EVENT_NOT_LEGACY_COMPAT/,
  'Endpoint não pode ser usado para eventos fora da camada de compatibilidade.');
assert.match(settlement, /BENEFIT_SETTLEMENT_NOT_SUPPORTED/,
  'Benefício não pode cair nesse writer monetário.');
assert.match(settlement, /assertActiveCatalogReferences/,
  'Conta e forma de pagamento devem ser cadastros ativos do usuário.');

console.log('Contrato da baixa protegida de pendente legado validado.');
