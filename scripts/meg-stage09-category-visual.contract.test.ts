import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {launchCategoryIcon} from '../apps/web/src/meg-web-evolution/launches/category-icon';
import {launchCategoryPresentation,normalizeCategoryLabel} from '../apps/web/src/meg-web-evolution/launches/category-presentation';

// Apenas nomes de categoria: não há valor, status, tipo, pagamento ou saldo.
const expected=[
 ['Saúde','health','rose'],['SUPERMERCADO','marketCart','amber'],
 ['Carro','transport','blue'],['MotO','motorcycle','violet'],
 ['PET','petPaw','apricot'],['Alimentação','food','mint'],
 ['DINHEIRO','income','teal'],['Educação','education','lavender'],
 ['Mercado de bairro','marketCart','amber'],['Veterinária','petPaw','apricot'],
 ['Cursos','education','lavender'],['Imóvel','home','aqua'],
] as const;
for(const [name,icon,tone] of expected){
 const result=launchCategoryPresentation(name);
 assert.equal(result.icon,icon,'Ícone incorreto para '+name);
 assert.equal(result.tone,tone,'Cor incorreta para '+name);
 assert.equal(launchCategoryPresentation(name.toLocaleLowerCase('pt-BR')).icon,icon);
}
assert.equal(normalizeCategoryLabel('  SAÚDE  '),'saude');
for(const unknown of ['Sem categoria','Categoria Original','Supermercado inexistente','Moto com carro','']){
 const result=launchCategoryPresentation(unknown);
 assert.equal(result.icon,launchCategoryIcon(unknown),'Não classificar categoria desconhecida por aproximação.');
 assert.equal(result.icon,'generic');
 assert.equal(result.tone,'neutral');
}
assert.equal(launchCategoryIcon('Supermercado'),'grocery','Modo demonstrativo oficial permanece como antes.');
const component=readFileSync(new URL('../apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx',import.meta.url),'utf8');
assert.match(component,/mode==='live'\s*\? <LaunchCategoryBadge category=\{row\.category\}/);
assert.match(component,/label==='Categoria'\?<LaunchCategoryBadge category=\{value\}/);
const svg=readFileSync(new URL('../apps/web/src/meg-web-evolution/launches/icon-packs/category-semantic-extended.tsx',import.meta.url),'utf8');
for(const id of ['marketCart','motorcycle','petPaw'])assert.match(svg,new RegExp("'"+id+"':"));
assert.doesNotMatch(component,/categoryId\s*\?\s*setCategoryId/);
console.log('Etapa 09: oito categorias semânticas, desconhecidas neutras e preview visual preservado.');
