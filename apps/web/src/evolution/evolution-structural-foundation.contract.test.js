import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionSystem.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/system.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('./styles/tokens.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-meg-structure="fixed-shell-v2"/,
  'O shell Evolution deve declarar explicitamente o contrato estrutural v2 vigente.'
);

for (const token of [
  '--meg-shell-sidebar',
  '--meg-shell-workspace-y',
  '--meg-shell-workspace-x',
  '--meg-shell-gap',
  '--meg-topbar-height',
  '--meg-panel-radius',
  '--meg-module-gap',
]) {
  assert.ok(tokens.includes(token), `Token estrutural ausente: ${token}`);
}

assert.match(
  css,
  /\.meg-system\{[^}]*height:100dvh[^}]*grid-template-columns:var\(--meg-shell-sidebar\)[^}]*overflow:hidden/s,
  'Shell desktop deve ocupar o viewport e impedir rolagem geral.'
);

assert.match(
  css,
  /\.meg-workspace\{[^}]*min-height:0[^}]*overflow:hidden/s,
  'Workspace deve permanecer contido dentro do viewport.'
);

assert.match(
  css,
  /\.meg-page-content\{[^}]*flex:1[^}]*min-height:0[^}]*overflow:hidden/s,
  'Conteúdo da página não pode criar rolagem geral fora das regiões internas.'
);

assert.match(
  css,
  /\.meg-scroll\{[^}]*overflow:auto/s,
  'Listas e grids densos devem possuir região interna de rolagem.'
);

assert.match(
  css,
  /\.meg-module-grid\{[^}]*height:100%[^}]*min-height:0[^}]*gap:var\(--meg-module-gap\)/s,
  'Módulos devem consumir a área útil sem romper o shell.'
);

assert.match(
  css,
  /@media\(max-width:720px\)/,
  'Breakpoint estrutural de 430 px deve continuar coberto pela camada mobile.'
);

console.log('Contrato estrutural Evolution: shell fixo, viewport e rolagem interna validados.');
