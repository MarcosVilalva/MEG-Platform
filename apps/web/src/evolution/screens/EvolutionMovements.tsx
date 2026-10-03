import {useEffect,useMemo,useState} from 'react';
import {financeClient,type Account,type Category,type FinanceSummary,type FinancialEvent,type PaymentMethod} from '../../app/finance-client';
import '../styles/movements.css';

type MovementKind='all'|'income'|'expense'|'benefit';

type Props={
  month:string;
  qaMode?:boolean;
  onCreate:()=>void;
  refreshToken?:number;
};

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const dateFmt=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const amountOf=(event:FinancialEvent)=>{
  const raw=Number(event.signedAmount??event.amount??0);
  if(event.type==='income')return Math.abs(raw);
  if(event.type==='expense')return -Math.abs(raw);
  return raw;
};
const isBenefitEvent=(event:FinancialEvent)=>/benef|verocard|alimenta|refeic/.test(normalize([
  event.account?.name,
  event.account?.type,
  event.paymentMethod?.name,
  event.paymentMethod?.type,
  event.sourceDetails?.paymentMethod,
].filter(Boolean).join(' ')));
const statusLabel=(status:string)=>{
  const key=normalize(status);
  if(key==='paid'||key==='reconciled'||key==='confirmed')return 'Pago';
  if(key==='planned'||key==='draft')return 'Pendente';
  if(key==='archived')return 'Arquivado';
  return status||'—';
};

function Icon({name}:{name:'search'|'filter'|'calendar'|'up'|'down'|'result'|'plus'|'sort'|'close'|'wallet'|'card'|'tag'|'receipt'}){
  const paths={
    search:['M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z','m16 16 5 5'],
    filter:['M4 6h16','M7 12h10','M10 18h4'],
    calendar:['M5 4h14v16H5z','M8 2v4','M16 2v4','M5 9h14'],
    up:['M5 19 19 5','M11 5h8v8'],
    down:['M5 5 19 19','M13 19h6v-6'],
    result:['M4 20V10','M10 20V4','M16 20v-7','M22 20H2'],
    plus:['M12 5v14','M5 12h14'],
    sort:['M8 6h12','M8 12h9','M8 18h6','m4 15-3 3-3-3','M4 18V5'],
    close:['M6 6l12 12','M18 6 6 18'],
    wallet:['M4 7h16v12H4z','M4 7l3-3h11v3','M15 12h5v4h-5z'],
    card:['M3 7h18v12H3z','M3 11h18','M7 16h4'],
    tag:['M3 12V5h7l11 11-5 5z','M7.5 8.5h.01'],
    receipt:['M6 3h12v18l-3-2-3 2-3-2-3 2z','M9 8h6','M9 12h6','M9 16h4']
  } as const;
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name].map((d,index)=><path key={index} d={d}/>)}</svg>;
}

const qaAccounts:Account[]=[
  {id:'qa-main',name:'Conta Principal',type:'monetary',institution:'MEG',openingBalance:0,isActive:true},
  {id:'qa-benefit',name:'Benefício Verocard',type:'benefit',institution:'Verocard',openingBalance:0,isActive:true}
];
const qaCategories:Category[]=[
  {id:'qa-food',name:'Alimentação',group:'Alimentação',type:'expense',isActive:true},
  {id:'qa-home',name:'Moradia',group:'Moradia',type:'expense',isActive:true},
  {id:'qa-transport',name:'Transporte',group:'Transporte',type:'expense',isActive:true},
  {id:'qa-income',name:'Receita',group:'Receita',type:'income',isActive:true}
];
const qaMethods:PaymentMethod[]=[
  {id:'qa-pix',name:'Pix',type:'cash',isActive:true},
  {id:'qa-card',name:'Cartão de Crédito',type:'credit',isActive:true},
  {id:'qa-verocard',name:'Verocard',type:'benefit',isActive:true}
];
const qaEvents:FinancialEvent[]=[
  {id:'e1',description:'SUPERMERCADO',type:'expense',status:'paid',date:'2025-05-02',competence:'2025-05',amount:286.42,signedAmount:-286.42,accountId:'qa-main',categoryId:'qa-food',paymentMethodId:'qa-pix',account:qaAccounts[0],category:qaCategories[0],paymentMethod:qaMethods[0]},
  {id:'e2',description:'SALÁRIO',type:'income',status:'paid',date:'2025-05-01',competence:'2025-05',amount:7250,signedAmount:7250,accountId:'qa-main',categoryId:'qa-income',paymentMethodId:'qa-pix',account:qaAccounts[0],category:qaCategories[3],paymentMethod:qaMethods[0]},
  {id:'e3',description:'LATAM PASS 1/6',type:'expense',status:'planned',date:'2025-05-10',competence:'2025-05',amount:418.9,signedAmount:-418.9,categoryId:'qa-transport',category:qaCategories[2],paymentMethodId:'qa-card',paymentMethod:qaMethods[1]},
  {id:'e4',description:'VEROCARD ALIMENTAÇÃO',type:'expense',status:'paid',date:'2025-05-02',competence:'2025-05',amount:92.8,signedAmount:-92.8,accountId:'qa-benefit',categoryId:'qa-food',paymentMethodId:'qa-verocard',account:qaAccounts[1],category:qaCategories[0],paymentMethod:qaMethods[2]},
  {id:'e5',description:'CONDOMÍNIO',type:'expense',status:'planned',date:'2025-05-08',competence:'2025-05',amount:540,signedAmount:-540,accountId:'qa-main',categoryId:'qa-home',paymentMethodId:'qa-pix',account:qaAccounts[0],category:qaCategories[1],paymentMethod:qaMethods[0]},
  {id:'e6',description:'REEMBOLSO',type:'income',status:'paid',date:'2025-04-30',competence:'2025-05',amount:184.5,signedAmount:184.5,accountId:'qa-main',categoryId:'qa-income',paymentMethodId:'qa-pix',account:qaAccounts[0],category:qaCategories[3],paymentMethod:qaMethods[0]}
];
const qaSummary:FinanceSummary={
  month:'2025-05',availableBalance:11614.59,income:7434.5,expense:1338.12,projectedResult:6096.38,
  realizedIncome:7434.5,realizedExpense:379.22,realizedResult:7055.28,eventCount:6,pendingCount:2,pendingAmount:958.9,
  nextDue:null,topCategories:[]
};

export function EvolutionMovements({month,qaMode=false,onCreate,refreshToken=0}:Props){
  const [events,setEvents]=useState<FinancialEvent[]>(qaMode?qaEvents:[]);
  const [summary,setSummary]=useState<FinanceSummary>(qaSummary);
  const [accounts,setAccounts]=useState<Account[]>(qaMode?qaAccounts:[]);
  const [categories,setCategories]=useState<Category[]>(qaMode?qaCategories:[]);
  const [methods,setMethods]=useState<PaymentMethod[]>(qaMode?qaMethods:[]);
  const [kind,setKind]=useState<MovementKind>('all');
  const [query,setQuery]=useState('');
  const [categoryId,setCategoryId]=useState('');
  const [accountId,setAccountId]=useState('');
  const [paymentMethodId,setPaymentMethodId]=useState('');
  const [descending,setDescending]=useState(true);
  const [selected,setSelected]=useState<FinancialEvent|null>(null);
  const [busy,setBusy]=useState(!qaMode);

  useEffect(()=>{
    if(qaMode)return;
    let active=true;
    setBusy(true);
    void Promise.all([
      financeClient.listEventsForMonth(month),
      financeClient.getSummary(month),
      financeClient.listAccounts(),
      financeClient.listCategories(),
      financeClient.listPaymentMethods()
    ]).then(([page,nextSummary,nextAccounts,nextCategories,nextMethods])=>{
      if(!active)return;
      setEvents(page.items);
      setSummary(nextSummary);
      setAccounts(nextAccounts.filter(item=>item.isActive));
      setCategories(nextCategories.filter(item=>item.isActive));
      setMethods(nextMethods.filter(item=>item.isActive));
    }).finally(()=>{if(active)setBusy(false)});
    return()=>{active=false};
  },[month,qaMode,refreshToken]);

  const normalized=normalize(query.trim());
  const rows=useMemo(()=>events
    .filter(event=>{
      const signed=amountOf(event);
      const benefit=isBenefitEvent(event);
      if(kind==='income'&&signed<=0)return false;
      if(kind==='expense'&&(signed>=0||benefit))return false;
      if(kind==='benefit'&&!benefit)return false;
      if(categoryId&&String(event.categoryId||event.category?.id||'')!==categoryId)return false;
      if(accountId&&String(event.accountId||event.account?.id||'')!==accountId)return false;
      if(paymentMethodId&&String(event.paymentMethodId||event.paymentMethod?.id||'')!==paymentMethodId)return false;
      if(normalized){
        const hay=normalize([
          event.description,
          event.category?.name,
          event.account?.name,
          event.paymentMethod?.name,
          event.sourceDetails?.group,
          event.sourceDetails?.paymentMethod
        ].filter(Boolean).join(' '));
        if(!hay.includes(normalized))return false;
      }
      return true;
    })
    .sort((a,b)=>descending?String(b.date).localeCompare(String(a.date)):String(a.date).localeCompare(String(b.date))),
    [events,kind,categoryId,accountId,paymentMethodId,normalized,descending]);

  const visibleIncome=rows.filter(event=>amountOf(event)>0&&!isBenefitEvent(event)).reduce((sum,event)=>sum+amountOf(event),0);
  const visibleExpense=rows.filter(event=>amountOf(event)<0&&!isBenefitEvent(event)).reduce((sum,event)=>sum+Math.abs(amountOf(event)),0);
  const visibleBenefit=rows.filter(isBenefitEvent).reduce((sum,event)=>sum+Math.abs(amountOf(event)),0);
  const filtersActive=Boolean(query||categoryId||accountId||paymentMethodId||kind!=='all');
  const periodLabel=month.split('-').reverse().join('/');

  return <section className="evo-movements" data-evolution-screen="movements">
    <header className="evo-movements-head">
      <div>
        <small>CONTROLE FINANCEIRO</small>
        <h1>Lançamentos</h1>
        <p>Mesma lógica funcional do Mobile, com mais contexto e controle na tela grande.</p>
      </div>
      <button className="evo-movements-create" type="button" onClick={onCreate}><Icon name="plus"/><span>Novo lançamento</span></button>
    </header>

    <section className="evo-movement-kpis" aria-label="Resumo dos lançamentos">
      <article className="income"><span><Icon name="up"/></span><div><small>Entradas realizadas</small><strong>{money.format(Number(summary.realizedIncome||visibleIncome))}</strong></div><em>{periodLabel}</em></article>
      <article className="expense"><span><Icon name="down"/></span><div><small>Saídas realizadas</small><strong>{money.format(Number(summary.realizedExpense||visibleExpense))}</strong></div><em>{periodLabel}</em></article>
      <article className={Number(summary.realizedResult)>=0?'result positive':'result negative'}><span><Icon name="result"/></span><div><small>Resultado realizado</small><strong>{money.format(Number(summary.realizedResult||0))}</strong></div><em>{rows.length} visíveis</em></article>
      <article className="benefit"><span><Icon name="wallet"/></span><div><small>Movimentos benefício</small><strong>{money.format(visibleBenefit)}</strong></div><em>fora do caixa</em></article>
    </section>

    <section className="evo-movement-toolbar">
      <label className="evo-movement-search"><Icon name="search"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por descrição, categoria, conta ou forma de pagamento"/></label>
      <div className="evo-movement-kind">
        {([['all','Todos'],['income','Receitas'],['expense','Despesas'],['benefit','Benefício']] as const).map(([value,label])=><button key={value} type="button" className={kind===value?'active':''} onClick={()=>setKind(value)}>{label}</button>)}
      </div>
      <button className="evo-movement-sort" type="button" onClick={()=>setDescending(value=>!value)}><Icon name="sort"/><span>{descending?'Recentes':'Antigos'}</span></button>
    </section>

    <section className="evo-movement-body">
      <aside className="evo-movement-filters">
        <header><Icon name="filter"/><div><strong>Filtros</strong><small>{filtersActive?'Refinando a lista':'Todos os lançamentos'}</small></div></header>
        <label><span><Icon name="tag"/>Categoria</span><select value={categoryId} onChange={event=>setCategoryId(event.target.value)}><option value="">Todas</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span><Icon name="wallet"/>Conta</span><select value={accountId} onChange={event=>setAccountId(event.target.value)}><option value="">Todas</option>{accounts.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span><Icon name="card"/>Forma</span><select value={paymentMethodId} onChange={event=>setPaymentMethodId(event.target.value)}><option value="">Todas</option>{methods.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button type="button" className="clear" disabled={!filtersActive} onClick={()=>{setQuery('');setKind('all');setCategoryId('');setAccountId('');setPaymentMethodId('')}}>Limpar filtros</button>
      </aside>

      <section className="evo-movement-table-wrap">
        <header className="evo-movement-table-headline"><div><strong>{rows.length.toLocaleString('pt-BR')} lançamento{rows.length===1?'':'s'}</strong><small>{busy?'Atualizando dados…':periodLabel+' · '+(descending?'mais recentes primeiro':'mais antigos primeiro')}</small></div></header>
        <div className="evo-movement-table" role="table" aria-label="Lançamentos">
          <div className="evo-movement-row header" role="row">
            <span>Data</span><span>Descrição</span><span>Categoria</span><span>Conta</span><span>Forma</span><span>Status</span><span>Valor</span>
          </div>
          <div className="evo-movement-scroll" data-meg-scroll-region="true">
            {rows.map(event=>{
              const signed=amountOf(event);
              const benefit=isBenefitEvent(event);
              return <button type="button" className={'evo-movement-row data '+(signed>=0?'income':'expense')+(benefit?' benefit':'')} key={event.id} onClick={()=>setSelected(event)}>
                <time>{dateFmt.format(new Date(event.date+'T12:00:00'))}</time>
                <span className="desc"><i><Icon name={benefit?'wallet':signed>=0?'up':'receipt'}/></i><b>{event.description}</b></span>
                <span>{event.category?.name||event.sourceDetails?.group||'—'}</span>
                <span>{event.account?.name||'—'}</span>
                <span className="payment">{event.paymentMethod?.name||event.sourceDetails?.paymentMethod||'—'}</span>
                <span><em className={'status '+normalize(statusLabel(event.status))}>{statusLabel(event.status)}</em></span>
                <strong>{signed>0?'+ ':signed<0?'− ':''}{money.format(Math.abs(signed))}</strong>
              </button>;
            })}
            {!rows.length&&<div className="evo-movement-empty">Nenhum lançamento encontrado com esses filtros.</div>}
          </div>
        </div>
      </section>
    </section>

    {selected&&<div className="evo-movement-detail-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}>
      <aside className="evo-movement-detail" role="dialog" aria-modal="true" aria-label="Detalhes do lançamento">
        <header><div><small>DETALHE DO LANÇAMENTO</small><h2>{selected.description}</h2></div><button type="button" onClick={()=>setSelected(null)} aria-label="Fechar"><Icon name="close"/></button></header>
        <section className="amount"><span>{amountOf(selected)>=0?'Entrada':'Saída'}</span><strong>{money.format(Math.abs(amountOf(selected)))}</strong><em className={amountOf(selected)>=0?'positive':'negative'}>{statusLabel(selected.status)}</em></section>
        <dl>
          <div><dt>Data</dt><dd>{dateFmt.format(new Date(selected.date+'T12:00:00'))}</dd></div>
          <div><dt>Categoria</dt><dd>{selected.category?.name||selected.sourceDetails?.group||'—'}</dd></div>
          <div><dt>Conta</dt><dd>{selected.account?.name||'—'}</dd></div>
          <div><dt>Forma</dt><dd>{selected.paymentMethod?.name||selected.sourceDetails?.paymentMethod||'—'}</dd></div>
          <div><dt>Competência</dt><dd>{selected.competence||periodLabel}</dd></div>
          <div><dt>Observação</dt><dd>{selected.notes||'Sem observações'}</dd></div>
        </dl>
        <footer><button type="button" onClick={()=>setSelected(null)}>Fechar</button></footer>
      </aside>
    </div>}
  </section>;
}
