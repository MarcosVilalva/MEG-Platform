import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(join(here, 'app/WebNextShell.tsx'), 'utf8');
const sidebar = readFileSync(join(here, 'components/WebNextSidebar.tsx'), 'utf8');
const topbar = readFileSync(join(here, 'components/WebNextTopbar.tsx'), 'utf8');
const tokens = readFileSync(join(here, 'styles/tokens.css'), 'utf8');
const styles = readFileSync(join(here, 'styles/shell.css'), 'utf8');

assert.match(shell, /data-web-next="shell"/);
assert.match(shell, /WebNextSidebar/);
assert.match(shell, /WebNextTopbar/);
assert.match(sidebar, /Início[\s\S]*Lançamentos[\s\S]*Cartões[\s\S]*Planejamento[\s\S]*Relatórios[\s\S]*Categorias[\s\S]*Metas[\s\S]*Contas[\s\S]*Pendências[\s\S]*Configurações/);
assert.match(topbar, /Olá, \{firstName\}!/);
assert.match(topbar, /onPayables/);
assert.match(topbar, /mnx-top-search[\s\S]*Buscar no MEG/);
assert.match(sidebar, /brandSrc[\s\S]*mnx-brand-mark/);
assert.match(sidebar, /Recolher menu/);
assert.match(sidebar, /Visão financeira[\s\S]*Organização/);
assert.match(sidebar, /Resumo e prioridades[\s\S]*Receitas e despesas/);
assert.match(sidebar, /mnx-sidebar-status[\s\S]*VISÃO FINANCEIRA ATIVA/);
assert.match(tokens, /--mnx-sidebar-expanded:278px/);
assert.match(tokens, /--mnx-topbar-height:84px/);
assert.match(tokens, /--mnx-neon:#43eadb/);
assert.match(styles, /grid-template-columns:var\(--mnx-sidebar-expanded\) minmax\(0,1fr\)/);
assert.match(styles, /block-size:100dvh/);
assert.match(styles, /container-name:mnx-main/);
assert.match(styles, /container-name:mnx-content/);
assert.match(styles, /@media \(max-width:1240px\)/);
assert.match(styles, /@media \(max-width:760px\)/);
assert.doesNotMatch(shell + sidebar + topbar + tokens + styles, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'Fundação Web Next não pode herdar classes ou gerações visuais Phoenix.');
assert.doesNotMatch(styles, /position:\s*fixed/i,
  'Shell Web Next deve usar grid da viewport, não posicionamento fixo legado.');

console.log('Web Next foundation contract: OK');
