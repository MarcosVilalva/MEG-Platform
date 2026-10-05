import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./screens/EvolutionLogin.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles/login.css', import.meta.url), 'utf8');

assert.match(screen,/data-evolution-login-fidelity="approved-reference-v1"/);
assert.match(screen,/data-evolution-login-structure="faithful-login-v2"/);

for(const literal of [
  'MEG EVOLUTION',
  'Sua vida financeira,',
  'com clareza para',
  'decidir.',
  'Saldo, compromissos e projeções em uma visão única',
  'para você saber onde está e para onde está indo.',
  'Saldo real',
  'Visão completa',
  'e atualizada',
  'Projetos',
  'Mais controle',
  'para seus planos',
  'Controle',
  'Decisões melhores',
  'todos os dias',
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
]){
  assert.ok(screen.includes(literal), `Texto aprovado ausente no Login: ${literal}`);
}

assert.match(
  screen,
  /function ShieldLockIcon\(\)[\s\S]*<path d="M12 2\.6 19 5\.8[\s\S]*<rect x="9" y="10\.8"/,
  'Cabeçalho do Login deve usar escudo com cadeado interno.'
);

for(const featureIcon of ['BarsIcon','TargetIcon','SlidersIcon']){
  assert.ok(screen.includes(`<${featureIcon}/>`), `Ícone real do card ${featureIcon} deve existir.`);
}

assert.match(
  css,
  /background:url\('\/bg-login\.webp'\) center \/ cover no-repeat/,
  'O cenário aprovado deve ser arquivo de imagem /bg-login.webp, sem reconstrução CSS.'
);
assert.match(
  css,
  /\.evo-login-overlay\{[\s\S]*background:rgba\(0,0,0,\.25\)/,
  'Overlay desktop deve permanecer rgba(0,0,0,.25).'
);
assert.match(
  css,
  /\.evo-login-card\{[\s\S]*backdrop-filter:blur\(21px\)/,
  'Card deve preservar vidro fosco real.'
);
assert.match(
  css,
  /\.evo-login-card-head\{[\s\S]*grid-template-columns:64px minmax\(0,1fr\)/,
  'Ícone e bloco de título devem manter eixos independentes e o título/subtítulo alinhados.'
);
assert.match(
  css,
  /\.evo-login-proof\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,
  'Desktop deve manter exatamente três cards informativos lado a lado.'
);
assert.match(
  css,
  /@media\(max-width:820px\)[\s\S]*\.evo-login-shell\{[\s\S]*flex-direction:column/,
  'Mobile deve empilhar conteúdo e card.'
);
assert.match(
  css,
  /@media\(max-width:820px\)[\s\S]*\.evo-login-card\{[\s\S]*align-self:center/,
  'Card do Login deve ficar centralizado no mobile.'
);

assert.ok(!css.includes('loading-master.webp'),'Login não pode reutilizar o fundo de Loading.');
assert.ok(!screen.includes('CONTROLE FINANCEIRO PESSOAL'),'Rótulo antigo não pode reaparecer.');
assert.ok(!screen.includes('Saldo e compromissos'),'Cards antigos não podem reaparecer.');

console.log('Contrato fiel do Login aprovado validado.');
