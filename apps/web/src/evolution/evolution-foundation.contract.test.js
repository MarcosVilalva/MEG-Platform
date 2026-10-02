import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const paths=[
  './main.tsx',
  './app/EvolutionApp.tsx',
  './screens/EvolutionLoading.tsx',
  './screens/EvolutionLogin.tsx',
  './screens/EvolutionSystemEntry.tsx',
  './styles/global.css',
  './styles/tokens.css',
  './styles/loading.css',
  './styles/login.css',
  './styles/system-entry.css'
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
assert.match(loading,/data-evolution-loading-fidelity="master-artwork-responsive-fullscreen"/);
for(const asset of [
  'loading-master.webp',
  'loading-master-wide.webp',
  'loading-master-ultrawide.webp',
  'loading-master-tall.webp'
]){
  assert.ok(loading.includes(asset),'Loading responsivo deve referenciar '+asset);
}
assert.match(loading,/<picture className="evo-loading-picture"/);
assert.match(loading,/min-aspect-ratio: 2\/1/);
assert.match(loading,/max-aspect-ratio: 3\/4/);
assert.match(loading,/role="progressbar"/);
assert.match(loading,/aria-valuenow=\{normalized\}/);
assert.match(loading,/Carregando seus dados/);
assert.match(loading,/Organizando suas finanças/);
assert.doesNotMatch(loading,/evo-loading-backdrop|evo-loading-core|evo-loading-artboard/,'Loading não pode voltar ao artboard quadrado sobre um fundo duplicado.');

const artworks=[
  ['loading-master.webp','a1f092a27506e96dd499d13e2a686bb34048bdf5b2ae7a4096e96f69096e4de3'],
  ['loading-master-wide.webp','d9bac19d7e3096c7b08a2370eb27951417ec8e0beb4c5cc3af2a0dc8f4c82abe'],
  ['loading-master-ultrawide.webp','1e003b84a317ba3ee18a1ce696589268d997031bf2837214aaaae98a7c6b6081'],
  ['loading-master-tall.webp','9ea6db36eb91062a9006452225d67037134f980e30793af55a98135d340c311e']
];
for(const [asset,hash] of artworks){
  const buffer=fs.readFileSync(new URL('../../public/evolution/artwork/'+asset,import.meta.url));
  assert.equal(
    crypto.createHash('sha256').update(buffer).digest('hex'),
    hash,
    asset+' foi alterado sem nova validação visual.'
  );
}

const app=fs.readFileSync(new URL('./app/EvolutionApp.tsx',import.meta.url),'utf8');
assert.match(app,/forcedScreen\|\|'login'/,'Acesso normal ao Evolution deve começar no Login.');
assert.match(app,/onAuthenticated=\{\(\)=>\{/,'Login deve disparar a etapa de carregamento após autenticação.');
assert.match(app,/setPhase\('loading'\)/,'Autenticação deve levar ao Loading.');
assert.match(app,/setPhase\('system'\)/,'Loading deve levar ao sistema.');
assert.doesNotMatch(app,/setPhase\('login'\).*520/,'Loading não pode voltar ao Login.');
assert.match(app,/screen==='login'\|\|screen==='loading'\|\|screen==='system'/,'QA precisa permitir acesso direto às três fases.');

const loginScreen=fs.readFileSync(new URL('./screens/EvolutionLogin.tsx',import.meta.url),'utf8');
assert.match(loginScreen,/data-evolution-login-fidelity="stage-1"/);
assert.match(loginScreen,/Bem-vindo de volta/);
assert.match(loginScreen,/Entrar no MEG/);
assert.match(loginScreen,/login\(email\.trim\(\),password\)/,'Login Evolution deve usar autenticação real.');

const loadingCss=fs.readFileSync(new URL('./styles/loading.css',import.meta.url),'utf8');
assert.match(loadingCss,/width:100vw;/,'Loading deve ocupar toda a largura do viewport.');
assert.match(loadingCss,/height:100dvh;/,'Loading deve ocupar toda a altura do viewport.');
assert.match(loadingCss,/object-fit:cover/,'Cada artwork responsivo deve preencher o viewport.');
assert.match(loadingCss,/--evo-load-left:35\.63%/,'Progresso wide precisa acompanhar a barra do artwork.');
assert.match(loadingCss,/--evo-load-left:38\.27%/,'Progresso ultrawide precisa acompanhar a barra do artwork.');
assert.match(loadingCss,/--evo-load-top:58\.81%/,'Progresso vertical precisa acompanhar a barra do artwork.');
assert.doesNotMatch(loadingCss,/blur\(13px\)|mask-image|evo-loading-backdrop|evo-loading-core/,'Loading fullscreen não pode usar duplicação borrada ou artboard mascarado.');

const systemEntry=fs.readFileSync(new URL('./screens/EvolutionSystemEntry.tsx',import.meta.url),'utf8');
assert.match(systemEntry,/LOGIN <b>→<\/b> LOADING <b>→<\/b> SISTEMA/);
assert.match(systemEntry,/porta técnica temporária/);

const tokens=fs.readFileSync(new URL('./styles/tokens.css',import.meta.url),'utf8');
for(const color of ['#071321','#0a1728','#0d1d2d','#53cf8d','#71dda4','#4bbac7']){
  assert.ok(tokens.toLowerCase().includes(color),'paleta oficial ausente');
}

console.log('MEG Evolution login -> loading fullscreen -> system contract OK');
