import { selectNewestRelease, updateIsAvailable } from './app-update-release-core.js';

const MANIFEST_URLS = [
  'https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json',
  'https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/apps/web/public/downloads/app-version.json',
];
const BRIDGE_TIMEOUT_MS = 3500;
const FETCH_TIMEOUT_MS = 8000;
const RESUME_DELAY_MS = 1200;

let appUpdaterPromise = null;
let appPluginPromise = null;
let lifecycleStarted = false;
let updateCheckPromise = null;
let resumeTimer = null;

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function withDeadline(promise, timeoutMs, code) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(code)), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), deadline]).finally(() => window.clearTimeout(timer));
}

function isAndroidRuntime() {
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  if (platform === 'android') return true;
  return Boolean(document.body?.classList?.contains('native-mobile') && /Android/i.test(navigator.userAgent || ''));
}

async function getAppUpdater() {
  if (!isAndroidRuntime()) return null;
  const nativeProxy = window.Capacitor?.Plugins?.AppUpdater;
  if (nativeProxy) return nativeProxy;
  appUpdaterPromise ||= import('@capacitor/core').then(({ registerPlugin }) => registerPlugin('AppUpdater'));
  return appUpdaterPromise;
}

async function getCapacitorApp() {
  if (!isAndroidRuntime()) return null;
  appPluginPromise ||= import('@capacitor/app').then(({ App }) => App);
  return appPluginPromise;
}

function normalizeInstalled(info, source) {
  if (!info) return null;
  const versionName = String(info.versionName || info.version || '').trim();
  const versionCode = Number(info.versionCode ?? info.build);
  if (!versionName || !Number.isFinite(versionCode)) return null;
  return { versionName, versionCode, canInstallPackages: info.canInstallPackages, source };
}

async function installedAppInfo() {
  const errors = [];
  const AppUpdater = await getAppUpdater();
  if (AppUpdater) {
    try {
      const info = await withDeadline(AppUpdater.getInfo(), BRIDGE_TIMEOUT_MS, 'APP_UPDATER_INFO_TIMEOUT');
      const normalized = normalizeInstalled(info, 'AppUpdater');
      if (normalized) return normalized;
      throw new Error('APP_UPDATER_INFO_INVALID');
    } catch (cause) {
      errors.push(cause);
    }
  }

  try {
    const App = await getCapacitorApp();
    if (!App) throw new Error('CAPACITOR_APP_UNAVAILABLE');
    const info = await withDeadline(App.getInfo(), BRIDGE_TIMEOUT_MS, 'CAPACITOR_APP_INFO_TIMEOUT');
    const normalized = normalizeInstalled(info, 'CapacitorApp');
    if (normalized) return normalized;
    throw new Error('CAPACITOR_APP_INFO_INVALID');
  } catch (cause) {
    errors.push(cause);
  }

  throw errors.at(-1) || new Error('INSTALLED_VERSION_UNAVAILABLE');
}

function publishInstalledVersion(installed) {
  window.MEG_INSTALLED_APP_VERSION = installed;
  document.body.dataset.installedAppVersion = installed.versionName;
  const label = document.querySelector('#sidebarVersion');
  if (label) {
    label.textContent = `APK v${installed.versionName}`;
    label.dataset.versionSource = installed.source || 'native';
  }
  window.dispatchEvent(new CustomEvent('meg:installed-app-version', { detail: installed }));
}

function publishVersionUnavailable() {
  const label = document.querySelector('#sidebarVersion');
  if (!label || label.dataset.versionSource === 'native') return;
  label.textContent = 'APK: versão não identificada';
  label.dataset.versionSource = 'unavailable';
}

function ensureManualCheckButton() {
  let button = document.querySelector('#checkAppUpdateBtn');
  if (button) return button;
  const versionStatus = document.querySelector('.sidebar-version-status');
  if (!versionStatus) return null;
  button = document.createElement('button');
  button.id = 'checkAppUpdateBtn';
  button.type = 'button';
  button.className = 'button ghost';
  button.textContent = 'Verificar atualização';
  button.style.marginTop = '8px';
  button.style.width = '100%';
  versionStatus.insertAdjacentElement('afterend', button);
  return button;
}

function setManualButtonState(text, disabled = false) {
  const button = ensureManualCheckButton();
  if (!button) return;
  button.textContent = text;
  button.disabled = disabled;
}

function bindManualCheck() {
  const button = ensureManualCheckButton();
  if (!button || button.dataset.updateCheckBound === 'true') return;
  button.dataset.updateCheckBound = 'true';
  button.addEventListener('click', async () => {
    setManualButtonState('Verificando...', true);
    try {
      await checkForAppUpdate({ notifyIfCurrent: true });
    } finally {
      setManualButtonState('Verificar atualização', false);
    }
  });
}

export async function refreshInstalledAppVersion() {
  if (!isAndroidRuntime()) return null;
  bindManualCheck();
  try {
    const installed = await installedAppInfo();
    publishInstalledVersion(installed);
    return installed;
  } catch (cause) {
    console.warn('MEG installed APK lookup failed', cause);
    publishVersionUnavailable();
    return null;
  }
}

async function fetchManifestWeb(url) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = window.setTimeout(() => controller?.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}?megUpdate=${Date.now()}-${Math.random().toString(36).slice(2)}`, {
      cache: 'no-store',
      signal: controller?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`UPDATE_MANIFEST_HTTP_${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function newestRelease() {
  const webResults = await Promise.allSettled(MANIFEST_URLS.map(fetchManifestWeb));
  const webReleases = webResults.filter((item) => item.status === 'fulfilled').map((item) => item.value);
  let release = selectNewestRelease(webReleases);
  if (release) return release;

  const AppUpdater = await getAppUpdater();
  if (!AppUpdater) throw new Error('UPDATE_MANIFEST_UNAVAILABLE');
  const nativeResults = [];
  for (const url of MANIFEST_URLS) {
    try {
      const item = await withDeadline(
        AppUpdater.getReleaseManifest({ url: `${url}?nativeWeb=${Date.now()}-${Math.random().toString(36).slice(2)}` }),
        FETCH_TIMEOUT_MS + 1500,
        'UPDATE_MANIFEST_BRIDGE_TIMEOUT',
      );
      nativeResults.push(item);
    } catch {}
  }
  release = selectNewestRelease(nativeResults);
  if (!release) throw new Error('UPDATE_MANIFEST_UNAVAILABLE');
  return release;
}

function removeUpdateUi() {
  document.querySelector('#appUpdateBanner')?.remove();
  document.querySelector('#appUpdateSidebarBadge')?.remove();
  document.querySelector('#appUpdateCheckWarning')?.remove();
  delete window.MEG_AVAILABLE_APP_UPDATE;
  delete document.body.dataset.availableAppVersion;
}

function publishWarning(message) {
  let warning = document.querySelector('#appUpdateCheckWarning');
  if (!warning) {
    warning = document.createElement('section');
    warning.id = 'appUpdateCheckWarning';
    warning.className = 'app-update-check-warning';
    warning.setAttribute('role', 'status');
    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.insertAdjacentElement('afterend', warning);
    else document.querySelector('main.content')?.prepend(warning);
  }
  warning.innerHTML = `<div><strong>Não foi possível verificar atualizações</strong><span>${escapeHtml(message || 'Confira a internet e tente novamente.')}</span></div><button type="button">Tentar novamente</button>`;
  warning.querySelector('button')?.addEventListener('click', () => checkForAppUpdate({ notifyIfCurrent: true }));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function ensureUpdateBanner(release, installed, AppUpdater) {
  window.MEG_AVAILABLE_APP_UPDATE = { release, installed, source: 'android-update-controller' };
  document.body.dataset.availableAppVersion = String(release.versionName || release.versionCode);

  let banner = document.querySelector('#appUpdateBanner');
  if (!banner) {
    banner = document.createElement('section');
    banner.id = 'appUpdateBanner';
    banner.className = 'app-update-banner';
    banner.setAttribute('role', 'status');
    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.insertAdjacentElement('afterend', banner);
    else document.querySelector('main.content')?.prepend(banner);
  }
  banner.innerHTML = `<div class="app-update-banner-icon" aria-hidden="true">↻</div><div class="app-update-banner-copy"><small>ATUALIZAÇÃO DISPONÍVEL</small><strong>MEG ${escapeHtml(release.versionName || release.versionCode)}</strong><span>Uma versão mais recente está pronta para instalar.</span></div><button type="button" class="primary-button">Atualizar agora</button>`;
  banner.querySelector('button')?.addEventListener('click', () => showUpdateDialog(release, installed, AppUpdater));

  let badge = document.querySelector('#appUpdateSidebarBadge');
  if (!badge) {
    badge = document.createElement('button');
    badge.id = 'appUpdateSidebarBadge';
    badge.className = 'app-update-sidebar-badge';
    badge.type = 'button';
    document.querySelector('.sidebar-user-copy')?.append(badge);
  }
  badge.textContent = `Atualizar para v${release.versionName || release.versionCode}`;
  badge.onclick = () => showUpdateDialog(release, installed, AppUpdater);
  AppUpdater?.suppressNativePrompt?.({ versionCode: Number(release.versionCode) }).catch(() => undefined);
}

function showUpdateDialog(release, installed, AppUpdater) {
  const existing = document.querySelector('#appUpdateDialog');
  if (existing) {
    if (!existing.open) existing.showModal();
    return existing._megDecisionPromise || Promise.resolve('existing');
  }

  let resolveDecision;
  const decisionPromise = new Promise((resolve) => { resolveDecision = resolve; });
  const dialog = document.createElement('dialog');
  dialog.id = 'appUpdateDialog';
  dialog.className = 'modal app-update-dialog';
  dialog._megDecisionPromise = decisionPromise;
  dialog.innerHTML = `
    <div class="app-update-icon" aria-hidden="true">↻</div>
    <small class="decision-eyebrow">ATUALIZAÇÃO DO APLICATIVO</small>
    <h2>Uma nova versão do MEG está disponível</h2>
    <p>Versão instalada: <strong>${escapeHtml(installed.versionName)}</strong> · nova versão: <strong>${escapeHtml(release.versionName || release.versionCode)}</strong></p>
    <div class="app-update-notes">${escapeHtml(release.releaseNotes || 'Melhorias de estabilidade, segurança e experiência.')}</div>
    <p class="app-update-status" id="appUpdateStatus">A atualização está pronta para iniciar.</p>
    <div class="modal-actions">
      <button type="button" class="ghost-button" id="appUpdateLater">Agora não</button>
      <button type="button" class="primary-button" id="appUpdateNow">Atualizar agora</button>
    </div>`;
  document.body.append(dialog);
  const status = dialog.querySelector('#appUpdateStatus');
  const later = dialog.querySelector('#appUpdateLater');
  const update = dialog.querySelector('#appUpdateNow');

  later.addEventListener('click', () => dialog.close('later'));
  update.addEventListener('click', async () => {
    update.disabled = true;
    later.disabled = true;
    try {
      if (!AppUpdater) throw new Error('Atualizador nativo indisponível.');
      status.textContent = 'Baixando e validando a nova versão...';
      try {
        await withDeadline(
          AppUpdater.downloadAndInstall({ url: release.downloadUrl, sha256: release.sha256 || '' }),
          140000,
          'UPDATE_DOWNLOAD_TIMEOUT',
        );
      } catch (cause) {
        const message = String(cause?.message || cause || '');
        if (!message.includes('INSTALL_PERMISSION_REQUIRED')) throw cause;
        status.textContent = 'Autorize “Permitir desta fonte”. Depois volte ao MEG e toque em “Atualizar agora” novamente.';
        await AppUpdater.requestInstallPermission();
        update.disabled = false;
        later.disabled = false;
        update.textContent = 'Atualizar agora';
        return;
      }
      status.textContent = 'APK validado. Conclua a instalação na tela do Android.';
      window.setTimeout(() => {
        if (dialog.open) dialog.close('installer-launched');
      }, 600);
    } catch (cause) {
      status.textContent = `Não foi possível atualizar: ${cause?.message || String(cause || 'falha desconhecida')}`;
      update.disabled = false;
      later.disabled = false;
      update.textContent = 'Tentar novamente';
    }
  });
  dialog.addEventListener('close', () => {
    resolveDecision?.(dialog.returnValue || 'closed');
    dialog.remove();
  }, { once: true });
  dialog.showModal();
  return decisionPromise;
}

export async function checkForAppUpdate({ notifyIfCurrent = false } = {}) {
  if (!isAndroidRuntime() || navigator.onLine === false) return { available: false };
  bindManualCheck();
  if (updateCheckPromise) return updateCheckPromise;

  updateCheckPromise = (async () => {
    try {
      setManualButtonState('Verificando...', true);
      const [installed, release, AppUpdater] = await Promise.all([
        installedAppInfo(),
        newestRelease(),
        getAppUpdater(),
      ]);
      publishInstalledVersion(installed);
      const available = updateIsAvailable(installed, release);
      document.querySelector('#appUpdateCheckWarning')?.remove();
      if (available) {
        ensureUpdateBanner(release, installed, AppUpdater);
        showUpdateDialog(release, installed, AppUpdater);
      } else {
        removeUpdateUi();
        if (notifyIfCurrent) window.MEG_APP?.showToast?.('MEG atualizado', `Você já está usando a versão ${installed.versionName}.`, 'success');
      }
      return { available, installed, release };
    } catch (cause) {
      console.warn('MEG Android update check failed', cause);
      publishVersionUnavailable();
      publishWarning(cause?.message || 'Confira a internet e tente novamente.');
      return { available: false, error: cause };
    } finally {
      setManualButtonState('Verificar atualização', false);
      updateCheckPromise = null;
    }
  })();
  return updateCheckPromise;
}

export async function markAndroidUpdateUiReady() {
  if (!isAndroidRuntime()) return false;
  try {
    const AppUpdater = await getAppUpdater();
    if (!AppUpdater) return false;
    await withDeadline(AppUpdater.setAuthenticatedUiReady(), BRIDGE_TIMEOUT_MS, 'UPDATE_READY_TIMEOUT');
    document.body.dataset.androidUpdateReady = 'true';
    return true;
  } catch (cause) {
    console.warn('MEG Android update readiness failed', cause);
    return false;
  }
}

export async function initializeAndroidUpdateLifecycle() {
  if (lifecycleStarted || !isAndroidRuntime()) return false;
  lifecycleStarted = true;
  bindManualCheck();
  const App = await getCapacitorApp();
  if (!App) return false;
  await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      if (resumeTimer) window.clearTimeout(resumeTimer);
      resumeTimer = null;
      return;
    }
    if (resumeTimer) window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      resumeTimer = null;
      checkForAppUpdate().catch(() => undefined);
    }, RESUME_DELAY_MS);
  });
  return true;
}

export function initializeAndroidUpdateController() {
  if (!isAndroidRuntime()) return;
  bindManualCheck();
  refreshInstalledAppVersion().catch(() => undefined);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeAndroidUpdateController, { once: true });
  else initializeAndroidUpdateController();
}
