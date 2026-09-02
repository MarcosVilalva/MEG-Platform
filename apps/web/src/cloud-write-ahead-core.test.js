import assert from 'node:assert/strict';
import {
  applyTransactionOperations,
  buildTransactionOperations,
  hasTransactionOperations,
  mergeTransactionOutbox,
  samePersistedValue,
  verifyTransactionOperations,
  verifyMutationConfirmation,
} from './cloud-write-ahead-core.js';

const a = { id: 'a', date: '2026-08-30', description: 'A', type: 'expense', amount: 10 };
const b = { id: 'b', date: '2026-08-30', description: 'B', type: 'expense', amount: 20 };
const bEdited = { ...b, amount: 25 };
const c = { id: 'c', date: '2026-08-30', description: 'C', type: 'income', amount: 30 };
const activity1 = { id: 'act-1', at: '2026-08-30T19:00:00.000Z', action: 'UPDATED', transactionId: 'b' };
const activity2 = { id: 'act-2', at: '2026-08-30T19:01:00.000Z', action: 'CREATED', transactionId: 'c' };

assert.deepEqual(
  buildTransactionOperations(
    { transactions: [a, b], activityLog: [] },
    { transactions: [a, bEdited, c], activityLog: [activity2, activity1] },
  ),
  { upserts: [bEdited, c], deletes: [], activities: [activity2, activity1] },
);
assert.deepEqual(
  buildTransactionOperations({ transactions: [a, b] }, { transactions: [b] }),
  { upserts: [], deletes: ['a'], activities: [] },
);

const merged = mergeTransactionOutbox(
  { upserts: [a, b], deletes: ['c'], activities: [activity1] },
  { upserts: [c, bEdited], deletes: ['a'], activities: [activity2, activity1] },
);
assert.deepEqual(merged, { upserts: [bEdited, c], deletes: ['a'], activities: [activity2, activity1] });
assert.equal(hasTransactionOperations(merged), true);
assert.equal(hasTransactionOperations({ upserts: [], deletes: [], activities: [activity1] }), true);
assert.equal(hasTransactionOperations({ upserts: [], deletes: [], activities: [] }), false);

const remote = { transactions: [a, b], budgets: { casa: 100 }, activityLog: [] };
const operations = { upserts: [bEdited, c], deletes: ['a'], activities: [activity2, activity1] };
const applied = applyTransactionOperations(remote, operations);
assert.deepEqual(applied.transactions, [bEdited, c]);
assert.deepEqual(applied.activityLog, [activity2, activity1]);
assert.equal(applied.budgets.casa, 100);
assert.equal(verifyTransactionOperations(applied, operations), true);
assert.equal(verifyTransactionOperations({ ...applied, activityLog: [activity1] }, operations), false);
assert.equal(verifyTransactionOperations(remote, { upserts: [bEdited], deletes: [], activities: [] }), false);
assert.equal(verifyTransactionOperations(remote, { upserts: [], deletes: ['a'], activities: [] }), false);
assert.equal(samePersistedValue(
  { id: 'a', amount: 10, nested: { z: 1, a: 2 } },
  { nested: { a: 2, z: 1 }, amount: 10, id: 'a' },
), true);
assert.equal(verifyTransactionOperations(
  { transactions: [{ amount: 10, description: 'A', id: 'a', date: '2026-08-30', type: 'expense' }] },
  { upserts: [a], deletes: [], activities: [] },
), true);
assert.equal(verifyMutationConfirmation({
  operationId: 'op-1', committed: true, upserts: [{ amount: 10, id: 'a', type: 'expense', date: '2026-08-30', description: 'A' }], deletes: ['b'], activities: [activity1],
}, {
  operationId: 'op-1', upserts: [a], deletes: ['b'], activities: [activity1],
}), true);
assert.equal(verifyMutationConfirmation({
  operationId: 'op-wrong', committed: true, upserts: [a], deletes: ['b'], activities: [activity1],
}, {
  operationId: 'op-1', upserts: [a], deletes: ['b'], activities: [activity1],
}), false);

console.log('cloud write-ahead core tests passed');
