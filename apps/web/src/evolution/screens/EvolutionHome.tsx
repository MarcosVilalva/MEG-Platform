import {useEffect,useMemo,useState} from 'react';
import {readSession} from '../../app/auth-client';
import {financeClient, type FinanceSummary, type FinancialAnalytics, type FinancialEvent} from '../../app/finance-client';
import {cardsClient, type CreditCard} from '../../app/cards-client';
import {payablesClient, type Payable} from '../../app/payables-client';
import '../styles/home.css';

type IconName='home'|'overview'|'swap'|'card'|'target'|'report'|'layers'|'chart'|'diamond'|'settings'|'search'|'calendar'|'bell'|'wallet'|'income'|'expense'|'gift'|'alert'|'arrow'|'eye'|'cart'|'salary'|'music'|'restaurant'|'wifi'|'car'|'house'|'plane'|'clock'|'plus';

function Icon({name,className=''}:{name:IconName;className?:string}){
  const paths:Record<IconName,string[]>={
    home:['M3 11.5 12 4l9 7.5','M5.5 10.5V20h13v-9.5','M9.5 20v-6h5v6'],
    overview:['M4 20V10','M10 20V4','M16 20v-7','M22 20H2'],
    swap:['M4 8h14','m15 5 4 3-4 3','M20 16H6','m9-5-4-3 4-3'],
    card:['M3 7h18v12H3z','M3 11h18','M7 16h4'],
    target:['M12 22a10 10 0 1 0-10-10','M12 18a6 6 0 1 0-6-6','M12 14a2 2 0 1 0-2-2','m13 3-6 6','m19 3 2 2-4 1-2-2 1-4 2 2 1-4z'],
    report:['M5 3h10l4 4v14H5z','M15 3v5h5','M8 13h8','M8 17h6'],
    layers:['m12 3 9 5-9 5-9-5z','m3 12 9 5 9-5','m3 4 9 5 9-5'],
    chart:['M4 20V9','M9 20V4','M14 20v-8','M19 20V6'],
    diamond:['m12 3 8 6-8 12L4 9z','M4 9h16','m8-6-3 6 3 12 3-12z'],
    settings:['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z','M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4M7.7 16.3l-1.4 1.4'],
    search:['M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z','m16 16 5 5'],
    calendar:['M5 4h14v16H5z','M8 2v4','M16 2v4','M5 9h14'],
    bell:['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9','M10 21h4'],
    wallet:['M4 7h16v12H4z','M4 7 7 4h11v3','M15 12h5v4h-5z'],
    income:['M5 19 19 5','M11 5h8v8'],
    expense:['M5 5 19 19','M13 19h6v-6'],
    gift:['M4 10h16v10H4z','M2 7h20v4H2z','M12 7v13','M12 7c-3 0-5-1.2-5-3 0-1.3 1-2 2.3-2C11 2 12 7 12 7z','M12 7s1-5 2.7-5C16 2 17 2.7 17 4c0 1.8-2 3-5 3z'],
    alert:['M12 3 2.5 20h19z','M12 9v5','M12 17h.01'],
    arrow:['M5 12h14','m15 8 4 4-4 4'],
    eye:['M2.5 12s3.7-6 9.5-6 9.5 6 9.5 6-3.7 6-9.5 6-9.5-6-9.5-6z','M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    cart:['M3 5h2l2 10h10l3-7H6','M9 20h.01','M17 20h.01'],
    salary:['M4 7h16v10H4z','M8 12h8','M12 9v6'],
    music:['M9 18V5l10-2v13','M9 18a3 3 0 1 1-3-3','M19 16a3 3 0 1 1-3-3'],
    restaurant:['M6 3v7','M3 3v4a3 3 0 0 0 6 0V3','M6 10v11','M16 3v18','M16 3c4 2 4 8 0 10'],
    wifi:['M3 9c5-4 13-4 18 0','M6 13c3.4-2.8 8.6-2.8 12 0','M9.5 17c1.5-1.2 3.5-1.2 5 0','M12 20h.01'],
    car:['M5 17h14l-1.5-6h-11z','M7 11l2-4h6l2 4','M7 17v2','M17 17v2'],
    house:['M3 11.5 12 4l9 7.5','M5.5 10.5V20h13v-9.5'],
    plane:['m3 11 18-8-7 18-2-7-6-3z'],
    clock:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 6v6l4 2'],
    plus:['M12 5v14','M5 12h14']
  };
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{paths[name].map((d,i)=><path key={i} d={d}/>)}</svg>;
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
    {id:'c1',name:'Conta Principal',lastFour:'5934',brand:'MEG',statement:320.45,available:5200},
    {id:'c2',name:'MEG Platinum',lastFour:'4021',brand:'MASTERCARD',statement:1260.80,available:7400},
    {id:'c3',name:'Viagem',lastFour:'8827',brand:'VISA',statement:615.20,available:3380}
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
    categories:analytics?.categories?.length?analytics.categories.slice(0,7):summary.topCategories.length?summary.topCategories:fixture.categories,
    incomeDelta:analytics?.delta?.income??fixture.incomeDelta,
    expenseDelta:analytics?.delta?.expense??fixture.expenseDelta
  };
}

const nav:Array<[IconName,string]>= [
  ['home','Início'],['overview','Visão Geral'],['swap','Movimentações'],['card','Cartões'],['target','Metas'],
  ['report','Relatórios'],['layers','Planejamento'],['chart','Investimentos'],['diamond','Benefícios'],['settings','Configurações']
];

type MetricSpark='balance'|'income'|'expense'|'benefit';
const metricSparks:Record<MetricSpark,string>={
  balance:'M2 27 C14 25 21 20 32 21 C43 22 48 28 59 22 C70 16 76 17 85 12 C96 6 106 13 118 4',
  income:'M2 29 C13 27 22 25 31 20 C42 14 49 19 58 16 C70 12 78 15 88 9 C99 4 108 8 118 3',
  expense:'M2 22 C13 18 21 21 31 24 C43 28 51 22 61 19 C72 15 81 17 91 12 C103 7 110 11 118 8',
  benefit:'M2 28 C13 27 20 23 30 24 C41 25 48 17 58 18 C69 20 76 12 86 13 C97 14 105 8 118 5'
};

function MiniMetric({icon,label,value,tone='cyan',detail,detailNote,spark,accessory=false}:{icon:IconName;label:string;value:string;tone?:'cyan'|'red'|'green'|'warning';detail?:string;detailNote?:string;spark?:MetricSpark;accessory?:boolean}){
  const path=spark?metricSparks[spark]:null;
  return <article className={'evo-home-kpi evo-tone-'+tone+(path?' evo-has-spark':'')+(accessory?' evo-has-accessory':'')}>
    <div className="evo-home-kpi-top"><span className="evo-home-kpi-icon"><Icon name={icon}/></span><span>{label}</span>{accessory&&<Icon name="eye" className="evo-home-kpi-eye"/>}</div>
    {accessory&&<span className="evo-home-kpi-accessory" aria-hidden="true"><Icon name="wallet"/></span>}
    <strong>{value}</strong>
    <div className="evo-home-kpi-detail"><i/><span>{detail||'Atualizado agora'}</span>{detailNote&&<small>{detailNote}</small>}</div>
    {path&&<svg className="evo-home-kpi-spark" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
      <path className="glow" d={path}/>
      <path d={path}/>
    </svg>}
  </article>;
}

function EventIcon({event}:{event:HomeEvent}){
  const key:IconName=event.type==='income'?'salary':event.category.toLowerCase().includes('aliment')?'cart':event.category.toLowerCase().includes('assin')?'music':'swap';
  return <span className={'evo-home-list-icon '+(event.type==='income'?'positive':'negative')}><Icon name={key}/></span>;
}

export function EvolutionHome(){
  const session=useMemo(readSession,[]);
  const qaMode=!session;
  const [month,setMonth]=useState(qaMode?'2025-05':isoMonth());
  const [data,setData]=useState<HomeData>(fixture);
  const [busy,setBusy]=useState(Boolean(session));
  const [cardIndex,setCardIndex]=useState(1);

  useEffect(()=>{
    if(!session){setData(fixture);setBusy(false);return;}
    let active=true;
    setBusy(true);
    void loadReal(month).then(value=>{if(active)setData(value)}).finally(()=>{if(active)setBusy(false)});
    return()=>{active=false};
  },[month,session]);

  const trend=data.trend.length?data.trend:fixture.trend;
  const max=Math.max(1,...trend.flatMap(x=>[x.income,x.expense]));
  const resultMax=Math.max(1,...trend.map(v=>Math.abs(v.result)));
  const pointList=trend.map((item,index)=>{
    const x=8+(index*(84/Math.max(1,trend.length-1)));
    const y=56-(Math.max(0,item.result)/resultMax)*34;
    return {x,y};
  });
  const linePath=pointList.length
    ?pointList.slice(1).reduce((d,p,index)=>{
      const prev=pointList[index];
      const midX=(prev.x+p.x)/2;
      return d+` C ${midX.toFixed(2)} ${prev.y.toFixed(2)}, ${midX.toFixed(2)} ${p.y.toFixed(2)}, ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    },`M ${pointList[0].x.toFixed(2)} ${pointList[0].y.toFixed(2)}`)
    :'';

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
  const visibleCards=data.cards.slice(0,3);

  return <main className="evo-home" data-evolution-screen="home" data-evolution-home-fidelity="command-center-stage-1">
    <div className="evo-home-atmosphere" aria-hidden="true"><i/><i/><i/></div>

    <aside className="evo-home-sidebar">
      <div className="evo-home-brand"><img src="./brand/meg-loading-lockup.svg" alt="MEG Finanças"/></div>
      <nav aria-label="Navegação principal">
        {nav.map(([icon,label],index)=><button key={label} className={index===0?'active':''} type="button"><Icon name={icon}/><span>{label}</span></button>)}
      </nav>
      <section className="evo-home-premium">
        <span className="evo-home-crown">♛</span>
        <strong>Plano Premium</strong>
        <p>Mais recursos para sua evolução financeira.</p>
        <button type="button">Upgrade agora <Icon name="arrow"/></button>
      </section>
    </aside>

    <section className="evo-home-workspace">
      <div className="evo-home-canonical-scene" aria-hidden="true"><img src="./evolution/artwork/home-hero-reference.webp" alt=""/></div>
      <header className="evo-home-topbar">
        <label className="evo-home-search"><Icon name="search"/><input placeholder="Buscar movimentações, metas, relatórios..."/><kbd>⌘ K</kbd></label>
        <div className="evo-home-top-actions">
          <button className="evo-home-month" type="button" onClick={()=>setMonth(month)}><Icon name="calendar"/><span>{monthLabel(month)}</span><b>⌄</b></button>
          <button className="evo-home-bell" type="button" aria-label="Notificações"><Icon name="bell"/><i/></button>
          <button className="evo-home-user" type="button"><span>{initials}</span><strong>{userName}</strong><b>⌄</b></button>
        </div>
      </header>

      <section className="evo-home-hero">
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
        <MiniMetric icon="wallet" label="Saldo total" value={money.format(data.summary.availableBalance)} detail="12,5%" detailNote="em relação ao mês anterior" spark="balance" accessory/>
        <MiniMetric icon="income" label="Receitas" value={money.format(data.summary.income)} tone="green" detail={Math.abs(data.incomeDelta).toFixed(1).replace('.',',')+'%'} spark="income"/>
        <MiniMetric icon="expense" label="Despesas" value={money.format(data.summary.expense)} tone="red" detail={Math.abs(data.expenseDelta).toFixed(1).replace('.',',')+'%'} spark="expense"/>
        <MiniMetric icon="gift" label="Benefício" value={money.format(data.benefit)} tone="green" detail="15,0%" spark="benefit"/>
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
                <span>{item.month.slice(0,3)}</span>
              </div>)}
              <svg className="evo-home-line" viewBox="0 0 100 64" preserveAspectRatio="none"><path d={linePath}/>{pointList.map((point,i)=><circle key={i} cx={point.x} cy={point.y} r="1.3"/>)}</svg>
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
              {visibleCards.map((card,index)=>{
                const visual=index===0?'primary':index===1?'meg':'travel';
                return <div key={card.id} className={'evo-credit-card visual-'+visual+' '+(index===cardIndex?'active':index<cardIndex?'left':'right')}>
                  <span className="evo-card-chip" aria-hidden="true"/>
                  <span className="evo-card-contactless" aria-hidden="true">)))</span>
                  {visual==='travel'&&<span className="evo-card-plane" aria-hidden="true"><Icon name="plane"/></span>}
                  <small>{visual==='meg'?'':card.name}</small>
                  <strong>{visual==='meg'?'MEG':visual==='travel'?'Viagem':card.brand}</strong>
                  <span className="evo-card-number">•••• &nbsp; {card.lastFour}</span>
                  <em>{money.format(card.statement)}</em>
                  {visual==='meg'&&<span className="evo-card-master" aria-hidden="true"><i/><i/></span>}
                </div>;
              })}
              <button className="evo-home-card-nav next" type="button" onClick={()=>setCardIndex(v=>(v+1)%data.cards.length)}>›</button>
            </div>
            <div className="evo-home-dots">{visibleCards.map((card,index)=><button key={card.id} type="button" className={index===cardIndex?'active':''} onClick={()=>setCardIndex(index)}/>)}</div>
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
    </section>
  </main>;
}
