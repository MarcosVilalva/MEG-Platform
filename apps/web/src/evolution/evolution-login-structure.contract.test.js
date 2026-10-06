import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionLogin.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/login.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-evolution-login-fidelity="approved-reference-v3"/,
  'Login deve declarar a referência visual aprovada.'
);

for (const literal of [
  'MEG EVOLUTION',
  'Sua vida financeira,',
  'com clareza para',
  'decidir.',
  'Saldo real',
  'Projetos',
  'Controle',
  'ACESSO SEGURO',
  'Bem-vindo de volta.',
  'Entre na sua conta para acessar o MEG.',
  'Lembrar meu e-mail',
  'Esqueci minha senha',
  'Entrar no MEG',
]) {
  assert.ok(screen.includes(literal), `Texto aprovado ausente no Login: ${literal}`);
}

assert.match(
  css,
  /\.evo-login\{[\s\S]*min-height:100dvh;/,
  'Login deve usar min-height:100dvh.'
);

assert.doesNotMatch(
  css,
  /\b(?:100)?vh\b/,
  'Login não deve depender de vh.'
);

assert.match(
  css,
  /\.evo-login::before\{[\s\S]*position:fixed;[\s\S]*inset:0;[\s\S]*background:url\('\/bg-login\.webp'\) 35% center \/ cover no-repeat;/,
  'Fundo deve permanecer fixo e ancorado em 35% center.'
);

assert.match(
  css,
  /\.evo-login-shell\{[\s\S]*max-width:1440px;[\s\S]*margin:0 auto;[\s\S]*grid-template-columns:minmax\(0,1fr\) 420px;[\s\S]*gap:4rem;/,
  'Container desktop deve ser centralizado em 1440px com coluna fixa de 420px.'
);

assert.match(
  css,
  /\.evo-login-card\{[\s\S]*width:420px;[\s\S]*max-width:100%;/,
  'Card desktop deve permanecer em 420px e limitar-se a 100% em telas estreitas.'
);

assert.doesNotMatch(
  css,
  /\.evo-login-card\{[^}]*position:absolute/s,
  'Card não pode usar position:absolute.'
);

assert.doesNotMatch(
  css,
  /\bvw\b/,
  'Layout não deve usar vw.'
);

assert.match(
  css,
  /\.evo-login-field>div\{[\s\S]*overflow:hidden;[\s\S]*box-sizing:border-box;/,
  'Wrapper do input deve proteger o recorte do autofill.'
);

assert.match(
  css,
  /input:-webkit-autofill,[\s\S]*input:-webkit-autofill:focus\{[\s\S]*-webkit-box-shadow:0 0 0 1000px #04161a inset!important;[\s\S]*-webkit-text-fill-color:#fff!important;[\s\S]*caret-color:#fff;[\s\S]*border-radius:inherit;/,
  'Autofill deve preservar fundo, texto, caret e raio.'
);

assert.match(
  css,
  /\.evo-login-notice\{[\s\S]*display:none;/,
  'Mensagem deve ficar oculta por padrão.'
);

assert.match(
  css,
  /\.evo-login-notice-error\{[\s\S]*display:block;/,
  'Mensagem de erro deve aparecer apenas quando houver falha.'
);

const mediaQueries = css.match(/@media\s*\([^)]*\)/g) || [];
assert.deepEqual(
  mediaQueries,
  ['@media(max-width:1180px)','@media(max-width:900px)','@media(max-width:560px)'],
  'Login deve cobrir desktop comprimido, empilhamento e mobile estreito.'
);

assert.match(
  css,
  /@media\(max-width:1180px\)\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(360px,400px\)/,
  'Desktop comprimido deve reduzir a coluna do login sem quebrar a composição.'
);

assert.match(
  css,
  /@media\(max-width:900px\)\{[\s\S]*grid-template-columns:1fr;[\s\S]*\.evo-login-card\{[\s\S]*width:100%;[\s\S]*max-width:440px;/,
  'Em 900px a composição deve empilhar e centralizar o card.'
);

assert.match(
  css,
  /@media\(max-width:560px\)\{[\s\S]*\.evo-login-proof\{[\s\S]*grid-template-columns:1fr/,
  'Mobile estreito deve empilhar os cards informativos.'
);

console.log('Contrato estável do Login em zoom, autofill e resize validado.');
