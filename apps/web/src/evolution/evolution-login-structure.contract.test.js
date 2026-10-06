import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionLogin.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/login.css', import.meta.url), 'utf8');

assert.match(screen,/data-evolution-login-fidelity="approved-reference-v3"/);

for (const literal of [
  'MEG EVOLUTION','Sua vida financeira,','com clareza para','decidir.',
  'Saldo real','Projetos','Controle','ACESSO SEGURO','Bem-vindo de volta.',
  'Entre na sua conta para acessar o MEG.','Lembrar meu e-mail',
  'Esqueci minha senha','Entrar no MEG'
]) assert.ok(screen.includes(literal), `Texto aprovado ausente: ${literal}`);

assert.match(
  screen,
  /<section className="evo-login-shell">[\s\S]*<div className="evo-login-brand-row">[\s\S]*<img className="evo-login-brand"[^>]+>[\s\S]*<div className="evo-login-story">/,
  'Marca deve ter linha estrutural própria antes do story para preservar ordem responsiva e alinhamento.'
);

assert.match(
  css,
  /\.evo-login-shell\{[\s\S]*width:90rem;[\s\S]*height:50\.625rem;[\s\S]*grid-template-areas:[\s\S]*"brand card"[\s\S]*"story card"/,
  'Desktop amplo deve preservar palco 90rem x 50.625rem.'
);

assert.match(
  css,
  /@media \(max-width:1100px\), \(max-aspect-ratio:5\/4\)\{/,
  'Modo compacto deve ativar por largura ou proporção.'
);

assert.match(
  css,
  /@media \(max-width:1100px\), \(max-aspect-ratio:5\/4\)\{[\s\S]*grid-template-areas:[\s\S]*"brand"[\s\S]*"card"[\s\S]*"story"/,
  'Compacto deve ordenar logo, login e conteúdo.'
);

assert.match(
  css,
  /@media \(max-width:1100px\), \(max-aspect-ratio:5\/4\)\{[\s\S]*\.evo-login-card\{[\s\S]*width:100%;[\s\S]*max-width:420px;[\s\S]*margin:0 auto;/,
  'Card compacto deve ocupar 100% até 420px e centralizar.'
);

assert.match(
  css,
  /@media \(max-width:1100px\), \(max-aspect-ratio:5\/4\)\{[\s\S]*\.evo-login-story h1\{[\s\S]*font-size:2rem;[\s\S]*text-align:left;/,
  'Título compacto deve usar 2rem e alinhamento à esquerda.'
);

assert.match(
  css,
  /@media \(min-width:600px\) and \(max-width:1100px\),[\s\S]*\.evo-login-proof\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,
  'Compacto a partir de 600px deve mostrar os três cards em três colunas.'
);

assert.match(
  css,
  /@media \(max-width:1100px\), \(max-aspect-ratio:5\/4\)\{[\s\S]*\.evo-login-proof\{[\s\S]*grid-template-columns:1fr;/,
  'Compacto estreito deve empilhar os cards.'
);

assert.match(
  css,
  /background:url\('\/bg-login\.webp'\) 35% center \/ cover no-repeat;/,
  'Desktop deve manter fundo fixo.'
);

assert.match(
  css,
  /@media \(max-width:1100px\), \(max-aspect-ratio:5\/4\)\{[\s\S]*background-position:60% center;[\s\S]*linear-gradient\(rgba\(2,16,15,\.65\),rgba\(2,16,15,\.85\)\)/,
  'Compacto deve reposicionar fundo e reforçar overlay.'
);

assert.match(css,/\.evo-login-notice\{[\s\S]*display:none;/);
assert.match(css,/\.evo-login-notice-error\{[\s\S]*display:block;/);

assert.match(
  css,
  /input:-webkit-autofill,[\s\S]*input:-webkit-autofill:focus\{[\s\S]*-webkit-box-shadow:0 0 0 1000px #04161a inset!important;[\s\S]*-webkit-text-fill-color:#fff!important;[\s\S]*caret-color:#fff;[\s\S]*border-radius:inherit;/,
  'Autofill deve preservar fundo e borda.'
);

console.log('Contrato responsivo do Login por largura/proporção validado.');
