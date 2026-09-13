import assert from 'node:assert/strict';
import { buildTransferLegs } from './transfer-core';

const [source, destination] = buildTransferLegs({
  transferId: 'transfer-20260912-001',
  sourceAccountId: 'conta-origem',
  destinationAccountId: 'conta-destino',
  amount: 1234.56,
  date: '2026-09-12',
  status: 'paid',
  description: 'Transferência teste',
});

assert.equal(source.leg, 'source');
assert.equal(source.accountId, 'conta-origem');
assert.equal(source.counterpartyAccountId, 'conta-destino');
assert.equal(source.amount, 1234.56);
assert.equal(source.signedAmount, -1234.56);
assert.equal(source.sourcePayload.transferId, 'transfer-20260912-001');

assert.equal(destination.leg, 'destination');
assert.equal(destination.accountId, 'conta-destino');
assert.equal(destination.counterpartyAccountId, 'conta-origem');
assert.equal(destination.amount, 1234.56);
assert.equal(destination.signedAmount, 1234.56);
assert.equal(destination.sourcePayload.transferId, source.sourcePayload.transferId);
assert.equal(Math.round((source.signedAmount + destination.signedAmount) * 100), 0,
  'Transferência interna deve conservar patrimônio líquido.');

assert.throws(() => buildTransferLegs({
  transferId: 'transfer-001', sourceAccountId: 'mesma', destinationAccountId: 'mesma', amount: 10, date: '2026-09-12'
}), /TRANSFER_ACCOUNTS_MUST_DIFFER/);

assert.throws(() => buildTransferLegs({
  transferId: 'transfer-002', sourceAccountId: 'a', destinationAccountId: 'b', amount: 0, date: '2026-09-12'
}), /INVALID_TRANSFER_AMOUNT/);

assert.throws(() => buildTransferLegs({
  transferId: 'transfer-003', sourceAccountId: 'a', destinationAccountId: 'b', amount: Number.NaN, date: '2026-09-12'
}), /INVALID_TRANSFER_AMOUNT/);

assert.throws(() => buildTransferLegs({
  transferId: 'transfer-004', sourceAccountId: 'a', destinationAccountId: 'b', amount: 10, date: '12/09/2026'
}), /INVALID_TRANSFER_DATE/);

console.log('Contrato conservativo de transferência validado.');
