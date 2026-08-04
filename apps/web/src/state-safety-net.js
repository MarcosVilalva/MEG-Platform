const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const PENDING_KEY = 'meg-financas-pending-cloud-state-v1';
const BACKUP_INDEX_KEY = 'meg-financas-backup-index-v1';
const BACKUP_PREFIX = 'meg-financas-backup-v1:';
const MAX_BACKUPS = 12;
const RETRY_MS = 5000;

function safeParse(value) {
  try {
    const parsed = JSON.parse(value || 'null');
    return Array.isArray(parsed?.transactions) ? parsed : null;
  } catch {
    return null;
  }
}

function transactionCount(state) {
  return Array.isArray(state?.transactions) ? state.transactions.length : 0;
}

function backupState(state, reason = 'automatic') {
  if (!state || !Array.isArray(state.transactions)) return null;
  const stamp = Date.now();
  const key = `${BACKUP_PREFIX}${stamp}`;
  const payload = {
    createdAt: new Date(stamp).toISOString(),
    reason,
    transactionCount: transactionCount(state),
    state,
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    const index = safeParseIndex(localStorage.getItem(BACKUP_INDEX_KEY));
    index.unshift(key);
    const unique = [...new Set(index)].slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(unique));
    index.slice(MAX_BACKUPS).forEach((oldKey) => localStorage.removeItem(oldKey));
    return key;
  } catch {
    return null;
  }
}

function safeParseIndex(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function persistPendingState(state) {
  if (!state || !Array.isArray(state.transactions)) return;
  try {
    const current = safeParse(localStorage.getItem(PENDING_KEY));
    if (!current || transactionCount(state) >= transactionCount(current)) {
      localStorage.setItem(PENDING_KEY, JSON.stringify(state));
    }
  } catch {}
}

function clearPendingState() {
  localStorage.removeItem(PENDING_KEY);
}

function installLocalStorageHistory() {
  const originalSetItem = Storage.prototype.setItem;
  if (originalSetItem._megSafetyWrapped) return;
  function wrappedSetItem(key, value) {
    if (this === localStorage && key === STATE_KEY) {
      const previous = safeParse(this.getItem(STATE_KEY));
      const next = safeParse(value);
      if (previous && (!next || transactionCount(previous) > transactionCount(next))) {
        backupState(previous, 'before-local-overwrite');
      }
      if (next) backupState(next, 'local-save');
    }
    return originalSetItem.call(this, key, value);
  }
  wrappedSetItem._megSafetyWrapped = true;
  Storage.prototype.setItem = wrappedSetItem;
}

let retryInFlight = false;
async function retryPendingCloudSave() {
  if (retryInFlight || navigator.onLine === false) return;
  const cloud = window.MEG_CLOUD;
  const pending = safeParse(localStorage.getItem(PENDING_KEY));
  if (!pending || typeof cloud?.saveNow !== 'function') return;
  retryInFlight = true;
  try {
    await cloud.saveNow(pending);
    backupState(pending, 'cloud-confirmed');
    clearPendingState();
  } catch (cause) {
    const status = document.querySelector('#cloudSyncStatus');
    if (status) status.textContent = 'Alterações protegidas neste aparelho; aguardando sincronização.';
    console.warn('MEG durable cloud retry failed', cause);
  } finally {
    retryInFlight = false;
  }
}

function wrapCloudPersistence() {
  const cloud = window.MEG_CLOUD;
  if (!cloud || cloud._megSafetyWrapped) return false;
  const originalSaveState = cloud.saveState?.bind(cloud);
  const originalSaveNow = cloud.saveNow?.bind(cloud);
  if (typeof originalSaveState !== 'function' || typeof originalSaveNow !== 'function') return false;

  cloud.saveState = (state) => {
    persistPendingState(state);
    backupState(state, 'queued-for-cloud');
    return originalSaveState(state);
  };

  cloud.saveNow = async (state, options) => {
    persistPendingState(state);
    backupState(state, 'before-cloud-save');
    const result = await originalSaveNow(state, options);
    backupState(state, 'cloud-confirmed');
    clearPendingState();
    return result;
  };

  cloud._megSafetyWrapped = true;
  retryPendingCloudSave();
  return true;
}

function exposeRecoveryTools() {
  window.MEG_STATE_SAFETY = {
    backupNow(reason = 'manual') {
      const state = safeParse(localStorage.getItem(STATE_KEY)) || window.MEG_APP?.getState?.();
      return backupState(state, reason);
    },
    listBackups() {
      return safeParseIndex(localStorage.getItem(BACKUP_INDEX_KEY)).map((key) => {
        try {
          const payload = JSON.parse(localStorage.getItem(key) || 'null');
          return payload ? { key, createdAt: payload.createdAt, reason: payload.reason, transactionCount: payload.transactionCount } : null;
        } catch {
          return null;
        }
      }).filter(Boolean);
    },
    restoreBackup(key) {
      const payload = JSON.parse(localStorage.getItem(key) || 'null');
      if (!payload?.state || !Array.isArray(payload.state.transactions)) throw new Error('Backup inválido.');
      localStorage.setItem(STATE_KEY, JSON.stringify(payload.state));
      persistPendingState(payload.state);
      return payload.state;
    },
    retrySync: retryPendingCloudSave,
  };
}

installLocalStorageHistory();
exposeRecoveryTools();

const cloudWrapTimer = window.setInterval(() => {
  if (wrapCloudPersistence()) window.clearInterval(cloudWrapTimer);
}, 250);

window.addEventListener('online', retryPendingCloudSave);
window.addEventListener('focus', retryPendingCloudSave);
window.setInterval(retryPendingCloudSave, RETRY_MS);
window.addEventListener('beforeunload', () => {
  const state = window.MEG_APP?.getState?.() || safeParse(localStorage.getItem(STATE_KEY));
  if (state) {
    backupState(state, 'before-unload');
    persistPendingState(state);
  }
});
