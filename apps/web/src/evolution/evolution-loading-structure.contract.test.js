import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionLoading.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/loading.css', import.meta.url), 'utf8');

assert.match(screen,/data-evolution-loading-structure="viewport-artboard-v1"/);
assert.match(screen,/loading-master\.webp/);
assert.match(screen,/role="progressbar"/);

assert.match(
  css,
  /\.evo-loading\{[^}]*width:100vw;[^}]*height:100dvh;[^}]*overflow:hidden/s,
  'Loading deve ocupar o viewport inteiro sem rolagem.'
);

assert.match(
  css,
  /\.evo-loading-artboard\{[^}]*width:100vw;[^}]*height:100dvh;[^}]*overflow:hidden/s,
  'Artboard deve permanecer contido no viewport.'
);

assert.match(
  css,
  /\.evo-loading-core\{[^}]*left:50%;[^}]*top:50%;[^}]*width:min\(100vw,100dvh\);[^}]*height:min\(100vw,100dvh\);[^}]*translate\(-50%,-50%\)/s,
  'Arte mestre deve permanecer quadrada e centralizada.'
);

assert.match(css,/@media\(min-aspect-ratio:5\/4\)/);
assert.match(css,/@media\(max-aspect-ratio:4\/5\)/);

assert.match(
  css,
  /\.evo-loading-progress\{[^}]*position:absolute;[^}]*left:24\.45%;[^}]*top:69\.08%;[^}]*width:50\.72%/s,
  'Barra de progresso deve permanecer ancorada à arte aprovada.'
);

assert.match(
  css,
  /@media\(prefers-reduced-motion:reduce\)\{[^}]*transition:none/s,
  'Loading deve respeitar preferência por movimento reduzido.'
);

console.log('Contrato estrutural do Loading validado.');
