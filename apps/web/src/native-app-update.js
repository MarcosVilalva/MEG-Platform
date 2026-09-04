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
        await import('./meg-contrast-comfort.css');
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
      await import('./meg-contrast-comfort.css');

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
const INSTALLED_VERSION_TIMEOUT_MS = 3000;

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function fetchWithDeadline(url, options, timeoutMs) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timeout;
  try {
    const request = fetch(url, { ...options, signal: controller?.signal || options?.signal });
    const deadline = new Promise((_, reject) => {
      timeout = window.setTimeout(() => {
        controller?.abort();
        reject(new Error(`UPDATE_FETCH_TIMEOUT_${timeoutMs}`));
      }, timeoutMs);
    });
    return await Promise.race([request, deadline]);
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

async function promiseWithDeadline(promise, timeoutMs, errorCode) {
  let timeout;
  try {
    const deadline = new Promise((_, reject) => {
      timeout = window.setTimeout(() => reject(new Error(errorCode)), timeoutMs);
    });
    return await Promise.race([Promise.resolve(promise), deadline]);
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
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
  if (!potentiallyNativeAndroid()) return null;
  const nativeProxy = window.Capacitor?.Plugins?.AppUpdater;
  if (nativeProxy) return nativeProxy;
  appUpdaterPromise ||= import('@capacitor/core').then(({ registerPlugin }) => registerPlugin('AppUpdater'));
  return appUpdaterPromise;
}
const VERSION_URLS = [
  'https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json',
  'https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/apps/web/public/downloads/app-version.json',
];
const VERSION_FETCH_ATTEMPTS = 3;
const VERSION_FETCH_RETRY_MS = 900;
const VERSION_FETCH_TIMEOUT_MS = 8000;
const UPDATE_RESUME_DELAY_MS = 1200;
const UPDATE_RESUME_UI_ATTEMPTS = 60;
const UPDATE_RESUME_UI_RETRY_MS = 500;
let updateLifecycleStarted = false;
let updateResumeTimer = null;

function publishInstalledVersion(installed) {
  if (!installed?.versionName) return;
  window.MEG_INSTALLED_APP_VERSION = installed;
  document.body.dataset.installedAppVersion = String(installed.versionName);
  const versionLabel = document.querySelector('#sidebarVersion');
  if (versionLabel) {
    versionLabel.textContent = `APK v${installed.versionName}`;
    versionLabel.dataset.versionSource = 'native';
  }
  window.dispatchEvent(new CustomEvent('meg:installed-app-version', { detail: installed }));
}

function publishInstalledVersionUnavailable() {
  const versionLabel = document.querySelector('#sidebarVersion');
  if (!versionLabel || versionLabel.dataset.versionSource === 'native') return;
  versionLabel.textContent = 'APK: versão indisponível';
  versionLabel.dataset.versionSource = 'unavailable';
}

export async function refreshInstalledAppVersion() {
  try {
    const nativeAndroid = await promiseWithDeadline(
      waitForNativeAndroid(),
      INSTALLED_VERSION_TIMEOUT_MS,
      'INSTALLED_VERSION_RUNTIME_TIMEOUT'
    );
    if (!nativeAndroid) {
      publishInstalledVersionUnavailable();
      return null;
    }
    const AppUpdater = await getAppUpdater();
    if (!AppUpdater) {
      publishInstalledVersionUnavailable();
      return null;
    }
    const installed = await promiseWithDeadline(
      AppUpdater.getInfo(),
      INSTALLED_VERSION_TIMEOUT_MS,
      'INSTALLED_VERSION_BRIDGE_TIMEOUT'
    );
    publishInstalledVersion(installed);
    return installed;
  } catch (cause) {
    console.warn('MEG installed version lookup failed', cause);
    publishInstalledVersionUnavailable();
    return null;
  }
}

function removeAvailableUpdateNotice() {
  document.querySelector('#appUpdateBanner')?.remove();
  document.querySelector('#appUpdateSidebarBadge')?.remove();
  delete document.body.dataset.availableAppVersion;
  delete window.MEG_AVAILABLE_APP_UPDATE;
}

function removeUpdateCheckWarning() {
  document.querySelector('#appUpdateCheckWarning')?.remove();
}

function publishUpdateCheckWarning(cause) {
  let warning = document.querySelector('#appUpdateCheckWarning');
  if (!warning) {
    warning = document.createElement('section');
    warning.id = 'appUpdateCheckWarning';
    warning.className = 'app-update-check-warning';
    warning.setAttribute('role', 'status');
    warning.setAttribute('aria-live', 'polite');
    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.insertAdjacentElement('afterend', warning);
    else if (document.querySelector('main.content')) document.querySelector('main.content').prepend(warning);
    else document.body.append(warning);
  }
  warning.innerHTML = `
    <div><strong>Não foi possível verificar atualizações</strong><span>Confira sua internet e tente novamente.</span></div>
    <button type="button">Tentar novamente</button>`;
  warning.querySelector('button')?.addEventListener('click', () => {
    warning.querySelector('button').disabled = true;
    checkForAppUpdate({ force: true }).catch(() => undefined);
  });
  window.dispatchEvent(new CustomEvent('meg:app-update-check-failed', { detail: { message: cause?.message || String(cause || '') } }));
}

async function fetchReleaseManifest(AppUpdater, { timeoutMs, fetchAttempts }) {
  const errors = [];
  for (const url of VERSION_URLS) {
    try {
      const release = await AppUpdater.getReleaseManifest({ url: `${url}?t=${Date.now()}` });
      if (release?.versionCode) return release;
      throw new Error('MANIFEST_WITHOUT_VERSION');
    } catch (cause) {
      errors.push(cause);
    }
  }

  const attempts = Math.max(1, Math.min(Number(fetchAttempts) || 1, VERSION_FETCH_ATTEMPTS));
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const url = VERSION_URLS[(attempt - 1) % VERSION_URLS.length];
    try {
      const response = await fetchWithDeadline(`${url}?t=${Date.now()}-${attempt}`, { cache: 'no-store' }, timeoutMs);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const release = await response.json();
      if (!release?.versionCode) throw new Error('MANIFEST_WITHOUT_VERSION');
      return release;
    } catch (cause) {
      errors.push(cause);
      if (attempt < attempts) await delay(VERSION_FETCH_RETRY_MS * attempt);
    }
  }
  throw errors.at(-1) || new Error('Manifesto de atualização indisponível.');
}

function publishAvailableUpdate(release, installed, AppUpdater) {
  window.MEG_AVAILABLE_APP_UPDATE = { release, installed };
  document.body.dataset.availableAppVersion = String(release.versionName || release.versionCode || 'nova');

  let banner = document.querySelector('#appUpdateBanner');
  if (!banner) {
    banner = document.createElement('section');
    banner.id = 'appUpdateBanner';
    banner.className = 'app-update-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.insertAdjacentElement('afterend', banner);
    else document.querySelector('main.content')?.prepend(banner);
  }
  banner.innerHTML = `
    <div class="app-update-banner-icon" aria-hidden="true">↻</div>
    <div class="app-update-banner-copy">
      <small>ATUALIZAÇÃO DISPONÍVEL</small>
      <strong>MEG ${String(release.versionName || release.versionCode || '').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</strong>
      <span>Uma versão mais recente está pronta para instalar.</span>
    </div>
    <button type="button" class="primary-button" data-install-app-update>Atualizar agora</button>`;
  banner.querySelector('[data-install-app-update]')?.addEventListener('click', () => {
    updateDialog(release, installed, AppUpdater);
  });

  let sidebarBadge = document.querySelector('#appUpdateSidebarBadge');
  if (!sidebarBadge) {
    sidebarBadge = document.createElement('button');
    sidebarBadge.id = 'appUpdateSidebarBadge';
    sidebarBadge.className = 'app-update-sidebar-badge';
    sidebarBadge.type = 'button';
    document.querySelector('.sidebar-user-footer > div')?.append(sidebarBadge);
  }
  sidebarBadge.textContent = `Atualizar para v${release.versionName || release.versionCode}`;
  sidebarBadge.setAttribute('aria-label', `Atualização ${release.versionName || release.versionCode} disponível. Atualizar agora.`);
  sidebarBadge.onclick = () => updateDialog(release, installed, AppUpdater);

  window.dispatchEvent(new CustomEvent('meg:app-update-available', { detail: { release, installed } }));
  AppUpdater.suppressNativePrompt({ versionCode: Number(release.versionCode) }).catch(() => undefined);
}

export async function markAndroidUpdateUiReady() {
  if (!potentiallyNativeAndroid()) return false;
  try {
    const AppUpdater = await getAppUpdater();
    if (!AppUpdater) return false;
    await AppUpdater.setAuthenticatedUiReady();
    document.body.dataset.androidUpdateReady = 'true';
    return true;
  } catch (cause) {
    console.warn('MEG native update readiness failed', cause);
    publishUpdateCheckWarning(cause);
    return false;
  }
}

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
    <p class="app-update-status" id="appUpdateStatus">Toque em “Atualizar agora”. O MEG fará o download seguro e abrirá a instalação.</p>
    <div class="modal-actions">
      <button type="button" class="ghost-button" id="appUpdateContinue">Agora não</button>
      <button type="button" class="primary-button" id="appUpdateRetry">Atualizar agora</button>
    </div>`;
  document.body.append(dialog);
  const status = dialog.querySelector('#appUpdateStatus');
  const continueButton = dialog.querySelector('#appUpdateContinue');
  const retryButton = dialog.querySelector('#appUpdateRetry');
  let updateRunning = false;
  let stateListener = null;

  const setRunning = (running) => {
    updateRunning = running;
    retryButton.disabled = running;
    continueButton.disabled = running;
    retryButton.toggleAttribute('aria-busy', running);
    retryButton.textContent = running ? 'Processando atualização…' : 'Tentar novamente';
  };

  const showInstallError = (cause) => {
    const message = cause?.message || String(cause || 'Falha desconhecida.');
    status.textContent = message.includes('INSTALL_PERMISSION')
      ? 'A permissão de instalação não foi liberada. Autorize e tente novamente.'
      : `Não foi possível atualizar: ${message}`;
    setRunning(false);
  };

  const observeNativeState = async () => {
    if (stateListener || typeof AppUpdater.addListener !== 'function') return;
    stateListener = await AppUpdater.addListener('appUpdateState', (event) => {
      if (!dialog.isConnected) return;
      if (event?.state === 'waiting-permission') {
        status.textContent = 'Autorize “Permitir desta fonte”. Ao voltar, o MEG continuará automaticamente.';
      } else if (event?.state === 'downloading') {
        const percent = Number(event.percent);
        status.textContent = Number.isFinite(percent) && percent > 0
          ? `Baixando atualização… ${Math.min(100, Math.round(percent))}%`
          : 'Baixando a nova versão…';
      } else if (event?.state === 'validating') {
        status.textContent = 'Download concluído. Validando a assinatura do aplicativo…';
      } else if (event?.state === 'installer-launched') {
        status.textContent = 'Instalação iniciada. Conclua na tela segura do Android.';
      } else if (event?.state === 'failed') {
        showInstallError(new Error(event.message || 'O Android não conseguiu iniciar a instalação.'));
      }
    });
  };

  const installAutomatically = async () => {
    if (updateRunning) return;
    setRunning(true);
    try {
      status.textContent = 'Iniciando o atualizador seguro do Android…';
      await observeNativeState();

      if (typeof AppUpdater.startDownloadAndInstall === 'function') {
        try {
          const accepted = await AppUpdater.startDownloadAndInstall({
            url: release.downloadUrl,
            sha256: release.sha256 || '',
          });
          status.textContent = accepted?.permissionRequired
            ? 'Autorize “Permitir desta fonte”. Ao voltar, o MEG continuará automaticamente.'
            : 'Atualização iniciada. Aguarde o download, a validação e a abertura do instalador…';
          return;
        } catch (cause) {
          const unsupported = /not implemented|does not exist|unavailable/i.test(String(cause?.message || cause));
          if (!unsupported) throw cause;
        }
      }

      status.textContent = 'Baixando e validando a nova versão…';
      try {
        await AppUpdater.downloadAndInstall({ url: release.downloadUrl, sha256: release.sha256 || '' });
      } catch (cause) {
        if (!String(cause?.message || cause).includes('INSTALL_PERMISSION_REQUIRED')) throw cause;
        status.textContent = 'Autorize “Permitir desta fonte”. Ao voltar, o MEG continuará o download e abrirá o instalador automaticamente.';
        Promise.resolve(AppUpdater.requestInstallPermission()).catch(showInstallError);
        return;
      }
      status.textContent = 'Atualização pronta. Conclua a instalação na tela segura do Android.';
      dialog.close('installer-launched');
    } catch (cause) {
      showInstallError(cause);
    }
  };

  retryButton.addEventListener('click', installAutomatically);
  continueButton.addEventListener('click', () => dialog.close('continue-without-update'));
  dialog.addEventListener('close', () => {
    Promise.resolve(stateListener?.remove?.()).catch(() => undefined);
    resolveDecision?.(dialog.returnValue || 'closed');
    dialog.remove();
  }, { once: true });
  dialog.showModal();
  return decisionPromise;
}

export async function checkForAppUpdate({ force = false, waitForDecision = false, preflightOnly = false, timeoutMs = VERSION_FETCH_TIMEOUT_MS, fetchAttempts = VERSION_FETCH_ATTEMPTS } = {}) {
  if (!await waitForNativeAndroid()) return { available: false };
  try {
    const AppUpdater = await getAppUpdater();
    if (!AppUpdater) return { available: false };
    const installed = await AppUpdater.getInfo();
    publishInstalledVersion(installed);
    const release = await fetchReleaseManifest(AppUpdater, { timeoutMs, fetchAttempts: preflightOnly ? 1 : fetchAttempts });
    const installedCode = Number(installed.versionCode);
    const releaseCode = Number(release.versionCode);
    if (!Number.isFinite(installedCode) || !Number.isFinite(releaseCode)) throw new Error('INVALID_APP_VERSION');
    const available = releaseCode > installedCode;
    removeUpdateCheckWarning();
    let decision = null;
    if (available && !preflightOnly) {
      publishAvailableUpdate(release, installed, AppUpdater);
      const dialogDecision = updateDialog(release, installed, AppUpdater);
      if (waitForDecision) decision = await dialogDecision;
    } else if (!available) {
      removeAvailableUpdateNotice();
    }
    return { available, release, installed, decision };
  } catch (cause) {
    console.warn('MEG app update check failed', cause);
    publishUpdateCheckWarning(cause);
    return { available: false, error: cause };
  }
}

async function waitForAuthenticatedUpdateUi() {
  for (let attempt = 0; attempt < UPDATE_RESUME_UI_ATTEMPTS; attempt += 1) {
    if (document.hidden) return false;
    if (!document.querySelector('#androidPrivacyCover')) return true;
    await delay(UPDATE_RESUME_UI_RETRY_MS);
  }
  return false;
}

export async function initializeAndroidUpdateLifecycle() {
  if (updateLifecycleStarted || !await waitForNativeAndroid()) return false;
  updateLifecycleStarted = true;
  const { App } = await import('@capacitor/app');
  await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      if (updateResumeTimer) window.clearTimeout(updateResumeTimer);
      updateResumeTimer = null;
      return;
    }
    if (updateResumeTimer) window.clearTimeout(updateResumeTimer);
    updateResumeTimer = window.setTimeout(async () => {
      updateResumeTimer = null;
      if (!await waitForAuthenticatedUpdateUi()) return;
      await checkForAppUpdate({ force: true });
    }, UPDATE_RESUME_DELAY_MS);
  });
  return true;
}
