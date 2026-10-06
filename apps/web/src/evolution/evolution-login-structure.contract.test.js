import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionLogin.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/login.css', import.meta.url), 'utf8');

assert.match(screen,/data-evolution-login-fidelity="fluid-responsive-v1"/);
assert.match(screen,/data-evolution-login-structure="mobile-first-v1"/);

for (const literal of [
  'MEG EVOLUTION','Sua vida financeira,','com clareza para','decidir.',
  'Saldo real','Projetos','Controle','ACESSO SEGURO','Bem-vindo de volta.',
  'Entre na sua conta para acessar o MEG.','Lembrar meu e-mail',
  'Esqueci minha senha','Entrar no MEG','Ainda não tem acesso?','Criar conta',
  'Sessão protegida','Conexão segura com o MEG'
]) {
  assert.ok(screen.includes(literal), `Texto aprovado ausente: ${literal}`);
}

assert.match(
  screen,
  /<main[\s\S]*className="evo-login page"[\s\S]*<section className="evo-login-hero hero">[\s\S]*<section className="evo-login-auth auth">/,
  'Estrutura deve ser page + hero + auth.'
);

assert.match(
  screen,
  /const \[email,setEmail\]=useState\(''\)/,
  'E-mail deve iniciar vazio, sem valor pre-preenchido.'
);

assert.match(
  css,
  /\.evo-login\{[\s\S]*min-height:100dvh;[\s\S]*display:flex;[\s\S]*flex-direction:column;[\s\S]*gap:1\.5rem;[\s\S]*padding:1rem;/,
  'Mobile deve ser flex-column, fluido e com min-height 100dvh.'
);

assert.match(
  css,
  /\.evo-login::before\{[\s\S]*position:fixed;[\s\S]*inset:0;[\s\S]*z-index:-1;[\s\S]*background:url\('\/bg-login\.webp'\) 60% center \/ cover no-repeat;/,
  'Fundo deve ser fixo em 60% center.'
);

assert.match(
  css,
  /background:linear-gradient\(rgba\(2,16,15,\.65\),rgba\(2,16,15,\.85\)\)/,
  'Mobile/tablet deve usar overlay escuro vertical.'
);

assert.match(
  css,
  /@media \(min-width:1024px\)\{[\s\S]*background:linear-gradient\(90deg,rgba\(2,16,15,\.80\) 0%,rgba\(2,16,15,\.35\) 50%,rgba\(2,16,15,\.55\) 100%\)/,
  'Desktop deve usar overlay horizontal.'
);

const mediaQueries = css.match(/@media\s*\([^)]*\)/g) || [];
assert.deepEqual(
  mediaQueries,
  ['@media (min-width:640px)','@media (min-width:1024px)'],
  'Login deve ter apenas os breakpoints 640px e 1024px.'
);

assert.match(
  css,
  /@media \(min-width:640px\)\{[\s\S]*max-width:44rem;[\s\S]*padding:2rem;[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,
  'Tablet deve ser empilhado e usar tres cards em linha.'
);

assert.match(
  css,
  /@media \(min-width:1024px\)\{[\s\S]*max-width:90rem;[\s\S]*grid-template-columns:minmax\(0,1fr\) 26rem;[\s\S]*column-gap:clamp\(2rem,8vw,10rem\);/,
  'Desktop deve usar duas colunas fluidas.'
);

assert.match(
  css,
  /\.evo-login-card\{[\s\S]*width:100%;[\s\S]*max-width:26rem;[\s\S]*margin-inline:auto;/,
  'Card mobile/tablet deve ser 100% ate 26rem.'
);

assert.match(
  css,
  /@media \(min-width:1024px\)\{[\s\S]*\.evo-login-card\{[\s\S]*width:26rem;[\s\S]*max-width:100%;/,
  'Card desktop deve usar 26rem.'
);

assert.match(
  css,
  /\.evo-login-hero h1\{[\s\S]*font-size:clamp\(1\.75rem,7vw,2\.25rem\)/,
  'Titulo mobile deve usar clamp responsivo.'
);

assert.match(
  css,
  /@media \(min-width:1024px\)\{[\s\S]*\.evo-login-hero h1\{[\s\S]*font-size:clamp\(2\.5rem,1\.2rem \+ 2\.6vw,3\.75rem\)/,
  'Titulo desktop deve usar clamp aprovado.'
);

assert.match(
  css,
  /\.evo-login-head-copy h2\{[\s\S]*font-size:clamp\(1\.5rem,1\.1rem \+ 1vw,2rem\);[\s\S]*overflow-wrap:anywhere;/,
  'Bem-vindo deve quebrar sem estourar o card.'
);

assert.match(
  css,
  /\.evo-login-options\{[\s\S]*flex-wrap:wrap;/,
  'Linha lembrar/esqueci deve aceitar wrap.'
);

assert.match(
  css,
  /\.evo-login-notice\{[\s\S]*display:none;/,
  'Erro deve ficar oculto por padrao.'
);

assert.match(
  css,
  /\.evo-login-notice-error\{[\s\S]*display:block;/,
  'Erro deve aparecer apenas quando houver falha.'
);

assert.match(
  css,
  /\.evo-login-field>div\{[\s\S]*overflow:hidden;[\s\S]*box-sizing:border-box;[\s\S]*border-radius:/,
  'Wrapper de input deve preservar autofill e borda.'
);

assert.match(
  css,
  /input:-webkit-autofill,[\s\S]*input:-webkit-autofill:focus\{[\s\S]*-webkit-box-shadow:0 0 0 1000px #04161a inset!important;[\s\S]*-webkit-text-fill-color:#fff!important;[\s\S]*caret-color:#fff;[\s\S]*border-radius:inherit;/,
  'Autofill deve preservar fundo, texto, caret e raio.'
);

assert.doesNotMatch(css,/height:\s*100vh|height:\s*100dvh|\b100vh\b/,'Blocos nao podem usar altura fixa de viewport.');
assert.doesNotMatch(css,/position:absolute[^;]*;[^}]*?(?:top|left|right|bottom):/s,'Layout nao deve depender de posicionamento absoluto.');
assert.doesNotMatch(css,/transition:[^;]*(?:width|height|top|left|margin)/,'Nao deve animar geometria.');

console.log('Contrato mobile-first e fluido do Login validado.');
