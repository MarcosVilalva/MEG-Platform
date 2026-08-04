let biometricPluginPromise = null;
let biometricAuthenticationPromise = null;
let biometricControlsObserver = null;

const ANDROID_RUNTIME_RETRIES = 8;
const PLUGIN_CALL_RETRIES = 4;
const RETRY_DELAY_MS = 180;

function delay(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function currentRuntime() {
  return typeof window === 'undefined' ? null : window.Capacitor;
}

function currentBodyClassList() {
  return typeof document === 'undefined' ? null : document.body?.classList;
}

function currentUserAgent() {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent;
}

export function isNativeAndroidRuntime({
  capacitor = currentRuntime(),
  bodyClassList = currentBodyClassList(),
  userAgent = currentUserAgent(),
} = {}) {
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  const nativePlatform = capacitor?.isNativePlatform?.();
  if (platform === 'android' && nativePlatform === true) return true;

  const markedNative = Boolean(bodyClassList?.contains?.('native-mobile'));
  const androidDevice = /Android/i.test(String(userAgent || ''));
  return Boolean(platform === 'android' && markedNative && androidDevice);
}

export function biometricControlMode(status) {
  if (!status?.available) return 'hidden';
  return status.enabled ? 'login' : 'setup';
}

function potentiallyNativeAndroid() {
  const capacitor = currentRuntime();
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  if (platform === 'android') return true;
  return Boolean(currentBodyClassList()?.contains?.('native-mobile') && /Android/i.test(currentUserAgent()));
}

async function waitForNativeAndroid() {
  if (!potentiallyNativeAndroid()) return false;
  for (let attempt = 0; attempt < ANDROID_RUNTIME_RETRIES; attempt += 1) {
    if (isNativeAndroidRuntime()) return true;
    await delay(RETRY_DELAY_MS);
  }
  return isNativeAndroidRuntime();
}

async function getBiometricAuth() {
  if (!await waitForNativeAndroid()) return null;
  biometricPluginPromise ||= import('@capacitor/core')
    .then(({ registerPlugin }) => registerPlugin('BiometricAuth'))
    .catch((cause) => {
      biometricPluginPromise = null;
      throw cause;
    });
  return biometricPluginPromise;
}

async function callBiometricPlugin(method, payload) {
  let lastError;
  for (let attempt = 0; attempt < PLUGIN_CALL_RETRIES; attempt += 1) {
    try {
      const BiometricAuth = await getBiometricAuth();
      if (!BiometricAuth?.[method]) throw new Error('PLUGIN_UNAVAILABLE');
      return await BiometricAuth[method](payload);
    } catch (cause) {
      lastError = cause;
      biometricPluginPromise = null;
      if (attempt < PLUGIN_CALL_RETRIES - 1) await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('PLUGIN_UNAVAILABLE');
}

async function waitForApiReadiness() {
  try {
    if (window.MEG_API_READY) await window.MEG_API_READY;
  } catch {}
}

function beginAuthenticatedLoadingTransition() {
  const authShell = document.querySelector('#authShell');
  const loginError = document.querySelector('#loginError');
  if (!authShell) return;

  authShell.style.display = 'none';

  let overlay = document.querySelector('#cloudLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cloudLoadingOverlay';
    overlay.className = 'cloud-loading-overlay';
    overlay.innerHTML = '<div class="cloud-loading-card"><span>M</span><strong></strong><small></small></div>';
    document.body.appendChild(overlay);
  }

  const title = overlay.querySelector('strong');
  const detail = overlay.querySelector('small');
  if (title) title.textContent = 'Biometria reconhecida';
  if (detail) detail.textContent = 'Carregando seus dados financeiros...';
  overlay.classList.remove('hidden');

  let finished = false;
  const restoreLogin = () => {
    if (finished || !authShell.isConnected) return;
    authShell.style.removeProperty('display');
    overlay?.classList.add('hidden');
  };

  const shellObserver = new MutationObserver(() => {
    if (!authShell.isConnected) {
      finished = true;
      shellObserver.disconnect();
      errorObserver?.disconnect();
    }
  });
  shellObserver.observe(document.body, { childList: true, subtree: true });

  const errorObserver = loginError
    ? new MutationObserver(() => {
        if (!loginError.textContent?.trim()) return;
        restoreLogin();
        shellObserver.disconnect();
        errorObserver.disconnect();
      })
    : null;

  errorObserver?.observe(loginError, { childList: true, characterData: true, subtree: true });

  window.setTimeout(() => {
    restoreLogin();
    shellObserver.disconnect();
    errorObserver?.disconnect();
  }, 25000);
}

export async function getBiometricLoginStatus() {
  if (!await waitForNativeAndroid()) {
    return { available: false, enabled: false, reason: 'NOT_NATIVE_ANDROID' };
  }
  try {
    return await callBiometricPlugin('isAvailable');
  } catch {
    return { available: false, enabled: false, reason: 'PLUGIN_UNAVAILABLE' };
  }
}

export async function saveBiometricLogin({ email, password }) {
  if (!await waitForNativeAndroid() || !email || !password) return { saved: false };
  try {
    return await callBiometricPlugin('saveCredentials', { email, password });
  } catch {
    return { saved: false };
  }
}

export async function requestBiometricLogin() {
  if (!await waitForNativeAndroid()) return null;
  if (biometricAuthenticationPromise) return biometricAuthenticationPromise;

  biometricAuthenticationPromise = (async () => {
    await waitForApiReadiness();
    try {
      const credentials = await callBiometricPlugin('authenticate', {
        title: 'Entrar no MEG Finanças',
        subtitle: 'Confirme sua identidade para acessar sua conta',
      });
      if (!credentials?.email || !credentials?.password) return null;
      beginAuthenticatedLoadingTransition();
      return credentials;
    } catch {
      return null;
    }
  })().finally(() => {
    biometricAuthenticationPromise = null;
  });

  return biometricAuthenticationPromise;
}

export async function clearBiometricLogin() {
  if (!await waitForNativeAndroid()) return;
  try {
    await callBiometricPlugin('clear');
  } catch {}
}

function ensureBiometricControlStyles() {
  if (document.querySelector('#megAndroidBiometricStyles')) return;
  const style = document.createElement('style');
  style.id = 'megAndroidBiometricStyles';
  style.textContent = `
    .meg-android-biometric-control { display: grid; gap: 8px; margin-top: 2px; }
    .meg-android-biometric-control[hidden] { display: none !important; }
    .meg-android-biometric-button { width: 100%; justify-content: center; padding: 13px 14px; border: 1px solid #b9d9d2; border-radius: 12px; background: #eff8f5; color: #0b5f54; font: inherit; font-weight: 800; cursor: pointer; }
    .meg-android-biometric-button:disabled { cursor: wait; opacity: .68; }
    .meg-android-biometric-help { margin: 0; color: #55726c; font-size: .78rem; line-height: 1.4; }
  `;
  document.head.appendChild(style);
}

function fillAndSubmitLogin(credentials) {
  const form = document.querySelector('#loginForm');
  if (!form || !credentials) return false;
  const email = form.querySelector('[name="email"]');
  const password = form.querySelector('[name="password"]');
  if (!email || !password) return false;
  email.value = credentials.email;
  password.value = credentials.password;
  form.requestSubmit();
  return true;
}

async function mountAndroidBiometricControl() {
  if (!await waitForNativeAndroid()) return false;
  const form = document.querySelector('#loginForm');
  if (!form || form.dataset.megBiometricControl === 'true') return Boolean(form);
  form.dataset.megBiometricControl = 'true';
  ensureBiometricControlStyles();

  const control = document.createElement('div');
  control.className = 'meg-android-biometric-control';
  control.hidden = true;
  control.innerHTML = '<button class="meg-android-biometric-button" type="button"></button><p class="meg-android-biometric-help"></p>';
  const forgotButton = form.querySelector('#forgotPasswordButton');
  forgotButton?.insertAdjacentElement('beforebegin', control);

  const button = control.querySelector('button');
  const help = control.querySelector('p');
  const status = await getBiometricLoginStatus();
  const mode = biometricControlMode(status);
  if (mode === 'hidden' || !form.isConnected) {
    control.remove();
    return false;
  }

  control.hidden = false;
  if (mode === 'login') {
    button.textContent = 'Entrar com biometria';
    help.textContent = 'Disponível somente neste aplicativo Android.';
    button.addEventListener('click', async () => {
      button.disabled = true;
      help.textContent = 'Aguardando confirmação do Android...';
      const credentials = await requestBiometricLogin();
      if (!credentials) {
        button.disabled = false;
        help.textContent = 'Biometria cancelada ou indisponível. Use e-mail e senha.';
        return;
      }
      fillAndSubmitLogin(credentials);
    });
  } else {
    button.textContent = 'Ativar biometria neste aparelho';
    help.textContent = 'Use e-mail e senha uma vez para vincular a biometria do Android.';
    button.addEventListener('click', () => {
      help.textContent = 'Digite e-mail e senha e toque em Acessar. Depois confirme a ativação no Android.';
      form.querySelector('[name="email"]')?.focus();
    });
  }
  return true;
}

function initializeAndroidBiometricControls() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const tryMount = () => {
    if (!document.querySelector('#loginForm')) return;
    mountAndroidBiometricControl().catch(() => undefined);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount, { once: true });
  else queueMicrotask(tryMount);
  biometricControlsObserver = new MutationObserver(tryMount);
  biometricControlsObserver.observe(document.documentElement, { childList: true, subtree: true });
}

initializeAndroidBiometricControls();
