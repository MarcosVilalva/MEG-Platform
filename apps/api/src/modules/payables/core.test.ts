import assert from 'node:assert/strict';
import {
  addMonthsClamped,
  buildRecurringSchedule,
  isBenefitFinancialEvent,
  isBenefitPaymentMethod,
  isFuturePaymentDay,
  paymentBalanceDecision,
  recurrenceEndDate,
} from './core';

assert.equal(addMonthsClamped('2026-01-31', 1, 31), '2026-02-28');
assert.equal(addMonthsClamped('2026-02-28', 1, 31), '2026-03-31');
assert.equal(addMonthsClamped('2028-01-31', 1, 31), '2028-02-29');
assert.equal(recurrenceEndDate('2026-01-31', 'monthly', 3), '2026-03-31');
assert.equal(recurrenceEndDate('2026-01-01', 'weekly', 3), '2026-01-15');
assert.equal(recurrenceEndDate('2024-02-29', 'yearly', 3), '2026-02-28');

const schedule = buildRecurringSchedule({
  nextDueDate: '2026-01-31',
  frequency: 'monthly',
  anchorDay: 31,
  endDate: '2026-04-30',
  horizonDate: '2026-12-31',
});
assert.deepEqual(schedule.dates, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
assert.equal(schedule.nextDueDate, '2026-05-31');
assert.equal(schedule.finished, true);

assert.equal(isBenefitPaymentMethod('VEROCARD'), true);
assert.equal(isBenefitPaymentMethod('Pix'), false);
assert.equal(isBenefitFinancialEvent({ description: 'Crédito Verocard' }), true);
assert.equal(isBenefitFinancialEvent({ description: 'Mercado', paymentMethod: { name: 'VEROCARD' } }), true);
assert.equal(isBenefitFinancialEvent({ description: 'Mercado', paymentMethod: { name: 'PIX' } }), false);

assert.deepEqual(paymentBalanceDecision(1200, 1500), {
  allowed: false,
  available: 1200,
  requested: 1500,
  missing: 300,
});
assert.equal(paymentBalanceDecision(1500, 1500).allowed, true);
assert.equal(paymentBalanceDecision(1500.009, 1500.004).allowed, true);

assert.equal(isFuturePaymentDay('2026-09-12', '2026-09-11'), true);
assert.equal(isFuturePaymentDay('2026-09-11', '2026-09-11'), false);
assert.equal(isFuturePaymentDay('2026-09-10', '2026-09-11'), false);

console.log('Regras canônicas de recorrência e proteção de baixa validadas.');
