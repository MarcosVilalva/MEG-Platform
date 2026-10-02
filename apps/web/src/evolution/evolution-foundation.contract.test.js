import fs from 'node:fs';
import crypto from 'node:crypto';
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
assert.match(loading,/data-evolution-loading-fidelity="master-artwork"/);
assert.match(loading,/\.\/evolution\/artwork\/loading-master\.webp/);
assert.match(loading,/role="progressbar"/);
assert.match(loading,/aria-valuenow=\{normalized\}/);
assert.match(loading,/Carregando seus dados/);
assert.match(loading,/Organizando suas finanças/);
assert.doesNotMatch(
  loading,
  /DonutIcon|ListIcon|TrendIcon|TargetIcon|evo-holo-frame|evo-card-donut|terrain-facet/,
  'Loading não pode voltar a redesenhar a prancha com componentes aproximados.'
);

const artwork=fs.readFileSync(new URL('../../public/evolution/artwork/loading-master.webp',import.meta.url));
assert.ok(artwork.length > 50000,'Artwork mestre não pode ser substituído por placeholder.');
assert.equal(
  crypto.createHash('sha256').update(artwork).digest('hex'),
  'a1f092a27506e96dd499d13e2a686bb34048bdf5b2ae7a4096e96f69096e4de3',
  'Artwork mestre do Loading foi alterado sem nova validação visual.'
);

const app=fs.readFileSync(new URL('./app/EvolutionApp.tsx',import.meta.url),'utf8');
assert.match(app,/92,100/,'Loading Evolution precisa concluir em 100%');
assert.match(app,/\?\? 100/,'fallback de progresso precisa ser 100%');

const css=fs.readFileSync(new URL('./styles/loading.css',import.meta.url),'utf8');
assert.match(css,/width:min\(100vw,100dvh\)/,'Artboard deve preservar o quadrado mestre no viewport 1254x1254.');
assert.match(css,/left:24\.45%/,'Barra funcional deve permanecer alinhada à prancha mestre.');
assert.match(css,/top:69\.08%/,'Barra funcional deve permanecer alinhada verticalmente à prancha mestre.');
assert.match(css,/object-fit:contain/,'Artwork mestre não pode ser deformado.');
assert.match(css,/prefers-reduced-motion:reduce/,'Progresso deve respeitar preferência de movimento reduzido.');

const tokens=fs.readFileSync(new URL('./styles/tokens.css',import.meta.url),'utf8');
for(const color of ['#071321','#0a1728','#0d1d2d','#53cf8d','#71dda4','#4bbac7']){
  assert.ok(tokens.toLowerCase().includes(color),'paleta oficial ausente');
}

console.log('MEG Evolution foundation contract OK');
