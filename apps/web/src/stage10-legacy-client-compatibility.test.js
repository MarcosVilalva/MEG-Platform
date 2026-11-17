import assert from 'node:assert/strict';
import { createStateSyncBaseline, createTransactionPatch } from './legacy-state-patch.js';
import {
  buildTransactionOperations,
  applyTransactionOperations,
  verifyTransactionOperations,
} from './cloud-write-ahead-core.js';

/**
 * Caracterizacao READ-ONLY do contrato do cliente web legado/Capacitor.
 * Não muda código do Android, nem implementa restauração.
 */
const original = {
  transactions: [
    { id: 'legacy-qa-1', date: '2026-11-11', description: 'Lançamento fictício', type: 'expense', amount: 10.25 },
  ],
  budgets: {},
};
const removed = { ...original, transactions: [] };
const baseline = createStateSyncBaseline(original);
const deletePatch = createTransactionPatch(baseline, removed);
assert.deepEqual(deletePatch, { upserts: [], deletes: ['legacy-qa-1'] });
assert.deepEqual(buildTransactionOperations(original, removed), {
  upserts: [], deletes: ['legacy-qa-1'], activities: [],
});
assert.equal(verifyTransactionOperations(applyTransactionOperations(original, deletePatch), deletePatch), true);

// O cliente permite reinserir a mesma chave legada depois de exclusão.
const restoration = createTransactionPatch(createStateSyncBaseline(removed), original);
assert.deepEqual(restoration, {
  upserts: [original.transactions[0]], deletes: [],
});
assert.deepEqual(buildTransactionOperations(removed, original), {
  upserts: [original.transactions[0]], deletes: [], activities: [],
});

// Não reinterpretar uma reinserção como um novo ID financeiro ou como
// autorização silenciosa para ressuscitar transação arquivada no servidor.
console.log('MEG_STAGE10_LEGACY_CLIENT_DELETE_REINSERT_CONTRACT_CHARACTERIZED PASS');
