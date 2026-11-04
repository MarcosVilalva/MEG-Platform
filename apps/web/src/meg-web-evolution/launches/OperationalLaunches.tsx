import {useCallback, useEffect, useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
import type {Account, Category, PaymentMethod, FinanceSummary, FinancialEvent} from '../../app/finance-client';
import {financeClient} from '../../app/finance-client';
import type {HomeFinancialData} from '../home/HomeDashboard';
import {LaunchesStage09} from './LaunchesStage09';
import {displayMoney, readAuthorizedHistory, type HistoryProgress} from './authorized-history';

const todayBrazil = () => {
 const parts = new Intl.DateTimeFormat('en-US', {
  timeZone:'America/Sao_Paulo', year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date());
 const get = (part:string) => parts.find(item=>item.type===part)?.value||'';
 return get('year')+'-'+get('month')+'-'+get('day');
};

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
  paymentMethodName:event.paymentMethod?.name || (event.paymentMethodId ? nameMethods.get(event.paymentMethodId) : undefined) || undefined,
  notes:event.notes||'',
  sourceDetails:event.sourceDetails,
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
 const [progress,setProgress]=useState<HistoryProgress>({loaded:0,total:0,pass:1});
 const [version,setVersion]=useState(0);
 const reload=useCallback(()=>setVersion(current=>current+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  const {signal}=controller;
  setData(null);setError('');setProgress({loaded:0,total:0,pass:1});
  const run=async()=>{
   try{
    const [events,summary,accounts,categories,methods]=await Promise.all([
     readAuthorizedHistory(
      (page,pageSize,s)=>financeClient.listEvents(page,pageSize,'',s),
      signal,
      p=>{if(!signal.aborted)setProgress(p)},
     ),
     authenticatedRequest<FinanceSummary>('/finance/summary?month='+encodeURIComponent(month),{cache:'no-store',signal}),
     authenticatedRequest<Account[]>('/finance/accounts',{cache:'no-store',signal}),
     authenticatedRequest<Category[]>('/finance/categories',{cache:'no-store',signal}),
     authenticatedRequest<PaymentMethod[]>('/finance/payment-methods',{cache:'no-store',signal}),
    ]);
    if(!signal.aborted)setData(buildReadOnlyData(events,summary,accounts,categories,methods));
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
 if(!data)return <section className="meg-l09" aria-label="Carregando lançamentos">
  <div className="meg-l09-preview-warning" role="status" aria-live="polite">
   Consultando histórico autorizado. {progress.pass===2?'Conferindo consistência':'Lendo registros'}:
   {' '}{progress.loaded.toLocaleString('pt-BR')} de {progress.total?progress.total.toLocaleString('pt-BR'):'...'} registros.
   Filtros e exportações serão liberados após a verificação integral.
  </div>
  <button type="button" className="meg-l09-back" onClick={onHome}>Voltar à Home</button>
 </section>;
 return <LaunchesStage09
  key={userId} data={data} mode="live" periodMonth={month}
  exportUserName={userName} onRefresh={reload}
  onNew={()=>{}} onHome={onHome}
 />;
}
