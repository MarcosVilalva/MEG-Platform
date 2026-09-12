import assert from 'node:assert/strict';
import {
  countsTowardMonetaryBalance,
  isBenefitFinancialEvent,
  paymentBalanceDecision,
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
assert.deepEqual(paymentBalanceDecision(1200, 1500), { allowed: false, available: 1200, requested: 1500, missing: 300 });

console.log('Política de saldo monetário disponível validada.');
