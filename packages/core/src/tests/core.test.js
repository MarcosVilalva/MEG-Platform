import assert from 'node:assert/strict';

function summarizeMonth(events, month) {
  const monthEvents = events.filter((event) => event.competence === month);
  const income = monthEvents.filter((event) => event.signedAmount > 0).reduce((sum, event) => sum + event.signedAmount, 0);
  const expense = monthEvents.filter((event) => event.signedAmount < 0).reduce((sum, event) => sum + Math.abs(event.signedAmount), 0);
  return { income, expense, result: income - expense, eventCount: monthEvents.length };
}

const events = [
  { competence: '2026-06', signedAmount: 1000 },
  { competence: '2026-06', signedAmount: -200 },
  { competence: '2026-06', signedAmount: -50 },
  { competence: '2026-05', signedAmount: -400 }
];

const june = summarizeMonth(events, '2026-06');

assert.equal(june.income, 1000);
assert.equal(june.expense, 250);
assert.equal(june.result, 750);
assert.equal(june.eventCount, 3);

console.log('MEG Analytics 360 tests passed.');
