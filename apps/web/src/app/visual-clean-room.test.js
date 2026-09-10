import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const index = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../layouts/AppShell.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');

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
assert.match(styles, /@media\(max-width:980px\)/);
assert.match(styles, /@media\(max-width:1100px\)/);
assert.match(styles, /\.mobile-menu-open\.sidebar-collapsed \.meg-sidebar\{transform:translate3d\(0,0,0\)\}/);
assert.match(styles, /\.sidebar-collapsed \.meg-sidebar b,.sidebar-collapsed \.meg-side-user div\{display:block\}/);
assert.match(shell, /isCompactViewport \? setMobileOpen\(false\) : setCollapsed/);
assert.match(shell, /<Icon name="menu" \/>/);
console.log('Contrato visual limpo do MEG validado.');
