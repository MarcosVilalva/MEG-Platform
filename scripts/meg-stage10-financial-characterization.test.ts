import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  countsTowardMonetaryBalance,
  isBenefitFinancialEvent,
  isBenefitPaymentMethod,
  paymentBalanceDecision,
  resolveCanonicalFinancialStatus,
} from '../apps/api/src/modules/finance/financial-policy';

const sourceAt = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const eventWriter = sourceAt('apps/api/src/modules/finance/event-mutation.ts');
const benefitWriter = sourceAt('apps/api/src/modules/finance/benefit-event-mutation.ts');
const eventRoutes = sourceAt('apps/api/src/modules/finance/routes.ts');
const benefitRoutes = sourceAt('apps/api/src/modules/finance/benefit-event-routes.ts');
const financeService = sourceAt('apps/api/src/modules/finance/service.ts');
const cardService = sourceAt('apps/api/src/modules/cards/service.ts');
const cardRoutes = sourceAt('apps/api/src/modules/cards/routes.ts');

test('receita é realizada mesmo se requisitada como planejada', () => {
  assert.equal(resolveCanonicalFinancialStatus({type:'income', requestedStatus:'planned'}), 'paid');
});

test('despesa Fixo é realizada se não for crédito', () => {
  assert.equal(resolveCanonicalFinancialStatus({
    type:'expense', requestedStatus:'planned', category:{name:'Moradia', group:'Fixo'},
    paymentMethod:{name:'PIX', type:'debit'},
  }), 'paid');
});

test('crédito prevalece sobre Fixo e mantém status planejado', () => {
  assert.equal(resolveCanonicalFinancialStatus({
    type:'expense', requestedStatus:'paid', category:{name:'Fixo', group:'Fixo'},
    paymentMethod:{name:'Crédito', type:'credit'},
  }), 'planned');
});

test('pendente explícito permanece planejado quando fora das exceções', () => {
  assert.equal(resolveCanonicalFinancialStatus({
    type:'expense', requestedStatus:'planned', category:{name:'Mercado'},
    paymentMethod:{name:'PIX', type:'debit'},
  }), 'planned');
});

test('Verocard pertence ao domínio benefício, e não ao saldo monetário', () => {
  const event = {type:'expense', status:'paid', description:'Compra de alimentação',
    account:{type:'benefit'}, paymentMethod:{name:'Verocard'}};
  assert.equal(isBenefitPaymentMethod('vérocard'), true);
  assert.equal(isBenefitFinancialEvent(event), true);
  assert.equal(countsTowardMonetaryBalance(event), false);
});

test('cálculo canônico do saldo usa centavos e informa insuficiência', () => {
  assert.deepEqual(paymentBalanceDecision(10.01, 10.02), {
    allowed:false, available:10.01, requested:10.02, missing:0.01,
  });
  assert.equal(paymentBalanceDecision(10.02, 10.02).allowed, true);
});

test('criação monetária usa transação serializável, recibo idempotente e bloqueio de benefício', () => {
  assert.match(eventWriter, /serializableFinancialTransaction\(async \(tx\)/);
  assert.match(eventWriter, /mutationRequestHash/);
  assert.match(eventWriter, /BENEFIT_CONTRACT_REQUIRED/);
  assert.match(eventWriter, /resolveCanonicalFinancialStatus/);
  assert.match(eventWriter, /findRecentFinancialEventDuplicate/);
});

test('benefício mantém writer exclusivo, proteção de saldo e atualização otimista', () => {
  assert.match(benefitWriter, /export async function createBenefitEventProtected/);
  assert.match(benefitWriter, /export async function updateBenefitEventProtected/);
  assert.match(benefitWriter, /INSUFFICIENT_BENEFIT_BALANCE/);
  assert.match(benefitWriter, /FINANCIAL_EVENT_STALE_VERSION/);
  assert.match(benefitWriter, /INVALID_BENEFIT_PAYMENT_METHOD/);
  assert.match(benefitWriter, /serializableFinancialTransaction/);
  assert.match(benefitRoutes, /app\.post\('\/benefit-events'/);
  assert.match(benefitRoutes, /app\.patch\('\/benefit-events\/:eventId'/);
});

test('compra no cartão preserva distribuição de centavos e competência do fechamento', () => {
  assert.match(cardService, /const totalCents = Math\.round\(input\.totalAmount \* 100\)/);
  assert.match(cardService, /const remainder = totalCents - baseCents \* input\.installments/);
  assert.match(cardService, /purchaseDate\.getUTCDate\(\) > card\.closingDay/);
  assert.match(cardService, /findRecentCardPurchaseDuplicate/);
});

test('edição de parcela bloqueia paga/parcial, preserva outras e reconcilia compra', () => {
  assert.match(cardRoutes, /CARD_INSTALLMENT_ALREADY_PAID/);
  assert.match(cardRoutes, /CARD_INSTALLMENT_PARTIALLY_PAID/);
  assert.match(cardRoutes, /singleInstallmentEdit: true/);
  assert.match(cardRoutes, /preservedInstallmentIds:/);
  assert.match(cardRoutes, /reconciledPurchaseTotal: totalAmount/);
});

test('exclusões financeiras possuem restrição de papel e auditabilidade', () => {
  assert.match(eventRoutes, /app\.delete\('\/events\/:id', \{ preHandler: app\.authorize\(\[\.\.\.adminRoles\]\)/);
  assert.match(cardRoutes, /app\.delete\('\/purchases\/:id', \{ preHandler: app\.authorize\(\[\.\.\.adminRoles\]\)/);
  assert.match(financeService, /FINANCIAL_EVENT_ARCHIVED/);
  assert.match(cardRoutes, /CARD_PURCHASE_CANCEL/);
});

test('caracteriza divergência entre criação protegida e edição monetária legada: não é permissão de uso', () => {
  assert.match(eventRoutes, /return await updateFinancialEvent\(request\.user\.sub, id, parsed\.data\)/);
  assert.match(financeService, /export async function updateFinancialEvent/);
  assert.match(financeService, /export async function deleteFinancialEvent/);
  assert.match(financeService, /return prisma\.\$transaction\(async \(tx\)/);
  // Este teste documenta o contrato atual. Não declara equivalência financeira com o writer protegido.
});


const historyService = sourceAt('apps/api/src/modules/finance/service.ts');
const catalogScope = sourceAt('apps/api/src/modules/finance/catalog-scope.ts');

test('histórico canônico disponível à UI inclui vínculos para autocomplete sem campo derivado fictício', () => {
  assert.match(eventRoutes, /app\.get\('\/events\/history-snapshot'/);
  assert.match(historyService, /protocol: 'financial-history-v1'/);
  assert.match(historyService, /account: true, category: true, paymentMethod: true/);
  assert.match(historyService, /FINANCIAL_HISTORY_SNAPSHOT_LIMIT = 5000/);
  assert.match(historyService, /kind: 'limit-exceeded'/);
});

test('catálogos selecionados pertencem ao usuário e devem estar ativos', () => {
  assert.match(catalogScope, /where: \{ id, userId, isActive: true \}/);
  assert.match(eventWriter, /activeAccountForUser/);
  assert.match(eventWriter, /activeCategoryForUser/);
  assert.match(eventWriter, /activePaymentMethodForUser/);
});

test('rotas de escrita não autorizam VIEWER', () => {
  assert.match(eventRoutes, /const writeRoles = \['ADMIN', 'MANAGER', 'OPERATOR'\]/);
  assert.match(eventRoutes, /app\.post\('\/events', \{ preHandler: app\.authorize\(\[\.\.\.writeRoles\]\)/);
  assert.match(eventRoutes, /app\.patch\('\/events\/:id', \{ preHandler: app\.authorize\(\[\.\.\.writeRoles\]\)/);
  assert.match(benefitRoutes, /const writeRoles = \['ADMIN', 'MANAGER', 'OPERATOR'\]/);
});

test('benefício exige operação idempotente e vinculação ativa ao domínio benefício', () => {
  assert.match(benefitRoutes, /operationId: z\.string\(\)\.trim\(\)\.min\(8\)/);
  assert.match(benefitWriter, /normalizeText\(account\.type\) !== 'BENEFIT'/);
  assert.match(benefitWriter, /isBenefitPaymentMethod\(paymentMethod\.name\)/);
  assert.match(benefitWriter, /status: 'paid'/);
});

test('edição legada deve manter bloqueio até caracterização de concorrência e domínio', () => {
  const update = financeService.slice(financeService.indexOf('export async function updateFinancialEvent'), financeService.indexOf('export async function deleteFinancialEvent'));
  assert.match(update, /validateActiveReferences/);
  assert.match(update, /FINANCIAL_EVENT_LINKED_DOMAIN/);
  assert.match(update, /writeBackNormalizedEventsToAppState/);
  assert.doesNotMatch(update, /resolveCanonicalFinancialStatus/);
  assert.doesNotMatch(update, /expectedUpdatedAt/);
  assert.doesNotMatch(update, /BENEFIT_CONTRACT_REQUIRED/);
});
