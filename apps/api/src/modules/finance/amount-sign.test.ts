import assert from 'node:assert/strict';
import { createFinancialEventSchema } from './schemas';
import { enteredAmountFromStored, financialAmountValues, financialCentsDecimal } from './amount-sign';

assert.deepEqual(financialAmountValues('income', 125.5), { amount: 125.5, signedAmount: 125.5 });
assert.deepEqual(financialAmountValues('income', -125.5), { amount: 125.5, signedAmount: -125.5 });
assert.deepEqual(financialAmountValues('expense', 89.9), { amount: 89.9, signedAmount: -89.9 });
assert.deepEqual(financialAmountValues('expense', -89.9), { amount: 89.9, signedAmount: 89.9 });
assert.equal(enteredAmountFromStored('expense', 89.9), -89.9);
assert.equal(enteredAmountFromStored('income', -125.5), -125.5);
assert.equal(financialCentsDecimal(99.99),'99.99');
assert.equal(financialCentsDecimal(-99.99),'-99.99');
assert.equal(financialCentsDecimal(125.49),'125.49');
assert.equal(financialCentsDecimal(0.01),'0.01');
assert.equal(financialCentsDecimal(0),'0.00');
assert.throws(()=>financialCentsDecimal(Number.NaN),/INVALID_FINANCIAL_AMOUNT/);
assert.throws(()=>financialCentsDecimal(Number.POSITIVE_INFINITY),/INVALID_FINANCIAL_AMOUNT/);
assert.throws(()=>financialCentsDecimal(Number.MAX_SAFE_INTEGER),/INVALID_FINANCIAL_AMOUNT/);

const baseEvent = {
  description: 'Estorno confirmado',
  type: 'expense' as const,
  status: 'paid' as const,
  date: '2026-09-05'
};
assert.equal(createFinancialEventSchema.safeParse({ ...baseEvent, amount: -89.9 }).success, true);
assert.equal(createFinancialEventSchema.safeParse({ ...baseEvent, amount: 0 }).success, false);

console.log('financial event negative amount tests passed');
