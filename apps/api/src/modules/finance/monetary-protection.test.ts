import assert from 'node:assert/strict';
import {
  countsTowardMonetaryBalance,
  isBenefitFinancialEvent,
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
assert.equal(isBenefitFinancialEvent({ description: 'Crédito Verocard' }), true);
assert.equal(isMonetaryFinancialEvent({ type: 'transfer', description: 'Entre contas' }), false);
assert.deepEqual(paymentBalanceDecision(1200, 1500), { allowed: false, available: 1200, requested: 1500, missing: 300 });

const july = summarizeMonetaryEvents([
  { type: 'income', status: 'paid', description: 'Receitas julho', signedAmount: 9574.31 },
  { type: 'expense', status: 'paid', description: 'Despesas pagas julho', signedAmount: -4419.66 },
  { type: 'expense', status: 'planned', description: 'Despesas pendentes julho', signedAmount: -7733.74 },
  { type: 'income', status: 'paid', description: 'VEROCARD', signedAmount: 2000 },
  { type: 'transfer', status: 'paid', description: 'Transferência interna', signedAmount: -500 },
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
  'Julho deve reproduzir o saldo monetário realizado validado.');
assert.equal(Math.round((previousBalance + july.projectedResult) * 100) / 100, -1696.28,
  'Julho deve reproduzir o saldo monetário projetado validado.');

console.log('Política de saldo monetário disponível validada.');
