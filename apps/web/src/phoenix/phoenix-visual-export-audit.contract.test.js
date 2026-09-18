import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const exportBridge = readFileSync(new URL('./phoenix-table-export-bridge.ts', import.meta.url), 'utf8');
const exportCss = readFileSync(new URL('./phoenix-table-export.css', import.meta.url), 'utf8');
const visualCss = readFileSync(new URL('./phoenix-visual-a11y.css', import.meta.url), 'utf8');
const overlayTheme = readFileSync(new URL('./phoenix-overlay-theme-bridge.ts', import.meta.url), 'utf8');

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
assert.match(main, /preview-main'[\s\S]*phoenix-visual-a11y\.css/, 'Guardrails visuais devem carregar por último.');
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

for (const screen of screens) {
  const content = readFileSync(new URL(screen, import.meta.url), 'utf8');
  assert.ok(content.length > 0, `Tela ausente da varredura visual: ${screen}`);
}

console.log(`Phoenix visual/export audit: OK · ${screens.length} telas cobertas.`);
