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

console.log('legacy-state-patch tests passed');
