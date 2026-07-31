import assert from 'node:assert/strict';
import { applyTransactionPatch } from './transaction-patch';

const state = {
  transactions: [
    { id: '1', description: 'A', amount: 10 },
    { id: '2', description: 'B', amount: 20 },
  ],
  budgets: { CASA: 1000 },
};

const result = applyTransactionPatch(
  state,
  [
    { id: '1', description: 'A alterado', amount: 15 },
    { id: '3', description: 'C', amount: 30 },
  ],
  ['2'],
);

assert.deepEqual(result, {
  transactions: [
    { id: '1', description: 'A alterado', amount: 15 },
    { id: '3', description: 'C', amount: 30 },
  ],
  budgets: { CASA: 1000 },
});

const empty = applyTransactionPatch(null, [{ id: '1', description: 'A' }], []);
assert.deepEqual(empty, { transactions: [{ id: '1', description: 'A' }] });

console.log('app-state transaction patch tests passed');
