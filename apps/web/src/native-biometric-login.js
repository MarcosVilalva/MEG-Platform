import { Capacitor, registerPlugin } from '@capacitor/core';

const BiometricAuth = registerPlugin('BiometricAuth');

function isNativeAndroid() {
  return Capacitor?.isNativePlatform?.() && Capacitor.getPlatform?.() === 'android';
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
  if (!isNativeAndroid()) return { available: false, enabled: false, reason: 'NOT_NATIVE_ANDROID' };
  try {
    return await BiometricAuth.isAvailable();
  } catch {
    return { available: false, enabled: false, reason: 'PLUGIN_UNAVAILABLE' };
  }
}

export async function saveBiometricLogin({ email, password }) {
  if (!isNativeAndroid() || !email || !password) return { saved: false };
  try {
    return await BiometricAuth.saveCredentials({ email, password });
  } catch {
    return { saved: false };
  }
}

export async function requestBiometricLogin() {
  if (!isNativeAndroid()) return null;
  await waitForApiReadiness();
  try {
    const credentials = await BiometricAuth.authenticate({
      title: 'Entrar no MEG Finanças',
      subtitle: 'Confirme sua identidade para acessar sua conta'
    });
    if (!credentials?.email || !credentials?.password) return null;
    beginAuthenticatedLoadingTransition();
    return credentials;
  } catch {
    return null;
  }
}

export async function clearBiometricLogin() {
  if (!isNativeAndroid()) return;
  try {
    await BiometricAuth.clear();
  } catch {}
}
