import {useCallback, useEffect, useRef, useState} from 'react';
import {ExpenseForm,type ExpenseCatalogs} from '../stage10/ExpenseForm';
import {EditExpensePreview,type EditExpenseSnapshot} from '../stage10/EditExpensePreview';
import {isStage10FoodBenefitCategory} from '../stage10/real-expense-category-policy';
import {PrismLaunchChoice} from '../integrated-qa/PrismLaunchChoice';
import type {HistorySnapshot} from '../stage10/autocomplete-history';
import '../launches/new-launch.css';
import '../integrated-qa/prism-launch-choice.css';
import {authenticatedRequest} from '../../app/auth-client';
import type {Account, Category, PaymentMethod, FinanceSummary, FinancialEvent, CanonicalFilteredHistorySummary} from '../../app/finance-client';
import type {DataGridFilterState} from '../datagrid/types';
import {financeClient} from '../../app/finance-client';
import type {HomeFinancialData} from '../home/HomeDashboard';
import {LaunchesStage09, type LaunchesFilterPreset} from './LaunchesStage09';
import {displayMoney, readAuthorizedHistory, readSmartAuthorizedHistory, type HistoryProgress} from './authorized-history';

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
type Props={userId:string;userName:string;onHome:()=>void;stage10ReadOnly?:boolean};
type Stage10ReadCatalog={
 events:FinancialEvent[];catalogs:ExpenseCatalogs;history:HistorySnapshot;
};
type Stage10CardRead={id:string;name:string;isActive:boolean;closingDay:number;dueDay:number;issuer?:string|null;brand?:string|null;lastFour?:string|null};
function stage10RealCatalogs(accounts:Account[],categories:Category[],methods:PaymentMethod[],cards:Stage10CardRead[]):ExpenseCatalogs {
 return {
  accounts:accounts.filter(a=>['checking','savings','cash','benefit','investment'].includes(a.type.toLowerCase()))
   .map(a=>({id:a.id,name:a.name,active:a.isActive,kind:(['checking','savings','cash'].includes(a.type.toLowerCase())?'monetary':a.type.toLowerCase()) as 'monetary'|'benefit'|'investment'})),
  categories:categories.map(c=>({id:c.id,name:c.name,active:c.isActive,group:c.group??undefined})),
  paymentMethods:methods.map(m=>({id:m.id,name:m.name,active:m.isActive,
   kind:/verocard/i.test(m.name)?'benefit':m.type==='benefit'?'benefit':m.type==='credit'?'credit':'ordinary'})),
  // Metadados canônicos da API, sem calcular vencimentos, parcelas ou limite.
  creditCards:cards.filter(c=>c.isActive&&typeof c.id==='string'&&typeof c.name==='string'&&Number.isInteger(c.closingDay)&&Number.isInteger(c.dueDay))
   .map(c=>({id:c.id,name:c.name,active:c.isActive,closingDay:c.closingDay,dueDay:c.dueDay,issuer:c.issuer,brand:c.brand,lastFour:c.lastFour})),
 };
}
const stage10Money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
function stage10ExpenseSnapshot(event:FinancialEvent,catalogs:ExpenseCatalogs):EditExpenseSnapshot|null {
 if(event.type!=='expense'||!['paid','planned'].includes(event.status)||
   event.sourcePayload?.transferId||event.sourcePayload?.transferLeg)return null;
 const account=catalogs.accounts.find(a=>a.id===event.accountId&&a.active);
 const category=catalogs.categories.find(c=>c.id===event.categoryId&&c.active);
 const method=catalogs.paymentMethods.find(m=>m.id===event.paymentMethodId&&m.active);
 const benefit=account?.kind==='benefit';
 // Não promover SUPERMERCADO ou texto legado à regra Alimentação.
 // A edição de benefício exige identificação da categoria Alimentação canônica.
 if(benefit && (!category||!isStage10FoodBenefitCategory(category)||!method||
    method.kind!=='benefit'||event.status!=='paid'))return null;
 if(account&&account.kind==='investment')return null;
 if(!benefit&&method&&method.kind!=='ordinary')return null;
 const amount=displayMoney(event.amount);
 if(!Number.isFinite(amount)||amount===0||!/^\d{4}-\d{2}-\d{2}/.test(event.date))return null;
 return {
  source:'financial-event',financialScope:benefit?'benefit':'monetary',type:'expense',
  id:event.id,description:event.description,notes:event.notes??'',
  categoryId:category?.id??'',categoryName:category?.name??'Sem categoria ativa',
  accountId:event.accountId??'',paymentMethodId:event.paymentMethodId??'',
  accountName:account?.name??'Sem conta ativa',
  paymentMethodName:method?.name??'Sem forma ativa',
  dateDisplay:event.date.slice(8,10)+'/'+event.date.slice(5,7)+'/'+event.date.slice(0,4),
  amountDisplay:stage10Money.format(amount),
  statusLabel:event.status==='paid'?'Paga':'Pendente',strictReferences:true,
 };
}
export function OperationalLaunches({userId,userName,onHome,stage10ReadOnly=false}:Props){
 const month = todayBrazil().slice(0,7);
 const [data,setData]=useState<HomeFinancialData|null>(null);
 const [error,setError]=useState('');
 const [progress,setProgress]=useState<HistoryProgress>({loaded:0,total:0,pass:1,mode:'snapshot'});
 const [version,setVersion]=useState(0);
 const [canFilterCanonically,setCanFilterCanonically]=useState(false);
 const [stage10Read,setStage10Read]=useState<Stage10ReadCatalog|null>(null);
 const [stage10Overlay,setStage10Overlay]=useState<'choice'|'expense'|'edit'|null>(null);
 const [stage10Selected,setStage10Selected]=useState<EditExpenseSnapshot|null>(null);
 const [stage10Notice,setStage10Notice]=useState('');
 const loadedRevision=useRef('');
 const filterMemory=useRef<Partial<LaunchesFilterPreset>>({});
 const rememberFilters=useCallback((next:LaunchesFilterPreset)=>{filterMemory.current=next},[]);
 const reload=useCallback(()=>setVersion(current=>current+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  const {signal}=controller;
  setData(null);setError('');setCanFilterCanonically(false);setStage10Read(null);
  setStage10Overlay(null);setStage10Selected(null);
  loadedRevision.current='';setProgress({loaded:0,total:0,pass:1,mode:'snapshot'});
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
    const fetchPage=(page:number,pageSize:number,s:AbortSignal)=>financeClient.listEvents(page,pageSize,'',s);
    const report=(p:HistoryProgress)=>{if(!signal.aborted)setProgress(p)};
    const eventRead=supportsSnapshot
     ? readSmartAuthorizedHistory(s=>financeClient.getHistorySnapshot(s),fetchPage,signal,report)
     : readAuthorizedHistory(fetchPage,signal,p=>report({...p,mode:'legacy'}));
    const [events,summary,accounts,categories,methods,cards]=await Promise.all([
     eventRead,
     authenticatedRequest<FinanceSummary>('/finance/summary?month='+encodeURIComponent(month),{cache:'no-store',signal}),
     authenticatedRequest<Account[]>('/finance/accounts',{cache:'no-store',signal}),
     authenticatedRequest<Category[]>('/finance/categories',{cache:'no-store',signal}),
     authenticatedRequest<PaymentMethod[]>('/finance/payment-methods',{cache:'no-store',signal}),
     stage10ReadOnly?authenticatedRequest<Stage10CardRead[]>('/cards?month='+encodeURIComponent(month),{cache:'no-store',signal}):Promise.resolve([]),
    ]);
    if(signal.aborted)return;
    const after=await financeClient.getSyncStatus();
    if(signal.aborted)return;
    if(typeof after.token!=='string'||before.token!==after.token){
     throw new Error('Os dados foram alterados durante a consulta. Atualize o histórico.');
    }
    loadedRevision.current=before.token;
    setCanFilterCanonically(before.capabilities?.filteredSummaryV1===true);
    setData(buildReadOnlyData(events,summary,accounts,categories,methods));
    if(stage10ReadOnly){
     if(!Array.isArray(cards))throw new Error('API não retornou catálogo de cartões autorizado.');
     setStage10Read({events,catalogs:stage10RealCatalogs(accounts,categories,methods,cards),
      history:{protocol:'financial-history-v1',kind:'complete',items:events}});
    }
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
 },[userId,month,version,reload,stage10ReadOnly]);
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
 const openEdit=(id:string)=>{
  const event=stage10Read?.events.find(e=>e.id===id);
  const snapshot=event&&stage10Read?stage10ExpenseSnapshot(event,stage10Read.catalogs):null;
  if(!snapshot){setStage10Notice('Edição bloqueada: categoria/conta/forma de pagamento sem identidade canônica compatível. O lançamento permanece disponível para consulta.');return;}
  setStage10Notice('');setStage10Selected(snapshot);setStage10Overlay('edit');
 };
 return <>
 <LaunchesStage09
  key={userId} data={data} mode="live" periodMonth={month} userId={userId}
  exportUserName={userName} onRefresh={reload}
  onFilteredSummary={canFilterCanonically?readCanonicalFiltered:undefined}
  rememberedFilters={filterMemory.current} onRememberFilters={rememberFilters}
  onNew={()=>{if(stage10ReadOnly&&stage10Read){setStage10Notice('');setStage10Overlay('choice');}}}
  stage10ReadOnly={stage10ReadOnly&&Boolean(stage10Read)}
  onStage10Edit={stage10ReadOnly&&stage10Read?openEdit:undefined} onHome={onHome}
 />
 {stage10Overlay==='choice'&&stage10Read&&<div className="meg-new-launch__overlay is-choice-overlay">
  <section className="meg-new-launch is-choose" role="dialog" aria-modal="true" aria-label="Novo lançamento">
   <header className="meg-new-launch__header"><div className="meg-new-launch__headline"><h2>Novo lançamento</h2><p>Selecione o tipo de lançamento.</p></div>
   <button type="button" className="meg-new-launch__close" aria-label="Fechar" onClick={()=>setStage10Overlay(null)}>×</button></header>
   <PrismLaunchChoice onBack={()=>setStage10Overlay(null)} onChoose={type=>type==='expense'?setStage10Overlay('expense'):setStage10Notice('A receita depende de contrato canônico ainda não autorizado para esta etapa.')}/>
  </section>
 </div>}
 {stage10Overlay==='expense'&&stage10Read&&<ExpenseForm catalogs={stage10Read.catalogs}
  historySnapshot={stage10Read.history} dataMode="real-read" saveEnabled={false}
  onBack={()=>setStage10Overlay('choice')}/>}
 {stage10Overlay==='edit'&&stage10Selected&&stage10Read&&<EditExpensePreview
  key={stage10Selected.id} snapshot={stage10Selected} catalogs={stage10Read.catalogs}
  readOnly onBack={()=>{setStage10Overlay(null);setStage10Selected(null);}}/>}
 {stage10Notice&&<output className="meg-l09-preview-warning" role="status">{stage10Notice}
  <button type="button" onClick={()=>setStage10Notice('')}>Fechar</button></output>}
 </>;
}
