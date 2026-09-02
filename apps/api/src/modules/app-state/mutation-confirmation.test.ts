import assert from 'node:assert/strict';
import { buildMutationConfirmation } from './mutation-confirmation';

assert.deepEqual(buildMutationConfirmation(
  {
    transactions: [{ amount: 10, id: 'a' }],
    activityLog: [{ action: 'CREATED', id: 'act-a' }],
  },
  'op-a',
  7,
  ['a'],
  ['gone'],
  ['act-a'],
), {
  operationId: 'op-a',
  revision: 7,
  committed: true,
  upserts: [{ amount: 10, id: 'a' }],
  deletes: ['gone'],
  activities: [{ action: 'CREATED', id: 'act-a' }],
});

console.log('app-state mutation confirmation tests passed');
