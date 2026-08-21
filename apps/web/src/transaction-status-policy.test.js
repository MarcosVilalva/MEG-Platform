import assert from 'node:assert/strict';
import { transactionStatusPolicy } from './transaction-status-policy.js';

assert.deepEqual(
  transactionStatusPolicy({ type: 'expense', modality: 'CREDITO', isNew: true }),
  { status: 'pending', locked: true, reason: 'credit' },
);
assert.deepEqual(
  transactionStatusPolicy({ type: 'expense', modality: 'À VISTA', isNew: true }),
  { status: 'pending', locked: false, reason: 'selectable' },
);
assert.deepEqual(
  transactionStatusPolicy({ type: 'expense', modality: 'ALIMENTAÇÃO', isNew: true }),
  { status: 'paid', locked: true, reason: 'benefit' },
);
assert.deepEqual(
  transactionStatusPolicy({ type: 'income', modality: 'À VISTA', isNew: true }),
  { status: 'paid', locked: true, reason: 'income' },
);
assert.deepEqual(
  transactionStatusPolicy({ type: 'expense', modality: 'CREDITO', currentStatus: 'paid', isNew: false }),
  { status: 'paid', locked: true, reason: 'credit' },
  'editar uma parcela já paga não pode reabri-la',
);

console.log('transaction status policy tests passed');
