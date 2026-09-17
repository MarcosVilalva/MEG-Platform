import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bridge = readFileSync(new URL('./phoenix-keyboard-grid-bridge.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./phoenix-keyboard-grid.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');

assert.match(main, /phoenix-keyboard-grid-bridge/,
  'Runtime oficial deve ativar a navegação global de grids pelo teclado');
assert.match(bridge, /ArrowUp/);
assert.match(bridge, /ArrowDown/);
assert.match(bridge, /ArrowLeft/);
assert.match(bridge, /ArrowRight/);
assert.match(bridge, /scrollIntoView\(\{ block: 'nearest', inline: 'nearest'/,
  'Navegação deve manter a célula ativa visível sem saltos grandes');
assert.match(bridge, /input, textarea, select/,
  'Setas não podem ser capturadas enquanto o usuário edita um campo');
assert.match(bridge, /blockingOverlayOpen/,
  'Drawers, diálogos e calendários devem preservar o próprio teclado');
assert.match(bridge, /input\[type="checkbox"\]/,
  'Espaço deve poder alternar a seleção da linha quando houver checkbox');
assert.match(bridge, /new MouseEvent\('dblclick'/,
  'Enter deve reutilizar a abertura por duplo clique quando não houver ação explícita');
assert.match(styles, /px-kb-row-active/);
assert.match(styles, /px-kb-cell-active/);

console.log('Contrato de navegação global por teclado da Phoenix validado.');
