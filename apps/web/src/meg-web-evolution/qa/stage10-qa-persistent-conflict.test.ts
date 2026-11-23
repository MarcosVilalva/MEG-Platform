import assert from 'node:assert/strict';
import {
  inspectQaPendingConflict, persistQaPermanentConflict, QA_CONFLICT_MARKER_KEY,
} from './stage10-qa-persistent-conflict';
import type { QaConflictScope, QaMarkerStorage } from './stage10-qa-persistent-conflict';

const original: QaConflictScope = {
  actorId: 'actor-qa-1', workspaceId: 'ws-qa-1',
  operationId: '00000000-0000-4000-8000-000000001900',
  payloadFingerprint: 'a'.repeat(64), generation: 7,
};
const data = new Map<string, string>();
let writes = 0;
const storage: QaMarkerStorage = {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => { writes++; data.set(key, value); },
};

const initial = inspectQaPendingConflict(storage, original);
assert.equal(initial.status, 'requires-canonical-readback');
assert.throws(() => persistQaPermanentConflict(storage, original, 409, {error:'STATE_CONFLICT'}), /NOT_PERMANENT/);
assert.equal(data.size, 0);
assert.throws(() => persistQaPermanentConflict(storage, original, 200, {}), /NOT_PERMANENT/);
assert.equal(data.size, 0);

const first = persistQaPermanentConflict(storage, original, 409,
  { error: 'OPERATION_ID_REUSED' });
assert.deepEqual(first, {status:'blocked', code:'OPERATION_ID_REUSED'});
assert.equal(writes, 1);
const serialized = data.get(QA_CONFLICT_MARKER_KEY) || '';
const marker = JSON.parse(serialized);
assert.deepEqual(Object.keys(marker).sort(), [
  'actorId','workspaceId','operationId','payloadFingerprint',
  'generation','protocol','code','recordedAt',
].sort(), 'Only scope metadata stored, never values, payment methods, description or payload');
assert.ok(!/amount|description|account|token|financialData/.test(serialized));

// Simulacao de novo controller apos fechamento do navegador, storage persistiu.
function afterBrowserRestart() {
  return inspectQaPendingConflict(storage, original);
}
assert.deepEqual(afterBrowserRestart(), first);
assert.deepEqual(persistQaPermanentConflict(storage, original, 409, {error:'OPERATION_ID_REUSED'}), first);
assert.equal(writes, 1, 'Idempotent quarantine; no overwrite');
for (const override of [
  {actorId:'actor-qa-2'}, {workspaceId:'ws-qa-2'},
  {operationId:'00000000-0000-4000-8000-000000001901'},
  {payloadFingerprint:'b'.repeat(64)}, {generation:8},
]) {
  const foreign = {...original,...override};
  assert.deepEqual(inspectQaPendingConflict(storage, foreign),
    {status:'blocked',code:'QA_CONFLICT_SCOPE_MISMATCH'});
  assert.throws(() => persistQaPermanentConflict(storage, foreign, 409,
    {error:'OPERATION_ID_REUSED'}), /SCOPE_MISMATCH/);
}
assert.equal(data.get(QA_CONFLICT_MARKER_KEY), serialized, 'Quarantine never overwritten by other actor');

// Perda do armazenamento nao pode liberar replay com base apenas na ausencia.
const clearedStorage: QaMarkerStorage = {
  getItem: () => null,
  setItem: () => {},
};
assert.equal(inspectQaPendingConflict(clearedStorage, original).status, 'requires-canonical-readback');
const unavailableStorage: QaMarkerStorage = {
  getItem: () => {throw new Error('unavailable');},
  setItem: () => {throw new Error('unavailable');},
};
assert.deepEqual(inspectQaPendingConflict(unavailableStorage, original),
  {status:'blocked',code:'QA_CONFLICT_STORAGE_UNAVAILABLE'});
assert.throws(() => persistQaPermanentConflict(unavailableStorage, original, 409,
  {error:'OPERATION_ID_REUSED'}), /STORAGE_UNAVAILABLE/);
const writeFails: QaMarkerStorage = {
  getItem: () => null,
  setItem: () => {throw new Error('quota exceeded');},
};
assert.throws(() => persistQaPermanentConflict(writeFails, original, 409,
  {error:'OPERATION_ID_REUSED'}), /STORAGE_UNAVAILABLE/);
const writeDisappears: QaMarkerStorage = {getItem:()=>null,setItem:()=>{}};
assert.throws(() => persistQaPermanentConflict(writeDisappears, original, 409,
  {error:'OPERATION_ID_REUSED'}), /SAVE_UNVERIFIED/);

data.set(QA_CONFLICT_MARKER_KEY, '{broken');
assert.deepEqual(inspectQaPendingConflict(storage, original),
  {status:'blocked',code:'QA_CONFLICT_MARKER_CORRUPTED'});
assert.throws(() => persistQaPermanentConflict(storage, original, 409,
  {error:'OPERATION_ID_REUSED'}), /MARKER_CORRUPTED/);
data.set(QA_CONFLICT_MARKER_KEY, serialized);
assert.equal(inspectQaPendingConflict(storage, {...original, payloadFingerprint:'x'}).status,'blocked');
assert.equal(inspectQaPendingConflict(storage, original).status,'blocked');

// Nao existe funcao de remocao ou auto-liberacao; somente readback canonico externo podera decidir.
assert.ok(data.has(QA_CONFLICT_MARKER_KEY));
console.log('PT190_PERMANENT_409_PERSISTED_BEFORE_RETRY_STOP=PASS');
console.log('PT190_SIMULATED_BROWSER_RESTART_MARKER_BLOCKS=PASS');
console.log('PT190_ACTOR_WORKSPACE_PAYLOAD_SCOPE_FAIL_CLOSED=PASS');
console.log('PT190_MISSING_MARKER_REQUIRES_CANONICAL_READBACK=PASS');
console.log('PT190_CORRUPT_AND_UNAVAILABLE_STORAGE_FAIL_CLOSED=PASS');
console.log('PT190_NO_FALSE_CONFIRMATION_OR_FINANCIAL_WRITE=PASS');
console.log('PT190_FINAL_EXIT=0');
