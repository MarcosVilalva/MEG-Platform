import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const android = readFileSync(new URL('../../../.github/workflows/build-android-apk.yml', import.meta.url), 'utf8');
const pages = readFileSync(new URL('../../../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');

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

console.log('Android/Page release-pair contract: OK');
