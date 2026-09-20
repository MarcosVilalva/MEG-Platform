import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mutation = readFileSync(new URL('./benefit-event-mutation.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('./benefit-event-routes.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');

assert.match(mutation, /normalizeText\(account\.type\) !== 'BENEFIT'/,
  'Writer de benefício deve aceitar somente conta ativa do tipo benefit.');
assert.match(mutation, /isBenefitPaymentMethod\(paymentMethod\.name\)/,
  'Writer de benefício deve exigir a forma canônica VEROCARD.');
assert.match(mutation, /status: 'paid'/,
  'Recarga e despesa de benefício devem ser persistidas sempre como realizadas.');
assert.match(mutation, /input\.type === 'expense'[\s\S]*benefitBalanceAt/,
  'Despesa do benefício deve consultar o saldo antes de gravar.');
assert.match(mutation, /INSUFFICIENT_BENEFIT_BALANCE/,
  'Saldo insuficiente deve bloquear a despesa de benefício.');
assert.match(mutation, /isBenefitFinancialEvent\(event\) && isPostedFinancialStatus\(event\.status\)/,
  'Cálculo do saldo deve usar a mesma regra canônica da leitura Phoenix.');
assert.match(mutation, /mutationType: 'BENEFIT_EVENT_CREATE'/,
  'Mutação deve manter recibo idempotente próprio.');
assert.match(mutation, /action: 'BENEFIT_EVENT_CREATED'/,
  'Movimentação do benefício deve entrar na auditoria financeira.');
assert.match(routes, /app\.post\('\/benefit-events'/,
  'Benefício deve possuir endpoint próprio em vez de reutilizar o writer genérico.');
assert.match(routes, /app\.patch\('\/benefit-events\/:eventId'/,
  'Benefício deve possuir edição protegida no mesmo domínio, sem cair no editor financeiro genérico.');
assert.match(mutation, /updateBenefitEventProtected/,
  'Vale Alimentação deve possuir writer próprio para alteração.');
assert.match(mutation, /before\.updatedAt\.toISOString\(\) !== input\.expectedUpdatedAt/,
  'Edição do benefício deve impedir sobrescrita silenciosa de uma versão alterada em outro aparelho.');
assert.match(mutation, /benefitBalanceAt\(tx, userId, input\.date, eventId\)/,
  'Ao alterar uma despesa do benefício, o saldo deve ser recalculado excluindo o próprio lançamento antigo.');
assert.match(mutation, /writeBackNormalizedEventsToAppState\(tx, workspace\.workspaceId, \[result\]\)/,
  'Edição do benefício deve refletir o lançamento normalizado no espelho compartilhado.');
assert.match(mutation, /action: 'BENEFIT_EVENT_UPDATED'/,
  'Alteração do Vale Alimentação deve permanecer auditável.');
assert.match(mutation, /mutationType: 'BENEFIT_EVENT_UPDATE'/,
  'Retry de alteração do benefício deve possuir recibo idempotente próprio.');
assert.match(routes, /z\.enum\(\['income', 'expense'\]\)/,
  'Contrato deve limitar benefício a recarga e despesa.');
assert.match(routes, /amount: z\.coerce\.number\(\)\.positive\(\)\.finite\(\)/,
  'Writer protegido não deve aceitar zero ou sinal invertido.');
assert.match(routes, /OPERATION_ID_REUSED[\s\S]*INSUFFICIENT_BENEFIT_BALANCE/,
  'Conflitos idempotentes e saldo insuficiente devem responder como conflito sem gravação parcial.');
assert.match(server, /financeBenefitEventRoutes/,
  'Servidor deve registrar o domínio protegido de benefício.');

console.log('Contrato do Benefício Alimentação validado: conta benefit, VEROCARD, saldo protegido, idempotência e auditoria.');
