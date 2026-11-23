import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decideLegacyOutboxRejection } from '../apps/web/src/cloud-outbox-conflict-policy.js';

// PT201: extrai e executa AS FUNCOES REAIS, sem importar inicializadores de
// browser, sem rede, API, banco, Android ou IndexedDB externo.
const source = readFileSync(new URL('../apps/web/src/instant-persistence.js', import.meta.url), 'utf8');
const pick = (from, to) => {
  const a = source.indexOf(from);
  const b = source.indexOf(to, a + from.length);
  assert.ok(a >= 0 && b > a, 'Contrato fonte alterado: ' + from);
  return source.slice(a, b);
};
const chunks = [
  pick('function readStateOutboxConflict(', '\nasync function parkStateOutboxConflict('),
  pick('async function parkStateOutboxConflict(', '\nfunction enqueueDurableWrite('),
  pick('function persistStateOutbox(', '\nfunction ensureStateOutboxOperationId('),
  pick('async function ensureStateOutboxConfirmed(', '\nfunction scheduleOutboxRetry('),
  pick('function scheduleOutboxRetry(', '\nasync function flushImmediateSave('),
  pick('async function flushImmediateSave(', '\nfunction scheduleImmediateSave('),
];
const names = [
  'globalThis', 'STATE_OUTBOX_CONFLICT_KEY', 'STATE_OUTBOX_CONFLICT_KIND', 'STATE_OUTBOX_KEY', 'readStateOutbox',
  'hasStateOutbox', 'parseJson', 'setSyncStatus', 'showPersistenceBlocker',
  'parkedOutboxMessage', 'window', 'CustomEvent', 'stateProperties',
  'createOperationId', 'localStorage', 'enqueueDurableWrite', 'protectOutbox',
  'awaitDurableProtection', 'isCloudSessionReady', 'navigator',
  'ensureStateOutboxOperationId', 'readRemoteState', 'matchesStateProperties',
  'publishStatePropertiesConfirmation', 'clearStateOutboxIfGeneration',
  'cloudRequest', 'decideLegacyOutboxRejection', 'OUTBOX_RETRY_MS',
  'readOutboxConflict', 'hasTransactionOperations', 'readOutbox',
  'pendingImmediateState', 'notifyPendingFailure',
  'durableReadyPromise',
];
const make = new Function('h',
  '"use strict"; let unpersistedStateOutboxConflict = null; let outboxRetryTimer = null;'
  + 'const {' + names.join(',') + '} = h;'
  + chunks.join('\n')
  + 'return { readStateOutboxConflict, parkStateOutboxConflict, persistStateOutbox,'
  + ' ensureStateOutboxConfirmed, scheduleOutboxRetry, flushImmediateSave };');

function fixture({ status = 409, code = 'OPERATION_ID_REUSED', retryable,
    storage = new Map(), offline = false, responseLost = false,
    alreadyConfirmed = false, malformed = false } = {}) {
  let pending = {
    generation: 7, operationId: '00000000-0000-4000-a000-000000000201',
    properties: { preferences: { locale: 'pt-BR' } },
  };
  const key = 'meg-cloud-state-properties-outbox-conflict-v1';
  const outboxKey = 'meg-cloud-state-properties-outbox-v1';
  const calls = [];
  const timers = [];
  const alerts = [];
  let committed = alreadyConfirmed;
  let cleared = 0;
  let writes = 0;
  let idGenerated = 0;
  const localStorage = {
    getItem: k => storage.get(k) ?? null,
    setItem: (k, v) => { storage.set(k, v); writes++; },
    removeItem: k => storage.delete(k),
  };
  const context = {
    globalThis: { localStorage, setTimeout: fn => { timers.push(fn); return timers.length; } },
    STATE_OUTBOX_CONFLICT_KEY: key,
    STATE_OUTBOX_CONFLICT_KIND: 'state-properties-conflict',
    STATE_OUTBOX_KEY: outboxKey,
    localStorage,
    readStateOutbox: () => pending,
    hasStateOutbox: (p = pending) => Boolean(p?.properties && Object.keys(p.properties).length),
    parseJson: s => { try { return JSON.parse(s || 'null'); } catch { return null; } },
    setSyncStatus: s => alerts.push(s),
    showPersistenceBlocker: s => alerts.push(s),
    parkedOutboxMessage: c => 'revisao ' + c,
    window: { MEG_APP: { showToast() {} }, dispatchEvent() {} },
    CustomEvent: class { constructor(name, options) { this.name = name; this.detail = options.detail; } },
    stateProperties: p => p,
    createOperationId: () => 'new-' + (++idGenerated),
    enqueueDurableWrite: () => {},
    protectOutbox: async () => ({}),
    awaitDurableProtection: async () => {},
    isCloudSessionReady: () => true,
    navigator: { onLine: !offline },
    ensureStateOutboxOperationId: p => p,
    readRemoteState: async () => ({ revision: 3, state: {} }),
    matchesStateProperties: () => committed,
    publishStatePropertiesConfirmation: () => {},
    clearStateOutboxIfGeneration: gen => { assert.equal(gen, pending.generation); cleared++; pending = {generation: 0, properties: {}}; return true; },
    cloudRequest: async (path, opts) => {
      assert.equal(path, '/app-state/properties');
      const body = JSON.parse(opts.body);
      calls.push(body.operationId);
      if (responseLost) { committed = true; throw new Error('ACK_LOST_AFTER_COMMIT'); }
      if (status === 200) { committed = true; return {status:200, ok:true, json:async()=>({ operationId: body.operationId })}; }
      return { status, ok:false, json:async()=>malformed ? {} : { error:code, ...(retryable === undefined ? {} : { retryable }) } };
    },
    decideLegacyOutboxRejection,
    OUTBOX_RETRY_MS: 2000,
    readOutboxConflict: () => null,
    hasTransactionOperations: () => false,
    readOutbox: () => ({ upserts:[], deletes:[] }),
    flushImmediateSave: () => { throw new Error('Unexpected scheduler flush'); },
    pendingImmediateState: null,
    notifyPendingFailure: () => {},
    durableReadyPromise: Promise.resolve(),
  };
  const api = make(context);
  return { api, storage, calls, alerts, timers,
    get pending() { return pending; },
    dropPending: () => { pending = { generation: 0, properties: {} }; },
    get cleared() { return cleared; },
    get generated() { return idGenerated; },
    get writes() { return writes; },
    key };
}

const permanent = fixture();
assert.equal(await permanent.api.ensureStateOutboxConfirmed(), false);
assert.deepEqual(permanent.calls, [permanent.pending.operationId]);
assert.equal(permanent.cleared, 0);
assert.equal(permanent.api.readStateOutboxConflict().code, 'OPERATION_ID_REUSED');
assert.equal(permanent.storage.has(permanent.key), true);
assert.equal(await permanent.api.ensureStateOutboxConfirmed(), false);
assert.equal(permanent.calls.length, 1, '409 definitivo nao repete PATCH');
assert.throws(() => permanent.api.persistStateOutbox({ newField: true }), /STATE_OUTBOX_REQUIRES_MANUAL_RESOLUTION/);
assert.equal(permanent.generated, 0, 'Nao cria nova identidade de operacao');
assert.equal(permanent.api.scheduleOutboxRetry(), undefined);
assert.equal(permanent.timers.length, 0);
await permanent.api.flushImmediateSave();
assert.equal(permanent.calls.length, 1);
assert.equal(permanent.cleared, 0);
assert.ok(!permanent.storage.get(permanent.key).includes('pt-BR'), 'Marcador sem propriedades financeiras');

const restart = fixture({storage:permanent.storage});
assert.equal(await restart.api.ensureStateOutboxConfirmed(), false);
assert.equal(restart.calls.length, 0, 'Reinicio preserva bloqueio');

const missing = fixture();
await missing.api.ensureStateOutboxConfirmed();
missing.dropPending();
assert.equal(missing.api.readStateOutboxConflict().code, 'STATE_OUTBOX_CONFLICT_PENDING_MISSING');
assert.equal(await missing.api.ensureStateOutboxConfirmed(), false, 'Sumir o outbox nao e confirmacao');
assert.throws(() => missing.api.persistStateOutbox({test:true}), /STATE_OUTBOX_REQUIRES_MANUAL_RESOLUTION/);

const timerArmed = fixture();
timerArmed.api.scheduleOutboxRetry();
assert.equal(timerArmed.timers.length, 1);
timerArmed.api.parkStateOutboxConflict(timerArmed.pending, 'OPERATION_ID_REUSED');
timerArmed.timers.shift()();
assert.equal(timerArmed.calls.length, 0, 'Timer agendado antes do 409 tambem respeita o bloqueio');

const unknown = fixture({code:'FUTURE_FINANCIAL_GUARD'});
await unknown.api.ensureStateOutboxConfirmed();
assert.equal(unknown.calls.length, 1);
assert.equal(unknown.api.readStateOutboxConflict().code, 'FUTURE_FINANCIAL_GUARD');

const noJson = fixture({malformed:true});
await noJson.api.ensureStateOutboxConfirmed();
assert.equal(noJson.api.readStateOutboxConflict().code, 'HTTP_409_UNKNOWN_CONFLICT');

const revision = fixture({code:'STATE_CONFLICT'});
assert.equal(await revision.api.ensureStateOutboxConfirmed(), false);
assert.equal(revision.calls.length, 4, '409 de revisao conhecido ainda pode atualizar revisao e tentar');
assert.equal(new Set(revision.calls).size, 1, 'Mesmo operationId em todas as tentativas');
assert.equal(revision.api.readStateOutboxConflict(), null);

const explicitBlock = fixture({code:'STATE_CONFLICT', retryable:false});
await explicitBlock.api.ensureStateOutboxConfirmed();
assert.equal(explicitBlock.calls.length, 1);
assert.equal(explicitBlock.api.readStateOutboxConflict().code, 'STATE_CONFLICT');

for (const code of [400, 422]) {
  const invalid = fixture({status:code, code:'INVALID_APP_STATE_PATCH'});
  await invalid.api.ensureStateOutboxConfirmed();
  assert.equal(invalid.calls.length, 1);
  assert.equal(invalid.cleared, 0);
  assert.equal(invalid.api.readStateOutboxConflict().code, 'INVALID_APP_STATE_PATCH');
}
const offline = fixture({offline:true});
assert.equal(await offline.api.ensureStateOutboxConfirmed(), false);
assert.equal(offline.calls.length, 0);

const ok = fixture({status:200});
assert.equal(await ok.api.ensureStateOutboxConfirmed(), true);
assert.equal(ok.calls.length, 1);
assert.equal(ok.cleared, 1);

const lost = fixture({responseLost:true});
await assert.rejects(lost.api.ensureStateOutboxConfirmed(), /ACK_LOST_AFTER_COMMIT/);
assert.equal(lost.calls.length, 1);
assert.equal(await lost.api.ensureStateOutboxConfirmed(), true);
assert.equal(lost.calls.length, 1, 'Releitura evita segundo PATCH');
assert.equal(lost.cleared, 1);

const corrupt = fixture({storage:new Map([[permanent.key, '{bad']])});
assert.equal(corrupt.api.readStateOutboxConflict().code, 'STATE_OUTBOX_CONFLICT_MARKER_INVALID');
assert.equal(await corrupt.api.ensureStateOutboxConfirmed(), false);
assert.equal(corrupt.calls.length, 0);
const divergent = fixture({storage:new Map([[permanent.key, JSON.stringify({
  operationId:'different', generation:1, code:'OPERATION_ID_REUSED',
})]])});
assert.equal(divergent.api.readStateOutboxConflict().code, 'STATE_OUTBOX_CONFLICT_GENERATION_CHANGED');
assert.equal(await divergent.api.ensureStateOutboxConfirmed(), false);
assert.equal(divergent.calls.length, 0);

console.log('PT201_STATE_OUTBOX_PERMANENT_409_PARKED=PASS');
console.log('PT201_STATE_OUTBOX_UNKNOWN_409_FAIL_CLOSED=PASS');
console.log('PT201_STATE_OUTBOX_REVISION_RETRIES_SAME_OPERATION=PASS');
console.log('PT201_STATE_OUTBOX_EXPLICIT_RETRYABLE_FALSE=PASS');
console.log('PT201_STATE_OUTBOX_RESTART_BLOCKS_REPLAY=PASS');
console.log('PT201_STATE_OUTBOX_NO_NEW_GENERATION_WHILE_BLOCKED=PASS');
console.log('PT201_STATE_OUTBOX_400_422_OFFLINE=PASS');
console.log('PT201_STATE_OUTBOX_ACK_LOST_READBACK_NO_DUPLICATE=PASS');
console.log('PT201_STATE_OUTBOX_CORRUPT_MARKER_FAIL_CLOSED=PASS');
console.log('PT201_STATE_OUTBOX_SYNTHETIC_GATE=PASS');
