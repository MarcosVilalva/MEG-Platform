import assert from 'node:assert/strict';
import {
  isFinancialState,
  mergeRecoveryStates,
  mergeRecoveryStatesWithReport,
  persistCanonicalRemoteState,
  recoveryDecision,
  transactionCount,
} from './state-recovery-core.js';

const baseline = {
  transactions: [
    { id: 'shared-web', amount: 20, status: 'pending' },
    { id: 'shared-local', amount: 30, status: 'pending' },
    { id: 'shared-conflict', amount: 60, status: 'pending' },
    { id: 'deleted-local', amount: 40, status: 'pending' },
  ],
  budgets: { CASA: 100 },
};

const remote = {
  transactions: [
    { id: 'shared-web', amount: 20, status: 'paid' },
    { id: 'shared-local', amount: 30, status: 'pending' },
    { id: 'shared-conflict', amount: 60, status: 'paid' },
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
    { id: 'shared-conflict', amount: 60, status: 'cancelled' },
    { id: 'local-only', amount: 50 },
  ],
  budgets: { CASA: 120, CARRO: 80 },
  catalogs: { groups: ['CASA', 'CARRO'] },
};

assert.equal(isFinancialState(remote), true);
assert.equal(isFinancialState({ transactions: null }), false);
assert.equal(transactionCount(local), 4);

const report = mergeRecoveryStatesWithReport(remote, local, baseline);
assert.equal(report.appliedChanges, 3);
assert.equal(report.conflicts, 1);
assert.equal(report.additions, 1);
assert.equal(report.updates, 1);
assert.equal(report.deletions, 1);
assert.equal(report.state.transactions.find((item) => item.id === 'shared-web').status, 'paid');
assert.equal(report.state.transactions.find((item) => item.id === 'shared-local').amount, 35);
assert.equal(report.state.transactions.find((item) => item.id === 'shared-conflict').status, 'paid');
assert.equal(report.state.transactions.some((item) => item.id === 'deleted-local'), false);
assert.equal(report.state.transactions.some((item) => item.id === 'local-only'), true);
assert.deepEqual(report.state.budgets, { CASA: 150 });

const merged = mergeRecoveryStates(remote, local, baseline);
assert.equal(merged.transactions.length, 5);

const storage = new Map();
globalThis.window = {
  localStorage: {
    setItem(key, value) { storage.set(key, value); },
  },
};

assert.equal(persistCanonicalRemoteState(remote, 7), true);
assert.deepEqual(JSON.parse(storage.get('meg-financas-state-v4-paid-fixes')), remote);
assert.equal(storage.get('meg-cloud-revision-v1'), '7');
const canonicalCache = JSON.parse(storage.get('meg-cloud-canonical-cache-v2'));
assert.equal(canonicalCache.revision, 7);
assert.deepEqual(canonicalCache.state, remote);

const cleanOpening = recoveryDecision({
  dirty: null,
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
});
assert.equal(cleanOpening.action, 'remote');
assert.equal(cleanOpening.strategy, 'remote-canonical');
assert.equal(cleanOpening.state, remote);

const sameRevision = recoveryDecision({
  dirty: { baseRevision: 7 },
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
});
assert.equal(sameRevision.action, 'remote');
assert.equal(sameRevision.strategy, 'remote-canonical-same-revision');
assert.equal(sameRevision.state, remote);
assert.equal(sameRevision.protectedLocal, true);
assert.equal(sameRevision.conflicts, 1);
assert.deepEqual(JSON.parse(storage.get('meg-financas-state-v4-paid-fixes')), remote);

const changedRevision = recoveryDecision({
  dirty: { baseRevision: 6 },
  localState: local,
  remoteState: remote,
  remoteRevision: 7,
  baselineState: baseline,
  baselineRevision: 6,
});
assert.equal(changedRevision.action, 'remote');
assert.equal(changedRevision.strategy, 'remote-canonical-offline-changes');
assert.equal(changedRevision.state, remote);
assert.equal(changedRevision.protectedLocal, true);
assert.equal(changedRevision.conflicts, 1);
assert.equal(changedRevision.additions, 1);
assert.equal(changedRevision.updates, 1);
assert.equal(changedRevision.deletions, 1);

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
assert.equal(conflictingDelete.strategy, 'remote-canonical-offline-changes');
assert.equal(conflictingDelete.state.transactions[0].status, 'paid');
assert.equal(conflictingDelete.protectedLocal, true);

const identicalLocal = recoveryDecision({
  dirty: { baseRevision: 7 },
  localState: remote,
  remoteState: remote,
  remoteRevision: 7,
});
assert.equal(identicalLocal.action, 'remote');
assert.equal(identicalLocal.strategy, 'remote-canonical-no-change');
assert.equal(identicalLocal.protectedLocal, false);

delete globalThis.window;

console.log('state recovery core tests passed');
