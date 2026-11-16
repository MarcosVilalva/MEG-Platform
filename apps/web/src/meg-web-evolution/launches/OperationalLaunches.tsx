import {useCallback, useEffect, useRef, useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
import type {Account, Category, PaymentMethod, FinanceSummary, FinancialEvent, CanonicalFilteredHistorySummary} from '../../app/finance-client';
import type {DataGridFilterState} from '../datagrid/types';
import {financeClient} from '../../app/finance-client';
import type {HomeFinancialData} from '../home/HomeDashboard';
import {LaunchesStage09, type LaunchesFilterPreset} from './LaunchesStage09';
import type {QaLaunchTarget} from '../stage10/LaunchActionsQa';
import {displayMoney, readAuthorizedHistory, readSmartAuthorizedHistory, type HistoryProgress} from './authorized-history';
import {filterEventsForPeriod,periodForMonth,type LaunchPeriod} from './period-scope';

const todayBrazil = () => {
 const parts = new Intl.DateTimeFormat('en-US', {
  timeZone:'America/Sao_Paulo', year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date());
 const get = (part:string) => parts.find(item=>item.type===part)?.value||'';
 return get('year')+'-'+get('month')+'-'+get('day');
};

// Rótulos legados são apenas dados de exibição, nunca cadastram categoria
// nem criam vinculação financeira, nem participam de cálculos monetários.
function rawLabel(value:unknown):string|undefined {
 return typeof value==='string' && value.trim() ? value.trim() : undefined;
}

// Recupera apenas rótulos textuais existentes. Não cria classificações ou regras.
function historicKey(value:string):string{
 return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function historicLabels(event:FinancialEvent){
 const raw=new Map(Object.entries(event.sourcePayload??{}).map(([key,value])=>[historicKey(key),value]));
 const lookup=(explicit:unknown,...aliases:string[])=>{
  const declared=rawLabel(explicit);
  if(declared)return declared;
  for(const alias of aliases){
   const text=rawLabel(raw.get(historicKey(alias)));
   if(text)return text;
  }
  return '';
 };
 return {
  weekday:lookup(event.sourceDetails?.weekday,'DIA SEMANA','weekday','diaSemana'),
  launchType:lookup(event.sourceDetails?.launchType,'TP LANCAMENTO','TIPO LANCAMENTO','launchType'),
  expenseClass:lookup(event.sourceDetails?.expenseClass,'CLASSIFICACAO DA DESPESA','CLASSIFICAO DA DESPESA','expenseClass'),
  group:lookup(event.sourceDetails?.group,'GRUPO','group'),
  situation:lookup(event.sourceDetails?.situation,'SITUACAO','situation'),
  modality:lookup(event.sourceDetails?.modality,'MODADLIDADE','MODALIDADE','modality'),
  observations:lookup(event.sourceDetails?.observations,'OBSERVACOES','observations'),
 };
}

function buildReadOnlyData(
 events:FinancialEvent[], summary:FinanceSummary|null, accounts:Account[],
 categories:Category[], methods:PaymentMethod[], includeAccountTypes=false,
):HomeFinancialData {
 const nameAccounts = new Map(accounts.map(a=>[a.id, a.name]));
 const accountTypes = new Map(accounts.map(a=>[a.id,a.type]));
 const nameCategories = new Map(categories.map(c=>[c.id, c.name]));
 const nameMethods = new Map(methods.map(m=>[m.id, m.name]));
 for(const event of events){
  if(event.accountId && event.account?.name) nameAccounts.set(event.accountId,event.account.name);
  if(event.categoryId && event.category?.name) nameCategories.set(event.categoryId,event.category.name);
  if(event.paymentMethodId && event.paymentMethod?.name) nameMethods.set(event.paymentMethodId,event.paymentMethod.name);
 }
 const transactions = events.map(event=>({
  id:event.id, date:event.date.slice(0,10), description:event.description,
  type:event.type, status:event.status,
  amount:displayMoney(event.amount), signedAmount:displayMoney(event.signedAmount),
  categoryId:event.categoryId,accountId:event.accountId,
  legacyCategoryName:!event.categoryId ? rawLabel(event.sourcePayload?.category) : undefined,
  paymentMethodName:event.paymentMethod?.name
   || (event.paymentMethodId ? nameMethods.get(event.paymentMethodId) : undefined)
   || rawLabel(event.sourcePayload?.paymentMethod)
   || rawLabel(event.sourceDetails?.paymentMethod),
  notes:event.notes||'',
  sourceDetails:event.sourceDetails,
  sourceLabels:historicLabels(event),
  competence:event.competence,
 }));
 return {
  summary:summary?{
   month:summary.month,income:summary.income,expense:summary.expense,
   projectedResult:summary.projectedResult,realizedResult:summary.realizedResult,
   pendingCount:summary.pendingCount,pendingAmount:summary.pendingAmount
  }:null,
  cashflow:null,benefit:null,available:null,transactions,payables:[],cards:[],
  accounts:[...nameAccounts].map(([id,name])=>({id,name,...(includeAccountTypes&&accountTypes.has(id)?{type:accountTypes.get(id)}:{})})),
  categories:[...nameCategories].map(([id,name])=>({id,name}))
 };
}
/**
 * The live financial API provides every event in a selected civil month
 * through one canonical authenticated GET, instead of 76 global page reads.
 * Nothing here interprets a single month as the entire historical dataset.
 */
async function readVerifiedMonthlyEvents(month:string,signal:AbortSignal):Promise<FinancialEvent[]>{
 const result=await financeClient.listEventsForMonth(month,signal);
 if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
 if(!result||result.page!==1||!Array.isArray(result.items)
  ||!Number.isSafeInteger(result.total)||result.total!==result.items.length
  ||result.pageSize!==result.items.length){
  throw new Error('A API retornou histórico mensal incompleto. Nenhum resultado parcial foi mostrado.');
 }
 const unique=new Set<string>();
 for(const event of result.items){
  if(!event||typeof event.id!=='string'||!event.id||unique.has(event.id)
   ||typeof event.date!=='string'||!event.date.startsWith(month+'-')){
   throw new Error('A API retornou registros inválidos para o mês selecionado.');
  }
  unique.add(event.id);
 }
 return result.items;
}

/** Historico ativo integral, autenticado e consistente, sem fallback duplo. */
async function readVerifiedHistoricalSnapshot(signal:AbortSignal):Promise<FinancialEvent[]>{
 const data=await financeClient.getHistorySnapshot(signal);
 if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
 if(data.kind==='limit-exceeded')throw new Error(
  'O historico ativo ultrapassa o limite de '+data.limit.toLocaleString('pt-BR')+
  ' registros desta API. Nenhum resultado parcial foi exibido.');
 if(data.kind!=='complete'||data.protocol!=='financial-history-v1'||
  data.consistency!=='repeatable-read'||!Number.isSafeInteger(data.total)||
  data.total<0||data.total>5000||!Array.isArray(data.items)||data.items.length!==data.total){
  throw new Error('A API nao confirmou o snapshot integral e consistente do historico ativo.');
 }
 const ids=new Set<string>();
 for(const item of data.items){
  if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)){
   throw new Error('A API retornou eventos repetidos ou sem identificador no snapshot.');
  }
  ids.add(item.id);
 }
 return data.items;
}
export type PrismCardRead = {
 id:string;name:string;isActive:boolean;closingDay:number;dueDay:number;
 issuer?:string|null;brand?:string|null;lastFour?:string|null;
};
export type PrismReadData = {
 events:FinancialEvent[];accounts:Account[];categories:Category[];
 methods:PaymentMethod[];cards:PrismCardRead[];
};
export type PrismReadOnlyCallbacks = {
 onLoaded:(data:PrismReadData)=>void;
 onLoading?:()=>void;
 onNew:()=>void;
 onEdit:(row:QaLaunchTarget)=>void;
 onNotice:(message:string)=>void;
};
type Props={userId:string;userName:string;onHome:()=>void;prismReadOnlyCallbacks?:PrismReadOnlyCallbacks;periodMonth?:string;onPeriodChange?:(month:string)=>void;periodSelection?:LaunchPeriod;onPeriodSelectionChange?:(period:LaunchPeriod)=>void;globalSearch?:{query:string;revision:number}};
export function OperationalLaunches({userId,userName,onHome,prismReadOnlyCallbacks,periodMonth,onPeriodChange,periodSelection,onPeriodSelectionChange,globalSearch}:Props){
 const month=periodSelection?.month??periodMonth??todayBrazil().slice(0,7);
 const period=periodSelection??periodForMonth(month);
 const periodKey=JSON.stringify(period);
 const historyCache=useRef<{userId:string;revision:string;items:FinancialEvent[]}|null>(null);
 const [data,setData]=useState<HomeFinancialData|null>(null);
 const [error,setError]=useState('');
 const [progress,setProgress]=useState<HistoryProgress>({loaded:0,total:0,pass:1,mode:'snapshot'});
 const [version,setVersion]=useState(0);
 const [canFilterCanonically,setCanFilterCanonically]=useState(false);
 const loadedRevision=useRef('');
 const filterMemory=useRef<Partial<LaunchesFilterPreset>>({});
 const rememberFilters=useCallback((next:LaunchesFilterPreset)=>{filterMemory.current=next},[]);
 const reload=useCallback(()=>setVersion(current=>current+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  const {signal}=controller;
  setData(null);prismReadOnlyCallbacks?.onLoading?.();setError('');setCanFilterCanonically(false);loadedRevision.current='';setProgress({loaded:0,total:0,pass:1,mode:'snapshot'});
  const run=async()=>{
   try{
    // O snapshot da API oferece consistência transacional para eventos.
    // O token continua verificando alterações entre leituras auxiliares
    // (resumo/catálogos); nos servidores antigos preserva-se a dupla leitura.
    const before=await financeClient.getSyncStatus();
    if(typeof before.token!=='string'||!before.token){
     throw new Error('A API não confirmou a versão dos dados financeiros.');
    }
    // Implantação progressiva: a Web nunca requisita a rota nova a uma
    // API que ainda não anunciou suporte, evitando falhas de proxy/CORS.
    const supportsSnapshot=before.capabilities?.historySnapshotV1===true;
    if(!supportsSnapshot&&!signal.aborted){
     setProgress({loaded:0,total:0,pass:1,mode:'legacy'});
    }
    const multiPeriod=Boolean(prismReadOnlyCallbacks&&period.mode!=='month');
    if(multiPeriod&&before.capabilities?.filteredSummaryV1!==true){
     throw new Error('A API nao confirmou agregacao financeira canonica para periodos completos.');
    }
    let completeHistory:FinancialEvent[]|null=null;
    const fetchPage=(page:number,pageSize:number,s:AbortSignal)=>financeClient.listEvents(page,pageSize,'',s);
    const report=(p:HistoryProgress)=>{if(!signal.aborted)setProgress(p)};
    const eventRead=prismReadOnlyCallbacks
     ? multiPeriod
       ? (async()=>{
          const cached=historyCache.current;
          completeHistory=cached?.userId===userId&&cached.revision===before.token
           ? cached.items : await readVerifiedHistoricalSnapshot(signal);
          return filterEventsForPeriod(completeHistory,period);
         })()
       : readVerifiedMonthlyEvents(month,signal)
     : supportsSnapshot
       ? readSmartAuthorizedHistory(s=>financeClient.getHistorySnapshot(s),fetchPage,signal,report)
       : readAuthorizedHistory(fetchPage,signal,p=>report({...p,mode:'legacy'}));
    const cardsRead = prismReadOnlyCallbacks
     ? authenticatedRequest<PrismCardRead[]>('/cards?month='+encodeURIComponent(month),{cache:'no-store',signal})
     : Promise.resolve([] as PrismCardRead[]);
    const [events,summary,accounts,categories,methods,cards]=await Promise.all([
     eventRead,
     multiPeriod?Promise.resolve(null):authenticatedRequest<FinanceSummary>('/finance/summary?month='+encodeURIComponent(month),{cache:'no-store',signal}),
     authenticatedRequest<Account[]>('/finance/accounts',{cache:'no-store',signal}),
     authenticatedRequest<Category[]>('/finance/categories',{cache:'no-store',signal}),
     authenticatedRequest<PaymentMethod[]>('/finance/payment-methods',{cache:'no-store',signal}),
     cardsRead,
    ]);
    if(signal.aborted)return;
    const after=await financeClient.getSyncStatus();
    if(signal.aborted)return;
    if(typeof after.token!=='string'||before.token!==after.token){
     throw new Error('Os dados foram alterados durante a consulta. Atualize o histórico.');
    }
    loadedRevision.current=before.token;
    if(completeHistory)historyCache.current={userId,revision:before.token,items:completeHistory};
    setCanFilterCanonically(before.capabilities?.filteredSummaryV1===true);
    if(prismReadOnlyCallbacks)prismReadOnlyCallbacks.onLoaded({events,accounts,categories,methods,cards});
    setData(buildReadOnlyData(events,summary,accounts,categories,methods,Boolean(prismReadOnlyCallbacks)));
   }catch(cause){
    if(!signal.aborted){
     const networkFailure=cause instanceof TypeError &&
      /^(?:Failed to fetch|NetworkError.*|Load failed)$/i.test(cause.message);
     setError(networkFailure
      ? 'Não foi possível conectar à API financeira. Verifique a conexão e tente novamente.'
      : cause instanceof Error?cause.message:'Não foi possível carregar o histórico financeiro.');
    }
   }
  };
  void run();
  const invalidate=()=>reload();
  window.addEventListener('meg:data-invalidated',invalidate);
  return ()=>{controller.abort();window.removeEventListener('meg:data-invalidated',invalidate)};
 },[userId,month,periodKey,version,reload,prismReadOnlyCallbacks]);
 const readCanonicalFiltered=useCallback(async(
  criteria:LaunchesFilterPreset,grid:DataGridFilterState,signal:AbortSignal,
 ):Promise<CanonicalFilteredHistorySummary|null>=>{
  if(!canFilterCanonically)return null;
  const revision=loadedRevision.current;
  const before=await financeClient.getSyncStatus();
  if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
  if(!revision||before.token!==revision)throw new Error('O histórico foi atualizado. Atualize a consulta.');
  const result=await financeClient.getFilteredHistorySummary({criteria,grid},signal);
  if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
  const after=await financeClient.getSyncStatus();
  if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
  if(after.token!==revision)throw new Error('O histórico mudou durante os indicadores. Atualize a consulta.');
  return result;
 },[canFilterCanonically]);
 if(error)return <section className="meg-l09" aria-label="Erro na consulta dos lançamentos">
  <div className="meg-l09-preview-warning" role="alert">{error} Nenhum resultado parcial foi publicado.</div>
  <button type="button" className="meg-l09-add" onClick={reload}>Tentar novamente</button>
  <button type="button" className="meg-l09-back" onClick={onHome}>Voltar à Home</button>
 </section>;
 if(!data && prismReadOnlyCallbacks){
  return <section className="meg-l09 meg-l09-loading" aria-label="Consultando lançamentos do mês" aria-busy="true">
   <div className="meg-l09-loading-panel" role="status">
    <div className="meg-l09-loading-head">
     <div><span className="meg-l09-loading-eyebrow">DADOS REAIS · CONSULTA AUTENTICADA</span>
      <h1>Lançamentos</h1></div>
    </div>
    <p className="meg-l09-loading-status">Consultando registros de {month.slice(5,7)}/{month.slice(0,4)}. Os dados não são copiados nem importados novamente.</p>
   </div>
  </section>;
 }
 if(!data){
  // Percentual de carregamento da interface, nunca indicador financeiro.
  const fraction=progress.total>0?progress.loaded/progress.total:0;
  const percent=Math.min(99,progress.mode==='snapshot'?0:Math.round(((progress.pass-1)+fraction)*50));
  return <section className="meg-l09 meg-l09-loading" aria-label="Carregando lançamentos" aria-busy="true">
   <div className="meg-l09-loading-panel">
    <div className="meg-l09-loading-head">
     <div>
      <span className="meg-l09-loading-eyebrow">HISTÓRICO FINANCEIRO AUTORIZADO</span>
      <h1>Carregando seus lançamentos</h1>
     </div>
     <span className="meg-l09-loading-percent" aria-hidden="true">{percent}%</span>
    </div>
    <p className="meg-l09-loading-status" role="status" aria-live="polite">
     {progress.mode==='snapshot'?'Preparando histórico consistente na API':progress.pass===2?'Conferindo os registros da segunda leitura':'Lendo os registros da primeira leitura'}
     {' · '}{progress.loaded.toLocaleString('pt-BR')} de {progress.total?progress.total.toLocaleString('pt-BR'):'...'} registros.
    </p>
    <div className="meg-l09-progress-track" role="progressbar" aria-label="Conferência do histórico" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
     <span style={{width:percent+'%'}} />
    </div>
    <p className="meg-l09-loading-notice">O MEG verifica a integridade antes de liberar filtros e exportações. Nenhum dado parcial é publicado como definitivo.</p>
   </div>
   <div className="meg-l09-loading-placeholders" aria-hidden="true">
    <div className="meg-l09-loading-stats">{[1,2,3,4].map(index=><div className="meg-l09-loading-stat" key={index}><i/><span/><strong/></div>)}</div>
    <div className="meg-l09-loading-grid"><div className="meg-l09-loading-toolbar"/>{[1,2,3,4,5,6].map(index=><div className="meg-l09-loading-row" key={index}><span/><span/><span/><span/></div>)}</div>
   </div>
   <button type="button" className="meg-l09-back" onClick={onHome}>Voltar à Home</button>
  </section>;
 }
 return <LaunchesStage09
  key={userId+':'+periodKey} data={data} mode="live" periodMonth={month} userId={userId}
  periodSelection={period} onPeriodSelectionChange={onPeriodSelectionChange?next=>{filterMemory.current={};onPeriodSelectionChange(next)}:undefined}
  onPeriodChange={onPeriodChange?next=>{filterMemory.current={};onPeriodChange(next)}:undefined}
  exportUserName={userName} onRefresh={reload} globalSearch={globalSearch}
  onFilteredSummary={canFilterCanonically?readCanonicalFiltered:undefined}
  rememberedFilters={filterMemory.current} onRememberFilters={rememberFilters}
  onNew={prismReadOnlyCallbacks?.onNew??(()=>{})} onHome={onHome}
  qaActions={Boolean(prismReadOnlyCallbacks)} readOnlyRealData={Boolean(prismReadOnlyCallbacks)}
  onQaEdit={prismReadOnlyCallbacks?.onEdit} onQaNotice={prismReadOnlyCallbacks?.onNotice}
 />;
}
