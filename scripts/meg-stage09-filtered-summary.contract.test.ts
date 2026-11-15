import assert from 'node:assert/strict';
import {applyFilters} from '../apps/web/src/meg-web-evolution/datagrid/core';
import type {DataGridColumn} from '../apps/web/src/meg-web-evolution/datagrid/types';
import {summarizeMonetaryEvents} from '../apps/api/src/modules/finance/financial-policy';
import {filterHistoryEvents,historyPresentationRow,parseHistoryFilters,type HistoryFilterEvent,type HistoryFilterRequest} from '../apps/api/src/modules/finance/history-filter';

// A seleção é estrutural; o único somador monetário autorizado continua
// sendo summarizeMonetaryEvents da API. Nenhum dado real está neste teste.
const criteria:HistoryFilterRequest['criteria']={
 search:'',kind:'all',category:'all',account:'all',paymentMethod:'all',
 start:'2026-11-01',end:'2026-11-30'
};
const event=(id:string,extras:Partial<HistoryFilterEvent>={}):HistoryFilterEvent=>({
 id,date:new Date('2026-11-05T00:00:00Z'),description:'Mercado exemplo',
 type:'expense',status:'paid',signedAmount:'-10.01',competence:'2026-11',
 accountId:'acc1',categoryId:'cat1',account:{name:'Conta Teste',type:'checking'},
 category:{name:'Alimentação doméstica'},paymentMethod:{name:'PIX'},...extras,
});
const events=[
 event('1'),
 event('2',{description:'Mercado outra despesa',signedAmount:'-20.02',status:'planned'}),
 event('3',{type:'income',description:'Salário',signedAmount:'100.05',category:{name:'Salário'}}),
 event('4',{type:'transfer',description:'Transferência',signedAmount:'-500',category:{name:'Transferência'}}),
 event('5',{description:'Verocard refeição',signedAmount:'-40.40',account:{name:'Conta Benefício',type:'benefit'}}),
 event('6',{date:new Date('2026-10-31T00:00:00Z'),signedAmount:'-40.00'}),
 event('7',{categoryId:null,category:null,sourcePayload:{category:'ROUPAS'},description:'Compra de roupas',signedAmount:'-12.34'}),
];
const all=filterHistoryEvents(events,{criteria,grid:{}});
assert.equal(all.length,6);
const money=summarizeMonetaryEvents(all);
assert.deepEqual({income:money.income,expense:money.expense,projectedResult:money.projectedResult,realizedResult:money.realizedResult},
 {income:100.05,expense:42.37,projectedResult:57.68,realizedResult:77.7});
assert.equal(filterHistoryEvents(events,{criteria:{...criteria,category:'legacy:ROUPAS'},grid:{}})[0]?.id,'7');
const methodLegacy=event('historic-method',{
 paymentMethod:null,sourcePayload:{paymentMethod:'DÉBITO AUTOMÁTICO'},paymentMethodId:null
});
assert.equal(historyPresentationRow(methodLegacy).paymentMethod,'DÉBITO AUTOMÁTICO');
assert.equal(filterHistoryEvents([methodLegacy],{criteria:{...criteria,paymentMethod:'DÉBITO AUTOMÁTICO'},grid:{}}).length,1);
const methodImported=event('imported-method',{
 paymentMethod:null,paymentMethodId:null,sourceDetails:{paymentMethod:'BOLETO'}
});
assert.equal(historyPresentationRow(methodImported).paymentMethod,'BOLETO');
assert.equal(filterHistoryEvents([methodImported],{criteria:{...criteria,paymentMethod:'BOLETO'},grid:{}}).length,1);

assert.equal(filterHistoryEvents(events,{criteria:{...criteria,kind:'income'},grid:{}})[0]?.id,'3');
assert.equal(filterHistoryEvents(events,{criteria:{...criteria,paymentMethod:'PIX'},grid:{}}).length,6);
assert.equal(filterHistoryEvents(events,{criteria:{...criteria,search:'REFEIÇÃO'},grid:{}})[0]?.id,'5');
assert.equal(filterHistoryEvents(events,{criteria:{...criteria,start:'2026-11-06'},grid:{}}).length,0);
const grid={description:{type:'text' as const,operator:'contains',value:'Mercado'},
 signedAmount:{type:'currency' as const,operator:'between',value:'-21',value2:'-10'},
 statusLabel:{type:'enum' as const,selected:['Pago','Planejado']}};
const selected=filterHistoryEvents(events,{criteria,grid});
assert.deepEqual(selected.map(e=>e.id),['1','2']);
const cols:DataGridColumn<Record<string,unknown>>[]=[
 {key:'description',label:'Descrição',type:'text'},
 {key:'signedAmount',label:'Valor',type:'currency'},
 {key:'statusLabel',label:'Status',type:'enum'},
];
const mirrored=applyFilters(all.map(historyPresentationRow),cols,grid);
assert.deepEqual(mirrored.map(row=>row.id),selected.map(e=>e.id),'UI/servidor devem selecionar os mesmos IDs');
const dateSelected={date:{type:'date' as const,operator:'between',value:'2026-11-01',value2:'2026-11-10'}};
assert.deepEqual(filterHistoryEvents(events,{criteria,grid:dateSelected}).map(x=>x.id),all.map(x=>x.id));
const validated=parseHistoryFilters({criteria,grid});
assert.deepEqual(validated.criteria,criteria);
assert.equal(validated.grid.signedAmount?.operator,'between');
for(const bad of [
 {criteria:{...criteria,start:'2026-02-30'},grid:{}},
 {criteria,grid:{balance:{type:'currency'}}},
 {criteria,grid:{signedAmount:{type:'text'}}},
 {criteria,grid:{description:{type:'text',operator:'eval'}}},
 {criteria,grid:{description:{type:'text',selected:Array.from({length:81},()=>'.')}}},
 {criteria,grid:{description:{type:'text',value:{malicious:true}}}},
]){
 assert.throws(()=>parseHistoryFilters(bad),/INVALID_HISTORY_/);
}
console.log('Etapa 09: equivalência de filtros gerais/grade e política monetária canônica validada.');
