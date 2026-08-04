import assert from 'node:assert/strict';
import { calculateFinancialSummary } from './legacy-finance.js';
import { isMonetaryNumberInput } from './negative-expense-amounts.js';
import {
  isInstallmentExpenseModality,
  parseFinancialAmount,
  validateExpenseAmount,
} from './negative-expense-core.js';

assert.equal(isMonetaryNumberInput({ tagName: 'INPUT', type: 'number', step: '0.01', id: '' }), true);
assert.equal(isMonetaryNumberInput({ tagName: 'INPUT', type: 'number', step: '1', id: 'purchaseTotalInput' }), true);
assert.equal(isMonetaryNumberInput({ tagName: 'INPUT', type: 'number', step: '1', id: 'installmentCountInput' }), false);
assert.equal(isMonetaryNumberInput({ tagName: 'INPUT', type: 'text', step: '0.01', id: 'expenseAmountInput' }), false);
assert.equal(isMonetaryNumberInput(null), false);

assert.equal(parseFinancialAmount('-35,40'), -35.40);
assert.equal(parseFinancialAmount('-35.40'), -35.40);
assert.equal(parseFinancialAmount('R$ -1.250,75'), -1250.75);
assert.equal(isInstallmentExpenseModality('CRÉDITO'), true);
assert.equal(isInstallmentExpenseModality('crediário'), true);
assert.equal(isInstallmentExpenseModality('À VISTA'), false);

const regularCredit = validateExpenseAmount({
  type: 'expense',
  modality: 'À VISTA',
  amount: '-35.40',
});
assert.equal(regularCredit.valid, true);
assert.equal(regularCredit.negative, true);
assert.equal(regularCredit.creditAmount, 35.40);

const singleCardCredit = validateExpenseAmount({
  type: 'expense',
  modality: 'CRÉDITO',
  amount: '-31.00',
  installmentCount: 1,
});
assert.equal(singleCardCredit.valid, true);
assert.equal(singleCardCredit.negative, true);
assert.equal(singleCardCredit.creditAmount, 31);

assert.equal(validateExpenseAmount({
  type: 'expense',
  modality: 'CRÉDITO',
  amount: '-35.40',
  installmentCount: 2,
}).valid, false);

assert.equal(validateExpenseAmount({
  type: 'expense',
  modality: 'CRÉDITO',
  amount: '-35.40',
  installmentCount: 1,
  ongoingInstallmentEnabled: true,
}).valid, false);

assert.equal(validateExpenseAmount({
  type: 'expense',
  modality: 'À VISTA',
  amount: '-35.40',
  recurrenceEnabled: true,
}).valid, false);

assert.equal(validateExpenseAmount({
  type: 'income',
  modality: 'À VISTA',
  amount: '-35.40',
}).valid, false);

const summary = calculateFinancialSummary([
  { date: '2026-08-01', type: 'income', incomeAmount: 1000, status: 'paid' },
  { date: '2026-08-02', type: 'expense', expenseAmount: 300, status: 'paid' },
  { date: '2026-08-03', type: 'expense', expenseAmount: -50, status: 'paid' },
], '2026-08-01', '2026-08-31');

assert.equal(summary.expense, 250);
assert.equal(summary.paidExpense, 250);
assert.equal(summary.closingBalance, 750);
assert.equal(summary.projectedBalance, 750);

console.log('negative expense amount tests passed');
