import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const exportBridge = readFileSync(new URL('./phoenix-table-export-bridge.ts', import.meta.url), 'utf8');
const exportCss = readFileSync(new URL('./phoenix-table-export.css', import.meta.url), 'utf8');
const visualCss = readFileSync(new URL('./phoenix-visual-a11y.css', import.meta.url), 'utf8');
const overlayTheme = readFileSync(new URL('./phoenix-overlay-theme-bridge.ts', import.meta.url), 'utf8');
const historyScreen = readFileSync(new URL('./screens/PhoenixHistory.tsx', import.meta.url), 'utf8');
const historyCss = readFileSync(new URL('./phoenix-history.css', import.meta.url), 'utf8');

const screens = [
  './screens/PhoenixCardsGrid.tsx',
  './screens/PhoenixCatalogsGrid.tsx',
  './screens/PhoenixDecisionCenter.tsx',
  './screens/PhoenixHistory.tsx',
  './screens/PhoenixHomeAllTime.tsx',
  './screens/PhoenixHomeDashboard.tsx',
  './screens/PhoenixHomeHorizon.tsx',
  './screens/PhoenixMovementsV15.tsx',
  './screens/PhoenixPayablesV15.tsx',
  './screens/PhoenixReadScreens.tsx',
  './screens/PhoenixSettings.tsx',
  './screens/PhoenixUsers.tsx',
  './screens/PhoenixWebGridScreens.tsx',
  './screens/PhoenixWebScreens.tsx',
];

assert.match(main, /phoenix-table-export-bridge/, 'Runtime oficial deve carregar exportação global.');
assert.match(main, /phoenix-overlay-theme-bridge/, 'Runtime deve sincronizar o tema dos drawers anexados fora da raiz Phoenix.');
assert.match(main, /phoenix-visual-a11y\.css'[\s\S]*await import\('\.\.\/phoenix\/preview-main'\)/, 'Guardrails visuais devem carregar antes do bootstrap React final, inclusive quando o Android usa bootstrap assíncrono para biometria.');
assert.match(exportBridge, /querySelectorAll<HTMLTableElement>\('\.phoenix-v15 table'\)/, 'Toda tabela Phoenix deve entrar na descoberta global.');
assert.match(exportBridge, /dataset\.megExportToolbar = 'true'/, 'Barra de exportação deve possuir marcador explícito.');
assert.match(exportBridge, /Exportação da tabela/, 'Controles de exportação devem ter nome acessível.');
assert.match(exportBridge, /buildPhoenixXlsx/, 'Excel XLSX deve permanecer habilitado.');
assert.match(exportBridge, /buildPhoenixPdf/, 'PDF deve permanecer habilitado.');
assert.match(exportBridge, /table\.removeAttribute\(MANAGED_ATTR\)/, 'Exportação deve se reinstalar quando React remover a toolbar.');
assert.match(overlayTheme, /document\.body\.dataset\.phoenixTheme/, 'Tema Phoenix deve ser propagado ao body.');
assert.match(visualCss, /body\[data-phoenix-theme/, 'Drawers fora da raiz devem receber contraste nos dois temas.');
assert.match(exportCss, /px-export-button\.excel/, 'Ação Excel deve ter identidade visual.');
assert.match(exportCss, /px-export-button\.pdf/, 'Ação PDF deve ter identidade visual.');

for (const token of ['--px-muted-strong','--px-control-border','.px-secondary-action','.px-primary-action','.px-card-management-danger','.px-preview-box','.px-rule-box','.px-notice','table thead th','button:disabled']) {
  assert.ok(visualCss.includes(token), `Guardrail visual ausente: ${token}`);
}

assert.match(historyScreen, /data-history-layout="premium-v1"/,
  'Histórico deve expor o marcador do cockpit premium.');
assert.doesNotMatch(historyScreen, /px-history-source-note/,
  'Aviso técnico de fonte não deve ocupar o fluxo principal do Histórico.');
assert.match(historyScreen, /Linha do tempo financeira/,
  'Histórico deve possuir módulo principal de linha do tempo.');
assert.match(historyScreen, /px-history-commandbar/,
  'Busca e filtros devem permanecer integrados em uma única barra operacional.');
assert.match(historyCss, /grid-template-rows:72px 82px 54px minmax\(0,1fr\)/,
  'Histórico desktop deve distribuir hero, KPIs, filtros e workspace em faixas explícitas.');
assert.match(historyCss, /\.px-history-feed[\s\S]*overflow-y:auto/,
  'Feed do Histórico deve concentrar sua própria rolagem no desktop.');
assert.match(historyCss, /\.px-history-detail[\s\S]*overflow-y:auto/,
  'Detalhes da auditoria devem possuir rolagem interna independente.');
assert.match(historyCss, /\.phoenix-v15 \.px-main-history[\s\S]*height:100dvh/,
  'Histórico deve operar como cockpit fixo no desktop.');

for (const screen of screens) {
  const content = readFileSync(new URL(screen, import.meta.url), 'utf8');
  assert.ok(content.length > 0, `Tela ausente da varredura visual: ${screen}`);
}

console.log(`Phoenix visual/export audit: OK · ${screens.length} telas cobertas.`);
