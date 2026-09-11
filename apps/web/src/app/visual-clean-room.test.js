import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const index = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../layouts/AppShell.tsx', import.meta.url), 'utf8');
const styles = `${readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('../styles/v15-contract.css', import.meta.url), 'utf8')}`;
const store = readFileSync(new URL('./store.ts', import.meta.url), 'utf8');
const storage = readFileSync(new URL('./storage.ts', import.meta.url), 'utf8');

for (const file of ['../legacy-entry.js', '../legacy-app.js', '../meg-design-system.css', '../meg-visual-contract.css', '../layout-reform.js', '../adaptive-workspace.js']) {
  assert.equal(existsSync(new URL(file, import.meta.url)), false, `resíduo visual encontrado: ${file}`);
}
assert.match(index, /src="\/src\/app\/main\.tsx"/);
assert.doesNotMatch(index, /legacy|layout-reform|visual-contract|design-system/i);
assert.match(shell, /meg-finance-system-mark\.svg/);
assert.match(shell, /sidebar-collapsed/);
assert.match(shell, /Período global/);
assert.match(styles, /\.meg-sidebar\{position:fixed/);
assert.match(styles, /\.meg-topbar\{position:fixed/);
assert.match(styles, /@media\(max-width:820px\)/);
assert.match(styles, /@media\(min-width:821px\) and \(max-width:1180px\)/);
assert.match(styles, /\.mobile-menu-open\.sidebar-collapsed \.meg-sidebar\{transform:translate3d\(0,0,0\)\}/);
assert.match(styles, /\.sidebar-collapsed \.meg-sidebar b,.sidebar-collapsed \.meg-side-user div\{display:block\}/);
assert.match(shell, /className="[^"]*meg-sidebar-toggle[^"]*"/);
assert.match(styles, /\.web-validation \.meg-page-content>\.page\{display:grid\}/);
for (const selector of ['.premium-balance', '.launch-kpis', '.history-layout', '.pending-layout', '.cards-shell', '.catalog-sticky-header', '.card-date-intelligence']) {
  assert.match(styles, new RegExp(selector.replace('.', '\\.')), `estrutura ausente no contrato V15: ${selector}`);
}
assert.match(shell, /setCollapsed\(\(value\) => !value\)/);
assert.match(shell, /setMobileOpen\(false\)/);
assert.match(shell, /<Icon name="menu" \/>/);
assert.match(shell, />Intervalo<\/button>/);
assert.match(shell, />Tudo<\/button>/);
assert.doesNotMatch(shell, /platform|Gestão comercial/i);
assert.doesNotMatch(store, /resetDemoData|sample-data/);
assert.doesNotMatch(storage, /sampleTransactions|sample-data/);
assert.match(styles, /\.meg-app\.light/);
console.log('Contrato visual limpo do MEG validado.');
