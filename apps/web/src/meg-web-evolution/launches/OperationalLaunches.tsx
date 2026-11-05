import {useCallback, useEffect, useRef, useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
import type {Account, Category, PaymentMethod, FinanceSummary, FinancialEvent} from '../../app/finance-client';
import {financeClient} from '../../app/finance-client';
import type {HomeFinancialData} from '../home/HomeDashboard';
import {LaunchesStage09, type LaunchesFilterPreset} from './LaunchesStage09';
import {displayMoney, readSmartAuthorizedHistory, type HistoryProgress} from './authorized-history';

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
 events:FinancialEvent[], summary:FinanceSummary, accounts:Account[],
 categories:Category[], methods:PaymentMethod[],
):HomeFinancialData {
 const nameAccounts = new Map(accounts.map(a=>[a.id, a.name]));
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
  summary:{
   month:summary.month,income:summary.income,expense:summary.expense,
   projectedResult:summary.projectedResult,realizedResult:summary.realizedResult,
   pendingCount:summary.pendingCount,pendingAmount:summary.pendingAmount
  },
  cashflow:null,benefit:null,available:null,transactions,payables:[],cards:[],
  accounts:[...nameAccounts].map(([id,name])=>({id,name})),
  categories:[...nameCategories].map(([id,name])=>({id,name}))
 };
}
type Props={userId:string;userName:string;onHome:()=>void};
export function OperationalLaunches({userId,userName,onHome}:Props){
 const month = todayBrazil().slice(0,7);
 const [data,setData]=useState<HomeFinancialData|null>(null);
 const [error,setError]=useState('');
 const [progress,setProgress]=useState<HistoryProgress>({loaded:0,total:0,pass:1,mode:'snapshot'});
 const [version,setVersion]=useState(0);
 const filterMemory=useRef<Partial<LaunchesFilterPreset>>({});
 const rememberFilters=useCallback((next:LaunchesFilterPreset)=>{filterMemory.current=next},[]);
 const reload=useCallback(()=>setVersion(current=>current+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  const {signal}=controller;
  setData(null);setError('');setProgress({loaded:0,total:0,pass:1,mode:'snapshot'});
  const run=async()=>{
   try{
    // O snapshot da API oferece consistência transacional para eventos.
    // O token continua verificando alterações entre leituras auxiliares
    // (resumo/catálogos); nos servidores antigos preserva-se a dupla leitura.
    const before=await financeClient.getSyncStatus();
    if(typeof before.token!=='string'||!before.token){
     throw new Error('A API não confirmou a versão dos dados financeiros.');
    }
    const [events,summary,accounts,categories,methods]=await Promise.all([
     readSmartAuthorizedHistory(
      s=>financeClient.getHistorySnapshot(s),
      (page,pageSize,s)=>financeClient.listEvents(page,pageSize,'',s),
      signal,
      p=>{if(!signal.aborted)setProgress(p)},
     ),
     authenticatedRequest<FinanceSummary>('/finance/summary?month='+encodeURIComponent(month),{cache:'no-store',signal}),
     authenticatedRequest<Account[]>('/finance/accounts',{cache:'no-store',signal}),
     authenticatedRequest<Category[]>('/finance/categories',{cache:'no-store',signal}),
     authenticatedRequest<PaymentMethod[]>('/finance/payment-methods',{cache:'no-store',signal}),
    ]);
    if(signal.aborted)return;
    const after=await financeClient.getSyncStatus();
    if(signal.aborted)return;
    if(typeof after.token!=='string'||before.token!==after.token){
     throw new Error('Os dados foram alterados durante a consulta. Atualize o histórico.');
    }
    setData(buildReadOnlyData(events,summary,accounts,categories,methods));
   }catch(cause){
    if(!signal.aborted)setError(cause instanceof Error?cause.message:'Não foi possível carregar o histórico financeiro.');
   }
  };
  void run();
  const invalidate=()=>reload();
  window.addEventListener('meg:data-invalidated',invalidate);
  return ()=>{controller.abort();window.removeEventListener('meg:data-invalidated',invalidate)};
 },[userId,month,version,reload]);
 if(error)return <section className="meg-l09" aria-label="Erro na consulta dos lançamentos">
  <div className="meg-l09-preview-warning" role="alert">{error} Nenhum resultado parcial foi publicado.</div>
  <button type="button" className="meg-l09-add" onClick={reload}>Tentar novamente</button>
  <button type="button" className="meg-l09-back" onClick={onHome}>Voltar à Home</button>
 </section>;
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
  key={userId} data={data} mode="live" periodMonth={month} userId={userId}
  exportUserName={userName} onRefresh={reload}
  rememberedFilters={filterMemory.current} onRememberFilters={rememberFilters}
  onNew={()=>{}} onHome={onHome}
 />;
}
