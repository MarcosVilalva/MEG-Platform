import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionLogin.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/login.css', import.meta.url), 'utf8');

assert.match(screen,/data-evolution-login-structure="fixed-card-v1"/);
assert.match(screen,/evo-login-security-mark/);
assert.match(css,/evo-login-security-mark/);

assert.match(
  css,
  /@media\(max-width:820px\)\{\.evo-login\{height:100dvh;min-height:0;overflow:hidden;padding:12px\}/,
  'Login mobile deve ocupar o viewport sem rolagem geral.'
);

assert.match(
  css,
  /\.evo-login-shell\{width:min\(520px,100%\);height:calc\(100dvh - 24px\);min-height:0;grid-template-columns:1fr;grid-template-rows:auto minmax\(0,1fr\)/,
  'Shell mobile deve reservar área fixa para narrativa e formulário.'
);

assert.match(
  css,
  /\.evo-login-card\{height:100%;max-height:100%;padding:20px;min-height:0;display:flex;flex-direction:column\}/,
  'Card mobile deve permanecer contido no viewport.'
);

assert.match(
  css,
  /\.evo-login-card \.evo-login-form-scroll\{min-height:0;flex:1;overflow:auto\}/,
  'Formulários maiores devem rolar apenas dentro do card.'
);

assert.match(
  screen,
  /com clareza para<br\/>decidir\./,
  'Quebra aprovada do slogan deve permanecer explícita.'
);

console.log('Contrato estrutural do Login validado.');
