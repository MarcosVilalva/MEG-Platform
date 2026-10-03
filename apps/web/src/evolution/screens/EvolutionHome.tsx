import {useEffect,useMemo,useState} from 'react';
import {readSession} from '../../app/auth-client';
import {financeClient, type FinanceSummary, type FinancialAnalytics, type FinancialEvent} from '../../app/finance-client';
import {cardsClient, type CreditCard} from '../../app/cards-client';
import {payablesClient, type Payable} from '../../app/payables-client';
import {EvolutionLaunchModal} from './EvolutionLaunchModal';
import {EvolutionFinancialIcon,type EvolutionFinancialIconName} from '../components/EvolutionFinancialIcon';
import {EvolutionMovements} from './EvolutionMovements';
import {EvolutionPayables} from './EvolutionPayables';
import {EvolutionCards} from './EvolutionCards';
import {EvolutionBenefits} from './EvolutionBenefits';
import {EvolutionTransferModal} from './EvolutionTransferModal';
import '../styles/home.css';

type IconName='home'|'overview'|'swap'|'card'|'target'|'report'|'layers'|'chart'|'diamond'|'settings'|'search'|'calendar'|'bell'|'wallet'|'income'|'expense'|'gift'|'alert'|'arrow'|'eye'|'cart'|'salary'|'music'|'restaurant'|'wifi'|'car'|'house'|'plane'|'clock'|'plus'|'check';

function Icon({name,className=''}:{name:IconName;className?:string}){
  const map:Record<IconName,EvolutionFinancialIconName>={
    home:'home',overview:'chart',swap:'arrows-right-left',card:'card',target:'target',report:'receipt',layers:'list',chart:'chart',diamond:'sparkles',settings:'settings',
    search:'search',calendar:'calendar',bell:'bell',wallet:'wallet',income:'up',expense:'down',gift:'gift',alert:'alert',arrow:'chevron-right',eye:'eye',
    cart:'cart',salary:'banknote',music:'music',restaurant:'food',wifi:'wifi',car:'car',house:'house',plane:'plane',clock:'clock',plus:'plus',check:'check-line'
  };
  return <EvolutionFinancialIcon name={map[name]} className={className}/>;
}

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const compactDate=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'});
const monthFormatter=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'});
const n=(value:unknown)=>Number(value||0);
const signed=(value:number)=>(value>=0?'+ ':'- ')+money.format(Math.abs(value));
const isoMonth=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}).slice(0,7);
const monthLabel=(month:string)=>{
  const parts=month.split('-').map(Number);
  const label=monthFormatter.format(new Date(parts[0],parts[1]-1,2));
  return label.charAt(0).toUpperCase()+label.slice(1);
};
const shiftMonth=(month:string,offset:number)=>{
  const [year,value]=month.split('-').map(Number);
  const date=new Date(year,value-1+offset,2);
  return date.toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}).slice(0,7);
};
const shortMonthFormatter=new Intl.DateTimeFormat('pt-BR',{month:'short'});
const trendMonthLabel=(value:string)=>{
  const match=value.match(/^(\d{4})-(\d{2})/);
  if(match){
    const label=shortMonthFormatter.format(new Date(Number(match[1]),Number(match[2])-1,2));
    return label.replace('.','').slice(0,3);
  }
  return value.replace('.','').slice(0,3);
};
const normalizedKey=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
const aggregateCategories=(rows:HomeCategory[])=>{
  const merged=new Map<string,HomeCategory>();
  for(const row of rows){
    const key=normalizedKey(row.name||'Sem categoria')||'sem categoria';
    const current=merged.get(key);
    if(current) current.amount+=Number(row.amount||0);
    else merged.set(key,{name:row.name||'Sem categoria',amount:Number(row.amount||0)});
  }
  return [...merged.values()].sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount));
};
const plotPoints=(values:number[],width:number,height:number,padX=4,padY=4)=>{
  if(values.length<2)return [] as Array<{x:number;y:number}>;
  const min=Math.min(...values);
  const max=Math.max(...values);
  const spread=Math.max(1,max-min);
  return values.map((value,index)=>({
    x:padX+(index*(width-padX*2)/Math.max(1,values.length-1)),
    y:height-padY-((value-min)/spread)*(height-padY*2)
  }));
};

type Trend={month:string;income:number;expense:number;result:number};
type HomeCard={id:string;name:string;lastFour:string;brand:string;statement:number;available:number};
type HomeEvent={id:string;description:string;category:string;date:string;amount:number;type:'income'|'expense'};
type HomeDue={id:string;description:string;date:string;amount:number;kind:string};
type HomeCategory={name:string;amount:number};
type HomeCashDay={date:string;income:number;expense:number;net:number};
type HomeData={
  summary:FinanceSummary;
  benefit:number;
  trend:Trend[];
  cards:HomeCard[];
  events:HomeEvent[];
  due:HomeDue[];
  categories:HomeCategory[];
  incomeDelta:number;
  expenseDelta:number;
  cashflow:HomeCashDay[];
  payableOpenAmount:number;
  payableOpenCount:number;
  cardStatementAmount:number;
  cardStatementCount:number;
  paidAmount:number;
  paidCount:number;
};

const fixture:HomeData={
  summary:{
    month:'2026-10',availableBalance:3049.15,income:9205.70,expense:6887.71,projectedResult:2317.99,
    realizedIncome:9205.70,realizedExpense:6887.71,realizedResult:2317.99,eventCount:22,pendingCount:5,pendingAmount:532.18,
    nextDue:{id:'due-1',description:'Fatura Nubank',date:'2026-10-03',amount:532.18,type:'expense'},
    topCategories:[{name:'Alimentação',amount:1928.30},{name:'Casa',amount:1238.64},{name:'Transporte',amount:963.40}]
  },
  benefit:1436.52,
  trend:[
    {month:'Mai',income:7600,expense:6500,result:1100},{month:'Jun',income:8300,expense:6900,result:1400},
    {month:'Jul',income:7850,expense:6600,result:1250},{month:'Ago',income:9100,expense:7000,result:2100},
    {month:'Set',income:8700,expense:7200,result:1500},{month:'Out',income:9205.70,expense:6887.71,result:2317.99}
  ],
  cards:[
    {id:'c1',name:'MEG Visa Infinite',lastFour:'1234',brand:'VISA',statement:2317.99,available:13000},
    {id:'c2',name:'Nubank',lastFour:'5678',brand:'MASTERCARD',statement:532.18,available:7200},
    {id:'c3',name:'C6 Bank',lastFour:'9012',brand:'MASTERCARD',statement:423.50,available:6100},
    {id:'c4',name:'American Express',lastFour:'3456',brand:'AMEX',statement:312.45,available:10400}
  ],
  events:[
    {id:'e1',description:'Salário',category:'Receita',date:'2026-10-01T09:15:00',amount:4850,type:'income'},
    {id:'e2',description:'Supermercado Extra',category:'Alimentação',date:'2026-10-01T14:32:00',amount:-342.50,type:'expense'},
    {id:'e3',description:'Netflix',category:'Entretenimento',date:'2026-09-30',amount:-55.90,type:'expense'},
    {id:'e4',description:'Posto Ipiranga',category:'Transporte',date:'2026-09-30',amount:-180,type:'expense'},
    {id:'e5',description:'Transferência Nubank',category:'Transferência',date:'2026-09-29',amount:-500,type:'expense'}
  ],
  due:[
    {id:'d1',description:'Fatura Nubank',date:'2026-10-03',amount:532.18,kind:'card'},
    {id:'d2',description:'Internet Vivo',date:'2026-10-05',amount:129.90,kind:'wifi'},
    {id:'d3',description:'Energia Elétrica',date:'2026-10-08',amount:214.85,kind:'alert'},
    {id:'d4',description:'Academia Smart Fit',date:'2026-10-10',amount:99.90,kind:'clock'},
    {id:'d5',description:'Seguro Auto',date:'2026-10-12',amount:189.00,kind:'car'}
  ],
  categories:[
    {name:'Alimentação',amount:1928.30},{name:'Casa',amount:1238.64},{name:'Transporte',amount:963.40},
    {name:'Compras',amount:825.20},{name:'Saúde',amount:620.15},{name:'Outros',amount:1312.02}
  ],
  incomeDelta:12.4,expenseDelta:0,
  cashflow:[
    {date:'2026-10-01',income:900,expense:0,net:900},{date:'2026-10-02',income:1300,expense:300,net:1000},
    {date:'2026-10-03',income:0,expense:540,net:-540},{date:'2026-10-05',income:1100,expense:160,net:940},
    {date:'2026-10-07',income:0,expense:450,net:-450},{date:'2026-10-10',income:700,expense:260,net:440},
    {date:'2026-10-12',income:850,expense:0,net:850},{date:'2026-10-15',income:1245,expense:832,net:413},
    {date:'2026-10-18',income:0,expense:520,net:-520},{date:'2026-10-21',income:900,expense:250,net:650},
    {date:'2026-10-25',income:0,expense:610,net:-610},{date:'2026-10-27',income:1150,expense:0,net:1150},
    {date:'2026-10-30',income:500,expense:420,net:80}
  ],
  payableOpenAmount:1245.80,payableOpenCount:3,cardStatementAmount:864.32,cardStatementCount:2,paidAmount:4792.66,paidCount:12
};

function mapEvent(event:FinancialEvent):HomeEvent{
  const amount=n(event.signedAmount||event.amount);
  return {
    id:event.id,
    description:event.description||'Lançamento',
    category:event.category?.name||event.sourceDetails?.group||'Movimentação',
    date:event.date,
    amount:event.type==='expense'?-Math.abs(amount):Math.abs(amount),
    type:event.type==='income'?'income':'expense'
  };
}
function mapCard(card:CreditCard):HomeCard{
  return {id:card.id,name:card.name,lastFour:card.lastFour||'••••',brand:card.brand||card.issuer||'MEG',statement:n(card.statementAmount),available:n(card.availableLimit)};
}
function mapDue(item:Payable):HomeDue{
  return {id:item.id,description:item.description,date:item.dueDate,amount:n(item.openAmount||item.totalAmount),kind:'clock'};
}

async function loadReal(month:string):Promise<HomeData>{
  const results=await Promise.allSettled([
    financeClient.getSummary(month),
    financeClient.getAnalytics(month),
    financeClient.getBenefitSummary(month),
    financeClient.listEventsForMonth(month),
    cardsClient.list(month),
    payablesClient.list(month),
    financeClient.getCashflow(month)
  ]);
  const summary=results[0].status==='fulfilled'?results[0].value as FinanceSummary:fixture.summary;
  const analytics=results[1].status==='fulfilled'?results[1].value as FinancialAnalytics:undefined;
  const eventsPage=results[3].status==='fulfilled'?results[3].value:undefined;
  const cardItems=results[4].status==='fulfilled'?results[4].value:undefined;
  const payableItems=results[5].status==='fulfilled'?results[5].value:undefined;
  const benefit=results[2].status==='fulfilled'?results[2].value.balance:fixture.benefit;
  const cashflow=results[6].status==='fulfilled'?results[6].value.days:fixture.cashflow;
  const events=eventsPage?.items.slice(0,8).map(mapEvent)||fixture.events;
  const cards=cardItems?.slice(0,5).map(mapCard)||fixture.cards;
  const due=payableItems
    ?payableItems.filter((x:Payable)=>n(x.openAmount)>0).sort((a:Payable,b:Payable)=>a.dueDate.localeCompare(b.dueDate)).slice(0,7).map(mapDue)
    :fixture.due;
  return {
    summary,
    benefit,
    trend:analytics?.monthlyTrend?.length?analytics.monthlyTrend.slice(-6):fixture.trend,
    cards:cards.length?cards:fixture.cards,
    events:events.length?events:fixture.events,
    due:due.length?due:fixture.due,
    categories:aggregateCategories(analytics?.categories?.length?analytics.categories:summary.topCategories.length?summary.topCategories:fixture.categories).slice(0,7),
    incomeDelta:analytics?.delta?.income??fixture.incomeDelta,
    expenseDelta:analytics?.delta?.expense??fixture.expenseDelta,
    cashflow:cashflow.length?cashflow.map(item=>({date:item.date,income:Number(item.income||0),expense:Number(item.expense||0),net:Number(item.net||0)})):fixture.cashflow,
    payableOpenAmount:payableItems?payableItems.filter(item=>n(item.openAmount)>0).reduce((sum,item)=>sum+n(item.openAmount),0):fixture.payableOpenAmount,
    payableOpenCount:payableItems?payableItems.filter(item=>n(item.openAmount)>0).length:fixture.payableOpenCount,
    cardStatementAmount:cardItems?cardItems.reduce((sum,item)=>sum+n(item.payableStatementAmount??item.statementAmount),0):fixture.cardStatementAmount,
    cardStatementCount:cardItems?cardItems.filter(item=>n(item.payableStatementAmount??item.statementAmount)>0).length:fixture.cardStatementCount,
    paidAmount:payableItems?payableItems.filter(item=>n(item.openAmount)<=0).reduce((sum,item)=>sum+n(item.totalAmount),0):fixture.paidAmount,
    paidCount:payableItems?payableItems.filter(item=>n(item.openAmount)<=0).length:fixture.paidCount
  };
}

type EvolutionView='home'|'movements'|'cards'|'payables'|'benefits';

const nav:Array<[IconName,string,EvolutionView|null]>= [
  ['home','Início','home'],
  ['swap','Lançamentos','movements'],
  ['card','Cartões','cards'],
  ['clock','Pendentes','payables'],
  ['gift','Benefícios','benefits'],
  ['report','Relatórios',null],
  ['settings','Configurações',null]
];

function MiniMetric({icon,label,value,tone='cyan',detail,detailNote,series,accessory=false}:{icon:IconName;label:string;value:string;tone?:'cyan'|'red'|'green'|'warning';detail?:string;detailNote?:string;series?:number[];accessory?:boolean}){
  const points=plotPoints((series||[]).map(Number),120,34,3,5);
  const pointString=points.map(point=>point.x.toFixed(1)+','+point.y.toFixed(1)).join(' ');
  return <article className={'evo-home-kpi evo-tone-'+tone+(points.length?' evo-has-spark':'')+(accessory?' evo-has-accessory':'')}>
    <div className="evo-home-kpi-top"><span className="evo-home-kpi-icon"><Icon name={icon}/></span><span>{label}</span>{accessory&&<Icon name="eye" className="evo-home-kpi-eye"/>}</div>
    {accessory&&<span className="evo-home-kpi-accessory" aria-hidden="true"><Icon name="wallet"/></span>}
    <strong>{value}</strong>
    <div className="evo-home-kpi-detail"><i/><span>{detail||'Atualizado agora'}</span>{detailNote&&<small>{detailNote}</small>}</div>
    {points.length>1&&<svg className="evo-home-kpi-spark" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline className="glow" points={pointString}/>
      <polyline points={pointString}/>
    </svg>}
  </article>;
}

function EventIcon({event}:{event:HomeEvent}){
  const key:IconName=event.type==='income'?'salary':event.category.toLowerCase().includes('aliment')?'cart':event.category.toLowerCase().includes('assin')?'music':'swap';
  return <span className={'evo-home-list-icon '+(event.type==='income'?'positive':'negative')}><Icon name={key}/></span>;
}

function cardArtwork(card:HomeCard,index:number){
  const key=(card.name+' '+card.brand).toLowerCase();
  if(key.includes('latam')) return './assets/cards/latam-user-model-v61.svg';
  if(key.includes('mercado')) return './assets/cards/mercado-pago-visa-v662.svg';
  if(key.includes('riachuelo')) return './assets/cards/riachuelo-mastercard-visual.svg';
  if(key.includes('azul')) return './assets/cards/azul-itau-platinum-v659.svg';
  return [
    './assets/cards/azul-itau-platinum-v659.svg',
    './assets/cards/mercado-pago-visa-v662.svg',
    './assets/cards/riachuelo-mastercard-visual.svg'
  ][index%3];
}

export function EvolutionHome(){
  const session=useMemo(readSession,[]);
  const qaMode=!session;
  const [month,setMonth]=useState(qaMode?'2026-10':isoMonth());
  const [data,setData]=useState<HomeData>(fixture);
  const [busy,setBusy]=useState(Boolean(session));
  const [hasLoadedReal,setHasLoadedReal]=useState(!session);
  const [cardIndex,setCardIndex]=useState(0);
  const [refreshToken,setRefreshToken]=useState(0);
  const [launchOpen,setLaunchOpen]=useState(()=>new URLSearchParams(window.location.search).get('modal')==='launch');
  const [monthOpen,setMonthOpen]=useState(false);
  const [transferOpen,setTransferOpen]=useState(()=>new URLSearchParams(window.location.search).get('modal')==='transfer');
  const [activeView,setActiveView]=useState<EvolutionView>(()=>{
    const value=new URLSearchParams(window.location.search).get('view');
    return value==='movements'||value==='payables'||value==='cards'||value==='benefits'?value:'home';
  });

  useEffect(()=>{
    if(!session){setData(fixture);setBusy(false);setHasLoadedReal(true);return;}
    let active=true;
    setBusy(true);
    void loadReal(month).then(value=>{if(active){setData(value);setHasLoadedReal(true)}}).finally(()=>{if(active)setBusy(false)});
    return()=>{active=false};
  },[month,session,refreshToken]);

  const trend=data.trend.length?data.trend:fixture.trend;
  const max=Math.max(1,...trend.flatMap(x=>[x.income,x.expense]));
  const pointList=trend.map((item,index)=>{
    const result=Number(item.result||0);
    const x=8+(index*(84/Math.max(1,trend.length-1)));
    const y=Math.max(8,Math.min(61,58-(result/max)*40));
    return {x,y};
  });
  const linePoints=pointList.map(point=>point.x.toFixed(2)+','+point.y.toFixed(2)).join(' ');

  const categories=data.categories.length?data.categories:fixture.categories;
  const categoryTotal=Math.max(1,categories.reduce((sum,item)=>sum+Math.abs(item.amount),0));
  const palette=['#ff5964','#f6b94b','#90b7d8','#8d63e9','#5c71e7','#53cf8d','#c9d7e5'];
  let acc=0;
  const stops=categories.map((item,index)=>{
    const start=acc; acc+=Math.abs(item.amount)/categoryTotal*100;
    return palette[index%palette.length]+' '+start.toFixed(1)+'% '+acc.toFixed(1)+'%';
  });
  const donut='conic-gradient('+stops.join(',')+')';
  const userName=session?.user.name||'Marcos de Andrade Vilalva';
  const initials=qaMode?'MV':(userName.trim().split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()||'M');
  const cardCount=data.cards.length;
  const normalizedCardIndex=cardCount?((cardIndex%cardCount)+cardCount)%cardCount:0;
  const carouselCards=cardCount<=1
    ?data.cards.map((card,sourceIndex)=>({card,sourceIndex,position:'active' as const}))
    :cardCount===2
      ?[
          {card:data.cards[(normalizedCardIndex-1+cardCount)%cardCount],sourceIndex:(normalizedCardIndex-1+cardCount)%cardCount,position:'left' as const},
          {card:data.cards[normalizedCardIndex],sourceIndex:normalizedCardIndex,position:'active' as const}
        ]
      :[
          {card:data.cards[(normalizedCardIndex-1+cardCount)%cardCount],sourceIndex:(normalizedCardIndex-1+cardCount)%cardCount,position:'left' as const},
          {card:data.cards[normalizedCardIndex],sourceIndex:normalizedCardIndex,position:'active' as const},
          {card:data.cards[(normalizedCardIndex+1)%cardCount],sourceIndex:(normalizedCardIndex+1)%cardCount,position:'right' as const}
        ];

  const flowDays=(data.cashflow.length?data.cashflow:fixture.cashflow).slice(-31);
  const flowMax=Math.max(1,...flowDays.flatMap(item=>[Math.abs(item.income),Math.abs(item.expense)]));
  const resultValue=Number(data.summary.realizedResult||data.summary.projectedResult||0);
  const balanceDelta=data.incomeDelta-data.expenseDelta;

  return <main className="evo-home" data-evolution-screen={activeView} data-evolution-home-fidelity="approved-2026-10-03">
    <div className="evo-home-atmosphere" aria-hidden="true"><i/><i/><i/></div>

    <aside className="evo-home-sidebar">
      <div className="evo-home-brand"><img src="./brand/meg-loading-lockup.svg" alt="MEG Finanças"/></div>
      <nav aria-label="Navegação principal">
        {nav.map(([icon,label,target])=><button
          key={label}
          className={target===activeView?'active':''}
          type="button"
          aria-disabled={!target}
          title={target?undefined:'Módulo em reconstrução'}
          onClick={()=>{if(target)setActiveView(target)}}
        ><Icon name={icon}/><span>{label}</span></button>)}
      </nav>
      <button className="evo-home-side-new" type="button" onClick={()=>setLaunchOpen(true)}><Icon name="plus"/><span>Novo</span></button>
    </aside>

    <section className={'evo-home-workspace view-'+activeView+(session&&!hasLoadedReal?' initial-sync':'')}>
      {session&&!hasLoadedReal&&<div className="evo-home-initial-sync" role="status"><span><Icon name="wallet"/></span><strong>Carregando seus dados reais</strong><small>Preparando saldos, cartões, pendências e histórico sem exibir valores de demonstração.</small></div>}
      <header className="evo-home-topbar">
        <label className="evo-home-search"><Icon name="search"/><input placeholder="Buscar no MEG..."/><kbd>⌘ K</kbd></label>
        <button className="evo-home-add" type="button" onClick={()=>setLaunchOpen(true)}><Icon name="plus"/><span>Incluir</span></button>
        <div className="evo-home-top-actions">
          <div className="evo-home-period">
            <button className={'evo-home-month '+(monthOpen?'open':'')} type="button" onClick={()=>setMonthOpen(value=>!value)}><Icon name="calendar"/><span>{monthLabel(month)}</span><b>⌄</b></button>
            {monthOpen&&<section className="evo-home-period-popover" role="dialog" aria-label="Selecionar período">
              <header><span>Período da Home</span><small>{month===isoMonth()?'Mês atual':month<isoMonth()?'Período anterior':'Período futuro'}</small></header>
              <div className="evo-home-period-shortcuts">
                <button type="button" onClick={()=>setMonth(shiftMonth(month,-1))}>‹ <span>Anterior</span></button>
                <button type="button" className={month===isoMonth()?'active':''} onClick={()=>setMonth(isoMonth())}><span>Mês atual</span></button>
                <button type="button" onClick={()=>setMonth(shiftMonth(month,1))}><span>Próximo</span> ›</button>
              </div>
              <label><span>Escolher competência</span><input type="month" value={month} onChange={event=>{setMonth(event.target.value||month);setMonthOpen(false)}}/></label>
            </section>}
          </div>
          <button className="evo-home-bell" type="button" aria-label="Notificações"><Icon name="bell"/><i/></button>
          <button className="evo-home-user" type="button"><span>{initials}</span><strong>{userName}</strong><b>⌄</b></button>
        </div>
      </header>

      {activeView==='movements'
        ?<EvolutionMovements month={month} qaMode={qaMode} onCreate={()=>setLaunchOpen(true)} refreshToken={refreshToken}/>
        :activeView==='payables'
          ?<EvolutionPayables month={month} qaMode={qaMode} refreshToken={refreshToken} onChanged={()=>setRefreshToken(value=>value+1)}/>
          :activeView==='cards'
            ?<EvolutionCards month={month} qaMode={qaMode} refreshToken={refreshToken} onChanged={()=>setRefreshToken(value=>value+1)}/>
            :activeView==='benefits'
              ?<EvolutionBenefits month={month} qaMode={qaMode} refreshToken={refreshToken} onChanged={()=>setRefreshToken(value=>value+1)}/>
              :<section className="evo-home-dashboard" data-meg-no-page-scroll="true">
          <section className="evo-home-dashboard-top">
            <article className="evo-home-balance-hero">
              <img src="./evolution/artwork/home-hero-reference.webp" alt="" aria-hidden="true"/>
              <div className="evo-home-balance-copy">
                <span className="evo-home-feature-icon"><Icon name="wallet"/></span>
                <div>
                  <small>Saldo disponível</small>
                  <strong>{money.format(data.summary.availableBalance)}</strong>
                  <p className={balanceDelta>=0?'positive':'negative'}>{balanceDelta>=0?'↗':'↘'} {Math.abs(balanceDelta).toFixed(1).replace('.',',')}% <em>em relação ao mês anterior</em></p>
                </div>
              </div>
              <div className="evo-home-balance-badge"><i/>{money.format(data.summary.availableBalance)}</div>
            </article>

            <article className="evo-home-flow-panel">
              <header>
                <div><span className="evo-home-feature-icon"><Icon name="chart"/></span><h2>Fluxo do mês</h2></div>
                <button type="button" onClick={()=>setMonthOpen(true)}>{monthLabel(month)} <b>⌄</b></button>
              </header>
              <section className="evo-home-flow-metrics">
                <div className="income"><Icon name="income"/><span><small>Entradas</small><strong>{money.format(data.summary.realizedIncome||data.summary.income)}</strong></span></div>
                <div className="expense"><Icon name="expense"/><span><small>Saídas</small><strong>{money.format(data.summary.realizedExpense||data.summary.expense)}</strong></span></div>
                <div className={resultValue>=0?'result positive':'result negative'}><b>=</b><span><small>Resultado</small><strong>{money.format(resultValue)}</strong></span></div>
              </section>
              <div className="evo-home-flow-chart" aria-label="Fluxo diário">
                <div className="zero-line"/>
                {flowDays.map((item,index)=>{
                  const day=String(Number(item.date.slice(-2))).padStart(2,'0');
                  const showLabel=index===0||index===flowDays.length-1||Number(day)%5===0;
                  return <span className="evo-home-flow-day" key={item.date}>
                    <i className="income" style={{height:(Math.abs(item.income)/flowMax*46)+'%'}}/>
                    <i className="expense" style={{height:(Math.abs(item.expense)/flowMax*46)+'%'}}/>
                    {showLabel&&<small>{day}</small>}
                  </span>;
                })}
              </div>
            </article>
          </section>

          <section className="evo-home-summary-cards">
            <button className="red" type="button" onClick={()=>setActiveView('payables')}><span><Icon name="report"/></span><div><small>Contas a pagar</small><strong>{money.format(data.payableOpenAmount)}</strong><em>{data.payableOpenCount} {data.payableOpenCount===1?'conta em aberto':'contas em aberto'}</em></div><b>›</b></button>
            <button className="blue" type="button" onClick={()=>setActiveView('cards')}><span><Icon name="card"/></span><div><small>Faturas de cartões</small><strong>{money.format(data.cardStatementAmount)}</strong><em>{data.cardStatementCount} {data.cardStatementCount===1?'fatura em aberto':'faturas em aberto'}</em></div><b>›</b></button>
            <button className="amber" type="button" onClick={()=>setActiveView('payables')}><span><Icon name="clock"/></span><div><small>Outras pendências</small><strong>{money.format(data.summary.pendingAmount)}</strong><em>{data.summary.pendingCount} itens pendentes</em></div><b>›</b></button>
            <button className="green" type="button" onClick={()=>setActiveView('payables')}><span><Icon name="check"/></span><div><small>Contas pagas</small><strong>{money.format(data.paidAmount||data.summary.realizedExpense)}</strong><em>{data.paidCount} contas este mês</em></div><b>›</b></button>
          </section>

          <section className="evo-home-feature-row">
            <article className="evo-home-benefit-banner">
              <div className="evo-home-benefit-copy"><span className="evo-home-feature-icon"><Icon name="gift"/></span><div><h2>Benefícios Verocard</h2><p>Mais economia no seu dia a dia.</p></div></div>
              <div className="evo-home-benefit-partners">
                <span><Icon name="cart"/><small>Supermercados<b>Até 15% OFF</b></small></span>
                <span><Icon name="car"/><small>Postos de gasolina<b>Até 12% OFF</b></small></span>
                <span><Icon name="restaurant"/><small>Restaurantes<b>Até 20% OFF</b></small></span>
                <span><Icon name="report"/><small>Farmácias<b>Até 18% OFF</b></small></span>
              </div>
              <img src="./assets/cards/verocard-alimentacao-v659.svg" alt="Verocard Alimentação"/>
            </article>

            <article className="evo-home-quick-actions">
              <header><div><span className="evo-home-feature-icon"><Icon name="alert"/></span><h2>Ações rápidas</h2></div><button type="button">Ver todas⌄</button></header>
              <div>
                <button type="button" onClick={()=>setLaunchOpen(true)}><span><Icon name="plus"/></span><b>Novo lançamento</b><small>Receita, despesa ou benefício</small></button>
                <button type="button" onClick={()=>setTransferOpen(true)}><span><Icon name="swap"/></span><b>Transferência</b><small>Entre contas e investimentos</small></button>
                <button type="button"><span><Icon name="report"/></span><b>Relatórios</b><small>Veja seus resultados</small></button>
                <button type="button"><span><Icon name="settings"/></span><b>Configurar metas</b><small>Organize seus objetivos</small></button>
              </div>
            </article>
          </section>

          <section className="evo-home-dashboard-bottom">
            <article className="evo-home-data-panel">
              <header><div><Icon name="swap"/><h2>Últimas movimentações</h2></div><button type="button" onClick={()=>setActiveView('movements')}>Ver todas⌄</button></header>
              <div className="evo-home-mini-table" data-meg-scroll-region="true">
                <div className="head"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Valor</span></div>
                {data.events.slice(0,6).map(event=><button type="button" key={event.id} className="row" onClick={()=>setActiveView('movements')}>
                  <time>{new Intl.DateTimeFormat('pt-BR').format(new Date(event.date.length===10?event.date+'T12:00:00':event.date))}</time>
                  <span className="desc"><EventIcon event={event}/><b>{event.description}</b></span>
                  <em>{event.category}</em>
                  <strong className={event.amount>=0?'positive':'negative'}>{signed(event.amount)}</strong>
                </button>)}
              </div>
            </article>

            <article className="evo-home-data-panel evo-home-upcoming">
              <header><div><Icon name="calendar"/><h2>Próximos vencimentos</h2></div><button type="button">Ver todas⌄</button></header>
              <div className="evo-home-mini-table" data-meg-scroll-region="true">
                <div className="head"><span>Vencimento</span><span>Descrição</span><span>Status</span><span>Valor</span></div>
                {data.due.slice(0,6).map(item=><div className="row" key={item.id}>
                  <time>{new Intl.DateTimeFormat('pt-BR').format(new Date(item.date+'T12:00:00'))}</time>
                  <span className="desc"><span className="evo-home-list-icon warning"><Icon name={(item.kind as IconName)||'clock'}/></span><b>{item.description}</b></span>
                  <em className="due">Pendente</em>
                  <strong>{money.format(item.amount)}</strong>
                </div>)}
              </div>
            </article>
          </section>
        </section>}
    </section>
    {launchOpen&&<EvolutionLaunchModal
      month={month}
      qaMode={qaMode}
      onTransfer={()=>{setLaunchOpen(false);setTransferOpen(true)}}
      onClose={()=>setLaunchOpen(false)}
      onSaved={()=>{setLaunchOpen(false);setRefreshToken(value=>value+1)}}
    />}
    {transferOpen&&<EvolutionTransferModal
      qaMode={qaMode}
      onClose={()=>setTransferOpen(false)}
      onSaved={()=>{setTransferOpen(false);setRefreshToken(value=>value+1)}}
    />}
  </main>;
}
