import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchesExpectedCardPurchaseVersion} from './stage10-card-edit-version';
const current=new Date('2026-11-15T08:20:00.000Z');
assert.equal(matchesExpectedCardPurchaseVersion(undefined,current),true,
 'Compatibilidade retroativa de clientes legados');
assert.equal(matchesExpectedCardPurchaseVersion(current.toISOString(),current),true);
assert.equal(matchesExpectedCardPurchaseVersion('2026-11-15T08:19:59.999Z',current),false);
assert.equal(matchesExpectedCardPurchaseVersion('2026-11-15T08:20:00.001Z',current),false);
const routes=readFileSync(new URL('./routes.ts',import.meta.url),'utf8');
assert.match(routes,/expectedUpdatedAt: z\.string\(\)\.datetime/);
assert.match(routes,/expectedPurchaseUpdatedAt: z\.string\(\)\.datetime/);
assert.match(routes,/matchesExpectedCardPurchaseVersion\(expectedUpdatedAt, before\.updatedAt\)/);
assert.match(routes,/matchesExpectedCardPurchaseVersion\(expectedPurchaseUpdatedAt, before\.purchase\.updatedAt\)/);
assert.match(routes,/new CardMutationError\(409, 'CARD_PURCHASE_STALE_VERSION'/);
assert.match(routes,/operationId, expectedUpdatedAt, \.\.\.purchaseInput/);
assert.match(routes,/operationId, expectedPurchaseUpdatedAt, \.\.\.changes/);
console.log('STAGE10_CARD_OPTIMISTIC_VERSION_COMPATIBLE_CONTRACT PASS');
