import { embeddedAndroidVersion } from './embedded-apk-version.js';
import './meg-dark-surface-guard.css';

const MANIFEST_URLS = [
  'https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json',
  'https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/apps/web/public/downloads/app-version.json',
];
const BUTTON_ID = 'checkAppUpdateBtn';
const FEEDBACK_ID = 'appUpdateCurrentFeedback';
const FETCH_TIMEOUT_MS = 6500;
const BRIDGE_TIMEOUT_MS = 5000;
const UPDATE_CHECK_TIMEOUT_MS = 16000;
const INSTALL_TIMEOUT_MS = 140000;
const FEEDBACK_DURATION_MS = 5000;

let appUpdaterPromise = null;
let checkPromise = null;
let feedbackTimer = null;
let initialized = false;

function isAndroidRuntime() {
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  if (platform === 'android') return true;
  return Boolean(document.body?.classList?.contains('native-mobile') && /Android/i.test(navigator.userAgent || ''));
}

function withDeadline(promise, timeoutMs, code) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(code)), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => window.clearTimeout(timer));
}

async function getAppUpdater() {
  if (!isAndroidRuntime()) return null;
  appUpdaterPromise ||= import('@capacitor/core').then(({ registerPlugin }) => registerPlugin('AppUpdater'));
  return withDeadline(appUpdaterPromise, BRIDGE_TIMEOUT_MS, 'UPDATE_PLUGIN_TIMEOUT');
}

function normalizeRelease(value) {
  const versionCode = Number(value?.versionCode);
  if (!Number.isFinite(versionCode) || versionCode <= 0) return null;
  return {
    ...value,
    versionCode,
    versionName: String(value?.versionName || versionCode),
    downloadUrl: String(value?.downloadUrl || ''),
    sha256: String(value?.sha256 || ''),
    releaseNotes: String(value?.releaseNotes || 'Melhorias de estabilidade e experiência no MEG.'),
  };
}

function selectNewestRelease(values) {
  return values
    .map(normalizeRelease)
    .filter(Boolean)
    .sort((left, right) => right.versionCode - left.versionCode)[0] || null;
}

async function fetchManifestWeb(url, index) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = window.setTimeout(() => controller?.abort(), FETCH_TIMEOUT_MS);
  try {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}megUpdate=${Date.now()}-${index}`, {
      cache: 'no-store',
      signal: controller?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`UPDATE_MANIFEST_HTTP_${response.status}`);
    const release = normalizeRelease(await response.json());
    if (!release) throw new Error('UPDATE_MANIFEST_INVALID');
    return release;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchManifestNative(url, index) {
  const AppUpdater = await getAppUpdater();
  if (!AppUpdater) throw new Error('UPDATE_PLUGIN_UNAVAILABLE');
  const separator = url.includes('?') ? '&' : '?';
  const payload = await withDeadline(
    AppUpdater.getReleaseManifest({ url: `${url}${separator}nativeHardening=${Date.now()}-${index}` }),
    BRIDGE_TIMEOUT_MS,
    'UPDATE_MANIFEST_BRIDGE_TIMEOUT',
  );
  const release = normalizeRelease(payload);
  if (!release) throw new Error('UPDATE_MANIFEST_INVALID');
  return release;
}

async function newestRelease() {
  const webResults = await Promise.allSettled(MANIFEST_URLS.map(fetchManifestWeb));
  const webCandidates = webResults
    .filter((item) => item.status === 'fulfilled')
    .map((item) => item.value);
  const newestWeb = selectNewestRelease(webCandidates);
  if (newestWeb) return newestWeb;

  const nativeResults = await Promise.allSettled(MANIFEST_URLS.map(fetchManifestNative));
  const nativeCandidates = nativeResults
    .filter((item) => item.status === 'fulfilled')
    .map((item) => item.value);
  const newestNative = selectNewestRelease(nativeCandidates);
  if (newestNative) return newestNative;
  throw new Error('UPDATE_MANIFEST_UNAVAILABLE');
}

async function installedVersion() {
  const known = window.MEG_INSTALLED_APP_VERSION;
  const knownCode = Number(known?.versionCode);
  if (known?.versionName && Number.isFinite(knownCode) && knownCode > 0) {
    return { ...known, versionCode: knownCode };
  }

  const embedded = embeddedAndroidVersion();
  if (embedded) return embedded;

  const AppUpdater = await getAppUpdater();
  if (!AppUpdater) throw new Error('INSTALLED_VERSION_UNAVAILABLE');
  const info = await withDeadline(AppUpdater.getInfo(), BRIDGE_TIMEOUT_MS, 'UPDATE_INFO_TIMEOUT');
  const versionCode = Number(info?.versionCode);
  if (!info?.versionName || !Number.isFinite(versionCode)) throw new Error('INSTALLED_VERSION_INVALID');
  return { ...info, versionCode };
}

function ensureManualButton() {
  let button = document.getElementById(BUTTON_ID);
  if (button) return button;
  const versionStatus = document.querySelector('.sidebar-version-status');
  if (!versionStatus) return null;
  button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.className = 'button ghost meg-update-check-button';
  button.textContent = 'Verificar atualização';
  versionStatus.insertAdjacentElement('afterend', button);
  return button;
}

function setButtonState(text, disabled = false) {
  const button = ensureManualButton();
  if (!button) return;
  button.textContent = text;
  button.disabled = disabled;
}

function clearFeedback() {
  document.getElementById(FEEDBACK_ID)?.remove();
  if (feedbackTimer) window.clearTimeout(feedbackTimer);
  feedbackTimer = null;
}

function showFeedback(kind, message, { temporaryButtonText = null } = {}) {
  clearFeedback();
  const button = ensureManualButton();
  if (!button) return;
  const feedback = document.createElement('div');
  feedback.id = FEEDBACK_ID;
  feedback.className = `meg-update-feedback ${kind}`;
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  feedback.textContent = message;
  button.insertAdjacentElement('afterend', feedback);
  if (temporaryButtonText) button.textContent = temporaryButtonText;
  feedbackTimer = window.setTimeout(() => {
    feedback.remove();
    if (!button.disabled) button.textContent = 'Verificar atualização';
    feedbackTimer = null;
  }, FEEDBACK_DURATION_MS);
}

function cleanDownloadUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function showUpdateDialog(release, installed) {
  window.MEG_AVAILABLE_APP_UPDATE = { release, installed, source: 'android-update-hardening' };
  document.body.dataset.availableAppVersion = release.versionName;

  const existing = document.getElementById('appUpdateDialog');
  if (existing) {
    if (!existing.open) existing.showModal?.();
    return existing._megDecisionPromise || Promise.resolve('existing');
  }

  let resolveDecision;
  const decisionPromise = new Promise((resolve) => { resolveDecision = resolve; });
  const dialog = document.createElement('dialog');
  dialog.id = 'appUpdateDialog';
  dialog.className = 'modal app-update-dialog meg-update-dialog-hardened';
  dialog._megDecisionPromise = decisionPromise;
  dialog.innerHTML = `
    <div class="app-update-icon" aria-hidden="true">↻</div>
    <small class="decision-eyebrow">ATUALIZAÇÃO DO APLICATIVO</small>
    <h2>Uma nova versão do MEG está disponível</h2>
    <p>Versão instalada: <strong>${escapeHtml(installed.versionName)}</strong><br>Nova versão: <strong>${escapeHtml(release.versionName)}</strong></p>
    <div class="app-update-notes">${escapeHtml(release.releaseNotes)}</div>
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
      const AppUpdater = await getAppUpdater();
      if (!AppUpdater) throw new Error('Atualizador nativo indisponível.');
      const downloadUrl = cleanDownloadUrl(release.downloadUrl);
      if (!downloadUrl) throw new Error('Endereço do APK inválido.');
      status.textContent = 'Baixando e validando a atualização...';
      try {
        await withDeadline(
          AppUpdater.downloadAndInstall({ url: downloadUrl, sha256: release.sha256 }),
          INSTALL_TIMEOUT_MS,
          'UPDATE_DOWNLOAD_TIMEOUT',
        );
      } catch (cause) {
        if (!String(cause?.message || cause).includes('INSTALL_PERMISSION_REQUIRED')) throw cause;
        status.textContent = 'Autorize “Permitir desta fonte”. Depois volte e toque em “Atualizar agora” novamente.';
        await withDeadline(AppUpdater.requestInstallPermission(), BRIDGE_TIMEOUT_MS, 'INSTALL_PERMISSION_REQUEST_TIMEOUT');
        update.disabled = false;
        later.disabled = false;
        return;
      }
      status.textContent = 'APK validado. Conclua a instalação na tela do Android.';
      window.setTimeout(() => dialog.open && dialog.close('installer-launched'), 700);
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

async function performCheck({ manual = false } = {}) {
  if (!isAndroidRuntime()) return { available: false, skipped: true };
  if (navigator.onLine === false) throw new Error('OFFLINE');

  const [installed, release] = await Promise.all([installedVersion(), newestRelease()]);
  const available = Number(release.versionCode) > Number(installed.versionCode);
  document.getElementById('appUpdateCheckWarning')?.remove();

  if (available) {
    showUpdateDialog(release, installed);
    if (manual) showFeedback('success', `Atualização ${release.versionName} encontrada.`, { temporaryButtonText: 'Atualização encontrada' });
  } else {
    delete window.MEG_AVAILABLE_APP_UPDATE;
    delete document.body.dataset.availableAppVersion;
    if (manual) {
      showFeedback(
        'success',
        `Você já está usando a versão mais recente do MEG, APK v${installed.versionName}.`,
        { temporaryButtonText: 'Última versão instalada' },
      );
    }
  }
  return { available, installed, release };
}

export async function checkForAppUpdateHardened({ manual = false } = {}) {
  if (checkPromise) return checkPromise;
  if (manual) {
    clearFeedback();
    setButtonState('Verificando...', true);
  }

  checkPromise = withDeadline(performCheck({ manual }), UPDATE_CHECK_TIMEOUT_MS, 'UPDATE_CHECK_TIMEOUT')
    .catch((cause) => {
      console.warn('MEG hardened update check failed', cause);
      if (manual) {
        const message = String(cause?.message || cause).includes('OFFLINE')
          ? 'Sem conexão com a internet. Conecte-se e tente novamente.'
          : 'Não foi possível verificar atualizações agora. Tente novamente.';
        showFeedback('error', message);
      }
      return { available: false, error: cause };
    })
    .finally(() => {
      if (manual) {
        const button = ensureManualButton();
        if (button) {
          button.disabled = false;
          if (!document.getElementById(FEEDBACK_ID)) button.textContent = 'Verificar atualização';
        }
      }
      checkPromise = null;
    });
  return checkPromise;
}

function handleManualCheck(event) {
  const button = event.target?.closest?.(`#${BUTTON_ID}`);
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  checkForAppUpdateHardened({ manual: true }).catch(() => undefined);
}

export function initializeHardenedAndroidUpdate() {
  if (initialized || !isAndroidRuntime()) return false;
  initialized = true;
  ensureManualButton();
  document.addEventListener('click', handleManualCheck, true);
  window.addEventListener('meg:installed-app-version', ensureManualButton);
  return true;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHardenedAndroidUpdate, { once: true });
  } else {
    initializeHardenedAndroidUpdate();
  }
}
