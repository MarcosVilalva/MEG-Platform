import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('./android-update-controller.js', import.meta.url), 'utf8');
const fallback = readFileSync(new URL('./android-update-fallback.js', import.meta.url), 'utf8');
const embeddedVersion = readFileSync(new URL('./embedded-apk-version.js', import.meta.url), 'utf8');
const currentFeedback = readFileSync(new URL('./android-update-current-feedback.js', import.meta.url), 'utf8');
const nativePlugin = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/AppUpdaterPlugin.java', import.meta.url), 'utf8');
const mainActivity = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');
const androidWorkflow = readFileSync(new URL('../../../.github/workflows/build-android-apk.yml', import.meta.url), 'utf8');

assert.match(fallback, /import '\.\/embedded-apk-version\.js'/);
assert.match(fallback, /import '\.\/android-update-current-feedback\.js'/);
assert.match(fallback, /from '\.\/android-update-controller\.js'/);
assert.match(fallback, /waitUntilOpeningDialogsFinish/);
assert.match(fallback, /checkForAppUpdate\(\)/);
assert.doesNotMatch(fallback, /registerPlugin\('AppUpdater'\)/);
assert.doesNotMatch(fallback, /AppUpdater\.getInfo\(\)/);

assert.match(embeddedVersion, /VITE_ANDROID_VERSION_NAME/);
assert.match(embeddedVersion, /VITE_ANDROID_VERSION_CODE/);
assert.match(embeddedVersion, /APK v\$\{installed\.versionName\}/);
assert.match(embeddedVersion, /versionSource = 'native'/);
assert.match(androidWorkflow, /VITE_ANDROID_VERSION_CODE: \$\{\{ github\.run_number \}\}/);
assert.match(androidWorkflow, /VITE_ANDROID_VERSION_NAME: 1\.1\.\$\{\{ github\.run_number \}\}/);

assert.match(currentFeedback, /Última versão instalada/);
assert.match(currentFeedback, /Você já está usando a versão mais recente do MEG/);
assert.match(currentFeedback, /appUpdateBanner, #appUpdateDialog, #appUpdateCheckWarning/);
assert.match(currentFeedback, /installedAppVersion/);
assert.match(currentFeedback, /navigator\.onLine === false/);

assert.match(controller, /APP_UPDATER_INFO_TIMEOUT/);
assert.match(controller, /CAPACITOR_APP_INFO_TIMEOUT/);
assert.match(controller, /info\.versionCode \?\? info\.build/);
assert.match(controller, /Promise\.allSettled\(MANIFEST_URLS\.map\(fetchManifestWeb\)\)/);
assert.match(controller, /selectNewestRelease\(webReleases\)/);
assert.match(controller, /id = 'checkAppUpdateBtn'/);
assert.match(controller, /Verificar atualização/);
assert.match(controller, /dialog\._megDecisionPromise = decisionPromise/);
assert.match(controller, /INSTALL_PERMISSION_REQUIRED/);

assert.match(nativePlugin, /fetchNewestReleaseManifest\(\)/);
assert.match(nativePlugin, /long newestCode = -1L/);
assert.match(nativePlugin, /if \(code > newestCode\)/);
assert.match(nativePlugin, /fetchFirstAvailableReleaseManifest\(\)[\s\S]{0,180}return fetchNewestReleaseManifest\(\);/);
assert.doesNotMatch(nativePlugin, /JSObject release = fetchFirstAvailableReleaseManifest\(\)/);
assert.doesNotMatch(nativePlugin, /markAuthenticatedSessionReady\(\)[\s\S]{0,300}checkForAvailableUpdateNative\(\);/);

assert.match(mainActivity, /registerPlugin\(AppUpdaterPlugin\.class\)/);
assert.match(mainActivity, /checkForAvailableUpdateNative\(\)/);

console.log('android update flow tests passed');
