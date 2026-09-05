import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findLargestFittingSize } from './adaptive-card-typography-core.js';

assert.equal(findLargestFittingSize({ min: 12, max: 32, fits: (size) => size <= 24 }), 24);
assert.equal(findLargestFittingSize({ min: 12, max: 32, fits: () => true }), 32);
assert.equal(findLargestFittingSize({ min: 12, max: 32, fits: () => false }), 12);

const runtime = fs.readFileSync(new URL('./adaptive-card-typography.js', import.meta.url), 'utf8');
assert.match(runtime, /ResizeObserver/);
assert.match(runtime, /MutationObserver/);
assert.match(runtime, /document\.fonts\?\.ready/);
assert.match(runtime, /income-analysis-hero/);
assert.match(runtime, /childElementCount > 0/);
assert.ok(
  runtime.indexOf('card.clientWidth <= 0') < runtime.indexOf("element.classList.add('meg-autofit-text')"),
  'cards ocultos não podem capturar a fonte antes de ficarem visíveis',
);

console.log('adaptive card typography tests passed');
