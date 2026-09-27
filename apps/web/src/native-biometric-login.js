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
      <span class="meg-loading-beam meg-loading-beam-a"></span><span class="meg-loading-beam meg-loading-beam-b"></span>
      <span class="meg-loading-beam meg-loading-beam-c"></span><span class="meg-loading-beam meg-loading-beam-d"></span>
      <span class="meg-loading-spark meg-loading-spark-a"></span><span class="meg-loading-spark meg-loading-spark-b"></span>
      <span class="meg-loading-spark meg-loading-spark-c"></span><span class="meg-loading-spark meg-loading-spark-d"></span>
    </div>
    <section class="meg-loading-layout">
      <header class="meg-loading-brand-stage">
        <div class="meg-loading-brand-lockup" aria-label="MEG Finanças">
          <img class="meg-loading-brand-symbol" src="${new URL((import.meta.env.BASE_URL || '/') + 'brand/meg-loading-lockup.svg', document.baseURI).href}" alt="" aria-hidden="true">
          <div class="meg-loading-wordmark" aria-hidden="true"><b>M</b><b>E</b><b class="accent">G</b></div>
          <div class="meg-loading-financas" aria-hidden="true">FINANÇAS</div>
        </div>
        <p class="meg-loading-tagline">SUAS FINANÇAS<br>EM UM SÓ LUGAR</p>
      </header>
      <section class="meg-loading-scene" aria-hidden="true">
        <svg class="meg-loading-energy-grid" viewBox="0 0 420 250" preserveAspectRatio="none">
          <g class="meg-loading-grid-glow">
            <path d="M0 88 C55 20 125 152 205 78 S350 35 420 94"></path>
            <path d="M0 104 C70 36 120 170 215 94 S345 48 420 108"></path>
            <path d="M0 121 C70 56 135 181 218 111 S350 66 420 124"></path>
            <path d="M0 139 C75 76 145 192 225 129 S355 83 420 141"></path>
            <path d="M0 158 C88 92 150 200 232 147 S360 101 420 158"></path>
            <path d="M10 177 C94 115 160 205 240 165 S355 123 420 176"></path>
            <path d="M34 195 C110 142 170 211 250 184 S350 145 404 194"></path>
          </g>
          <g class="meg-loading-grid-fine">
            <path d="M0 70 C65 5 128 130 208 62 S350 17 420 76"></path>
            <path d="M0 96 C66 28 132 156 213 85 S352 39 420 101"></path>
            <path d="M0 132 C72 66 140 184 223 120 S354 75 420 135"></path>
            <path d="M0 169 C88 102 153 207 238 157 S355 114 420 168"></path>
            <path d="M20 207 C105 153 176 218 257 197 S350 164 410 205"></path>
            <path d="M42 25 L185 225"></path><path d="M108 9 L248 233"></path>
            <path d="M182 6 L307 229"></path><path d="M255 8 L366 214"></path>
            <path d="M331 24 L420 188"></path>
          </g>
          <g class="meg-loading-grid-nodes">
            <circle cx="54" cy="89" r="2.2"></circle><circle cx="96" cy="117" r="1.8"></circle>
            <circle cx="143" cy="90" r="2"></circle><circle cx="186" cy="136" r="2.2"></circle>
            <circle cx="230" cy="106" r="2"></circle><circle cx="279" cy="128" r="1.9"></circle>
            <circle cx="326" cy="94" r="2.2"></circle><circle cx="370" cy="124" r="1.8"></circle>
            <circle cx="78" cy="159" r="1.9"></circle><circle cx="124" cy="177" r="2.2"></circle>
            <circle cx="178" cy="165" r="1.8"></circle><circle cx="244" cy="174" r="2.1"></circle>
            <circle cx="307" cy="158" r="1.9"></circle><circle cx="355" cy="176" r="2.2"></circle>
          </g>
        </svg>
        <div class="meg-loading-tile meg-loading-tile-bars"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V12M9.5 20V8M15 20v-5.5M20.5 20V4"></path></svg></div>
        <div class="meg-loading-tile meg-loading-tile-card"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="M3 9h18M7 15h4"></path></svg></div>
        <div class="meg-loading-tile meg-loading-tile-home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"></path></svg></div>
        <div class="meg-loading-tile meg-loading-tile-pie"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9h-9z"></path><path d="M15 3.6A9 9 0 0 1 20.4 9H15z"></path></svg></div>
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
