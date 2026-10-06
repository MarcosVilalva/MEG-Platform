import assert from 'node:assert/strict';
import { createMegDataSource, indexMegData, mergeMegDataSource, validateMegDataSource } from './data.js';
import { deriveTransactionView } from './derived.js';
import {
  composeMegApiSnapshot,
  fromCanonicalReadModels,
  fromCards,
  fromFinanceCatalogs,
  fromFinancialEvents,
  fromPayables,
  fromSyncStatus,
} from './api-adapter.js';

const source = createMegDataSource({
  accounts: [
    { id: 'account-a', type: 'CHECKING' },
    { id: 'account-b', type: 'BENEFIT' },
  ],
  categories: [{ id: 'category-a', name: 'Teste' }],
  classifications: [{ id: 'class-a', name: 'Teste' }],
  paymentMethods: [{ id: 'payment-a', name: 'Teste' }],
  cards: [{ id: 'card-a' }],
  statements: [{ id: 'statement-a', cardId: 'card-a' }],
  transactions: [
    { id: 'tx-1', accountId: 'account-a', categoryId: 'category-a', classificationId: 'class-a', paymentMethodId: 'payment-a', signedAmount: 10.01, status: 'paid' },
    { id: 'tx-2', accountId: 'account-a', categoryId: 'category-a', classificationId: 'class-a', paymentMethodId: 'payment-a', signedAmount: -3.34, status: 'paid' },
    { id: 'tx-3', accountId: 'account-a', categoryId: 'category-a', classificationId: 'class-a', paymentMethodId: 'payment-a', signedAmount: -1.11, status: 'planned' },
  ],
  payables: [{ id: 'payable-a', transactionId: 'tx-3', categoryId: 'category-a' }],
  installments: [{ id: 'installment-a', cardId: 'card-a', transactionId: 'tx-2', statementId: 'statement-a' }],
  benefits: [{ id: 'benefit-a', accountId: 'account-b' }],
  transfers: [{ id: 'transfer-a', fromAccountId: 'account-a', toAccountId: 'account-b' }],
});

assert.deepEqual(validateMegDataSource(source), { valid: true, errors: [] });

const index = indexMegData(source);
assert.equal(index.transactions.get('tx-2').signedAmount, -3.34);

const all = deriveTransactionView(source);
assert.equal(all.count, 3);
assert.equal(all.signedTotal, 5.56);
assert.equal(all.byStatus.get('paid'), 2);

const paid = deriveTransactionView(source, (item) => item.status === 'paid');
assert.equal(paid.count, 2);
assert.equal(paid.signedTotal, 6.67);

const merged = mergeMegDataSource(source, createMegDataSource({
  meta: { mode: 'api', sources: ['patch'] },
  transactions: [{ ...source.transactions[0], description: 'Atualizado' }],
}));
assert.equal(merged.transactions.length, 3);
assert.equal(merged.transactions.find((item) => item.id === 'tx-1').description, 'Atualizado');
assert.deepEqual(merged.meta.sources, ['patch']);

const catalogs = fromFinanceCatalogs({
  accounts: [
    { id: 'acc-1', name: 'Conta', type: 'checking', openingBalance: '100.00' },
    { id: 'acc-2', name: 'Conta destino', type: 'checking', openingBalance: '0' },
  ],
  categories: [{ id: 'cat-1', name: 'Mercado', type: 'expense' }],
  paymentMethods: [{ id: 'pm-1', name: 'PIX', type: 'instant' }],
});
const events = fromFinancialEvents({
  items: [
    {
      id: 'evt-1',
      description: 'Compra',
      type: 'expense',
      status: 'paid',
      date: '2026-10-06T12:00:00.000Z',
      competence: '2026-10',
      amount: '25.50',
      signedAmount: '-25.50',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      paymentMethodId: 'pm-1',
    },
    {
      id: 'evt-transfer-source',
      description: 'Transferência entre contas',
      type: 'transfer',
      status: 'paid',
      date: '2026-10-06T12:00:00.000Z',
      competence: '2026-10',
      amount: '20.00',
      signedAmount: '-20.00',
      accountId: 'acc-1',
      sourcePayload: { transferId: 'transfer-123', transferLeg: 'source', counterpartyAccountId: 'acc-2' },
    },
    {
      id: 'evt-transfer-destination',
      description: 'Transferência entre contas',
      type: 'transfer',
      status: 'paid',
      date: '2026-10-06T12:00:00.000Z',
      competence: '2026-10',
      amount: '20.00',
      signedAmount: '20.00',
      accountId: 'acc-2',
      sourcePayload: { transferId: 'transfer-123', transferLeg: 'destination', counterpartyAccountId: 'acc-1' },
    },
  ],
});
const payables = fromPayables([{
  id: 'pay-1',
  description: 'Conta',
  totalAmount: '80.00',
  openAmount: '80.00',
  dueDate: '2026-10-10T00:00:00.000Z',
  status: 'open',
  categoryId: 'cat-1',
}]);
const cards = fromCards([{
  id: 'card-1',
  name: 'Cartão',
  creditLimit: '1000.00',
  usedLimit: '300.00',
  availableLimit: '700.00',
  statementAmount: '100.00',
  payableStatementAmount: '100.00',
  statementCreditBalance: '0',
  closingDay: 10,
  dueDay: 18,
  statement: { month: '2026-10', netAmount: 100 },
  purchases: [{
    id: 'purchase-1',
    description: 'Compra parcelada',
    purchaseDate: '2026-10-01T00:00:00.000Z',
    entries: [
      { id: 'inst-1', number: 1, amount: '50.00', partialPaidAmount: '0', statementMonth: '2026-10', status: 'open' },
      { id: 'inst-2', number: 2, amount: '50.00', partialPaidAmount: '0', statementMonth: '2026-11', status: 'open' },
    ],
  }],
}]);
const readModels = fromCanonicalReadModels({
  summary: { month: '2026-10', availableBalance: 74.50 },
  cashflow: { month: '2026-10', realizedClosing: 74.50 },
});
const sync = fromSyncStatus({ token: 'sync-1', changedAt: '2026-10-06T12:00:00.000Z' });

const snapshot = composeMegApiSnapshot([catalogs, events, payables, cards, readModels, sync]);
assert.equal(snapshot.meta.mode, 'api');
assert.equal(snapshot.meta.month, '2026-10');
assert.equal(snapshot.meta.syncToken, 'sync-1');
assert.equal(snapshot.transactions[0].amount, 25.5);
assert.equal(snapshot.transfers.length, 1);
assert.deepEqual(snapshot.transfers[0], {
  id: 'transfer-123',
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
  amount: 20,
  date: '2026-10-06',
  status: 'paid',
  description: 'Transferência entre contas',
  sourceEventId: 'evt-transfer-source',
  destinationEventId: 'evt-transfer-destination',
});
assert.equal(snapshot.cards[0].availableLimit, 700);
assert.equal(snapshot.installments.length, 2);
assert.ok(snapshot.statements.some((item) => item.id === 'card-1:2026-11'));
assert.equal(snapshot.readModels.summary.availableBalance, 74.5);
assert.deepEqual(validateMegDataSource(snapshot), { valid: true, errors: [] });

const broken = createMegDataSource({ transactions: [{ id: 'tx-x', accountId: 'missing' }] });
assert.equal(validateMegDataSource(broken).valid, false);

assert.equal(createMegDataSource().transactions.length, 0);
assert.equal(createMegDataSource().readModels.summary, null);

console.log('MEG Web Evolution data source contract: OK');
