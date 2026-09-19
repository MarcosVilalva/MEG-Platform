import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const settlement = readFileSync(new URL('./event-settlement.ts', import.meta.url), 'utf8');
const batchRoutes = readFileSync(new URL('./event-bulk-routes.ts', import.meta.url), 'utf8');
const batchSettlement = readFileSync(new URL('./pending-batch-settlement.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.post\('\/events\/:id\/settle'/,
  'Baixa individual deve possuir endpoint dedicado.');
assert.match(routes, /settleLegacyFinancialEventProtected/,
  'Endpoint individual deve usar o gateway protegido.');
assert.doesNotMatch(routes, /app\.post\('\/pending\/batch\/settle'/,
  'Rota de baixa múltipla não pode ser registrada duas vezes no módulo financeiro.');
assert.match(batchRoutes, /app\.post\('\/pending\/batch\/settle'/,
  'Baixa múltipla deve possuir endpoint atômico dedicado no módulo de mutações em lote.');
assert.match(batchRoutes, /settlePendingBatchProtected/,
  'Endpoint em lote deve usar o writer protegido do domínio financeiro.');
assert.match(batchRoutes, /operationIdSchema[\s\S]*min\(8\).*max\(128\)/,
  'operationId deve ser obrigatório no contrato de baixa em lote.');

assert.match(settlement, /serializableFinancialTransaction/,
  'Baixa individual deve ser atômica e serializável.');
assert.match(settlement, /cloudMutationReceipt/,
  'Baixa individual deve usar recibo idempotente.');
assert.match(settlement, /FINANCIAL_EVENT_SETTLE/,
  'Baixa deve registrar mutationType específico para eventos normalizados.');
assert.match(settlement, /FINANCIAL_EVENT_SETTLE_COMPAT/,
  'Eventos importados devem preservar mutationType de compatibilidade.');
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
assert.match(settlement, /FINANCIAL_EVENT_SETTLED/,
  'Evento normalizado deve produzir auditoria estrutural.');
assert.match(settlement, /FINANCIAL_EVENT_SETTLED_COMPAT/,
  'Evento legado deve continuar produzindo auditoria de compatibilidade.');
assert.doesNotMatch(settlement, /throw new FinancialEventSettlementError\('FINANCIAL_EVENT_NOT_LEGACY_COMPAT'/,
  'Evento normalizado nativo não pode ser rejeitado só por não possuir vínculo legado.');
assert.match(settlement, /writeBackNormalizedEventsToAppState/,
  'Eventos importados devem continuar sincronizados com o espelho legado quando aplicável.');
assert.match(settlement, /BENEFIT_SETTLEMENT_NOT_SUPPORTED/,
  'Benefício não pode cair nesse writer monetário.');
assert.match(settlement, /assertActiveCatalogReferences/,
  'Conta e forma de pagamento devem ser cadastros ativos do usuário.');

assert.match(batchSettlement, /serializableFinancialTransaction/,
  'Baixa múltipla deve executar toda a seleção em uma única transação serializável.');
assert.match(batchSettlement, /const loaded = await loadBatchItems/,
  'Todos os itens devem ser validados antes da primeira gravação do lote.');
assert.match(batchSettlement, /PENDING_BATCH_SETTLEMENT/,
  'Lote deve possuir recibo idempotente próprio.');
assert.match(batchSettlement, /INSUFFICIENT_MONETARY_BALANCE/,
  'Proteção de saldo deve validar o total do lote antes de qualquer baixa.');
assert.match(batchSettlement, /PHOENIX_PENDING_DUPLICATE/,
  'O mesmo compromisso não pode aparecer duas vezes no lote.');
assert.doesNotMatch(batchSettlement, /FINANCIAL_EVENT_NOT_LEGACY_COMPAT/,
  'Lote deve aceitar despesas normalizadas nativas além de itens legados.');
assert.match(batchSettlement, /writeBackNormalizedEventsToAppState/,
  'Espelho legado deve ser atualizado dentro da mesma transação quando houver vínculo legado.');
assert.match(batchSettlement, /timeoutMs:\s*90_000/,
  'Lote suportado de até 100 compromissos deve ter janela transacional compatível.');
assert.match(batchSettlement, /maxWaitMs:\s*15_000/,
  'Baixa em lote deve tolerar espera de aquisição da transação sem falhar precocemente.');

console.log('Contrato da baixa protegida individual e em lote validado.');
