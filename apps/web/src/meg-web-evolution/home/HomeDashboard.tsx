import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
// @ts-expect-error Adaptador JavaScript da fonte única já validada na Etapa 02
import {composeMegApiSnapshot,fromCanonicalReadModels,fromFinancialEvents,fromCards,fromFinanceCatalogs} from '../../evolution/data/api-adapter.js';
import {DataGrid} from '../datagrid/DataGrid';
import type {DataGridColumn} from '../datagrid/types';
import {HomeChart,type CashflowDay} from './HomeChart';
import {HomeGlyph,type HomeIconName} from './HomeGlyph';
import {CardBrandMark} from './CardBrandMark';
import {QuickActions} from './QuickActions';
import {readCanonicalHomeCommitments,type CanonicalHomeCommitment} from './home-commitments-read';
import {HomeCommitmentsFullList} from './HomeCommitmentsFullList';
import {useHomeDueAlertPublisher} from './HomeDueAlerts';
import './home-dashboard.css';

export type HomeFinancialData={
 summary:{month:string;income:number;expense:number;projectedResult:number;realizedResult:number;pendingCount:number;pendingAmount:number}|null;
 cashflow:{month:string;days:CashflowDay[]}|null;
 benefit:{month:string;balance:number;credits:number;used:number}|null;
 available:{date:string;available:number;scope:'monetary'}|null;
 transactions:Array<{id:string;date:string;description:string;status:string;type:string;amount:number;signedAmount:number;categoryId?:string|null;accountId?:string|null}>;
 followingTransactions?:HomeFinancialData['transactions'];
 /** Fonte exclusiva em sessão autenticada. Em prévia visual mantém dados fictícios existentes. */
 canonicalCommitments?:CanonicalHomeCommitment[];
 payables:Array<{id:string;description:string;dueDate:string;status:string;openAmount:number;categoryId?:string|null}>;
 accounts:Array<{id:string;name:string;type?:string}>;
 categories:Array<{id:string;name:string}>;
 cards:Array<{id:string;name:string;issuer?:string|null;brand?:string|null;lastFour?:string|null;creditLimit?:number;availableLimit?:number;usedLimit?:number;statementAmount?:number;payableStatementAmount?:number;dueDay?:number|null;isActive?:boolean}>;
};
type Action='novo'|'transferencia'|'pendentes'|'cartoes'|'lancamentos'|'beneficios'|'relatorios'|'metas';
type Props={previewData?:HomeFinancialData;onNavigate?:(target:Action)=>void;month?:string;userId?:string};
const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const monthFmt=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
function dateNow(){const v=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(k:string)=>v.find(i=>i.type===k)?.value||'00';return get('year')+'-'+get('month')+'-'+get('day')}
const format=(n:number|null|undefined,hidden:boolean)=>hidden?'R$ •••••':n==null||!Number.isFinite(n)?'—':currency.format(n);
const dateString=(s:string)=>/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'—';
const emptyState:HomeFinancialData={summary:null,cashflow:null,benefit:null,available:null,transactions:[],payables:[],accounts:[],categories:[],cards:[]};
async function readHome(month:string):Promise<HomeFinancialData>{
 const [summary,cashflow,benefit,events,cards,accounts,categories,available,canonicalCommitments]=await Promise.all([
  authenticatedRequest<NonNullable<HomeFinancialData['summary']>>('/finance/summary?month='+month,{cache:'no-store'}),
  authenticatedRequest<NonNullable<HomeFinancialData['cashflow']>>('/finance/cashflow?month='+month,{cache:'no-store'}),
  authenticatedRequest<NonNullable<HomeFinancialData['benefit']>>('/finance/benefit-summary?month='+month,{cache:'no-store'}),
  authenticatedRequest<unknown>('/finance/events/month?month='+month,{cache:'no-store'}),
  authenticatedRequest<unknown>('/cards?month='+month,{cache:'no-store'}),
  authenticatedRequest<unknown>('/finance/accounts',{cache:'no-store'}),
  authenticatedRequest<unknown>('/finance/categories',{cache:'no-store'}),
  // Rota nova, canônica; até ser implantada na API retorna ausente, nunca estimado.
  authenticatedRequest<HomeFinancialData['available']>('/finance/home-available?date='+dateNow(),{cache:'no-store'}).catch(()=>null),
  // Falha de compromisso canônico é crítica: não mostrar um falso quadro vazio.
  readCanonicalHomeCommitments(authenticatedRequest)
 ]);
 const adapted=composeMegApiSnapshot([
  fromCanonicalReadModels({summary,cashflow,benefitSummary:benefit}),
  fromFinancialEvents(events),
  fromCards(cards),
  fromFinanceCatalogs({accounts,categories})
 ]) as HomeFinancialData & {readModels?:unknown};
 return {
  summary,cashflow,benefit,available,canonicalCommitments,
  transactions:adapted.transactions||[],
  followingTransactions:[],
  payables:[],
  accounts:adapted.accounts||[],
  categories:adapted.categories||[],
  cards:adapted.cards||[]
 };
}
// Conversão de exibição compartilhada pelo resumo e pela listagem paginada.
 // Nenhuma regra financeira é recalculada: os valores e estados são da API.
function commitmentGridRows(items:CanonicalHomeCommitment[]):Record<string,unknown>[] {
 return items.map(item=>({
  id:item.id,date:item.dueDate,description:item.description,
  source:item.source==='payable'?'Conta a pagar':'Lançamento previsto',
  value:Number(item.amount),
  status:item.source==='payable'?(item.status==='partial'?'Parcial':'A pagar'):'Previsto',
  dueState:item.dueState
 }));
}
// Apenas iconografia da categoria existente. Sem classificação financeira ou mutação de dados.
function categoryGlyph(label:string):HomeIconName{
 const normalized=label.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const known:Record<string,HomeIconName>={
  supermercado:'basket',receitas:'income',saude:'medical',casa:'house',transporte:'car',combustivel:'car'
 };
 return known[normalized]||'tag';
}
function PanelTitle({icon,title,meta}:{icon:HomeIconName;title:string;meta?:string}){
 return <div className="pano-panel-title"><h2><HomeGlyph name={icon} size={19}/>{title}</h2>{meta&&<span>{meta}</span>}</div>;
}
function Money({value,hidden,className=''}:{value:number|null|undefined;hidden:boolean;className?:string}){
 return <span className={className}>{format(value,hidden)}</span>;
}
function HomeContent({data,month,preview,onNavigate,userId}:{data:HomeFinancialData;month:string;preview:boolean;onNavigate?:Props['onNavigate'];userId?:string}){
 const [hidden,setHidden]=useState(false);
 const [notice,setNotice]=useState<string|null>(null);
 const [movementMode,setMovementMode]=useState<'all'|'income'|'expense'>('all');
 const [showMovementFilters,setShowMovementFilters]=useState(false);
 const [showDueFilters,setShowDueFilters]=useState(false);
 const [showAllCommitments,setShowAllCommitments]=useState(false);
 const publishDueAlerts=useHomeDueAlertPublisher();
 const openAllForAlerts=useCallback(()=>setShowAllCommitments(true),[]);
 const alertBindingVersion=useRef(0);
 useEffect(()=>{
  if(!publishDueAlerts)return;
  const version=++alertBindingVersion.current;
  if(data.canonicalCommitments){
   publishDueAlerts({
    items:data.canonicalCommitments,
    owner:userId||'qa-preview',
    preview,
    hidden,
    openAll:openAllForAlerts,
   });
  }else publishDueAlerts(null);
  return ()=>{
   // StrictMode desmonta e remonta efeitos em desenvolvimento.
   // Não apagar a primeira notificação antes da remontagem síncrona.
   queueMicrotask(()=>{
    if(alertBindingVersion.current===version)publishDueAlerts(null);
   });
  };
 },[publishDueAlerts,data.canonicalCommitments,userId,preview,hidden,openAllForAlerts]);
 const [movementFiltersCount,setMovementFiltersCount]=useState(0);
 const [dueFiltersCount,setDueFiltersCount]=useState(0);
 const [cardIndex,setCardIndex]=useState(0);
 const [cardExpanded,setCardExpanded]=useState(false);
 const [cardDirection,setCardDirection]=useState<'next'|'prev'>('next');
 const [cardMotionKey,setCardMotionKey]=useState(0);
 const touchStartX=useRef<number|null>(null);
 const ignoreCardClick=useRef(false);
 const movementSection=useRef<HTMLElement|null>(null);
 const dueSection=useRef<HTMLElement|null>(null);
 const cardsSection=useRef<HTMLElement|null>(null);
 const benefitSection=useRef<HTMLElement|null>(null);
 const flowSection=useRef<HTMLElement|null>(null);
 const reveal=(node:HTMLElement|null)=>node?.scrollIntoView({behavior:'smooth',block:'start'});
 const focusMovements=(mode:'all'|'income'|'expense')=>{setMovementMode(mode);reveal(movementSection.current)};
 const focusPending=()=>reveal(dueSection.current);
 const focusBenefit=()=>reveal(benefitSection.current);
 // Índice circular: nunca bloqueia nas extremidades. Não duplica registros financeiros.
 const cardCount=data.cards.length;
 const activeCardIndex=cardCount?((cardIndex%cardCount)+cardCount)%cardCount:0;
 const selectedCard=cardCount?data.cards[activeCardIndex]:null;
 // Para dois cartões, exibir somente um vizinho, não duas cópias idênticas.
 const previousCard=cardCount>2?data.cards[(activeCardIndex-1+cardCount)%cardCount]:null;
 const nextCard=cardCount>1?data.cards[(activeCardIndex+1)%cardCount]:null;
 const stepCard=(direction:number)=>{
  if(cardCount<2)return;
  setCardDirection(direction<0?'prev':'next');
  setCardMotionKey(v=>v+1);
  setCardIndex(i=>((i+direction)%cardCount+cardCount)%cardCount);
  setCardExpanded(false);
 };
 const showCard=(index:number)=>{
  if(cardCount<2||index===activeCardIndex)return;
  setCardDirection(index<activeCardIndex?'prev':'next');
  setCardMotionKey(v=>v+1);
  setCardIndex(index);
  setCardExpanded(false);
 };

 const move=(target:Action)=>{
  if(onNavigate)onNavigate(target);
  else {
   const labels:Record<Action,string>={novo:'Novo lançamento',transferencia:'Transferência',pendentes:'Pendentes',cartoes:'Cartões',lancamentos:'Lançamentos',beneficios:'Benefícios',relatorios:'Relatórios',metas:'Configurações'};
   setNotice(labels[target]+' ainda não está disponível nesta etapa da Web. A Home continua navegável para os detalhes já implementados.');
  }
 };
 const categories=useMemo(()=>new Map(data.categories.map(c=>[c.id,c.name])),[data.categories]);
 const accounts=useMemo(()=>new Map(data.accounts.map(a=>[a.id,a.name])),[data.accounts]);
 const movements=useMemo<Record<string,unknown>[]>(()=>data.transactions
  .filter(t=>t.status!=='cancelled'&&t.status!=='planned'&&t.date<=dateNow()&&(movementMode==='all'||t.type===movementMode))
  .slice().sort((a,b)=>b.date.localeCompare(a.date))
  .slice(0,8).map(t=>({id:t.id,date:t.date,description:t.description,
   category:t.categoryId?categories.get(t.categoryId)||'Sem categoria':'Sem categoria',
   account:t.accountId?accounts.get(t.accountId)||'—':'—',
   value:t.amount,amount:t.signedAmount,status:t.status})),[data.transactions,categories,accounts,movementMode]);
 const commitments=useMemo<Record<string,unknown>[]>(()=>{
  if(data.canonicalCommitments){
   // Resumo visual de até oito itens; consulta integral disponível sob demanda.
   return commitmentGridRows(data.canonicalCommitments);
  }
  // EXCLUSIVO da prévia de dados fictícios que recebeu aprovação visual.
  // A sessão autenticada não utiliza este fallback e nunca recalcula vencidos.
  if(!preview)return [];
  const planned=[...data.transactions,...(data.followingTransactions||[])].filter(t=>t.status==='planned'&&t.date>=dateNow()&&t.signedAmount<0)
   .map(t=>({id:'event:'+t.id,date:t.date,description:t.description,
    source:'Lançamento previsto',value:t.amount,status:'Previsto'}));
  const payables=data.payables.filter(p=>p.status!=='paid'&&p.status!=='cancelled'&&p.openAmount>0)
   .map(p=>({id:'payable:'+p.id,date:p.dueDate,description:p.description,
    source:'Conta a pagar',value:p.openAmount,status:p.status==='partial'?'Parcial':'A pagar'}));
  return [...planned,...payables].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).slice(0,8);
 },[data.canonicalCommitments,data.transactions,data.followingTransactions,data.payables,preview]);
 const movementColumns:DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Data',type:'date',width:105,sortable:true,filterable:true},
  {key:'description',label:'Descrição',type:'text',width:165,sortable:true,filterable:true,
    render:v=><span className="pano-cell-text" title={String(v??'—')}>{String(v??'—')}</span>},
  {key:'category',label:'Categoria',type:'text',width:145,sortable:true,filterable:true,
    render:v=>{const label=String(v??'Sem categoria');return <span className="pano-category" title={label}>
      <HomeGlyph name={categoryGlyph(label)} size={15} className="pano-category-svg"/>
      <span className="pano-category-text">{label}</span>
     </span>;}},
  {key:'account',label:'Conta',type:'text',width:114,sortable:true,filterable:true,
    render:v=><span className="pano-cell-text" title={String(v??'—')}>{String(v??'—')}</span>},
  {key:'value',label:'Valor',type:'currency',width:140,sortable:true,filterable:true,
   render:(v,row)=><strong className={Number(row.amount)<0?'pano-negative':'pano-positive'}>{Number(row.amount)<0?'− ':'+ '}{format(Number(v),hidden)}</strong>}
 ];
 const dueColumns:DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Vencimento',type:'date',width:162,sortable:true,filterable:true,
   render:(v,row)=>{
    // O dia e o estado de urgência vêm prontos da autoridade financeira.
    // A Home não compara datas nem altera situação de pagamento.
    const urgency=String(row.dueState??'');
    const urgencyLabel=urgency==='overdue'?'Vencido':urgency==='due_today'?'Vence hoje':urgency==='upcoming'?'A vencer':'';
    return <span className="pano-due-date">
      <span className="pano-due-date__value">{dateString(String(v??''))}</span>
      {urgencyLabel&&<span className={'pano-due-date__urgency is-'+urgency.replaceAll('_','-')}
        aria-label={urgencyLabel} title={urgencyLabel}>
        {urgency!=='upcoming'&&<HomeGlyph name="alert" size={12}/>}
        {urgencyLabel}
      </span>}
    </span>;
   }},
  {key:'description',label:'Descrição',type:'text',width:155,sortable:true,filterable:true,
    render:v=><span className="pano-cell-text" title={String(v??'—')}>{String(v??'—')}</span>},
  {key:'source',label:'Origem',type:'text',width:119,sortable:true,filterable:true,
    render:v=><span className="pano-cell-text" title={String(v??'—')}>{String(v??'—')}</span>},
  {key:'value',label:'Valor',type:'currency',width:112,sortable:true,filterable:true,render:v=><strong>{format(Number(v),hidden)}</strong>},
  {key:'status',label:'Situação',type:'text',width:124,sortable:true,filterable:true,
   render:v=>{const label=String(v??'—');
    return <span className={'pano-status'+(label==='Parcial'?' is-partial':label==='Previsto'?' is-planned':' is-payable')}
      title={label} aria-label={label}>{label}</span>}}
 ];
 // Resumo compacto: informação necessária à decisão sem rolagem lateral.
 // Origem e Situação continuam na consulta integral, com todas as colunas.
 // Não eliminar linhas, mudar valores, urgência ou critérios da API.
 const compactDueColumns:DataGridColumn<Record<string,unknown>>[]=dueColumns
  .filter(column=>column.key==='date'||column.key==='description'||column.key==='value')
  .map(column=>({
   ...column,
   label:column.key==='date'?'Vence em':column.label,
   width:column.key==='date'?143:column.key==='description'?157:124,
   minWidth:column.key==='date'?130:column.key==='description'?128:104,
  }));
 const period=monthFmt.format(new Date(month+'-01T12:00:00Z')).replace(/^./,s=>s.toLocaleUpperCase('pt-BR'));
 const stats:{label:string;value:number|null|undefined;note:string;icon:HomeIconName;kind:string;action:Action}[]=[
  {label:'Receitas',value:data.summary?.income,note:'',icon:'income',kind:'income',action:'lancamentos'},
  {label:'Despesas',value:data.summary?.expense,note:'',icon:'expense',kind:'expense',action:'lancamentos'},
  {label:'Pendências previstas',value:data.summary?.pendingAmount,note:data.summary?.pendingCount==null?'Sem leitura disponível':String(data.summary.pendingCount)+' registros',icon:'clock',kind:'pending',action:'pendentes'},
  {label:'Benefício',value:data.benefit?.balance,note:'Saldo separado das contas',icon:'gift',kind:'benefit',action:'beneficios'}
 ];
 return <div className="pano-root">
  {preview&&<div className="pano-preview-banner" role="note">PRÉVIA VISUAL · Dados fictícios de demonstração · Sem acesso ao banco de produção</div>}
  {notice&&<div className="pano-notice" role="status"><HomeGlyph name="alert" size={18}/><span>{notice}</span><button type="button" onClick={()=>setNotice(null)} aria-label="Fechar aviso">×</button></div>}
  <div className="pano-spotlight" aria-label="Visão financeira e cartões">
   <div className="pano-financial-column">
  <section className="pano-hero" aria-label="Saldo disponível monetário">
   <div className="pano-balance" aria-label="Saldo disponível monetário">
    <div className="pano-balance-top"><h1>Saldo disponível <span className="pano-balance-scope">CONTAS MONETÁRIAS</span></h1><button type="button" onClick={()=>setHidden(v=>!v)} aria-label={hidden?'Exibir valores':'Ocultar valores'} aria-pressed={hidden}><HomeGlyph name={hidden?'eyeOff':'eye'} size={19}/></button></div>
    <strong><Money hidden={hidden} value={data.available?.available}/></strong>
    <div className="pano-balance-bottom"><span>{data.available?'Posição de '+dateString(data.available.date):'Consulta de saldo indisponível'}</span><button type="button" onClick={()=>focusMovements('all')}>Ver movimentações <HomeGlyph name="arrow" size={17}/></button></div>
   </div>
  </section>
  <section className="pano-overview" aria-label="Indicadores financeiros">
   {stats.map(s=><button key={s.label} className={'pano-stat is-'+s.kind} type="button" onClick={()=>s.kind==='income'?focusMovements('income'):s.kind==='expense'?focusMovements('expense'):s.kind==='pending'?focusPending():focusBenefit()} aria-label={s.label+': '+format(s.value,hidden)+'. Abrir detalhes'}>
    <span className="pano-stat-head">
     <span className="pano-stat-icon"><HomeGlyph name={s.icon} size={23}/></span>
     <span className="pano-stat-copy">
      <span className="pano-stat-label">{s.label}</span>
      <strong>{format(s.value,hidden)}</strong>
      {s.note&&<small>{s.note}</small>}
     </span>
    </span>
   </button>)}
  </section>
   </div>
   <section ref={cardsSection} className="pano-panel pano-cards">
    <div className="pano-carousel-head"><PanelTitle icon="card" title="Meus cartões"/><button type="button" className="pano-view-all" onClick={()=>move('cartoes')}>Ver todos <HomeGlyph name="arrow" size={14}/></button></div>
    {selectedCard?<>
      <div className="pano-card-stage" aria-label={'Cartão '+(activeCardIndex+1)+' de '+cardCount} tabIndex={cardCount>1?0:undefined}
       onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stepCard(event.key==='ArrowLeft'?-1:1)}}}
       onTouchStart={event=>{touchStartX.current=event.touches[0]?.clientX??null}}
       onTouchEnd={event=>{const initial=touchStartX.current;touchStartX.current=null;if(initial==null)return;const moved=(event.changedTouches[0]?.clientX??initial)-initial;if(Math.abs(moved)>=45){ignoreCardClick.current=true;stepCard(moved<0?1:-1);window.setTimeout(()=>{ignoreCardClick.current=false},450)}}}>
       {previousCard&&<button type="button" className={'pano-card-peek is-prev pano-peek-tone-'+((activeCardIndex-1+cardCount)%3)} onClick={()=>stepCard(-1)} aria-label={'Cartão anterior: '+previousCard.name}>
        <span className="pano-card-peek-brand"><CardBrandMark brand={previousCard.brand}/></span>
        <span className="pano-card-peek-name">{previousCard.name}</span>
       </button>}
       <button key={selectedCard.id+'-'+cardMotionKey} type="button" className={'pano-credit-card pano-plastic-tone-'+(activeCardIndex%3)+' is-arriving-'+cardDirection} onClick={()=>{if(ignoreCardClick.current)return;setCardExpanded(v=>!v)}} aria-expanded={cardExpanded} aria-label={'Ver detalhes do cartão '+selectedCard.name}>
        <span className="pano-credit-card-top"><span className="pano-card-hardware" aria-hidden="true">
         <svg className="pano-card-chip" viewBox="0 0 52 39" fill="none"><rect x="1" y="1" width="50" height="37" rx="8" fill="#CBBDA2" stroke="#EEE6D4" strokeWidth="1.5"/><path d="M17 1v37M35 1v37M1 14h16m18 0h16M1 25h16m18 0h16M17 14h18v11H17z" stroke="#8A8779" strokeWidth="1.4"/><path d="M22 14v11m8-11v11" stroke="#9F9C8D"/></svg>
         <svg className="pano-card-contactless" viewBox="0 0 32 32" fill="none"><path d="M9 12a8 8 0 0 1 0 8M14 8a14 14 0 0 1 0 16M19 4a20 20 0 0 1 0 24" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"/></svg>
        </span><CardBrandMark brand={selectedCard.brand}/></span>
        <span className="pano-credit-card-name">{selectedCard.name}</span>
        <span className="pano-credit-card-meta">{selectedCard.issuer||'Cartão cadastrado'}</span>
        <span className="pano-credit-card-bottom"><span>{selectedCard.lastFour?'••••  '+selectedCard.lastFour:'Cartão cadastrado'}</span><span className="pano-card-kind">CRÉDITO</span></span>
       </button>
       {nextCard&&<button type="button" className={'pano-card-peek is-next pano-peek-tone-'+((activeCardIndex+1)%3)} onClick={()=>stepCard(1)} aria-label={'Próximo cartão: '+nextCard.name}>
        <span className="pano-card-peek-brand"><CardBrandMark brand={nextCard.brand}/></span>
        <span className="pano-card-peek-name">{nextCard.name}</span>
       </button>}
       <button type="button" className="pano-card-control is-prev" aria-label="Cartão anterior" disabled={cardCount<2} onClick={()=>stepCard(-1)}><HomeGlyph name="chevronLeft" size={23}/></button>
       <button type="button" className="pano-card-control is-next" aria-label="Próximo cartão" disabled={cardCount<2} onClick={()=>stepCard(1)}><HomeGlyph name="chevronRight" size={23}/></button>
      </div>
      <div className="pano-card-summary" aria-label={'Resumo do cartão '+selectedCard.name}>
       <div className="pano-card-summary-info">
        <span className="pano-card-summary-icon" aria-hidden="true"><HomeGlyph name="card" size={21}/></span>
        <div className="pano-card-summary-copy">
         <strong title={selectedCard.name}>{selectedCard.name}</strong>
         <span>{selectedCard.issuer||'Cartão cadastrado'} <span aria-hidden="true">·</span> Crédito</span>
        </div>
       </div>
       <div className="pano-card-nav" aria-label="Selecionar cartão">
        <span className="pano-card-indicator">{data.cards.map((card,i)=><button type="button" key={card.id} className={i===activeCardIndex?'is-current':''} onClick={()=>showCard(i)} aria-label={'Mostrar cartão '+(i+1)} aria-current={i===activeCardIndex?'true':undefined}/>)}</span>
       </div>
       <div className="pano-card-amount"><span>Fatura em aberto</span><strong><Money hidden={hidden} value={selectedCard.payableStatementAmount}/></strong></div>
      </div>
      {cardExpanded&&<div className="pano-card-details" role="region" aria-label="Detalhes do cartão">
       {selectedCard.availableLimit!=null&&<span>Limite disponível <Money hidden={hidden} value={selectedCard.availableLimit}/></span>}
       {selectedCard.creditLimit!=null&&<span>Limite cadastrado <Money hidden={hidden} value={selectedCard.creditLimit}/></span>}
       {selectedCard.dueDay!=null&&<span>Dia do vencimento <strong>{selectedCard.dueDay}</strong></span>}
       <button type="button" onClick={()=>move('cartoes')}>Abrir módulo de cartões <HomeGlyph name="arrow" size={15}/></button>
      </div>}
     </>:<div className="pano-card-empty"><HomeGlyph name="card" size={27}/><p>Nenhum cartão cadastrado.</p><button type="button" onClick={()=>move('cartoes')}>Acessar cartões <HomeGlyph name="arrow" size={15}/></button></div>}
   </section>
  </div>

  {/* Quatro atalhos originais, configuráveis sem alterar o restante da Home. */}
  <QuickActions userId={userId} preview={preview} onNavigate={move}/>

  <div className="pano-finance-block" aria-label="Leitura gerencial do mês">
   <div className="pano-finance-column is-primary">
    <section ref={flowSection} className="pano-panel pano-flow">
    <div className="pano-flow-head"><PanelTitle icon="chart" title="Fluxo financeiro"/>
     <button type="button" className="pano-flow-open" onClick={()=>move('relatorios')} aria-label="Abrir relatórios financeiros">Ver relatórios <HomeGlyph name="arrow" size={16}/></button>
    </div>
    <div className="pano-flow-balance"><span>Resultado projetado</span><strong><Money value={data.summary?.projectedResult} hidden={hidden}/></strong></div>
    <HomeChart days={data.cashflow?.days||[]} hidden={hidden}/>
    <p className="pano-flow-footnote">Entradas <i className="pano-chart-key is-income"/> · Saídas <i className="pano-chart-key is-expense"/> · Linha azul: resultado diário</p>
   </section>
    <section ref={movementSection} className={'pano-panel pano-grid '+(showMovementFilters?'is-filters-open':'')}><div className="pano-grid-heading"><PanelTitle icon="activity" title={movementMode==='income'?'Últimas receitas':movementMode==='expense'?'Últimas despesas':'Últimas movimentações'}/>
     <div className="pano-grid-actions">{movementMode!=='all'&&<button type="button" onClick={()=>setMovementMode('all')}>Limpar seleção</button>}
      <button type="button" onClick={()=>setShowMovementFilters(v=>!v)} aria-expanded={showMovementFilters} aria-label={(showMovementFilters?'Ocultar':'Mostrar')+' filtros das movimentações'}>
       <HomeGlyph name="filter" size={15}/>{showMovementFilters?'Ocultar filtros':'Mostrar filtros'}{movementFiltersCount>0?' ('+movementFiltersCount+')':''}
      </button></div></div>
     <DataGrid data={movements} columns={movementColumns} pageSize={5} pageSizeOptions={[5,10]} rowKey="id" persistenceKey="meg-panorama-06-movements" ariaLabel="Últimas movimentações" onFilterChange={state=>setMovementFiltersCount(state.activeKeys.length)}/></section>
   </div>
   <div className="pano-finance-column is-secondary">
    <section ref={benefitSection} className="pano-panel pano-benefits">
    <PanelTitle icon="gift" title="Benefícios" meta="Saldo separado das contas monetárias"/>
    <button type="button" className="pano-benefit-card" onClick={()=>move('beneficios')} aria-label="Abrir módulo de benefícios">
     <div className="pano-benefit-card-copy"><span className="pano-eyebrow">BENEFÍCIO</span><h3>Alimentação</h3><span>Saldo do benefício</span><strong><Money hidden={hidden} value={data.benefit?.balance}/></strong><span className="pano-benefit-callout">Ver benefício <HomeGlyph name="arrow" size={15}/></span></div>
     <div className="pano-benefit-visual" aria-hidden="true"/>
    </button>
    <div className="pano-benefit-details"><span>Créditos no mês <strong><Money value={data.benefit?.credits} hidden={hidden}/></strong></span><span>Utilizado no mês <strong><Money value={data.benefit?.used} hidden={hidden}/></strong></span></div>
   </section>
    <section ref={dueSection} className={'pano-panel pano-grid pano-grid--commitments '+(showDueFilters?'is-filters-open':'')}><div className="pano-grid-heading"><PanelTitle icon="calendarClock" title="Próximos compromissos"/>
     <div className="pano-grid-actions"><button type="button"
      onClick={()=>setShowAllCommitments(true)}
      aria-label="Ver todos os compromissos">Ver todos <HomeGlyph name="arrow" size={14}/></button>
     <button type="button" onClick={()=>setShowDueFilters(v=>!v)} aria-expanded={showDueFilters} aria-label={(showDueFilters?'Ocultar':'Mostrar')+' filtros dos compromissos'}>
      <HomeGlyph name="filter" size={15}/>{showDueFilters?'Ocultar filtros':'Mostrar filtros'}{dueFiltersCount>0?' ('+dueFiltersCount+')':''}</button></div></div>
     <DataGrid data={commitments} columns={compactDueColumns} pageSize={5} pageSizeOptions={[5,10]} rowKey="id" persistenceKey="meg-panorama-08-due-compact-v1" ariaLabel="Próximos compromissos" onFilterChange={state=>setDueFiltersCount(state.activeKeys.length)}/></section>
   </div>
  </div>
  {showAllCommitments&&<HomeCommitmentsFullList
    columns={dueColumns} mapRows={commitmentGridRows}
    preview={preview} previewRows={commitments}
    onDismiss={()=>setShowAllCommitments(false)}/>}
 </div>;
}
export function HomeDashboard({previewData,onNavigate,month:providedMonth,userId}:Props){
 const current=providedMonth&&/^\d{4}-(0[1-9]|1[0-2])$/.test(providedMonth)?providedMonth:dateNow().slice(0,7);
 const [data,setData]=useState<HomeFinancialData|null>(previewData||null);
 const [error,setError]=useState<string|null>(null);
 const [loading,setLoading]=useState(!previewData);
 const serial=useRef(0);
 const reload=useCallback(async()=>{
  if(previewData)return;
  const id=++serial.current;setLoading(true);setError(null);
  try{const result=await readHome(current);if(serial.current===id)setData(result)}
  catch{if(serial.current===id){setData(null);setError('Não foi possível consultar as informações financeiras e compromissos abertos. Nenhum resultado foi estimado.')}}
  finally{if(serial.current===id)setLoading(false)}
 },[current,previewData]);
 useEffect(()=>{if(previewData){setData(previewData);return}void reload();const onRefresh=()=>void reload();window.addEventListener('meg:data-invalidated',onRefresh);window.addEventListener('focus',onRefresh);return()=>{serial.current++;window.removeEventListener('meg:data-invalidated',onRefresh);window.removeEventListener('focus',onRefresh)}},[previewData,reload]);
 return <>{error&&<div className="pano-error" role="alert">{error}<button type="button" onClick={()=>void reload()}><HomeGlyph name="reload" size={16}/> Tentar novamente</button></div>}
 {!error&&(loading&&!data?<div className="pano-loading" role="status">Consultando seus dados financeiros...</div>:<HomeContent data={data||emptyState} month={current} preview={Boolean(previewData)} onNavigate={onNavigate} userId={userId}/>)}</>;
}
