import assert from 'node:assert/strict';
import { applyTransactionPatch, mergeActivityLog } from './transaction-patch';

const activity0 = { id: 'activity-0', action: 'CREATED', transactionId: '2' };
const activity1 = { id: 'activity-1', action: 'UPDATED', transactionId: '1' };
const activity2 = { id: 'activity-2', action: 'CREATED', transactionId: '3' };

const state = {
  transactions: [
    { id: '1', description: 'A', amount: 10 },
    { id: '2', description: 'B', amount: 20 },
  ],
  budgets: { CASA: 1000 },
  activityLog: [activity0],
};

const result = applyTransactionPatch(
  state,
  [
    { id: '1', description: 'A alterado', amount: 15 },
    { id: '3', description: 'C', amount: 30 },
  ],
  ['2'],
  { activityLog: [activity1, activity0] },
  [activity2, activity1],
);

assert.deepEqual(result, {
  transactions: [
    { id: '1', description: 'A alterado', amount: 15 },
    { id: '3', description: 'C', amount: 30 },
  ],
  budgets: { CASA: 1000 },
  activityLog: [activity2, activity1, activity0],
});

assert.deepEqual(mergeActivityLog(state, [activity1, activity0]), [activity1, activity0]);

const empty = applyTransactionPatch(null, [{ id: '1', description: 'A' }], []);
assert.deepEqual(empty, { transactions: [{ id: '1', description: 'A' }] });

console.log('app-state transaction patch tests passed');
