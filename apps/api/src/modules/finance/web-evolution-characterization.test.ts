import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { financialAmountValues } from './amount-sign';
import {
  cardStatementDueDate,
  canonicalCardStatementTotals,
} from './card-statement-canonical';
import {
  countsTowardMonetaryBalance,
  isBenefitFinancialEvent,
  paymentBalanceDecision,
} from './monetary-protection';
import { buildTransferLegs } from './transfer-core';
import { addMonthsClamped, moveWeekendToMonday } from '../payables/core';

const cardsRoutes = readFileSync(new URL('../cards/routes.ts', import.meta.url), 'utf8');
const cardsService = readFileSync(new URL('../cards/service.ts', import.meta.url), 'utf8');
const benefitMutation = readFileSync(new URL('./benefit-event-mutation.ts', import.meta.url), 'utf8');
const catalogMutation = readFileSync(new URL('./catalog-mutation.ts', import.meta.url), 'utf8');
const financeRoutes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const readModel = readFileSync(new URL('./read-model.ts', import.meta.url), 'utf8');

// 1) Virada de mês e calendário civil.
assert.equal(addMonthsClamped('2026-12-31', 1, 31), '2027-01-31');
assert.equal(addMonthsClamped('2026-01-31', 1, 31), '2026-02-28');
assert.equal(addMonthsClamped('2026-04-30', 1, 30), '2026-05-30');

// 2) Saldo anterior / realizado: somente status postados compõem saldo disponível.
assert.equal(countsTowardMonetaryBalance({ type: 'income', status: 'planned', description: 'Prevista' }), false);
assert.equal(countsTowardMonetaryBalance({ type: 'income', status: 'confirmed', description: 'Confirmada' }), true);
assert.equal(countsTowardMonetaryBalance({ type: 'expense', status: 'paid', description: 'Paga' }), true);

// 3) Saldo insuficiente monetário preserva centavos.
assert.deepEqual(paymentBalanceDecision(100.01, 100.02), {
  allowed: false,
  available: 100.01,
  requested: 100.02,
  missing: 0.01,
});
assert.equal(paymentBalanceDecision(1500.009, 1500.004).allowed, true);

// 4) Compatibilidade de benefício: conta explícita e heurística legado VEROCARD coexistem.
assert.equal(isBenefitFinancialEvent({ description: 'Mercado', account: { type: 'benefit' } }), true);
assert.equal(isBenefitFinancialEvent({ description: 'Crédito Verocard' }), true);
assert.equal(isBenefitFinancialEvent({ description: 'Mercado', paymentMethod: { name: 'VEROCARD' } }), true);

// 5) Crédito/débito preservam o sinal atualmente aceito, inclusive estorno.
assert.deepEqual(financialAmountValues('income', 125.5), { amount: 125.5, signedAmount: 125.5 });
assert.deepEqual(financialAmountValues('expense', 89.9), { amount: 89.9, signedAmount: -89.9 });
assert.deepEqual(financialAmountValues('expense', -89.9), { amount: 89.9, signedAmount: 89.9 });

// 6) Benefício insuficiente é bloqueado antes da gravação.
assert.match(benefitMutation, /requestedCents > availableCents/);
assert.match(benefitMutation, /INSUFFICIENT_BENEFIT_BALANCE/);
assert.match(benefitMutation, /status:\s*'paid'/);

// 7) Parcelamento não exato distribui o resto de centavos nas primeiras parcelas.
assert.match(cardsService, /const totalCents = Math\.round\(input\.totalAmount \* 100\)/);
assert.match(cardsService, /const baseCents = Math\.floor\(totalCents \/ input\.installments\)/);
assert.match(cardsService, /index < remainder \? 1 : 0/);
const totalCents = Math.round(100 * 100);
const baseCents = Math.floor(totalCents / 3);
const remainder = totalCents - baseCents * 3;
assert.deepEqual(
  Array.from({ length: 3 }, (_, index) => (baseCents + (index < remainder ? 1 : 0)) / 100),
  [33.34, 33.33, 33.33],
);

// 8) Vencimento de fatura respeita fim de mês e fim de semana.
assert.equal(cardStatementDueDate('2026-01', 28, 31), '2026-02-02');
assert.equal(cardStatementDueDate('2026-09', 28, 3), '2026-10-05');
assert.equal(moveWeekendToMonday('2026-10-03'), '2026-10-05');
assert.equal(moveWeekendToMonday('2026-10-04'), '2026-10-05');

// 9) Fechamento: compra após o closingDay migra para a próxima competência.
assert.match(cardsService, /purchaseDate\.getUTCDate\(\) > card\.closingDay \? 1 : 0/);
assert.match(cardsRoutes, /purchaseDate\.getUTCDate\(\) > input\.closingDay \? 1 : 0/);

// 10) Saldo credor de fatura não gera valor pagável negativo.
const credit = canonicalCardStatementTotals([
  { id: 'c1', source: 'financial-event', description: 'Compra', effect: 50, kind: 'charge', purchaseDate: '2026-09-01', dueDate: '2026-09-16', statementMonth: '2026-09', installmentNo: 1, installmentQty: 1, isOpen: true, sourceStatus: 'planned' },
  { id: 'c2', source: 'financial-event', description: 'Crédito', effect: -80, kind: 'credit', purchaseDate: '2026-09-02', dueDate: '2026-09-16', statementMonth: '2026-09', installmentNo: 1, installmentQty: 1, isOpen: true, sourceStatus: 'planned' },
]);
assert.equal(credit.payableAmount, 0);
assert.equal(credit.creditBalance, 30);

// 11) Limite comprometido considera todas as parcelas abertas, inclusive futuras.
assert.match(cardsService, /const officialOpen = entries[\s\S]*filter\(\(entry\) => entry\.status === 'open'\)[\s\S]*reduce/);
assert.match(cardsService, /const usedLimit = Math\.max\(0, officialOpen \+ legacyOpenEffect\)/);

// 12) Transferência interna é conservativa e não aceita a mesma conta.
const [source, destination] = buildTransferLegs({
  transferId: 'transfer-characterization-001',
  sourceAccountId: 'source-account',
  destinationAccountId: 'destination-account',
  amount: 1234.56,
  date: '2026-10-05',
  status: 'paid',
});
assert.equal(Math.round((source.signedAmount + destination.signedAmount) * 100), 0);
assert.throws(() => buildTransferLegs({
  transferId: 'transfer-characterization-002',
  sourceAccountId: 'same-account',
  destinationAccountId: 'same-account',
  amount: 10,
  date: '2026-10-05',
}), /TRANSFER_ACCOUNTS_MUST_DIFFER/);

// 13) Caracterização do pagamento de fatura atual: somente pagamento integral da fatura aberta.
const statementSchemaBlock = cardsRoutes.match(/const statementPaymentSchema = z\.object\(\{[\s\S]*?\n\}\);/)?.[0] || '';
assert.ok(statementSchemaBlock);
assert.doesNotMatch(statementSchemaBlock, /\bamount\s*:/);
assert.match(cardsService, /const amount = Math\.round\(entries\.reduce\([\s\S]*?\* 100\) \/ 100/);
assert.match(cardsService, /updateMany\([\s\S]*status: 'paid'/);

// 14) Caracterização da edição de compra atual: parcelas abertas são recriadas em bloco.
assert.match(cardsRoutes, /entries:\s*\{[\s\S]*deleteMany:\s*\{\}[\s\S]*create:\s*installmentRows/);
assert.match(cardsRoutes, /recalculatedInstallments:\s*true/);

// 15) Caracterização do saldo inicial atual: catálogo grava openingBalance diretamente na conta.
const createAccountBlock = catalogMutation.match(/export async function createAccountCatalog[\s\S]*?\n\}/)?.[0] || '';
assert.ok(createAccountBlock);
assert.match(createAccountBlock, /openingBalance:\s*input\.openingBalance/);
assert.doesNotMatch(createAccountBlock, /financialEvent\.create/);

console.log('MEG Web Evolution — caracterização financeira da Etapa 1: OK');


// 16) Rotas financeiras principais usam o read-model canônico centralizado na política monetária.
assert.match(financeRoutes, /getCanonicalFinancialSummary/);
assert.match(financeRoutes, /getCanonicalFinancialCashflow/);
assert.match(financeRoutes, /getCanonicalFinancialAnalytics/);
assert.match(readModel, /from '\.\/monetary-protection'/);
assert.match(readModel, /summarizeMonetaryEvents/);
assert.match(readModel, /countsTowardMonetaryBalance/);

// 17) Caracterização do catálogo atual: openingBalance só existe na criação;
// a atualização de conta ainda não oferece alteração auditável desse valor.
const updateAccountTypeBlock = catalogMutation.split('export type AccountCatalogUpdate')[1]?.split('export async function createAccountCatalog')[0] || '';
assert.ok(updateAccountTypeBlock);
assert.doesNotMatch(updateAccountTypeBlock, /openingBalance/);
