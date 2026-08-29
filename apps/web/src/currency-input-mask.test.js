import assert from 'node:assert/strict';
import { canonicalToCurrency, currencyToCanonical, digitsToCurrency } from './currency-input-mask.js';

assert.equal(digitsToCurrency('1'), '0,01');
assert.equal(digitsToCurrency('15'), '0,15');
assert.equal(digitsToCurrency('150'), '1,50');
assert.equal(digitsToCurrency('15000'), '150,00');
assert.equal(digitsToCurrency('123456789'), '1.234.567,89');
assert.equal(digitsToCurrency(''), '');

assert.equal(currencyToCanonical('0,01'), '0.01');
assert.equal(currencyToCanonical('1.234,56'), '1234.56');
assert.equal(currencyToCanonical('R$ 1.234,56'), '1234.56');
assert.equal(currencyToCanonical(''), '');

assert.equal(canonicalToCurrency('150'), '150,00');
assert.equal(canonicalToCurrency('150.5'), '150,50');
assert.equal(canonicalToCurrency('1234.56'), '1.234,56');
assert.equal(canonicalToCurrency(''), '');

console.log('currency input mask tests passed');
