import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatPeriodSummary, VIEW_COPY } from './layout-reform-core.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('./legacy-entry.js', import.meta.url), 'utf8');
const layout = readFileSync(new URL('./layout-reform.js', import.meta.url), 'utf8');
const protection = readFileSync(new URL('./startup-data-protection.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./meg-design-system.css', import.meta.url), 'utf8');
const enhancements = readFileSync(new URL('./ux-enhancements-safe.js', import.meta.url), 'utf8');
const appearance = readFileSync(new URL('./appearance-theme.js', import.meta.url), 'utf8');
const availabilityWorkflow = readFileSync(new URL('../../../.github/workflows/keep-api-responsive.yml', import.meta.url), 'utf8');

const expectedViews = [
  'dashboard',
  'cashflow',
  'analytics',
  'income-analysis',
  'transactions',
  'credit-cards',
  'budgets',
  'pending',
  'catalogs',
  'users',
  'platform-admin',
  'settings',
];

assert.deepEqual(Object.keys(VIEW_COPY), expectedViews);
for (const viewId of expectedViews) {
  assert.match(index, new RegExp(`id=["']${viewId}["']`), `a aba ${viewId} deve continuar no documento`);
  assert.equal(VIEW_COPY[viewId].length, 3, `a aba ${viewId} deve ter chamada, título e descrição`);
}

for (const controlId of ['periodMode', 'monthFilter', 'yearFilter', 'startDateFilter', 'endDateFilter', 'quickAddBtn']) {
  assert.match(index, new RegExp(`id=["']${controlId}["']`), `o controle ${controlId} não pode ser removido`);
}

assert.match(entry, /layout-reform\.js/);
assert.match(index, /id="globalPeriodToggle"/);
assert.match(index, /id="globalPeriodSummary"/);
assert.match(index, /id="globalPeriodFilters"[^>]*hidden/);
assert.match(index, /id="appearanceThemeToggle"/);
assert.match(index, /href="\/src\/meg-design-system\.css"/);
assert.doesNotMatch(index, /legacy-styles\.css|meg-finance-system\.css/);
assert.doesNotMatch(index, /staging-environment-banner/);
for (const metricId of ['dashboardGlanceBalance', 'dashboardGlanceIncome', 'dashboardGlanceDue']) {
  assert.match(index, new RegExp(`id=["']${metricId}["']`), `o indicador ${metricId} deve existir no resumo rápido`);
}
assert.match(entry, /initializeLayoutReform\(\)/);
assert.match(styles, /:root\[data-meg-theme="dark"\]/);
assert.match(styles, /@media \(max-width: 760px\)/);
assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) 42px minmax\(88px, auto\)/);
assert.match(styles, /\.transactions-table/);
assert.match(styles, /\.catalogs-grid/);
assert.match(styles, /\.settings-grid/);
assert.match(index, /data-transaction-type-option="expense"/);
assert.match(index, /data-transaction-type-option="income"/);
assert.match(index, /role="group" aria-label="Tipo de lançamento"/);
assert.doesNotMatch(index, /sidebarCloseBtn/);
assert.match(layout, /select\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
assert.match(styles, /\.transaction-type-options button\.selected/);
assert.match(styles, /\.transaction-batch-toggle/);
assert.match(layout, /initializeCollapsiblePanels/);
assert.match(layout, /meg-collapsible-panel/);
assert.match(styles, /\.meg-panel-collapse-button/);
assert.match(styles, /\.sidebar\.mobile-open/);
assert.match(styles, /\.app-shell\.sidebar-collapsed/);
assert.match(styles, /MEG Adaptive Experience/);
assert.match(styles, /body\.native-mobile dialog\.modal/);
assert.match(styles, /overflow-x: hidden/);
assert.match(styles, /\.dashboard-glance/);
assert.match(enhancements, /import\('echarts\/core'\)/);
assert.doesNotMatch(enhancements, /from 'echarts';/);
assert.match(enhancements, /async function loadEcharts/);
assert.match(appearance, /saved === 'light' \|\| saved === 'dark' \? saved : 'dark'/);
assert.match(availabilityWorkflow, /cron: '\*\/14 0-2,9-23 \* \* \*'/);
assert.match(protection, /meg-data-protection-close/);
assert.match(protection, /Fechar aviso/);

assert.equal(formatPeriodSummary({ mode: 'month', month: '2026-09' }), 'Set/2026');
assert.equal(formatPeriodSummary({ mode: 'year', year: '2027' }), '2027');
assert.equal(formatPeriodSummary({ mode: 'range', start: '2026-09-01', end: '2026-09-30' }), '01/09/2026 a 30/09/2026');
assert.equal(formatPeriodSummary({ mode: 'all' }), 'Tudo');

console.log('Layout reform: estrutura, abas, controles e responsividade preservados.');
