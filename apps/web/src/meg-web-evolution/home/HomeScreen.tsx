import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
// @ts-expect-error Fonte única JS validada na Etapa 02
import {composeMegApiSnapshot,fromCanonicalReadModels,fromFinancialEvents,fromPayables,fromCards,fromFinanceCatalogs} from '../../evolution/data/api-adapter.js';
import {DataGrid} from '../datagrid/DataGrid';
import type {DataGridColumn} from '../datagrid/types';
import {HomeCashflowChart} from './HomeCashflowChart';
import {Icon} from './HomeIcons';
import './home-clean.css';

type Summary={month:string;availableBalance:number;income:number;expense:number;projectedResult:number;realizedIncome:number;realizedExpense:number;realizedResult:number;eventCount:number;pendingCount:number;pendingAmount:number};
type FlowDay={date:string;income:number;expense:number;net:number;realizedBalance:number};
type Cashflow={month:string;openingBalance:number;realizedClosing:number;days:FlowDay[];totalIncome:number;totalExpense:number};
type HomeOverview={month:string;effectiveAt:string;available:number;payables:{openAmount:number;count:number};cards:{openAmount:number;count:number};paid:{count:number}};
type BenefitSummary={month:string;balance:number;credits:number;used:number};
type Analytics={month:string;previous?:{income:number;expense:number;result:number};delta?:{income:number;expense:number;result:number}};
type Movement={id:string;date:string;description:string;type:string;status:string;amount:number;signedAmount:number;categoryId?:string|null;accountId?:string|null};
type Payable={id:string;description:string;dueDate:string;totalAmount:number;openAmount:number;status:string;categoryId?:string|null};
type Card={id:string;name:string;statementAmount?:number;payableStatementAmount?:number};
type Category={id:string;name:string};
export type HomeSnapshot={meta?:{mode?:string;month?:string};readModels:{summary?:Summary|null;cashflow?:Cashflow|null;analytics?:Analytics|null;benefitSummary?:BenefitSummary|null;homeOverview?:HomeOverview|null};transactions:Movement[];payables:Payable[];cards:Card[];categories:Category[];accounts?:{id:string;name:string}[];previewMetrics?:{pay:number;invoice:number;paid:number;payCount:number;invoiceCount:number;paidCount:number}};
type HomeAction='lancamentos'|'pendentes'|'cartoes'|'beneficios'|'novo'|'transferencia'|'relatorios'|'metas';
type Props={snapshot?:HomeSnapshot|null;previewOnly?:boolean;onNavigate?:(action:HomeAction)=>void;selectedMonth?:string;searchQuery?:string};
const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const display=(n:number|null|undefined,hide=false)=>hide?'R$ •••••':typeof n==='number'&&Number.isFinite(n)?brl.format(n):'—';
function saoPauloToday(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(type:string)=>p.find(x=>x.type===type)?.value||'00';return get('year')+'-'+get('month')+'-'+get('day')}
function currentMonth(){return saoPauloToday().slice(0,7)}
const dateBR=(v:string)=>/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'—';
const category=(all:Category[],id?:string|null)=>all.find(c=>c.id===id)?.name??'Sem categoria';
const numberCell=(value:number,hide:boolean)=>display(value,hide);
function HomeView({snapshot,previewOnly=false,onNavigate,searchQuery=''}:{snapshot:HomeSnapshot|null;previewOnly?:boolean;onNavigate?:Props['onNavigate'];searchQuery?:string}){
 const [hidden,setHidden]=useState(false);
 const summary=snapshot?.readModels.summary??null,overview=snapshot?.readModels.homeOverview??null,benefit=snapshot?.readModels.benefitSummary??null,flow=snapshot?.readModels.cashflow??null;
 const query=searchQuery.trim().toLocaleLowerCase('pt-BR');
 const nav=(target:HomeAction)=>{if(onNavigate)onNavigate(target);else if(!previewOnly)window.dispatchEvent(new CustomEvent('meg:request-navigation',{detail:{destination:target}}))};
 const recent=useMemo<Record<string,unknown>[]>(()=>[...(snapshot?.transactions??[])].filter(t=>t.status!=='cancelled'&&(!query||t.description.toLocaleLowerCase('pt-BR').includes(query))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).map(t=>({id:t.id,date:t.date,description:t.description,category:category(snapshot?.categories??[],t.categoryId),value:Math.abs(t.signedAmount),signedAmount:t.signedAmount,account:snapshot?.accounts?.find(a=>a.id===t.accountId)?.name??'—'})),[snapshot,query]);
 const upcoming=useMemo<Record<string,unknown>[]>(()=>[...(snapshot?.payables??[])].filter(p=>p.status!=='paid'&&p.status!=='cancelled'&&p.openAmount>0&&(!query||p.description.toLocaleLowerCase('pt-BR').includes(query))).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,7).map(p=>({id:p.id,date:p.dueDate,description:p.description,category:category(snapshot?.categories??[],p.categoryId),value:p.openAmount,status:p.status})),[snapshot,query]);
 const recentCols:DataGridColumn<Record<string,unknown>>[]=[
 {key:'date',label:'Data',type:'date',width:105,sortable:true,filterable:true},
 {key:'description',label:'Descrição',type:'text',width:165,sortable:true,filterable:true},
 {key:'category',label:'Categoria',type:'text',width:120,sortable:true,filterable:true},
 {key:'account',label:'Conta',type:'text',width:135,sortable:true,filterable:true},
 {key:'value',label:'Valor',type:'currency',width:120,sortable:true,filterable:true,render:(v,row)=><strong className={Number(row.signedAmount)<0?'hc-negative':'hc-positive'}>{Number(row.signedAmount)<0?'− ':'+ '}{numberCell(Number(v),hidden)}</strong>}];
 const dueCols:DataGridColumn<Record<string,unknown>>[]=[
 {key:'date',label:'Vencimento',type:'date',width:105,sortable:true,filterable:true},
 {key:'description',label:'Descrição',type:'text',width:155,sortable:true,filterable:true},
 {key:'category',label:'Categoria',type:'text',width:110,sortable:true,filterable:true},
 {key:'value',label:'Valor',type:'currency',width:115,sortable:true,filterable:true,render:v=><strong>{numberCell(Number(v),hidden)}</strong>},
 {key:'status',label:'Situação',type:'text',width:100,sortable:true,filterable:true,render:v=><span className="hc-status">{({open:'A pagar',partial:'Parcial'} as Record<string,string>)[String(v)]??String(v)}</span>}];
 const stats=[
 {label:'Contas a pagar',value:overview?.payables.openAmount,count:overview?.payables.count,icon:'file',tone:'red',target:'pendentes' as HomeAction},
 {label:'Faturas de cartões',value:overview?.cards.openAmount,count:overview?.cards.count,icon:'card',tone:'blue',target:'cartoes' as HomeAction},
 {label:'Outras pendências',value:summary?.pendingAmount,count:summary?.pendingCount,icon:'clock',tone:'amber',target:'pendentes' as HomeAction},
 {label:'Contas pagas',value:null,count:overview?.paid.count,icon:'check',tone:'green',target:'pendentes' as HomeAction}];
 const actions=[['Novo lançamento','plus','novo'],['Transferência','swap','transferencia'],['Pagar conta','file','pendentes'],['Relatórios','report','relatorios'],['Configurar metas','settings','metas']] as const;
 return <main className="hc-home">
  {previewOnly&&<div className="hc-preview" role="note">PRÉVIA ILUSTRATIVA · Valores demonstrativos, sem conexão com contas reais</div>}
  <div className="hc-layout">
   <section className="hc-panorama" aria-label="Panorama financeiro">
    <div className="hc-panorama-intro"><span className="hc-eyebrow">MEG FINANÇAS · VISÃO GERAL</span><h1>Sua vida financeira, com clareza.</h1><p>Organize hoje para conquistar amanhã.</p></div>
    <div className="hc-balance"><div className="hc-balance-head"><span>Saldo disponível</span><button type="button" onClick={()=>setHidden(x=>!x)} aria-label={hidden?'Mostrar valores':'Ocultar valores'} aria-pressed={hidden}><Icon name={hidden?'eyeOff':'eye'} size={18}/></button></div><strong>{display(overview?.available,hidden)}</strong><small>{overview?.effectiveAt?'Posição em '+dateBR(overview.effectiveAt):'Saldo monetário indisponível'}</small><button type="button" className="hc-detail" onClick={()=>nav('lancamentos')}>Ver movimentações <Icon name="arrow" size={15}/></button></div>
   </section>
   <section className="hc-finance" aria-label="Indicadores e fluxo">
    <div className="hc-stats">{stats.map(item=><button type="button" onClick={()=>nav(item.target)} className={'hc-stat hc-'+item.tone} key={item.label}><span className="hc-stat-icon"><Icon name={item.icon} size={23}/></span><span className="hc-stat-label">{item.label}</span><strong>{item.value==null?(item.count==null?'—':item.count+' contas'):display(item.value,hidden)}</strong><small>{item.count==null?'Dados indisponíveis':item.count+' registros'}</small></button>)}</div>
    <section className="hc-panel hc-flow"><div className="hc-heading"><h2><Icon name="flow" size={19}/> Fluxo do mês</h2><span>{summary?.month??currentMonth()}</span></div><div className="hc-flow-numbers"><div><span>Entradas</span><b className="hc-positive">{display(summary?.income,hidden)}</b></div><div><span>Saídas</span><b className="hc-negative">{display(summary?.expense,hidden)}</b></div><div><span>Resultado projetado</span><b>{display(summary?.projectedResult,hidden)}</b></div></div><HomeCashflowChart days={flow?.days??[]} hidden={hidden}/></section>
   </section>
   <section className="hc-panel hc-benefit"><div className="hc-heading"><h2><Icon name="gift" size={19}/> Benefícios</h2><button onClick={()=>nav('beneficios')} type="button">Ver detalhes <Icon name="arrow" size={15}/></button></div><div className="hc-benefit-main"><div><span>Saldo Verocard</span><strong>{display(benefit?.balance,hidden)}</strong><small>Separado do saldo monetário</small></div><div><span>Créditos no mês</span><strong>{display(benefit?.credits,hidden)}</strong></div><div><span>Utilizado no mês</span><strong>{display(benefit?.used,hidden)}</strong></div></div></section>
   <section className="hc-panel hc-actions"><div className="hc-heading"><h2><Icon name="zap" size={19}/> Ações rápidas</h2></div><div className="hc-action-grid">{actions.map(([label,icon,target])=><button type="button" key={label} onClick={()=>nav(target)}><span><Icon name={icon} size={22}/></span>{label}</button>)}</div></section>
   <section className="hc-panel hc-table"><div className="hc-heading"><h2><Icon name="swap" size={19}/> Últimas movimentações</h2><button onClick={()=>nav('lancamentos')} type="button">Ver todas <Icon name="arrow" size={15}/></button></div><DataGrid data={recent} columns={recentCols} pageSize={5} rowKey="id" persistenceKey="meg-home-clean-recent" ariaLabel="Últimas movimentações"/></section>
   <section className="hc-panel hc-table"><div className="hc-heading"><h2><Icon name="clock" size={19}/> Próximos vencimentos</h2><button onClick={()=>nav('pendentes')} type="button">Ver todos <Icon name="arrow" size={15}/></button></div><DataGrid data={upcoming} columns={dueCols} pageSize={5} rowKey="id" persistenceKey="meg-home-clean-upcoming" ariaLabel="Próximos vencimentos"/></section>
  </div>
 </main>
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
