import assert from 'node:assert/strict';
import { matchesExactNumbers, normalizeExactNumber, parseBrazilianNumber } from './exact-number-filter-core.js';

assert.equal(parseBrazilianNumber('R$ 1.007,36'), 1007.36);
assert.equal(normalizeExactNumber('31,05'), '31.05');
assert.equal(normalizeExactNumber(37), '37.00');
assert.equal(matchesExactNumbers('R$ 31,05', new Set(['31.05', '37.00'])), true);
assert.equal(matchesExactNumbers('R$ 22,25', new Set(['31.05', '37.00'])), false);
assert.equal(matchesExactNumbers('R$ 22,25', new Set()), true);
console.log('exact number grid filters tests passed');
