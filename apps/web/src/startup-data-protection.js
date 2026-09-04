import { isFinancialState, recoveryDecision, transactionCount } from './state-recovery-core.js';

const VALIDATION_MODE = import.meta.env.VITE_VALIDATION_MODE === 'true' || new URLSearchParams(location.search).get('validacao') === '1';
const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const REVISION_KEY = 'meg-cloud-revision-v1';
const DIRTY_KEY = 'meg-local-state-pending-v1';
const DB_NAME = 'meg-financas-recovery';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const BASELINE_ID = 'cloud-baseline';
const MAX_SNAPSHOTS = 12;
const SNAPSHOT_INTERVAL_MS = 60_000;

let internalStateWrite = false;
let remoteStateWindowUntil = 0;
let confirmedStateRaw = '';
let confirmedStateUntil = 0;
let lastSnapshotAt = 0;
let recoveryBlocked = false;
let blockedNoticeShown = false;
let cloudBaselineState = null;
let cloudBaselineRevision = 0;

const originalFetch = window.fetch.bind(window);
const originalSetItem = Storage.prototype.setItem;
const originalGetItem = Storage.prototype.getItem;
const originalRemoveItem = Storage.prototype.removeItem;

function parseJson(value) {
  try {
    return JSON.parse(value || 'null');
  } catch {
    return null;
  }
}

function localValue(key) {
  return originalGetItem.call(window.localStorage, key);
}

function writeLocalValue(key, value) {
  originalSetItem.call(window.localStorage, key, value);
}

function removeLocalValue(key) {
  originalRemoveItem.call(window.localStorage, key);
}

function currentRevision() {
  return Number(localValue(REVISION_KEY) || 0);
}

function readDirtyState() {
  const value = parseJson(localValue(DIRTY_KEY));
  return value && Number.isFinite(Number(value.baseRevision)) ? value : null;
}

function markDirty(rawState) {
  const state = parseJson(rawState);
  if (!isFinancialState(state)) return;
  const existing = readDirtyState();
  writeLocalValue(DIRTY_KEY, JSON.stringify({
    baseRevision: existing?.baseRevision ?? currentRevision(),
    firstChangedAt: existing?.firstChangedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transactionCount: transactionCount(state),
  }));
}

function clearDirtyState() {
  removeLocalValue(DIRTY_KEY);
  recoveryBlocked = false;
  window.MEG_DATA_RECOVERY_BLOCKED = false;
}

function openRecoveryDatabase() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function saveSnapshot(state, reason, revision = currentRevision(), { force = false } = {}) {
  if (VALIDATION_MODE || !isFinancialState(state)) return false;
  const now = Date.now();
  if (!force && now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return false;
  lastSnapshotAt = now;
  const database = await openRecoveryDatabase();
  if (!database) return false;

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({
      id: `${now}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      createdAt: new Date(now).toISOString(),
      reason,
      revision: Number(revision || 0),
      transactionCount: transactionCount(state),
      state,
    });
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const ordinarySnapshots = allRequest.result
        .filter((item) => item.id !== BASELINE_ID)
        .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
      const excess = ordinarySnapshots.slice(0, Math.max(0, ordinarySnapshots.length - MAX_SNAPSHOTS));
      excess.forEach((item) => store.delete(item.id));
    };
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
  });
}

async function saveCloudBaseline(state, revision) {
  if (VALIDATION_MODE || !isFinancialState(state)) return false;
  cloudBaselineState = state;
  cloudBaselineRevision = Number(revision || 0);
  const database = await openRecoveryDatabase();
  if (!database) return false;

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      id: BASELINE_ID,
      createdAt: new Date().toISOString(),
      reason: 'ultima-base-confirmada-na-nuvem',
      revision: cloudBaselineRevision,
      transactionCount: transactionCount(state),
      state,
    });
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
  });
}

async function loadCloudBaseline() {
  if (isFinancialState(cloudBaselineState)) {
    return { state: cloudBaselineState, revision: cloudBaselineRevision };
  }
  const database = await openRecoveryDatabase();
  if (!database) return { state: null, revision: 0 };

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(BASELINE_ID);
    request.onsuccess = () => {
      const item = request.result;
      if (isFinancialState(item?.state)) {
        cloudBaselineState = item.state;
        cloudBaselineRevision = Number(item.revision || 0);
      }
      resolve({ state: cloudBaselineState, revision: cloudBaselineRevision });
    };
    request.onerror = () => resolve({ state: null, revision: 0 });
  });
}

function setProtectedLocalState(state) {
  internalStateWrite = true;
  try {
    const raw = JSON.stringify(state);
    writeLocalValue(STATE_KEY, raw);
    confirmedStateRaw = raw;
    confirmedStateUntil = Date.now() + 30_000;
  } finally {
    internalStateWrite = false;
  }
}

function markRemoteStateAsConfirmed(state) {
  if (!isFinancialState(state)) return;
  confirmedStateRaw = JSON.stringify(state);
  confirmedStateUntil = Date.now() + 30_000;
  remoteStateWindowUntil = Date.now() + 30_000;
}

function requestUrl(input) {
  try {
    return new URL(typeof input === 'string' ? input : input.url, location.href);
  } catch {
    return null;
  }
}

function responseFromPayload(payload, response, status = 200) {
  const headers = new Headers(response?.headers || {});
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(payload), { status, headers });
}

function appStateRequest(url) {
  if (!url) return false;
  return /\/app-state\/?$/.test(url.pathname)
    || /\/app-state\/transactions\/?$/.test(url.pathname)
    || /\/app-state\/properties\/?$/.test(url.pathname);
}

function exactAppStateRequest(url) {
  return Boolean(url && /\/app-state\/?$/.test(url.pathname));
}

function cloudConfirmationRequest(url) {
  return url?.searchParams?.get?.('megCloudConfirmation') === '1';
}

function showBlockedNotice() {
  if (blockedNoticeShown) return;
  blockedNoticeShown = true;
  const show = () => {
    const notice = document.createElement('div');
    notice.id = 'megDataRecoveryNotice';
    notice.setAttribute('role', 'alert');
    notice.style.cssText = 'position:fixed;inset:auto 16px 16px;z-index:2147483647;padding:14px 16px;border-radius:12px;background:#7f1d1d;color:#fff;font:600 14px/1.4 system-ui;box-shadow:0 12px 30px #0005';
    notice.textContent = 'O MEG protegeu alterações locais ainda não sincronizadas. A base da nuvem não foi substituída. Verifique a conexão e abra novamente.';
    document.body.appendChild(notice);
  };
  if (document.body) show();
  else document.addEventListener('DOMContentLoaded', show, { once: true });
}

Storage.prototype.setItem = function protectedSetItem(key, value) {
  if (VALIDATION_MODE) return originalSetItem.call(this, key, value);
  if (this === window.localStorage && key === STATE_KEY && !internalStateWrite) {
    const previousRaw = localValue(STATE_KEY);
    if (previousRaw && previousRaw !== value) {
      saveSnapshot(parseJson(previousRaw), 'antes-de-alteracao-local').catch(() => undefined);
    }
    const confirmedWrite = Date.now() <= confirmedStateUntil && value === confirmedStateRaw;
    const remoteWrite = Date.now() <= remoteStateWindowUntil && value === confirmedStateRaw;
    if (!confirmedWrite && !remoteWrite) markDirty(value);
  }
  return originalSetItem.call(this, key, value);
};

window.fetch = async function protectedFetch(input, init = {}) {
  if (VALIDATION_MODE) return originalFetch(input, init);
  const url = requestUrl(input);
  const method = String(init.method || 'GET').toUpperCase();
  const isStateRequest = appStateRequest(url);
  const isStateWrite = isStateRequest && (method === 'PUT' || method === 'PATCH' || method === 'POST' || method === 'DELETE');

  if (isStateWrite && recoveryBlocked) {
    return responseFromPayload({ error: 'LOCAL_RECOVERY_PENDING' }, null, 409);
  }

  const response = await originalFetch(input, init);

  if (isStateWrite && response.ok) {
    let confirmedState = null;
    try {
      const requestBody = typeof init.body === 'string' ? JSON.parse(init.body) : null;
      confirmedState = requestBody?.state || window.MEG_APP?.getStateRef?.() || window.MEG_APP?.getState?.();
    } catch {
      confirmedState = window.MEG_APP?.getStateRef?.() || window.MEG_APP?.getState?.();
    }
    const responsePayload = await response.clone().json().catch(() => ({}));
    if (isFinancialState(confirmedState)) {
      markRemoteStateAsConfirmed(confirmedState);
      saveSnapshot(confirmedState, 'confirmado-na-nuvem').catch(() => undefined);
      saveCloudBaseline(confirmedState, Number(responsePayload.revision || currentRevision())).catch(() => undefined);
    }
    clearDirtyState();
    return response;
  }

  if (method !== 'GET' || !exactAppStateRequest(url) || !response.ok) return response;

  const payload = await response.clone().json().catch(() => null);
  if (!payload || !isFinancialState(payload.state)) return response;

  // A fila transacional usa esta leitura como recibo da fonte de verdade.
  // Ela precisa enxergar o estado remoto puro e não pode acionar o antigo
  // mecanismo de recuperação por PUT, que concorreria com os patches atômicos.
  if (cloudConfirmationRequest(url)) return response;

  const localState = parseJson(localValue(STATE_KEY));
  const protectedByOutbox = Boolean(window.MEG_INSTANT_PERSISTENCE?.pending?.());
  if (protectedByOutbox && isFinancialState(localState)) {
    window.MEG_DATA_RECOVERY_RESULT = {
      recovered: false,
      cloudCanonical: false,
      strategy: 'durable-outbox-in-progress',
      localCount: transactionCount(localState),
      remoteCount: transactionCount(payload.state),
    };
    return responseFromPayload({ ...payload, state: localState, protectedLocal: true }, response);
  }

  markRemoteStateAsConfirmed(payload.state);
  saveSnapshot(payload.state, 'nuvem-antes-da-abertura', payload.revision, { force: true }).catch(() => undefined);

  const dirty = readDirtyState();
  const baseline = await loadCloudBaseline();
  const decision = recoveryDecision({
    dirty,
    localState,
    remoteState: payload.state,
    remoteRevision: Number(payload.revision || 0),
    baselineState: baseline.state,
    baselineRevision: baseline.revision,
  });

  if (decision.action !== 'recover') {
    if (decision.protectedLocal && isFinancialState(localState)) {
      await saveSnapshot(localState, `copia-local-protegida-${decision.strategy}`, currentRevision(), { force: true });
      window.MEG_DATA_RECOVERY_RESULT = {
        recovered: false,
        cloudCanonical: true,
        strategy: decision.strategy,
        localCount: decision.localCount,
        remoteCount: decision.remoteCount,
        conflicts: Number(decision.conflicts || 0),
      };
    }
    clearDirtyState();
    saveCloudBaseline(payload.state, payload.revision).catch(() => undefined);
    return response;
  }

  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  const recoveryResponse = await originalFetch(url.toString(), {
    ...init,
    method: 'PUT',
    headers,
    body: JSON.stringify({ state: decision.state, expectedRevision: decision.revision }),
  });

  if (!recoveryResponse.ok) {
    recoveryBlocked = true;
    window.MEG_DATA_RECOVERY_BLOCKED = true;
    showBlockedNotice();
    return responseFromPayload({ error: 'LOCAL_RECOVERY_PENDING' }, response, 503);
  }

  const saved = await recoveryResponse.json().catch(() => ({}));
  const savedRevision = Number(saved.revision || decision.revision);
  setProtectedLocalState(decision.state);
  clearDirtyState();
  saveSnapshot(decision.state, 'recuperacao-automatica-concluida', savedRevision, { force: true }).catch(() => undefined);
  saveCloudBaseline(decision.state, savedRevision).catch(() => undefined);
  window.MEG_DATA_RECOVERY_RESULT = {
    recovered: true,
    cloudCanonical: true,
    strategy: decision.strategy,
    localCount: decision.localCount,
    remoteCount: decision.remoteCount,
    mergedCount: decision.mergedCount,
    conflicts: Number(decision.conflicts || 0),
    additions: Number(decision.additions || 0),
    updates: Number(decision.updates || 0),
    deletions: Number(decision.deletions || 0),
    revision: savedRevision,
  };

  return responseFromPayload({
    ...payload,
    state: decision.state,
    revision: savedRevision,
    updatedAt: saved.updatedAt || payload.updatedAt,
    recovered: true,
  }, response);
};

window.addEventListener('pagehide', () => {
  if (VALIDATION_MODE) return;
  const state = parseJson(localValue(STATE_KEY));
  saveSnapshot(state, 'fechamento-do-aplicativo', currentRevision(), { force: true }).catch(() => undefined);
});

window.MEG_DATA_PROTECTION = {
  enabled: !VALIDATION_MODE,
  cloudCanonical: true,
  dirty: () => VALIDATION_MODE ? null : readDirtyState(),
  blocked: () => !VALIDATION_MODE && recoveryBlocked,
  baseline: () => ({ revision: cloudBaselineRevision, transactionCount: transactionCount(cloudBaselineState) }),
  snapshot(reason = 'copia-manual') {
    if (VALIDATION_MODE) return Promise.resolve(false);
    return saveSnapshot(parseJson(localValue(STATE_KEY)), reason, currentRevision(), { force: true });
  },
};
