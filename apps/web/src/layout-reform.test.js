import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VIEW_COPY } from './layout-reform-core.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('./legacy-entry.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./full-layout-reform.css', import.meta.url), 'utf8');

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
assert.match(index, /id="globalPeriodFilters"[^>]*hidden/);
assert.match(index, /id="appearanceThemeToggle"/);
assert.match(entry, /initializeLayoutReform\(\)/);
assert.match(styles, /:root\[data-meg-theme="dark"\]/);
assert.match(styles, /@media \(max-width: 760px\)/);
assert.match(styles, /\.transactions-table/);
assert.match(styles, /\.catalogs-grid/);
assert.match(styles, /\.settings-grid/);

console.log('Layout reform: estrutura, abas, controles e responsividade preservados.');
