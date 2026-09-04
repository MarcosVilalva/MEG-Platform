import assert from 'node:assert/strict';
import { classifyTransactionsPreview } from './transaction-classification-core';

const classifications = classifyTransactionsPreview([
  { id: 'rent-1', date: '2026-07-10', description: 'Aluguel', type: 'expense', amount: 1200, group: 'Moradia' },
  { id: 'rent-2', date: '2026-08-10', description: 'Aluguel', type: 'expense', amount: 1200, group: 'Moradia' },
  { id: 'rent-3', date: '2026-09-10', description: 'Aluguel', type: 'expense', amount: 1200, group: 'Moradia' },
  { id: 'energy-1', date: '2026-09-12', description: 'Energia', type: 'expense', amount: 190, group: 'Contas gerais' },
  { id: 'streaming-1', date: '2026-09-15', description: 'Assinatura streaming', type: 'expense', amount: 39.9, group: 'Lazer' },
  { id: 'phone-2', date: '2026-10-20', description: 'Aparelho 2/8', type: 'expense', amount: 99.9, installmentSeriesId: 'phone', installmentCount: 8, group: 'Compras' },
]);

const byId = new Map(classifications.map((item) => [item.transactionId, item]));
assert.deepEqual(
  { amount: byId.get('rent-1')?.amountBehavior, necessity: byId.get('rent-1')?.necessity, frequency: byId.get('rent-1')?.frequency },
  { amount: 'FIXED', necessity: 'ESSENTIAL', frequency: 'RECURRING' },
);
assert.equal(byId.get('energy-1')?.amountBehavior, 'VARIABLE');
assert.equal(byId.get('streaming-1')?.necessity, 'FLEXIBLE');
assert.equal(byId.get('phone-2')?.frequency, 'INSTALLMENT');

console.log('transaction classification preview tests passed');
