import assert from 'node:assert/strict';
import test from 'node:test';
import {
  reconcileStateOutboxes,
  reconcileTransactionOutboxes,
} from './durable-outbox-core.js';

test('recupera operações que existem somente no IndexedDB', () => {
  const result = reconcileTransactionOutboxes(null, {
    generation: 4,
    operationId: 'old-operation',
    upserts: [{ id: 'expense-1', amount: 99.9 }],
    deletes: [],
    activities: [],
    updatedAt: '2026-09-04T10:00:00.000Z',
  });
  assert.deepEqual(result.upserts.map((item) => item.id), ['expense-1']);
  assert.equal(result.generation, 4);
});

test('combina filas divergentes sem perder alteração nem exclusão', () => {
  const result = reconcileTransactionOutboxes(
    { generation: 5, upserts: [{ id: 'expense-2', amount: 20 }], deletes: [], activities: [], updatedAt: '2026-09-04T11:00:00.000Z' },
    { generation: 4, upserts: [{ id: 'expense-1', amount: 10 }], deletes: ['expense-3'], activities: [], updatedAt: '2026-09-04T10:00:00.000Z' },
  );
  assert.deepEqual(new Set(result.upserts.map((item) => item.id)), new Set(['expense-1', 'expense-2']));
  assert.deepEqual(result.deletes, ['expense-3']);
  assert.equal(result.operationId, '');
  assert.equal(result.generation, 6);
});

test('a versão mais nova de uma propriedade prevalece e as demais são preservadas', () => {
  const result = reconcileStateOutboxes(
    { generation: 8, properties: { budgets: { saude: 500 } }, updatedAt: '2026-09-04T12:00:00.000Z' },
    { generation: 7, properties: { budgets: { saude: 400 }, accounts: [{ id: 'main' }] }, updatedAt: '2026-09-04T11:00:00.000Z' },
  );
  assert.deepEqual(result.properties.budgets, { saude: 500 });
  assert.deepEqual(result.properties.accounts, [{ id: 'main' }]);
  assert.equal(result.operationId, '');
});
