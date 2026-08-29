import { registerPlugin } from '@capacitor/core';
import { selectNewestRelease, updateIsAvailable } from './app-update-release-core.js';

const MANIFEST_URLS = [
  'https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json',
  'https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/apps/web/public/downloads/app-version.json',
];
const START_DELAY_MS = 2500;
const FETCH_TIMEOUT_MS = 8000;
const UI_WAIT_ATTEMPTS = 60;
const UI_WAIT_MS = 500;
let checkRunning = false;
let lifecycleBound = false;

function isAndroid() {
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  if (platform !== 'android') return false;
  return capacitor?.isNativePlatform?.() !== false;
}

async function fetchManifest(url) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = window.setTimeout(() => controller?.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}?fallback=${Date.now()}-${Math.random().toString(36).slice(2)}`, {
      cache: 'no-store',
      signal: controller?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function newestManifest() {
  const results = await Promise.allSettled(MANIFEST_URLS.map(fetchManifest));
  const releases = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  const release = selectNewestRelease(releases);
  if (!release) throw new Error('UPDATE_MANIFEST_UNAVAILABLE');
  return release;
}

async function waitForAuthenticatedUi() {
  for (let attempt = 0; attempt < UI_WAIT_ATTEMPTS; attempt += 1) {
    if (document.hidden) return false;
    const hasAppShell = Boolean(document.querySelector('.topbar, .sidebar-user-footer, main.content'));
    const privacyBlocked = Boolean(document.querySelector('#androidPrivacyCover'));
    if (hasAppShell && !privacyBlocked) return true;
    await new Promise((resolve) => window.setTimeout(resolve, UI_WAIT_MS));
  }
  return false;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function ensureStyles() {
  if (document.querySelector('#megAndroidUpdateFallbackStyles')) return;
  const style = document.createElement('style');
  style.id = 'megAndroidUpdateFallbackStyles';
  style.textContent = `
    .meg-update-fallback{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:12px 18px;padding:14px 16px;border:1px solid rgba(59,130,246,.25);border-radius:16px;background:var(--panel,#fff);box-shadow:0 10px 28px rgba(15,23,42,.08);z-index:30}
    .meg-update-fallback strong{display:block}.meg-update-fallback small{display:block;margin-top:3px;color:var(--muted,#64748b)}
    .meg-update-fallback button{white-space:nowrap}
    @media(max-width:720px){.meg-update-fallback{margin:10px 12px;align-items:flex-start;flex-direction:column}.meg-update-fallback button{width:100%}}
  `;
  document.head.appendChild(style);
}

async function installRelease(release, installed, AppUpdater) {
  let dialog = document.querySelector('#appUpdateDialog');
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.id = 'appUpdateDialog';
  dialog.className = 'modal app-update-dialog';
  dialog.innerHTML = `
    <div class="app-update-icon" aria-hidden="true">↻</div>
    <small class="decision-eyebrow">ATUALIZAÇÃO DO APLICATIVO</small>
    <h2>Uma nova versão do MEG está disponível</h2>
    <p>Versão instalada: <strong>${escapeHtml(installed.versionName)}</strong> · nova versão: <strong>${escapeHtml(release.versionName || release.versionCode)}</strong></p>
    <div class="app-update-notes">${escapeHtml(release.releaseNotes || 'Melhorias de segurança, estabilidade e experiência.')}</div>
    <p class="app-update-status" id="megFallbackUpdateStatus">Preparando a atualização segura…</p>
    <div class="modal-actions"><button type="button" class="ghost-button" data-close-update>Entrar sem atualizar</button><button type="button" class="primary-button" data-retry-update hidden>Tentar novamente</button></div>`;
  document.body.appendChild(dialog);
  const status = dialog.querySelector('#megFallbackUpdateStatus');
  const retry = dialog.querySelector('[data-retry-update]');
  const close = dialog.querySelector('[data-close-update]');

  const run = async () => {
    retry.hidden = true;
    close.hidden = true;
    try {
      const info = await AppUpdater.getInfo();
      if (!info.canInstallPackages) {
        status.textContent = 'Autorize “Permitir desta fonte”. Ao voltar, o MEG continuará a atualização.';
        await AppUpdater.requestInstallPermission();
        close.hidden = false;
        retry.hidden = false;
        return;
      }
      status.textContent = 'Baixando e validando a nova versão…';
      await AppUpdater.downloadAndInstall({ url: release.downloadUrl, sha256: release.sha256 || '' });
      status.textContent = 'Atualização pronta. Conclua a instalação na tela segura do Android.';
      dialog.close();
    } catch (cause) {
      status.textContent = `Não foi possível atualizar: ${cause?.message || String(cause || 'falha desconhecida')}`;
      retry.hidden = false;
      close.hidden = false;
    }
  };

  close.addEventListener('click', () => dialog.close());
  retry.addEventListener('click', run);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
  window.setTimeout(run, 0);
}

function publishFallbackNotice(release, installed, AppUpdater) {
  if (window.MEG_AVAILABLE_APP_UPDATE || document.querySelector('#appUpdateBanner')) return;
  ensureStyles();
  let banner = document.querySelector('#megAndroidUpdateFallback');
  if (!banner) {
    banner = document.createElement('section');
    banner.id = 'megAndroidUpdateFallback';
    banner.className = 'meg-update-fallback';
    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.insertAdjacentElement('afterend', banner);
    else document.querySelector('main.content')?.prepend(banner);
  }
  banner.innerHTML = `<div><strong>Atualização ${escapeHtml(release.versionName || release.versionCode)} disponível</strong><small>O MEG encontrou uma versão mais recente pela verificação redundante.</small></div><button type="button" class="primary-button">Atualizar agora</button>`;
  banner.querySelector('button')?.addEventListener('click', () => installRelease(release, installed, AppUpdater));
  document.body.dataset.availableAppVersion = String(release.versionName || release.versionCode);
  window.MEG_AVAILABLE_APP_UPDATE = { release, installed, source: 'redundant-manifest-check' };
  window.dispatchEvent(new CustomEvent('meg:app-update-available', { detail: { release, installed, source: 'redundant-manifest-check' } }));
  window.setTimeout(() => installRelease(release, installed, AppUpdater), 0);
}

export async function runAndroidUpdateFallbackCheck() {
  if (!isAndroid() || checkRunning || navigator.onLine === false) return { available: false };
  checkRunning = true;
  try {
    if (!await waitForAuthenticatedUi()) return { available: false };
    const AppUpdater = registerPlugin('AppUpdater');
    const [installed, release] = await Promise.all([AppUpdater.getInfo(), newestManifest()]);
    const available = updateIsAvailable(installed, release);
    if (available) publishFallbackNotice(release, installed, AppUpdater);
    return { available, release, installed };
  } catch (cause) {
    console.warn('MEG redundant update check failed', cause);
    return { available: false, error: cause };
  } finally {
    checkRunning = false;
  }
}

function initialize() {
  if (lifecycleBound || !isAndroid()) return;
  lifecycleBound = true;
  window.setTimeout(() => runAndroidUpdateFallbackCheck().catch(() => undefined), START_DELAY_MS);
  window.addEventListener('online', () => runAndroidUpdateFallbackCheck().catch(() => undefined));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) window.setTimeout(() => runAndroidUpdateFallbackCheck().catch(() => undefined), 1200);
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}
