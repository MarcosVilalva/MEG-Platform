import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authenticatedRequest } from '../../app/auth-client';
// A fonte única da Etapa 02 é JavaScript. Sua tipagem fica isolada na fronteira de adaptação.
// @ts-expect-error módulo JS da Etapa 02, sem declarações TS exportadas
import { composeMegApiSnapshot, fromCanonicalReadModels, fromFinancialEvents, fromPayables, fromCards, fromFinanceCatalogs } from '../../evolution/data/api-adapter.js';
import { DataGrid } from '../datagrid/DataGrid';
import type { DataGridColumn } from '../datagrid/types';
import './home.css';

type Summary = { month: string; availableBalance: number; income: number; expense: number; projectedResult: number; realizedIncome: number; realizedExpense: number; realizedResult: number; eventCount: number; pendingCount: number; pendingAmount: number };
type FlowDay = { date: string; income: number; expense: number; net: number; realizedBalance: number };
type Cashflow = { month: string; openingBalance: number; realizedClosing: number; days: FlowDay[]; totalIncome: number; totalExpense: number };
type Analytics = { month: string; previous?: { income: number; expense: number; result: number }; delta?: { income: number; expense: number; result: number } };
type Movement = { id: string; date: string; description: string; type: string; status: string; amount: number; signedAmount: number; categoryId?: string | null };
type Payable = { id: string; description: string; dueDate: string; totalAmount: number; openAmount: number; status: string; categoryId?: string | null };
type Category = { id: string; name: string };
type Card = { id: string; name: string; statementAmount?: number; payableStatementAmount?: number };
export type HomeSnapshot = {
  meta?: { mode?: string; month?: string };
  readModels: { summary?: Summary | null; cashflow?: Cashflow | null; analytics?: Analytics | null };
  transactions: Movement[];
  payables: Payable[];
  cards: Card[];
  categories: Category[];
  /** Apenas para demonstração visual. Não é um read model financeiro. */
  previewMetrics?: { pay: number; invoice: number; paid: number; payCount: number; invoiceCount: number; paidCount: number };
};
type HomeAction = 'lancamentos' | 'pendentes' | 'cartoes' | 'beneficios' | 'novo' | 'transferencia' | 'relatorios' | 'metas';
type Props = { snapshot?: HomeSnapshot | null; previewOnly?: boolean; onNavigate?: (action: HomeAction) => void };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const amount = (value: number | null | undefined) => Number.isFinite(value) ? money.format(value as number) : '—';
function currentMonth() {
  const now = new Date();
  return String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0');
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
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{parts[name] || parts.file}</svg>;
}
function HeroLandscape() {
  return <svg className="meg-home-landscape" viewBox="0 0 920 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="megHomeMountain" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0b5353" stopOpacity=".75"/><stop offset="1" stopColor="#010c11"/></linearGradient>
      <linearGradient id="megHomeBars" x1="0" x2="1"><stop stopColor="#00675e"/><stop offset=".6" stopColor="#13e7cb"/><stop offset="1" stopColor="#075854"/></linearGradient>
      <linearGradient id="megHomeGlow"><stop stopColor="#14e3c8" stopOpacity="0"/><stop offset=".5" stopColor="#17e4cf" stopOpacity=".8"/><stop offset="1" stopColor="#14e3c8" stopOpacity="0"/></linearGradient>
    </defs>
    <path d="M0 240 130 135 195 202 296 174 369 208 476 97 534 186 602 103 707 194 806 122 920 215V300H0Z" fill="url(#megHomeMountain)"/>
    <path d="M0 272 118 189 201 244 294 190 403 253 528 181 650 238 794 160 920 238V300H0Z" fill="#011f23" opacity=".9"/>
    {Array.from({length:8},(_,i)=><g key={i}><path d={'M'+(560+i*43)+' '+(280-i*18)+' v-'+(42+i*13)+' l16 -10 v'+(42+i*13)+'Z'} fill="url(#megHomeBars)" opacity=".6"/><path d={'M'+(560+i*43)+' '+(238-i*31)+' l16 -10 11 7 -16 10Z'} fill="#4ffcea" opacity=".62"/></g>)}
    <path d="M-40 80C120 15 157 256 355 202S551 275 690 148 799 160 950 45" fill="none" stroke="url(#megHomeGlow)" strokeWidth="2" opacity=".65"/>
    <path d="M0 290 155 224 269 288 476 245 598 295 788 217 920 276" fill="none" stroke="#14e3c8" strokeOpacity=".26"/>
  </svg>;
}
function BalanceGraph({ cashflow }: { cashflow: Cashflow | null }) {
  const values = cashflow?.days?.map(item => item.realizedBalance).filter(Number.isFinite) || [];
  if (values.length < 2) return <div className="meg-home-graph-label">Evolução disponível após sincronização</div>;
  const min = Math.min(...values), max = Math.max(...values);
  const spread = max - min || 1;
  const coordinates = values.map((v,i)=>[i*100/(values.length-1),83-(v-min)*68/spread]);
  const path = coordinates.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ');
  return <svg className="meg-home-balance-graph" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Evolução do saldo realizado no mês"><path d={path} fill="none" stroke="#50ffeb" strokeWidth=".8" vectorEffect="non-scaling-stroke"/>{coordinates.map(([x,y],i)=><circle key={i} cx={x} cy={y} r=".9" fill="#89fff4" />)}</svg>;
}
function FlowGraph({ cashflow }: { cashflow: Cashflow | null }) {
  const [selected, setSelected] = useState<number|null>(null);
  const points = cashflow?.days || [];
  const max = Math.max(1, ...points.flatMap(d=>[Math.abs(d.income), Math.abs(d.expense)]));
  const daysInMonth = cashflow ? new Date(Number(cashflow.month.slice(0,4)),Number(cashflow.month.slice(5,7)),0).getDate() : 31;
  const fullDays = Array.from({length: daysInMonth},(_,i)=>points.find(d=>Number(d.date.slice(-2))===i+1));
  return <div className="meg-home-flow-plot">
    <div className="meg-home-flow-columns" role="group" aria-label="Fluxo diário">
      {fullDays.map((item,i)=><button key={i} type="button" className={'meg-home-flow-day '+(selected===i?'is-selected':'')} onMouseEnter={()=>setSelected(i)} onMouseLeave={()=>setSelected(null)} onFocus={()=>setSelected(i)} onBlur={()=>setSelected(null)} aria-label={(i+1)+' de '+(cashflow?.month||'mês')+': entradas '+amount(item?.income)+', saídas '+amount(item?.expense)}>
        <span className="meg-home-bar-positive" style={{height:(item?Math.min(100,100*item.income/max):0)+'%'}} />
        <span className="meg-home-bar-negative" style={{height:(item?Math.min(100,100*item.expense/max):0)+'%'}} />
      </button>)}
    </div>
    <div className="meg-home-flow-zero" aria-hidden="true"/>
    {selected!==null && fullDays[selected] && <div className="meg-home-flow-tip" role="status"><strong>{String(selected+1).padStart(2,'0')} {monthName.format(new Date((cashflow?.month||'2026-10')+'-01T12:00:00Z')).split(' ')[0]}</strong><span>Entradas {amount(fullDays[selected]?.income)}</span><span>Saídas {amount(fullDays[selected]?.expense)}</span></div>}
    <div className="meg-home-flow-axis"><span>01</span><span>08</span><span>15</span><span>22</span><span>{daysInMonth}</span></div>
  </div>;
}
function SectionHeading({icon,title,children}:{icon:string;title:string;children?:ReactNode}) {
  return <div className="meg-home-panel-heading"><span className="meg-home-heading-icon"><Icon name={icon}/></span><h2>{title}</h2>{children}</div>;
}
const movementColumns: DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Data',type:'date',sortable:true,filterable:true,minWidth:92},
  {key:'description',label:'Descrição',type:'text',sortable:true,filterable:true,minWidth:145},
  {key:'category',label:'Categoria',type:'enum',sortable:true,filterable:true,minWidth:115},
  {key:'value',label:'Valor',type:'currency',sortable:true,filterable:true,minWidth:105,render:(v,row)=><span className={(Number(row.signedAmount)>=0?'meg-home-positive':'meg-home-negative')}>{amount(Number(v))}</span>},
];
const dueColumns: DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Vencimento',type:'date',sortable:true,filterable:true,minWidth:105},
  {key:'description',label:'Descrição',type:'text',sortable:true,filterable:true,minWidth:155},
  {key:'category',label:'Categoria',type:'enum',sortable:true,filterable:true,minWidth:115},
  {key:'value',label:'Valor',type:'currency',sortable:true,filterable:true,minWidth:105},
];
function HomeView({ snapshot, previewOnly=false, onNavigate }: { snapshot:HomeSnapshot|null; previewOnly?:boolean; onNavigate?:Props['onNavigate'] }) {
  const summary=snapshot?.readModels.summary||null, flow=snapshot?.readModels.cashflow||null;
  const [gridTools,setGridTools]=useState({recent:false,upcoming:false});
  const movementRows=useMemo<Record<string,unknown>[]>(()=> (snapshot?.transactions||[]).filter(x=>x.status!=='cancelled').slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(t=>({id:t.id,date:t.date,description:t.description,category:categoryName(snapshot?.categories||[],t.categoryId),value:Math.abs(t.signedAmount),signedAmount:t.signedAmount})),[snapshot]);
  const dueRows=useMemo<Record<string,unknown>[]>(()=> (snapshot?.payables||[]).filter(p=>p.status!=='paid'&&p.status!=='cancelled').slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,8).map(p=>({id:p.id,date:p.dueDate,description:p.description,category:categoryName(snapshot?.categories||[],p.categoryId),value:p.openAmount})),[snapshot]);
  const go=(destination:HomeAction)=>{if(onNavigate) onNavigate(destination);else if(!previewOnly) window.dispatchEvent(new CustomEvent('meg:request-navigation',{detail:{destination}}));};
  const period=summary?.month||flow?.month||currentMonth();
  const periodTitle=monthName.format(new Date(period+'-01T12:00:00Z'));
  const pastPaidCount=snapshot?.payables.filter(p=>p.status==='paid').length||0;
  const sample=previewOnly?snapshot?.previewMetrics:null;
  const kpis=[
    {key:'pay',icon:'file',label:'Contas a pagar',number:sample?.pay??null,caption:(sample?.payCount??dueRows.length)+' contas em aberto',dest:'pendentes' as HomeAction},
    {key:'invoice',icon:'card',label:'Faturas de cartões',number:sample?.invoice??null,caption:(sample?.invoiceCount??snapshot?.cards.length??0)+' faturas em aberto',dest:'cartoes' as HomeAction},
    {key:'pending',icon:'clock',label:'Outras pendências',number:summary?.pendingAmount,caption:(summary?.pendingCount??0)+' itens pendentes',dest:'pendentes' as HomeAction},
    {key:'paid',icon:'check',label:'Contas pagas',number:sample?.paid??null,caption:(sample?.paidCount??pastPaidCount)+' contas neste período',dest:'pendentes' as HomeAction},
  ];
  const actions=[{icon:'plus',name:'Novo lançamento',desc:'Receita, despesa ou transferência',dest:'novo' as HomeAction},{icon:'swap',name:'Transferência',desc:'Entre contas e cartões',dest:'transferencia' as HomeAction},{icon:'report',name:'Relatórios',desc:'Veja seus resultados',dest:'relatorios' as HomeAction},{icon:'settings',name:'Configurar metas',desc:'Organize seus objetivos',dest:'metas' as HomeAction}];
  return <div className="meg-home">
    {previewOnly&&<div className="meg-home-preview-warning" role="note">PRÉVIA VISUAL · Dados demonstrativos, sem conexão com suas contas</div>}
    <div className="meg-home-dash">
      <section className="meg-home-card balance" aria-label="Saldo disponível"><HeroLandscape/><div className="meg-home-hero-copy"><span className="meg-home-hero-icon"><Icon name="wallet" size={31}/></span><div><h1>Saldo disponível</h1><strong className="meg-home-hero-balance">{amount(flow?.realizedClosing ?? null)}</strong><p className="meg-home-hero-meta">Saldo realizado do período · {periodTitle}</p></div></div><BalanceGraph cashflow={flow}/></section>
      <section className="meg-home-card flow"><SectionHeading icon="flow" title="Fluxo do mês"><span className="meg-home-period">{periodTitle}</span></SectionHeading><div className="meg-home-flow-totals"><div><Icon name="up"/><span>Entradas<strong>{amount(summary?.income)}</strong></span></div><div><Icon name="down"/><span>Saídas<strong>{amount(summary?.expense)}</strong></span></div><div><Icon name="equal"/><span>Resultado<strong>{amount(summary?.projectedResult)}</strong></span></div></div><FlowGraph cashflow={flow}/></section>
      {kpis.map(k=><button key={k.key} type="button" className={'meg-home-card meg-home-kpi kpi--'+k.key} onClick={()=>go(k.dest)}><span className="meg-home-kpi-icon"><Icon name={k.icon} size={26}/></span><span className="meg-home-kpi-copy"><span className="meg-home-kpi-title">{k.label}</span><strong>{amount(k.number)}</strong><small>{k.caption}</small></span><span className="meg-home-kpi-arrow"><Icon name="arrow"/></span></button>)}
      <section className="meg-home-card benefits"><div className="meg-home-benefit-glow" aria-hidden="true"/><SectionHeading icon="gift" title="Benefícios Verocard"/><p className="meg-home-benefit-subtitle">Mais economia no seu dia a dia.</p><div className="meg-home-benefit-categories">{[{icon:'cart',label:'Supermercados'},{icon:'fuel',label:'Postos de gasolina'},{icon:'restaurant',label:'Restaurantes'},{icon:'medicine',label:'Farmácias'}].map(x=><div key={x.label}><Icon name={x.icon} size={27}/><strong>{x.label}</strong></div>)}</div><div className="meg-home-benefit-card" aria-label="Cartão ilustrativo Verocard"><span>VEROCARD</span><div className="meg-home-card-chip"/><small>BENEFÍCIO</small></div></section>
      <section className="meg-home-card quick"><SectionHeading icon="zap" title="Ações rápidas"/><div className="meg-home-quick-grid">{actions.map((a,i)=><button key={a.name} type="button" className={'meg-home-quick-action meg-home-quick-'+i} onClick={()=>go(a.dest)}><span className="meg-home-quick-icon"><Icon name={a.icon}/></span><strong>{a.name}</strong><small>{a.desc}</small></button>)}</div></section>
      <section className="meg-home-card recent"><SectionHeading icon="swap" title="Últimas movimentações"/><button className="meg-home-grid-tools" type="button" aria-expanded={gridTools.recent} aria-label="Mostrar ou ocultar ferramentas da tabela de movimentações" onClick={()=>setGridTools(value=>({...value,recent:!value.recent}))}><Icon name="flow" size={16}/></button><button className="meg-home-see-all" type="button" onClick={()=>go('lancamentos')}>Ver todas <Icon name="arrow" size={15}/></button><div className={"meg-home-grid-slot "+(gridTools.recent?"is-expanded":"")}><DataGrid data={movementRows} columns={movementColumns} pageSize={5} rowKey="id" persistenceKey="meg-home-recent" ariaLabel="Últimas movimentações"/></div></section>
      <section className="meg-home-card upcoming"><SectionHeading icon="clock" title="Próximos vencimentos"/><button className="meg-home-grid-tools" type="button" aria-expanded={gridTools.upcoming} aria-label="Mostrar ou ocultar ferramentas da tabela de vencimentos" onClick={()=>setGridTools(value=>({...value,upcoming:!value.upcoming}))}><Icon name="flow" size={16}/></button><button className="meg-home-see-all" type="button" onClick={()=>go('pendentes')}>Ver todas <Icon name="arrow" size={15}/></button><div className={"meg-home-grid-slot "+(gridTools.upcoming?"is-expanded":"")}><DataGrid data={dueRows} columns={dueColumns} pageSize={5} rowKey="id" persistenceKey="meg-home-due" ariaLabel="Próximos vencimentos"/></div></section>
    </div>
  </div>;
}
export function HomeScreen({snapshot:provided,previewOnly=false,onNavigate}:Props) {
  const [snapshot,setSnapshot]=useState<HomeSnapshot|null>(provided||null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(!provided&&!previewOnly);
  const reload=useCallback(async()=>{
    if(previewOnly) return;
    const month=currentMonth();
    setLoading(true);setError(null);
    try{
      const [summary,cashflow,analytics,events,payables,cards,categories]=await Promise.all([
        authenticatedRequest<Summary>('/finance/summary?month='+month,{cache:'no-store'}),
        authenticatedRequest<Cashflow>('/finance/cashflow?month='+month,{cache:'no-store'}),
        authenticatedRequest<Analytics>('/finance/analytics?month='+month,{cache:'no-store'}),
        authenticatedRequest<unknown>('/finance/events/month?month='+month,{cache:'no-store'}),
        authenticatedRequest<unknown>('/payables?month='+month,{cache:'no-store'}),
        authenticatedRequest<unknown>('/cards?month='+month,{cache:'no-store'}),
        authenticatedRequest<unknown>('/finance/categories',{cache:'no-store'}),
      ]);
      const source=composeMegApiSnapshot([
        fromCanonicalReadModels({summary,cashflow,analytics}),
        fromFinancialEvents(events),
        fromPayables(payables),
        fromCards(cards),
        fromFinanceCatalogs({categories}),
      ]);
      setSnapshot(source as HomeSnapshot);
    }catch{
      setError('Não foi possível carregar os dados financeiros. Nenhum valor foi estimado.');
    }finally{setLoading(false);}
  },[previewOnly]);
  useEffect(()=>{if(provided){setSnapshot(provided);return;}void reload();if(previewOnly)return;
    const onRefresh=()=>void reload();
    window.addEventListener('meg:data-invalidated',onRefresh);
    window.addEventListener('focus',onRefresh);
    return()=>{window.removeEventListener('meg:data-invalidated',onRefresh);window.removeEventListener('focus',onRefresh);};
  },[provided,previewOnly,reload]);
  return <>{error&&<div className="meg-home-error" role="alert">{error} <button type="button" onClick={()=>void reload()}>Tentar novamente</button></div>}{loading&&!snapshot?<div className="meg-home-loading" role="status">Carregando dados financeiros...</div>:<HomeView snapshot={snapshot} previewOnly={previewOnly} onNavigate={onNavigate}/>}</>;
}
