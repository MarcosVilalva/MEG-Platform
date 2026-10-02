import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const search = readFileSync(join(here, 'components/WebNextSearchDialog.tsx'), 'utf8');
const searchModel = readFileSync(join(here, 'data/search-model.ts'), 'utf8');
const status = readFileSync(join(here, 'components/WebNextStatus.tsx'), 'utf8');
const modal = readFileSync(join(here, 'components/WebNextModal.tsx'), 'utf8');
const drawer = readFileSync(join(here, 'components/WebNextDrawer.tsx'), 'utf8');
const toast = readFileSync(join(here, 'components/WebNextToastStack.tsx'), 'utf8');
const shell = readFileSync(join(here, 'app/WebNextShell.tsx'), 'utf8');
const app = readFileSync(join(here, '../phoenix/PhoenixApp.tsx'), 'utf8');
const searchCss = readFileSync(join(here, 'styles/search.css'), 'utf8');
const stateCss = readFileSync(join(here, 'styles/states.css'), 'utf8');
const overlayCss = readFileSync(join(here, 'styles/overlays.css'), 'utf8');
const homeCss = readFileSync(join(here, 'styles/home.css'), 'utf8');

assert.match(search, /data-web-next-overlay="search"/);
assert.match(search, /ArrowDown[\s\S]*ArrowUp[\s\S]*Enter/);
assert.match(search, /Buscar tela, lançamento, pendência, cartão, conta, categoria, meta/);
assert.match(searchModel, /data\.events\.items/);
assert.match(searchModel, /data\.cards/);
assert.match(searchModel, /data\.accounts/);
assert.match(searchModel, /data\.categories/);
assert.match(searchModel, /data\.payables/);
assert.match(searchModel, /data\.budgets/);

assert.match(status, /kind:'loading'\|'error'\|'empty'/);
assert.match(modal, /WebNextConfirm/);
assert.match(drawer, /data-web-next-overlay="drawer"/);
assert.match(toast, /mnx-toast-stack/);
assert.match(shell, /WebNextConfirm/);
assert.match(shell, /setLogoutConfirmOpen\(true\)/);
assert.match(shell, /Deseja sair do MEG\?/);

assert.match(app, /WebNextSearchDialog/);
assert.match(app, /buildWebNextSearchCatalog/);
assert.match(app, /WebNextStatus/);
assert.match(app, /results=\{webNextSearchCatalog\}/);
assert.match(app, /onOpen=\{\(result\) => openSearchResult/);

assert.match(searchCss, /position:fixed/);
assert.match(stateCss, /mnx-status-card/);
assert.match(overlayCss, /mnx-modal/);
assert.match(overlayCss, /mnx-drawer/);
assert.match(overlayCss, /mnx-toast-stack/);

assert.doesNotMatch(search + status + modal + drawer + toast + searchCss + stateCss + overlayCss, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'UI global Web Next não pode herdar nomenclatura visual Phoenix.');

assert.doesNotMatch(homeCss, /mnx-home-loading|mnx-home-error/,
  'Estados antigos específicos da Home devem sair após a adoção dos estados canônicos.');

console.log('Web Next global UI contract: OK');
