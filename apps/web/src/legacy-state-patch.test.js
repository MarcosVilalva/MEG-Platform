import assert from 'node:assert/strict';
import { createStateSyncBaseline, createTransactionPatch } from './legacy-state-patch.js';

const original = {
  transactions: [
    { id: '1', date: '2026-07-01', description: 'A', type: 'expense', amount: 10 },
    { id: '2', date: '2026-07-02', description: 'B', type: 'income', amount: 20 },
  ],
  budgets: { CASA: 1000 },
  catalogs: { groups: ['CASA'] },
};

const baseline = createStateSyncBaseline(original);

assert.deepEqual(createTransactionPatch(baseline, structuredClone(original)), { upserts: [], deletes: [] });
assert.equal(typeof baseline.transactions.get('1'), 'string');
assert.ok(baseline.transactions.get('1').length < JSON.stringify(original.transactions[0]).length);

const changed = structuredClone(original);
changed.transactions[0].amount = 15;
changed.transactions.push({ id: '3', date: '2026-07-03', description: 'C', type: 'expense', amount: 30 });
changed.transactions.splice(1, 1);
assert.deepEqual(createTransactionPatch(baseline, changed), {
  upserts: [changed.transactions[0], changed.transactions[1]],
  deletes: ['2'],
});

const metadataChanged = structuredClone(original);
metadataChanged.budgets.CASA = 1200;
assert.equal(createTransactionPatch(baseline, metadataChanged), null);

const duplicate = structuredClone(original);
duplicate.transactions.push({ ...duplicate.transactions[0] });
assert.equal(createTransactionPatch(baseline, duplicate), null);

const tooLarge = structuredClone(original);
tooLarge.transactions.push({ id: '3', date: '2026-07-03', description: 'C', type: 'expense', amount: 30 });
assert.equal(createTransactionPatch(baseline, tooLarge, { maxOperations: 0 }), null);

const largeState = {
  transactions: Array.from({ length: 5000 }, (_, index) => ({
    id: `transaction-${index}`,
    date: '2026-07-01',
    description: `Lançamento ${index} com uma descrição maior para validar o consumo do baseline`,
    type: index % 2 ? 'expense' : 'income',
    amount: index + 0.5,
    notes: 'Observação de teste repetida para simular uma base financeira real.',
  })),
  budgets: {},
};
const largeBaseline = createStateSyncBaseline(largeState);
const serializedTransactionBytes = largeState.transactions.reduce((total, item) => total + JSON.stringify(item).length, 0);
const fingerprintBytes = [...largeBaseline.transactions.values()].reduce((total, item) => total + item.length, 0);
assert.ok(fingerprintBytes < serializedTransactionBytes * 0.25);

console.log('legacy-state-patch tests passed');
