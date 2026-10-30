import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authenticatedRequest } from '../../app/auth-client';
// A fonte única da Etapa 02 é JavaScript. Sua tipagem fica isolada na fronteira de adaptação.
// @ts-expect-error módulo JS da Etapa 02, sem declarações TS exportadas
import { composeMegApiSnapshot, fromCanonicalReadModels, fromFinancialEvents, fromPayables, fromCards, fromFinanceCatalogs } from '../../evolution/data/api-adapter.js';
import { DataGrid } from '../datagrid/DataGrid';
import { HomeDescriptionCell, HomeCategoryCell } from './HomeFinanceVisuals';
import type { DataGridColumn } from '../datagrid/types';
import { HomeCard, HomeButton } from './HomePrimitives';
import { HomeCashflowChart } from './HomeCashflowChart';
import { Icon } from './HomeIcons';
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
function payableStatusLabel(status: string) {
  // Tradução textual do status retornado pelo domínio; não classifica vencimento nem calcula baixa.
  return ({open:'A pagar',partial:'Parcial'} as Record<string,string>)[status] ?? status;
}
function categoryName(ids: Category[], id?: string | null) {
  return ids.find(item => item.id === id)?.name || 'Sem categoria';
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
  {key:'description',label:'Descrição',type:'text',width:146,minWidth:105,sortable:true,filterable:true,
    render:(v,row)=><HomeDescriptionCell description={String(v??'')} category={String(row.category??'')}/>},
  {key:'category',label:'Categoria',type:'text',width:88,minWidth:72,sortable:true,filterable:true,
    render:(v)=><HomeCategoryCell category={String(v??'')}/>},
  {key:'value',label:'Valor',type:'currency',width:106,minWidth:88,sortable:true,filterable:true,
    render:(v)=><span className="meg-home-value">{amount(Number(v))}</span>},
  {key:'status',label:'Situação',type:'text',width:86,minWidth:75,sortable:true,filterable:true,
    render:(v)=><span className="meg-home-payable-status">{payableStatusLabel(String(v??''))}</span>},
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
    .slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.id.localeCompare(b.id)).slice(0,7)
    .map(p=>({id:p.id,date:p.dueDate,description:p.description,
      category:categoryName(snapshot?.categories??[],p.categoryId),value:p.openAmount,status:p.status})),[snapshot,query]);
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
    {id:'pending',icon:'clock',label:'Outras pendências',value:summary?.pendingAmount,caption:summary?summary.pendingCount+' lançamentos previstos':'Sem leitura disponível',color:'gold',dest:'pendentes' as HomeAction},
    {id:'paid',icon:'check',label:'Contas pagas',value:null,caption:overview?'Quitadas no período selecionado':'Sem leitura disponível',color:'green',dest:'pendentes' as HomeAction},
  ];
  const actions=[
    {icon:'plus',name:'Novo lançamento',dest:'novo' as HomeAction,color:'teal'},
    {icon:'swap',name:'Transferência',dest:'transferencia' as HomeAction,color:'blue'},
    {icon:'file',name:'Pagar conta',dest:'pendentes' as HomeAction,color:'purple'},
    {icon:'report',name:'Relatórios',dest:'relatorios' as HomeAction,color:'amber'},
    {icon:'settings',name:'Configurar metas',dest:'metas' as HomeAction,color:'slate'},
  ];
  const paidCount=overview?.paid.count;
  return <div className="meg-home meg-home-reference-screen">
    <h1 className="meg-home-sr-title">Visão geral das finanças</h1>
    {previewOnly&&<div className="meg-home-preview-warning" role="note">PRÉVIA VISUAL · Valores de demonstração · Sem conexão com contas reais</div>}
    <div className="meg-home-dash">
      <HomeCard className="balance" data-panel="saldo" aria-labelledby="meg-home-available-balance">
        <div className="meg-home-hero-visual" aria-hidden="true">

        </div>
        <div className="meg-home-hero-copy">
          <div className="meg-home-hero-heading">
            <span className="meg-home-hero-icon"><Icon name="wallet" size={26}/></span>
            <h2 id="meg-home-available-balance">Saldo disponível</h2>
            <button className="meg-home-privacy" type="button" aria-label={balanceHidden?'Mostrar saldos':'Ocultar saldos'} aria-pressed={balanceHidden} onClick={()=>setBalanceHidden(value=>!value)}><Icon name={balanceHidden?'eyeOff':'eye'} size={19}/></button>
          </div>
          <strong className="meg-home-hero-balance">{showMoney(mainBalance)}</strong>
          <p className="meg-home-hero-meta">{overviewValid?'Saldo monetário · posição em '+dateText(overview.effectiveAt):'Saldo consolidado não disponível'}</p>
          <HomeButton className="meg-home-hero-details" variant="outline" onClick={()=>go('lancamentos')}>Ver detalhes <Icon name="arrow" size={16}/></HomeButton>
        </div>
      </HomeCard>

      <HomeCard className="flow" data-panel="saldo">
        <div className="meg-home-panel-heading"><span className="meg-home-heading-icon"><Icon name="flow" size={21}/></span><h2>Fluxo do mês</h2><span className="meg-home-flow-caption">{periodTitle}</span></div>
        <div className="meg-home-flow-totals">
          <div className="meg-home-flow-stat is-income"><span className="meg-home-flow-stat-icon"><Icon name="up" size={21}/></span><span className="meg-home-flow-stat-copy">Entradas<strong>{showMoney(summary?.income)}</strong></span></div>
          <div className="meg-home-flow-stat is-expense"><span className="meg-home-flow-stat-icon"><Icon name="down" size={21}/></span><span className="meg-home-flow-stat-copy">Saídas<strong>{showMoney(summary?.expense)}</strong></span></div>
          <div className="meg-home-flow-result"><span>Resultado projetado<strong>{showMoney(summary?.projectedResult)}</strong></span></div>
        </div>
        {summary&&(summary.income>0||summary.expense>0)&&<div className="meg-home-flow-distribution" aria-hidden="true"><span className="meg-home-flow-in" style={{flexGrow:Math.max(0,summary.income)}}/><span className="meg-home-flow-out" style={{flexGrow:Math.max(0,summary.expense)}}/></div>}
        <HomeCashflowChart days={flow?.days??[]} hidden={balanceHidden}/>
      </HomeCard>

      {items.map(item=><button type="button" key={item.id} data-panel="indicadores" className={'meg-home-card meg-home-kpi kpi--'+item.id} onClick={()=>go(item.dest)}>
        <span className={'meg-home-kpi-icon is-'+item.color}><Icon name={item.icon} size={25}/></span>
        <span className="meg-home-kpi-copy"><span className="meg-home-kpi-title">{item.label}</span><strong>{item.id==='paid'?(paidCount==null?'—':String(paidCount)+' contas'):showMoney(item.value)}</strong><small>{item.caption}</small></span>
        <span className="meg-home-kpi-arrow" aria-hidden="true"><Icon name="arrow" size={18}/></span>
      </button>)}

      <HomeCard className="benefits" data-panel="operacoes" aria-labelledby="meg-benefit-title">
        <div className="meg-home-benefit-body">
          <div className="meg-home-benefit-intro"><span className="meg-home-heading-icon"><Icon name="gift" size={23}/></span><div><h2 id="meg-benefit-title">Benefícios Verocard</h2><p>Seu saldo e benefícios em um só lugar</p></div></div>
          <div className="meg-home-benefit-finances"><span className="meg-home-benefit-finances-label">Saldo do benefício</span><strong className="meg-home-benefit-balance">{showMoney(benefit?.balance)}</strong></div>
          <div className="meg-home-benefit-monthly">
            <div><Icon name="up" size={17}/><span>Créditos do mês<strong>{showMoney(benefit?.credits)}</strong></span></div>
            <div><Icon name="down" size={17}/><span>Utilizado no mês<strong>{showMoney(benefit?.used)}</strong></span></div>
          </div>
          <HomeButton variant="outline" className="meg-home-benefit-cta" onClick={()=>go('beneficios')}>Acessar benefícios <Icon name="arrow" size={16}/></HomeButton>
        </div>
        <div className="meg-home-vero-card" aria-hidden="true"><span className="meg-home-vero-name">VEROCARD</span><span className="meg-home-vero-chip"/><span className="meg-home-vero-mark">V</span></div>
      </HomeCard>

      <HomeCard className="quick" data-panel="operacoes">
        <div className="meg-home-panel-heading"><span className="meg-home-heading-icon"><Icon name="zap" size={23}/></span><h2>Ações rápidas</h2></div>
        <div className="meg-home-quick-grid">{actions.map(item=><button type="button" className={'meg-home-quick-action quick-'+item.color} key={item.name} onClick={()=>go(item.dest)} title={item.name}>
          <span className="meg-home-quick-icon"><Icon name={item.icon} size={23}/></span><strong>{item.name}</strong>
        </button>)}</div>
      </HomeCard>

      <HomeCard className="recent" data-panel="tabelas">
        <SectionHeading icon="swap" title="Últimas movimentações"/>
        <div className="meg-home-panel-controls"><button className="meg-home-grid-tools" type="button" aria-expanded={gridTools.recent} aria-label="Mostrar ou ocultar ferramentas da tabela de movimentações" onClick={()=>setGridTools(value=>({...value,recent:!value.recent}))}><Icon name="flow" size={16}/></button><HomeButton variant="quiet" className="meg-home-see-all" onClick={()=>go('lancamentos')}>Ver todas <Icon name="arrow" size={14}/></HomeButton></div>
        <div className={'meg-home-grid-slot '+(gridTools.recent?'is-expanded':'')}><DataGrid data={movementRows} columns={movementColumns} pageSize={5} rowKey="id" persistenceKey="meg-home-recent" ariaLabel="Últimas movimentações"/></div>
      </HomeCard>
      <HomeCard className="upcoming" data-panel="tabelas">
        <SectionHeading icon="clock" title="Próximos vencimentos"/>
        <div className="meg-home-panel-controls"><button className="meg-home-grid-tools" type="button" aria-expanded={gridTools.upcoming} aria-label="Mostrar ou ocultar ferramentas da tabela de vencimentos" onClick={()=>setGridTools(value=>({...value,upcoming:!value.upcoming}))}><Icon name="flow" size={16}/></button><HomeButton variant="quiet" className="meg-home-see-all" onClick={()=>go('pendentes')}>Ver todas <Icon name="arrow" size={14}/></HomeButton></div>
        <div className={'meg-home-grid-slot '+(gridTools.upcoming?'is-expanded':'')}><DataGrid data={dueRows} columns={dueColumns} pageSize={5} rowKey="id" persistenceKey="meg-home-due-chronological-v3" ariaLabel="Próximos vencimentos"/></div>
      </HomeCard>
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
