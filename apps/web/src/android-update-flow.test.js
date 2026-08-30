import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('./android-update-controller.js', import.meta.url), 'utf8');
const fallback = readFileSync(new URL('./android-update-fallback.js', import.meta.url), 'utf8');
const hardening = readFileSync(new URL('./android-update-hardening.js', import.meta.url), 'utf8');
const darkGuard = readFileSync(new URL('./meg-dark-surface-guard.css', import.meta.url), 'utf8');
const activityHistory = readFileSync(new URL('./activity-history.js', import.meta.url), 'utf8');
const embeddedVersion = readFileSync(new URL('./embedded-apk-version.js', import.meta.url), 'utf8');
const nativePlugin = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/AppUpdaterPlugin.java', import.meta.url), 'utf8');
const mainActivity = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');
const androidWorkflow = readFileSync(new URL('../../../.github/workflows/build-android-apk.yml', import.meta.url), 'utf8');

assert.match(fallback, /import '\.\/embedded-apk-version\.js'/);
assert.match(fallback, /from '\.\/android-update-hardening\.js'/);
assert.match(fallback, /waitUntilOpeningDialogsFinish/);
assert.match(fallback, /checkForAppUpdateHardened\(\{ manual: false \}\)/);
assert.doesNotMatch(fallback, /android-update-controller\.js/);
assert.doesNotMatch(fallback, /android-update-current-feedback\.js/);

assert.match(hardening, /UPDATE_CHECK_TIMEOUT_MS = 16000/);
assert.match(hardening, /Promise\.allSettled\(MANIFEST_URLS\.map\(fetchManifestWeb\)\)/);
assert.match(hardening, /selectNewestRelease\(webCandidates\)/);
assert.match(hardening, /right\.versionCode - left\.versionCode/);
assert.match(hardening, /AbortController/);
assert.match(hardening, /withDeadline\([\s\S]{0,120}AppUpdater\.getReleaseManifest/);
assert.match(hardening, /withDeadline\(AppUpdater\.getInfo\(\)/);
assert.match(hardening, /embeddedAndroidVersion\(\)/);
assert.match(hardening, /stopImmediatePropagation\(\)/);
assert.match(hardening, /Última versão instalada/);
assert.match(hardening, /Não foi possível verificar atualizações agora/);
assert.match(hardening, /cleanDownloadUrl/);
assert.match(hardening, /url\.search = ''/);
assert.match(hardening, /finally\(\(\) => \{[\s\S]*button\.disabled = false/);
assert.match(hardening, /import\('\.\/meg-dark-surface-guard\.css'\)/);

assert.match(embeddedVersion, /VITE_ANDROID_VERSION_NAME/);
assert.match(embeddedVersion, /VITE_ANDROID_VERSION_CODE/);
assert.match(embeddedVersion, /APK v\$\{installed\.versionName\}/);
assert.match(embeddedVersion, /versionSource = 'native'/);

assert.match(darkGuard, /--panel: var\(--meg-dark-surface\) !important/);
assert.match(darkGuard, /body \.meg-history-panel/);
assert.match(darkGuard, /body \.meg-history-filters input/);
assert.match(darkGuard, /body \.view input:not/);
assert.match(darkGuard, /body dialog\.modal/);
assert.match(darkGuard, /body\.native-mobile \.view/);
assert.match(activityHistory, /meg-history-panel/);

assert.match(androidWorkflow, /VITE_ANDROID_VERSION_CODE: \$\{\{ github\.run_number \}\}/);
assert.match(androidWorkflow, /VITE_ANDROID_VERSION_NAME: 1\.1\.\$\{\{ github\.run_number \}\}/);
assert.match(androidWorkflow, /releases\/download\/android-latest\/MEG-Financas\.apk'/);
assert.doesNotMatch(androidWorkflow, /MEG-Financas\.apk\?v=/);
assert.match(androidWorkflow, /elimina superfícies brancas residuais/);

/* Mantém a implementação secundária protegida como fallback de compatibilidade. */
assert.match(controller, /APP_UPDATER_INFO_TIMEOUT/);
assert.match(controller, /CAPACITOR_APP_INFO_TIMEOUT/);
assert.match(controller, /Promise\.allSettled\(MANIFEST_URLS\.map\(fetchManifestWeb\)\)/);
assert.match(controller, /selectNewestRelease\(webReleases\)/);

assert.match(nativePlugin, /fetchNewestReleaseManifest\(\)/);
assert.match(nativePlugin, /long newestCode = -1L/);
assert.match(nativePlugin, /if \(code > newestCode\)/);
assert.match(nativePlugin, /fetchFirstAvailableReleaseManifest\(\)[\s\S]{0,180}return fetchNewestReleaseManifest\(\);/);
assert.doesNotMatch(nativePlugin, /JSObject release = fetchFirstAvailableReleaseManifest\(\)/);

assert.match(mainActivity, /registerPlugin\(AppUpdaterPlugin\.class\)/);
assert.match(mainActivity, /checkForAvailableUpdateNative\(\)/);

console.log('android update flow and dark surface tests passed');
