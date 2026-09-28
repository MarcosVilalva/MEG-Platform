import { useEffect, useState } from 'react';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { hydratePhoenixAvatarPreference, phoenixAvatarImage, readPhoenixAvatarPreference } from '../phoenix/profile-avatar';
import { MegMobileBenefitModal } from './MegMobileBenefitModal';
import './meg-mobile-home.css';

type PeriodMode = 'month' | 'range' | 'all';
type TargetView = 'home' | 'movements' | 'payables' | 'cards' | 'cashflow' | 'analytics' | 'history' | 'settings';
type LaunchPreset = 'expense' | 'income' | 'benefit';
type HomePeriodContext = {
  label: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  currentRealBalance: number;
  currentBenefitBalance?: number;
  projectionEvents?: PhoenixReadModel['events']['items'];
};

type Props = {
  data: PhoenixReadModel;
  periodMode: PeriodMode;
  periodLabel?: string;
  homePeriodContext?: HomePeriodContext | null;
  pendingCount: number;
  onNavigate: (view: TargetView) => void;
  onLaunch: (preset: LaunchPreset) => void;
  onOpenPeriod: () => void;
  onOpenMenu: () => void;
};

const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const longMonth = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});

function todayMonth(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());
}
function monthLabel(month:string){
  const [y,m]=month.split('-').map(Number);
  const label=longMonth.format(new Date(Date.UTC(y,m-1,1)));
  return label.replace(/^./,(v)=>v.toUpperCase());
}
function compactMonth(month:string){
  const [y,m]=month.split('-').map(Number);
  const label=new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1))).replace('.','');
  return `${(label[0]||'').toUpperCase()}${label.slice(1)}/${y}`;
}
function asset(path:string){
  const configuredBase=import.meta.env.BASE_URL||'/';
  const base=configuredBase.endsWith('/')?configuredBase:configuredBase+'/';
  const relative=base+path.replace(/^\/+/, '');
  try{return typeof document!=='undefined'?new URL(relative,document.baseURI).href:relative;}catch{return relative;}
}
function openStatus(status:unknown){
  return !['paid','cancelled','reconciled','confirmed'].includes(String(status||'').toLowerCase());
}
function signedAmount(event:PhoenixReadModel['events']['items'][number]){
  const signed=Number(event.signedAmount||0);
  if(Number.isFinite(signed)&&signed!==0) return signed;
  const amount=Math.abs(Number(event.amount||0));
  return event.type==='income'||event.type==='redemption'?amount:-amount;
}
function resultMoney(value:number){return value>0?'+'+money.format(value):money.format(value);}

type IconName='logo'|'calendar'|'trend'|'wallet'|'up'|'down'|'file'|'card'|'check'|'food'|'bolt'|'cashflow'|'chart'|'home'|'plus'|'menu';
function HomeIcon({name,size=22}:{name:IconName;size?:number}){
  if(name==='logo') return <img src={asset('brand/meg-finance-system-mark.svg')} alt="MEG"/>;
  const common={viewBox:'0 0 24 24',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
  if(name==='calendar') return <img className="meg-home-icon-asset" src={asset('icons/meg-home-calendar.svg')} alt="" aria-hidden="true"/>;
  if(name==='trend') return <img className="meg-home-icon-asset" src={asset('icons/meg-home-trend.svg')} alt="" aria-hidden="true"/>;
  if(name==='wallet'||name==='card') return <svg {...common}><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/></svg>;
  if(name==='up') return <svg {...common}><path d="M12 20V5M6 11l6-6 6 6"/></svg>;
  if(name==='down') return <svg {...common}><path d="M12 4v15M6 13l6 6 6-6"/></svg>;
  if(name==='file') return <svg {...common}><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>;
  if(name==='check') return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/></svg>;
  if(name==='food') return <svg {...common}><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/></svg>;
  if(name==='bolt') return <svg {...common}><path d="m13 2-7 11h5l-1 9 8-12h-5z"/></svg>;
  if(name==='cashflow') return <svg {...common}><path d="M4 18V8M10 18V4M16 18v-7M21 18V6"/></svg>;
  if(name==='chart') return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg>;
  if(name==='home') return <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/></svg>;
  if(name==='plus') return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}

function HomeHeader({data,periodMode,periodLabel,onOpenPeriod,onOpenMenu}:{data:PhoenixReadModel;periodMode:PeriodMode;periodLabel?:string;onOpenPeriod:()=>void;onOpenMenu:()=>void}){
  const firstName=data.user.name.trim().split(/\s+/)[0]||'MEG';
  const [avatar,setAvatar]=useState(()=>readPhoenixAvatarPreference(data.user.id));
  useEffect(()=>{
    let active=true;
    void hydratePhoenixAvatarPreference(data.user.id).then((next)=>{if(active)setAvatar(next);});
    const sync=(event:Event)=>{
      const detail=(event as CustomEvent<{userId?:string}>).detail;
      if(detail?.userId&&detail.userId!==data.user.id)return;
      setAvatar(readPhoenixAvatarPreference(data.user.id));
    };
    window.addEventListener('meg:profile-avatar-changed',sync);
    return()=>{active=false;window.removeEventListener('meg:profile-avatar-changed',sync);};
  },[data.user.id]);
  const avatarUrl=phoenixAvatarImage(avatar);
  const periodMain=periodMode==='all'?'∞':periodMode==='range'?(periodLabel||'Intervalo'):compactMonth(data.month);
  const periodSub=periodMode==='all'?'Todos os períodos':periodMode==='range'?'Intervalo':data.month===todayMonth()?'Mês atual':'Período selecionado';

  return <header className="meg-home-header">
    <div className="meg-home-logo"><HomeIcon name="logo"/></div>
    <button className="meg-home-period" type="button" onClick={onOpenPeriod}>
      <span className="meg-home-period-icon">{periodMode==='all'?<b>∞</b>:<HomeIcon name="calendar" size={18}/>}</span>
      <span><strong>{periodMain}</strong><small>{periodSub}</small></span>
      <i>⌄</i>
    </button>
    <button className="meg-home-user" type="button" onClick={onOpenMenu}>
      <span className={'meg-home-avatar '+(avatarUrl?'has-image':'')}>{avatarUrl?<img src={avatarUrl} alt="" draggable={false}/>:firstName.charAt(0).toUpperCase()}</span>
      <strong>{firstName.toUpperCase()}</strong>
    </button>
  </header>;
}

function HomeDock({pendingCount,onNavigate,onLaunch,onOpenMenu}:{pendingCount:number;onNavigate:Props['onNavigate'];onLaunch:Props['onLaunch'];onOpenMenu:()=>void}){
  return <nav className="meg-home-dock" aria-label="Navegação principal">
    <button className="active" onClick={()=>onNavigate('home')}><HomeIcon name="home"/><span>Início</span></button>
    <button onClick={()=>onNavigate('movements')}><HomeIcon name="file"/><span>Lançamentos</span></button>
    <button className="meg-home-new" onClick={()=>onLaunch('expense')}><span><HomeIcon name="plus" size={26}/></span><small>Novo</small></button>
    <button onClick={()=>onNavigate('payables')}><span className="meg-home-badge-wrap"><HomeIcon name="wallet"/>{pendingCount>0?<b>{pendingCount>9?'9+':pendingCount}</b>:null}</span><span>Pendentes</span></button>
    <button onClick={onOpenMenu}><HomeIcon name="menu"/><span>Menu</span></button>
  </nav>;
}

function CurrentHome({data,onNavigate}:{data:PhoenixReadModel;onNavigate:Props['onNavigate']}){
  const [benefitOpen,setBenefitOpen]=useState(false);
  const openPayables=data.payables.filter((item)=>openStatus(item.status)&&Number(item.openAmount||0)>0);
  const planned=data.events.items.filter((item)=>item.type==='expense'&&item.status==='planned');
  const paid=data.events.items.filter((item)=>item.type==='expense'&&['paid','reconciled','confirmed'].includes(String(item.status)));
  const cardOpen=data.cards.reduce((sum,card)=>sum+Number(card.statement?.payableAmount??card.payableStatementAmount??card.statementAmount??0),0);
  const balance=Number(data.summary.availableBalance||0)+Number(data.summary.realizedResult||0);
  const income=Number(data.summary.realizedIncome||0);
  const expense=Number(data.summary.realizedExpense||0);
  const result=Number(data.summary.realizedResult||0);

  return <>
    <section className="meg-home-title">
      <div><span>Situação atual</span><h1>{monthLabel(data.month)}</h1><p>Acompanhe seu caixa e compromissos em tempo real.</p></div>
      <i><HomeIcon name="trend" size={26}/></i>
    </section>
    <section className="meg-home-balance">
      <span><HomeIcon name="wallet" size={30}/></span>
      <div><small>Saldo disponível</small><strong>{money.format(balance)}</strong><p>Considerando apenas os lançamentos realizados.</p></div>
    </section>
    <section className="meg-home-flow">
      <article className="income"><span><HomeIcon name="up"/></span><div><small>Entradas no mês</small><strong>{money.format(income)}</strong></div></article>
      <article className="expense"><span><HomeIcon name="down"/></span><div><small>Saídas no mês</small><strong>{money.format(expense)}</strong></div></article>
      <article className="result"><span><HomeIcon name="chart"/></span><div><small>Resultado do mês</small><strong>{resultMoney(result)}</strong></div></article>
    </section>
    <section className="meg-home-summary">
      <article><span className="red"><HomeIcon name="file"/></span><small>Contas a pagar</small><b>{openPayables.length}</b><em>{money.format(openPayables.reduce((s,item)=>s+Number(item.openAmount||0),0))}</em></article>
      <article><span className="blue"><HomeIcon name="card"/></span><small>Faturas de cartões</small><b>{data.cards.filter((card)=>Number(card.statement?.payableAmount??card.statementAmount??0)>0).length}</b><em>{money.format(cardOpen)}</em></article>
      <article><span className="amber"><HomeIcon name="file"/></span><small>Outras pendências</small><b>{planned.length}</b><em>{money.format(planned.reduce((s,item)=>s+Math.abs(Number(item.signedAmount||item.amount||0)),0))}</em></article>
      <article><span className="green"><HomeIcon name="check"/></span><small>Contas pagas</small><b>{paid.length}</b><em>{money.format(paid.reduce((s,item)=>s+Math.abs(Number(item.signedAmount||item.amount||0)),0))}</em></article>
    </section>
    <button className="meg-home-benefit" type="button" onClick={()=>setBenefitOpen(true)}>
      <span><HomeIcon name="food"/></span><div><small>Benefício Alimentação</small><em>Saldo disponível</em><strong>{money.format(Number(data.summary.benefitBalance||0))}</strong></div><b>›</b>
    </button>
    <section className="meg-home-quick">
      <header><div><span><HomeIcon name="bolt" size={17}/></span><p><b>Ações rápidas</b><small>Acesse as principais funcionalidades.</small></p></div><button onClick={()=>onNavigate('movements')}>Ver todas ›</button></header>
      <div>
        <button onClick={()=>onNavigate('cards')}><span><HomeIcon name="card"/></span><small>Cartões</small></button>
        <button onClick={()=>onNavigate('payables')}><span><HomeIcon name="file"/></span><small>Pagar conta</small></button>
        <button onClick={()=>onNavigate('cashflow')}><span><HomeIcon name="cashflow"/></span><small>Fluxo de caixa</small></button>
        <button onClick={()=>onNavigate('analytics')}><span><HomeIcon name="chart"/></span><small>Ver relatórios</small></button>
      </div>
    </section>
    {benefitOpen?<MegMobileBenefitModal data={data} onClose={()=>setBenefitOpen(false)} onOpenMovements={()=>{setBenefitOpen(false);onNavigate('movements');}}/>:null}
  </>;
}

function PastHome({data,context,onNavigate}:{data:PhoenixReadModel;context?:HomePeriodContext|null;onNavigate:Props['onNavigate']}){
  const [benefitOpen,setBenefitOpen]=useState(false);
  const realized=data.events.items.filter((event)=>String(event.competence||String(event.date).slice(0,7))===data.month&&['paid','reconciled','confirmed'].includes(String(event.status)));
  let income=0,expense=0,paidCount=0,paidAmount=0;
  realized.forEach((event)=>{const signed=signedAmount(event);if(signed>0)income+=signed;else{expense+=-signed;paidCount+=1;paidAmount+=-signed;}});
  const opening=Number(context?.openingBalance??data.cashflow.openingBalance??0);
  const result=income-expense;
  const closing=Number(context?.closingBalance??opening+result);
  return <>
    <section className="meg-home-title"><div><span>Resumo do mês</span><h1>{monthLabel(data.month)}</h1><p>Fechamento consolidado do período.</p></div><i><HomeIcon name="chart" size={26}/></i></section>
    <section className="meg-home-pair"><article><small>Saldo inicial</small><strong>{money.format(opening)}</strong></article><article className="accent"><small>Saldo final</small><strong>{money.format(closing)}</strong></article></section>
    <section className="meg-home-flow"><article className="income"><span><HomeIcon name="up"/></span><div><small>Receitas realizadas</small><strong>{money.format(income)}</strong></div></article><article className="expense"><span><HomeIcon name="down"/></span><div><small>Despesas realizadas</small><strong>{money.format(expense)}</strong></div></article><article className="result"><span><HomeIcon name="chart"/></span><div><small>Resultado do mês</small><strong>{resultMoney(result)}</strong></div></article></section>
    <section className="meg-home-past-paid"><span><HomeIcon name="check"/></span><div><small>Contas pagas</small><strong>{paidCount.toLocaleString('pt-BR')}</strong><em>{money.format(paidAmount)}</em></div></section>
    <button className="meg-home-benefit" type="button" onClick={()=>setBenefitOpen(true)}><span><HomeIcon name="food"/></span><div><small>Benefício Alimentação</small><em>Saldo final do mês</em><strong>{money.format(Number(data.summary.benefitBalance||0))}</strong></div><b>›</b></button>
    <button className="meg-home-period-action" onClick={()=>onNavigate('movements')}><HomeIcon name="file"/><span><strong>Ver lançamentos do mês</strong><small>Detalhes de {monthLabel(data.month)}</small></span><b>›</b></button>
    {benefitOpen?<MegMobileBenefitModal data={data} onClose={()=>setBenefitOpen(false)} onOpenMovements={()=>{setBenefitOpen(false);onNavigate('movements');}}/>:null}
  </>;
}

function FutureHome({data,context,onNavigate}:{data:PhoenixReadModel;context?:HomePeriodContext|null;onNavigate:Props['onNavigate']}){
  const [benefitOpen,setBenefitOpen]=useState(false);
  const target=data.month;
  const [year,month]=target.split('-').map(Number);
  const start=target+'-01';
  const end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  const events=context?.projectionEvents||data.events.items;
  const planned=events.filter((event)=>event.status==='planned'&&String(event.date).slice(0,10)<=end);
  const before=planned.filter((event)=>String(event.date).slice(0,10)<start);
  const monthEvents=planned.filter((event)=>{const date=String(event.date).slice(0,10);return date>=start&&date<=end;});
  const base=Number(context?.currentRealBalance??(Number(data.summary.availableBalance||0)+Number(data.summary.realizedResult||0)));
  const opening=base+before.reduce((sum,event)=>sum+signedAmount(event),0);
  const income=monthEvents.filter((event)=>signedAmount(event)>0).reduce((sum,event)=>sum+signedAmount(event),0);
  const expense=monthEvents.filter((event)=>signedAmount(event)<0).reduce((sum,event)=>sum-signedAmount(event),0);
  const closing=opening+income-expense;
  const cardEvents=monthEvents.filter((event)=>/cart[aã]o|cr[eé]dito/i.test(String(event.paymentMethod?.name||'')+' '+String(event.sourceDetails?.paymentMethod||'')));
  const cardAmount=cardEvents.reduce((sum,event)=>sum+Math.max(0,-signedAmount(event)),0);
  const other=Math.max(0,expense-cardAmount);
  return <>
    <section className="meg-home-title"><div><span>Projeção mensal</span><h1>{monthLabel(target)}</h1><p>Compromissos e entradas já previstos.</p></div><i><HomeIcon name="calendar" size={26}/></i></section>
    <section className="meg-home-pair"><article><small>Saldo inicial projetado</small><strong>{money.format(opening)}</strong></article><article className={closing>=0?'accent':'danger'}><small>Saldo após compromissos</small><strong>{money.format(closing)}</strong></article></section>
    <section className="meg-home-summary meg-home-future-grid">
      <article><span className="green"><HomeIcon name="up"/></span><small>Receitas previstas</small><b>{monthEvents.filter((event)=>signedAmount(event)>0).length}</b><em>{money.format(income)}</em></article>
      <article><span className="red"><HomeIcon name="down"/></span><small>Compromissos</small><b>{monthEvents.filter((event)=>signedAmount(event)<0).length}</b><em>{money.format(expense)}</em></article>
      <article><span className="blue"><HomeIcon name="card"/></span><small>Faturas de cartões</small><b>{cardEvents.length}</b><em>{money.format(cardAmount)}</em></article>
      <article><span className="amber"><HomeIcon name="file"/></span><small>Outras pendências</small><b>{Math.max(0,monthEvents.length-cardEvents.length)}</b><em>{money.format(other)}</em></article>
    </section>
    <button className="meg-home-benefit" type="button" onClick={()=>setBenefitOpen(true)}><span><HomeIcon name="food"/></span><div><small>Benefício Alimentação</small><em>Fora do caixa monetário</em><strong>{money.format(Number(context?.currentBenefitBalance??data.summary.benefitBalance??0))}</strong></div><b>›</b></button>
    <button className="meg-home-period-action" onClick={()=>onNavigate('payables')}><HomeIcon name="file"/><span><strong>Principais pendências do mês</strong><small>{monthEvents.length} compromisso(s) previsto(s)</small></span><b>›</b></button>
    {benefitOpen?<MegMobileBenefitModal data={data} onClose={()=>setBenefitOpen(false)} onOpenMovements={()=>{setBenefitOpen(false);onNavigate('movements');}}/>:null}
  </>;
}

function AggregateHome({data,periodMode,periodLabel,onNavigate}:{data:PhoenixReadModel;periodMode:PeriodMode;periodLabel?:string;onNavigate:Props['onNavigate']}){
  const posted=data.events.items.filter((item)=>['paid','reconciled','confirmed'].includes(String(item.status)));
  const income=posted.filter((item)=>signedAmount(item)>0).reduce((sum,item)=>sum+signedAmount(item),0);
  const expense=posted.filter((item)=>signedAmount(item)<0).reduce((sum,item)=>sum-signedAmount(item),0);
  const result=income-expense;
  const title=periodMode==='all'?'Todo o histórico':periodLabel||'Intervalo selecionado';
  return <>
    <section className="meg-home-title"><div><span>Visão consolidada</span><h1>{title}</h1><p>Resumo financeiro do período selecionado.</p></div><i><HomeIcon name="chart" size={26}/></i></section>
    <section className="meg-home-balance"><span><HomeIcon name="wallet" size={30}/></span><div><small>Resultado consolidado</small><strong>{resultMoney(result)}</strong><p>Entradas realizadas menos saídas realizadas.</p></div></section>
    <section className="meg-home-flow"><article className="income"><span><HomeIcon name="up"/></span><div><small>Entradas</small><strong>{money.format(income)}</strong></div></article><article className="expense"><span><HomeIcon name="down"/></span><div><small>Saídas</small><strong>{money.format(expense)}</strong></div></article><article className="result"><span><HomeIcon name="chart"/></span><div><small>Resultado</small><strong>{resultMoney(result)}</strong></div></article></section>
    <button className="meg-home-period-action" onClick={()=>onNavigate('movements')}><HomeIcon name="file"/><span><strong>Ver lançamentos</strong><small>Consulte os movimentos do período</small></span><b>›</b></button>
  </>;
}

export function MegMobileHome({data,periodMode,periodLabel,homePeriodContext,pendingCount,onNavigate,onLaunch,onOpenPeriod,onOpenMenu}:Props){
  const now=todayMonth();
  const body=periodMode!=='month'
    ? <AggregateHome data={data} periodMode={periodMode} periodLabel={periodLabel} onNavigate={onNavigate}/>
    : data.month<now
      ? <PastHome data={data} context={homePeriodContext} onNavigate={onNavigate}/>
      : data.month>now
        ? <FutureHome data={data} context={homePeriodContext} onNavigate={onNavigate}/>
        : <CurrentHome data={data} onNavigate={onNavigate}/>;

  return <section className="meg-home-screen" data-meg-home="approved-final" data-meg-fixed-screen="true">
    <HomeHeader data={data} periodMode={periodMode} periodLabel={periodLabel} onOpenPeriod={onOpenPeriod} onOpenMenu={onOpenMenu}/>
    <main className={'meg-home-content '+(periodMode==='month'&&data.month===now?'is-current':'is-period')}>{body}</main>
    <HomeDock pendingCount={pendingCount} onNavigate={onNavigate} onLaunch={onLaunch} onOpenMenu={onOpenMenu}/>
  </section>;
}
