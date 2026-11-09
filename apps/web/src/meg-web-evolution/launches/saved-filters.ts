import type {DataGridFilterState} from '../datagrid/types';

/**
 * Etapa 09: preferências de CONSULTA, nunca eventos financeiros.
 * Armazenamento local e isolado pelo ID autenticado. A sincronização entre
 * dispositivos exigirá contrato de preferências de usuário na API própria.
 */
export type LaunchesFilterPreset={
 search:string;kind:string;category:string;account:string;paymentMethod:string;start:string;end:string;
};
export type SavedLaunchesFilter={
 id:string;name:string;criteria:LaunchesFilterPreset;
 gridFilters:DataGridFilterState;dateMode:'current-month'|'fixed';
};
export const MAX_SAVED_FILTERS=12;
const allowedTypes=new Set(['text','number','currency','date','enum','boolean']);
const allowedOperators=new Set(['contains','notContains','startsWith','endsWith','equals','empty',
 'eq','neq','gt','gte','lt','lte','between','before','after']);
const allowedShortcuts=new Set(['today','thisWeek','thisMonth','lastMonth','last30Days','thisYear']);

export const monthBounds=(month:string)=>{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Período de consulta inválido.');
 const [year,n]=month.split('-').map(Number);
 return {start:month+'-01',end:new Date(Date.UTC(year,n,0)).toISOString().slice(0,10)};
};
export const savedFiltersKey=(userId:string)=>'meg-web-evolution:stage09:saved-filters:v1:'+encodeURIComponent(userId);

function safeString(value:unknown,max:number){return typeof value==='string'?value.trim().slice(0,max):'';}
function safeDate(value:unknown){
 const s=safeString(value,10);
 if(!s)return '';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s+'T12:00:00Z')))return '';
 return s;
}
export function cleanCriteria(raw:unknown):LaunchesFilterPreset {
 const v:Record<string,unknown>=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
 return {
  search:safeString(v.search,120),
  kind:safeString(v.kind,28)||'all',
  category:safeString(v.category,150)||'all',
  account:safeString(v.account,150)||'all',
  paymentMethod:safeString(v.paymentMethod,150)||'all',
  start:safeDate(v.start),end:safeDate(v.end),
 };
}
export function cleanGridFilters(raw:unknown):DataGridFilterState {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 const output:DataGridFilterState={};
 for(const [key,data] of Object.entries(raw).slice(0,25)){
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)||!data||typeof data!=='object'||Array.isArray(data))continue;
  const item=data as Record<string,unknown>;
  if(!allowedTypes.has(String(item.type)))continue;
  const filter:DataGridFilterState[string]={type:item.type as DataGridFilterState[string]['type']};
  if(typeof item.operator==='string'&&allowedOperators.has(item.operator))filter.operator=item.operator as NonNullable<typeof filter.operator>;
  if(typeof item.value==='string'||typeof item.value==='number'&&Number.isFinite(item.value)||item.value===null)filter.value=typeof item.value==='string'?item.value.slice(0,160):item.value as number|null;
  if(typeof item.value2==='string'||typeof item.value2==='number'&&Number.isFinite(item.value2)||item.value2===null)filter.value2=typeof item.value2==='string'?item.value2.slice(0,160):item.value2 as number|null;
  if(Array.isArray(item.selected))filter.selected=item.selected.filter((entry):entry is string=>typeof entry==='string').slice(0,80).map(s=>s.slice(0,160));
  if(typeof item.booleanValue==='boolean'||item.booleanValue===null)filter.booleanValue=item.booleanValue;
  if(typeof item.shortcut==='string'&&allowedShortcuts.has(item.shortcut))filter.shortcut=item.shortcut as NonNullable<typeof filter.shortcut>;
  output[key]=filter;
 }
 return output;
}
export function readSavedFilters(raw:string|null):SavedLaunchesFilter[] {
 if(!raw||raw.length>120_000)return [];
 try{
  const payload=JSON.parse(raw) as {version?:unknown;presets?:unknown};
  if(payload?.version!==1||!Array.isArray(payload.presets))return [];
  const names=new Set<string>();
  const result:SavedLaunchesFilter[]=[];
  for(const item of payload.presets.slice(0,MAX_SAVED_FILTERS)){
   if(!item||typeof item!=='object'||Array.isArray(item))continue;
   const entry=item as Record<string,unknown>;
   const id=safeString(entry.id,80),name=safeString(entry.name,40);
   if(!id||!name||!entry.criteria||!entry.dateMode||!['current-month','fixed'].includes(String(entry.dateMode)))continue;
   const normalized=name.toLocaleLowerCase('pt-BR');
   if(names.has(normalized))continue;
   names.add(normalized);
   result.push({id,name,criteria:cleanCriteria(entry.criteria),
    gridFilters:cleanGridFilters(entry.gridFilters),
    dateMode:entry.dateMode as SavedLaunchesFilter['dateMode']});
  }
  return result;
 }catch{return [];}
}
export function saveNamedFilter(
 previous:SavedLaunchesFilter[],nameInput:string,criteria:LaunchesFilterPreset,advanced:DataGridFilterState,
 periodMonth:string,id:string,
):SavedLaunchesFilter[] {
 const name=nameInput.trim().replace(/\s+/g,' ');
 if(name.length<2||name.length>40)throw new Error('O nome deve ter entre 2 e 40 caracteres.');
 if(previous.length>=MAX_SAVED_FILTERS)throw new Error('Limite de 12 filtros favoritos atingido.');
 if(previous.some(item=>item.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))
  throw new Error('Já existe um filtro salvo com esse nome.');
 const bounds=monthBounds(periodMonth);
 const cleaned=cleanCriteria(criteria);
 const dateMode=cleaned.start===bounds.start&&cleaned.end===bounds.end?'current-month':'fixed';
 return [...previous,{id,name,criteria:cleaned,gridFilters:cleanGridFilters(advanced),dateMode}];
}
export function applySavedFilter(saved:SavedLaunchesFilter,periodMonth:string):LaunchesFilterPreset {
 const criteria=cleanCriteria(saved.criteria);
 return saved.dateMode==='current-month'?{...criteria,...monthBounds(periodMonth)}:criteria;
}
export function serializeSavedFilters(presets:SavedLaunchesFilter[]){
 return JSON.stringify({version:1,presets:presets.slice(0,MAX_SAVED_FILTERS)});
}
