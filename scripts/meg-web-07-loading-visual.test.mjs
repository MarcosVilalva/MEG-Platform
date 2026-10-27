import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const component = read('apps/web/src/meg-web-evolution/auth/LoadingScreen.tsx');
const css = read('apps/web/src/meg-web-evolution/auth/loading.css');
const preview = read('apps/web/visual-sequence/entry.tsx');
const grid = read('apps/web/src/meg-web-evolution/datagrid/DataGrid.tsx');

assert.match(component, /role="progressbar"/);
assert.match(component, /aria-valuenow=\{preview \? undefined : value\}/);
assert.match(component, /aria-live="polite"/);
assert.doesNotMatch(component, /loading-master\.png|financeClient|createEvent|authClient\.login/);
assert.match(css, /visual-loading\/ambient\.webp/);
assert.match(css, /max-width: 1024px/);
assert.match(css, /max-width: 639px/);
assert.match(preview, /<LoadingScreen preview progress=\{0\}/);
assert.doesNotMatch(preview, /financeClient|authenticatedRequest|localStorage|createEvent/);
for(const file of ['ambient', 'hologram', 'logo']) {
  assert.ok(existsSync('apps/web/public/meg-web-evolution/visual-loading/'+file+'.webp'), file+' WebP not found');
}
assert.match(grid, /export function DataGrid/);
console.log('MEG visual Tela 01: contratos de arte, carregamento e DataGrid preservado OK.');
