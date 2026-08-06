import './startup-api-readiness.js';

let optionalUiPromise = null;

/**
 * Carrega recursos complementares somente depois que o aplicativo principal está pronto.
 * No navegador, mantém apenas recursos leves e isolados das telas financeiras.
 */
export function initializeStableUiFeatures() {
  if (optionalUiPromise) return optionalUiPromise;

  optionalUiPromise = (async () => {
    try {
      const nativeMobile = document.body.classList.contains('native-mobile');
      if (!nativeMobile) {
        await Promise.all([
          import('./ongoing-card-installments.css'),
          import('./stable-grid-filters.css'),
          import('./recurring-transactions.css'),
          import('./negative-expense-amounts.css')
        ]);
        const [
          { initializeStableGridFilters },
          { initializeExactNumberGridFilters },
          ,
          { initializeNegativeExpenseAmounts },
          { initializeRecurringTransactions }
        ] = await Promise.all([
          import('./stable-grid-filters.js'),
          import('./exact-number-grid-filters.js'),
          import('./ongoing-card-installments.js'),
          import('./negative-expense-amounts.js'),
          import('./recurring-transactions.js')
        ]);
        initializeStableGridFilters();
        initializeExactNumberGridFilters();
        initializeNegativeExpenseAmounts();
        initializeRecurringTransactions();
        document.querySelector('#clearCreditCardFiltersBtn')?.addEventListener('click', () => {
          window.MEG_STABLE_GRID_FILTERS?.clearCardFilters();
        });
        document.body.dataset.webRuntime = 'stable';
        return;
      }

      await Promise.all([
        import('./ux-enhancements.css'),
        import('./transaction-grid-stability.css'),
        import('./mobile-transactions.css'),
        import('./ongoing-card-installments.css'),
        import('./recurring-transactions.css'),
        import('./negative-expense-amounts.css')
      ]);

      const { initializeUxEnhancements } = await import('./ux-enhancements-safe.js');
      initializeUxEnhancements();
      await import('./ux-enhancements-hotfix.js');
      await import('./transaction-grid-stability.js');
      await import('./mobile-transactions.js');
      await import('./pending-monetary-balance.js');
      await import('./transaction-status-guard.js');
      await import('./transaction-classification-defaults.js');
      await import('./fast-logout.js');
      await import('./ongoing-card-installments.js');
      const { initializeNegativeExpenseAmounts } = await import('./negative-expense-amounts.js');
      initializeNegativeExpenseAmounts();
      const { initializeRecurringTransactions } = await import('./recurring-transactions.js');
      initializeRecurringTransactions();
      const { initializeAuthenticatedBiometricSettings } = await import('./native-biometric-settings.js');
      initializeAuthenticatedBiometricSettings();
      document.body.dataset.cloudCanonical = 'true';
    } catch (cause) {
      optionalUiPromise = null;
      console.error('MEG optional UI enhancements failed to load', cause);
    }
  })();

  return optionalUiPromise;
}

let appUpdaterPromise = null;
const ANDROID_RUNTIME_RETRIES = 10;
const ANDROID_RUNTIME_RETRY_MS = 180;

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isNativeAndroid() {
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  const nativePlatform = capacitor?.isNativePlatform?.();
  if (platform === 'android' && nativePlatform === true) return true;
  const markedNative = document.body?.classList?.contains('native-mobile');
  return Boolean(platform === 'android' && markedNative && /Android/i.test(navigator.userAgent || ''));
}

function potentiallyNativeAndroid() {
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  if (platform === 'android') return true;
  return Boolean(document.body?.classList?.contains('native-mobile') && /Android/i.test(navigator.userAgent || ''));
}

async function waitForNativeAndroid() {
  if (!potentiallyNativeAndroid()) return false;
  for (let attempt = 0; attempt < ANDROID_RUNTIME_RETRIES; attempt += 1) {
    if (isNativeAndroid()) return true;
    await delay(ANDROID_RUNTIME_RETRY_MS);
  }
  return isNativeAndroid();
}

async function getAppUpdater() {
  if (!await waitForNativeAndroid()) return null;
  appUpdaterPromise ||= import('@capacitor/core').then(({ registerPlugin }) => registerPlugin('AppUpdater'));
  return appUpdaterPromise;
}
const VERSION_URL = 'https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json';
const DISMISSED_KEY = 'meg-dismissed-app-version';
let startupCheckPromise = null;
let resolveStartupGate;
const startupGate = new Promise((resolve) => {
  resolveStartupGate = resolve;
});
const apiReadyBeforeUpdate = window.MEG_API_READY || Promise.resolve(true);
window.MEG_ANDROID_STARTUP_GATE = startupGate;
window.MEG_API_READY = Promise.all([
  apiReadyBeforeUpdate,
  startupGate,
]).then(() => true);

function updateDialog(release, installed, AppUpdater) {
  const existing = document.querySelector('#appUpdateDialog');
  if (existing?._megDecisionPromise) return existing._megDecisionPromise;

  let resolveDecision;
  const decisionPromise = new Promise((resolve) => {
    resolveDecision = resolve;
  });
  const dialog = document.createElement('dialog');
  dialog.id = 'appUpdateDialog';
  dialog.className = 'modal app-update-dialog';
  dialog._megDecisionPromise = decisionPromise;
  dialog.innerHTML = `
    <div class="app-update-icon" aria-hidden="true">↻</div>
    <small class="decision-eyebrow">ATUALIZAÇÃO DO APLICATIVO</small>
    <h2>Uma nova versão do MEG está disponível</h2>
    <p>Versão instalada: <strong>${installed.versionName}</strong> · nova versão: <strong>${release.versionName}</strong></p>
    <div class="app-update-notes">${String(release.releaseNotes || 'Melhorias de desempenho, segurança e experiência.').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</div>
    <p class="app-update-status" id="appUpdateStatus">A atualização é verificada antes do login e preserva os dados sincronizados.</p>
    <div class="modal-actions">
      <button type="button" class="ghost-button" id="appUpdateLater">Agora não</button>
      <button type="button" class="primary-button" id="appUpdateNow">Atualizar agora</button>
    </div>`;
  document.body.append(dialog);
  const status = dialog.querySelector('#appUpdateStatus');
  const updateButton = dialog.querySelector('#appUpdateNow');
  dialog.querySelector('#appUpdateLater').addEventListener('click', () => {
    sessionStorage.setItem(DISMISSED_KEY, String(release.versionCode));
    dialog.close('later');
  });
  updateButton.addEventListener('click', async () => {
    updateButton.disabled = true;
    try {
      const info = await AppUpdater.getInfo();
      if (!info.canInstallPackages) {
        status.textContent = 'Ative “Permitir desta fonte”, volte ao MEG e toque em Atualizar novamente.';
        await AppUpdater.requestInstallPermission();
        updateButton.textContent = 'Tentar novamente';
        return;
      }
      status.textContent = 'Baixando a atualização com segurança…';
      updateButton.textContent = 'Baixando…';
      await AppUpdater.downloadAndInstall({ url: release.downloadUrl, sha256: release.sha256 || '' });
      status.textContent = 'Download concluído. Confirme a instalação na tela do Android.';
    } catch (cause) {
      const message = cause?.message || String(cause || 'Falha desconhecida.');
      status.textContent = message.includes('INSTALL_PERMISSION_REQUIRED')
        ? 'Autorize a instalação de apps pelo MEG e tente novamente.'
        : `Não foi possível atualizar: ${message}`;
      updateButton.textContent = 'Tentar novamente';
    } finally {
      updateButton.disabled = false;
    }
  });
  dialog.addEventListener('close', () => {
    resolveDecision?.(dialog.returnValue || 'closed');
    dialog.remove();
  }, { once: true });
  dialog.showModal();
  return decisionPromise;
}

export async function checkForAppUpdate({ force = false, waitForDecision = false } = {}) {
  if (!await waitForNativeAndroid()) return { available: false };
  try {
    const AppUpdater = await getAppUpdater();
    if (!AppUpdater) return { available: false };
    const [installed, response] = await Promise.all([
      AppUpdater.getInfo(),
      fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' })
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const release = await response.json();
    const available = Number(release.versionCode) > Number(installed.versionCode);
    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === String(release.versionCode);
    let decision = null;
    if (available && (force || release.mandatory || !dismissed)) {
      const dialogDecision = updateDialog(release, installed, AppUpdater);
      if (waitForDecision) decision = await dialogDecision;
    }
    return { available, release, installed, decision };
  } catch (cause) {
    console.warn('MEG app update check failed', cause);
    return { available: false, error: cause };
  }
}

function checkAtAppStartup() {
  if (startupCheckPromise) return startupCheckPromise;
  startupCheckPromise = apiReadyBeforeUpdate
    .catch(() => true)
    .then(() => checkForAppUpdate({ force: true, waitForDecision: true }))
    .finally(() => {
      resolveStartupGate?.(true);
    });
  return startupCheckPromise;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAtAppStartup, { once: true });
} else {
  window.setTimeout(checkAtAppStartup, 0);
}
