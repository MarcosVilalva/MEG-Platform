import assert from 'node:assert/strict';
import {
  biometricControlMode,
  biometricUnavailableMessage,
  isNativeAndroidRuntime,
} from './native-biometric-login.js';

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

console.log('native Android biometric login tests passed');
