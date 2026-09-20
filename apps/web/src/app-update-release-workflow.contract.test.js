import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const android = readFileSync(new URL('../../../.github/workflows/build-android-apk.yml', import.meta.url), 'utf8');
const pages = readFileSync(new URL('../../../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
const controller = readFileSync(new URL('./android-update-controller.js', import.meta.url), 'utf8');
const preview = readFileSync(new URL('./phoenix/preview-main.tsx', import.meta.url), 'utf8');
const nativeUpdater = readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/AppUpdaterPlugin.java', import.meta.url), 'utf8');

assert.match(
  android,
  /gh release upload android-latest MEG-Financas\.apk app-version\.json --clobber/,
  'Android deve publicar APK e manifesto juntos no release estável',
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
  /AppUpdater\.startDownloadAndInstall\(\{ url: downloadUrl, sha256: release\.sha256 \}\)/,
  'Fluxo Phoenix deve iniciar download e instalação sem exigir o botão Atualizar agora',
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
assert.match(
  nativeUpdater,
  /if \(sha256 == null \|\| sha256\.trim\(\)\.isEmpty\(\)\) throw new IllegalStateException\("Manifesto sem SHA-256 da atualização\."\);/,
  'Atualização automática nativa deve exigir SHA-256 antes do download',
);

console.log('Android/Page release-pair + automatic update contract: OK');
