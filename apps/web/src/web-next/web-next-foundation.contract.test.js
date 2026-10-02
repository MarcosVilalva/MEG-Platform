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
assert.match(sidebar, /Principal[\s\S]*Gestão[\s\S]*Inteligência[\s\S]*Sistema/);
assert.match(topbar, /Olá, \{firstName\}!/);
assert.match(topbar, /onPayables/);
assert.match(tokens, /--mnx-sidebar-expanded:248px/);
assert.match(tokens, /--mnx-topbar-height:76px/);
assert.match(tokens, /--mnx-neon:#43eadb/);
assert.match(styles, /grid-template-columns:var\(--mnx-sidebar-expanded\) minmax\(0,1fr\)/);
assert.match(styles, /block-size:100dvh/);
assert.match(styles, /container-name:mnx-main/);
assert.match(styles, /container-name:mnx-content/);
assert.match(styles, /@media \(max-width:1180px\)/);
assert.match(styles, /@media \(max-width:760px\)/);
assert.doesNotMatch(shell + sidebar + topbar + tokens + styles, /\bpx-|phoenix-v|fidelity-v|revolution/i,
  'Fundação Web Next não pode herdar classes ou gerações visuais Phoenix.');
assert.doesNotMatch(styles, /position:\s*fixed/i,
  'Shell Web Next deve usar grid da viewport, não posicionamento fixo legado.');

console.log('Web Next foundation contract: OK');
