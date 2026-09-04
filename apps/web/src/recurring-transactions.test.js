import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTransactionOperations } from './cloud-write-ahead-core.js';
import {
  addMonthsClamped,
  buildMonthlyTransactionBatch,
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

const ids = ['future-2', 'future-3'];
const recurring = buildMonthlyTransactionBatch({
  id: 'current-1',
  date: '2026-01-31',
  purchaseDate: '2026-01-30',
  description: 'Internet',
  status: 'paid',
  situation: 'PAGO',
}, 3, {
  seriesId: 'series-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  createId: () => ids.shift(),
});
assert.deepEqual(recurring.map((item) => item.id), ['current-1', 'future-2', 'future-3']);
assert.deepEqual(recurring.map((item) => item.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
assert.deepEqual(recurring.map((item) => item.purchaseDate), ['2026-01-30', '2026-02-28', '2026-03-30']);
assert.deepEqual(recurring.map((item) => item.recurrenceNumber), [1, 2, 3]);
assert.equal(recurring.every((item) => item.recurrenceSeriesId === 'series-1'), true);
assert.equal(recurring.every((item) => item.status === 'pending' && item.situation === 'PENDENTE'), true);
const cloudBatch = buildTransactionOperations(
  { transactions: [], activityLog: [] },
  { transactions: recurring, activityLog: [] },
);
assert.equal(cloudBatch.upserts.length, 3);
assert.deepEqual(cloudBatch.upserts.map((item) => item.id), ['current-1', 'future-2', 'future-3']);

const recurringUiSource = readFileSync(new URL('./recurring-transactions.js', import.meta.url), 'utf8');
const legacyAppSource = readFileSync(new URL('./legacy-app.js', import.meta.url), 'utf8');
assert.doesNotMatch(recurringUiSource, /dispatchEvent\(createSubmitEvent/);
assert.match(legacyAppSource, /MEG_RECURRING_TRANSACTIONS\?\.buildBatch\?\.\(payload\)/);
assert.match(legacyAppSource, /state\.transactions\.push\(\.\.\.recurringBatch\.transactions\)/);
assert.match(legacyAppSource, /await confirmTransactionPersistence\(\)/);
assert.match(legacyAppSource, /selectedPeriod\.mode = "all"/);

console.log('recurring transactions tests passed');
