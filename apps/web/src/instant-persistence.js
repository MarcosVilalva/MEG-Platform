import { appendTransactionActivities } from './activity-log-core.js';
import './activity-history.js';

const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const FAILURE_NOTICE_INTERVAL_MS = 30_000;

let pendingImmediateState = null;
let immediateSaveRunning = false;
let lastFailureNoticeAt = 0;

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
        setSyncStatus(`Salvo na base ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        window.dispatchEvent(new CustomEvent('meg:cloud-save-confirmed'));
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
}

function scheduleImmediateSave(state) {
  if (!isFinancialState(state) || !window.MEG_CLOUD?.saveNow) return;
  pendingImmediateState = safeClone(state);
  const schedule = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (callback) => Promise.resolve().then(callback);
  schedule(() => flushImmediateSave().catch(() => undefined));
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

    if (this === window.localStorage && key === STATE_KEY) {
      const previousState = parseJson(nativeGetItem.call(this, key));
      const incomingState = parseJson(rawValue);
      const appState = window.MEG_APP?.getStateRef?.();

      // Uma gravação originada pela própria interface contém exatamente a
      // coleção que está na memória do app. Atualizações vindas da nuvem são
      // escritas no localStorage antes de replaceState e, por isso, não passam
      // por este critério. Isso impede histórico duplicado e reenvio em loop.
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
        if (Array.isArray(nextState?.activityLog)) {
          appState.activityLog = nextState.activityLog;
          value = JSON.stringify(nextState);
          notifyActivityUpdated();
        }
        stateForImmediateSave = appState;
      }
    }

    const result = nativeSetItem.call(this, key, value);
    if (stateForImmediateSave) scheduleImmediateSave(stateForImmediateSave);
    return result;
  };

  window.addEventListener('online', () => {
    if (pendingImmediateState) flushImmediateSave().catch(() => undefined);
  });
  window.addEventListener('pagehide', () => {
    if (pendingImmediateState) window.MEG_CLOUD?.saveState?.(pendingImmediateState);
  });

  window.MEG_INSTANT_PERSISTENCE = {
    pending: () => Boolean(pendingImmediateState || immediateSaveRunning),
    async flush() {
      await flushImmediateSave();
      await window.MEG_CLOUD?.flush?.({ immediate: true, throwOnError: true });
    },
  };
}

installStorageBridge();
