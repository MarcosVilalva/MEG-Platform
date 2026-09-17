import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const productionHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const previewHtml = readFileSync(new URL('../../phoenix.html', import.meta.url), 'utf8');

for (const runtime of [
  'auth-fast-entry-bridge',
  'history-prewarm-bridge',
  'description-autocomplete-bridge',
  'action-prewarm-bridge',
  'avatar-runtime-bridge',
  'write-success-auto-close'
]) {
  assert.match(main, new RegExp(runtime), `Produção deve carregar ${runtime}.`);
}

assert.match(main, /phoenix-release-hardening\.css/,
  'Produção deve carregar o hardening visual global validado.');
assert.match(productionHtml, /data-meg-shell="phoenix-v15"/,
  'Index oficial deve continuar apontando para a shell Phoenix V15.');
assert.match(productionHtml, /src\/app\/main\.tsx/,
  'Index oficial deve usar o bootstrap único de produção.');
assert.match(previewHtml, /action-prewarm-bridge/,
  'Preview deve continuar exercitando o prewarm das ações.');
assert.match(previewHtml, /avatar-runtime-bridge/,
  'Preview deve continuar exercitando o runtime dos avatares.');

console.log('Bootstrap oficial da Phoenix V15 alinhado com os recursos validados.');
