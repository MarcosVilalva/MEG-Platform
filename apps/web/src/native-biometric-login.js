import { Capacitor, registerPlugin } from '@capacitor/core';

// Keep the Android bridge deliberately small. This is the same direct native
// approach used by the last known-good biometric flow, without web timeouts,
// retries or a second biometric implementation competing for the prompt.
const BiometricAuth = registerPlugin('BiometricAuth');
let biometricAuthenticationPromise = null;
let biometricUnlockPromise = null;
let biometricPromptOpen = false;
let biometricLifecycleStarted = false;
let backgroundedAt = 0;
const LAST_UNLOCK_KEY = 'meg-biometric-last-unlock-at';
const RECENT_UNLOCK_MS = 10_000;

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

function isNativeAndroid() {
  return isNativeAndroidRuntime();
}

async function waitForApiReadiness() {
  try {
    if (window.MEG_API_READY) await window.MEG_API_READY;
  } catch {}
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

function recordBiometricUnlock() {
  try { sessionStorage.setItem(LAST_UNLOCK_KEY, String(Date.now())); } catch {}
}

function wasRecentlyUnlocked() {
  try {
    return Date.now() - Number(sessionStorage.getItem(LAST_UNLOCK_KEY) || 0) < RECENT_UNLOCK_MS;
  } catch {
    return false;
  }
}

function biometricLockOverlay() {
  let overlay = document.querySelector('#androidBiometricLock');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'androidBiometricLock';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <style>
      #androidBiometricLock{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#052f2a 0%,#0b6559 62%,#39d7bd 140%);font-family:system-ui,sans-serif;color:#102824}
      #androidBiometricLock .meg-lock-card{width:min(390px,100%);box-sizing:border-box;padding:30px 24px;border-radius:28px;background:#f8fffd;box-shadow:0 28px 80px #001c1788;text-align:center}
      #androidBiometricLock .meg-lock-mark{display:grid;place-items:center;width:68px;height:68px;margin:0 auto 18px;border-radius:22px;background:#43dfc4;color:#073b34;font-size:32px;font-weight:900}
      #androidBiometricLock h1{margin:0 0 8px;font-size:27px}#androidBiometricLock p{margin:0 0 20px;color:#57706b;line-height:1.45}
      #androidBiometricLock .meg-lock-actions{display:grid;gap:10px}#androidBiometricLock button{min-height:52px;border:0;border-radius:14px;font:inherit;font-weight:850}
      #androidBiometricLock [data-meg-biometric-retry]{background:#08695c;color:white}#androidBiometricLock [data-meg-biometric-password]{background:#e8f2ef;color:#174c44}
    </style>
    <section class="meg-lock-card">
      <div class="meg-lock-mark" aria-hidden="true">M</div>
      <h1>MEG protegido</h1>
      <p data-meg-biometric-message>Confirme sua identidade para visualizar seus dados financeiros.</p>
      <div class="meg-lock-actions">
        <button type="button" data-meg-biometric-retry>Usar biometria</button>
        <button type="button" data-meg-biometric-password>Entrar com senha</button>
      </div>
    </section>`;
  document.body.appendChild(overlay);
  return overlay;
}

export async function getBiometricLoginStatus() {
  if (!isNativeAndroid()) return { available: false, enabled: false, reason: 'NOT_NATIVE_ANDROID' };
  try {
    return await BiometricAuth.isAvailable();
  } catch (cause) {
    return { available: false, enabled: false, reason: cause?.message || 'PLUGIN_UNAVAILABLE' };
  }
}

export async function saveBiometricLogin({ email, password }) {
  if (!isNativeAndroid() || !email || !password) return { saved: false };
  try {
    return await BiometricAuth.saveCredentials({ email, password });
  } catch (cause) {
    return { saved: false, reason: cause?.message || 'SAVE_FAILED' };
  }
}

export async function requestBiometricLogin() {
  if (!isNativeAndroid()) return null;
  if (biometricAuthenticationPromise) return biometricAuthenticationPromise;
  biometricAuthenticationPromise = (async () => {
    await waitForApiReadiness();
    biometricPromptOpen = true;
    try {
      const credentials = await BiometricAuth.authenticate({
        title: 'Entrar no MEG Finanças',
        subtitle: 'Confirme sua identidade para acessar sua conta',
      });
      if (!credentials?.email || !credentials?.password) return null;
      recordBiometricUnlock();
      beginAuthenticatedLoadingTransition();
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

export async function ensureAndroidBiometricUnlock({ force = false } = {}) {
  if (!isNativeAndroid()) return true;
  if (!force && wasRecentlyUnlocked()) return true;
  if (biometricUnlockPromise) return biometricUnlockPromise;

  const status = await getBiometricLoginStatus();
  if (!status?.available || !status?.enabled) return true;

  biometricUnlockPromise = new Promise((resolve) => {
    const overlay = biometricLockOverlay();
    const message = overlay.querySelector('[data-meg-biometric-message]');
    const retry = overlay.querySelector('[data-meg-biometric-retry]');
    const password = overlay.querySelector('[data-meg-biometric-password]');

    const unlock = async () => {
      retry.disabled = true;
      retry.textContent = 'Aguardando biometria...';
      message.textContent = 'Use sua digital ou o bloqueio de tela do Android.';
      const credentials = await requestBiometricLogin();
      if (credentials) {
        overlay.remove();
        biometricUnlockPromise = null;
        resolve(true);
        return;
      }
      message.textContent = 'A leitura foi cancelada. Seus dados continuam protegidos.';
      retry.disabled = false;
      retry.textContent = 'Tentar novamente';
    };

    retry.addEventListener('click', unlock);
    password.addEventListener('click', async () => {
      message.textContent = 'Encerrando a sessão segura...';
      password.disabled = true;
      try { await window.MEG_CLOUD?.logout?.({ save: false }); }
      finally { location.reload(); }
    });
    window.setTimeout(unlock, 120);
  });

  return biometricUnlockPromise;
}

export async function initializeAndroidBiometricAppLock() {
  if (!isNativeAndroid() || biometricLifecycleStarted) return false;
  biometricLifecycleStarted = true;
  const { App } = await import('@capacitor/app');
  await App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) {
      if (biometricPromptOpen) return;
      const status = await getBiometricLoginStatus();
      if (!status?.available || !status?.enabled) return;
      backgroundedAt = Date.now();
      biometricLockOverlay();
      return;
    }
    if (!backgroundedAt || biometricPromptOpen) return;
    backgroundedAt = 0;
    await ensureAndroidBiometricUnlock({ force: true });
  });
  return true;
}

export async function clearBiometricLogin() {
  if (!isNativeAndroid()) return;
  try {
    await BiometricAuth.clear();
  } catch {}
}
