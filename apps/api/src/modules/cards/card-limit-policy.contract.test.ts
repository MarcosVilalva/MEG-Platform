import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardLimitDecision, effectiveCardLimitMode } from './card-limit-policy';

const records = [{scopeKey:'GLOBAL',mode:'CONFIRM'}, {scopeKey:'CARD:restricted',mode:'BLOCK'}];
assert.equal(effectiveCardLimitMode([], 'any'), 'BLOCK');
assert.equal(effectiveCardLimitMode(records, 'other'), 'CONFIRM');
assert.equal(effectiveCardLimitMode(records, 'restricted'), 'BLOCK');
assert.equal(effectiveCardLimitMode([{scopeKey:'GLOBAL',mode:'UNRECOGNIZED'}], 'card'), 'BLOCK');

const base = {creditLimitCents:10000,committedCents:9000,purchaseCents:1500};
const blocked=cardLimitDecision({...base,mode:'BLOCK',confirmedOverLimit:true});
assert.equal(blocked.allowed,false);
assert.equal(blocked.excessCents,500);
assert.equal(blocked.availableCents,1000);
assert.equal(blocked.afterCents,-500);

const mustConfirm=cardLimitDecision({...base,mode:'CONFIRM',confirmedOverLimit:false});
assert.equal(mustConfirm.allowed,false);
assert.equal(mustConfirm.requiresConfirmation,true);
const accepted=cardLimitDecision({...base,mode:'CONFIRM',confirmedOverLimit:true});
assert.equal(accepted.allowed,true);
assert.equal(accepted.confirmedException,true);

const within=cardLimitDecision({...base,purchaseCents:1000,mode:'BLOCK',confirmedOverLimit:false});
assert.equal(within.allowed,true);
assert.equal(within.excessCents,0);
assert.throws(()=>cardLimitDecision({...base,purchaseCents:Number.MAX_SAFE_INTEGER+2,mode:'BLOCK',confirmedOverLimit:false}),/INVALID_CARD_LIMIT_AMOUNT/);

const service=readFileSync(new URL('./service.ts',import.meta.url),'utf8');
const routes=readFileSync(new URL('./routes.ts',import.meta.url),'utf8');
assert.match(service,/enforceCardCreditLimitIncrease\(/);
assert.match(service,/cardInstallmentRemaining\(entry\)/);
assert.match(service,/legacyPurchasesForCard\(card, shared\.legacy\)/);
assert.match(service,/cardLimitPolicyRows\(tx, shared\.workspaceId, card\.id\)/);
assert.match(routes,/cardLimitPolicyRows\(prisma, context\.workspaceId\)/);
assert.match(routes,/CARD_LIMIT_POLICY_UPDATE/);
assert.match(routes,/allowOverLimit: z\.boolean\(\)\.optional\(\)/);
assert.match(routes,/CARD_LIMIT_CONFIRMATION_REQUIRED/);
assert.match(routes,/enforceCardCreditLimitIncrease\(/);
assert.match(routes,/cardInstallmentRemaining\(before\)/);
console.log('PT104_CARD_LIMIT_POLICY_CONTRACT=PASS');
