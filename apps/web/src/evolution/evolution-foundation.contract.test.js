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
assert.match(loading,/data-evolution-loading-fidelity="master-artwork-fluid-viewport"/);
assert.match(loading,/\.\/evolution\/artwork\/loading-master\.webp/);
assert.match(loading,/evo-loading-atmosphere/);
assert.match(loading,/evo-loading-terrain-left/);
assert.match(loading,/evo-loading-terrain-right/);
assert.match(loading,/role="progressbar"/);
assert.match(loading,/aria-valuenow=\{normalized\}/);
assert.match(loading,/Carregando seus dados/);
assert.match(loading,/Organizando suas finanças/);
assert.doesNotMatch(loading,/loading-master-wide|loading-master-ultrawide|loading-master-tall/,'Loading deve depender apenas do artwork mestre aprovado.');

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
assert.match(loadingCss,/left:calc\(50vw - 25\.55dvh\)/,'Barra landscape deve acompanhar a arte central.');
assert.match(loadingCss,/top:calc\(50dvh \+ 19\.08vw\)/,'Barra portrait deve acompanhar a arte central.');
assert.match(loadingCss,/mask-image:linear-gradient/,'Artwork central deve se fundir ao cenário estendido.');
assert.match(loadingCss,/evo-loading-terrain-left/,'Cenário wide deve prolongar o relevo lateral.');
assert.doesNotMatch(loadingCss,/filter:blur\(13px\)/,'Loading fullscreen não pode usar cópia borrada do artwork.');

const systemEntry=fs.readFileSync(new URL('./screens/EvolutionSystemEntry.tsx',import.meta.url),'utf8');
assert.match(systemEntry,/LOGIN <b>→<\/b> LOADING <b>→<\/b> SISTEMA/);
assert.match(systemEntry,/porta técnica temporária/);

const tokens=fs.readFileSync(new URL('./styles/tokens.css',import.meta.url),'utf8');
for(const color of ['#071321','#0a1728','#0d1d2d','#53cf8d','#71dda4','#4bbac7']){
  assert.ok(tokens.toLowerCase().includes(color),'paleta oficial ausente');
}

console.log('MEG Evolution login -> loading fluid viewport -> system contract OK');
