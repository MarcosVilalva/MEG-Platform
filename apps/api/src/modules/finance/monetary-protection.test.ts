import assert from 'node:assert/strict';
import {
  countsTowardMonetaryBalance,
  isBenefitFinancialEvent,
  isMonetaryAccountType,
  isMonetaryFinancialEvent,
  paymentBalanceDecision,
  summarizeMonetaryEvents,
} from './monetary-protection';

assert.equal(countsTowardMonetaryBalance({ type: 'income', status: 'planned', description: 'Salário' }), false,
  'Receita prevista não pode financiar uma baixa.');
assert.equal(countsTowardMonetaryBalance({ type: 'income', status: 'confirmed', description: 'Salário' }), true);
assert.equal(countsTowardMonetaryBalance({ type: 'expense', status: 'paid', description: 'Conta' }), true);
assert.equal(countsTowardMonetaryBalance({ type: 'expense', status: 'planned', description: 'Conta' }), false);
assert.equal(countsTowardMonetaryBalance({ type: 'transfer', status: 'paid', description: 'Transferência interna' }), false,
  'Transferência não altera patrimônio monetário.');
assert.equal(countsTowardMonetaryBalance({ type: 'income', status: 'confirmed', description: 'VEROCARD' }), false);
assert.equal(countsTowardMonetaryBalance({ type: 'expense', status: 'paid', description: 'Mercado', paymentMethod: { name: 'VEROCARD' } }), false);
assert.equal(countsTowardMonetaryBalance({ type: 'expense', status: 'paid', description: 'Mercado', account: { type: 'benefit' } }), false,
  'Conta benefício é autoridade suficiente para excluir o evento do caixa monetário.');
assert.equal(isBenefitFinancialEvent({ description: 'Crédito Verocard' }), true);
assert.equal(isBenefitFinancialEvent({ description: 'Mercado', account: { type: 'benefit' } }), true);
assert.equal(isMonetaryFinancialEvent({ type: 'transfer', description: 'Entre contas' }), false);
assert.equal(isMonetaryAccountType('checking'), true);
assert.equal(isMonetaryAccountType('savings'), true);
assert.equal(isMonetaryAccountType('cash'), true);
assert.equal(isMonetaryAccountType('benefit'), false);
assert.equal(isMonetaryAccountType('credit'), false);
assert.equal(isMonetaryAccountType('investment'), false);
assert.deepEqual(paymentBalanceDecision(1200, 1500), { allowed: false, available: 1200, requested: 1500, missing: 300 });

const july = summarizeMonetaryEvents([
  { type: 'income', status: 'paid', description: 'Receitas julho', signedAmount: 9574.31, account: { type: 'checking' } },
  { type: 'expense', status: 'paid', description: 'Despesas pagas julho', signedAmount: -4419.66, account: { type: 'checking' } },
  { type: 'expense', status: 'planned', description: 'Despesas pendentes julho', signedAmount: -7733.74, account: { type: 'checking' } },
  { type: 'income', status: 'paid', description: 'Crédito alimentação', signedAmount: 2000, account: { type: 'benefit' } },
  { type: 'transfer', status: 'paid', description: 'Transferência interna', signedAmount: -500, account: { type: 'checking' } },
]);
assert.deepEqual(july, {
  income: 9574.31,
  expense: 12153.4,
  projectedResult: -2579.09,
  realizedIncome: 9574.31,
  realizedExpense: 4419.66,
  realizedResult: 5154.65,
  eventCount: 3,
});
const previousBalance = 882.81;
assert.equal(Math.round((previousBalance + july.realizedResult) * 100) / 100, 6037.46,
  'Fixture de julho deve continuar validando a fórmula monetária realizada.');
assert.equal(Math.round((previousBalance + july.projectedResult) * 100) / 100, -1696.28,
  'Fixture de julho deve continuar validando a fórmula monetária projetada.');

// Contrato de opening balance: somente contas que representam caixa disponível entram no saldo.
const openingFixture = [
  { type: 'checking', openingBalance: 1000 },
  { type: 'savings', openingBalance: 250 },
  { type: 'cash', openingBalance: 50 },
  { type: 'benefit', openingBalance: 400 },
  { type: 'credit', openingBalance: 700 },
  { type: 'investment', openingBalance: 900 },
];
const monetaryOpening = openingFixture
  .filter((account) => isMonetaryAccountType(account.type))
  .reduce((sum, account) => sum + account.openingBalance, 0);
assert.equal(monetaryOpening, 1300,
  'Benefício, crédito e investimento não podem inflar o caixa monetário disponível.');

console.log('Política de saldo monetário disponível validada.');
