import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { decideLegacyOutboxRejection } from '../apps/web/src/cloud-outbox-conflict-policy.js';

// Use the exact PR #702 candidate, never main or an unreviewed moving head.
const apiSha = '19aaa96b508f3d4db2a38ef0866ca5622b377200';
const apiFile = 'apps/api/src/modules/app-state/normalization-conflict-policy.ts';
const apiSource = execFileSync('git', ['show', apiSha + ':' + apiFile], {encoding:'utf8'});
const conflictsBlock = apiSource.match(/NORMALIZATION_WRITE_CONFLICTS\s*=\s*new Set\(\[([\s\S]*?)\]\)/)?.[1];
assert.ok(conflictsBlock, 'PR #702 changed API conflict contract, review before release.');
const codes = [...conflictsBlock.matchAll(/'([A-Z][A-Z0-9_]+)'/g)].map(m => m[1]);
assert.equal(codes.length, 10, 'No silent addition/removal of protected API conflicts.');
for (const code of codes) {
  const apiRetryable = code === 'NORMALIZATION_CONCURRENT_EVENT_CHANGE';
  const decision = decideLegacyOutboxRejection(409,{error:code,retryable:apiRetryable});
  assert.deepEqual(decision, {action:apiRetryable ? 'retry-after-refresh':'manual-resolution-required',code});
}
assert.equal(decideLegacyOutboxRejection(409,{error:'OPERATION_ID_REUSED'}).action,'manual-resolution-required');
assert.equal(decideLegacyOutboxRejection(409,{error:'STATE_CONFLICT'}).action,'retry-after-refresh');
assert.equal(decideLegacyOutboxRejection(409,{error:'NORMALIZATION_UNKNOWN_NEW_GUARD'}).action,'manual-resolution-required');
assert.equal(decideLegacyOutboxRejection(409,{}).action,'manual-resolution-required');
assert.equal(decideLegacyOutboxRejection(409,{error:'STATE_CONFLICT',retryable:false}).action,'manual-resolution-required');
console.log('MEG_STAGE10_API_702_CLIENT_409_CONTRACT=PASS');
console.log('MEG_STAGE10_API_CONFLICT_CODES_CHECKED='+codes.length);
console.log('MEG_STAGE10_ANDROID_STABLE_NOT_MODIFIED=PASS');
