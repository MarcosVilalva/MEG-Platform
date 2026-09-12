import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const phoenixApp = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const screens = readFileSync(new URL('./screens/PhoenixReadScreens.tsx', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./data/load-phoenix-read-model.ts', import.meta.url), 'utf8');
const styles = `${readFileSync(new URL('./phoenix-v15.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-screens.css', import.meta.url), 'utf8')}`;
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const phoenixSource = `${phoenixApp}\n${screens}`;

for (const forbidden of ['global.css', 'v15-contract.css', 'meg-v15.css']) {
  assert.doesNotMatch(phoenixSource, new RegExp(forbidden.replace('.', '\\.')),
    `Phoenix não pode importar ${forbidden}`);
}

assert.doesNotMatch(phoenixSource, /\.\.\/modules\//,
  'Phoenix não deve reutilizar componentes visuais da interface antiga');
assert.doesNotMatch(loader, /method\s*:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/,
  'Bootstrap Phoenix deve permanecer somente leitura');
assert.doesNotMatch(screens, /(?:create|update|delete|archive|pay|patchCloudTransactions)\s*\(/,
  'Telas Phoenix em paridade não podem chamar mutações diretamente');
assert.match(loader, /financeClient\.getSummary\(month\)/);
assert.match(loader, /cardsClient\.list\(month\)/);
assert.match(loader, /payablesClient\.list\(month\)/);
assert.match(loader, /normalization-preview/);

assert.match(styles, /--bg:#f3f7f7/);
assert.match(styles, /--nav:#071727/);
assert.match(styles, /--brand:#19b990/);
assert.match(styles, /container-type:inline-size/);
assert.match(styles, /@container phoenix-workspace/);
assert.doesNotMatch(styles, /@import/,
  'Contrato Phoenix deve ser autocontido e não importar CSS legado');

assert.match(phoenixApp, /⌘ Buscar no MEG/);
for (const glyph of ['⌂', '▦', '◷', '▣', '≡', '♙', '⚙']) {
  assert.ok(phoenixApp.includes(glyph), `Ícone V15 ausente: ${glyph}`);
}
for (const screen of ['PhoenixMovements', 'PhoenixPayables', 'PhoenixCards', 'PhoenixCatalogs']) {
  assert.ok(phoenixApp.includes(screen), `Tela Phoenix não conectada: ${screen}`);
}

assert.doesNotMatch(main, /PhoenixApp/,
  'Phoenix ainda não deve estar ligada à entrada de produção durante a fase somente leitura isolada');

console.log('Contrato clean-room da Phoenix V15 validado.');
