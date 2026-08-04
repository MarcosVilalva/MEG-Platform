import assert from 'node:assert/strict';
import { matchesExactNumbers, normalizeExactNumber, parseBrazilianNumber } from './exact-number-filter-core.js';
import { compareNumbersWithEmptyLast, compareTransactionAmountRows } from './numeric-grid-sort-core.js';
import { matchesCardFilter, normalizeGridText, parseGridDate, parseGridNumber } from './stable-grid-filters.js';
import { compareTransactionPurchaseDates } from './transaction-date-sort-core.js';

assert.equal(normalizeGridText(' Cartão Débito '), 'CARTAO DEBITO');
assert.equal(parseGridNumber('R$ 1.007,36'), 1007.36);
assert.equal(parseGridNumber('-R$ 31,00'), -31);
assert.equal(parseGridDate('04/08/2026'), '2026-08-04');
assert.equal(matchesCardFilter('R$ 31,05', { kind: 'number', min: 30, max: 32 }), true);
assert.equal(matchesCardFilter('R$ 37,00', { kind: 'number', min: null, max: 35 }), false);
assert.equal(matchesCardFilter('04/08/2026', { kind: 'date', from: '2026-08-01', to: '2026-08-31' }), true);
assert.equal(matchesCardFilter('CARTÃO ML', { kind: 'multi', values: new Set(['CARTAO ML']) }), true);
assert.equal(matchesCardFilter('CARTÃO BB', { kind: 'multi', values: new Set(['CARTAO ML']) }), false);

assert.equal(parseBrazilianNumber('R$ 1.007,36'), 1007.36);
assert.equal(parseBrazilianNumber('-R$ 31,00'), -31);
assert.equal(normalizeExactNumber('31,05'), '31.05');
assert.equal(normalizeExactNumber('-31,00'), '-31.00');
assert.equal(normalizeExactNumber(37), '37.00');
assert.equal(matchesExactNumbers('R$ 31,05', new Set(['31.05', '37.00'])), true);
assert.equal(matchesExactNumbers('R$ 22,25', new Set(['31.05', '37.00'])), false);
assert.equal(matchesExactNumbers('R$ 22,25', new Set()), true);

assert.equal(compareNumbersWithEmptyLast(-31, 100, 'asc') < 0, true);
assert.equal(compareNumbersWithEmptyLast(-31, 100, 'desc') > 0, true);
assert.equal(compareNumbersWithEmptyLast(Number.NaN, -31, 'desc') > 0, true);

const valueReader = (item, key) => Number(item[key] || 0);
const rows = [
  { id: 'income', type: 'income', income: 500 },
  { id: 'negative', type: 'expense', expense: -31 },
  { id: 'positive', type: 'expense', expense: 100 },
  { id: 'zero', type: 'expense', expense: 0 },
];
const descending = [...rows].sort((a, b) => compareTransactionAmountRows(a, b, 'expense', 'desc', valueReader));
assert.deepEqual(descending.map((item) => item.id), ['positive', 'zero', 'negative', 'income']);
const ascending = [...rows].sort((a, b) => compareTransactionAmountRows(a, b, 'expense', 'asc', valueReader));
assert.deepEqual(ascending.map((item) => item.id), ['negative', 'zero', 'positive', 'income']);

const purchaseRows = [
  { id: 'empty', purchaseDate: '', date: '2026-08-04' },
  { id: 'latest', purchaseDate: '2026-07-12', date: '2026-08-04' },
  { id: 'oldest', purchaseDate: '2026-06-30', date: '2026-07-04' },
  { id: 'middle', purchaseDate: '2026-07-01', date: '2026-08-04' },
];
const purchaseAscending = [...purchaseRows].sort((a, b) => compareTransactionPurchaseDates(a, b, 'asc'));
assert.deepEqual(purchaseAscending.map((item) => item.id), ['oldest', 'middle', 'latest', 'empty']);
const purchaseDescending = [...purchaseRows].sort((a, b) => compareTransactionPurchaseDates(a, b, 'desc'));
assert.deepEqual(purchaseDescending.map((item) => item.id), ['latest', 'middle', 'oldest', 'empty']);

console.log('stable grid filters tests passed');
