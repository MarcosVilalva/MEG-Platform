import assert from 'node:assert/strict';
import {
  addMonthsClamped,
  buildMonthlySchedule,
  isInstallmentModality,
  normalizeRecurrenceCount,
  parseIsoDate,
  weekdayShortPt,
} from './recurring-transactions-core.js';

assert.deepEqual(parseIsoDate('2026-08-04'), { year: 2026, month: 8, day: 4 });
assert.equal(parseIsoDate('2026-02-30'), null);
assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28');
assert.equal(addMonthsClamped('2026-01-31', 2), '2026-03-31');
assert.equal(addMonthsClamped('2028-01-31', 1), '2028-02-29');
assert.equal(addMonthsClamped('2026-12-30', 1), '2027-01-30');
assert.deepEqual(buildMonthlySchedule('2026-08-31', 4), [
  '2026-08-31',
  '2026-09-30',
  '2026-10-31',
  '2026-11-30',
]);
assert.equal(normalizeRecurrenceCount(1), 2);
assert.equal(normalizeRecurrenceCount(30), 24);
assert.equal(weekdayShortPt('2026-08-04'), 'TER');
assert.equal(isInstallmentModality('Crédito'), true);
assert.equal(isInstallmentModality('Crediário'), true);
assert.equal(isInstallmentModality('Débito automático'), false);

console.log('recurring transactions tests passed');
