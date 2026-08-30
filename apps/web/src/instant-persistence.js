import { appendTransactionActivities } from './activity-log-core.js';
import {
  applyTransactionOperations,
  buildTransactionOperations,
  hasTransactionOperations,
  mergeTransactionOutbox,
  verifyTransactionOperations,
} from './cloud-write-ahead-core.js';
import './activity-history.js';

const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const REVISION_KEY = 'meg-cloud-revision-v1';
const ACCESS_KEY = 'meg-access-token';
const OUTBOX_KEY = 'meg-cloud-transaction-outbox-v1';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const FAILURE_NOTICE_INTERVAL_MS = 30_000;
const OUTBOX_RETRY_MS = 2_000;

let pendingImmediateState = null;
let immediateSaveRunning = false;
let outboxReplayRunning = false;
let lastFailureNoticeAt = 0;
let outboxRetryTimer = null;

function isFinancialState(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.transactions));
}

function parseJson(value) {
  try {
    return JSON.parse(value || 'null');
  } catch {
    return null;
  }
}

function sameValue(left, right) {
  if (left === right) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function sameTransactions(left, right) {
  if (!Array.isArray(left?.transactions) || !Array.isArray(right?.transactions)) return false;
  return sameValue(left.transactions, right.transactions);
}

function financialPayload(state) {
  if (!state || typeof state !== 'object') return state;
  const { activityLog: _activityLog, ...payload } = state;
  return payload;
}

function safeClone(state) {
  try {
    return structuredClone(state);
  } catch {
    try {
      return JSON.parse(JSON.stringify(state));
    } catch {
      return state;
    }
  }
}

function setSyncStatus(message) {
  const status = globalThis.document?.querySelector?.('#cloudSyncStatus');
  if (status) status.textContent = message;
}

function notifyActivityUpdated() {
  try {
    window.dispatchEvent(new CustomEvent('meg:activity-log-updated'));
  } catch {}
}

function notifyPendingFailure(error) {
  const now = Date.now();
  if (now - lastFailureNoticeAt < FAILURE_NOTICE_INTERVAL_MS) return;
  lastFailureNoticeAt = now;
  window.MEG_APP?.showToast?.(
    'Salvamento pendente',
    error instanceof Error
      ? `${error.message} O lançamento continua protegido neste aparelho e será reenviado automaticamente.`
      : 'A nuvem ainda não confirmou o lançamento. Ele continua protegido neste aparelho e será reenviado automaticamente.',
    'error',
  );
}

function readOutbox() {
  const value = parseJson(globalThis.localStorage?.getItem?.(OUTBOX_KEY));
  if (!value || typeof value !== 'object') return { generation: 0, upserts: [], deletes: [] };
  return {
    generation: Number(value.generation || 0),
    upserts: Array.isArray(value.upserts) ? value.upserts : [],
    deletes: Array.isArray(value.deletes) ? value.deletes : [],
    updatedAt: value.updatedAt || null,
  };
}

function persistOutbox(operations) {
  if (!hasTransactionOperations(operations) || !globalThis.localStorage?.setItem) return readOutbox();
  const current = readOutbox();
  const merged = mergeTransactionOutbox(current, operations);
  const next = {
    generation: current.generation + 1,
    ...merged,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
  return next;
}

function clearOutboxIfGeneration(generation) {
  const latest = readOutbox();
  if (latest.generation !== generation) return false;
  localStorage.removeItem(OUTBOX_KEY);
  return true;
}

function authenticatedHeaders() {
  const token = globalThis.sessionStorage?.getItem?.(ACCESS_KEY);
  return token ? { Authorization: `Bearer ${token}` } : null;
}

async function cloudRequest(path, options = {}) {
  const headers = authenticatedHeaders();
  if (!headers) throw new Error('A sessão ainda não está pronta para confirmar o lançamento.');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = globalThis.setTimeout?.(() => controller?.abort(), 15_000);
  try {
    return await fetch(`${window.MEG_CLOUD?.apiUrl || API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
        ...(options.headers || {}),
      },
      signal: controller?.signal,
      cache: 'no-store',
    });
  } finally {
    if (timeout) globalThis.clearTimeout?.(timeout);
  }
}

async function readRemoteState() {
  const response = await cloudRequest('/app-state');
  if (!response.ok) throw new Error(`A nuvem não confirmou a leitura do lançamento (${response.status}).`);
  const payload = await response.json();
  return {
    state: payload?.state && typeof payload.state === 'object' ? payload.state : { transactions: [], budgets: {} },
    revision: Number(payload?.revision || 0),
  };
}

function restoreConfirmedOperationsToUi(remoteState, operations) {
  const current = window.MEG_APP?.getStateRef?.() || window.MEG_APP?.getState?.();
  const base = isFinancialState(current) ? current : remoteState;
  const restored = applyTransactionOperations(base, operations);
  if (!verifyTransactionOperations(base, operations)) {
    localStorage.setItem(STATE_KEY, JSON.stringify(restored));
    window.MEG_REAL_STATE = restored;
    window.MEG_APP?.replaceState?.(restored);
    window.MEG_NATIVE_NOTIFICATIONS?.sync?.(restored);
  }
}

function publishCloudConfirmation(remote, operations) {
  if (Number.isFinite(remote.revision)) localStorage.setItem(REVISION_KEY, String(remote.revision));
  restoreConfirmedOperationsToUi(remote.state, operations);
  setSyncStatus(`Confirmado na nuvem ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  try {
    window.dispatchEvent(new CustomEvent('meg:cloud-save-confirmed', {
      detail: { verified: true, upserts: operations.upserts.length, deletes: operations.deletes.length },
    }));
  } catch {}
}

async function ensureOutboxConfirmed() {
  if (outboxReplayRunning || immediateSaveRunning) return false;
  const initial = readOutbox();
  if (!hasTransactionOperations(initial)) return true;
  if (!window.MEG_CLOUD?.apiUrl || navigator.onLine === false) return false;

  outboxReplayRunning = true;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const pending = readOutbox();
      if (!hasTransactionOperations(pending)) return true;
      const remote = await readRemoteState();

      if (verifyTransactionOperations(remote.state, pending)) {
        publishCloudConfirmation(remote, pending);
        if (clearOutboxIfGeneration(pending.generation)) return true;
        continue;
      }

      setSyncStatus('Confirmando lançamento no banco...');
      const response = await cloudRequest('/app-state/transactions', {
        method: 'PATCH',
        body: JSON.stringify({
          expectedRevision: remote.revision,
          upserts: pending.upserts,
          deletes: pending.deletes,
        }),
      });
      if (response.status === 409) continue;
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`O banco recusou a confirmação do lançamento (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`);
      }

      const confirmed = await readRemoteState();
      if (!verifyTransactionOperations(confirmed.state, pending)) {
        throw new Error('A gravação respondeu com sucesso, mas a leitura de conferência ainda não encontrou todas as alterações.');
      }
      publishCloudConfirmation(confirmed, pending);
      if (clearOutboxIfGeneration(pending.generation)) return true;
    }
    return !hasTransactionOperations(readOutbox());
  } finally {
    outboxReplayRunning = false;
  }
}

function scheduleOutboxRetry(delay = OUTBOX_RETRY_MS) {
  if (outboxRetryTimer || !hasTransactionOperations(readOutbox())) return;
  outboxRetryTimer = globalThis.setTimeout?.(() => {
    outboxRetryTimer = null;
    ensureOutboxConfirmed()
      .then((confirmed) => {
        if (!confirmed && hasTransactionOperations(readOutbox())) {
          scheduleOutboxRetry(Math.min(delay * 2, 30_000));
        }
      })
      .catch((error) => {
        setSyncStatus('Salvamento protegido, aguardando nova confirmação...');
        notifyPendingFailure(error);
        scheduleOutboxRetry(Math.min(delay * 2, 30_000));
      });
  }, delay);
}

async function flushImmediateSave() {
  if (immediateSaveRunning || !pendingImmediateState) return;
  const cloud = window.MEG_CLOUD;
  if (!cloud?.saveNow) return;

  immediateSaveRunning = true;
  try {
    while (pendingImmediateState) {
      const snapshot = pendingImmediateState;
      pendingImmediateState = null;
      setSyncStatus('Salvando na base...');
      try {
        await cloud.saveNow(snapshot);
        setSyncStatus('Gravado na nuvem, conferindo...');
      } catch (error) {
        pendingImmediateState = snapshot;
        cloud.saveState?.(snapshot);
        setSyncStatus('Salvamento pendente, tentando novamente...');
        notifyPendingFailure(error);
        break;
      }
    }
  } finally {
    immediateSaveRunning = false;
  }

  if (hasTransactionOperations(readOutbox())) {
    try {
      const confirmed = await ensureOutboxConfirmed();
      if (!confirmed) scheduleOutboxRetry();
    } catch (error) {
      setSyncStatus('Gravado localmente, confirmação da nuvem pendente...');
      notifyPendingFailure(error);
      scheduleOutboxRetry();
    }
  } else {
    setSyncStatus(`Salvo na base ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
    try { window.dispatchEvent(new CustomEvent('meg:cloud-save-confirmed', { detail: { verified: true } })); } catch {}
  }
}

function scheduleImmediateSave(state, operations) {
  if (!isFinancialState(state)) return;
  if (hasTransactionOperations(operations)) persistOutbox(operations);
  pendingImmediateState = safeClone(state);
  const schedule = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (callback) => Promise.resolve().then(callback);
  schedule(() => {
    if (window.MEG_CLOUD?.saveNow) flushImmediateSave().catch(() => undefined);
    else scheduleOutboxRetry(500);
  });
}

function installStorageBridge() {
  if (typeof window === 'undefined' || typeof Storage === 'undefined') return;
  if (window.__MEG_INSTANT_PERSISTENCE_INSTALLED__) return;
  window.__MEG_INSTANT_PERSISTENCE_INSTALLED__ = true;

  const nativeSetItem = Storage.prototype.setItem;
  const nativeGetItem = Storage.prototype.getItem;

  Storage.prototype.setItem = function instantPersistentSetItem(key, rawValue) {
    let value = rawValue;
    let stateForImmediateSave = null;
    let transactionOperations = { upserts: [], deletes: [] };

    if (this === window.localStorage && key === STATE_KEY) {
      const previousState = parseJson(nativeGetItem.call(this, key));
      const incomingState = parseJson(rawValue);
      const appState = window.MEG_APP?.getStateRef?.();

      const localAppWrite = isFinancialState(incomingState)
        && isFinancialState(appState)
        && sameTransactions(incomingState, appState);
      const changedLocally = localAppWrite
        && !sameValue(financialPayload(previousState), financialPayload(incomingState));

      if (changedLocally) {
        const nextState = appendTransactionActivities(
          previousState,
          incomingState,
          window.MEG_CLOUD?.user || {},
        );
        transactionOperations = buildTransactionOperations(previousState, nextState);
        if (Array.isArray(nextState?.activityLog)) {
          appState.activityLog = nextState.activityLog;
          value = JSON.stringify(nextState);
          notifyActivityUpdated();
        }
        stateForImmediateSave = appState;
      }
    }

    const result = nativeSetItem.call(this, key, value);
    if (stateForImmediateSave) {
      const persistedState = parseJson(nativeGetItem.call(this, STATE_KEY));
      scheduleImmediateSave(isFinancialState(persistedState) ? persistedState : stateForImmediateSave, transactionOperations);
    }
    return result;
  };

  window.addEventListener('online', () => {
    if (pendingImmediateState) flushImmediateSave().catch(() => undefined);
    else ensureOutboxConfirmed().catch(() => scheduleOutboxRetry());
  });
  window.addEventListener('focus', () => {
    if (hasTransactionOperations(readOutbox())) ensureOutboxConfirmed().catch(() => scheduleOutboxRetry());
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && hasTransactionOperations(readOutbox())) {
      ensureOutboxConfirmed().catch(() => scheduleOutboxRetry());
    }
  });
  window.addEventListener('pagehide', () => {
    if (pendingImmediateState) window.MEG_CLOUD?.saveState?.(pendingImmediateState);
  });

  window.MEG_INSTANT_PERSISTENCE = {
    pending: () => Boolean(pendingImmediateState || immediateSaveRunning || hasTransactionOperations(readOutbox()) || outboxReplayRunning),
    outbox: () => safeClone(readOutbox()),
    async flush() {
      await flushImmediateSave();
      await window.MEG_CLOUD?.flush?.({ immediate: true, throwOnError: true });
      const confirmed = await ensureOutboxConfirmed();
      if (!confirmed && hasTransactionOperations(readOutbox())) {
        throw new Error('A nuvem ainda não confirmou todos os lançamentos pendentes.');
      }
    },
  };

  if (hasTransactionOperations(readOutbox())) scheduleOutboxRetry(600);
}

installStorageBridge();
