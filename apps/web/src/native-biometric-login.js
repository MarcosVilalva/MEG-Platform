import { Capacitor, registerPlugin } from '@capacitor/core';

const BiometricAuth = registerPlugin('BiometricAuth');
const CACHED_CREDENTIALS_MS = 8_000;
const BIOMETRIC_BRIDGE_ATTEMPTS = 12;
const BIOMETRIC_BRIDGE_RETRY_MS = 180;

let biometricAuthenticationPromise = null;
let cachedCredentials = null;
let cachedCredentialsAt = 0;
let biometricPromptOpen = false;
let biometricLifecycleStarted = false;
let appWasBackgrounded = false;
let skipNextBiometricRequest = false;

function currentBodyClassList() {
  return typeof document === 'undefined' ? null : document.body?.classList;
}

function currentUserAgent() {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent;
}

export function isNativeAndroidRuntime({
  capacitor = Capacitor,
  bodyClassList = currentBodyClassList(),
  userAgent = currentUserAgent(),
} = {}) {
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  const nativePlatform = capacitor?.isNativePlatform?.();
  if (platform === 'android' && nativePlatform === true) return true;
  return Boolean(
    platform === 'android'
    && bodyClassList?.contains?.('native-mobile')
    && /Android/i.test(String(userAgent || ''))
  );
}

export function biometricControlMode(status) {
  if (!status?.available) return 'hidden';
  return status.enabled ? 'login' : 'setup';
}

export function biometricUnavailableMessage(reason) {
  const messages = {
    '1': 'O sensor biométrico está temporariamente indisponível.',
    '7': 'A biometria foi bloqueada após várias tentativas. Desbloqueie o aparelho e tente novamente.',
    '9': 'A biometria está bloqueada. Use o bloqueio de tela do Android e tente novamente.',
    '11': 'Nenhuma digital ou biometria está cadastrada nas configurações do Android.',
    '12': 'Este aparelho não possui sensor biométrico compatível.',
    '15': 'O Android exige uma atualização de segurança para liberar a biometria.',
    PLUGIN_UNAVAILABLE: 'O componente biométrico não foi carregado. Feche o aplicativo e abra novamente.',
    NOT_NATIVE_ANDROID: 'A biometria está disponível somente no aplicativo Android.',
  };
  return messages[String(reason ?? '').trim()]
    || 'Cadastre uma digital ou biometria e mantenha o bloqueio de tela ativo no Android.';
}

export function isPotentialNativeAndroidRuntime({
  capacitor = Capacitor,
  bodyClassList = currentBodyClassList(),
  userAgent = currentUserAgent(),
  mobileBuild = import.meta.env?.VITE_MOBILE_APP === 'true',
} = {}) {
  // O sinal de compilação é a fonte mais confiável durante o primeiro frame
  // do APK. A ponte Capacitor pode ainda informar "web" e alguns WebViews
  // alteram o user agent antes de os plugins nativos terminarem de registrar.
  if (mobileBuild) return true;
  if (isNativeAndroidRuntime({ capacitor, bodyClassList, userAgent })) return true;
  const platform = capacitor?.getPlatform?.() || capacitor?.platform || '';
  return Boolean(
    (platform === 'android' || bodyClassList?.contains?.('native-mobile'))
    && /Android/i.test(String(userAgent || ''))
  );
}

function isNativeAndroid() {
  return isNativeAndroidRuntime();
}

function delay(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function beginAuthenticatedLoadingTransition() {
  const authShell = document.querySelector('#authShell');
  if (!authShell) return;
  authShell.style.display = 'none';
  let overlay = document.querySelector('#cloudLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cloudLoadingOverlay';
    overlay.className = 'cloud-loading-overlay';
    overlay.innerHTML = '<div class="cloud-loading-card"><span>M</span><strong>Biometria reconhecida</strong><small>Carregando seus dados financeiros...</small></div>';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
}

function cacheCredentials(credentials) {
  cachedCredentials = credentials;
  cachedCredentialsAt = Date.now();
}

function consumeCachedCredentials() {
  if (!cachedCredentials || Date.now() - cachedCredentialsAt > CACHED_CREDENTIALS_MS) {
    cachedCredentials = null;
    cachedCredentialsAt = 0;
    return null;
  }
  const credentials = cachedCredentials;
  cachedCredentials = null;
  cachedCredentialsAt = 0;
  return credentials;
}

export function consumePreparedAndroidBiometricCredentials() {
  return consumeCachedCredentials();
}

function privacyCover() {
  if (typeof document === 'undefined') return null;
  let cover = document.querySelector('#androidPrivacyCover');
  if (cover) return cover;
  cover = document.createElement('div');
  cover.id = 'androidPrivacyCover';
  cover.setAttribute('aria-hidden', 'true');
  cover.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#063f37;color:#fff;font:800 22px system-ui,sans-serif;';
  cover.innerHTML = '<span>MEG Finanças protegido</span>';
  document.body.appendChild(cover);
  return cover;
}

async function authenticateNatively() {
  if (!isPotentialNativeAndroidRuntime()) return null;
  if (biometricAuthenticationPromise) return biometricAuthenticationPromise;
  biometricAuthenticationPromise = (async () => {
    biometricPromptOpen = true;
    try {
      const credentials = await BiometricAuth.authenticate({
        title: 'Entrar no MEG Finanças',
        subtitle: 'Confirme sua identidade para acessar sua conta',
      });
      if (!credentials?.email || !credentials?.password) return null;
      return credentials;
    } catch {
      return null;
    } finally {
      biometricPromptOpen = false;
    }
  })().finally(() => {
    biometricAuthenticationPromise = null;
  });
  return biometricAuthenticationPromise;
}

export async function getBiometricLoginStatus() {
  if (!isPotentialNativeAndroidRuntime()) {
    return { available: false, enabled: false, reason: 'NOT_NATIVE_ANDROID' };
  }
  let lastCause = null;
  for (let attempt = 1; attempt <= BIOMETRIC_BRIDGE_ATTEMPTS; attempt += 1) {
    try {
      const status = await BiometricAuth.isAvailable();
      if (status && typeof status.available === 'boolean') {
        document.body?.classList?.add('native-mobile');
        document.body.dataset.nativeRuntime = 'android-biometric-plugin';
        console.info('[MEG biometric] status recebido', {
          available: Boolean(status.available),
          enabled: Boolean(status.enabled),
          attempt,
        });
        return status;
      }
      lastCause = new Error('BIOMETRIC_STATUS_INVALID');
    } catch (cause) {
      lastCause = cause;
    }
    if (attempt < BIOMETRIC_BRIDGE_ATTEMPTS) await delay(BIOMETRIC_BRIDGE_RETRY_MS);
  }
  const reason = lastCause?.message || 'PLUGIN_UNAVAILABLE';
  console.warn('[MEG biometric] plugin indisponível', { reason });
  return { available: false, enabled: false, reason };
}

export async function saveBiometricLogin({ email, password }) {
  if (!isPotentialNativeAndroidRuntime() || !email || !password) return { saved: false };
  try {
    return await BiometricAuth.saveCredentials({ email, password });
  } catch (cause) {
    return { saved: false, reason: cause?.message || 'SAVE_FAILED' };
  }
}

export async function requestBiometricLogin() {
  if (!isPotentialNativeAndroidRuntime()) return null;
  if (skipNextBiometricRequest) {
    skipNextBiometricRequest = false;
    return null;
  }
  const cached = consumeCachedCredentials();
  if (cached) {
    beginAuthenticatedLoadingTransition();
    return cached;
  }
  const credentials = await authenticateNatively();
  if (credentials) beginAuthenticatedLoadingTransition();
  return credentials;
}

// Runs before cloud/session bootstrap. When biometric credentials already
// exist, the Android system prompt is the first security screen displayed.
export async function prepareAndroidBiometricStartup() {
  if (!isPotentialNativeAndroidRuntime()) {
    return { native: false, required: false, authenticated: false, reason: 'NOT_NATIVE_ANDROID' };
  }
  const status = await getBiometricLoginStatus();
  window.MEG_BIOMETRIC_STARTUP = {
    native: true,
    available: Boolean(status?.available),
    enabled: Boolean(status?.enabled),
    reason: status?.reason || null,
  };
  if (!status?.available || !status?.enabled) {
    return {
      native: true,
      required: false,
      authenticated: false,
      available: Boolean(status?.available),
      enabled: Boolean(status?.enabled),
      reason: status?.reason || (status?.enabled ? 'BIOMETRIC_UNAVAILABLE' : 'CREDENTIALS_NOT_STORED'),
    };
  }
  const credentials = await authenticateNatively();
  if (!credentials) {
    skipNextBiometricRequest = true;
    return { native: true, required: true, authenticated: false, available: true, enabled: true };
  }
  cacheCredentials(credentials);
  return { native: true, required: true, authenticated: true, available: true, enabled: true };
}

// On Android resume, protect the visible financial data and ask Android
// directly. No web dialog competes with the operating-system prompt.
export async function initializeAndroidBiometricLifecycle({ onAuthenticationFailed } = {}) {
  if (!isPotentialNativeAndroidRuntime() || biometricLifecycleStarted) return false;
  biometricLifecycleStarted = true;
  const { App } = await import('@capacitor/app');
  await App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) {
      if (biometricPromptOpen) return;
      const status = await getBiometricLoginStatus();
      if (!status?.available || !status?.enabled) return;
      appWasBackgrounded = true;
      privacyCover();
      return;
    }
    if (!appWasBackgrounded || biometricPromptOpen) return;
    appWasBackgrounded = false;
    const credentials = await authenticateNatively();
    if (credentials) {
      document.querySelector('#androidPrivacyCover')?.remove();
      return;
    }
    await onAuthenticationFailed?.();
  });
  return true;
}

export async function clearBiometricLogin() {
  cachedCredentials = null;
  cachedCredentialsAt = 0;
  if (!isPotentialNativeAndroidRuntime()) return;
  try {
    await BiometricAuth.clear();
  } catch {}
}
