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

  const asset = (path) => {
    try {
      return new URL(path.replace(/^\/+/, ''), document.baseURI).href;
    } catch {
      return path;
    }
  };

  overlay = document.createElement('main');
  overlay.id = 'nativeBiometricLoadingOverlay';
  overlay.className = 'px-preview-fullscreen-boot px-preview-native-biometric-boot';
  overlay.dataset.bootFidelity = 'approved-v4';
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-busy', 'true');
  overlay.innerHTML = `
    <section class="px-preview-boot-card" aria-label="Biometria reconhecida. Preparando o MEG Finanças">
      <div class="px-preview-boot-brand">
        <div class="px-preview-boot-logo">
          <span class="px-preview-boot-halo" aria-hidden="true"></span>
          <span class="px-preview-boot-orbit" aria-hidden="true"></span>
          <span class="px-preview-boot-orbit is-secondary" aria-hidden="true"></span>
          <img src="${asset('brand/meg-finance-system-mark.svg')}" alt="MEG">
          <strong class="px-preview-boot-percent">22%</strong>
        </div>
        <div class="px-preview-boot-trust">
          <svg class="px-preview-boot-cloud-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 18.5h11.2a4.4 4.4 0 0 0 .6-8.8A6.7 6.7 0 0 0 5.4 8.2 4.9 4.9 0 0 0 6.4 18.5Z"></path></svg>
          <span>MEG CLOUD</span><i aria-hidden="true"></i><span>Sessão protegida</span>
        </div>
      </div>
      <div class="px-preview-boot-copy">
        <span class="px-preview-boot-stage-label"><i aria-hidden="true"></i>Validando sua sessão</span>
        <h1>Validando seu acesso</h1>
        <p>Confirmando sua sessão segura no MEG.</p>
      </div>
      <div class="px-preview-boot-progress" aria-label="22% preparado">
        <div class="px-preview-boot-track"><span style="width:22%"></span></div>
        <div class="px-preview-boot-progress-meta"><span>Preparando seu ambiente</span><strong>22%</strong></div>
      </div>
      <div class="px-preview-boot-steps">
        <div class="px-preview-boot-step active"><i>1</i><span>Validando sua sessão</span></div>
        <div class="px-preview-boot-step"><i>2</i><span>Carregando preferências</span></div>
        <div class="px-preview-boot-step"><i>3</i><span>Organizando painel</span></div>
        <div class="px-preview-boot-step"><i>4</i><span>Tudo pronto</span></div>
      </div>
      <div class="px-preview-boot-foot">
        <svg class="px-preview-boot-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>
        <i aria-hidden="true"></i><span>Conexão protegida · preparando os dados antes da navegação</span>
      </div>
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
