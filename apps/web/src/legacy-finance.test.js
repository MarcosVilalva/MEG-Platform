import assert from 'node:assert/strict';
import { calculateCurrentMonthHealth, calculateFinancialSummary } from './legacy-finance.js';
import { excelDateToIso } from './legacy-import-utils.js';
import { installmentDueDate, splitInstallmentAmounts } from './legacy-installments.js';

assert.equal(excelDateToIso(new Date('2026-07-01T00:00:00.000Z')), '2026-07-01');
assert.equal(excelDateToIso(new Date('2026-07-02T00:00:00.000Z')), '2026-07-02');
assert.deepEqual(splitInstallmentAmounts(100, 3), [33.34, 33.33, 33.33]);
assert.equal(installmentDueDate('2026-07-31', 1), '2026-08-31');
assert.equal(installmentDueDate('2026-07-31', 2), '2026-09-30');
assert.equal(installmentDueDate('2026-07-11', 0), '2026-07-13');

const workbookReconciliation = [
  { date: '2026-06-30', type: 'income', incomeAmount: 179986.02 },
  { date: '2026-06-30', type: 'expense', expenseAmount: 179103.211 },
  { date: '2026-06-15', type: 'income', incomeAmount: 900, description: 'VEROCARD' },
  { date: '2026-06-20', type: 'expense', expenseAmount: 700, paymentMethod: 'VEROCARD', status: 'paid' },
  { date: '2026-07-01', type: 'income', incomeAmount: 9574.31, description: 'RECEITAS EM CONTA' },
  { date: '2026-07-02', type: 'income', incomeAmount: 2000, description: 'VEROCARD' },
  { date: '2026-07-10', type: 'expense', expenseAmount: 4419.66, status: 'paid' },
  { date: '2026-07-31', type: 'expense', expenseAmount: 7733.74, status: 'pending' },
];

const summary = calculateFinancialSummary(workbookReconciliation, '2026-07-01', '2026-07-31');
assert.equal(Number(summary.openingBalance.toFixed(2)), 882.81);
assert.equal(Number(summary.income.toFixed(2)), 9574.31);
assert.equal(Number(summary.ticketIncome.toFixed(2)), 2000);
assert.equal(Number(summary.ticketExpense.toFixed(2)), 0);
assert.equal(Number(summary.ticketBalance.toFixed(2)), 2000);
assert.equal(Number(summary.expense.toFixed(2)), 12153.40);
assert.equal(Number(summary.paidExpense.toFixed(2)), 4419.66);
assert.equal(Number(summary.pendingExpense.toFixed(2)), 7733.74);
assert.equal(Number(summary.operatingResult.toFixed(2)), -2579.09);
assert.equal(Number(summary.availableIncome.toFixed(2)), 10457.12);
assert.equal(Number(summary.closingBalance.toFixed(2)), 6037.46);
assert.equal(Number(summary.projectedBalance.toFixed(2)), -1696.28);
assert.equal(Number(summary.consolidatedIncome.toFixed(2)), 12457.12);
assert.equal(Number(summary.consolidatedExpense.toFixed(2)), 4419.66);
assert.equal(Number(summary.consolidatedBalance.toFixed(2)), 8037.46);

const classificationSummary = calculateFinancialSummary([
  { date: '2026-07-01', type: 'income', description: 'VEROCARD', paymentMethod: '', incomeAmount: 2000 },
  { date: '2026-07-01', type: 'income', description: 'SALÁRIO', paymentMethod: 'VEROCARD', incomeAmount: 3000 },
  { date: '2026-07-02', type: 'expense', description: 'COMPRA MERCADO', paymentMethod: 'VEROCARD', expenseAmount: 500, status: 'paid' },
  { date: '2026-07-02', type: 'expense', description: 'AJUSTE VEROCARD', paymentMethod: 'PIX', expenseAmount: 100, status: 'paid' },
], '2026-07-01', '2026-07-31');
assert.equal(classificationSummary.income, 3000);
assert.equal(classificationSummary.expense, 100);
assert.equal(classificationSummary.ticketIncome, 2000);
assert.equal(classificationSummary.ticketExpense, 500);
assert.equal(classificationSummary.ticketBalance, 1500);

const februarySummary = calculateFinancialSummary([
  { date: '2025-12-31', type: 'income', incomeAmount: 12000 },
  { date: '2025-12-31', type: 'expense', expenseAmount: 4000 },
  { date: '2026-01-31', type: 'income', incomeAmount: 10000 },
  { date: '2026-01-31', type: 'expense', expenseAmount: 1376.54 },
  { date: '2026-02-01', type: 'income', incomeAmount: 9773.44 },
], '2026-02-01', '2026-02-28');
assert.equal(Number(februarySummary.openingBalance.toFixed(2)), 16623.46);
assert.equal(Number(februarySummary.availableIncome.toFixed(2)), 26396.90);

const marchSummary = calculateFinancialSummary([
  { date: '2026-01-31', type: 'income', incomeAmount: 1000 },
  { date: '2026-02-28', type: 'income', incomeAmount: 500 },
  { date: '2026-02-28', type: 'expense', expenseAmount: 200 },
  { date: '2026-03-01', type: 'income', incomeAmount: 700 },
], '2026-03-01', '2026-03-31');
assert.equal(Number(marchSummary.openingBalance.toFixed(2)), 1300);
assert.equal(Number(marchSummary.availableIncome.toFixed(2)), 2000);

const customRangeSummary = calculateFinancialSummary([
  { date: '2026-05-10', type: 'income', incomeAmount: 1000 },
  { date: '2026-05-20', type: 'expense', expenseAmount: 400, status: 'paid' },
  { date: '2026-06-05', type: 'income', incomeAmount: 500 },
  { date: '2026-06-10', type: 'expense', expenseAmount: 300, status: 'paid' },
  { date: '2026-06-25', type: 'expense', expenseAmount: 200, status: 'pending' },
  { date: '2026-07-02', type: 'income', incomeAmount: 200 },
  { date: '2026-07-08', type: 'expense', expenseAmount: 100, status: 'paid' },
  { date: '2026-07-12', type: 'expense', expenseAmount: 50, status: 'pending' },
  { date: '2026-07-01', type: 'income', description: 'VEROCARD', incomeAmount: 300 },
], '2026-06-01', '2026-07-14');
assert.equal(customRangeSummary.openingBalance, 600);
assert.equal(customRangeSummary.income, 700);
assert.equal(customRangeSummary.paidExpense, 400);
assert.equal(customRangeSummary.pendingExpense, 250);
assert.equal(customRangeSummary.closingBalance, 900);
assert.equal(customRangeSummary.projectedBalance, 650);
assert.equal(customRangeSummary.ticketIncome, 300);

const currentMonthHealth = calculateCurrentMonthHealth([
  { date: '2026-06-30', type: 'income', incomeAmount: 3000 },
  { date: '2026-06-30', type: 'expense', expenseAmount: 1000, status: 'paid' },
  { date: '2026-07-01', type: 'income', incomeAmount: 2000 },
  { date: '2026-07-02', type: 'income', description: 'VEROCARD', incomeAmount: 500 },
  { date: '2026-07-05', type: 'expense', expenseAmount: 1500, status: 'paid' },
  { date: '2026-07-10', type: 'expense', expenseAmount: 300, status: 'pending' },
  { date: '2026-07-20', type: 'expense', expenseAmount: 2500, status: 'pending' },
  { date: '2026-07-22', type: 'expense', paymentMethod: 'VEROCARD', expenseAmount: 200, status: 'pending' },
], '2026-07-01', '2026-07-14', '2026-07-31');
assert.equal(currentMonthHealth.availableToday, 2500);
assert.equal(currentMonthHealth.pendingValue, 2800);
assert.equal(currentMonthHealth.projectedClosing, -300);
assert.equal(currentMonthHealth.pendingItems.length, 2);
assert.equal(currentMonthHealth.overdueItems.length, 1);
assert.equal(currentMonthHealth.nextDue.date, '2026-07-20');

console.log('MEG legacy financial reconciliation passed.');
