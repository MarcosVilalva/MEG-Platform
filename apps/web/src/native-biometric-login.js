import { Capacitor, registerPlugin } from '@capacitor/core';

// Keep the Android bridge deliberately small. This is the same direct native
// approach used by the last known-good biometric flow, without web timeouts,
// retries or a second biometric implementation competing for the prompt.
const BiometricAuth = registerPlugin('BiometricAuth');
let biometricAuthenticationPromise = null;

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
    try {
      const credentials = await BiometricAuth.authenticate({
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
  if (!isNativeAndroid()) return;
  try {
    await BiometricAuth.clear();
  } catch {}
}
