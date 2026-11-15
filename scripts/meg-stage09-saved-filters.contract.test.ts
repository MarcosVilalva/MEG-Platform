import assert from 'node:assert/strict';
import {
 applySavedFilter,cleanGridFilters,monthBounds,readSavedFilters,saveNamedFilter,
 savedFiltersKey,serializeSavedFilters,MAX_SAVED_FILTERS,
} from '../apps/web/src/meg-web-evolution/launches/saved-filters';

const nov=monthBounds('2026-11');
assert.deepEqual(nov,{start:'2026-11-01',end:'2026-11-30'});
const base={
 search:'',kind:'expense',category:'cat-saude',account:'conta-1',
 paymentMethod:'CARTÃO ML',...nov,
};
const grid={
 statusLabel:{type:'enum' as const,selected:['Planejado']},
 description:{type:'text' as const,operator:'contains' as const,value:''},
};
const first=saveNamedFilter([],' Cartão ML ',base,grid,'2026-11','fav-1');
assert.equal(first.length,1);
assert.equal(first[0]?.name,'Cartão ML');
assert.equal(first[0]?.dateMode,'current-month');
assert.deepEqual(first[0]?.gridFilters.statusLabel.selected,['Planejado']);
const parsed=readSavedFilters(serializeSavedFilters(first));
assert.deepEqual(parsed,first);
assert.equal(applySavedFilter(parsed[0]!, '2026-12').start,'2026-12-01');
assert.equal(applySavedFilter(parsed[0]!, '2026-12').end,'2026-12-31');
assert.equal(applySavedFilter(parsed[0]!, '2026-12').paymentMethod,'CARTÃO ML');
assert.equal(applySavedFilter(parsed[0]!, '2026-12').category,'cat-saude');
assert.notEqual(savedFiltersKey('usuario-1'),savedFiltersKey('usuario-2'));
assert.ok(!serializeSavedFilters(parsed).includes('signedAmount'));
assert.throws(()=>saveNamedFilter(parsed,'cartão ml',base,{},'2026-11','fav-2'),/Já existe/);
assert.throws(()=>saveNamedFilter(parsed,'X',base,{},'2026-11','fav-2'),/nome/);
const fixed=saveNamedFilter(parsed,'Intervalo fixo',{...base,start:'2026-10-10',end:'2026-10-15'},grid,'2026-11','fav-2');
assert.equal(fixed[1]?.dateMode,'fixed');
assert.equal(applySavedFilter(fixed[1]!, '2026-12').start,'2026-10-10');
let many=fixed;
while(many.length<MAX_SAVED_FILTERS)many=saveNamedFilter(many,'Filtro '+many.length,base,{},'2026-11','fav-'+many.length);
assert.equal(many.length,12);
assert.throws(()=>saveNamedFilter(many,'Mais um',base,{},'2026-11','outro'),/Limite/);
assert.deepEqual(readSavedFilters('invalid-json'),[]);
assert.deepEqual(readSavedFilters(JSON.stringify({version:5,presets:first})),[]);
assert.deepEqual(cleanGridFilters({
 unknown:{type:'script',value:'alert(1)'},
 statusLabel:{type:'enum',selected:['Planejado',3,null]},
}),{statusLabel:{type:'enum',selected:['Planejado']}});
console.log('Etapa 09: filtros favoritos por usuário, data mensal relativa, limites e filtros de grade verificados.');
