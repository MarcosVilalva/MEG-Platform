import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  biometricControlMode,
  biometricUnavailableMessage,
  isNativeAndroidRuntime,
} from './native-biometric-login.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.resolve(here, relativePath), 'utf8');
const nativePlugin = read('../../../android/app/src/main/java/br/com/megfinancas/app/BiometricAuthPlugin.java');
const nativeUpdate = read('./native-app-update.js');
const biometricSettings = read('./native-biometric-settings.js');

const classList = (...values) => ({ contains: (value) => values.includes(value) });
const nativeRuntime = (platform, native = true) => ({
  getPlatform: () => platform,
  isNativePlatform: () => native,
});

assert.equal(isNativeAndroidRuntime({
  capacitor: nativeRuntime('android'),
  bodyClassList: classList('native-mobile'),
  userAgent: 'Android',
}), true);

assert.equal(isNativeAndroidRuntime({
  capacitor: nativeRuntime('ios'),
  bodyClassList: classList('native-mobile'),
  userAgent: 'iPhone',
}), false);

assert.equal(isNativeAndroidRuntime({
  capacitor: null,
  bodyClassList: classList(),
  userAgent: 'Mozilla/5.0 (Linux; Android 16)',
}), false);

assert.equal(isNativeAndroidRuntime({
  capacitor: nativeRuntime('android', false),
  bodyClassList: classList('native-mobile'),
  userAgent: 'Mozilla/5.0 (Linux; Android 16)',
}), true);

assert.equal(isNativeAndroidRuntime({
  capacitor: nativeRuntime('android', false),
  bodyClassList: classList(),
  userAgent: 'Mozilla/5.0 (Linux; Android 16)',
}), false);

assert.equal(biometricControlMode({ available: false, enabled: false }), 'hidden');
assert.equal(biometricControlMode({ available: true, enabled: false }), 'setup');
assert.equal(biometricControlMode({ available: true, enabled: true }), 'login');
assert.match(biometricUnavailableMessage('11'), /Nenhuma digital/);
assert.match(biometricUnavailableMessage('PLUGIN_UNAVAILABLE'), /componente biométrico/);

assert.match(nativePlugin, /LEGACY_PREFS_NAME\s*=\s*"meg_biometric_login"/);
assert.match(nativePlugin, /SECURE_PREFS_NAME\s*=\s*"meg_biometric_login_secure_v2"/);
assert.match(nativePlugin, /migrateLegacyCredentials\(securePreferences\)/);
assert.match(nativePlugin, /EncryptedSharedPreferences\.create\(\s*getContext\(\),\s*SECURE_PREFS_NAME,/);
assert.equal(
  nativePlugin.includes('EncryptedSharedPreferences.create(\n            getContext(),\n            LEGACY_PREFS_NAME,'),
  false,
  'o arquivo legado não pode ser aberto como armazenamento criptografado',
);
assert.match(nativePlugin, /response\.put\("storageVersion", 2\)/);

assert.match(nativeUpdate, /import\('\.\/native-biometric-settings\.js'\)/);
assert.match(nativeUpdate, /initializeAuthenticatedBiometricSettings\(\)/);
assert.match(biometricSettings, /#logoutBtn/);
assert.match(biometricSettings, /\/auth\/login/);
assert.match(biometricSettings, /saveBiometricLogin\(\{ email, password \}\)/);
assert.match(biometricSettings, /Biometria ativa — testar/);

console.log('native Android biometric login tests passed');
