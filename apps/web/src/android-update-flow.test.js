import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('./android-update-controller.js', import.meta.url), 'utf8');
const fallback = readFileSync(new URL('./android-update-fallback.js', import.meta.url), 'utf8');
const nativePlugin = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/AppUpdaterPlugin.java', import.meta.url), 'utf8');
const mainActivity = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');

assert.match(fallback, /from '\.\/android-update-controller\.js'/);
assert.match(fallback, /waitUntilOpeningDialogsFinish/);
assert.match(fallback, /checkForAppUpdate\(\)/);
assert.doesNotMatch(fallback, /registerPlugin\('AppUpdater'\)/);
assert.doesNotMatch(fallback, /AppUpdater\.getInfo\(\)/);

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
assert.doesNotMatch(nativePlugin, /fetchFirstAvailableReleaseManifest/);
assert.doesNotMatch(nativePlugin, /markAuthenticatedSessionReady\(\)[\s\S]{0,300}checkForAvailableUpdateNative\(\);/);

assert.match(mainActivity, /registerPlugin\(AppUpdaterPlugin\.class\)/);
assert.match(mainActivity, /checkForAvailableUpdateNative\(\)/);

console.log('android update flow tests passed');
