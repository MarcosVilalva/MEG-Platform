import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const paths=[
  './main.tsx',
  './app/EvolutionApp.tsx',
  './screens/EvolutionLoading.tsx',
  './screens/EvolutionLogin.tsx',
  './screens/EvolutionHome.tsx',
  './styles/global.css',
  './styles/tokens.css',
  './styles/loading.css',
  './styles/login.css',
  './styles/home.css'
];

for(const filePath of paths){
  const content=fs.readFileSync(new URL(filePath,import.meta.url),'utf8');
  assert.doesNotMatch(content,/\.\.\/phoenix|\/phoenix\/|PhoenixApp|phoenix-/i,'Evolution não pode depender do visual Phoenix');
  assert.doesNotMatch(content,/web-next/i,'Evolution não pode depender do Web Next anterior');
}

const html=fs.readFileSync(new URL('../../evolution.html',import.meta.url),'utf8');
assert.match(html,/data-meg-shell="evolution"/);
assert.match(html,/\/src\/evolution\/main\.tsx/);
assert.doesNotMatch(html,/phoenix/i);

const loading=fs.readFileSync(new URL('./screens/EvolutionLoading.tsx',import.meta.url),'utf8');
assert.match(loading,/data-evolution-loading-fidelity="master-artwork-fullscreen"/);
assert.match(loading,/\.\/evolution\/artwork\/loading-master\.webp/);
assert.match(loading,/role="progressbar"/);
assert.match(loading,/aria-valuenow=\{normalized\}/);
assert.match(loading,/Carregando seus dados/);
assert.match(loading,/Organizando suas finanças/);

const artwork=fs.readFileSync(new URL('../../public/evolution/artwork/loading-master.webp',import.meta.url));
assert.ok(artwork.length > 50000,'Artwork mestre não pode ser substituído por placeholder.');
assert.equal(
  crypto.createHash('sha256').update(artwork).digest('hex'),
  'a1f092a27506e96dd499d13e2a686bb34048bdf5b2ae7a4096e96f69096e4de3',
  'Artwork mestre do Loading foi alterado sem nova validação visual.'
);

const app=fs.readFileSync(new URL('./app/EvolutionApp.tsx',import.meta.url),'utf8');
assert.match(app,/forcedScreen\|\|'login'/,'Acesso normal ao Evolution deve começar no Login.');
assert.match(app,/onAuthenticated=\{\(\)=>\{/,'Login deve disparar a etapa de carregamento após autenticação.');
assert.match(app,/setPhase\('loading'\)/,'Autenticação deve levar ao Loading.');
assert.match(app,/setPhase\('system'\)/,'Loading deve levar ao sistema.');
assert.match(app,/phase==='system'\)return <EvolutionHome\/>/,'Sistema deve abrir a Home Evolution.');
assert.doesNotMatch(app,/EvolutionSystemEntry/,'Porta técnica temporária deve sair do fluxo.');
assert.match(app,/screen==='login'\|\|screen==='loading'\|\|screen==='system'/,'QA precisa permitir acesso direto às três fases.');

const loginScreen=fs.readFileSync(new URL('./screens/EvolutionLogin.tsx',import.meta.url),'utf8');
assert.match(loginScreen,/data-evolution-login-fidelity="stage-1"/);
assert.match(loginScreen,/Bem-vindo de volta/);
assert.match(loginScreen,/Entrar no MEG/);
assert.match(loginScreen,/login\(email\.trim\(\),password\)/,'Login Evolution deve usar autenticação real.');

const loadingCss=fs.readFileSync(new URL('./styles/loading.css',import.meta.url),'utf8');
assert.match(loadingCss,/\.evo-loading-artboard\{[\s\S]*width:100vw;[\s\S]*height:100dvh;/,'Loading deve ocupar todo o viewport.');
assert.match(loadingCss,/filter:blur\(13px\) brightness\(\.68\)/,'Extensão visual deve preencher a tela sem criar um quadrado destacado.');
assert.match(loadingCss,/mask-image:linear-gradient/,'Artwork central deve se fundir ao cenário estendido.');

const home=fs.readFileSync(new URL('./screens/EvolutionHome.tsx',import.meta.url),'utf8');
assert.match(home,/data-evolution-home-fidelity="command-center-stage-1"/);
assert.match(home,/Seu dinheiro,/);
assert.match(home,/mais inteligente\./);
assert.match(home,/Fluxo de caixa/);
assert.match(home,/Meus cartões/);
assert.match(home,/Metas em andamento/);
assert.match(home,/Últimas movimentações/);
assert.match(home,/Próximos vencimentos/);
assert.match(home,/Resumo do mês/);
assert.match(home,/financeClient\.getSummary/,'Home deve usar dados financeiros reais quando autenticada.');
assert.match(home,/cardsClient\.list/,'Home deve usar cartões reais quando autenticada.');
assert.match(home,/payablesClient\.list/,'Home deve usar vencimentos reais quando autenticada.');

const homeCss=fs.readFileSync(new URL('./styles/home.css',import.meta.url),'utf8');
assert.match(homeCss,/grid-template-columns:214px minmax\(0,1fr\)/,'Desktop deve preservar sidebar integrada.');
assert.match(homeCss,/height:100dvh/,'Home deve ocupar o viewport.');
assert.match(homeCss,/overflow:hidden/,'Home não deve depender de scroll geral.');
assert.match(homeCss,/evo-home-scroll/,'Listas densas devem usar scroll interno.');
assert.match(homeCss,/@media\(max-width:900px\)/,'Home precisa recompor a experiência em viewport estreito.');

const tokens=fs.readFileSync(new URL('./styles/tokens.css',import.meta.url),'utf8');
for(const color of ['#071321','#0a1728','#0d1d2d','#53cf8d','#71dda4','#4bbac7']){
  assert.ok(tokens.toLowerCase().includes(color),'paleta oficial ausente');
}

console.log('MEG Evolution auth -> loading -> Home Command Center contract OK');
