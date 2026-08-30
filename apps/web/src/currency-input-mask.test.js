import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalToCurrency, currencyToCanonical, digitsToCurrency } from './currency-input-mask.js';
import { formatBRLInput, formatPastedBRL, parseBRL } from '../../../packages/shared/src/money.js';

assert.equal(digitsToCurrency('1'), '0,01');
assert.equal(digitsToCurrency('15'), '0,15');
assert.equal(digitsToCurrency('100'), '1,00');
assert.equal(digitsToCurrency('1000'), '10,00');
assert.equal(digitsToCurrency('150'), '1,50');
assert.equal(digitsToCurrency('15000'), '150,00');
assert.equal(digitsToCurrency('11111'), '111,11');
assert.equal(digitsToCurrency('123456789'), '1.234.567,89');
assert.equal(digitsToCurrency(''), '');

assert.equal(currencyToCanonical('0,01'), '0.01');
assert.equal(currencyToCanonical('1,00'), '1.00');
assert.equal(currencyToCanonical('111,11'), '111.11');
assert.equal(currencyToCanonical('1.234,56'), '1234.56');
assert.equal(currencyToCanonical('R$ 1.234,56'), '1234.56');
assert.equal(currencyToCanonical('-1.234,56'), '-1234.56');
assert.equal(currencyToCanonical(''), '');

assert.equal(canonicalToCurrency('150'), '150,00');
assert.equal(canonicalToCurrency('150.5'), '150,50');
assert.equal(canonicalToCurrency('1234.56'), '1.234,56');
assert.equal(canonicalToCurrency('-1500'), '-1.500,00');
assert.equal(canonicalToCurrency(''), '');

assert.equal(formatBRLInput('1'), '0,01');
assert.equal(formatBRLInput('0,015'), '0,15');
assert.equal(formatBRLInput('-1500', { allowNegative: true }), '-15,00');
assert.equal(formatPastedBRL('1500'), '1.500,00');
assert.equal(formatPastedBRL('R$ 1.234,56'), '1.234,56');
assert.equal(formatPastedBRL('-1500', { allowNegative: true }), '-1.500,00');
assert.equal(parseBRL('1.234,56'), 1234.56);
assert.equal(parseBRL('-1.234,56'), -1234.56);

const source = readFileSync(new URL('./currency-input-mask.js', import.meta.url), 'utf8');
assert.match(source, /purchaseTotalInput/);
assert.match(source, /newCardLimitInput/);
assert.match(source, /newFinancialAccountOpeningBalanceInput/);
assert.match(source, /reconciliationActualInput/);
assert.match(source, /data-budget/);
assert.match(source, /data-invoice-amount/);
assert.ok(source.includes('[data-column-filter="income"]'));
assert.ok(source.includes('[data-column-filter="expense"]'));
assert.match(source, /megCurrencyValueProxy/);
assert.match(source, /MutationObserver/);

console.log('currency input mask tests passed');
