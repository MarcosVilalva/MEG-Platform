import assert from 'node:assert/strict';
import { isFinancialState, mergeRecoveryStates, recoveryDecision, transactionCount } from './state-recovery-core.js';

const remote = {
  transactions: [
    { id: 'remote-only', amount: 10 },
    { id: 'shared', amount: 20, notes: 'remote' },
  ],
  budgets: { CASA: 100 },
  catalogs: { groups: ['CASA'] },
};
const local = {
  transactions: [
    { id: 'shared', amount: 25, notes: 'local' },
    { id: 'local-only', amount: 30 },
  ],
  budgets: { CASA: 120, CARRO: 80 },
  catalogs: { groups: ['CASA', 'CARRO'] },
};

assert.equal(isFinancialState(remote), true);
assert.equal(isFinancialState({ transactions: null }), false);
assert.equal(transactionCount(local), 2);

const merged = mergeRecoveryStates(remote, local);
assert.equal(merged.transactions.length, 3);
assert.equal(merged.transactions.find((item) => item.id === 'shared').amount, 25);
assert.deepEqual(merged.budgets, { CASA: 120, CARRO: 80 });
assert.deepEqual(merged.catalogs.groups, ['CASA', 'CARRO']);

assert.equal(recoveryDecision({ dirty: null, localState: local, remoteState: remote, remoteRevision: 7 }).action, 'remote');

const sameRevision = recoveryDecision({
  dirty: { baseRevision: 7 },
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
});
assert.equal(sameRevision.action, 'recover');
assert.equal(sameRevision.strategy, 'local');
assert.equal(sameRevision.state, local);
assert.equal(sameRevision.mergedCount, 2);

const changedRevision = recoveryDecision({
  dirty: { baseRevision: 6 },
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
});
assert.equal(changedRevision.action, 'recover');
assert.equal(changedRevision.strategy, 'merge');
assert.equal(changedRevision.localCount, 2);
assert.equal(changedRevision.remoteCount, 2);
assert.equal(changedRevision.mergedCount, 3);

console.log('state recovery core tests passed');
