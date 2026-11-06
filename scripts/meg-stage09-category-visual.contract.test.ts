import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {launchCategoryIcon} from '../apps/web/src/meg-web-evolution/launches/category-icon';
import {launchCategoryPresentation,normalizeCategoryLabel} from '../apps/web/src/meg-web-evolution/launches/category-presentation';
import {launchPaymentPresentation} from '../apps/web/src/meg-web-evolution/launches/payment-presentation';

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
const categoriesFromLiveCatalog=[
 'AUTOMÓVEL','BEBIDAS E SIMILARES','COMUNICAÇÃO','CURSOS',
 'ELETRO/ELETRONICOS/ UTILIDADES','FAST FOOD','HIGIENE PESSOAL',
 'IMÓVEL','LAZER','MAT. ESCOLAR','MOTO','PET','PGTO DE DIVIDAS',
 'PRESENTES','Receitas','SAÚDE','SUPERMERCADO','TITULOS/PREVIDÊNCIA',
 'TRANSPORTE','VESTUÁRIO','COMPRA REEMBOLSÁVEL'
];
for(const label of categoriesFromLiveCatalog){
 assert.notEqual(launchCategoryPresentation(label).icon,'generic',
  'Categoria real não pode permanecer genérica: '+label);
}
assert.equal(launchCategoryPresentation('Sem categoria').icon,'generic');
const knownPaymentLabels=[
 'BOLETO','CARTÃO AZUL','CARTÃO BB','CARTÃO BV','CARTÃO DÉBITO',
 'CARTÃO ITAÚ','CARTÃO KABUM','CARTÃO MAGALU','CARTÃO ML',
 'CARTÃO NUBANK','CARTÃO RIACHUELO','DÉBITO AUTOMÁTICO',
 'DEPÓSITO BANCÁRIO','DINHEIRO','PIX','RIACHUELO','VEROCARD',
 'CARTÃO LATAM PASS'
];
for(const method of knownPaymentLabels){
 assert.notEqual(launchPaymentPresentation(method).kind,'unknown',
  'Forma de pagamento real sem miniatura: '+method);
}
assert.deepEqual(launchPaymentPresentation('PIX'),{kind:'pix',tone:'teal',initials:''});
assert.deepEqual(launchPaymentPresentation('BOLETO'),{kind:'boleto',tone:'amber',initials:''});
assert.equal(launchPaymentPresentation('CARTÃO LATAM PASS').initials,'LP');
assert.equal(launchPaymentPresentation('Pagamento Teste').kind,'unknown');
assert.equal(launchPaymentPresentation('CARTÃO INEXISTENTE').kind,'unknown');

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
const paymentBadge=readFileSync(new URL('../apps/web/src/meg-web-evolution/launches/LaunchPaymentBadge.tsx',import.meta.url),'utf8');
assert.match(paymentBadge,/data-method-kind=\{item\.kind\}/);
assert.match(component,/mode==='live'\?<LaunchPaymentBadge method=\{row\.paymentMethod\}/);
console.log('Etapa 09: catálogo completo de categorias e formas de pagamento, fallback neutro e preview preservado.');
