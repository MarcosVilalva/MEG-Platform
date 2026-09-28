import { useEffect, useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { hydratePhoenixAvatarPreference, phoenixAvatarImage, readPhoenixAvatarPreference } from '../phoenix/profile-avatar';
import { isPhoenixBenefitEvent } from '../phoenix/home-period-summary';
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

type IconName='calendar'|'trend'|'wallet'|'up'|'down'|'file'|'card'|'check'|'food'|'bolt'|'cashflow'|'chart'|'home'|'plus'|'menu'|'history';

const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const longMonth = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
const postedStatuses = new Set(['paid','reconciled','confirmed']);

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
function eventMonth(event:PhoenixReadModel['events']['items'][number]){
  return String(event.competence||String(event.date||'').slice(0,7));
}
function isPosted(event:PhoenixReadModel['events']['items'][number]){
  return postedStatuses.has(String(event.status||'').toLowerCase());
}
function isMonetary(event:PhoenixReadModel['events']['items'][number]){
  return event.type!=='transfer'&&!isPhoenixBenefitEvent(event);
}
function resultMoney(value:number){return value>0?'+'+money.format(value):money.format(value);}
function iconAsset(name:IconName){return asset(`icons/meg-home-${name}.svg`);}

function HomeIcon({name,size=22}:{name:IconName;size?:number}){
  return <img className="meg-home-icon-asset" src={iconAsset(name)} alt="" aria-hidden="true" width={size} height={size}/>;
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
  const periodSub=periodMode==='all'?'Todos os períodos':periodMode==='range'?'Intervalo selecionado':data.month===todayMonth()?'Mês atual':'Período selecionado';

  return <header className="meg-home-header">
    <div className="meg-home-logo"><img src={asset('brand/meg-finance-system-mark.svg')} alt="MEG"/></div>
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
    <button className="meg-home-new" onClick={()=>onLaunch('expense')}><span><HomeIcon name="plus" size={25}/></span><small>Novo</small></button>
    <button onClick={()=>onNavigate('payables')}><span className="meg-home-badge-wrap"><HomeIcon name="wallet"/>{pendingCount>0?<b>{pendingCount>99?'99+':pendingCount}</b>:null}</span><span>Pendentes</span></button>
    <button onClick={onOpenMenu}><HomeIcon name="menu"/><span>Menu</span></button>
  </nav>;
}

function SectionTitle({eyebrow,title,copy}:{eyebrow:string;title:string;copy:string}){
  return <section className="meg-home-title">
    <div><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>
  </section>;
}

function BenefitCard({data,label,onOpen}:{data:PhoenixReadModel;label:string;onOpen:()=>void}){
  return <button className="meg-home-benefit" type="button" onClick={onOpen}>
    <span><HomeIcon name="food"/></span>
    <div><small>Benefício Alimentação</small><em>{label}</em><strong>{money.format(Number(data.summary.benefitBalance||0))}</strong></div>
    <b>›</b>
  </button>;
}

function CurrentHome({data,onNavigate}:{data:PhoenixReadModel;onNavigate:Props['onNavigate']}){
  const [benefitOpen,setBenefitOpen]=useState(false);
  const openPayables=data.payables.filter((item)=>openStatus(item.status)&&Number(item.openAmount||0)>0);
  const planned=data.events.items.filter((item)=>item.type==='expense'&&item.status==='planned'&&isMonetary(item));
  const paid=data.events.items.filter((item)=>item.type==='expense'&&isPosted(item)&&isMonetary(item));
  const cardOpen=data.cards.reduce((sum,card)=>sum+Number(card.statement?.payableAmount??card.payableStatementAmount??card.statementAmount??0),0);
  const balance=Number(data.summary.availableBalance||0)+Number(data.summary.realizedResult||0);
  const income=Number(data.summary.realizedIncome||0);
  const expense=Number(data.summary.realizedExpense||0);
  const result=Number(data.summary.realizedResult||0);

  return <>
    <SectionTitle eyebrow="Situação atual" title={monthLabel(data.month)} copy="Acompanhe seu caixa e compromissos em tempo real."/>
    <section className="meg-home-balance">
      <span><HomeIcon name="wallet" size={28}/></span>
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
    <BenefitCard data={data} label="Saldo disponível" onOpen={()=>setBenefitOpen(true)}/>
    <section className="meg-home-quick">
      <header><div><span><HomeIcon name="bolt" size={17}/></span><p><b>Ações rápidas</b><small>Acesse as principais funcionalidades.</small></p></div><button onClick={()=>onNavigate('settings')}>Atalhos ›</button></header>
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
  const realized=data.events.items.filter((event)=>eventMonth(event)===data.month&&isPosted(event)&&isMonetary(event));
  let income=0,expense=0,paidCount=0;
  realized.forEach((event)=>{const signed=signedAmount(event);if(signed>0)income+=signed;else{expense+=-signed;paidCount+=1;}});
  const opening=Number(context?.openingBalance??data.cashflow.openingBalance??0);
  const result=income-expense;
  const closing=Number(context?.closingBalance??opening+result);

  return <>
    <SectionTitle eyebrow="Resumo do mês" title={monthLabel(data.month)} copy="Veja como foi o seu mês em uma visão simples."/>
    <section className="meg-home-past-grid">
      <article className="income"><span><HomeIcon name="up"/></span><small>Receitas realizadas</small><strong>{money.format(income)}</strong></article>
      <article className="expense"><span><HomeIcon name="down"/></span><small>Despesas realizadas</small><strong>{money.format(expense)}</strong></article>
      <article className="result"><span><HomeIcon name="chart"/></span><small>Resultado do mês</small><strong>{resultMoney(result)}</strong></article>
      <article><span><HomeIcon name="wallet"/></span><small>Saldo inicial</small><strong>{money.format(opening)}</strong></article>
      <article><span><HomeIcon name="wallet"/></span><small>Saldo final</small><strong>{money.format(closing)}</strong></article>
      <article className="paid"><span><HomeIcon name="check"/></span><small>Contas pagas</small><strong>{paidCount} contas</strong><em>{money.format(expense)}</em></article>
    </section>
    <BenefitCard data={data} label="Saldo final do mês" onOpen={()=>setBenefitOpen(true)}/>
    <button className="meg-home-period-action" onClick={()=>onNavigate('movements')}><HomeIcon name="file"/><span><strong>Ver lançamentos de {monthLabel(data.month).replace(/ de \d{4}$/,'')}</strong><small>Detalhes de {monthLabel(data.month)}</small></span><b>›</b></button>
    {benefitOpen?<MegMobileBenefitModal data={data} onClose={()=>setBenefitOpen(false)} onOpenMovements={()=>{setBenefitOpen(false);onNavigate('movements');}}/>:null}
  </>;
}

function FutureHome({data,context,onNavigate}:{data:PhoenixReadModel;context?:HomePeriodContext|null;onNavigate:Props['onNavigate']}){
  const [benefitOpen,setBenefitOpen]=useState(false);
  const target=data.month;
  const [year,month]=target.split('-').map(Number);
  const start=target+'-01';
  const end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  const events=(context?.projectionEvents||data.events.items).filter(isMonetary);
  const planned=events.filter((event)=>event.status==='planned'&&String(event.date).slice(0,10)<=end);
  const before=planned.filter((event)=>String(event.date).slice(0,10)<start);
  const monthEvents=planned.filter((event)=>{const date=String(event.date).slice(0,10);return date>=start&&date<=end;});
  const base=Number(context?.currentRealBalance??(Number(data.summary.availableBalance||0)+Number(data.summary.realizedResult||0)));
  const opening=base+before.reduce((sum,event)=>sum+signedAmount(event),0);
  const incomes=monthEvents.filter((event)=>signedAmount(event)>0);
  const expenses=monthEvents.filter((event)=>signedAmount(event)<0);
  const income=incomes.reduce((sum,event)=>sum+signedAmount(event),0);
  const expense=expenses.reduce((sum,event)=>sum-signedAmount(event),0);
  const closing=opening+income-expense;
  const cardEvents=expenses.filter((event)=>/cart[aã]o|cr[eé]dito/i.test(String(event.paymentMethod?.name||'')+' '+String(event.sourceDetails?.paymentMethod||'')));
  const cardAmount=cardEvents.reduce((sum,event)=>sum+Math.max(0,-signedAmount(event)),0);
  const otherEvents=expenses.filter((event)=>!cardEvents.includes(event));
  const other=otherEvents.reduce((sum,event)=>sum+Math.max(0,-signedAmount(event)),0);

  return <>
    <SectionTitle eyebrow="Projeção mensal" title={monthLabel(target)} copy="O que já está previsto para comprometer ou reforçar seu caixa neste mês."/>
    <section className="meg-home-future-grid">
      <article><small>Saldo inicial projetado</small><strong>{money.format(opening)}</strong><p>Saldo real atual após os compromissos previstos antes deste mês.</p></article>
      <article className={closing>=0?'accent':'danger'}><small>Saldo após compromissos</small><strong>{money.format(closing)}</strong><p>Inclui receitas e despesas previstas do período.</p></article>
      <article className="income"><span><HomeIcon name="up"/></span><small>Receitas previstas</small><strong>{money.format(income)}</strong><em>{incomes.length} entrada(s)</em></article>
      <article className="expense"><span><HomeIcon name="file"/></span><small>Total de compromissos</small><strong>{money.format(expense)}</strong><em>{expenses.length} compromisso(s)</em></article>
      <article className="card"><span><HomeIcon name="card"/></span><small>Faturas de cartões</small><strong>{money.format(cardAmount)}</strong><em>{cardEvents.length} fatura(s) no mês</em></article>
      <article className="other"><span><HomeIcon name="file"/></span><small>Outras pendências</small><strong>{money.format(other)}</strong><em>{otherEvents.length} item(ns)</em></article>
    </section>
    <BenefitCard data={data} label="Fora do caixa monetário" onOpen={()=>setBenefitOpen(true)}/>
    <button className="meg-home-period-action" onClick={()=>onNavigate('payables')}><HomeIcon name="file"/><span><strong>Principais pendências do mês</strong><small>{expenses.length} item(ns) previsto(s)</small></span><b>Abrir ›</b></button>
    {benefitOpen?<MegMobileBenefitModal data={data} onClose={()=>setBenefitOpen(false)} onOpenMovements={()=>{setBenefitOpen(false);onNavigate('movements');}}/>:null}
  </>;
}

function AggregateHome({data,periodMode,periodLabel,context,onNavigate}:{data:PhoenixReadModel;periodMode:PeriodMode;periodLabel?:string;context?:HomePeriodContext|null;onNavigate:Props['onNavigate']}){
  const [benefitOpen,setBenefitOpen]=useState(false);
  const posted=data.events.items.filter((item)=>isPosted(item)&&isMonetary(item));
  const incomeEvents=posted.filter((item)=>signedAmount(item)>0);
  const expenseEvents=posted.filter((item)=>signedAmount(item)<0);
  const income=incomeEvents.reduce((sum,item)=>sum+signedAmount(item),0);
  const expense=expenseEvents.reduce((sum,item)=>sum-signedAmount(item),0);
  const result=income-expense;
  const months=[...new Set(posted.map(eventMonth).filter(Boolean))];
  const divisor=Math.max(1,months.length);
  const currentBalance=Number(context?.currentRealBalance??(Number(data.summary.availableBalance||0)+Number(data.summary.realizedResult||0)));
  const title=periodMode==='all'?'Histórico completo':periodLabel||'Intervalo selecionado';
  const eyebrow=periodMode==='all'?'Visão geral':'Visão do período';
  const copy=periodMode==='all'?'Resumo de toda a sua vida financeira.':'Resumo financeiro do intervalo selecionado.';

  return <>
    <SectionTitle eyebrow={eyebrow} title={title} copy={copy}/>
    <section className="meg-home-balance meg-home-all-balance">
      <span><HomeIcon name="wallet" size={28}/></span><div><small>Saldo atual (consolidado)</small><strong>{money.format(currentBalance)}</strong><p>Considera todos os lançamentos monetários da conta.</p></div>
    </section>
    <section className="meg-home-all-flow">
      <article className="income"><span><HomeIcon name="up"/></span><small>Total de receitas</small><strong>{money.format(income)}</strong></article>
      <article className="expense"><span><HomeIcon name="down"/></span><small>Total de despesas</small><strong>{money.format(expense)}</strong></article>
      <article className="result"><span><HomeIcon name="chart"/></span><small>Resultado consolidado</small><strong>{resultMoney(result)}</strong></article>
    </section>
    <section className="meg-home-history-metrics">
      <article><span><HomeIcon name="file"/></span><small>Total de lançamentos</small><strong>{posted.length.toLocaleString('pt-BR')}</strong></article>
      <article className="income"><span><HomeIcon name="up"/></span><small>Média mensal de receita</small><strong>{money.format(income/divisor)}</strong></article>
      <article className="expense"><span><HomeIcon name="down"/></span><small>Média mensal de despesa</small><strong>{money.format(expense/divisor)}</strong></article>
    </section>
    <button className="meg-home-period-action" onClick={()=>onNavigate('history')}><HomeIcon name="history"/><span><strong>Ver detalhamento do histórico</strong><small>Consulte toda a trajetória financeira</small></span><b>›</b></button>
    <BenefitCard data={data} label="Saldo atual" onOpen={()=>setBenefitOpen(true)}/>
    {benefitOpen?<MegMobileBenefitModal data={data} onClose={()=>setBenefitOpen(false)} onOpenMovements={()=>{setBenefitOpen(false);onNavigate('movements');}}/>:null}
  </>;
}

export function MegMobileHome({data,periodMode,periodLabel,homePeriodContext,pendingCount,onNavigate,onLaunch,onOpenPeriod,onOpenMenu}:Props){
  const now=todayMonth();
  const state=periodMode==='all'?'all':periodMode==='range'?'range':data.month<now?'past':data.month>now?'future':'current';

  const body=state==='all'||state==='range'
    ? <AggregateHome data={data} periodMode={periodMode} periodLabel={periodLabel} context={homePeriodContext} onNavigate={onNavigate}/>
    : state==='past'
      ? <PastHome data={data} context={homePeriodContext} onNavigate={onNavigate}/>
      : state==='future'
        ? <FutureHome data={data} context={homePeriodContext} onNavigate={onNavigate}/>
        : <CurrentHome data={data} onNavigate={onNavigate}/>;

  return <section className="meg-home-screen" data-meg-home="approved-four-periods" data-home-state={state} data-meg-fixed-screen="true">
    <HomeHeader data={data} periodMode={periodMode} periodLabel={periodLabel} onOpenPeriod={onOpenPeriod} onOpenMenu={onOpenMenu}/>
    <main className={'meg-home-content is-'+state}>{body}</main>
    <HomeDock pendingCount={pendingCount} onNavigate={onNavigate} onLaunch={onLaunch} onOpenMenu={onOpenMenu}/>
  </section>;
}
