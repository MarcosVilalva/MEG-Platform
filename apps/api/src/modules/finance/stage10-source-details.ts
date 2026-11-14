/**
 * Projecao autorizada de rotulos historicos para o QA da Etapa 10.
 * Os objetos brutos podem conter dados de importacao nao pertinentes a UI.
 * Nunca expor o JSON inteiro ou promover textos a IDs de contas/categorias.
 */
function normalizedKey(value:string){
 return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function stringFields(raw:unknown):Map<string,string>{
 const fields=new Map<string,string>();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return fields;
 for(const [key,value] of Object.entries(raw)){
  if(typeof value!=='string')continue;
  const text=value.trim();
  if(text)fields.set(normalizedKey(key),text);
 }
 return fields;
}
export function stage10HistoricLabels(importedRaw:unknown,sourcePayload:unknown){
 const imported=stringFields(importedRaw),source=stringFields(sourcePayload);
 const read=(...keys:string[])=>{
  for(const key of keys){
   const normalized=normalizedKey(key);
   const v=imported.get(normalized)||source.get(normalized);
   if(v)return v;
  }
  return '';
 };
 const sourceDetails={
  weekday:read('DIASEMANA','WEEKDAY'),
  launchType:read('TPLANCAMENTO','TIPOLANCAMENTO','LAUNCHTYPE','TYPE'),
  expenseClass:read('CLASSIFICAODADESPESA','CLASSIFICACAODADESPESA','EXPENSECLASS'),
  group:read('GRUPO','GROUP'),
  paymentMethod:read('FORMADEPAGAMENTO','PAYMENTMETHOD'),
  situation:read('SITUACAO','SITUATION','STATUS'),
  modality:read('MODADLIDADE','MODALIDADE','MODALITY'),
  observations:read('OBSERVACOES','OBSERVATIONS','NOTES'),
 };
 // Somente aliases usados pelo fallback de rotulos da grade.
 // IDs estruturais seguem exclusivamente os FKs tipados do FinancialEvent.
 const category=read('CATEGORY','CATEGORIA');
 const paymentMethod=read('PAYMENTMETHOD','FORMADEPAGAMENTO');
 return {
  sourceDetails:Object.values(sourceDetails).some(Boolean)?sourceDetails:null,
  sourcePayload:category||paymentMethod?{
   ...(category?{category}:{}),
   ...(paymentMethod?{paymentMethod}:{}),
  }:null,
 };
}
