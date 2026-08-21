import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { biometricControlMode, biometricUnavailableMessage, isNativeAndroidRuntime, isPotentialNativeAndroidRuntime } from './native-biometric-login.js';

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
assert.equal(
  isPotentialNativeAndroidRuntime({ capacitor: nativeRuntime('web', false), bodyClassList: classList('native-mobile'), userAgent: 'Mozilla/5.0 (Linux; Android 16)' }),
  true,
  'o APK deve consultar o plugin mesmo enquanto a ponte Capacitor ainda informa plataforma web'
);
assert.equal(
  isPotentialNativeAndroidRuntime({ capacitor: nativeRuntime('web', false), bodyClassList: classList(), userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }),
  false,
  'o navegador comum não deve tentar abrir biometria nativa'
);

assert.equal(biometricControlMode({ available: false, enabled: false }), 'hidden');
assert.equal(biometricControlMode({ available: true, enabled: false }), 'setup');
assert.equal(biometricControlMode({ available: true, enabled: true }), 'login');
assert.match(biometricUnavailableMessage('11'), /Nenhuma digital/);
assert.match(biometricUnavailableMessage('PLUGIN_UNAVAILABLE'), /componente biométrico/);

assert.match(nativePlugin, /PREFS_NAME\s*=\s*"meg_biometric_login"/);
assert.match(nativePlugin, /EncryptedSharedPreferences\.create\(/);
assert.match(
  nativePlugin,
  /return BiometricManager\.Authenticators\.BIOMETRIC_WEAK\s*\|\s*BiometricManager\.Authenticators\.DEVICE_CREDENTIAL/,
  'a biometria Android deve aceitar sensores BIOMETRIC_WEAK e a credencial do aparelho'
);
assert.doesNotMatch(nativePlugin, /return BiometricManager\.Authenticators\.BIOMETRIC_STRONG/);
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
assert.match(biometricLogin, /BIOMETRIC_BRIDGE_ATTEMPTS\s*=\s*12/);
assert.match(biometricLogin, /await delay\(BIOMETRIC_BRIDGE_RETRY_MS\)/);
assert.match(biometricLogin, /BiometricAuth\.authenticate\(/);
assert.match(biometricLogin, /BiometricAuth\.saveCredentials\(/);
assert.match(biometricLogin, /prepareAndroidBiometricStartup/);
const authenticateNativeBlock = biometricLogin.slice(
  biometricLogin.indexOf('async function authenticateNatively'),
  biometricLogin.indexOf('export async function getBiometricLoginStatus')
);
assert.match(authenticateNativeBlock, /isPotentialNativeAndroidRuntime\(\)/);
assert.equal(authenticateNativeBlock.includes('if (!isNativeAndroid())'), false);
const startupBiometricBlock = biometricLogin.slice(
  biometricLogin.indexOf('export async function prepareAndroidBiometricStartup'),
  biometricLogin.indexOf('export async function initializeAndroidBiometricLifecycle')
);
assert.match(startupBiometricBlock, /isPotentialNativeAndroidRuntime\(\)/);
assert.match(startupBiometricBlock, /native:\s*true/);
assert.equal(startupBiometricBlock.includes('if (!isNativeAndroid())'), false);
assert.match(biometricLogin, /initializeAndroidBiometricLifecycle/);
assert.match(biometricLogin, /appStateChange/);
assert.match(biometricLogin, /privacyCover/);
assert.equal(biometricLogin.includes('androidBiometricLock'), false);
assert.equal(biometricLogin.includes('waitForApiReadiness'), false);
assert.equal(biometricLogin.includes('withBiometricTimeout'), false);
assert.equal(biometricLogin.includes('@capgo/capacitor-native-biometric'), false);
assert.match(biometricLogin, /NOT_NATIVE_ANDROID/);
assert.match(legacyEntry, /await prepareAndroidBiometricStartup\(\)/);
assert.match(legacyEntry, /if \(biometricStartup\.native\) clearLocalCloudSession\(\)/);
assert.equal(
  legacyEntry.includes('biometricStartup.native && !biometricStartup.authenticated'),
  false,
  'uma biometria aprovada também deve invalidar a sessão WebView anterior'
);
assert.equal(legacyEntry.includes('biometricStartup.required && !biometricStartup.authenticated'), false);
assert.match(legacyEntry, /await bootstrapCloud\(\)/);
assert.match(legacyEntry, /await warmCloudApi\(\)/);
assert.match(legacyEntry, /preflightOnly:\s*true/);
assert.equal(legacyEntry.includes("startupUpdate?.decision === 'installer-launched'"), false);
assert.doesNotMatch(legacyEntry, /waitForStartupAppUpdate/);
assert.ok(
  legacyEntry.indexOf('await warmCloudApi()') < legacyEntry.indexOf('startupUpdate = await checkForAppUpdate')
    && legacyEntry.indexOf('startupUpdate = await checkForAppUpdate') < legacyEntry.indexOf('await prepareAndroidBiometricStartup()')
    && legacyEntry.indexOf('await prepareAndroidBiometricStartup()') < legacyEntry.indexOf('clearLocalCloudSession()')
    && legacyEntry.indexOf('clearLocalCloudSession()') < legacyEntry.indexOf('await bootstrapCloud()')
    && legacyEntry.indexOf('await prepareAndroidBiometricStartup()') < legacyEntry.indexOf('await bootstrapCloud()')
    && legacyEntry.indexOf('await bootstrapCloud()') < legacyEntry.indexOf("await import('./legacy-app.js')")
    && legacyEntry.indexOf("await import('./legacy-app.js')") < legacyEntry.lastIndexOf('checkForAppUpdate({ force: true })'),
  'servidor e atualização devem preceder biometria, base e interface; retentativa permanece em segundo plano'
);
assert.ok(
  legacyEntry.indexOf('await bootstrapCloud()') < legacyEntry.indexOf('if (!validationMode && startupUpdate?.available)'),
  'o instalador só pode ser oferecido depois da restauração da base real'
);
assert.match(nativeUpdate, /VERSION_FETCH_ATTEMPTS\s*=\s*3/);
assert.match(legacyEntry, /fetchAttempts: 1/);
assert.match(legacyEntry, /window\.setTimeout\([\s\S]*checkForAppUpdate\(\{ force: true \}\)/);
assert.doesNotMatch(nativeUpdate, /MEG_ANDROID_STARTUP_GATE/);

const androidWorkflow = read('../../../.github/workflows/build-android-apk.yml');
assert.match(androidWorkflow, /releases\/download\/android-latest\/MEG-Financas\.apk\?v=' \+ process\.env\.MEG_VERSION_CODE/);
assert.equal(androidWorkflow.includes('VERSIONED_APK'), false, 'a publicação não deve duplicar o APK versionado');
assert.match(androidWorkflow, /gh release upload android-latest MEG-Financas\.apk --clobber/);
assert.match(androidWorkflow, /test ! -d apps\/web\/dist\/downloads/);

console.log('native Android biometric login tests passed');
