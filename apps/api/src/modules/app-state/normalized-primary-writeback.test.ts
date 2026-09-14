import assert from 'node:assert/strict';
import { buildNormalizationPreview, legacyTransactionToFinancialEvent, normalizationFingerprint } from './normalization-migration-core';
import { mirrorFinancialEventToLegacyTransaction, normalizedMirrorNeedsSourceRefresh } from './normalized-primary-writeback';

const context = { workspaceId: 'workspace-1', userId: 'user-1', revision: 10 };
const original = {
  id: 'legacy-claro',
  date: '2026-09-10',
  description: 'CLARO MARCOS',
  type: 'expense',
  expenseAmount: 30.9,
  status: 'pending',
  situation: 'PENDENTE',
  paymentMethod: 'BOLETO',
  financialAccountId: 'account-monetary-main',
};

const before = legacyTransactionToFinancialEvent(original, context)!;
const settledEvent = {
  id: 'event-claro',
  legacyTransactionId: original.id,
  date: new Date('2026-09-13T12:00:00.000Z'),
  description: original.description,
  type: 'expense',
  status: 'paid',
  amount: 30.9,
  notes: null,
  sourcePayload: original,
  accountId: 'account-monetary-main',
  paymentMethod: { name: 'BOLETO' },
};
const mirrored = mirrorFinancialEventToLegacyTransaction(settledEvent);

assert.equal(mirrored.date, '2026-09-13');
assert.equal(mirrored.status, 'paid');
assert.equal(mirrored.situation, 'PAGO');
assert.equal(mirrored.expenseAmount, 30.9);
assert.equal(mirrored.financialAccountId, 'account-monetary-main');
assert.equal(mirrored.paymentMethod, 'BOLETO');
assert.equal(normalizedMirrorNeedsSourceRefresh(settledEvent, mirrored), true);
assert.equal(normalizedMirrorNeedsSourceRefresh({ ...settledEvent, sourcePayload: mirrored }, mirrored), false);
assert.equal(normalizedMirrorNeedsSourceRefresh({ ...settledEvent, sourcePayload: { ...mirrored, z: 1, a: 2 } }, { ...mirrored, a: 2, z: 1 }), false);

const preview = buildNormalizationPreview({ transactions: [mirrored] }, { ...context, revision: 11 });
assert.equal(preview.summary.validCount, 1);
assert.equal(preview.events[0]?.status, 'paid');
assert.equal(preview.events[0]?.date.toISOString().slice(0, 10), '2026-09-13');

const normalizedMirror = {
  ...preview.events[0]!,
  sourcePayload: mirrored,
};
assert.equal(normalizationFingerprint([normalizedMirror]), preview.summary.fingerprint);
assert.notEqual(normalizationFingerprint([before]), preview.summary.fingerprint);

console.log('normalized primary writeback tests passed');
