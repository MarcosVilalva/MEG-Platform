import assert from 'node:assert/strict';
import { calculateFinancialSummary } from './legacy-finance.js';

const workbookReconciliation = [
  { date: '2026-06-30', type: 'income', incomeAmount: 179986.02 },
  { date: '2026-06-30', type: 'expense', expenseAmount: 179103.211 },
  { date: '2026-07-01', type: 'income', incomeAmount: 11574.31 },
  { date: '2026-07-31', type: 'expense', expenseAmount: 12153.40 },
];

const summary = calculateFinancialSummary(workbookReconciliation, '2026-07-01', '2026-07-31');
assert.equal(Number(summary.openingBalance.toFixed(2)), 882.81);
assert.equal(Number(summary.income.toFixed(2)), 11574.31);
assert.equal(Number(summary.expense.toFixed(2)), 12153.40);
assert.equal(Number(summary.availableIncome.toFixed(2)), 12457.12);
assert.equal(Number(summary.closingBalance.toFixed(2)), 303.72);

console.log('MEG legacy financial reconciliation passed.');
