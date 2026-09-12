import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const phoenixApp = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const screens = readFileSync(new URL('./screens/PhoenixReadScreens.tsx', import.meta.url), 'utf8');
const history = readFileSync(new URL('./screens/PhoenixHistory.tsx', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./data/load-phoenix-read-model.ts', import.meta.url), 'utf8');
const previewMain = readFileSync(new URL('./preview-main.tsx', import.meta.url), 'utf8');
const phoenixHtml = readFileSync(new URL('../../phoenix.html', import.meta.url), 'utf8');
const productionHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const styles = `${readFileSync(new URL('./phoenix-v15.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-screens.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-history.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./preview.css', import.meta.url), 'utf8')}`;
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const phoenixSource = `${phoenixApp}\n${screens}\n${history}\n${previewMain}`;

for (const forbidden of ['global.css', 'v15-contract.css', 'meg-v15.css']) {
  assert.doesNotMatch(phoenixSource, new RegExp(forbidden.replace('.', '\\.')),
    `Phoenix não pode importar ${forbidden}`);
}

assert.doesNotMatch(phoenixSource, /\.\.\/modules\//,
  'Phoenix não deve reutilizar componentes visuais da interface antiga');
assert.doesNotMatch(loader, /method\s*:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/,
  'Bootstrap Phoenix deve permanecer sem mutações explícitas');
assert.doesNotMatch(`${screens}\n${history}`, /from\s+['"][^'"]*app\/(?:finance-client|cards-client|payables-client|app-state-client)['"]/,
  'Telas Phoenix não podem acessar clientes mutáveis diretamente durante a paridade');
assert.doesNotMatch(`${screens}\n${history}`, /patchCloudTransactions|createEvent|updateEvent|archiveEvent|createPurchase|payStatement/,
  'Telas Phoenix não podem invocar gateways de escrita durante a paridade');
assert.match(loader, /financeClient\.getSummary\(month\)/);
assert.match(loader, /cardsClient\.list\(month\)/);
assert.match(loader, /payablesClient\.list\(month\)/);
assert.match(loader, /normalization-preview/);
assert.match(loader, /authenticatedRequest<SharedStateRead>\('\/app-state'\)/,
  'Histórico Phoenix deve vir da leitura real do AppState');
assert.match(loader, /activityLog/);
assert.match(history, /AppState\.activityLog/);
assert.match(history, /Exportar histórico filtrado/);
assert.match(history, /não contém um par completo e garantido/,
  'Phoenix deve deixar explícito que activityLog ainda não é before\/after estrutural');

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
for (const screen of ['PhoenixMovements', 'PhoenixHistory', 'PhoenixPayables', 'PhoenixCards', 'PhoenixCatalogs']) {
  assert.ok(phoenixApp.includes(screen), `Tela Phoenix não conectada: ${screen}`);
}

assert.match(phoenixHtml, /src\/phoenix\/preview-main\.tsx/,
  'Preview Phoenix deve usar sua própria entrada');
assert.doesNotMatch(phoenixHtml, /src\/app\/main\.tsx/,
  'Preview Phoenix não deve apontar para a entrada de produção');
assert.match(productionHtml, /src\/app\/main\.tsx/,
  'Entrada de produção deve continuar apontando para o sistema atual');
assert.doesNotMatch(productionHtml, /src\/phoenix\/preview-main\.tsx/,
  'Produção não deve apontar para o preview Phoenix');
assert.match(previewMain, /PhoenixApp/);
assert.match(previewMain, /login\(/,
  'Preview deve autenticar pelo contrato existente sem reutilizar a tela de login antiga');

assert.doesNotMatch(main, /PhoenixApp/,
  'Phoenix ainda não deve estar ligada à entrada de produção durante a fase somente leitura isolada');

console.log('Contrato clean-room da Phoenix V15 validado.');
