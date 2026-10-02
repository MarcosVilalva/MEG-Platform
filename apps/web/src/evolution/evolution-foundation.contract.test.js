import fs from 'node:fs';
import assert from 'node:assert/strict';

const paths=[
  './main.tsx',
  './app/EvolutionApp.tsx',
  './screens/EvolutionLoading.tsx',
  './styles/global.css',
  './styles/tokens.css',
  './styles/loading.css'
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
assert.match(loading,/Carregando seus dados/);
assert.match(loading,/Organizando suas finanças/);
assert.match(loading,/evo-card-donut/);
assert.match(loading,/evo-card-list/);
assert.match(loading,/evo-card-trend/);
assert.match(loading,/evo-card-target/);
assert.match(loading,/evo-holo-platform/);
assert.match(loading,/evo-scene-glow/);
assert.match(loading,/evo-holo-frame-shine/);
assert.match(loading,/terrain-facet/);
assert.match(loading,/data-evolution-loading-fidelity="cinematic-v2"/);
assert.match(loading,/\.\/evolution\/brand\/meg-mark\.svg/);
assert.doesNotMatch(loading,/meg-finance-system-mark-transparent\.svg/);

const app=fs.readFileSync(new URL('./app/EvolutionApp.tsx',import.meta.url),'utf8');
assert.match(app,/92,100/,'Loading Evolution precisa concluir em 100%');
assert.match(app,/\?\? 100/,'fallback de progresso precisa ser 100%');

const logo=fs.readFileSync(new URL('../../public/evolution/brand/meg-mark.svg',import.meta.url),'utf8');
assert.doesNotMatch(logo,/letter-spacing="-\d/,'logo Evolution não pode comprimir as letras MEG');
assert.match(logo,/>M<\/text>/);
assert.match(logo,/>E<\/text>/);
assert.match(logo,/>G<\/text>/);
assert.match(logo,/>FINANÇAS<\/text>/);
assert.match(logo,/x="25"[\s\S]*>M<\/text>[\s\S]*x="101"[\s\S]*>E<\/text>[\s\S]*x="158"[\s\S]*>G<\/text>/,'logo deve manter separação visual explícita entre M, E e G');

const css=fs.readFileSync(new URL('./styles/loading.css',import.meta.url),'utf8');
assert.match(css,/width:min\(96vw,1080px\)/,'Loading deve ocupar o viewport com presença próxima à prancha.');
assert.match(css,/width:clamp\(190px,19vw,252px\)/,'Logo não pode voltar a ficar pequena no viewport de referência.');
assert.match(css,/max-height:640px/,'Cena holográfica deve manter escala cinematográfica.');
assert.match(css,/0 24px 50px rgba\(0,0,0,.44\)/,'Cards precisam preservar volume e sombra profunda.');
assert.match(css,/rotateX\(67deg\)/,'Plataforma deve preservar perspectiva cinematográfica.');
assert.match(css,/prefers-reduced-motion:reduce/,'Animação deve respeitar preferência de movimento reduzido.');

const tokens=fs.readFileSync(new URL('./styles/tokens.css',import.meta.url),'utf8');
for(const color of ['#071321','#0a1728','#0d1d2d','#53cf8d','#71dda4','#4bbac7']){
  assert.ok(tokens.toLowerCase().includes(color),'paleta oficial ausente');
}

console.log('MEG Evolution foundation contract OK');
