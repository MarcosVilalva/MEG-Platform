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

for(const path of paths){
  const content=fs.readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(content,/\.\.\/phoenix|\/phoenix\/|PhoenixApp|phoenix-/i,`${path} não pode depender do visual Phoenix`);
  assert.doesNotMatch(content,/web-next/i,`${path} não pode depender do Web Next anterior`);
}

const html=fs.readFileSync(new URL('../../evolution.html',import.meta.url),'utf8');
assert.match(html,/data-meg-shell="evolution"/);
assert.match(html,/\/src\/evolution\/main\.tsx/);
assert.doesNotMatch(html,/phoenix/i);

const loading=fs.readFileSync(new URL('./screens/EvolutionLoading.tsx',import.meta.url),'utf8');
assert.match(loading,/Carregando seus dados/);
assert.match(loading,/Organizando suas finanças/);

const tokens=fs.readFileSync(new URL('./styles/tokens.css',import.meta.url),'utf8');
for(const color of ['#071321','#0a1728','#0d1d2d','#53cf8d','#71dda4','#4bbac7']){
  assert.ok(tokens.toLowerCase().includes(color),`paleta oficial ausente: ${color}`);
}

console.log('MEG Evolution foundation contract OK');
