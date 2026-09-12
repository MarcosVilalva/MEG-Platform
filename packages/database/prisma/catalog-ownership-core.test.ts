import assert from 'node:assert/strict';
import {
  assertOwnershipPlanIsDeterministic,
  ownershipPlanSummary,
  planCatalogOwnership,
} from './catalog-ownership-core';

const accounts = planCatalogOwnership('account', [
  { id: 'a1', label: 'Santander' },
  { id: 'a2', label: 'Caixa' },
  { id: 'a3', label: 'Sem uso' },
], [
  { catalogId: 'a1', userId: 'u1', source: 'FinancialEvent', referenceId: 'e1' },
  { catalogId: 'a1', userId: 'u1', source: 'LedgerEntry', referenceId: 'l1' },
  { catalogId: 'a2', userId: 'u2', source: 'FinancialEvent', referenceId: 'e2' },
  { catalogId: 'a2', userId: 'u1', source: 'Receipt', referenceId: 'r1' },
]);

assert.equal(assertOwnershipPlanIsDeterministic(accounts), true);
assert.equal(accounts.singleOwner, 1);
assert.equal(accounts.multiOwner, 1);
assert.equal(accounts.unresolved, 1);
assert.equal(accounts.requiresReview, 1);
assert.deepEqual(accounts.items.find((item) => item.catalogId === 'a1')?.owners, ['u1']);
assert.deepEqual(accounts.items.find((item) => item.catalogId === 'a2')?.owners, ['u1', 'u2']);
assert.equal(accounts.items.find((item) => item.catalogId === 'a2')?.primaryOwnerId, 'u1');
assert.deepEqual(accounts.items.find((item) => item.catalogId === 'a2')?.cloneOwnerIds, ['u2']);
assert.equal(accounts.items.find((item) => item.catalogId === 'a3')?.unresolved, true,
  'Catálogo sem referência não pode receber proprietário por adivinhação.');

const paymentMethods = planCatalogOwnership('paymentMethod', [
  { id: 'p1', label: 'Pix' },
], [
  { catalogId: 'p1', userId: null, source: 'LegacyUnknown', referenceId: 'x1' },
]);
assert.equal(paymentMethods.unresolved, 1,
  'Referência sem userId não é evidência suficiente para atribuir proprietário.');
assert.equal(paymentMethods.requiresReview, 1);
assert.equal(paymentMethods.items[0].ownerlessReferenceCount, 1);

const mixed = planCatalogOwnership('category', [
  { id: 'c1', label: 'Alimentação' },
], [
  { catalogId: 'c1', userId: 'u1', source: 'FinancialEvent', referenceId: 'e3' },
  { catalogId: 'c1', userId: null, source: 'LegacyEvent', referenceId: 'e4' },
]);
assert.equal(mixed.items[0].primaryOwnerId, 'u1');
assert.equal(mixed.items[0].requiresReview, true,
  'Mesmo com proprietário provável, referência sem userId deve bloquear migração automática.');

const summary = ownershipPlanSummary([accounts, paymentMethods]);
assert.deepEqual(summary[0], {
  kind: 'account',
  totalCatalogs: 3,
  referencedCatalogs: 2,
  singleOwner: 1,
  multiOwner: 1,
  unresolved: 1,
  requiresReview: 1,
  clonesRequired: 1,
  ownerlessReferences: 0,
});
assert.equal(summary[1].ownerlessReferences, 1);

console.log('Plano de propriedade dos catálogos financeiros validado.');
