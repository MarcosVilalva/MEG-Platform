import { Capacitor, registerPlugin } from '@capacitor/core';

const BiometricAuth = registerPlugin('BiometricAuth');
const CACHED_CREDENTIALS_MS = 30_000;
const BIOMETRIC_BRIDGE_ATTEMPTS = 8;
const BIOMETRIC_BRIDGE_RETRY_MS = 180;
const BIOMETRIC_BRIDGE_CALL_TIMEOUT_MS = 900;

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

function bridgeCallWithTimeout(promise, milliseconds = BIOMETRIC_BRIDGE_CALL_TIMEOUT_MS) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(new Error('BIOMETRIC_BRIDGE_TIMEOUT')), milliseconds);
    }),
  ]).finally(() => {
    if (timer !== null) globalThis.clearTimeout(timer);
  });
}

function beginAuthenticatedLoadingTransition() {
  if (typeof document === 'undefined') return;
  const authRoot = document.querySelector('.px-preview-auth');
  if (authRoot instanceof HTMLElement) {
    authRoot.style.visibility = 'hidden';
    authRoot.style.pointerEvents = 'none';
  }

  let overlay = document.querySelector('#nativeBiometricLoadingOverlay');
  if (overlay) return;

  overlay = document.createElement('main');
  overlay.id = 'nativeBiometricLoadingOverlay';
  overlay.className = 'meg-loading-screen';
  overlay.dataset.megLoading = 'validated-cleanroom';
  overlay.dataset.megLoadingReference = 'approved-neon-built';
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-busy', 'true');
  overlay.setAttribute('aria-label', 'Carregando sua experiência. 22% concluído.');
  overlay.innerHTML = `
    <div class="meg-loading-atmosphere" aria-hidden="true">
      <span class="beam beam-a"></span><span class="beam beam-b"></span>
      <span class="beam beam-c"></span><span class="beam beam-d"></span>
      <span class="spark spark-a"></span><span class="spark spark-b"></span>
      <span class="spark spark-c"></span><span class="spark spark-d"></span>
    </div>
    <section class="meg-loading-layout">
      <header class="meg-loading-brand-stage">
        <img class="meg-loading-brand" src="${new URL((import.meta.env.BASE_URL || '/') + 'brand/meg-loading-lockup.svg', document.baseURI).href}" alt="MEG Finanças">
        <p class="meg-loading-tagline">SUAS FINANÇAS<br>EM UM SÓ LUGAR</p>
      </header>
      <section class="meg-loading-scene" aria-hidden="true">
        <div class="meg-loading-wave wave-back"></div><div class="meg-loading-wave wave-front"></div>
        <div class="meg-loading-tile tile-bars"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V12M9.5 20V8M15 20v-5.5M20.5 20V4"/></svg></div>
        <div class="meg-loading-tile tile-card"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M7 15h4"/></svg></div>
        <div class="meg-loading-tile tile-home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/></svg></div>
        <div class="meg-loading-tile tile-pie"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.6A9 9 0 0 1 20.4 9H15z"/></svg></div>
      </section>
      <section class="meg-loading-progress-shell" aria-label="Progresso do carregamento">
        <div class="meg-loading-track" aria-hidden="true"><span style="width:22%"></span></div>
        <div class="meg-loading-progress-copy"><span>Carregando sua experiência...</span><strong>22%</strong></div>
      </section>
      <footer class="meg-loading-features" aria-label="Benefícios do MEG Finanças">
        <div class="meg-loading-feature"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-7 11h5l-1 9 8-12h-5z"/></svg></span><p><b>MAIS</b><strong>CONTROLE</strong></p></div>
        <div class="meg-loading-feature"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V12M9.5 20V8M15 20v-5.5M20.5 20V4"/></svg></span><p><b>MAIS</b><strong>ORGANIZAÇÃO</strong></p></div>
        <div class="meg-loading-feature"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.6 2.7 8.1 7 10 4.3-1.9 7-5.4 7-10V6z"/><path d="m9.2 12 1.8 1.8 3.8-4"/></svg></span><p><b>MAIS</b><strong>TRANQUILIDADE</strong></p></div>
        <div class="meg-loading-feature"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M9 15h6M12 13v6M8 21h8M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4"/></svg></span><p><b>MAIS</b><strong>RESULTADOS</strong></p></div>
      </footer>
    </section>`;
  document.body.appendChild(overlay);
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
  cover.innerHTML = '<span>MEG Finance System protegido</span>';
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
        title: 'Entrar no MEG Finance System',
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
      const status = await bridgeCallWithTimeout(BiometricAuth.isAvailable());
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
  beginAuthenticatedLoadingTransition();
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
