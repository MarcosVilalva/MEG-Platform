import assert from 'node:assert/strict';
import { mutationReceiptExpiry, mutationRequestHash } from './mutation-receipt';

assert.equal(
  mutationRequestHash({ upserts: [{ amount: 10, id: 'a' }], deletes: [] }),
  mutationRequestHash({ deletes: [], upserts: [{ id: 'a', amount: 10 }] }),
);
assert.notEqual(
  mutationRequestHash({ upserts: [{ id: 'a', amount: 10 }] }),
  mutationRequestHash({ upserts: [{ id: 'a', amount: 11 }] }),
);
assert.equal(
  mutationReceiptExpiry(new Date('2026-09-04T00:00:00.000Z')).toISOString(),
  '2026-10-19T00:00:00.000Z',
);

console.log('mutation receipt tests passed');
