import assert from 'node:assert/strict';
import {
  FULL_NORMALIZATION_AUDIT_INTERVAL_MS,
  needsDeepNormalizationAudit,
  sameNormalizationAuditStamp,
  type NormalizationAuditStamp,
} from './normalization-audit-gate';

const original: NormalizationAuditStamp = {
  workspaceId: 'workspace-main',
  tableMutationCounters: 'AppState:1:12:0|FinancialEvent:100:200:0',
  stateRevision: 12,
  stateUpdatedAt: '2026-11-10T12:00:00.000Z',
  activeEventCount: 3630,
  latestEventUpdatedAt: '2026-11-10T12:00:00.000Z',
};

assert.equal(needsDeepNormalizationAudit(original, null, null, 0), true, 'first pulse performs full audit');
assert.equal(needsDeepNormalizationAudit(original, original, 0, 15 * 60_000), false, 'unchanged pulse avoids transferring historical rows');
assert.equal(needsDeepNormalizationAudit(original, original, 0, FULL_NORMALIZATION_AUDIT_INTERVAL_MS - 1), false);
assert.equal(needsDeepNormalizationAudit(original, original, 0, FULL_NORMALIZATION_AUDIT_INTERVAL_MS), true, 'periodic deep audit remains mandatory');
assert.equal(needsDeepNormalizationAudit(original, original, 30_000, 29_999), true, 'clock rollback forces deep audit');

for (const changed of [
  { workspaceId: 'workspace-other' },
  { tableMutationCounters: 'AppState:1:13:0|FinancialEvent:100:200:0' },
  { tableMutationCounters: 'AppState:1:12:0|FinancialEvent:100:201:0' },
  { tableMutationCounters: 'AppState:1:12:0|FinancialEvent:101:200:0' },
  { tableMutationCounters: 'AppState:1:12:0|FinancialEvent:100:200:1' },
  { stateRevision: 13 },
  { stateUpdatedAt: '2026-11-10T12:15:00.000Z' },
  { activeEventCount: 3629 },
  { activeEventCount: 3631 },
  { latestEventUpdatedAt: '2026-11-10T12:15:00.000Z' },
  { latestEventUpdatedAt: null },
]) {
  assert.equal(
    needsDeepNormalizationAudit({ ...original, ...changed }, original, 0, 15 * 60_000),
    true,
    'any observable change must run the exact fingerprint comparison'
  );
}
assert.equal(sameNormalizationAuditStamp(original, { ...original }), true);
assert.equal(sameNormalizationAuditStamp(original, { ...original, activeEventCount: 3631 }), false);
assert.equal(needsDeepNormalizationAudit(original, original, 0, 1, 0), true, 'zero TTL forces full fidelity');
console.log('normalization-audit-gate: characterization OK');
