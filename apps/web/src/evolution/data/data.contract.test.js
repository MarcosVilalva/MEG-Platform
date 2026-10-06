import assert from 'node:assert/strict';
import { createMegDataSource, indexMegData, validateMegDataSource } from './data.js';
import { deriveTransactionView } from './derived.js';

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
  payables: [{ id: 'payable-a', transactionId: 'tx-3' }],
  installments: [{ id: 'installment-a', cardId: 'card-a', transactionId: 'tx-2', statementId: 'statement-a' }],
  benefits: [{ id: 'benefit-a', accountId: 'account-b' }],
  transfers: [{ id: 'transfer-a', fromAccountId: 'account-a', toAccountId: 'account-b' }],
});

const validation = validateMegDataSource(source);
assert.deepEqual(validation, { valid: true, errors: [] });

const index = indexMegData(source);
assert.equal(index.transactions.get('tx-2').signedAmount, -3.34);

const all = deriveTransactionView(source);
assert.equal(all.count, 3);
assert.equal(all.signedTotal, 5.56);
assert.equal(all.byStatus.get('paid'), 2);

const paid = deriveTransactionView(source, (item) => item.status === 'paid');
assert.equal(paid.count, 2);
assert.equal(paid.signedTotal, 6.67);

const broken = createMegDataSource({ transactions: [{ id: 'tx-x', accountId: 'missing' }] });
assert.equal(validateMegDataSource(broken).valid, false);

console.log('MEG Web Evolution data source contract: OK');
