import {useEffect,useMemo,useState} from 'react';
import {readSession} from '../../app/auth-client';
import {financeClient, type FinanceSummary, type FinancialAnalytics, type FinancialEvent} from '../../app/finance-client';
import {cardsClient, type CreditCard} from '../../app/cards-client';
import {payablesClient, type Payable} from '../../app/payables-client';
import {EvolutionLaunchModal} from './EvolutionLaunchModal';
import {EvolutionFinancialIcon,type EvolutionFinancialIconName} from '../components/EvolutionFinancialIcon';
import {EvolutionMovements} from './EvolutionMovements';
import '../styles/home.css';

type IconName='home'|'overview'|'swap'|'card'|'target'|'report'|'layers'|'chart'|'diamond'|'settings'|'search'|'calendar'|'bell'|'wallet'|'income'|'expense'|'gift'|'alert'|'arrow'|'eye'|'cart'|'salary'|'music'|'restaurant'|'wifi'|'car'|'house'|'plane'|'clock'|'plus';

function Icon({name,className=''}:{name:IconName;className?:string}){
  const map:Record<IconName,EvolutionFinancialIconName>={
    home:'home',overview:'chart',swap:'arrows-right-left',card:'card',target:'target',report:'receipt',layers:'list',chart:'chart',diamond:'sparkles',settings:'settings',
    search:'search',calendar:'calendar',bell:'bell',wallet:'wallet',income:'up',expense:'down',gift:'gift',alert:'alert',arrow:'chevron-right',eye:'eye',
    cart:'cart',salary:'banknote',music:'music',restaurant:'food',wifi:'wifi',car:'car',house:'house',plane:'plane',clock:'clock',plus:'plus'
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
};

const fixture:HomeData={
  summary:{
    month:'2025-05',availableBalance:11614.59,income:7245,expense:4320.41,projectedResult:2924.59,
    realizedIncome:7245,realizedExpense:4320.41,realizedResult:2924.59,eventCount:56,pendingCount:2,pendingAmount:410.50,
    nextDue:{id:'due-1',description:'Fatura do cartão •••• 4021',date:'2025-05-10',amount:320.45,type:'expense'},
    topCategories:[{name:'Moradia',amount:1382.53},{name:'Alimentação',amount:777.67},{name:'Transporte',amount:518.45}]
  },
  benefit:892,
  trend:[
    {month:'Jan',income:6800,expense:4100,result:2700},{month:'Fev',income:7450,expense:4600,result:2850},
    {month:'Mar',income:6900,expense:3900,result:3000},{month:'Abr',income:8500,expense:4550,result:3950},
    {month:'Mai',income:7245,expense:4320.41,result:2924.59},{month:'Jun',income:8050,expense:4700,result:3350}
  ],
  cards:[
    {id:'c1',name:'LATAM Pass',lastFour:'5934',brand:'MASTERCARD',statement:320.45,available:5200},
    {id:'c2',name:'Mercado Pago',lastFour:'4021',brand:'VISA',statement:1260.80,available:7400},
    {id:'c3',name:'Riachuelo',lastFour:'8827',brand:'MASTERCARD',statement:615.20,available:3380},
    {id:'c4',name:'Azul Itaú',lastFour:'7146',brand:'VISA',statement:418.90,available:4581.10}
  ],
  events:[
    {id:'e1',description:'Supermercado Extra',category:'Alimentação',date:'2025-05-20T14:32:00',amount:-156.90,type:'expense'},
    {id:'e2',description:'Salário',category:'Receita',date:'2025-05-19T09:15:00',amount:4250,type:'income'},
    {id:'e3',description:'Spotify Premium',category:'Assinatura',date:'2025-05-03',amount:-27.90,type:'expense'},
    {id:'e4',description:'Transferência recebida',category:'Transferência',date:'2025-05-02',amount:320,type:'income'},
    {id:'e5',description:'Restaurante Soho',category:'Alimentação',date:'2025-05-01',amount:-182.40,type:'expense'}
  ],
  due:[
    {id:'d1',description:'Fatura do cartão •••• 4021',date:'2025-05-10',amount:320.45,kind:'card'},
    {id:'d2',description:'Condomínio',date:'2025-05-12',amount:410.50,kind:'house'},
    {id:'d3',description:'Internet Vivo',date:'2025-05-15',amount:99.90,kind:'wifi'},
    {id:'d4',description:'Energia Elétrica',date:'2025-05-17',amount:218.45,kind:'alert'},
    {id:'d5',description:'Seguro Auto',date:'2025-05-20',amount:189.90,kind:'car'}
  ],
  categories:[{name:'Moradia',amount:1382.53},{name:'Alimentação',amount:777.67},{name:'Transporte',amount:518.45},{name:'Lazer',amount:475.24},{name:'Assinaturas',amount:345.60},{name:'Saúde',amount:302.18},{name:'Outros',amount:518.74}],
  incomeDelta:8.2,expenseDelta:2.4
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
    payablesClient.list(month)
  ]);
  const summary=results[0].status==='fulfilled'?results[0].value as FinanceSummary:fixture.summary;
  const analytics=results[1].status==='fulfilled'?results[1].value as FinancialAnalytics:undefined;
  const eventsPage=results[3].status==='fulfilled'?results[3].value:undefined;
  const cardItems=results[4].status==='fulfilled'?results[4].value:undefined;
  const payableItems=results[5].status==='fulfilled'?results[5].value:undefined;
  const benefit=results[2].status==='fulfilled'?results[2].value.balance:fixture.benefit;
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
    expenseDelta:analytics?.delta?.expense??fixture.expenseDelta
  };
}

type EvolutionView='home'|'movements';

const nav:Array<[IconName,string]>= [
  ['home','Início'],['overview','Visão Geral'],['swap','Lançamentos'],['card','Cartões'],['target','Metas'],
  ['report','Relatórios'],['layers','Planejamento'],['chart','Investimentos'],['diamond','Benefícios'],['settings','Configurações']
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
  const [month,setMonth]=useState(qaMode?'2025-05':isoMonth());
  const [data,setData]=useState<HomeData>(fixture);
  const [busy,setBusy]=useState(Boolean(session));
  const [hasLoadedReal,setHasLoadedReal]=useState(!session);
  const [cardIndex,setCardIndex]=useState(0);
  const [refreshToken,setRefreshToken]=useState(0);
  const [launchOpen,setLaunchOpen]=useState(()=>new URLSearchParams(window.location.search).get('modal')==='launch');
  const [monthOpen,setMonthOpen]=useState(false);
  const [activeView,setActiveView]=useState<EvolutionView>(()=>new URLSearchParams(window.location.search).get('view')==='movements'?'movements':'home');

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
  const userName=session?.user.name||'Matheus Silva';
  const initials=(userName.trim()[0]||'M').toUpperCase();
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

  return <main className="evo-home" data-evolution-screen={activeView} data-evolution-home-fidelity="command-center-stage-1">
    <div className="evo-home-atmosphere" aria-hidden="true"><i/><i/><i/></div>

    <aside className="evo-home-sidebar">
      <div className="evo-home-brand"><img src="./brand/meg-loading-lockup.svg" alt="MEG Finanças"/></div>
      <nav aria-label="Navegação principal">
        {nav.map(([icon,label])=>{
          const target:EvolutionView|null=label==='Início'?'home':label==='Lançamentos'?'movements':null;
          return <button
            key={label}
            className={target===activeView?'active':''}
            type="button"
            aria-disabled={!target}
            title={target?undefined:'Módulo em migração para o Evolution'}
            onClick={()=>{if(target)setActiveView(target)}}
          ><Icon name={icon}/><span>{label}</span></button>;
        })}
      </nav>
    </aside>

    <section className={'evo-home-workspace view-'+activeView+(session&&!hasLoadedReal?' initial-sync':'')}>
      {session&&!hasLoadedReal&&<div className="evo-home-initial-sync" role="status"><span><Icon name="wallet"/></span><strong>Carregando seus dados reais</strong><small>Preparando saldos, cartões, pendências e histórico sem exibir valores de demonstração.</small></div>}
      <header className="evo-home-topbar">
        <label className="evo-home-search"><Icon name="search"/><input placeholder="Buscar movimentações, metas, relatórios..."/><kbd>⌘ K</kbd></label>
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
        :<>
      <section className="evo-home-hero">
        <div className="evo-home-canonical-scene" aria-hidden="true"><img src="./evolution/artwork/home-hero-reference.webp" alt=""/></div>
        <div className="evo-home-hero-copy">
          <h1>Seu dinheiro,<br/><em>mais inteligente.</em></h1>
          <p>Mais controle, mais clareza e melhores decisões para o seu amanhã.</p>
        </div>
        <div className="evo-home-mountain" aria-hidden="true"><i/><i/><i/></div>
        <div className="evo-home-hero-cards" aria-hidden="true">
          <span>PLANEJAR<br/>CONQUISTAR<br/>EVOLUIR</span>
          <span className="main">◈</span>
          <span>LIBERDADE<br/>COMEÇA COM<br/>ESCOLHAS<br/>INTELIGENTES</span>
          <span>DISCIPLINA<br/>HOJE<br/>LIBERDADE<br/>SEMPRE</span>
        </div>
      </section>

      <section className={'evo-home-kpis '+(busy?'loading':'')}>
        <MiniMetric icon="wallet" label="Saldo total" value={money.format(data.summary.availableBalance)} detail={data.summary.projectedResult>=0?'Caixa positivo':'Caixa projetado negativo'} detailNote="no período selecionado" series={trend.map(item=>item.result)} accessory/>
        <MiniMetric icon="income" label="Receitas" value={money.format(data.summary.income)} tone="green" detail={Math.abs(data.incomeDelta).toFixed(1).replace('.',',')+'%'} series={trend.map(item=>item.income)}/>
        <MiniMetric icon="expense" label="Despesas" value={money.format(data.summary.expense)} tone="red" detail={Math.abs(data.expenseDelta).toFixed(1).replace('.',',')+'%'} series={trend.map(item=>item.expense)}/>
        <MiniMetric icon="gift" label="Benefício" value={money.format(data.benefit)} tone="green" detail="Saldo separado do caixa"/>
        <article className="evo-home-kpi evo-tone-cyan evo-home-goal-kpi"><div className="evo-home-kpi-top"><span className="evo-home-kpi-icon"><Icon name="target"/></span><span>Metas</span></div><strong>3 de 5</strong><div className="evo-home-goal-line"><i style={{width:'60%'}}/><span>60%</span></div></article>
        <article className="evo-home-kpi evo-tone-warning"><div className="evo-home-kpi-top"><span className="evo-home-kpi-icon"><Icon name="alert"/></span><span>Pendências</span></div><strong>{data.summary.pendingCount} {data.summary.pendingCount===1?'conta':'contas'}</strong><div className="evo-home-kpi-detail"><span>{money.format(data.summary.pendingAmount)}</span><Icon name="arrow"/></div></article>
      </section>

      <section className="evo-home-middle">
        <article className="evo-home-panel evo-home-cashflow">
          <header><div><h2><Icon name="chart"/>Fluxo de caixa</h2><p>Receitas e despesas dos últimos 6 meses</p></div><button type="button">Últimos 6 meses <b>⌄</b></button></header>
          <div className="evo-home-chart">
            <div className="evo-home-chart-grid"><span>12.000</span><span>9.000</span><span>6.000</span><span>3.000</span><span>0</span></div>
            <div className="evo-home-bars">
              {trend.map((item)=><div className="evo-home-bar-month" key={item.month}>
                <div className="evo-home-bar-pair"><i className="income" style={{height:(item.income/max*100)+'%'}}/><i className="expense" style={{height:(item.expense/max*100)+'%'}}/></div>
                <span>{trendMonthLabel(item.month)}</span>
              </div>)}
              <svg className="evo-home-line" viewBox="0 0 100 64" preserveAspectRatio="none"><polyline points={linePoints}/>{pointList.map((point,i)=><circle key={i} cx={point.x} cy={point.y} r="1.25"/>)}</svg>
            </div>
            <aside className="evo-home-chart-summary"><div><span>{monthLabel(month)}</span><b><i className="income"/>{money.format(data.summary.income)}</b><b><i className="expense"/>{money.format(data.summary.expense)}</b></div><div><span>Saldo do período</span><strong>{money.format(data.summary.projectedResult)}</strong><em>↑ 22,8%</em></div></aside>
          </div>
          <footer><span><i className="income"/>Receitas</span><span><i className="expense"/>Despesas</span><span><i className="result"/>Saldo</span></footer>
        </article>

        <div className="evo-home-right-stack">
          <article className="evo-home-panel evo-home-cards">
            <header><h2><Icon name="card"/>Meus cartões</h2><button type="button">Ver todos <Icon name="arrow"/></button></header>
            <div className="evo-home-card-stage">
              <button className="evo-home-card-nav prev" type="button" onClick={()=>setCardIndex(v=>(v-1+data.cards.length)%data.cards.length)}>‹</button>
              {carouselCards.map(({card,sourceIndex,position})=>{
                const visual=sourceIndex%3===0?'primary':sourceIndex%3===1?'meg':'travel';
                return <div key={card.id} className={'evo-credit-card has-real-art visual-'+visual+' '+position}>
                  <img className="evo-card-art" src={cardArtwork(card,sourceIndex)} alt="" aria-hidden="true"/>
                  <span className="evo-card-art-shade" aria-hidden="true"/>
                  <span className="evo-card-live-number">•••• &nbsp; {card.lastFour}</span>
                  <span className="evo-card-live-name">{card.name}</span>
                </div>;
              })}
              <button className="evo-home-card-nav next" type="button" onClick={()=>setCardIndex(v=>(v+1)%data.cards.length)}>›</button>
            </div>
            <div className="evo-home-dots">{data.cards.map((card,index)=><button key={card.id} type="button" className={index===normalizedCardIndex?'active':''} onClick={()=>setCardIndex(index)}/>)}</div>
          </article>
          <article className="evo-home-panel evo-home-goals">
            <header><h2><Icon name="target"/>Metas em andamento</h2><button type="button">Ver todas <Icon name="arrow"/></button></header>
            <div><span className="goal-icon"><Icon name="house"/></span><section><b>Comprar meu apartamento</b><small>R$ 120.000,00</small><i><em style={{width:'68%'}}/></i></section><strong>68%</strong></div>
            <div><span className="goal-icon"><Icon name="plane"/></span><section><b>Viagem Europa 2026</b><small>R$ 25.000,00</small><i><em style={{width:'40%'}}/></i></section><strong>40%</strong></div>
          </article>
        </div>
      </section>

      <section className="evo-home-bottom">
        <article className="evo-home-panel evo-home-list">
          <header><h2><Icon name="swap"/>Últimas movimentações</h2><button type="button">Ver todas <Icon name="arrow"/></button></header>
          <div className="evo-home-scroll">
            {data.events.map(event=><div className="evo-home-list-row" key={event.id}><EventIcon event={event}/><section><b>{event.description}</b><small>{event.category}</small></section><time>{compactDate.format(new Date(event.date))}</time><strong className={event.amount>=0?'positive':'negative'}>{signed(event.amount)}</strong></div>)}
          </div>
        </article>
        <article className="evo-home-panel evo-home-list evo-home-due">
          <header><h2><Icon name="calendar"/>Próximos vencimentos</h2><button type="button">Ver todas <Icon name="arrow"/></button></header>
          <div className="evo-home-scroll">
            {data.due.map(item=><div className="evo-home-list-row" key={item.id}><span className="evo-home-list-icon warning"><Icon name={(item.kind as IconName)||'clock'}/></span><section><b>{item.description}</b><small>Vencimento programado</small></section><time>{compactDate.format(new Date(item.date+'T12:00:00'))}</time><strong className="negative">{money.format(item.amount)}</strong></div>)}
          </div>
        </article>
        <article className="evo-home-panel evo-home-month-summary">
          <header><h2><Icon name="target"/>Resumo do mês</h2><button type="button">Ver relatório <Icon name="arrow"/></button></header>
          <div className="evo-home-donut-wrap"><div className="evo-home-donut" style={{background:donut}}><span><b>{money.format(data.summary.expense)}</b><small>Despesas</small></span></div>
            <div className="evo-home-category-list">{categories.slice(0,7).map((item,index)=><div key={item.name}><i style={{background:palette[index%palette.length]}}/><span>{item.name}</span><em>{(Math.abs(item.amount)/categoryTotal*100).toFixed(0)}%</em><b>{money.format(item.amount)}</b></div>)}</div>
          </div>
        </article>
      </section>
      </>}
    </section>
    {launchOpen&&<EvolutionLaunchModal
      month={month}
      qaMode={qaMode}
      onClose={()=>setLaunchOpen(false)}
      onSaved={()=>{setLaunchOpen(false);setRefreshToken(value=>value+1)}}
    />}
  </main>;
}
