import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authenticatedRequest } from '../../app/auth-client';
// A fonte única da Etapa 02 é JavaScript. Sua tipagem fica isolada na fronteira de adaptação.
// @ts-expect-error módulo JS da Etapa 02, sem declarações TS exportadas
import { composeMegApiSnapshot, fromCanonicalReadModels, fromFinancialEvents, fromPayables, fromCards, fromFinanceCatalogs } from '../../evolution/data/api-adapter.js';
import { DataGrid } from '../datagrid/DataGrid';
import { HomeDescriptionCell, HomeCategoryCell } from './HomeFinanceVisuals';
import type { DataGridColumn } from '../datagrid/types';
import './home.css';

type HomeOverview = { month: string; effectiveAt: string; available: number; payables: { openAmount: number; count: number }; cards: { openAmount: number; count: number }; paid: { count: number } };
type Summary = { month: string; availableBalance: number; income: number; expense: number; projectedResult: number; realizedIncome: number; realizedExpense: number; realizedResult: number; eventCount: number; pendingCount: number; pendingAmount: number };
type FlowDay = { date: string; income: number; expense: number; net: number; realizedBalance: number };
type BenefitSummary = { month: string; balance: number; credits: number; used: number };
type Cashflow = { month: string; openingBalance: number; realizedClosing: number; days: FlowDay[]; totalIncome: number; totalExpense: number };
type Analytics = { month: string; previous?: { income: number; expense: number; result: number }; delta?: { income: number; expense: number; result: number } };
type Movement = { id: string; date: string; description: string; type: string; status: string; amount: number; signedAmount: number; categoryId?: string | null; accountId?: string | null };
type Payable = { id: string; description: string; dueDate: string; totalAmount: number; openAmount: number; status: string; categoryId?: string | null };
type Category = { id: string; name: string };
type Card = { id: string; name: string; statementAmount?: number; payableStatementAmount?: number };
export type HomeSnapshot = {
  meta?: { mode?: string; month?: string };
  readModels: { summary?: Summary | null; cashflow?: Cashflow | null; analytics?: Analytics | null; benefitSummary?: BenefitSummary | null; homeOverview?: HomeOverview | null };
  transactions: Movement[];
  payables: Payable[];
  cards: Card[];
  categories: Category[];
  accounts?: {id:string; name:string}[];
  /** Apenas para demonstração visual. Não é um read model financeiro. */
  previewMetrics?: { pay: number; invoice: number; paid: number; payCount: number; invoiceCount: number; paidCount: number };
};
type HomeAction = 'lancamentos' | 'pendentes' | 'cartoes' | 'beneficios' | 'novo' | 'transferencia' | 'relatorios' | 'metas';
type Props = { snapshot?: HomeSnapshot | null; previewOnly?: boolean; onNavigate?: (action: HomeAction) => void; selectedMonth?: string; searchQuery?: string };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const amount = (value: number | null | undefined) => Number.isFinite(value) ? money.format(value as number) : '—';
function saoPauloToday() {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = (name:string) => parts.find(item=>item.type===name)?.value || '00';
  return part('year')+'-'+part('month')+'-'+part('day');
}
function currentMonth() {
  return saoPauloToday().slice(0, 7);
}
function dateText(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return '—';
  return day.format(new Date(value.slice(0, 10) + 'T12:00:00Z'));
}
function categoryName(ids: Category[], id?: string | null) {
  return ids.find(item => item.id === id)?.name || 'Sem categoria';
}
function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const parts: Record<string, ReactNode> = {
    wallet: <><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M4 8V5a2 2 0 0 1 2-2h12"/><path d="M16 13h5v5h-5a2 2 0 0 1 0-5Z"/></>,
    flow: <><path d="M4 19V12M10 19V5M16 19V9M22 19v-9"/></>,
    up: <path d="m4 15 8-8 8 8M12 7v14"/>,
    down: <path d="m4 9 8 8 8-8M12 17V3"/>,
    equal: <path d="M4 9h16M4 15h16"/>,
    file: <><path d="M7 3h8l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h6M9 13h8M9 17h8"/></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m7 12 3.5 3.5L17 9"/></>,
    gift: <><rect x="4" y="10" width="16" height="11" rx="1"/><path d="M3 7h18v3H3zM12 7v14M12 7C8-1 3 4 6 7M12 7c4-8 9-3 6 0"/></>,
    zap: <path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z"/>,
    plus: <path d="M12 4v16M4 12h16"/>,
    swap: <><path d="M3 8h18l-5-5M21 16H3l5 5"/></>,
    report: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 17v-4M12 17V8M16 17v-6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>,
    cart: <><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 3h3l3 13h12l2-9H6"/></>,
    fuel: <><path d="M4 21V4h11v17M2 21h15M7 8h5M15 11l4 4v4a2 2 0 0 0 4 0V9l-4-5"/></>,
    restaurant: <><path d="M4 3v8M7 3v8M10 3v8M7 11v10M17 21V3c-6 2-6 10 0 11"/></>,
    medicine: <><path d="m4 14 10-10a5 5 0 0 1 7 7L11 21a5 5 0 0 1-7-7ZM9 9l6 6"/></>,
    arrow: <path d="m9 5 7 7-7 7"/>,
    eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M3 3l18 18M8 6.7A12 12 0 0 1 12 6c6 0 10 6 10 6a14 14 0 0 1-3.7 4.2M6 8c-2.5 1.8-4 4-4 4s4 6 10 6a11 11 0 0 0 3-.4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{parts[name] || parts.file}</svg>;
}
function SectionHeading({icon,title,children}:{icon:string;title:string;children?:ReactNode}) {
  return <div className="meg-home-panel-heading"><span className="meg-home-heading-icon"><Icon name={icon}/></span><h2>{title}</h2>{children}</div>;
}
const movementColumns:DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Data',type:'date',width:80,minWidth:70,sortable:true,filterable:true},
  {key:'description',label:'Descrição',type:'text',width:154,minWidth:115,sortable:true,filterable:true,
    render:(v,row)=><HomeDescriptionCell description={String(v??'')} category={String(row.category??'')} type={String(row.kind??'')}/>},
  {key:'category',label:'Categoria',type:'text',width:96,minWidth:80,sortable:true,filterable:true,
    render:(v,row)=><HomeCategoryCell category={String(v??'')} type={String(row.kind??'')}/>},
  {key:'value',label:'Valor',type:'currency',width:112,minWidth:96,sortable:true,filterable:true,
    render:(v,row)=><span className={'meg-home-value '+(Number(row.signedAmount)>=0?'meg-home-positive':'meg-home-negative')}>{Number(row.signedAmount)>=0?'+ ':'− '}{amount(Number(v))}</span>},
  {key:'account',label:'Conta',type:'text',width:72,minWidth:60,sortable:true,filterable:true},
];
const dueColumns:DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Data',type:'date',width:80,minWidth:70,sortable:true,filterable:true},
  {key:'description',label:'Descrição',type:'text',width:154,minWidth:115,sortable:true,filterable:true,
    render:(v,row)=><HomeDescriptionCell description={String(v??'')} category={String(row.category??'')}/>},
  {key:'category',label:'Categoria',type:'text',width:96,minWidth:80,sortable:true,filterable:true,
    render:(v)=><HomeCategoryCell category={String(v??'')}/>},
  {key:'value',label:'Valor',type:'currency',width:112,minWidth:96,sortable:true,filterable:true,
    render:(v)=><span className="meg-home-value">{amount(Number(v))}</span>},
  {key:'account',label:'Conta',type:'text',width:72,minWidth:60,sortable:true,filterable:true},
];

function HomeView({snapshot,previewOnly=false,onNavigate,searchQuery=''}:{snapshot:HomeSnapshot|null;previewOnly?:boolean;onNavigate?:Props['onNavigate'];searchQuery?:string}) {
  const summary=snapshot?.readModels.summary ?? null;
  const flow=snapshot?.readModels.cashflow ?? null;
  const benefit=snapshot?.readModels.benefitSummary ?? null;
  const overview=snapshot?.readModels.homeOverview ?? null;
  const [gridTools,setGridTools]=useState({recent:false,upcoming:false});
  const [balanceHidden,setBalanceHidden]=useState(false);
  const query=searchQuery.trim().toLocaleLowerCase('pt-BR');
  const movementRows=useMemo<Record<string,unknown>[]>(()=> (snapshot?.transactions??[])
    .filter(t=>t.status!=='cancelled' && (!query || [t.description,categoryName(snapshot?.categories??[],t.categoryId),snapshot?.accounts?.find(a=>a.id===t.accountId)?.name].some(value=>String(value??'').toLocaleLowerCase('pt-BR').includes(query))))
    .slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7)
    .map(t=>({
      id:t.id,date:t.date,description:t.description,
      category:categoryName(snapshot?.categories??[],t.categoryId),
      value:Math.abs(t.signedAmount),signedAmount:t.signedAmount,kind:t.type,
      account:snapshot?.accounts?.find(a=>a.id===t.accountId)?.name ?? '—',
    })),[snapshot,query]);
  const dueRows=useMemo<Record<string,unknown>[]>(()=> (snapshot?.payables??[])
    .filter(p=>p.status!=='paid'&&p.status!=='cancelled'&&p.openAmount>0 && (!query || [p.description,categoryName(snapshot?.categories??[],p.categoryId)].some(value=>String(value??'').toLocaleLowerCase('pt-BR').includes(query))))
    .slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,7)
    .map(p=>({id:p.id,date:p.dueDate,description:p.description,
      category:categoryName(snapshot?.categories??[],p.categoryId),value:p.openAmount,account:'—'})),[snapshot,query]);
  const go=(destination:HomeAction)=>{
    if(onNavigate) onNavigate(destination);
    else if(!previewOnly) window.dispatchEvent(new CustomEvent('meg:request-navigation',{detail:{destination}}));
  };
  const month=summary?.month||flow?.month||currentMonth();
  const periodTitle=monthName.format(new Date(month+'-01T12:00:00Z')).replace(/^./,c=>c.toLocaleUpperCase('pt-BR'));
  const overviewValid=overview&&Number.isFinite(overview.available);
  const mainBalance=overviewValid?overview.available:null;
  const showMoney=(value:number|null|undefined)=>balanceHidden?'R$ •••••':amount(value);
  const items=[
    {id:'pay',icon:'file',label:'Contas a pagar',value:overview?.payables.openAmount,caption:overview?overview.payables.count+' contas em aberto':'Sem leitura disponível',color:'red',dest:'pendentes' as HomeAction},
    {id:'card',icon:'card',label:'Faturas de cartões',value:overview?.cards.openAmount,caption:overview?overview.cards.count+' faturas em aberto':'Sem leitura disponível',color:'blue',dest:'cartoes' as HomeAction},
    {id:'pending',icon:'clock',label:'Lançamentos pendentes',value:summary?.pendingAmount,caption:summary?summary.pendingCount+' lançamentos previstos':'Sem leitura disponível',color:'gold',dest:'pendentes' as HomeAction},
    {id:'paid',icon:'check',label:'Contas pagas',value:null,caption:overview?overview.paid.count+' contas com vencimento no mês, quitadas':'Sem leitura disponível',color:'green',dest:'pendentes' as HomeAction},
  ];
  const actions=[
    {icon:'plus',name:'Novo lançamento',dest:'novo' as HomeAction,color:'teal'},
    {icon:'swap',name:'Transferência',dest:'transferencia' as HomeAction,color:'blue'},
    {icon:'file',name:'Pagar conta',dest:'pendentes' as HomeAction,color:'purple'},
    {icon:'report',name:'Relatórios',dest:'relatorios' as HomeAction,color:'amber'},
    {icon:'settings',name:'Configurar metas',dest:'metas' as HomeAction,color:'slate'},
  ];
  const paidCount=overview?.paid.count;
  return <div className="meg-home meg-home-reference-02">
    <h1 className="meg-home-sr-title">Visão geral das finanças</h1>
    {previewOnly&&<div className="meg-home-preview-warning" role="note">PRÉVIA VISUAL · Valores fictícios para avaliar o layout · Sem conexão com contas reais</div>}
    
    <div className="meg-home-dash">
      <section className="meg-home-card balance" data-panel="saldo" aria-labelledby="meg-home-available-balance">
        <img className="meg-home-wallet-photo" src="/meg-web-evolution/home/wallet-official-02.webp" alt="" aria-hidden="true" decoding="async"/>
        <div className="meg-home-hero-copy">
          <div className="meg-home-hero-heading">
            <h2 id="meg-home-available-balance">Saldo disponível</h2>
            <button className="meg-home-privacy" type="button" aria-label={balanceHidden?'Mostrar saldos':'Ocultar saldos'} aria-pressed={balanceHidden} onClick={()=>setBalanceHidden(x=>!x)}><Icon name={balanceHidden?'eyeOff':'eye'} size={19}/></button>
          </div>
          <strong className="meg-home-hero-balance">{showMoney(mainBalance)}</strong>
          <p className="meg-home-hero-meta">{overviewValid?'Saldo monetário em '+dateText(overview.effectiveAt):'Saldo consolidado não disponível'}</p>
          <button type="button" className="meg-home-hero-details" onClick={()=>go('lancamentos')}>Ver detalhes <Icon name="arrow" size={16}/></button>
        </div>
      </section>
      <section className="meg-home-card flow" data-panel="saldo">
        <div className="meg-home-panel-heading"><span className="meg-home-heading-icon"><Icon name="flow" size={20}/></span><h2>Fluxo do mês</h2><span className="meg-home-flow-caption">{periodTitle}</span></div>
        <div className="meg-home-flow-totals">
          <div><Icon name="up" size={18}/><span>Entradas<strong>{showMoney(summary?.income)}</strong></span></div>
          <div><Icon name="down" size={18}/><span>Saídas<strong>{showMoney(summary?.expense)}</strong></span></div>
          {summary && (summary.income>0 || summary.expense>0) && <div className="meg-home-flow-distribution" role="img" aria-label="Proporção visual entre entradas e saídas apuradas no período">
            <span className="meg-home-flow-in" style={{flexGrow:Math.max(0,summary.income)}}/>
            <span className="meg-home-flow-out" style={{flexGrow:Math.max(0,summary.expense)}}/>
          </div>}
          <div className="meg-home-flow-result"><Icon name="equal" size={18}/><span>Resultado<strong>{showMoney(summary?.projectedResult)}</strong></span></div>
        </div>

      </section>
      {items.map((item)=><button type="button" key={item.id} data-panel="indicadores" className={'meg-home-card meg-home-kpi kpi--'+item.id} onClick={()=>go(item.dest)}>
        <span className={'meg-home-kpi-icon is-'+item.color}><Icon name={item.icon} size={24}/></span>
        <span className="meg-home-kpi-copy"><span className="meg-home-kpi-title">{item.label}</span><strong>{item.id==='paid'?(paidCount==null?'—':String(paidCount)+' contas'):showMoney(item.value)}</strong><small>{item.caption}</small></span>
        <span className="meg-home-kpi-arrow"><Icon name="arrow" size={17}/></span>
      </button>)}
      <section className="meg-home-card benefits" data-panel="operacoes" aria-labelledby="meg-benefit-title">

        <div className="meg-home-benefit-body">
          <div className="meg-home-benefit-intro"><span className="meg-home-heading-icon"><Icon name="gift" size={21}/></span><div><h2 id="meg-benefit-title">Benefícios Verocard</h2><p>Seu saldo e seus benefícios em um só lugar</p></div></div>
          <div className="meg-home-benefit-finances">
            <span className="meg-home-benefit-finances-label">Saldo do benefício</span>
            <strong className="meg-home-benefit-balance">{showMoney(benefit?.balance)}</strong>

          </div>
          <div className="meg-home-benefit-monthly">
            <div><Icon name="up" size={17}/><span>Créditos do mês<strong>{showMoney(benefit?.credits)}</strong></span></div>
            <div><Icon name="down" size={17}/><span>Utilizado no mês<strong>{showMoney(benefit?.used)}</strong></span></div>
          </div>
          <button type="button" className="meg-home-button meg-home-benefit-cta" onClick={()=>go('beneficios')}>Acessar benefícios <Icon name="arrow" size={17}/></button>
        </div>
        <img className="meg-home-benefit-card" src="/meg-web-evolution/home/verocard-oficial-panorama.webp" alt="" aria-hidden="true"/>
      </section>
      <section className="meg-home-card quick" data-panel="operacoes">
        <div className="meg-home-panel-heading"><span className="meg-home-heading-icon"><Icon name="zap" size={20}/></span><h2>Ações rápidas</h2></div>
        <div className="meg-home-quick-grid">{actions.map(item=><button type="button" className={'meg-home-quick-action quick-'+item.color} key={item.name} onClick={()=>go(item.dest)}><span className="meg-home-quick-icon"><Icon name={item.icon} size={22}/></span><strong>{item.name}</strong></button>)}</div>
      </section>
      <section className="meg-home-card recent" data-panel="tabelas">
        <SectionHeading icon="swap" title="Últimas movimentações"/>
        <div className="meg-home-panel-controls"><button className="meg-home-grid-tools" type="button" aria-expanded={gridTools.recent} aria-label="Mostrar ou ocultar ferramentas da tabela de movimentações" onClick={()=>setGridTools(value=>({...value,recent:!value.recent}))}><Icon name="flow" size={16}/></button><button className="meg-home-see-all" type="button" onClick={()=>go('lancamentos')}>Ver todas <Icon name="arrow" size={14}/></button></div>
        <div className={'meg-home-grid-slot '+(gridTools.recent?'is-expanded':'')}><DataGrid data={movementRows} columns={movementColumns} pageSize={5} rowKey="id" persistenceKey="meg-home-recent" ariaLabel="Últimas movimentações"/></div>
      </section>
      <section className="meg-home-card upcoming" data-panel="tabelas">
        <SectionHeading icon="clock" title="Próximos vencimentos"/>
        <div className="meg-home-panel-controls"><button className="meg-home-grid-tools" type="button" aria-expanded={gridTools.upcoming} aria-label="Mostrar ou ocultar ferramentas da tabela de vencimentos" onClick={()=>setGridTools(value=>({...value,upcoming:!value.upcoming}))}><Icon name="flow" size={16}/></button><button className="meg-home-see-all" type="button" onClick={()=>go('pendentes')}>Ver todas <Icon name="arrow" size={14}/></button></div>
        <div className={'meg-home-grid-slot '+(gridTools.upcoming?'is-expanded':'')}><DataGrid data={dueRows} columns={dueColumns} pageSize={5} rowKey="id" persistenceKey="meg-home-due" ariaLabel="Próximos vencimentos"/></div>
      </section>
    </div>
  </div>;
}
export function HomeScreen({snapshot:provided,previewOnly=false,onNavigate,selectedMonth,searchQuery}:Props) {
  const [snapshot,setSnapshot]=useState<HomeSnapshot|null>(provided||null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(!provided&&!previewOnly);
  const requestId=useRef(0);
  const month=selectedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)?selectedMonth:currentMonth();
  const reload=useCallback(async()=>{
    if(previewOnly) return;
    const id=++requestId.current;
    setLoading(true);setError(null);setSnapshot(null);
    try{
      const [summary,cashflow,analytics,benefitSummary,homeOverview,events,payables,cards,categories,accounts]=await Promise.all([
        authenticatedRequest<Summary>('/finance/summary?month='+month,{cache:'no-store'}),
        authenticatedRequest<Cashflow>('/finance/cashflow?month='+month,{cache:'no-store'}),
        authenticatedRequest<Analytics>('/finance/analytics?month='+month,{cache:'no-store'}),
        authenticatedRequest<BenefitSummary>('/finance/benefit-summary?month='+month,{cache:'no-store'}),
        authenticatedRequest<HomeOverview>('/finance/home-overview?month='+month+'&date='+saoPauloToday(),{cache:'no-store'}),
        authenticatedRequest<unknown>('/finance/events/month?month='+month,{cache:'no-store'}),
        authenticatedRequest<unknown>('/payables/open',{cache:'no-store'}),
        authenticatedRequest<unknown>('/cards?month='+month,{cache:'no-store'}),
        authenticatedRequest<unknown>('/finance/categories',{cache:'no-store'}),
        authenticatedRequest<unknown>('/finance/accounts',{cache:'no-store'}),
      ]);
      const source=composeMegApiSnapshot([
        fromCanonicalReadModels({summary,cashflow,analytics,benefitSummary,homeOverview}),
        fromFinancialEvents(events),
        fromPayables(payables),
        fromCards(cards),
        fromFinanceCatalogs({categories,accounts}),
      ]);
      if(id===requestId.current)setSnapshot(source as HomeSnapshot);
    }catch{
      if(id===requestId.current)setError('Não foi possível carregar os dados financeiros. Nenhum valor foi estimado.');
    }finally{if(id===requestId.current)setLoading(false);}
  },[previewOnly,month]);
  useEffect(()=>{if(provided){setSnapshot(provided);return;}void reload();if(previewOnly)return;
    const onRefresh=()=>void reload();
    window.addEventListener('meg:data-invalidated',onRefresh);
    window.addEventListener('focus',onRefresh);
    return()=>{requestId.current++;window.removeEventListener('meg:data-invalidated',onRefresh);window.removeEventListener('focus',onRefresh);};
  },[provided,previewOnly,reload]);
  return <>{error&&<div className="meg-home-error" role="alert">{error} <button type="button" onClick={()=>void reload()}>Tentar novamente</button></div>}{loading&&!snapshot?<div className="meg-home-loading" role="status">Carregando dados financeiros...</div>:<HomeView snapshot={snapshot} previewOnly={previewOnly} onNavigate={onNavigate} searchQuery={searchQuery}/>}</>;
}
