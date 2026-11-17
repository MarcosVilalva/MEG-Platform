import assert from 'node:assert/strict';
import { decideStage10WriteConflict } from './stage10-write-conflict-policy';
import { normalizationWriteConflictPayload } from '../../../../api/src/modules/app-state/normalization-conflict-policy';

// A nova Web NUNCA pode descartar outbox por status HTTP, nem repetir conflitos
// de integridade até o infinito.
const expectations: Array<[number, unknown, string]> = [
  [409, { error: 'STATE_CONFLICT' }, 'refresh-and-retry-bounded'],
  [409, { error: 'NORMALIZATION_REVISION_CONFLICT' }, 'refresh-and-retry-bounded'],
  [409, normalizationWriteConflictPayload('NORMALIZATION_CONCURRENT_EVENT_CHANGE', 12), 'refresh-and-retry-bounded'],
  [409, normalizationWriteConflictPayload('NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE', 12), 'keep-protected-requires-resolution'],
  [409, normalizationWriteConflictPayload('NORMALIZATION_CANONICAL_CATEGORY_CONFLICT', 12), 'keep-protected-requires-resolution'],
  [409, normalizationWriteConflictPayload('NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER', 12), 'keep-protected-requires-resolution'],
  [409, { error: 'OPERATION_ID_REUSED' }, 'keep-protected-requires-resolution'],
  [409, { error: 'STATE_CONFLICT_FAKE', retryable: true }, 'keep-protected-requires-resolution'],
  [409, { retryable: true }, 'keep-protected-requires-resolution'],
  [409, null, 'keep-protected-requires-resolution'],
  [422, { error: 'INVALID_FINANCIAL_INPUT' }, 'keep-protected-requires-resolution'],
  [500, { error: 'INTERNAL' }, 'keep-protected-requires-resolution'],
  [0, null, 'keep-protected-offline'],
  [200, { error: 'OK' }, 'confirmed'],
];
for (const [status, payload, action] of expectations) {
  const result = decideStage10WriteConflict(status, payload);
  assert.equal(result.action, action, `HTTP ${status}, payload ${JSON.stringify(payload)}`);
  assert.equal(result.preserveOutbox, true, 'O outbox só sai após confirmação canônica');
}
assert.equal(normalizationWriteConflictPayload('NORMALIZATION_CONCURRENT_EVENT_CHANGE', 7).retryable, true);
assert.equal(normalizationWriteConflictPayload('NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE', 7).retryable, false);
assert.throws(() => normalizationWriteConflictPayload('UNTRUSTED_RETRYABLE', 7), /NORMALIZATION_UNKNOWN_CONFLICT_CODE/);
console.log('MEG_STAGE10_WEB_CONFLICT_POLICY_SAFE_DECISION PASS');
