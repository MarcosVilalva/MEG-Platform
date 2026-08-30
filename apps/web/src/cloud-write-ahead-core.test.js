import assert from 'node:assert/strict';
import {
  applyTransactionOperations,
  buildTransactionOperations,
  hasTransactionOperations,
  mergeTransactionOutbox,
  verifyTransactionOperations,
} from './cloud-write-ahead-core.js';

const a = { id: 'a', date: '2026-08-30', description: 'A', type: 'expense', amount: 10 };
const b = { id: 'b', date: '2026-08-30', description: 'B', type: 'expense', amount: 20 };
const bEdited = { ...b, amount: 25 };
const c = { id: 'c', date: '2026-08-30', description: 'C', type: 'income', amount: 30 };

assert.deepEqual(
  buildTransactionOperations({ transactions: [a, b] }, { transactions: [a, bEdited, c] }),
  { upserts: [bEdited, c], deletes: [] },
);
assert.deepEqual(
  buildTransactionOperations({ transactions: [a, b] }, { transactions: [b] }),
  { upserts: [], deletes: ['a'] },
);

const merged = mergeTransactionOutbox(
  { upserts: [a, b], deletes: ['c'] },
  { upserts: [c, bEdited], deletes: ['a'] },
);
assert.deepEqual(merged, { upserts: [bEdited, c], deletes: ['a'] });
assert.equal(hasTransactionOperations(merged), true);
assert.equal(hasTransactionOperations({ upserts: [], deletes: [] }), false);

const remote = { transactions: [a, b], budgets: { casa: 100 } };
const applied = applyTransactionOperations(remote, { upserts: [bEdited, c], deletes: ['a'] });
assert.deepEqual(applied.transactions, [bEdited, c]);
assert.equal(applied.budgets.casa, 100);
assert.equal(verifyTransactionOperations(applied, { upserts: [bEdited, c], deletes: ['a'] }), true);
assert.equal(verifyTransactionOperations(remote, { upserts: [bEdited], deletes: [] }), false);
assert.equal(verifyTransactionOperations(remote, { upserts: [], deletes: ['a'] }), false);

console.log('cloud write-ahead core tests passed');
