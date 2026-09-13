import assert from 'node:assert/strict';
import { auditIncomePaymentMethods, canonicalIncomePaymentMethod } from './income-payment-method-policy';

assert.equal(canonicalIncomePaymentMethod('Pix'), 'PIX');
assert.equal(canonicalIncomePaymentMethod('dinheiro'), 'DINHEIRO');
assert.equal(canonicalIncomePaymentMethod('Depósito   Bancário'), 'DEPÓSITO BANCÁRIO');
assert.equal(canonicalIncomePaymentMethod('Cartão BB'), null);

const current = auditIncomePaymentMethods([
  { id: 'pix', name: 'PIX', userId: 'owner', isActive: true },
  { id: 'cash-disabled', name: 'DINHEIRO', userId: 'owner', isActive: false },
  { id: 'other-user-cash', name: 'DINHEIRO', userId: 'other', isActive: true },
], 'owner');

assert.deepEqual(current.available, [{ name: 'PIX', id: 'pix' }]);
assert.deepEqual(current.missing, ['DINHEIRO', 'DEPÓSITO BANCÁRIO']);
assert.equal(current.ready, false);

const ready = auditIncomePaymentMethods([
  { id: '1', name: 'PIX', userId: 'owner', isActive: true },
  { id: '2', name: 'DINHEIRO', userId: 'owner', isActive: true },
  { id: '3', name: 'DEPOSITO BANCARIO', userId: 'owner', isActive: true },
], 'owner');
assert.equal(ready.ready, true);
assert.equal(ready.missing.length, 0);

console.log('Política dos meios de recebimento de receitas validada.');
