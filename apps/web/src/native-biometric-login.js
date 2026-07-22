import { Capacitor, registerPlugin } from '@capacitor/core';

const BiometricAuth = registerPlugin('BiometricAuth');

function isNativeAndroid() {
  return Capacitor?.isNativePlatform?.() && Capacitor.getPlatform?.() === 'android';
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
  try {
    const credentials = await BiometricAuth.authenticate({
      title: 'Entrar no MEG Finanças',
      subtitle: 'Confirme sua identidade para acessar sua conta'
    });
    if (!credentials?.email || !credentials?.password) return null;
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
