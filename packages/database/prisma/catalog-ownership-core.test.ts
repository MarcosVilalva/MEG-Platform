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
  { id: 'a4', label: 'Conta nova', currentOwnerId: 'u1' },
], [
  { catalogId: 'a1', userId: 'u1', source: 'FinancialEvent', referenceId: 'e1' },
  { catalogId: 'a1', userId: 'u1', source: 'LedgerEntry', referenceId: 'l1' },
  { catalogId: 'a2', userId: 'u2', source: 'FinancialEvent', referenceId: 'e2' },
  { catalogId: 'a2', userId: 'u1', source: 'Receipt', referenceId: 'r1' },
]);

assert.equal(assertOwnershipPlanIsDeterministic(accounts), true);
assert.equal(accounts.singleOwner, 2);
assert.equal(accounts.multiOwner, 1);
assert.equal(accounts.unresolved, 1);
assert.equal(accounts.ownerConflicts, 0);
assert.equal(accounts.requiresReview, 1);
assert.deepEqual(accounts.items.find((item) => item.catalogId === 'a1')?.owners, ['u1']);
assert.deepEqual(accounts.items.find((item) => item.catalogId === 'a2')?.owners, ['u1', 'u2']);
assert.equal(accounts.items.find((item) => item.catalogId === 'a2')?.primaryOwnerId, 'u1');
assert.deepEqual(accounts.items.find((item) => item.catalogId === 'a2')?.cloneOwnerIds, ['u2']);
assert.equal(accounts.items.find((item) => item.catalogId === 'a3')?.unresolved, true,
  'Catálogo sem proprietário nem referência não pode receber proprietário por adivinhação.');
assert.equal(accounts.items.find((item) => item.catalogId === 'a4')?.primaryOwnerId, 'u1');
assert.equal(accounts.items.find((item) => item.catalogId === 'a4')?.requiresReview, false,
  'Catálogo novo com proprietário explícito deve permanecer válido mesmo antes de receber referências.');

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

const conflicting = planCatalogOwnership('category', [
  { id: 'c2', label: 'Moradia', currentOwnerId: 'u1' },
], [
  { catalogId: 'c2', userId: 'u2', source: 'Payable', referenceId: 'pay1' },
]);
assert.equal(conflicting.ownerConflicts, 1);
assert.equal(conflicting.items[0].primaryOwnerId, 'u1',
  'Proprietário já persistido nunca deve ser trocado silenciosamente pelo auditor.');
assert.equal(conflicting.items[0].requiresReview, true,
  'Referências incompatíveis com o proprietário persistido exigem revisão.');
assert.deepEqual(conflicting.items[0].cloneOwnerIds, ['u2']);

const summary = ownershipPlanSummary([accounts, paymentMethods]);
assert.deepEqual(summary[0], {
  kind: 'account',
  totalCatalogs: 4,
  referencedCatalogs: 2,
  singleOwner: 2,
  multiOwner: 1,
  unresolved: 1,
  ownerConflicts: 0,
  requiresReview: 1,
  clonesRequired: 1,
  ownerlessReferences: 0,
});
assert.equal(summary[1].ownerlessReferences, 1);

console.log('Plano de propriedade dos catálogos financeiros validado.');
