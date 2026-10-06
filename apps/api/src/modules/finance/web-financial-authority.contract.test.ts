import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const financeRoutes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const payableRoutes = readFileSync(new URL('../payables/routes.ts', import.meta.url), 'utf8');
const cardRoutes = readFileSync(new URL('../cards/routes.ts', import.meta.url), 'utf8');
const benefitRoutes = readFileSync(new URL('./benefit-event-routes.ts', import.meta.url), 'utf8');
const eventMutation = readFileSync(new URL('./event-mutation.ts', import.meta.url), 'utf8');
const policy = readFileSync(new URL('./financial-policy.ts', import.meta.url), 'utf8');

assert.match(financeRoutes, /getCanonicalFinancialSummary/);
assert.match(financeRoutes, /getCanonicalFinancialCashflow/);
assert.match(financeRoutes, /getCanonicalFinancialAnalytics/);
assert.match(financeRoutes, /createFinancialEventProtected/);
assert.match(financeRoutes, /createFinancialTransfer/);

assert.match(payableRoutes, /payPayableProtected/);
assert.doesNotMatch(payableRoutes, /createPayablePaymentProtected/);

assert.match(cardRoutes, /createCardPurchaseProtected/);
assert.match(cardRoutes, /payCardStatementProtected/);
assert.match(cardRoutes, /app\.patch\('\/installments\/:id'/);

assert.match(benefitRoutes, /createBenefitEventProtected/);
assert.match(benefitRoutes, /updateBenefitEventProtected/);
assert.match(eventMutation, /BENEFIT_CONTRACT_REQUIRED/);

assert.match(policy, /resolveCanonicalFinancialStatus/);
assert.match(policy, /categoryName === 'FIXO' \|\| categoryGroup === 'FIXO'/);
assert.match(policy, /paymentType === 'CREDIT'\) return 'planned'/);

console.log('Autoridades financeiras canônicas da nova Web validadas.');
