import assert from 'node:assert/strict';
import { activityLogLimit, appendTransactionActivities, transactionChanges } from './activity-log-core.js';

const previous = {
  transactions: [
    { id: 'mantido', date: '2026-08-28', description: 'Conta', type: 'expense', amount: 40, paymentMethod: 'PIX' },
    { id: 'alterado', date: '2026-08-28', description: 'Paciente', type: 'income', amount: 100, paymentMethod: 'PIX' },
    { id: 'excluido', date: '2026-08-27', description: 'Antigo', type: 'expense', amount: 20 },
  ],
  budgets: {},
  activityLog: [{ id: 'anterior', at: '2026-08-27T10:00:00.000Z', action: 'CREATED' }],
};

const next = {
  transactions: [
    { id: 'mantido', date: '2026-08-28', description: 'Conta', type: 'expense', amount: 40, paymentMethod: 'PIX' },
    { id: 'alterado', date: '2026-08-28', description: 'Paciente Dona Balbina', type: 'income', amount: 150, paymentMethod: 'PIX' },
    { id: 'novo', date: '2026-08-28', description: 'Nova receita', type: 'income', incomeAmount: 90, paymentMethod: 'PIX' },
  ],
  budgets: {},
};

const changes = transactionChanges(previous, next);
assert.equal(changes.length, 3);
assert.deepEqual(changes.map((item) => item.action).sort(), ['CREATED', 'DELETED', 'UPDATED']);
assert.equal(changes.find((item) => item.action === 'UPDATED').transaction.amount, 150);
assert.equal(changes.find((item) => item.action === 'UPDATED').transaction.description, 'Paciente Dona Balbina');

const logged = appendTransactionActivities(
  previous,
  next,
  { id: 'user-1', name: 'Marcos' },
  new Date('2026-08-28T18:30:00.000Z'),
);
assert.equal(logged.activityLog.length, 4);
assert.equal(logged.activityLog[0].userId, 'user-1');
assert.equal(logged.activityLog[0].userName, 'Marcos');
assert.equal(logged.activityLog[0].at, '2026-08-28T18:30:00.000Z');
assert.equal(logged.activityLog.at(-1).id, 'anterior');
assert.equal(activityLogLimit(), 500);

const unchanged = appendTransactionActivities(next, next, { name: 'Marcos' });
assert.equal(unchanged, next);

const many = {
  ...next,
  activityLog: Array.from({ length: 500 }, (_, index) => ({ id: `old-${index}` })),
};
const withOneMore = appendTransactionActivities(
  many,
  { ...many, transactions: [...many.transactions, { id: 'limite', date: '2026-08-29', description: 'Limite', type: 'income', amount: 1 }] },
  { name: 'Marcos' },
  new Date('2026-08-29T12:00:00.000Z'),
);
assert.equal(withOneMore.activityLog.length, 500);
assert.equal(withOneMore.activityLog[0].transactionId, 'limite');

console.log('activity log core tests passed');
