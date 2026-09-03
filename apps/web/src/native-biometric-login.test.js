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
const legacyCloud = read('./legacy-cloud.js');
const capacitorConfig = read('../../../capacitor.config.ts');
const appUpdaterPlugin = read('../../../android/app/src/main/java/br/com/megfinancas/app/AppUpdaterPlugin.java');

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
  isPotentialNativeAndroidRuntime({ capacitor: nativeRuntime('web', false), bodyClassList: classList(), userAgent: '', mobileBuild: true }),
  true,
  'o sinal VITE_MOBILE_APP deve identificar o APK antes da ponte e do user agent'
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
assert.match(mainActivity, /onWindowFocusChanged/);
assert.match(mainActivity, /checkForAvailableUpdateNative\(\)/);
assert.match(mainActivity, /void onBiometricAuthenticationSucceeded\(\)/);
assert.match(mainActivity, /public void onPause\(\)/);
assert.match(nativePlugin, /onAuthenticationSucceeded[\s\S]*onBiometricAuthenticationSucceeded\(\)/);
const biometricSuccessActivityBlock = mainActivity.slice(
  mainActivity.indexOf('public void onBiometricAuthenticationSucceeded'),
  mainActivity.indexOf('@Override', mainActivity.indexOf('public void onBiometricAuthenticationSucceeded'))
);
assert.doesNotMatch(
  biometricSuccessActivityBlock,
  /markAuthenticatedSessionReady\(\)/,
  'a biometria não pode liberar o atualizador antes do Dashboard e dos alertas iniciais'
);
assert.match(biometricSuccessActivityBlock, /removeCallbacks\(updateCheck\)/);

assert.match(nativeUpdate, /import\('\.\/native-biometric-settings\.js'\)/);
assert.match(nativeUpdate, /initializeAuthenticatedBiometricSettings\(\)/);
assert.match(nativeUpdate, /MEG_INSTALLED_APP_VERSION/);
assert.match(nativeUpdate, /export async function refreshInstalledAppVersion\(\)/);
assert.match(nativeUpdate, /promiseWithDeadline\([\s\S]*AppUpdater\.getInfo\(\)/);
assert.match(nativeUpdate, /INSTALLED_VERSION_TIMEOUT_MS\s*=\s*3000/);
assert.match(nativeUpdate, /INSTALLED_VERSION_BRIDGE_TIMEOUT/);
assert.match(nativeUpdate, /APK: versão indisponível/);
assert.match(nativeUpdate, /`APK v\$\{installed\.versionName\}`/);
assert.match(nativeUpdate, /window\.setTimeout\(installAutomatically, 0\)/);
assert.match(nativeUpdate, /Promise\.race\(\[request, deadline\]\)/);
assert.match(nativeUpdate, /INSTALL_PERMISSION_REQUIRED/);
assert.match(nativeUpdate, /Ao voltar, o MEG continuará o download e abrirá o instalador automaticamente/);
assert.match(nativeUpdate, /await AppUpdater\.downloadAndInstall/);
assert.equal(nativeUpdate.includes('appUpdateLater'), false, 'a atualização Android deve iniciar automaticamente');
assert.match(biometricSettings, /#logoutBtn/);
assert.match(biometricSettings, /\/auth\/login/);
assert.match(biometricSettings, /saveBiometricLogin\(\{ email, password \}\)/);
assert.match(biometricSettings, /status\.enabled \? 'Biometria ativa' : 'Ativar biometria'/);
assert.doesNotMatch(biometricSettings, /Biometria ativa — testar/);

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
assert.match(legacyEntry, /if \(nativeMobileMode\) \{[\s\S]*clearLocalCloudSession\(\)/);
assert.match(legacyEntry, /consumePreparedAndroidBiometricCredentials\(\)/);
assert.match(legacyEntry, /await bootstrapCloud\(\{ biometricCredentials, keepLoading: true \}\)/);
assert.match(legacyEntry, /if \(nativeMobileMode\) refreshInstalledAppVersion\(\)\.catch/);
assert.doesNotMatch(legacyEntry, /await refreshInstalledAppVersion\(\)/);
assert.doesNotMatch(legacyEntry, /await initializeStableUiFeatures\(\)/);
assert.match(legacyEntry, /scheduleOpeningFinancialAlert/);
assert.match(legacyEntry, /openingAlertSettled[\s\S]*finally\(releaseAndroidUpdateAfterOpeningAlert\)/);
assert.doesNotMatch(legacyEntry, /warmCloudApi/);
assert.match(capacitorConfig, /CapacitorHttp:\s*\{\s*enabled:\s*true\s*\}/);
assert.match(legacyCloud, /Promise\.race\(\[request, deadline\]\)/);
assert.match(legacyCloud, /error\.code\s*=\s*'NETWORK_TIMEOUT'/);
assert.doesNotMatch(nativeUpdate, /startup-api-readiness/);
assert.equal(
  legacyEntry.includes('biometricStartup.native && !biometricStartup.authenticated'),
  false,
  'uma biometria aprovada também deve invalidar a sessão WebView anterior'
);
assert.equal(legacyEntry.includes('biometricStartup.required && !biometricStartup.authenticated'), false);
assert.doesNotMatch(legacyEntry, /preflightOnly/);
assert.equal(legacyEntry.includes("startupUpdate?.decision === 'installer-launched'"), false);
assert.doesNotMatch(legacyEntry, /waitForStartupAppUpdate/);
assert.ok(
  legacyEntry.indexOf('await prepareAndroidBiometricStartup()') < legacyEntry.indexOf('consumePreparedAndroidBiometricCredentials()')
    && legacyEntry.indexOf('consumePreparedAndroidBiometricCredentials()') < legacyEntry.indexOf('clearLocalCloudSession()')
    && legacyEntry.indexOf('clearLocalCloudSession()') < legacyEntry.indexOf('await bootstrapCloud({ biometricCredentials, keepLoading: true })')
    && legacyEntry.indexOf('await prepareAndroidBiometricStartup()') < legacyEntry.indexOf('await bootstrapCloud({ biometricCredentials, keepLoading: true })')
    && legacyEntry.indexOf('await bootstrapCloud({ biometricCredentials, keepLoading: true })') < legacyEntry.indexOf("await import('./legacy-app.js')")
    && legacyEntry.indexOf("await import('./legacy-app.js')") < legacyEntry.lastIndexOf('checkForAppUpdate({ force: true })'),
  'biometria, autenticação e base devem preceder a interface; OTA permanece em segundo plano'
);
assert.ok(
  legacyEntry.indexOf('await bootstrapCloud({ biometricCredentials, keepLoading: true })') < legacyEntry.indexOf('if (!validationMode) {'),
  'a verificação OTA só pode começar depois da restauração da base real'
);
assert.match(nativeUpdate, /VERSION_FETCH_ATTEMPTS\s*=\s*3/);
assert.match(nativeUpdate, /VERSION_FETCH_TIMEOUT_MS\s*=\s*8000/);
assert.match(nativeUpdate, /AppUpdater\.getReleaseManifest/);
assert.match(nativeUpdate, /raw\.githubusercontent\.com/);
assert.match(nativeUpdate, /appUpdateCheckWarning/);
assert.match(appUpdaterPlugin, /void getReleaseManifest\(PluginCall call\)/);
assert.match(appUpdaterPlugin, /setConnectTimeout\(12000\)/);
assert.match(appUpdaterPlugin, /void setAuthenticatedUiReady\(PluginCall call\)/);
assert.match(appUpdaterPlugin, /void markAuthenticatedSessionReady\(\)/);
assert.match(appUpdaterPlugin, /void checkForAvailableUpdateNative\(\)/);
assert.match(appUpdaterPlugin, /new AlertDialog\.Builder\(activity\)/);
assert.match(appUpdaterPlugin, /fetchFirstAvailableReleaseManifest\(\)/);
assert.match(appUpdaterPlugin, /downloadAndInstallInternal\(/);
assert.match(nativeUpdate, /export async function markAndroidUpdateUiReady\(\)/);
assert.match(nativeUpdate, /AppUpdater\.setAuthenticatedUiReady\(\)/);
assert.match(nativeUpdate, /AppUpdater\.suppressNativePrompt/);
assert.match(legacyEntry, /window\.setTimeout\([\s\S]*checkForAppUpdate\(\{ force: true \}\)/);
assert.match(legacyEntry, /markAndroidUpdateUiReady\(\)\.catch/);
assert.match(legacyEntry, /initializeAndroidUpdateLifecycle\(\)\.catch/);
assert.doesNotMatch(legacyEntry, /await initializeAndroidUpdateLifecycle\(\)/);
assert.ok(
  legacyEntry.indexOf("traceStartup('dashboard-liberado'") < legacyEntry.indexOf('markAndroidUpdateUiReady()')
    && legacyEntry.indexOf('scheduleOpeningFinancialAlert') < legacyEntry.indexOf('markAndroidUpdateUiReady()')
    && legacyEntry.indexOf('markAndroidUpdateUiReady()') < legacyEntry.indexOf('initializeAndroidBiometricLifecycle({')
    && legacyEntry.indexOf('markAndroidUpdateUiReady()') < legacyEntry.indexOf('initializeAndroidUpdateLifecycle()'),
  'a ponte nativa OTA deve ser preparada após o Dashboard e depender da conclusão dos alertas iniciais'
);
assert.match(nativeUpdate, /appUpdateBanner/);
assert.match(nativeUpdate, /appUpdateSidebarBadge/);
assert.match(nativeUpdate, /meg:app-update-available/);
assert.match(nativeUpdate, /appStateChange/);
assert.match(nativeUpdate, /androidPrivacyCover/);
assert.doesNotMatch(nativeUpdate, /MEG_ANDROID_STARTUP_GATE/);

const androidWorkflow = read('../../../.github/workflows/build-android-apk.yml');
assert.match(androidWorkflow, /releases\/download\/android-latest\/MEG-Financas\.apk'/);
assert.doesNotMatch(androidWorkflow, /MEG-Financas\.apk\?v=/);
assert.equal(androidWorkflow.includes('VERSIONED_APK'), false, 'a publicação não deve duplicar o APK versionado');
assert.match(androidWorkflow, /gh release upload android-latest MEG-Financas\.apk --clobber/);
assert.match(androidWorkflow, /test ! -d apps\/web\/dist\/downloads/);

console.log('native Android biometric login tests passed');
