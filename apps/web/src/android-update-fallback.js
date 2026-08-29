import {
  checkForAppUpdate,
  initializeAndroidUpdateController,
  initializeAndroidUpdateLifecycle,
  markAndroidUpdateUiReady,
} from './android-update-controller.js';

const START_DELAY_MS = 1800;
const UI_WAIT_ATTEMPTS = 80;
const UI_WAIT_MS = 250;
let started = false;

function isAndroid() {
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  if (platform === 'android') return true;
  return Boolean(document.body?.classList?.contains('native-mobile') && /Android/i.test(navigator.userAgent || ''));
}

async function waitUntilOpeningDialogsFinish() {
  for (let attempt = 0; attempt < UI_WAIT_ATTEMPTS; attempt += 1) {
    if (document.hidden) return false;
    const hasShell = Boolean(document.querySelector('.topbar, .sidebar-user-footer, main.content'));
    const privacyBlocked = Boolean(document.querySelector('#androidPrivacyCover'));
    const blockingDialog = [...document.querySelectorAll('dialog[open]')]
      .some((dialog) => dialog.id !== 'appUpdateDialog');
    if (hasShell && !privacyBlocked && !blockingDialog) return true;
    await new Promise((resolve) => window.setTimeout(resolve, UI_WAIT_MS));
  }
  return false;
}

export async function runAndroidUpdateFallbackCheck() {
  if (!isAndroid() || navigator.onLine === false) return { available: false };
  if (!await waitUntilOpeningDialogsFinish()) return { available: false };
  await markAndroidUpdateUiReady().catch(() => false);
  await initializeAndroidUpdateLifecycle().catch(() => false);
  return checkForAppUpdate();
}

function initialize() {
  if (started || !isAndroid()) return;
  started = true;
  initializeAndroidUpdateController();
  window.setTimeout(() => runAndroidUpdateFallbackCheck().catch(() => undefined), START_DELAY_MS);
  window.addEventListener('online', () => runAndroidUpdateFallbackCheck().catch(() => undefined));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) window.setTimeout(() => runAndroidUpdateFallbackCheck().catch(() => undefined), 900);
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}
