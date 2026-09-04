import { appendTransactionActivities } from './activity-log-core.js';
import {
  applyTransactionOperations,
  buildTransactionOperations,
  hasTransactionOperations,
  mergeTransactionOutbox,
  normalizeTransactionOutbox,
  verifyMutationConfirmation,
  verifyTransactionOperations,
} from './cloud-write-ahead-core.js';
import {
  changedStateProperties,
  matchesStateProperties,
  stateProperties,
} from './cloud-state-properties-core.js';
import { installCloudMutationGuard } from './cloud-mutation-guard.js';
import {
  emptyStateOutbox,
  emptyTransactionOutbox,
  normalizeStateOutbox,
  reconcileStateOutboxes,
  reconcileTransactionOutboxes,
} from './durable-outbox-core.js';
import {
  deleteDurableOutboxIfGeneration,
  protectDurableOutbox,
  readDurableOutbox,
} from './durable-outbox-store.js';
import './activity-history.js';

const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const REVISION_KEY = 'meg-cloud-revision-v1';
const ACCESS_KEY = 'meg-access-token';
const OUTBOX_KEY = 'meg-cloud-transaction-outbox-v1';
const OUTBOX_RECOVERY_KEY = 'meg-cloud-transaction-outbox-recovery-v1';
const STATE_OUTBOX_KEY = 'meg-cloud-state-properties-outbox-v1';
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
let publishingConfirmedState = false;
let durableHydrationRunning = true;
let durableStorageUnavailable = false;
let durableWriteBarrier = Promise.resolve();
let durableWriteFailure = null;

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
    persistenceBlocker.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483646;width:min(420px,calc(100vw - 36px));pointer-events:none;';
    persistenceBlocker.innerHTML = '<div style="padding:18px;border:1px solid #285365;border-radius:16px;background:#0b2632;color:#fff;box-shadow:0 16px 45px rgba(0,0,0,.35)"><strong style="display:block;font-size:16px;margin-bottom:7px">Sincronizando com a nuvem</strong><p data-persistence-message style="margin:0;color:#b8d5df;line-height:1.45"></p><small style="display:block;margin-top:9px;color:#70d8c8">A próxima alteração será liberada após a confirmação da base.</small></div>';
    document.body.appendChild(persistenceBlocker);
  }
  const text = persistenceBlocker.querySelector('[data-persistence-message]');
  if (text) text.textContent = message;
  window.MEG_CLOUD_MUTATION_GUARD?.setVisualPending?.(true);
}

function hidePersistenceBlocker() {
  persistenceBlocker?.remove();
  persistenceBlocker = null;
  if (!window.MEG_CLOUD_MUTATION_GUARD?.pending?.()) window.MEG_CLOUD_MUTATION_GUARD?.setVisualPending?.(false);
}

function readOutbox() {
  const value = parseJson(globalThis.localStorage?.getItem?.(OUTBOX_KEY));
  if (!value || typeof value !== 'object') return emptyTransactionOutbox();
  const normalized = normalizeTransactionOutbox(value);
  if (!sameValue(value, normalized)) {
    try {
      localStorage.setItem(OUTBOX_RECOVERY_KEY, JSON.stringify({ savedAt: new Date().toISOString(), original: value }));
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(normalized));
    } catch {}
  }
  return normalized;
}

function readStateOutbox() {
  const value = parseJson(globalThis.localStorage?.getItem?.(STATE_OUTBOX_KEY));
  return normalizeStateOutbox(value);
}

function enqueueDurableWrite(task) {
  durableWriteBarrier = durableWriteBarrier.catch(() => undefined).then(async () => {
    try {
      const result = await task();
      durableWriteFailure = null;
      return result;
    } catch (error) {
      durableWriteFailure = error;
      throw error;
    }
  });
  durableWriteBarrier.catch(() => undefined);
  return durableWriteBarrier;
}

async function protectOutbox(kind, value) {
  const result = await protectDurableOutbox(kind, value);
  if (result.unavailable) durableStorageUnavailable = true;
  return result;
}

async function initializeDurableOutboxes() {
  try {
    const [durableTransactions, durableState] = await Promise.all([
      readDurableOutbox('transactions'),
      readDurableOutbox('state-properties'),
    ]);
    const transactions = reconcileTransactionOutboxes(readOutbox(), durableTransactions);
    const state = reconcileStateOutboxes(readStateOutbox(), durableState);
    if (hasTransactionOperations(transactions)) {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(transactions));
      await protectOutbox('transactions', transactions);
    }
    if (hasStateOutbox(state)) {
      localStorage.setItem(STATE_OUTBOX_KEY, JSON.stringify(state));
      await protectOutbox('state-properties', state);
    }
  } finally {
    durableHydrationRunning = false;
  }
}

const durableReadyPromise = initializeDurableOutboxes();

async function awaitDurableProtection() {
  await durableReadyPromise;
  await durableWriteBarrier.catch(() => undefined);
  if (durableWriteFailure && !durableStorageUnavailable) throw durableWriteFailure;
}

function hasStateOutbox(value = readStateOutbox()) {
  return Boolean(value.properties && Object.keys(value.properties).length > 0);
}

function persistStateOutbox(properties) {
  const current = readStateOutbox();
  const next = {
    generation: current.generation + 1,
    operationId: createOperationId(),
    properties: { ...(current.properties || {}), ...stateProperties(properties) },
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STATE_OUTBOX_KEY, JSON.stringify(next));
  enqueueDurableWrite(() => protectOutbox('state-properties', next));
  return next;
}

function ensureStateOutboxOperationId(value) {
  if (value.operationId) return value;
  const next = { ...value, generation: value.generation + 1, operationId: createOperationId() };
  localStorage.setItem(STATE_OUTBOX_KEY, JSON.stringify(next));
  enqueueDurableWrite(() => protectOutbox('state-properties', next));
  return next;
}

function clearStateOutboxIfGeneration(generation) {
  const latest = readStateOutbox();
  if (latest.generation !== generation) return false;
  localStorage.removeItem(STATE_OUTBOX_KEY);
  enqueueDurableWrite(() => deleteDurableOutboxIfGeneration('state-properties', generation));
  return true;
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
  enqueueDurableWrite(() => protectOutbox('transactions', next));
  return next;
}

function ensureOutboxOperationId(value) {
  if (value.operationId) return value;
  const next = { ...value, generation: value.generation + 1, operationId: createOperationId() };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
  enqueueDurableWrite(() => protectOutbox('transactions', next));
  return next;
}

function clearOutboxIfGeneration(generation) {
  const latest = readOutbox();
  if (latest.generation !== generation) return false;
  localStorage.removeItem(OUTBOX_KEY);
  enqueueDurableWrite(() => deleteDurableOutboxIfGeneration('transactions', generation));
  if (!pendingImmediateState && !immediateSaveRunning && !hasStateOutbox()) hidePersistenceBlocker();
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

function isCloudSessionReady() {
  return Boolean(authenticatedHeaders() && window.MEG_CLOUD?.apiUrl);
}

async function cloudRequest(path, options = {}) {
  const headers = authenticatedHeaders();
  if (!headers) throw new Error('A sessão ainda não está pronta para confirmar o lançamento.');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = globalThis.setTimeout?.(() => controller?.abort(), 15_000);
  const separator = path.includes('?') ? '&' : '?';
  const confirmedPath = `${path}${separator}megCloudConfirmation=1`;
  try {
    return await fetch(`${window.MEG_CLOUD?.apiUrl || API_URL}${confirmedPath}`, {
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

function publishStatePropertiesConfirmation(remote) {
  if (Number.isFinite(remote.revision)) localStorage.setItem(REVISION_KEY, String(remote.revision));
  publishingConfirmedState = true;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(remote.state));
    window.MEG_REAL_STATE = remote.state;
    window.MEG_CLOUD?.acceptConfirmedState?.(remote);
    window.MEG_APP?.replaceState?.(remote.state);
  } finally {
    publishingConfirmedState = false;
  }
  window.MEG_NATIVE_NOTIFICATIONS?.sync?.(remote.state);
  setSyncStatus(`Confirmado na nuvem ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  try {
    window.dispatchEvent(new CustomEvent('meg:cloud-save-confirmed', {
      detail: { verified: true, properties: true },
    }));
  } catch {}
}

async function ensureOutboxConfirmed() {
  await awaitDurableProtection();
  if (outboxReplayRunning) return false;
  const initial = readOutbox();
  if (!hasTransactionOperations(initial)) return true;
  if (!isCloudSessionReady() || navigator.onLine === false) {
    return false;
  }

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

async function ensureStateOutboxConfirmed() {
  await awaitDurableProtection();
  const initial = readStateOutbox();
  if (!hasStateOutbox(initial)) return true;
  if (!isCloudSessionReady() || navigator.onLine === false) return false;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const pending = ensureStateOutboxOperationId(readStateOutbox());
    if (!hasStateOutbox(pending)) return true;
    const remote = await readRemoteState();
    if (matchesStateProperties(remote.state, pending.properties)) {
      publishStatePropertiesConfirmation(remote);
      if (clearStateOutboxIfGeneration(pending.generation)) return true;
      continue;
    }

    setSyncStatus('Salvando configurações e cadastros na nuvem...');
    showPersistenceBlocker('Enviando a alteração e aguardando a releitura confirmada da base...');
    const response = await cloudRequest('/app-state/properties', {
      method: 'PATCH',
      body: JSON.stringify({
        operationId: pending.operationId,
        expectedRevision: remote.revision,
        properties: pending.properties,
      }),
    });
    if (response.status === 409) continue;
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`A base recusou a confirmação da alteração (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`);
    }
    const receipt = await response.json().catch(() => ({}));
    if (receipt.operationId && receipt.operationId !== pending.operationId) {
      throw new Error('O recibo retornado pela base não corresponde à alteração enviada.');
    }
    const confirmed = await readRemoteState();
    if (!matchesStateProperties(confirmed.state, pending.properties)) {
      throw new Error('A alteração foi recebida, mas a releitura da base ainda não confirmou todos os dados.');
    }
    publishStatePropertiesConfirmation(confirmed);
    if (clearStateOutboxIfGeneration(pending.generation)) return true;
  }
  return !hasStateOutbox();
}

function scheduleOutboxRetry(delay = OUTBOX_RETRY_MS) {
  if (outboxRetryTimer || (!hasTransactionOperations(readOutbox()) && !hasStateOutbox())) return;
  outboxRetryTimer = globalThis.setTimeout?.(() => {
    outboxRetryTimer = null;
    flushImmediateSave()
      .then(() => {
        if (hasTransactionOperations(readOutbox()) || hasStateOutbox() || pendingImmediateState) {
          scheduleOutboxRetry(Math.min(delay * 2, 30_000));
        }
      })
      .catch((error) => {
        setSyncStatus('Salvamento protegido, aguardando nova confirmação...');
        if (isCloudSessionReady()) notifyPendingFailure(error);
        scheduleOutboxRetry(Math.min(delay * 2, 30_000));
      });
  }, delay);
}

async function flushImmediateSave() {
  await durableReadyPromise;
  if (immediateSaveRunning || (!pendingImmediateState && !hasTransactionOperations(readOutbox()) && !hasStateOutbox())) return;
  const cloud = window.MEG_CLOUD;
  if (!cloud?.saveNow || !isCloudSessionReady()) return;

  immediateSaveRunning = true;
  try {
    if (hasTransactionOperations(readOutbox())) {
      const confirmed = await ensureOutboxConfirmed();
      if (!confirmed) {
        scheduleOutboxRetry();
        return;
      }
    }

    if (hasStateOutbox()) {
      const confirmed = await ensureStateOutboxConfirmed();
      if (!confirmed) {
        scheduleOutboxRetry();
        return;
      }
    }
    pendingImmediateState = null;
  } catch (error) {
    setSyncStatus('Aguardando confirmação segura do banco...');
    showPersistenceBlocker('A conexão ainda não confirmou a gravação. O MEG continuará tentando automaticamente, sem liberar outra operação.');
    notifyPendingFailure(error);
    scheduleOutboxRetry();
  } finally {
    immediateSaveRunning = false;
  }

  if (!hasTransactionOperations(readOutbox()) && !hasStateOutbox() && !pendingImmediateState) {
    hidePersistenceBlocker();
    setSyncStatus(`Salvo na base ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
    try { window.dispatchEvent(new CustomEvent('meg:cloud-save-confirmed', { detail: { verified: true } })); } catch {}
  }
}

function scheduleImmediateSave(state, operations, propertyChanges = {}) {
  if (!isFinancialState(state)) return;
  if (hasTransactionOperations(operations)) {
    persistOutbox(operations);
    showPersistenceBlocker('O lançamento foi protegido neste aparelho e está sendo confirmado na base...');
  }
  if (Object.keys(propertyChanges).length > 0) {
    persistStateOutbox(propertyChanges);
    showPersistenceBlocker('A alteração foi protegida neste aparelho e está sendo confirmada na nuvem...');
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
  installCloudMutationGuard();

  const nativeSetItem = Storage.prototype.setItem;
  const nativeGetItem = Storage.prototype.getItem;

  Storage.prototype.setItem = function instantPersistentSetItem(key, rawValue) {
    let value = rawValue;
    let stateForImmediateSave = null;
    let transactionOperations = { upserts: [], deletes: [], activities: [] };
    let propertyChanges = {};

    if (this === window.localStorage && key === STATE_KEY && !publishingConfirmedState) {
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
        propertyChanges = changedStateProperties(previousState, nextState);
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
      scheduleImmediateSave(isFinancialState(persistedState) ? persistedState : stateForImmediateSave, transactionOperations, propertyChanges);
    }
    return result;
  };

  // Na primeira abertura desta versão, preserve qualquer histórico que ainda
  // exista no WebView antes que uma leitura da nuvem possa substituir o cache.
  seedCachedActivitiesOnce();

  window.addEventListener('online', () => {
    if (pendingImmediateState || hasTransactionOperations(readOutbox()) || hasStateOutbox()) {
      flushImmediateSave().catch(() => scheduleOutboxRetry());
    }
  });
  window.addEventListener('meg:cloud-ready', () => {
    if (hasTransactionOperations(readOutbox()) || hasStateOutbox()) {
      showPersistenceBlocker('Sessão iniciada. Confirmando os dados protegidos na base...');
      flushImmediateSave().catch(() => scheduleOutboxRetry());
    }
  });
  window.addEventListener('focus', () => {
    if (hasTransactionOperations(readOutbox()) || hasStateOutbox()) flushImmediateSave().catch(() => scheduleOutboxRetry());
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (hasTransactionOperations(readOutbox()) || hasStateOutbox())) {
      flushImmediateSave().catch(() => scheduleOutboxRetry());
    }
  });
  window.addEventListener('pagehide', () => {
    if (pendingImmediateState) window.MEG_CLOUD?.saveState?.(pendingImmediateState);
  });
  window.addEventListener('meg:cloud-action-started', () => {
    showPersistenceBlocker('Ação enviada. Aguardando a confirmação da nuvem...');
    setSyncStatus('Sincronizando com a nuvem...');
  });
  window.addEventListener('meg:cloud-network-idle', () => {
    if (!pendingImmediateState && !hasTransactionOperations(readOutbox()) && !hasStateOutbox()) hidePersistenceBlocker();
  });
  window.addEventListener('meg:cloud-action-blocked', () => {
    window.MEG_APP?.showToast?.('Aguarde a confirmação', 'A ação anterior ainda está sendo sincronizada com a nuvem.', 'warning');
  });

  window.MEG_INSTANT_PERSISTENCE = {
    pending: () => Boolean(durableHydrationRunning || pendingImmediateState || immediateSaveRunning || hasTransactionOperations(readOutbox()) || hasStateOutbox() || outboxReplayRunning),
    outbox: () => safeClone(readOutbox()),
    stateOutbox: () => safeClone(readStateOutbox()),
    hasProtectedState: () => hasStateOutbox(),
    durableStorage: () => durableStorageUnavailable ? 'local-fallback' : 'indexeddb',
    async flush() {
      const deadline = Date.now() + 120_000;
      showPersistenceBlocker('Aguardando o recibo definitivo da base de dados...');
      while (Date.now() < deadline) {
        if (!immediateSaveRunning) await flushImmediateSave();
        if (!outboxReplayRunning && hasTransactionOperations(readOutbox())) {
          await ensureOutboxConfirmed().catch(() => false);
        }
        if (hasStateOutbox()) await ensureStateOutboxConfirmed().catch(() => false);
        if (!hasTransactionOperations(readOutbox()) && !hasStateOutbox() && !pendingImmediateState && !immediateSaveRunning && !outboxReplayRunning) {
          await window.MEG_CLOUD?.flush?.({ immediate: true, throwOnError: true });
          hidePersistenceBlocker();
          return true;
        }
        await wait(250);
      }
      throw new Error('A confirmação segura excedeu dois minutos. A operação permanece bloqueada e será reenviada automaticamente.');
    },
  };

  if (hasTransactionOperations(readOutbox()) || hasStateOutbox()) {
    scheduleOutboxRetry(600);
  }
  durableReadyPromise.then(() => {
    if (hasTransactionOperations(readOutbox()) || hasStateOutbox()) scheduleOutboxRetry(100);
  });
}

installStorageBridge();
