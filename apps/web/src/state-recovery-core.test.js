import assert from 'node:assert/strict';
import {
  isFinancialState,
  mergeRecoveryStates,
  mergeRecoveryStatesWithReport,
  recoveryDecision,
  transactionCount,
} from './state-recovery-core.js';

const baseline = {
  transactions: [
    { id: 'shared-web', amount: 20, status: 'pending' },
    { id: 'shared-local', amount: 30, status: 'pending' },
    { id: 'deleted-local', amount: 40, status: 'pending' },
  ],
  budgets: { CASA: 100 },
};

const remote = {
  transactions: [
    { id: 'shared-web', amount: 20, status: 'paid' },
    { id: 'shared-local', amount: 30, status: 'pending' },
    { id: 'deleted-local', amount: 40, status: 'pending' },
    { id: 'remote-only', amount: 10 },
  ],
  budgets: { CASA: 150 },
  catalogs: { groups: ['CASA'] },
};

const local = {
  transactions: [
    { id: 'shared-web', amount: 20, status: 'pending' },
    { id: 'shared-local', amount: 35, status: 'pending' },
    { id: 'local-only', amount: 50 },
  ],
  budgets: { CASA: 120, CARRO: 80 },
  catalogs: { groups: ['CASA', 'CARRO'] },
};

assert.equal(isFinancialState(remote), true);
assert.equal(isFinancialState({ transactions: null }), false);
assert.equal(transactionCount(local), 3);

const report = mergeRecoveryStatesWithReport(remote, local, baseline);
assert.equal(report.appliedChanges, 3);
assert.equal(report.conflicts, 1);
assert.equal(report.additions, 1);
assert.equal(report.updates, 1);
assert.equal(report.deletions, 1);
assert.equal(report.state.transactions.find((item) => item.id === 'shared-web').status, 'paid');
assert.equal(report.state.transactions.find((item) => item.id === 'shared-local').amount, 35);
assert.equal(report.state.transactions.some((item) => item.id === 'deleted-local'), false);
assert.equal(report.state.transactions.some((item) => item.id === 'local-only'), true);
assert.deepEqual(report.state.budgets, { CASA: 150 });

const merged = mergeRecoveryStates(remote, local, baseline);
assert.equal(merged.transactions.length, 4);

assert.equal(recoveryDecision({
  dirty: null,
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
}).action, 'remote');

const sameRevision = recoveryDecision({
  dirty: { baseRevision: 7 },
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
});
assert.equal(sameRevision.action, 'recover');
assert.equal(sameRevision.strategy, 'local-same-revision');
assert.equal(sameRevision.state, local);

const changedRevision = recoveryDecision({
  dirty: { baseRevision: 6 },
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
  baselineState: baseline,
  baselineRevision: 6,
});
assert.equal(changedRevision.action, 'recover');
assert.equal(changedRevision.strategy, 'offline-delta');
assert.equal(changedRevision.conflicts, 1);
assert.equal(changedRevision.state.transactions.find((item) => item.id === 'shared-web').status, 'paid');

const migrationWithoutBaseline = recoveryDecision({
  dirty: { baseRevision: 6 },
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
});
assert.equal(migrationWithoutBaseline.action, 'remote');
assert.equal(migrationWithoutBaseline.strategy, 'remote-protected-no-baseline');
assert.equal(migrationWithoutBaseline.state, remote);
assert.equal(migrationWithoutBaseline.protectedLocal, true);

const conflictingDelete = recoveryDecision({
  dirty: { baseRevision: 6 },
  localState: { transactions: [] },
  remoteState: { transactions: [{ id: 'shared-web', status: 'paid' }] },
  remoteRevision: 7,
  baselineState: { transactions: [{ id: 'shared-web', status: 'pending' }] },
  baselineRevision: 6,
});
assert.equal(conflictingDelete.action, 'remote');
assert.equal(conflictingDelete.strategy, 'remote-wins-conflicts');
assert.equal(conflictingDelete.state.transactions[0].status, 'paid');

console.log('state recovery core tests passed');
