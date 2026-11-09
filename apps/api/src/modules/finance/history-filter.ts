/**
 * Etapa 09: seleção estrutural de eventos para resumo filtrado CANÔNICO.
 * Esta camada NUNCA soma dinheiro: chamar summarizeMonetaryEvents da política
 * financeira após selecionar somente eventos autorizados.
 * O contrato espelha os filtros gerais e DataGrid. Erro em chave não suportada
 * é bloqueante para não anunciar indicadores incompatíveis com a grade.
 */
export type HistoryCriteria = {
 search:string;kind:string;category:string;account:string;
 paymentMethod:string;start:string;end:string;
};
export type HistoryGridFilter = {
 type:'text'|'number'|'currency'|'date'|'enum'|'boolean';
 operator?:string;value?:string|number|null;value2?:string|number|null;
 selected?:string[];booleanValue?:boolean|null;
};
export type HistoryFilterRequest={criteria:HistoryCriteria;grid:Record<string,HistoryGridFilter>};
export type HistoryFilterEvent={
 id:string;date:Date|string;description:string;type:string;status:string;
 signedAmount:{toString():string}|string|number;competence:string|null;
 accountId:string|null;categoryId:string|null;
 account?:{name:string;type?:string}|null;
 category?:{name:string}|null;paymentMethod?:{name:string}|null;
 sourcePayload?:unknown;sourceDetails?:unknown;importedRow?:{rawData:unknown}|null;
 notes?:string|null;
};
const types=new Set(['text','number','currency','date','enum','boolean']);
const gridColumns:Record<string,HistoryGridFilter['type']>={
 id:'text',date:'date',description:'text',category:'enum',account:'enum',
 paymentMethod:'enum',statusLabel:'enum',typeLabel:'enum',
 competence:'text',signedAmount:'currency'
};
const validOps:Record<string,Set<string>>={
 text:new Set(['contains','notContains','startsWith','endsWith','equals','empty']),
 number:new Set(['eq','neq','gt','gte','lt','lte','between','empty']),
 date:new Set(['between','equals','before','after']),
 enum:new Set([]),boolean:new Set([])
};
validOps.currency=validOps.number;
const typeLabels:Record<string,string>={income:'Receita',expense:'Despesa',transfer:'Transferência',investment:'Investimento',redemption:'Resgate',adjustment:'Ajuste'};
const statusLabels:Record<string,string>={paid:'Pago',planned:'Planejado',confirmed:'Confirmado',draft:'Rascunho',reconciled:'Conciliado',archived:'Arquivado'};
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const string=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max?v:null;
const day=(v:string)=>/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)&&
 !Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function parseHistoryFilters(input:unknown):HistoryFilterRequest {
 if(!obj(input)||!obj(input.criteria)||!obj(input.grid))throw new Error('INVALID_HISTORY_FILTER');
 const c=input.criteria;
 const allowed=new Set(['search','kind','category','account','paymentMethod','start','end']);
 if(Object.keys(c).some(k=>!allowed.has(k)))throw new Error('INVALID_HISTORY_FILTER');
 const criteria={} as HistoryCriteria;
 for(const key of allowed){
  const v=string(c[key],key==='search'?120:160);
  if(v===null)throw new Error('INVALID_HISTORY_FILTER');
  criteria[key as keyof HistoryCriteria]=v;
 }
 if(criteria.start&&!day(criteria.start)||criteria.end&&!day(criteria.end)||
   criteria.start&&criteria.end&&criteria.start>criteria.end)throw new Error('INVALID_HISTORY_FILTER_DATE');
 if(!['all','income','expense','transfer','investment','redemption','adjustment'].includes(criteria.kind))throw new Error('INVALID_HISTORY_FILTER_TYPE');
 if(Object.keys(input.grid).length>12)throw new Error('INVALID_HISTORY_GRID_SIZE');
 const grid:Record<string,HistoryGridFilter>={};
 for(const [key,raw] of Object.entries(input.grid)){
  if(!(key in gridColumns)||!obj(raw)||raw.type!==gridColumns[key]||!types.has(String(raw.type)))throw new Error('INVALID_HISTORY_GRID');
  const type=raw.type as HistoryGridFilter['type'];
  const operator=raw.operator===undefined?undefined:string(raw.operator,24);
  if(operator===null||(operator&&!validOps[type]?.has(operator)))throw new Error('INVALID_HISTORY_GRID_OPERATOR');
  const valueOk=(v:unknown)=>v===undefined||v===null||typeof v==='number'&&Number.isFinite(v)||
   typeof v==='string'&&v.length<=160;
  if(!valueOk(raw.value)||!valueOk(raw.value2))throw new Error('INVALID_HISTORY_GRID_VALUE');
  if(raw.selected!==undefined&&(!Array.isArray(raw.selected)||raw.selected.length>80||
   raw.selected.some((v:unknown)=>typeof v!=='string'||v.length>160)))throw new Error('INVALID_HISTORY_GRID_SELECTED');
  if(raw.booleanValue!==undefined&&raw.booleanValue!==null&&typeof raw.booleanValue!=='boolean')throw new Error('INVALID_HISTORY_GRID_BOOLEAN');
  const accepted=new Set(['type','operator','value','value2','selected','booleanValue','shortcut']);
  if(Object.keys(raw).some(k=>!accepted.has(k)))throw new Error('INVALID_HISTORY_GRID_FIELDS');
  grid[key]={type,operator,value:raw.value as string|number|null|undefined,
   value2:raw.value2 as string|number|null|undefined,selected:raw.selected as string[]|undefined,
   booleanValue:raw.booleanValue as boolean|null|undefined};
 }
 return {criteria,grid};
}
const norm=(v:unknown)=>display(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const display=(v:unknown)=>v===null||v===undefined||v===''?'(vazio)':String(v);
const originalText=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():'';
const keyNorm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function rawLabels(raw:unknown):Map<string,unknown>{
 if(!obj(raw))return new Map();
 return new Map(Object.entries(raw).map(([k,v])=>[keyNorm(k),v]));
}
function label(event:HistoryFilterEvent,explicit:unknown,...aliases:string[]){
 const first=originalText(explicit);if(first)return first;
 const raw=rawLabels(event.importedRow?.rawData);
 for(const alias of aliases){const value=originalText(raw.get(keyNorm(alias)));if(value)return value;}
 return '';
}
function dateKey(v:unknown):string{
 if(v instanceof Date)return v.toISOString().slice(0,10);
 if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v))return v.slice(0,10);
 return '';
}
function numberValue(v:unknown):number|null{
 if(v===null||v===undefined||v==='')return null;
 if(typeof v==='number')return Number.isFinite(v)?v:null;
 let raw=String(v).trim().replace(/\s/g,'').replace(/R\$/gi,'');
 if(raw.includes(',')&&raw.includes('.'))raw=raw.replace(/\./g,'').replace(',','.');
 else if(raw.includes(','))raw=raw.replace(',','.');
 const n=Number(raw);return Number.isFinite(n)?n:null;
}
export function historyPresentationRow(event:HistoryFilterEvent){
 const p=obj(event.sourcePayload)?event.sourcePayload:{};
 const d=obj(event.sourceDetails)?event.sourceDetails:{};
 const category=event.category?.name||(!event.categoryId?originalText(p.category):'')||'Sem categoria';
 const account=event.account?.name||'Sem conta';
 const paymentMethod=event.paymentMethod?.name||originalText(p.paymentMethod)||
  originalText(d.paymentMethod)||label(event,undefined,'FORMA DE PAGAMENTO')||'Não informado';
 return {
  id:event.id,date:dateKey(event.date),description:event.description,
  category,account,paymentMethod,statusLabel:statusLabels[event.status]||event.status,
  typeLabel:typeLabels[event.type]||event.type,
  competence:event.competence||'',signedAmount:Number(event.signedAmount),
  weekday:label(event,d.weekday,'DIA SEMANA','weekday','diaSemana'),
  launchType:label(event,d.launchType,'TP LANCAMENTO','TIPO LANCAMENTO','launchType'),
  expenseClass:label(event,d.expenseClass,'CLASSIFICACAO DA DESPESA','expenseClass'),
  group:label(event,d.group,'GRUPO','group'),
  situation:label(event,d.situation,'SITUACAO','situation'),
  modality:label(event,d.modality,'MODADLIDADE','MODALIDADE','modality'),
  notes:event.notes||'',historicalNotes:label(event,d.observations,'OBSERVACOES','observations')
 };
}
function gridMatch(value:unknown,filter:HistoryGridFilter):boolean{
 const selected=filter.selected;
 const includesSelected=()=>!selected?.length||selected.includes(value===null||value===undefined?'__EMPTY__':String(value));
 if(filter.type==='enum')return includesSelected();
 if(filter.type==='boolean')return filter.booleanValue==null||Boolean(value)===filter.booleanValue;
 if(filter.type==='text'){
  if(filter.operator==='empty')return value==null||String(value).trim()==='';
  const hay=norm(value),needle=filter.value==null||String(filter.value)===''?'':norm(filter.value);
  let matched=true;
  switch(filter.operator||'contains'){
   case 'contains':matched=hay.includes(needle);break;
   case 'notContains':matched=!hay.includes(needle);break;
   case 'startsWith':matched=hay.startsWith(needle);break;
   case 'endsWith':matched=hay.endsWith(needle);break;
   case 'equals':matched=hay===needle;break;
  }
  return matched&&includesSelected();
 }
 if(filter.type==='date'){
  const actual=dateKey(value);
  if(!actual)return false;
  const a=dateKey(filter.value),b=dateKey(filter.value2);
  let matched=true;
  if(a)switch(filter.operator||'equals'){
   case 'equals':matched=actual===a;break;
   case 'before':matched=actual<a;break;
   case 'after':matched=actual>a;break;
   case 'between':matched=Boolean(b)&&actual>=(a<b?a:b)&&actual<=(a<b?b:a);break;
  }
  return matched&&includesSelected();
 }
 const actual=numberValue(value),a=numberValue(filter.value),b=numberValue(filter.value2);
 if(filter.operator==='empty')return actual===null;
 let matched=true;
 if(a!==null)switch(filter.operator||'eq'){
  case 'eq':matched=actual===a;break;
  case 'neq':matched=actual!==a;break;
  case 'gt':matched=actual!==null&&actual>a;break;
  case 'gte':matched=actual!==null&&actual>=a;break;
  case 'lt':matched=actual!==null&&actual<a;break;
  case 'lte':matched=actual!==null&&actual<=a;break;
  case 'between':matched=actual!==null&&b!==null&&actual>=Math.min(a,b)&&actual<=Math.max(a,b);break;
 }
 return matched&&includesSelected();
}
function active(filter:HistoryGridFilter){
 return filter.type==='boolean'?filter.booleanValue!=null:
  Boolean(filter.selected?.length)||filter.operator==='empty'||
  filter.value!==null&&filter.value!==undefined&&String(filter.value)!=='';
}
export function filterHistoryEvents<T extends HistoryFilterEvent>(events:T[],request:HistoryFilterRequest):T[]{
 const {criteria:c,grid}=request;
 return events.filter(event=>{
  const r=historyPresentationRow(event);
  if(c.search&&![r.description,r.category,r.account,r.paymentMethod,r.typeLabel,r.statusLabel,
   r.competence,r.weekday,r.launchType,r.expenseClass,r.group,r.situation,r.modality,r.notes,r.historicalNotes]
   .some(v=>v.toLocaleLowerCase('pt-BR').includes(c.search.toLocaleLowerCase('pt-BR'))))return false;
  if(c.kind!=='all'&&event.type!==c.kind)return false;
  if(c.category!=='all'&&!(event.categoryId===c.category||
   c.category.startsWith('legacy:')&&!event.categoryId&&r.category===c.category.slice(7)))return false;
  if(c.account!=='all'&&event.accountId!==c.account)return false;
  if(c.paymentMethod!=='all'&&r.paymentMethod!==c.paymentMethod)return false;
  if(c.start&&r.date<c.start||c.end&&r.date>c.end)return false;
  return Object.entries(grid).every(([key,filter])=>!active(filter)||gridMatch(r[key as keyof typeof r],filter));
 });
}
