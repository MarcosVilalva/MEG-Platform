import { isFinancialState, recoveryDecision, transactionCount } from './state-recovery-core.js';

const VALIDATION_MODE = import.meta.env.VITE_VALIDATION_MODE === 'true' || new URLSearchParams(location.search).get('validacao') === '1';
const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const REVISION_KEY = 'meg-cloud-revision-v1';
const DIRTY_KEY = 'meg-local-state-pending-v1';
const DB_NAME = 'meg-financas-recovery';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_SNAPSHOTS = 12;
const SNAPSHOT_INTERVAL_MS = 60_000;

let internalStateWrite = false;
let remoteStateWindowUntil = 0;
let confirmedStateRaw = '';
let confirmedStateUntil = 0;
let lastSnapshotAt = 0;
let recoveryBlocked = false;
let blockedNoticeShown = false;

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
      const excess = allRequest.result
        .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
        .slice(0, Math.max(0, allRequest.result.length - MAX_SNAPSHOTS));
      excess.forEach((item) => store.delete(item.id));
    };
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
  });
}

function setProtectedLocalState(state) {
  internalStateWrite = true;
  try {
    const raw = JSON.stringify(state);
    writeLocalValue(STATE_KEY, raw);
    confirmedStateRaw = raw;
    confirmedStateUntil = Date.now() + 5000;
  } finally {
    internalStateWrite = false;
  }
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
  return /\/app-state\/?$/.test(url.pathname) || /\/app-state\/transactions\/?$/.test(url.pathname);
}

function exactAppStateRequest(url) {
  return Boolean(url && /\/app-state\/?$/.test(url.pathname));
}

function showBlockedNotice() {
  if (blockedNoticeShown) return;
  blockedNoticeShown = true;
  const show = () => {
    const notice = document.createElement('div');
    notice.id = 'megDataRecoveryNotice';
    notice.setAttribute('role', 'alert');
    notice.style.cssText = 'position:fixed;inset:auto 16px 16px;z-index:2147483647;padding:14px 16px;border-radius:12px;background:#7f1d1d;color:#fff;font:600 14px/1.4 system-ui;box-shadow:0 12px 30px #0005';
    notice.textContent = 'O MEG protegeu uma cópia local ainda não sincronizada. Não recarregue a nuvem; verifique a conexão e abra novamente para concluir a recuperação automática.';
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
    const remoteWrite = Date.now() <= remoteStateWindowUntil;
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
    if (isFinancialState(confirmedState)) {
      confirmedStateRaw = JSON.stringify(confirmedState);
      confirmedStateUntil = Date.now() + 5000;
      saveSnapshot(confirmedState, 'confirmado-na-nuvem').catch(() => undefined);
    }
    clearDirtyState();
    return response;
  }

  if (method !== 'GET' || !exactAppStateRequest(url) || !response.ok) return response;

  remoteStateWindowUntil = Date.now() + 3000;
  const payload = await response.clone().json().catch(() => null);
  if (!payload) return response;
  saveSnapshot(payload.state, 'nuvem-antes-da-abertura', payload.revision, { force: true }).catch(() => undefined);

  const dirty = readDirtyState();
  const localState = parseJson(localValue(STATE_KEY));
  const decision = recoveryDecision({
    dirty,
    localState,
    remoteState: payload.state,
    remoteRevision: Number(payload.revision || 0),
  });
  if (decision.action !== 'recover') return response;

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
  setProtectedLocalState(decision.state);
  clearDirtyState();
  saveSnapshot(decision.state, 'recuperacao-automatica-concluida', saved.revision, { force: true }).catch(() => undefined);
  window.MEG_DATA_RECOVERY_RESULT = {
    recovered: true,
    strategy: decision.strategy,
    localCount: decision.localCount,
    remoteCount: decision.remoteCount,
    mergedCount: decision.mergedCount,
    revision: Number(saved.revision || decision.revision),
  };

  return responseFromPayload({
    ...payload,
    state: decision.state,
    revision: Number(saved.revision || decision.revision),
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
  dirty: () => VALIDATION_MODE ? null : readDirtyState(),
  blocked: () => !VALIDATION_MODE && recoveryBlocked,
  snapshot(reason = 'copia-manual') {
    if (VALIDATION_MODE) return Promise.resolve(false);
    return saveSnapshot(parseJson(localValue(STATE_KEY)), reason, currentRevision(), { force: true });
  },
};
