import { updateIsAvailable } from './app-update-release-core.js';

const MANIFEST_URLS = [
  'https://github.com/MarcosVilalva/MEG-Platform/releases/download/android-latest/app-version.json',
  'https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json',
  'https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/apps/web/public/downloads/app-version.json',
];
const BRIDGE_TIMEOUT_MS = 3500;
const FETCH_TIMEOUT_MS = 8000;
const RESUME_DELAY_MS = 1200;
const PENDING_UPDATE_STORAGE_KEY = 'meg.pending-app-update.v1';

let appUpdaterPromise = null;
let appPluginPromise = null;
let lifecycleStarted = false;
let updateCheckPromise = null;
let resumeTimer = null;
let automaticUpdateAttemptedVersion = -1;

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
  showInstalledUpdateSuccess(installed);
}

function rememberPendingUpdateSuccess(release) {
  try {
    localStorage.setItem(PENDING_UPDATE_STORAGE_KEY, JSON.stringify({
      versionCode: Number(release?.versionCode || 0),
      versionName: String(release?.versionName || ''),
      storedAt: Date.now(),
    }));
  } catch {}
}

function showInstalledUpdateSuccess(installed) {
  let pending = null;
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_UPDATE_STORAGE_KEY) || 'null');
  } catch {}
  if (!pending || Number(pending.versionCode) <= 0) return;
  if (Date.now() - Number(pending.storedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
    try { localStorage.removeItem(PENDING_UPDATE_STORAGE_KEY); } catch {}
    return;
  }
  if (Number(installed?.versionCode || 0) < Number(pending.versionCode)) return;
  try { localStorage.removeItem(PENDING_UPDATE_STORAGE_KEY); } catch {}

  document.querySelector('#megUpdateSuccessToast')?.remove();
  const toast = document.createElement('section');
  toast.id = 'megUpdateSuccessToast';
  toast.className = 'meg-update-success-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `<span aria-hidden="true">✓</span><div><strong>Atualizado com sucesso!</strong><small>Agora você está usando a versão v${escapeHtml(installed.versionName || pending.versionName)}.</small></div><button type="button" aria-label="Fechar">×</button>`;
  document.body.append(toast);
  const close = () => toast.remove();
  toast.querySelector('button')?.addEventListener('click', close);
  window.setTimeout(close, 6500);
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
  // O release Android é a fonte canônica. Pages/raw são apenas fallback:
  // nunca misturamos manifests de publicações diferentes com o mesmo APK mutável.
  for (const url of MANIFEST_URLS) {
    try {
      const release = await fetchManifestWeb(url);
      if (release && Number.isFinite(Number(release.versionCode))) return release;
    } catch {}
  }

  const AppUpdater = await getAppUpdater();
  if (!AppUpdater) throw new Error('UPDATE_MANIFEST_UNAVAILABLE');
  for (const url of MANIFEST_URLS) {
    try {
      const release = await withDeadline(
        AppUpdater.getReleaseManifest({ url: `${url}?nativeWeb=${Date.now()}-${Math.random().toString(36).slice(2)}` }),
        FETCH_TIMEOUT_MS + 1500,
        'UPDATE_MANIFEST_BRIDGE_TIMEOUT',
      );
      if (release && Number.isFinite(Number(release.versionCode))) return release;
    } catch {}
  }
  throw new Error('UPDATE_MANIFEST_UNAVAILABLE');
}

function removeUpdateUi() {
  document.querySelector('#appUpdateBanner')?.remove();
  document.querySelector('#appUpdateSidebarBadge')?.remove();
  document.querySelector('#appUpdateCheckWarning')?.remove();
  delete window.MEG_AVAILABLE_APP_UPDATE;
  delete document.body.dataset.availableAppVersion;
}

function mountUpdateSurface(element) {
  const topbar = document.querySelector('.px-topbar, .topbar');
  if (topbar) {
    topbar.insertAdjacentElement('afterend', element);
    return;
  }
  const content = document.querySelector('.px-content, main.content');
  if (content) {
    content.prepend(element);
    return;
  }
  document.body.prepend(element);
}

function publishWarning(message) {
  let warning = document.querySelector('#appUpdateCheckWarning');
  if (!warning) {
    warning = document.createElement('section');
    warning.id = 'appUpdateCheckWarning';
    warning.className = 'app-update-check-warning';
    warning.setAttribute('role', 'status');
    mountUpdateSurface(warning);
  }
  warning.innerHTML = `<div><strong>Não foi possível verificar atualizações</strong><span>${escapeHtml(message || 'Confira a internet e tente novamente.')}</span></div><button type="button">Tentar novamente</button>`;
  warning.querySelector('button')?.addEventListener('click', () => checkForAppUpdate({ notifyIfCurrent: true }));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function secureDownloadUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function ensureAutomaticUpdateStatus(release, installed, message) {
  let banner = document.querySelector('#appUpdateBanner');
  if (!banner) {
    banner = document.createElement('section');
    banner.id = 'appUpdateBanner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    document.body.append(banner);
  }
  const mandatory = release?.mandatory === true;
  banner.className = `app-update-banner meg-update-overlay ${mandatory ? 'is-mandatory' : 'is-automatic'}`;
  banner.innerHTML = `
    <div class="meg-update-card" data-update-phase="preparing">
      <div class="meg-update-orbit" aria-hidden="true"><span>↓</span></div>
      <small class="meg-update-kicker">${mandatory ? 'ATUALIZAÇÃO OBRIGATÓRIA' : 'ATUALIZAÇÃO AUTOMÁTICA'}</small>
      <h2>Preparando nova versão</h2>
      <p>O MEG encontrou uma versão mais recente e fará a atualização de forma segura.</p>
      <div class="meg-update-versions">
        <span><small>Versão atual</small><strong>v${escapeHtml(installed?.versionName || '—')}</strong></span>
        <b aria-hidden="true">→</b>
        <span><small>Nova versão</small><strong>v${escapeHtml(release.versionName || release.versionCode)}</strong></span>
      </div>
      <div class="meg-update-progress" aria-label="Progresso da atualização"><span data-auto-update-progress style="width:4%"></span></div>
      <div class="meg-update-progress-copy"><strong data-auto-update-percent>4%</strong><span data-auto-update-status>${escapeHtml(message)}</span></div>
      <div class="meg-update-security"><span>✓ Download verificado</span><span>✓ Integridade SHA-256</span><span>✓ Instalação protegida</span></div>
    </div>`;
  return {
    status: banner.querySelector('[data-auto-update-status]'),
    progress: banner.querySelector('[data-auto-update-progress]'),
    percent: banner.querySelector('[data-auto-update-percent]'),
    card: banner.querySelector('.meg-update-card'),
  };
}

async function startAutomaticUpdate(release, installed, AppUpdater) {
  const releaseCode = Number(release?.versionCode);
  if (!Number.isFinite(releaseCode) || releaseCode <= 0) throw new Error('UPDATE_VERSION_INVALID');
  if (automaticUpdateAttemptedVersion === releaseCode) return { accepted: true, duplicate: true };

  const downloadUrl = secureDownloadUrl(release?.downloadUrl);
  if (!downloadUrl) throw new Error('UPDATE_DOWNLOAD_URL_INVALID');
  if (!String(release?.sha256 || '').trim()) throw new Error('UPDATE_SHA256_MISSING');
  if (!AppUpdater) throw new Error('UPDATE_PLUGIN_UNAVAILABLE');

  automaticUpdateAttemptedVersion = releaseCode;
  rememberPendingUpdateSuccess(release);
  window.MEG_AVAILABLE_APP_UPDATE = { release, installed, source: 'android-auto-update' };
  document.body.dataset.availableAppVersion = String(release.versionName || releaseCode);
  const updateUi = ensureAutomaticUpdateStatus(release, installed, 'Preparando download seguro…');
  const status = updateUi.status;
  const progress = updateUi.progress;
  const percentLabel = updateUi.percent;
  const updateCard = updateUi.card;

  AppUpdater.suppressNativePrompt?.({ versionCode: releaseCode }).catch(() => undefined);

  let stateListener = null;
  if (typeof AppUpdater.addListener === 'function') {
    stateListener = await AppUpdater.addListener('appUpdateState', (event) => {
      if (!status?.isConnected) return;
      if (event?.state === 'waiting-permission') {
        status.textContent = 'Autorize “Permitir desta fonte”. Ao voltar, o MEG continuará sozinho.';
      } else if (event?.state === 'downloading') {
        const percent = Number(event.percent);
        const normalized = Number.isFinite(percent) && percent > 0 ? Math.min(100, Math.round(percent)) : 12;
        status.textContent = 'Baixando a nova versão do MEG…';
        if (progress) progress.style.width = normalized + '%';
        if (percentLabel) percentLabel.textContent = normalized + '%';
        updateCard?.setAttribute('data-update-phase', 'downloading');
      } else if (event?.state === 'validating') {
        status.textContent = 'Validando integridade e assinatura do APK…';
        if (progress) progress.style.width = '96%';
        if (percentLabel) percentLabel.textContent = '96%';
        updateCard?.setAttribute('data-update-phase', 'validating');
      } else if (event?.state === 'installer-launched') {
        status.textContent = 'Atualização pronta. Conclua a instalação na tela do Android.';
        if (progress) progress.style.width = '100%';
        if (percentLabel) percentLabel.textContent = '100%';
        updateCard?.setAttribute('data-update-phase', 'ready');
        Promise.resolve(stateListener?.remove?.()).catch(() => undefined);
      } else if (event?.state === 'failed') {
        status.textContent = 'A atualização automática falhou. Toque em “Verificar atualização” para tentar novamente.';
        updateCard?.setAttribute('data-update-phase', 'failed');
        automaticUpdateAttemptedVersion = -1;
        Promise.resolve(stateListener?.remove?.()).catch(() => undefined);
      }
    });
  }

  try {
    if (typeof AppUpdater.startDownloadAndInstall === 'function') {
      const accepted = await withDeadline(
        AppUpdater.startDownloadAndInstall({ url: downloadUrl, sha256: release.sha256, versionCode: releaseCode }),
        BRIDGE_TIMEOUT_MS * 2,
        'UPDATE_AUTOMATIC_START_TIMEOUT',
      );
      if (status?.isConnected) {
        status.textContent = accepted?.permissionRequired
          ? 'Autorize “Permitir desta fonte”. Ao voltar, o MEG continuará sozinho.'
          : 'Download automático iniciado. Aguarde a validação e o instalador do Android.';
      }
      return { accepted: true, permissionRequired: Boolean(accepted?.permissionRequired) };
    }

    try {
      if (status?.isConnected) status.textContent = 'Baixando e validando a atualização…';
      await withDeadline(
        AppUpdater.downloadAndInstall({ url: downloadUrl, sha256: release.sha256 }),
        140000,
        'UPDATE_DOWNLOAD_TIMEOUT',
      );
      if (status?.isConnected) status.textContent = 'Atualização validada. Confirme a instalação na tela do Android.';
      return { accepted: true, legacyBridge: true };
    } catch (cause) {
      if (!String(cause?.message || cause).includes('INSTALL_PERMISSION_REQUIRED')) throw cause;
      if (status?.isConnected) status.textContent = 'Autorize “Permitir desta fonte”. Ao voltar, o MEG continuará sozinho.';
      await withDeadline(AppUpdater.requestInstallPermission(), BRIDGE_TIMEOUT_MS, 'INSTALL_PERMISSION_REQUEST_TIMEOUT');
      return { accepted: true, permissionRequired: true, legacyBridge: true };
    }
  } catch (cause) {
    automaticUpdateAttemptedVersion = -1;
    Promise.resolve(stateListener?.remove?.()).catch(() => undefined);
    throw cause;
  }
}

function ensureUpdateBanner(release, installed, AppUpdater) {
  window.MEG_AVAILABLE_APP_UPDATE = { release, installed, source: 'android-update-controller' };
  document.body.dataset.availableAppVersion = String(release.versionName || release.versionCode);

  let banner = document.querySelector('#appUpdateBanner');
  if (!banner) {
    banner = document.createElement('section');
    banner.id = 'appUpdateBanner';
    banner.setAttribute('role', 'status');
    mountUpdateSurface(banner);
  }
  banner.className = 'app-update-banner meg-update-banner';
  banner.innerHTML = `<div class="app-update-banner-icon" aria-hidden="true">↻</div><div class="app-update-banner-copy"><small>ATUALIZAÇÃO DISPONÍVEL</small><strong>MEG v${escapeHtml(release.versionName || release.versionCode)}</strong><span>Nova versão pronta para atualizar com segurança.</span></div><button type="button" class="primary-button">Atualizar agora</button>`;
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

  const mandatory = release?.mandatory === true;
  let resolveDecision;
  const decisionPromise = new Promise((resolve) => { resolveDecision = resolve; });
  const dialog = document.createElement('dialog');
  dialog.id = 'appUpdateDialog';
  dialog.className = `modal app-update-dialog meg-update-dialog ${mandatory ? 'is-mandatory' : ''}`;
  dialog._megDecisionPromise = decisionPromise;
  dialog.innerHTML = `
    <div class="meg-update-dialog-visual ${mandatory ? 'danger' : ''}" aria-hidden="true"><span>${mandatory ? '!' : '↻'}</span></div>
    <small class="decision-eyebrow">${mandatory ? 'ATUALIZAÇÃO OBRIGATÓRIA' : 'NOVA ATUALIZAÇÃO DISPONÍVEL'}</small>
    <h2>${mandatory ? 'Atualize para continuar usando o MEG' : 'Uma nova versão do MEG está disponível'}</h2>
    <p>${mandatory ? 'Esta versão precisa ser substituída por segurança e compatibilidade.' : 'A nova versão será baixada, validada e entregue ao instalador do Android.'}</p>
    <div class="meg-update-versions">
      <span><small>Versão atual</small><strong>v${escapeHtml(installed.versionName)}</strong></span>
      <b aria-hidden="true">→</b>
      <span><small>Nova versão</small><strong>v${escapeHtml(release.versionName || release.versionCode)}</strong></span>
    </div>
    <div class="app-update-notes"><strong>Principais melhorias</strong><span>${escapeHtml(release.releaseNotes || 'Melhorias de estabilidade, segurança e experiência.')}</span></div>
    <p class="app-update-status" id="appUpdateStatus">Pronta para iniciar com verificação de integridade.</p>
    <div class="modal-actions">
      ${mandatory ? '' : '<button type="button" class="ghost-button" id="appUpdateLater">Agora não</button>'}
      <button type="button" class="primary-button" id="appUpdateNow">${mandatory ? 'Atualizar e continuar' : 'Atualizar agora'}</button>
    </div>`;
  document.body.append(dialog);
  const status = dialog.querySelector('#appUpdateStatus');
  const later = dialog.querySelector('#appUpdateLater');
  const update = dialog.querySelector('#appUpdateNow');

  later?.addEventListener('click', () => dialog.close('later'));
  dialog.addEventListener('cancel', (event) => {
    if (mandatory) event.preventDefault();
  });
  update.addEventListener('click', async () => {
    update.disabled = true;
    if (later) later.disabled = true;
    status.textContent = 'Preparando download seguro…';
    try {
      if (!AppUpdater) throw new Error('Atualizador nativo indisponível.');
      const result = await startAutomaticUpdate(release, installed, AppUpdater);
      status.textContent = result?.permissionRequired
        ? 'Autorize “Permitir desta fonte”. Ao voltar, o MEG continuará sozinho.'
        : 'Download iniciado. O MEG vai validar o arquivo antes da instalação.';
      window.setTimeout(() => { if (dialog.open) dialog.close('updating'); }, 350);
    } catch (cause) {
      status.textContent = `Não foi possível iniciar a atualização: ${cause?.message || String(cause || 'falha desconhecida')}`;
      update.disabled = false;
      if (later) later.disabled = false;
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

export async function checkForAppUpdate({ notifyIfCurrent = false, automatic = false } = {}) {
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
        if (automatic) {
          try {
            const automaticResult = await startAutomaticUpdate(release, installed, AppUpdater);
            return { available, installed, release, automatic: true, automaticResult };
          } catch (automaticError) {
            console.warn('MEG automatic update start failed', automaticError);
            ensureUpdateBanner(release, installed, AppUpdater);
            showUpdateDialog(release, installed, AppUpdater);
            return { available, installed, release, automatic: false, automaticError };
          }
        }
        ensureUpdateBanner(release, installed, AppUpdater);
        if (notifyIfCurrent) showUpdateDialog(release, installed, AppUpdater);
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
      checkForAppUpdate({ automatic: true }).catch(() => undefined);
    }, RESUME_DELAY_MS);
  });
  window.addEventListener('online', () => {
    window.setTimeout(() => checkForAppUpdate({ automatic: true }).catch(() => undefined), 600);
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
