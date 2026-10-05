import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionSystem.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/system.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-meg-navigation="adaptive-sidebar-v1"/,
  'A navegação principal deve declarar o contrato adaptativo vigente.'
);

assert.match(
  screen,
  /title=\{label\} aria-label=\{label\}/,
  'Itens recolhidos da sidebar devem preservar nome acessível e dica nativa.'
);

assert.match(
  screen,
  /data-meg-topbar="fixed-tools-v1"/,
  'A topbar deve declarar explicitamente o contrato de ferramentas fixas.'
);

assert.match(
  screen,
  /if\(e\.key==='Enter'&&view==='home'\)go\('movements'\)/,
  'A busca global deve navegar pelo mesmo fluxo canônico da sidebar.'
);

assert.match(
  css,
  /\.meg-system \.meg-sidebar\{[^}]*min-height:0[^}]*overflow:hidden/s,
  'A sidebar deve permanecer contida no viewport.'
);

assert.match(
  css,
  /\.meg-system \.meg-sidebar nav\{[^}]*min-height:0[^}]*overflow-y:auto/s,
  'O menu deve absorver alturas reduzidas com rolagem interna, sem criar scroll global.'
);

assert.match(
  css,
  /@media\(max-width:720px\)[\s\S]*\.meg-system \.meg-period-entry\{[^}]*max-width:46%/s,
  'A topbar mobile deve limitar o seletor de período para preservar a busca.'
);

assert.match(
  css,
  /\.meg-system \.meg-period-entry \.meg-control span\{[^}]*text-overflow:ellipsis[^}]*white-space:nowrap/s,
  'Somente o rótulo longo do período pode truncar no shell estreito.'
);

console.log('Contrato estrutural Evolution: shell, navegação e topbar adaptativos validados.');
