import assert from 'node:assert/strict';
import { normalizationFromSharedState } from './normalization-from-shared-state';

const valid = {
  dataSource: 'normalized',
  normalizedPrimary: true,
  revision: 32,
  updatedAt: '2026-11-10T17:00:00.000Z',
  integrity: { reconciled: true, count: 3630, fingerprint: 'abcd' },
};

assert.deepEqual(normalizationFromSharedState(valid), {
  revision: 32,
  updatedAt: valid.updatedAt,
  primary: true,
  mode: 'normalized-primary',
  reconciled: true,
  source: { validCount: 3630, invalidCount: 0, fingerprint: 'abcd' },
  normalized: { count: 3630, fingerprint: 'abcd' },
});

for (const invalid of [
  { ...valid, dataSource: 'app-state-fallback' },
  { ...valid, normalizedPrimary: false },
  { ...valid, integrity: { reconciled: false, count: 3630 } },
  { ...valid, integrity: null },
  { ...valid, integrity: { reconciled: true } },
  { ...valid, revision: -1 },
  { ...valid, revision: undefined },
]) {
  assert.equal(normalizationFromSharedState(invalid), null, 'unsafe/incomplete response requires exact diagnostic');
}
console.log('normalization-from-shared-state: safe reuse and fallback OK');
