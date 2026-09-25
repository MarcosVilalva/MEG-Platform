import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const android = readFileSync(new URL('../../../.github/workflows/build-android-apk.yml', import.meta.url), 'utf8');
const pages = readFileSync(new URL('../../../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
const controller = readFileSync(new URL('./android-update-controller.js', import.meta.url), 'utf8');
const preview = readFileSync(new URL('./phoenix/preview-main.tsx', import.meta.url), 'utf8');
const nativeUpdater = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/AppUpdaterPlugin.java', import.meta.url), 'utf8');
const mainActivity = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');

assert.match(
  android,
  /gh release upload android-latest "MEG-Financas-\$\{MEG_VERSION_CODE\}\.apk" MEG-Financas\.apk --clobber[\s\S]*gh release upload android-latest app-version\.json --clobber/,
  'Android deve publicar primeiro o APK imutável e somente depois o manifesto do release estável',
);
assert.match(
  android,
  /downloadUrl: 'https:\/\/github\.com\/MarcosVilalva\/MEG-Platform\/releases\/download\/android-latest\/MEG-Financas-' \+ process\.env\.MEG_VERSION_CODE \+ '\.apk'/,
  'Manifesto deve apontar para o APK imutável da própria versão no release estável',
);

assert.match(
  pages,
  /releases\/download\/android-latest\/MEG-Financas\.apk/,
  'Pages deve baixar o APK do release estável',
);
assert.match(
  pages,
  /releases\/download\/android-latest\/app-version\.json/,
  'Pages deve baixar o manifesto do mesmo release estável',
);
assert.match(
  pages,
  /actual !== manifest\.sha256/,
  'Pages deve validar SHA-256 do APK contra o manifesto baixado',
);

assert.match(
  preview,
  /checkForAppUpdate\(\{\s*automatic:\s*true\s*\}\)/,
  'Android deve iniciar a verificação automática após autenticação e carga dos dados',
);
assert.match(
  controller,
  /AppUpdater\.startDownloadAndInstall\(\{\s*url:\s*downloadUrl,\s*sha256:\s*release\.sha256,\s*versionCode:\s*releaseCode\s*\}\)/,
  'Fluxo Phoenix deve iniciar download automático informando URL, hash e versionCode ao instalador nativo',
);
assert.match(
  controller,
  /checkForAppUpdate\(\{ automatic: true \}\)\.catch/,
  'Ao retomar o APK, a verificação deve continuar automática e não apenas criar aviso invisível',
);
assert.match(
  controller,
  /\.px-topbar, \.topbar[\s\S]*\.px-content, main\.content[\s\S]*document\.body\.prepend/,
  'Avisos do atualizador devem montar também no shell Phoenix e possuir fallback no body',
);
assert.match(
  controller,
  /Autorize “Permitir desta fonte”\. Ao voltar, o MEG continuará sozinho\./,
  'Fluxo automático deve retomar sozinho após a permissão de instalação',
);
assert.match(
  nativeUpdater,
  /activity\.runOnUiThread\(\(\) -> installAvailableUpdateNatively\(downloadUrl, sha256\)\);/,
  'Fallback nativo deve iniciar a atualização automaticamente quando detectar versão superior',
);
assert.doesNotMatch(
  nativeUpdater,
  /if \(!authenticatedUiReady \|\| installRunning\.get\(\)/,
  'Verificação nativa não pode depender da WebView autenticada para descobrir uma versão nova',
);
assert.match(
  nativeUpdater,
  /releases\/download\/android-latest\/app-version\.json/,
  'Atualizador nativo deve consultar o manifesto do release estável como fonte primária',
);
assert.match(
  mainActivity,
  /onBiometricAuthenticationSucceeded\(\)[\s\S]*scheduleUpdateCheck\(\)/,
  'Após a biometria o Android deve refazer a verificação de atualização',
);
assert.match(
  nativeUpdater,
  /if \(sha256 == null \|\| sha256\.trim\(\)\.isEmpty\(\)\) throw new IllegalStateException\("Manifesto sem SHA-256 da atualização\."\);/,
  'Atualização automática nativa deve exigir SHA-256 antes do download',
);

console.log('Android/Page release-pair + automatic update contract: OK');
