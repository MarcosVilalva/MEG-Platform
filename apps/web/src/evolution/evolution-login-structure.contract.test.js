import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionLogin.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/login.css', import.meta.url), 'utf8');

assert.match(
  screen,
  /data-evolution-login-fidelity="approved-reference-v3"/,
  'Login deve declarar a referência visual aprovada, não uma interpretação.'
);

assert.match(
  screen,
  /data-evolution-login-structure="faithful-desktop-v1"/,
  'Login deve usar a composição fiel do desktop validado.'
);

for (const literal of [
  'MEG EVOLUTION',
  'Sua vida financeira,',
  'com clareza para',
  'decidir.',
  'Saldo, compromissos e projeções em uma visão única',
  'Saldo real',
  'Visão completa',
  'Projetos',
  'Mais controle',
  'Controle',
  'Decisões melhores',
  'ACESSO SEGURO',
  'Bem-vindo de volta.',
  'Entre na sua conta para acessar o MEG.',
  'seu@email.com',
  'Lembrar meu e-mail',
  'Esqueci minha senha',
  'Entrar no MEG',
  'Ainda não tem acesso?',
  'Criar conta',
  'Sessão protegida',
  'Conexão segura com o MEG',
]) {
  assert.ok(screen.includes(literal), `Texto aprovado ausente no Login: ${literal}`);
}

assert.match(
  screen,
  /function ShieldLockIcon\(\)[\s\S]*<rect x="9" y="10\.5" width="6" height="5\.5"/,
  'Cabeçalho deve usar escudo com cadeado interno.'
);

assert.ok(screen.includes('<BalanceIcon/>'), 'Card Saldo real deve usar o ícone de barras.');
assert.ok(screen.includes('<TargetIcon/>'), 'Card Projetos deve usar o ícone de alvo.');
assert.ok(screen.includes('<ControlsIcon/>'), 'Card Controle deve usar o ícone de controles.');

assert.match(
  screen,
  /\[rememberEmail,setRememberEmail\]=useState\(true\)/,
  'A referência aprovada mostra Lembrar meu e-mail marcado por padrão.'
);

assert.ok(!screen.includes('evo-login-bg'), 'Fundo ilustrado não deve ser recriado por elementos HTML.');
assert.ok(!screen.includes('loading-master.webp'), 'Login não deve reutilizar a arte antiga de Loading.');

assert.match(
  css,
  /background:url\('\/bg-login\.webp'\) center \/ cover no-repeat;/,
  'Fundo deve ser o asset aprovado /bg-login.webp.'
);

assert.match(
  css,
  /\.evo-login::before\{[\s\S]*background:rgba\(0,0,0,\.25\)/,
  'Overlay do fundo deve permanecer rgba(0,0,0,.25).'
);

assert.match(
  css,
  /grid-template-columns:minmax\(0,1fr\) 628px;[\s\S]*padding:0 74px 0 116px;/,
  'Desktop de referência deve preservar a distribuição esquerda/direita medida contra 1672x941.'
);

assert.match(
  css,
  /\.evo-login-card\{[\s\S]*width:628px;[\s\S]*height:752px;[\s\S]*border-radius:29px;/,
  'Card de login deve preservar proporção e raio auditados na referência.'
);

assert.match(
  css,
  /\.evo-login-story h1\{[\s\S]*font-size:80px;[\s\S]*line-height:\.925;/,
  'Título institucional deve manter escala dominante da referência.'
);

assert.match(
  css,
  /\.evo-login-primary\{[\s\S]*height:72px;[\s\S]*linear-gradient\(90deg,#15d9e8 0%,#62efb8 100%\)/,
  'Botão Entrar deve preservar altura e gradiente aprovado.'
);

assert.match(
  css,
  /backdrop-filter:blur\(14px\)/,
  'Card de login deve manter vidro fosco.'
);

assert.match(
  css,
  /@media\(max-width:960px\)\{[\s\S]*flex-direction:column;[\s\S]*\.evo-login-card\{[\s\S]*width:min\(100%,600px\)/,
  'Em telas menores a composição deve empilhar e centralizar o card.'
);

assert.doesNotMatch(
  css,
  /\.evo-login-proof article:nth-child\(n\+2\)\{display:none\}/,
  'Responsividade deve empilhar os três cards, não omitir conteúdo.'
);

console.log('Contrato visual fiel do Login aprovado validado.');
