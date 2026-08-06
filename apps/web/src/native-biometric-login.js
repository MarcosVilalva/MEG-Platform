let capacitorCorePromise = null;
let importedCapacitor = null;
let biometricPluginPromise = null;
let biometricAuthenticationPromise = null;
let biometricControlsObserver = null;
let biometricMountTimer = null;
let biometricMountAttempts = 0;

const ANDROID_RUNTIME_RETRIES = 24;
const STATUS_CALL_RETRIES = 4;
const RETRY_DELAY_MS = 250;
const CONTROL_MOUNT_RETRIES = 30;
const BIOMETRIC_STATUS_TIMEOUT_MS = 8000;
const BIOMETRIC_PROMPT_TIMEOUT_MS = 45000;

function delay(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function withBiometricTimeout(promise, milliseconds, code) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(new Error(code)), milliseconds);
    }),
  ]).finally(() => globalThis.clearTimeout(timer));
}

function currentRuntime() {
  if (typeof window === 'undefined') return importedCapacitor;
  return window.Capacitor || importedCapacitor;
}

function currentBodyClassList() {
  return typeof document === 'undefined' ? null : document.body?.classList;
}

function currentUserAgent() {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent;
}

function hasAndroidRuntimeHint() {
  const runtime = currentRuntime();
  const platform = runtime?.getPlatform?.() || runtime?.platform || '';
  return Boolean(
    platform === 'android'
    || currentBodyClassList()?.contains?.('native-mobile')
    || /Android/i.test(currentUserAgent())
  );
}

async function getCapacitorCore() {
  capacitorCorePromise ||= import('@capacitor/core')
    .then((module) => {
      importedCapacitor = module.Capacitor;
      return module;
    })
    .catch((cause) => {
      capacitorCorePromise = null;
      throw cause;
    });
  return capacitorCorePromise;
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

export function biometricUnavailableMessage(reason) {
  const normalized = String(reason ?? '').trim();
  const messages = {
    '1': 'O sensor biométrico está temporariamente indisponível. Reinicie o aparelho e tente novamente.',
    '7': 'A biometria foi bloqueada após várias tentativas. Desbloqueie o aparelho e tente novamente.',
    '9': 'A biometria está bloqueada. Use o bloqueio de tela do Android e tente novamente.',
    '11': 'Nenhuma digital ou biometria está cadastrada nas configurações do Android.',
    '12': 'Este aparelho não possui sensor biométrico compatível.',
    '15': 'O Android exige uma atualização de segurança para liberar a biometria.',
    '-2': 'A configuração biométrica deste aparelho não é compatível com a versão instalada.',
    BIOMETRIC_HW_UNAVAILABLE: 'O sensor biométrico está temporariamente indisponível. Reinicie o aparelho e tente novamente.',
    BIOMETRIC_LOCKOUT: 'A biometria foi bloqueada após várias tentativas. Desbloqueie o aparelho e tente novamente.',
    BIOMETRIC_LOCKOUT_PERMANENT: 'A biometria está bloqueada. Use o bloqueio de tela do Android e tente novamente.',
    BIOMETRIC_NONE_ENROLLED: 'Nenhuma digital ou biometria está cadastrada nas configurações do Android.',
    BIOMETRIC_NO_HARDWARE: 'Este aparelho não possui sensor biométrico compatível.',
    BIOMETRIC_SECURITY_UPDATE_REQUIRED: 'O Android exige uma atualização de segurança para liberar a biometria.',
    BIOMETRIC_UNSUPPORTED: 'A configuração biométrica deste aparelho não é compatível com a versão instalada.',
    SECURE_STORAGE_UNAVAILABLE: 'O armazenamento seguro do Android não está disponível. Reinicie o aparelho e tente novamente.',
    PLUGIN_UNAVAILABLE: 'O componente biométrico não foi carregado. Feche o aplicativo e abra novamente.',
    NOT_NATIVE_ANDROID: 'A biometria está disponível somente no aplicativo Android.',
  };
  return messages[normalized] || 'Cadastre uma digital ou biometria e mantenha o bloqueio de tela ativo no Android.';
}

async function waitForNativeAndroid() {
  if (!hasAndroidRuntimeHint()) return false;
  try {
    await getCapacitorCore();
  } catch {}

  for (let attempt = 0; attempt < ANDROID_RUNTIME_RETRIES; attempt += 1) {
    if (isNativeAndroidRuntime()) return true;
    await delay(RETRY_DELAY_MS);
  }
  return isNativeAndroidRuntime();
}

async function getBiometricAuth() {
  if (!await waitForNativeAndroid()) return null;
  biometricPluginPromise ||= getCapacitorCore()
    .then(({ registerPlugin }) => registerPlugin('BiometricAuth'))
    .catch((cause) => {
      biometricPluginPromise = null;
      throw cause;
    });
  return biometricPluginPromise;
}

async function callBiometricPlugin(method, payload, { retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const BiometricAuth = await getBiometricAuth();
      if (!BiometricAuth?.[method]) throw new Error('PLUGIN_UNAVAILABLE');
      const timeout = method === 'ping' || method === 'isAvailable'
        ? BIOMETRIC_STATUS_TIMEOUT_MS
        : BIOMETRIC_PROMPT_TIMEOUT_MS;
      return await withBiometricTimeout(
        BiometricAuth[method](payload || {}),
        timeout,
        `BIOMETRIC_${String(method).toUpperCase()}_TIMEOUT`,
      );
    } catch (cause) {
      lastError = cause;
      biometricPluginPromise = null;
      if (attempt < retries - 1) await delay(RETRY_DELAY_MS * (attempt + 1));
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
    const bridge = await callBiometricPlugin('ping', {}, { retries: 2 });
    if (!bridge?.native || bridge?.platform !== 'android') throw new Error('PLUGIN_BRIDGE_INVALID');
    const status = await callBiometricPlugin('isAvailable', {}, { retries: STATUS_CALL_RETRIES });
    document.body?.classList.add('native-mobile');
    document.body.dataset.nativeRuntime = 'android-biometric-plugin';
    window.MEG_NATIVE_ANDROID_CONFIRMED = true;
    window.MEG_BIOMETRIC_STATUS = {
      ...status,
      native: true,
      platform: 'android',
      pluginVersion: bridge.pluginVersion,
    };
    return window.MEG_BIOMETRIC_STATUS;
  } catch (cause) {
    const status = {
      available: false,
      enabled: false,
      reason: cause?.message || 'PLUGIN_UNAVAILABLE',
    };
    window.MEG_BIOMETRIC_STATUS = status;
    return status;
  }
}

export async function saveBiometricLogin({ email, password }) {
  if (!await waitForNativeAndroid()) return { saved: false, reason: 'NOT_NATIVE_ANDROID' };
  if (!email || !password) return { saved: false, reason: 'CREDENTIALS_INCOMPLETE' };
  try {
    return await callBiometricPlugin('saveCredentials', { email, password }, { retries: 2 });
  } catch (cause) {
    return { saved: false, reason: cause?.message || 'SAVE_FAILED' };
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
      }, { retries: 2 });
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
    .meg-android-biometric-button:disabled { cursor: default; opacity: .72; }
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
  if (forgotButton) forgotButton.insertAdjacentElement('beforebegin', control);
  else form.appendChild(control);

  const button = control.querySelector('button');
  const help = control.querySelector('p');
  const status = await getBiometricLoginStatus();
  const mode = biometricControlMode(status);
  if (!form.isConnected) return false;

  control.hidden = false;
  if (mode === 'hidden') {
    button.textContent = 'Biometria indisponível';
    button.disabled = true;
    help.textContent = biometricUnavailableMessage(status?.reason);
    return true;
  }

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

function stopBiometricMounting() {
  biometricControlsObserver?.disconnect();
  biometricControlsObserver = null;
  if (biometricMountTimer) globalThis.clearTimeout(biometricMountTimer);
  biometricMountTimer = null;
}

function initializeAndroidBiometricControls() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const tryMount = async () => {
    if (document.querySelector('#loginForm')?.dataset.megBiometricControl === 'true') {
      stopBiometricMounting();
      return;
    }

    biometricMountAttempts += 1;
    const mounted = document.querySelector('#loginForm')
      ? await mountAndroidBiometricControl().catch(() => false)
      : false;

    if (mounted) {
      stopBiometricMounting();
      return;
    }

    if (biometricMountAttempts < CONTROL_MOUNT_RETRIES) {
      biometricMountTimer = globalThis.setTimeout(tryMount, 500);
    } else {
      stopBiometricMounting();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryMount, { once: true });
  else queueMicrotask(tryMount);

  biometricControlsObserver = new MutationObserver(() => {
    if (document.querySelector('#loginForm')) tryMount();
  });
  biometricControlsObserver.observe(document.documentElement, { childList: true, subtree: true });
}

initializeAndroidBiometricControls();
