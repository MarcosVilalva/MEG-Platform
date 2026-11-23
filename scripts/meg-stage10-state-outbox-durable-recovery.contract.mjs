import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeStateOutbox, reconcileStateOutboxes } from '../apps/web/src/durable-outbox-core.js';

// PT202: executa a hidratacao e a recusa REAIS com dois armazenamentos
// simulados. Nenhum browser, banco, API, dispositivo ou dado produtivo.
const source = readFileSync(new URL('../apps/web/src/instant-persistence.js', import.meta.url), 'utf8');
function pick(a, b) {
  const start = source.indexOf(a), end = source.indexOf(b, start + a.length);
  assert.ok(start >= 0 && end > start, 'Fonte alterada: ' + a);
  return source.slice(start, end);
}
const segments = [
  pick('function readStateOutboxConflict(', '\nasync function parkStateOutboxConflict('),
  pick('async function parkStateOutboxConflict(', '\nfunction enqueueDurableWrite('),
  pick('async function initializeDurableOutboxes(', '\nconst durableReadyPromise'),
];
const deps = [
  'readDurableOutbox', 'protectOutbox', 'reconcileTransactionOutboxes',
  'reconcileStateOutboxes', 'readOutbox', 'readStateOutbox',
  'hasTransactionOperations', 'hasStateOutbox', 'localStorage',
  'STATE_OUTBOX_KEY', 'OUTBOX_KEY', 'STATE_OUTBOX_CONFLICT_KEY',
  'STATE_OUTBOX_CONFLICT_KIND', 'parseJson', 'sameValue', 'globalThis',
  'setSyncStatus', 'showPersistenceBlocker', 'parkedOutboxMessage', 'window', 'CustomEvent',
];
const create = new Function('d', '"use strict";'
  + 'let unpersistedStateOutboxConflict = null; let durableHydrationRunning = true;'
  + 'const {' + deps.join(',') + '} = d;'
  + segments.join('\n')
  + 'return { readStateOutboxConflict, parkStateOutboxConflict, initializeDurableOutboxes };');
const OUTBOX = 'meg-cloud-state-properties-outbox-v1';
const MARKER = 'meg-cloud-state-properties-outbox-conflict-v1';
const KIND = 'state-properties-conflict';
const pending = {
  generation: 9, operationId: '00000000-0000-4000-a000-000000000202',
  properties: { preferences: { locale: 'pt-BR' } },
  updatedAt: '2026-11-23T11:00:00.000Z',
};
const marker = {
  generation: 9, operationId: pending.operationId,
  code: 'OPERATION_ID_REUSED', detectedAt: '2026-11-23T11:01:00.000Z',
};
function fixture(durable = new Map(), local = new Map(), { denyWrite = false } = {}) {
  const status = [];
  const localStorage = {
    getItem: k => local.get(k) ?? null,
    setItem(k,v) { if (denyWrite) throw new Error('LOCAL_STORAGE_UNAVAILABLE'); local.set(k,v); },
    removeItem: k => local.delete(k),
  };
  const readStateOutbox = () => normalizeStateOutbox(
    JSON.parse(localStorage.getItem(OUTBOX) || 'null'));
  const h = {
    readDurableOutbox: async kind => structuredClone(durable.get(kind) ?? null),
    protectOutbox: async (kind, value) => {
      durable.set(kind, structuredClone(value));
      return { protected: true, unavailable: false };
    },
    reconcileTransactionOutboxes: () => ({ upserts: [], deletes: [], activities: [] }),
    reconcileStateOutboxes,
    readOutbox: () => ({ upserts: [], deletes: [], activities: [] }),
    readStateOutbox,
    hasTransactionOperations: () => false,
    hasStateOutbox: (x = readStateOutbox()) => Boolean(x?.properties && Object.keys(x.properties).length),
    localStorage,
    STATE_OUTBOX_KEY: OUTBOX, OUTBOX_KEY: 'unused-transaction-outbox',
    STATE_OUTBOX_CONFLICT_KEY: MARKER, STATE_OUTBOX_CONFLICT_KIND: KIND,
    parseJson: raw => { try { return JSON.parse(raw || 'null'); } catch { return null; } },
    sameValue: (a,b) => JSON.stringify(a) === JSON.stringify(b),
    globalThis: { localStorage },
    setSyncStatus: m => status.push(m),
    showPersistenceBlocker: m => status.push(m),
    parkedOutboxMessage: code => 'blocked ' + code,
    window: { MEG_APP: { showToast() {} }, dispatchEvent() {} },
    CustomEvent: class { constructor(type,opts) {this.type=type;this.detail=opts.detail;} },
  };
  const api = create(h);
  return { api, durable, local, status, readStateOutbox };
}
const initialDurable = new Map([['state-properties', structuredClone(pending)]]);
const firstLocal = new Map([[OUTBOX, JSON.stringify(pending)]]);
const first = fixture(initialDurable, firstLocal);
await first.api.parkStateOutboxConflict(pending, 'OPERATION_ID_REUSED');
assert.deepEqual(first.durable.get(KIND).operationId, pending.operationId);
assert.equal(first.local.has(MARKER), true);
assert.equal(first.api.readStateOutboxConflict().code, 'OPERATION_ID_REUSED');

const recovered = fixture(initialDurable, new Map());
await recovered.api.initializeDurableOutboxes();
assert.equal(recovered.readStateOutbox().operationId, pending.operationId);
assert.equal(recovered.api.readStateOutboxConflict().code, 'OPERATION_ID_REUSED');
assert.deepEqual(JSON.parse(recovered.local.get(MARKER)), first.durable.get(KIND));
assert.ok(!recovered.local.get(MARKER).includes('pt-BR'), 'Marcador sem payload');

const repairDurable = new Map([['state-properties', structuredClone(pending)]]);
const repairLocal = new Map([[OUTBOX, JSON.stringify(pending)], [MARKER, JSON.stringify(marker)]]);
const repair = fixture(repairDurable, repairLocal);
await repair.api.initializeDurableOutboxes();
assert.deepEqual(repair.durable.get(KIND), marker, 'Marcador local reposto no armazenamento duravel');

const divergedDurable = new Map([
  ['state-properties', structuredClone(pending)],
  [KIND, structuredClone(marker)],
]);
const divergedLocal = new Map([
  [OUTBOX, JSON.stringify(pending)],
  [MARKER, JSON.stringify({ ...marker, operationId: 'another-operation' })],
]);
const diverged = fixture(divergedDurable, divergedLocal);
await diverged.api.initializeDurableOutboxes();
assert.equal(diverged.api.readStateOutboxConflict().code, 'STATE_OUTBOX_CONFLICT_STORES_DIVERGED');
assert.deepEqual(diverged.durable.get(KIND), marker);
assert.ok(diverged.local.get(MARKER).includes('another-operation'), 'Nao escolhe uma copia silenciosamente');

const incompatibleDurable = new Map([
  ['state-properties', structuredClone({ ...pending, generation: 11 })],
  [KIND, structuredClone(marker)],
]);
const incompatible = fixture(incompatibleDurable, new Map());
await incompatible.api.initializeDurableOutboxes();
assert.equal(incompatible.api.readStateOutboxConflict().code, 'STATE_OUTBOX_CONFLICT_GENERATION_CHANGED');

const corruptDurable = new Map([
  ['state-properties', structuredClone(pending)],
  [KIND, { code: 42, operationId: pending.operationId, generation:9 }],
]);
const corrupt = fixture(corruptDurable, new Map());
await corrupt.api.initializeDurableOutboxes();
assert.equal(corrupt.api.readStateOutboxConflict().code, 'STATE_OUTBOX_CONFLICT_MARKER_INVALID');

const unavailable = fixture(initialDurable, new Map(), {denyWrite:true});
await assert.rejects(unavailable.api.initializeDurableOutboxes(), /LOCAL_STORAGE_UNAVAILABLE/);

const clean = fixture(new Map(), new Map());
await clean.api.initializeDurableOutboxes();
assert.equal(clean.api.readStateOutboxConflict(), null);

console.log('PT202_DURABLE_CONFLICT_WRITTEN_TO_SEPARATE_STORE=PASS');
console.log('PT202_LOST_LOCALSTORAGE_REHYDRATES_PENDING_AND_CONFLICT=PASS');
console.log('PT202_EXISTING_LOCAL_MARKER_BACKFILLED_DURABLY=PASS');
console.log('PT202_DIVERGENT_DUAL_STORES_FAIL_CLOSED=PASS');
console.log('PT202_RESTORED_GENERATION_MISMATCH_FAIL_CLOSED=PASS');
console.log('PT202_CORRUPTED_DURABLE_MARKER_FAIL_CLOSED=PASS');
console.log('PT202_UNAVAILABLE_LOCALSTORE_FAILS_WITHOUT_FALSE_SUCCESS=PASS');
console.log('PT202_DUAL_STORE_SYNTHETIC_GATE=PASS');
