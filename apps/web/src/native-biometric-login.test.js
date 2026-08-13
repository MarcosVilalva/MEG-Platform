import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { biometricControlMode, biometricUnavailableMessage, isNativeAndroidRuntime } from './native-biometric-login.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.resolve(here, relativePath), 'utf8').replace(/\r\n/g, '\n');
const nativePlugin = read('../../../android/app/src/main/java/br/com/megfinancas/app/BiometricAuthPlugin.java');
const mainActivity = read('../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java');
const nativeUpdate = read('./native-app-update.js');
const biometricSettings = read('./native-biometric-settings.js');
const biometricLogin = read('./native-biometric-login.js');
const legacyEntry = read('./legacy-entry.js');

const classList = (...values) => ({ contains: (value) => values.includes(value) });
const nativeRuntime = (platform, native = true) => ({ getPlatform: () => platform, isNativePlatform: () => native });

assert.equal(isNativeAndroidRuntime({ capacitor: nativeRuntime('android'), bodyClassList: classList('native-mobile'), userAgent: 'Android' }), true);
assert.equal(isNativeAndroidRuntime({ capacitor: nativeRuntime('ios'), bodyClassList: classList('native-mobile'), userAgent: 'iPhone' }), false);
assert.equal(isNativeAndroidRuntime({ capacitor: null, bodyClassList: classList(), userAgent: 'Mozilla/5.0 (Linux; Android 16)' }), false);
assert.equal(isNativeAndroidRuntime({ capacitor: nativeRuntime('android', false), bodyClassList: classList('native-mobile'), userAgent: 'Mozilla/5.0 (Linux; Android 16)' }), true);

assert.equal(biometricControlMode({ available: false, enabled: false }), 'hidden');
assert.equal(biometricControlMode({ available: true, enabled: false }), 'setup');
assert.equal(biometricControlMode({ available: true, enabled: true }), 'login');
assert.match(biometricUnavailableMessage('11'), /Nenhuma digital/);
assert.match(biometricUnavailableMessage('PLUGIN_UNAVAILABLE'), /componente biométrico/);

assert.match(nativePlugin, /PREFS_NAME\s*=\s*"meg_biometric_login"/);
assert.match(nativePlugin, /EncryptedSharedPreferences\.create\(/);
assert.match(nativePlugin, /BIOMETRIC_STRONG/);
assert.match(nativePlugin, /DEVICE_CREDENTIAL/);
assert.match(nativePlugin, /public void isAvailable\(PluginCall call\)/);
assert.match(nativePlugin, /public void authenticate\(PluginCall call\)/);
assert.match(nativePlugin, /public void saveCredentials\(PluginCall call\)/);
assert.match(nativePlugin, /\.commit\(\)/);
const saveCredentialsBlock = nativePlugin.slice(
  nativePlugin.indexOf('public void saveCredentials'),
  nativePlugin.indexOf('public void authenticate')
);
assert.equal(saveCredentialsBlock.includes('authenticateAndRun'), false, 'ativar biometria não deve abrir um segundo prompt depois do login');
assert.match(mainActivity, /registerPlugin\(BiometricAuthPlugin\.class\)/);

assert.match(nativeUpdate, /import\('\.\/native-biometric-settings\.js'\)/);
assert.match(nativeUpdate, /initializeAuthenticatedBiometricSettings\(\)/);
assert.match(nativeUpdate, /MEG_INSTALLED_APP_VERSION/);
assert.match(nativeUpdate, /window\.setTimeout\(installAutomatically, 0\)/);
assert.match(nativeUpdate, /await waitForInstallPermission\(AppUpdater\)/);
assert.match(nativeUpdate, /await AppUpdater\.downloadAndInstall/);
assert.equal(nativeUpdate.includes('appUpdateLater'), false, 'a atualização Android deve iniciar automaticamente');
assert.match(biometricSettings, /#logoutBtn/);
assert.match(biometricSettings, /\/auth\/login/);
assert.match(biometricSettings, /saveBiometricLogin\(\{ email, password \}\)/);

assert.match(biometricLogin, /registerPlugin\('BiometricAuth'\)/);
assert.match(biometricLogin, /BiometricAuth\.isAvailable\(\)/);
assert.match(biometricLogin, /BiometricAuth\.authenticate\(/);
assert.match(biometricLogin, /BiometricAuth\.saveCredentials\(/);
assert.match(biometricLogin, /prepareAndroidBiometricStartup/);
assert.match(biometricLogin, /initializeAndroidBiometricLifecycle/);
assert.match(biometricLogin, /appStateChange/);
assert.match(biometricLogin, /privacyCover/);
assert.equal(biometricLogin.includes('androidBiometricLock'), false);
assert.equal(biometricLogin.includes('waitForApiReadiness'), false);
assert.equal(biometricLogin.includes('withBiometricTimeout'), false);
assert.equal(biometricLogin.includes('@capgo/capacitor-native-biometric'), false);
assert.match(biometricLogin, /NOT_NATIVE_ANDROID/);
assert.match(legacyEntry, /await prepareAndroidBiometricStartup\(\)/);
assert.match(legacyEntry, /await bootstrapCloud\(\)/);
assert.match(legacyEntry, /await warmCloudApi\(\)/);
assert.ok(
  legacyEntry.indexOf('await warmCloudApi()') < legacyEntry.indexOf('await prepareAndroidBiometricStartup()'),
  'a biometria Android deve ser solicitada antes de validar a sessão e carregar os dados'
);
assert.match(nativeUpdate, /window\.MEG_API_READY = Promise\.all\(\[/);
assert.match(nativeUpdate, /apiReadyBeforeUpdate,\s*startupGate/);

const androidWorkflow = read('../../../.github/workflows/build-android-apk.yml');
assert.match(androidWorkflow, /releases\/download\/android-latest\/MEG-Financas\.apk\?v=' \+ process\.env\.MEG_VERSION_CODE/);
assert.equal(androidWorkflow.includes('VERSIONED_APK'), false, 'a publicação não deve duplicar o APK versionado');
assert.match(androidWorkflow, /gh release upload android-latest MEG-Financas\.apk --clobber/);
assert.match(androidWorkflow, /test ! -d apps\/web\/dist\/downloads/);

console.log('native Android biometric login tests passed');
