import assert from 'node:assert/strict';
import {
  buildNormalizationPreview,
  financialEventToLegacyTransaction,
  legacyTransactionToFinancialEvent,
  normalizationFingerprint,
} from './normalization-migration-core';

const context = { workspaceId: 'workspace-1', userId: 'user-1', revision: 12 };
const state = {
  transactions: [
    { id: 'income-1', date: '2026-09-01', description: 'Salário', type: 'income', incomeAmount: 5000, status: 'paid' },
    { id: 'expense-1', date: '2026-09-02', description: 'Aluguel', type: 'expense', expenseAmount: 1200, situation: 'PAGO' },
    { id: '', date: '2026-09-03', description: 'Inválido', type: 'expense', amount: 10 },
  ],
};

const preview = buildNormalizationPreview(state, context);
assert.equal(preview.summary.sourceCount, 3);
assert.equal(preview.summary.validCount, 2);
assert.equal(preview.summary.invalidCount, 1);
assert.equal(preview.summary.income, 5000);
assert.equal(preview.summary.expense, 1200);
assert.equal(preview.summary.net, 3800);
assert.equal(preview.summary.fingerprint.length, 64);

const expense = legacyTransactionToFinancialEvent(state.transactions[1], context);
assert.equal(expense?.signedAmount, -1200);
assert.equal(expense?.status, 'paid');
assert.equal(expense?.legacyTransactionId, 'expense-1');
assert.deepEqual(financialEventToLegacyTransaction(expense!), state.transactions[1]);

const refund = legacyTransactionToFinancialEvent({
  id: 'refund-1', date: '2026-09-04', description: 'Estorno', type: 'expense', expenseAmount: -62, status: 'paid', group: 'CARTÃO',
}, context);
assert.equal(refund?.amount, 62);
assert.equal(refund?.signedAmount, 62);
assert.equal(financialEventToLegacyTransaction(refund!).expenseAmount, -62);
assert.equal(financialEventToLegacyTransaction(refund!).group, 'CARTÃO');

const baseFingerprint = normalizationFingerprint([expense!]);
assert.notEqual(normalizationFingerprint([{ ...expense!, description: 'Aluguel corrigido' }]), baseFingerprint);
assert.notEqual(normalizationFingerprint([{ ...expense!, status: 'planned' }]), baseFingerprint);
assert.notEqual(normalizationFingerprint([{ ...expense!, signedAmount: 1200 }]), baseFingerprint);
assert.notEqual(normalizationFingerprint([{ ...expense!, sourcePayload: { ...(expense!.sourcePayload as object), notes: 'alterada' } }]), baseFingerprint);

console.log('normalization migration core tests passed');
