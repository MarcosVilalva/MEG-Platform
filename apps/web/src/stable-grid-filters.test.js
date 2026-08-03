import assert from 'node:assert/strict';
import { matchesCardFilter, normalizeGridText, parseGridDate, parseGridNumber } from './stable-grid-filters.js';

assert.equal(normalizeGridText(' Cartão Débito '), 'CARTAO DEBITO');
assert.equal(parseGridNumber('R$ 1.007,36'), 1007.36);
assert.equal(parseGridDate('04/08/2026'), '2026-08-04');
assert.equal(matchesCardFilter('R$ 31,05', { kind: 'number', min: 30, max: 32 }), true);
assert.equal(matchesCardFilter('R$ 37,00', { kind: 'number', min: null, max: 35 }), false);
assert.equal(matchesCardFilter('04/08/2026', { kind: 'date', from: '2026-08-01', to: '2026-08-31' }), true);
assert.equal(matchesCardFilter('CARTÃO ML', { kind: 'multi', values: new Set(['CARTAO ML']) }), true);
assert.equal(matchesCardFilter('CARTÃO BB', { kind: 'multi', values: new Set(['CARTAO ML']) }), false);

console.log('stable grid filters tests passed');
