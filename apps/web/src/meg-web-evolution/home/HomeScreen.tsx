import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
type Props = { snapshot?: HomeSnapshot | null; previewOnly?: boolean; onNavigate?: (action: HomeAction) => void };
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
function BalanceGraph({ cashflow }: { cashflow: Cashflow | null }) {
  // Geometria exclusivamente visual de valores realizados já apurados pelo domínio.
  const daily=(cashflow?.days??[]).filter(d=>Number.isFinite(d.realizedBalance));
  if(daily.length<2) return <div className="meg-home-graph-label">Evolução do saldo indisponível</div>;
  const sampleCount=Math.min(13,daily.length);
  const sample=Array.from({length:sampleCount},(_,i)=>daily[Math.round(i*(daily.length-1)/(sampleCount-1))]);
  const values=sample.map(d=>d.realizedBalance);
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=values.map((v,i)=>({x:52+i*42,y:164-(v-min)/range*108}));
  const smooth=points.reduce((path,p,i)=>{
    if(i===0)return 'M '+p.x+' '+p.y;
    const previous=points[i-1],mid=(previous.x+p.x)/2;
    return path+' C '+mid+' '+previous.y+' '+mid+' '+p.y+' '+p.x+' '+p.y;
  },'');
  const bottom=226;
  const area=smooth+' L '+points[points.length-1].x+' '+bottom+' L '+points[0].x+' '+bottom+' Z';
  const barWidth=21;
  return <svg className="meg-home-balance-graph" viewBox="0 0 640 248" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Evolução do saldo realizado no mês, conforme fluxo financeiro canônico">
    <defs>
      <linearGradient id="meg-balance-bar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#32ffe4" stopOpacity=".85"/><stop offset="1" stopColor="#037b81" stopOpacity=".46"/></linearGradient>
      <linearGradient id="meg-balance-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22ffe2" stopOpacity=".22"/><stop offset="1" stopColor="#15d7c6" stopOpacity="0"/></linearGradient>
      <filter id="meg-balance-glow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path d={area} fill="url(#meg-balance-area)"/>
    {points.map((p,i)=>{
      const x=p.x-7, top=p.y+11, height=bottom-top;
      return <g key={sample[i].date} opacity={.42+i/(points.length*2)}>
        <rect x={x} y={top} width={barWidth} height={height} fill="url(#meg-balance-bar)" rx="1"/>
        <path d={'M '+(x+barWidth)+' '+top+' l 9 -7 v '+height+' l -9 7 Z'} fill="#00666b" opacity=".92"/>
        <path d={'M '+x+' '+top+' l 9 -7 h '+barWidth+' l -9 7 Z'} fill="#5ffff0" opacity=".75"/>
      </g>;
    })}
    <path d={smooth} fill="none" stroke="#1af5d9" strokeWidth="9" opacity=".26" filter="url(#meg-balance-glow)"/>
    <path d={smooth} fill="none" stroke="#a5fff4" strokeWidth="2.6" strokeLinecap="round"/>
    <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="7" fill="#bcfff8" stroke="#13bbac" strokeWidth="3"/>
  </svg>;
}
function FlowGraph({ cashflow }: { cashflow: Cashflow | null }) {
  const [selected, setSelected] = useState<number|null>(null);
  const points = cashflow?.days || [];
  const max = Math.max(1, ...points.flatMap(d=>[Math.abs(d.income), Math.abs(d.expense)]));
  const daysInMonth = cashflow ? new Date(Number(cashflow.month.slice(0,4)),Number(cashflow.month.slice(5,7)),0).getDate() : 31;
  const fullDays = Array.from({length: daysInMonth},(_,i)=>points.find(d=>Number(d.date.slice(-2))===i+1));
  return <div className="meg-home-flow-plot">
    <div className="meg-home-flow-columns" role="group" aria-label="Fluxo diário">
      {fullDays.map((item,i)=><button key={i} type="button" className={'meg-home-flow-day '+(selected===i?'is-selected':'')} onMouseEnter={()=>setSelected(i)} onMouseLeave={()=>setSelected(null)} onFocus={()=>setSelected(i)} onBlur={()=>setSelected(null)} onClick={()=>setSelected(old=>old===i?null:i)} aria-pressed={selected===i} aria-label={(i+1)+' de '+(cashflow?.month||'mês')+': entradas '+amount(item?.income)+', saídas '+amount(item?.expense)}>
        <span className="meg-home-bar-positive" style={{height:(item?Math.min(48,48*item.income/max):0)+'%'}} />
        <span className="meg-home-bar-negative" style={{height:(item?Math.min(48,48*item.expense/max):0)+'%'}} />
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
const movementColumns:DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Data',type:'date',sortable:true,filterable:true,minWidth:90},
  {key:'description',label:'Descrição',type:'text',sortable:true,filterable:true,minWidth:145,
    render:(v,row)=><HomeDescriptionCell description={String(v??'')} category={String(row.category??'')} type={String(row.kind??'')}/>},
  {key:'category',label:'Categoria',type:'text',sortable:true,filterable:true,minWidth:99,
    render:(v,row)=><HomeCategoryCell category={String(v??'')} type={String(row.kind??'')}/>},
  {key:'value',label:'Valor',type:'currency',sortable:true,filterable:true,minWidth:112,
    render:(v,row)=><span className={'meg-home-value '+(Number(row.signedAmount)>=0?'meg-home-positive':'meg-home-negative')}>{Number(row.signedAmount)>=0?'+ ':'− '}{amount(Number(v))}</span>},
];
const dueColumns:DataGridColumn<Record<string,unknown>>[]=[
  {key:'date',label:'Vencimento',type:'date',sortable:true,filterable:true,minWidth:101},
  {key:'description',label:'Descrição',type:'text',sortable:true,filterable:true,minWidth:145,
    render:(v,row)=><HomeDescriptionCell description={String(v??'')} category={String(row.category??'')}/>},
  {key:'category',label:'Categoria',type:'text',sortable:true,filterable:true,minWidth:104,
    render:(v)=><HomeCategoryCell category={String(v??'')}/>},
  {key:'value',label:'Em aberto',type:'currency',sortable:true,filterable:true,minWidth:105,
    render:(v)=><span className="meg-home-value">{amount(Number(v))}</span>},
];

function HomeView({snapshot,previewOnly=false,onNavigate}:{snapshot:HomeSnapshot|null;previewOnly?:boolean;onNavigate?:Props['onNavigate']}) {
  const summary=snapshot?.readModels.summary ?? null;
  const flow=snapshot?.readModels.cashflow ?? null;
  const benefit=snapshot?.readModels.benefitSummary ?? null;
  const overview=snapshot?.readModels.homeOverview ?? null;
  const [gridTools,setGridTools]=useState({recent:false,upcoming:false});
  const [balanceHidden,setBalanceHidden]=useState(false);
  const movementRows=useMemo<Record<string,unknown>[]>(()=> (snapshot?.transactions??[])
    .filter(t=>t.status!=='cancelled')
    .slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7)
    .map(t=>({
      id:t.id,date:t.date,description:t.description,
      category:categoryName(snapshot?.categories??[],t.categoryId),
      value:Math.abs(t.signedAmount),signedAmount:t.signedAmount,kind:t.type,
      account:snapshot?.accounts?.find(a=>a.id===t.accountId)?.name ?? '—',
    })),[snapshot]);
  const dueRows=useMemo<Record<string,unknown>[]>(()=> (snapshot?.payables??[])
    .filter(p=>p.status!=='paid'&&p.status!=='cancelled'&&p.openAmount>0)
    .slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,7)
    .map(p=>({id:p.id,date:p.dueDate,description:p.description,
      category:categoryName(snapshot?.categories??[],p.categoryId),value:p.openAmount})),[snapshot]);
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
    {icon:'report',name:'Relatórios',dest:'relatorios' as HomeAction,color:'purple'},
    {icon:'settings',name:'Configurar metas',dest:'metas' as HomeAction,color:'amber'},
  ];
  const paidCount=overview?.paid.count;
  return <div className="meg-home meg-home-official">
    {previewOnly&&<div className="meg-home-preview-warning" role="note">PRÉVIA VISUAL · Valores fictícios para avaliar o layout · Sem conexão com contas reais</div>}
    
    <div className="meg-home-dash">
      <section className="meg-home-card balance" aria-labelledby="meg-home-available-balance">
        <img className="meg-home-landscape" src="/meg-web-evolution/home/hero-mountains.webp" alt="" aria-hidden="true" decoding="async"/>
        <div className="meg-home-hero-scene" aria-hidden="true"/>
        <div className="meg-home-hero-copy">
          <div className="meg-home-hero-heading">
            <span className="meg-home-hero-icon"><Icon name="wallet" size={26}/></span>
            <h2 id="meg-home-available-balance">Saldo disponível</h2>
            <button className="meg-home-privacy" type="button" aria-label={balanceHidden?'Mostrar saldos':'Ocultar saldos'} aria-pressed={balanceHidden} onClick={()=>setBalanceHidden(x=>!x)}><Icon name={balanceHidden?'eyeOff':'eye'} size={19}/></button>
          </div>
          <div className="meg-home-hero-amount-line"><strong className="meg-home-hero-balance">{showMoney(mainBalance)}</strong></div>
          <p className="meg-home-hero-meta">{overviewValid?'Saldo consolidado em '+dateText(overview.effectiveAt):'Aguardando saldo consolidado'}</p>
          <button type="button" className="meg-home-hero-details" onClick={()=>go('lancamentos')}>Consultar movimentações <Icon name="arrow" size={16}/></button>
        </div>
        <div className="meg-home-hero-visual" aria-hidden="true"><BalanceGraph cashflow={flow}/></div>
      </section>
      <section className="meg-home-card flow">
        <div className="meg-home-panel-heading"><span className="meg-home-heading-icon"><Icon name="flow" size={20}/></span><h2>Fluxo do mês</h2><span className="meg-home-flow-caption">{periodTitle}</span></div>
        <div className="meg-home-flow-totals">
          <div><Icon name="up" size={18}/><span>Entradas<strong>{showMoney(summary?.income)}</strong></span></div>
          <div><Icon name="down" size={18}/><span>Saídas<strong>{showMoney(summary?.expense)}</strong></span></div>
          <div className="meg-home-flow-result"><Icon name="equal" size={18}/><span>Resultado<strong>{showMoney(summary?.projectedResult)}</strong></span></div>
        </div>
        <FlowGraph cashflow={flow}/>
        <div className="meg-home-flow-legend"><span>Entradas</span><span>Saídas</span></div>
      </section>
      {items.map((item)=><button type="button" key={item.id} className={'meg-home-card meg-home-kpi kpi--'+item.id} onClick={()=>go(item.dest)}>
        <span className={'meg-home-kpi-icon is-'+item.color}><Icon name={item.icon} size={24}/></span>
        <span className="meg-home-kpi-copy"><span className="meg-home-kpi-title">{item.label}</span><strong>{item.id==='paid'?(paidCount==null?'—':String(paidCount)+' contas'):showMoney(item.value)}</strong><small>{item.caption}</small></span>
        <span className="meg-home-kpi-arrow"><Icon name="arrow" size={17}/></span>
      </button>)}
      <section className="meg-home-card benefits" aria-labelledby="meg-benefit-title">
        <img className="meg-home-benefit-scene" src="/meg-web-evolution/home/benefit-neon.webp" alt="" aria-hidden="true"/>
        <div className="meg-home-benefit-body">
          <div className="meg-home-benefit-intro"><span className="meg-home-heading-icon"><Icon name="gift" size={21}/></span><div><h2 id="meg-benefit-title">Benefícios Verocard</h2><p>Seu saldo e seus benefícios em um só lugar</p></div></div>
          <div className="meg-home-benefit-finances">
            <span className="meg-home-benefit-finances-label">Saldo do benefício</span>
            <strong className="meg-home-benefit-balance">{showMoney(benefit?.balance)}</strong>
            <small className="meg-home-benefit-reference">{benefit?'Apurado até '+periodTitle:'Sem dados disponíveis'}</small>
          </div>
          <div className="meg-home-benefit-monthly">
            <div><Icon name="up" size={17}/><span>Créditos do mês<strong>{showMoney(benefit?.credits)}</strong></span></div>
            <div><Icon name="down" size={17}/><span>Utilizado no mês<strong>{showMoney(benefit?.used)}</strong></span></div>
          </div>
          <button type="button" className="meg-home-button meg-home-benefit-cta" onClick={()=>go('beneficios')}>Acessar benefícios <Icon name="arrow" size={17}/></button>
        </div>
        <img className="meg-home-benefit-card" src="/meg-web-evolution/home/verocard-oficial-panorama.webp" alt="" aria-hidden="true"/>
      </section>
      <section className="meg-home-card quick">
        <div className="meg-home-panel-heading"><span className="meg-home-heading-icon"><Icon name="zap" size={20}/></span><h2>Ações rápidas</h2></div>
        <div className="meg-home-quick-grid">{actions.map(item=><button type="button" className={'meg-home-quick-action quick-'+item.color} key={item.name} onClick={()=>go(item.dest)}><span className="meg-home-quick-icon"><Icon name={item.icon} size={22}/></span><strong>{item.name}</strong></button>)}</div>
      </section>
      <section className="meg-home-card recent">
        <SectionHeading icon="swap" title="Últimas movimentações"/>
        <div className="meg-home-panel-controls"><button className="meg-home-grid-tools" type="button" aria-expanded={gridTools.recent} aria-label="Mostrar ou ocultar ferramentas da tabela de movimentações" onClick={()=>setGridTools(value=>({...value,recent:!value.recent}))}><Icon name="flow" size={16}/></button><button className="meg-home-see-all" type="button" onClick={()=>go('lancamentos')}>Ver todas <Icon name="arrow" size={14}/></button></div>
        <div className={'meg-home-grid-slot '+(gridTools.recent?'is-expanded':'')}><DataGrid data={movementRows} columns={movementColumns} pageSize={5} rowKey="id" persistenceKey="meg-home-recent" ariaLabel="Últimas movimentações"/></div>
      </section>
      <section className="meg-home-card upcoming">
        <SectionHeading icon="clock" title="Próximos vencimentos"/>
        <div className="meg-home-panel-controls"><button className="meg-home-grid-tools" type="button" aria-expanded={gridTools.upcoming} aria-label="Mostrar ou ocultar ferramentas da tabela de vencimentos" onClick={()=>setGridTools(value=>({...value,upcoming:!value.upcoming}))}><Icon name="flow" size={16}/></button><button className="meg-home-see-all" type="button" onClick={()=>go('pendentes')}>Ver todas <Icon name="arrow" size={14}/></button></div>
        <div className={'meg-home-grid-slot '+(gridTools.upcoming?'is-expanded':'')}><DataGrid data={dueRows} columns={dueColumns} pageSize={5} rowKey="id" persistenceKey="meg-home-due" ariaLabel="Próximos vencimentos"/></div>
      </section>
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
