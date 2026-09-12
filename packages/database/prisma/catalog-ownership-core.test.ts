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

const summary = ownershipPlanSummary([accounts, paymentMethods]);
assert.deepEqual(summary[0], {
  kind: 'account',
  totalCatalogs: 3,
  referencedCatalogs: 2,
  singleOwner: 1,
  multiOwner: 1,
  unresolved: 1,
  clonesRequired: 1,
});

console.log('Plano de propriedade dos catálogos financeiros validado.');
