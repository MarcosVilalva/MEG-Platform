import { appendTransactionActivities } from './activity-log-core.js';
import {
  applyTransactionOperations,
  buildTransactionOperations,
  hasTransactionOperations,
  mergeTransactionOutbox,
  verifyMutationConfirmation,
  verifyTransactionOperations,
} from './cloud-write-ahead-core.js';
import './activity-history.js';

const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const REVISION_KEY = 'meg-cloud-revision-v1';
const ACCESS_KEY = 'meg-access-token';
const OUTBOX_KEY = 'meg-cloud-transaction-outbox-v1';
const ACTIVITY_MIGRATION_KEY = 'meg-cloud-activity-outbox-migrated-v1';
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3333';
const FAILURE_NOTICE_INTERVAL_MS = 30_000;
const OUTBOX_RETRY_MS = 2_000;

let pendingImmediateState = null;
let immediateSaveRunning = false;
let outboxReplayRunning = false;
let lastFailureNoticeAt = 0;
let outboxRetryTimer = null;
let persistenceBlocker = null;

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

function wait(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
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
      ? `${error.message} O lançamento e seu histórico continuam protegidos neste aparelho e serão reenviados automaticamente.`
      : 'A nuvem ainda não confirmou o lançamento e seu histórico. Ambos continuam protegidos neste aparelho e serão reenviados automaticamente.',
    'error',
  );
}

function createOperationId() {
  return globalThis.crypto?.randomUUID?.()
    || `meg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showPersistenceBlocker(message = 'Gravando e confirmando na base...') {
  if (!globalThis.document?.body) return;
  if (!persistenceBlocker) {
    persistenceBlocker = document.createElement('div');
    persistenceBlocker.id = 'megPersistenceBlocker';
    persistenceBlocker.setAttribute('role', 'status');
    persistenceBlocker.setAttribute('aria-live', 'assertive');
    persistenceBlocker.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(3,18,27,.88);display:grid;place-items:center;padding:24px;';
    persistenceBlocker.innerHTML = '<div style="max-width:460px;padding:28px;border:1px solid #285365;border-radius:18px;background:#0b2632;color:#fff;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.45)"><strong style="display:block;font-size:20px;margin-bottom:10px">Salvamento seguro em andamento</strong><p data-persistence-message style="margin:0;color:#b8d5df;line-height:1.5"></p><small style="display:block;margin-top:14px;color:#70d8c8">A próxima ação será liberada somente após a confirmação do banco.</small></div>';
    document.body.appendChild(persistenceBlocker);
  }
  const text = persistenceBlocker.querySelector('[data-persistence-message]');
  if (text) text.textContent = message;
}

function hidePersistenceBlocker() {
  persistenceBlocker?.remove();
  persistenceBlocker = null;
}

function readOutbox() {
  const value = parseJson(globalThis.localStorage?.getItem?.(OUTBOX_KEY));
  if (!value || typeof value !== 'object') return { generation: 0, operationId: '', upserts: [], deletes: [], activities: [] };
  return {
    generation: Number(value.generation || 0),
    operationId: typeof value.operationId === 'string' ? value.operationId : '',
    upserts: Array.isArray(value.upserts) ? value.upserts : [],
    deletes: Array.isArray(value.deletes) ? value.deletes : [],
    activities: Array.isArray(value.activities) ? value.activities : [],
    updatedAt: value.updatedAt || null,
  };
}

function persistOutbox(operations) {
  if (!hasTransactionOperations(operations) || !globalThis.localStorage?.setItem) return readOutbox();
  const current = readOutbox();
  const merged = mergeTransactionOutbox(current, operations);
  const next = {
    generation: current.generation + 1,
    operationId: createOperationId(),
    ...merged,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
  return next;
}

function ensureOutboxOperationId(value) {
  if (value.operationId) return value;
  const next = { ...value, generation: value.generation + 1, operationId: createOperationId() };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
  return next;
}

function clearOutboxIfGeneration(generation) {
  const latest = readOutbox();
  if (latest.generation !== generation) return false;
  localStorage.removeItem(OUTBOX_KEY);
  if (!pendingImmediateState && !immediateSaveRunning) hidePersistenceBlocker();
  return true;
}

function seedCachedActivitiesOnce() {
  if (!globalThis.localStorage?.getItem || localStorage.getItem(ACTIVITY_MIGRATION_KEY)) return;
  const cachedState = parseJson(localStorage.getItem(STATE_KEY));
  const activities = Array.isArray(cachedState?.activityLog)
    ? cachedState.activityLog.filter((item) => typeof item?.id === 'string' && item.id).slice(0, 500)
    : [];
  if (activities.length) persistOutbox({ upserts: [], deletes: [], activities });
  localStorage.setItem(ACTIVITY_MIGRATION_KEY, new Date().toISOString());
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
    notifyActivityUpdated();
  }
}

function publishCloudConfirmation(remote, operations) {
  if (Number.isFinite(remote.revision)) localStorage.setItem(REVISION_KEY, String(remote.revision));
  restoreConfirmedOperationsToUi(remote.state, operations);
  setSyncStatus(`Confirmado na nuvem ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  try {
    window.dispatchEvent(new CustomEvent('meg:cloud-save-confirmed', {
      detail: {
        verified: true,
        upserts: operations.upserts.length,
        deletes: operations.deletes.length,
        activities: Array.isArray(operations.activities) ? operations.activities.length : 0,
      },
    }));
  } catch {}
}

async function ensureOutboxConfirmed() {
  if (outboxReplayRunning) return false;
  const initial = readOutbox();
  if (!hasTransactionOperations(initial)) return true;
  if (!window.MEG_CLOUD?.apiUrl || navigator.onLine === false) return false;

  outboxReplayRunning = true;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const pending = ensureOutboxOperationId(readOutbox());
      if (!hasTransactionOperations(pending)) return true;
      const remote = await readRemoteState();

      if (verifyTransactionOperations(remote.state, pending)) {
        window.MEG_CLOUD?.acceptConfirmedState?.(remote);
        publishCloudConfirmation(remote, pending);
        if (clearOutboxIfGeneration(pending.generation)) return true;
        continue;
      }

      setSyncStatus('Confirmando lançamento e histórico no banco...');
      showPersistenceBlocker('Enviando o lançamento e aguardando o recibo definitivo do banco...');
      const response = await cloudRequest('/app-state/transactions', {
        method: 'PATCH',
        body: JSON.stringify({
          operationId: pending.operationId,
          expectedRevision: remote.revision,
          upserts: pending.upserts,
          deletes: pending.deletes,
          activities: pending.activities,
        }),
      });
      if (response.status === 409) continue;
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`O banco recusou a confirmação do lançamento (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`);
      }

      const receipt = await response.json();
      if (verifyMutationConfirmation(receipt?.confirmation, pending)) {
        const confirmedState = applyTransactionOperations(remote.state, pending);
        const confirmed = { state: confirmedState, revision: Number(receipt.revision || receipt.confirmation.revision || remote.revision) };
        window.MEG_CLOUD?.acceptConfirmedState?.(confirmed);
        publishCloudConfirmation(confirmed, pending);
        if (clearOutboxIfGeneration(pending.generation)) return true;
        continue;
      }

      // Compatibilidade durante a implantação: versões antigas da API ainda
      // não retornam recibo atômico. Nelas, confirme pela fonte de verdade sem
      // comparar a ordem das chaves do JSONB.
      const confirmed = await readRemoteState();
      if (!verifyTransactionOperations(confirmed.state, pending)) {
        throw new Error('O banco ainda não emitiu o recibo definitivo desta gravação. O MEG continuará tentando sem liberar uma nova operação.');
      }
      window.MEG_CLOUD?.acceptConfirmedState?.(confirmed);
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
        if (confirmed && pendingImmediateState && !immediateSaveRunning) {
          flushImmediateSave().catch(() => scheduleOutboxRetry());
          return;
        }
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
    if (hasTransactionOperations(readOutbox())) {
      const confirmed = await ensureOutboxConfirmed();
      if (!confirmed) {
        scheduleOutboxRetry();
        return;
      }
    }

    while (pendingImmediateState) {
      const snapshot = pendingImmediateState;
      pendingImmediateState = null;
      setSyncStatus('Salvando na base...');
      try {
        await cloud.saveNow(snapshot);
        setSyncStatus(`Confirmado na base ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
      } catch (error) {
        pendingImmediateState = snapshot;
        setSyncStatus('Aguardando confirmação completa da base...');
        showPersistenceBlocker('A parte principal foi gravada, mas o MEG ainda está confirmando todos os dados relacionados antes de liberar o sistema...');
        notifyPendingFailure(error);
        globalThis.setTimeout?.(() => flushImmediateSave().catch(() => undefined), 1_500);
        break;
      }
    }
  } catch (error) {
    setSyncStatus('Aguardando confirmação segura do banco...');
    showPersistenceBlocker('A conexão ainda não confirmou a gravação. O MEG continuará tentando automaticamente, sem liberar outra operação.');
    notifyPendingFailure(error);
    scheduleOutboxRetry();
  } finally {
    immediateSaveRunning = false;
  }

  if (!hasTransactionOperations(readOutbox()) && !pendingImmediateState) {
    hidePersistenceBlocker();
    setSyncStatus(`Salvo na base ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
    try { window.dispatchEvent(new CustomEvent('meg:cloud-save-confirmed', { detail: { verified: true } })); } catch {}
  }
}

function scheduleImmediateSave(state, operations) {
  if (!isFinancialState(state)) return;
  if (hasTransactionOperations(operations)) {
    persistOutbox(operations);
    showPersistenceBlocker('O lançamento foi protegido neste aparelho e está sendo confirmado na base...');
  }
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
    let transactionOperations = { upserts: [], deletes: [], activities: [] };

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

  // Na primeira abertura desta versão, preserve qualquer histórico que ainda
  // exista no WebView antes que uma leitura da nuvem possa substituir o cache.
  seedCachedActivitiesOnce();

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
      const deadline = Date.now() + 120_000;
      showPersistenceBlocker('Aguardando o recibo definitivo da base de dados...');
      while (Date.now() < deadline) {
        if (!immediateSaveRunning) await flushImmediateSave();
        if (!outboxReplayRunning && hasTransactionOperations(readOutbox())) {
          await ensureOutboxConfirmed().catch(() => false);
        }
        if (!hasTransactionOperations(readOutbox()) && !pendingImmediateState && !immediateSaveRunning && !outboxReplayRunning) {
          await window.MEG_CLOUD?.flush?.({ immediate: true, throwOnError: true });
          hidePersistenceBlocker();
          return true;
        }
        await wait(250);
      }
      throw new Error('A confirmação segura excedeu dois minutos. A operação permanece bloqueada e será reenviada automaticamente.');
    },
  };

  if (hasTransactionOperations(readOutbox())) {
    showPersistenceBlocker('Há uma gravação protegida neste aparelho. Confirmando na base antes de liberar o sistema...');
    scheduleOutboxRetry(600);
  }
}

installStorageBridge();
