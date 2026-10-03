import {useEffect,useMemo,useState} from 'react';
import {financeClient,type Account,type FinancialEvent,type PaymentMethod} from '../../app/finance-client';
import {cardsClient,type CreditCard} from '../../app/cards-client';
import {payablesClient,type Payable} from '../../app/payables-client';
import {EvolutionFinancialIcon,type EvolutionFinancialIconName} from '../components/EvolutionFinancialIcon';
import '../styles/payables.css';

type Filter='all'|'due'|'overdue'|'paid';
type PendingSource='payable'|'event'|'card';
type PendingRow={
  id:string;
  sourceId:string;
  source:PendingSource;
  description:string;
  dueDate:string;
  amount:number;
  category:string;
  status:'open'|'paid';
  accountId?:string|null;
  paymentMethodId?:string|null;
  statementMonth?:string;
};
type Props={month:string;qaMode?:boolean;refreshToken?:number;onChanged?:()=>void};

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const dateFmt=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
const normalize=(value:unknown)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const todayIso=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const operationId=()=>globalThis.crypto?.randomUUID?.()||('evo-pay-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const amountOf=(value:unknown)=>Math.abs(Number(value||0));
const isBenefit=(value:unknown)=>/benef|verocard|aliment|refeic/.test(normalize(value));
const isCardLike=(value:unknown)=>/cartao|credito|card/.test(normalize(value));
const isMonetaryAccount=(account:Account)=>account.isActive&&!isBenefit(account.name+' '+account.type+' '+(account.institution||''));
const isSettlementMethod=(method:PaymentMethod)=>method.isActive&&!isBenefit(method.name+' '+(method.type||''));
const dayDiff=(iso:string)=>{
  const a=new Date(todayIso()+'T12:00:00Z').getTime();
  const b=new Date(iso.slice(0,10)+'T12:00:00Z').getTime();
  return Math.round((b-a)/86400000);
};
const fmtDate=(iso:string)=>dateFmt.format(new Date(iso.slice(0,10)+'T12:00:00'));

function iconFor(row:PendingRow):EvolutionFinancialIconName{
  const key=normalize(row.description+' '+row.category);
  if(row.source==='card')return 'card';
  if(/energia|luz|cpfl|neoenergia/.test(key))return 'bolt';
  if(/internet|vivo|claro|wifi/.test(key))return 'wifi';
  if(/aluguel|condominio|moradia|iptu/.test(key))return 'house';
  if(/academia|saude|farmacia|medical/.test(key))return 'heart-pulse';
  if(/telefone|celular|comunicacao/.test(key))return 'phone';
  if(/seguro|carro|auto|veiculo/.test(key))return 'car';
  if(/spotify|netflix|stream/.test(key))return 'music';
  return 'receipt';
}

function categoryTone(value:string){
  const key=normalize(value);
  if(/cartao|credito/.test(key))return 'blue';
  if(/casa|moradia|aluguel/.test(key))return 'gray';
  if(/saude|farmacia/.test(key))return 'amber';
  if(/comunic/.test(key))return 'violet';
  if(/transporte|carro/.test(key))return 'cyan';
  if(/entreten|stream/.test(key))return 'purple';
  return 'cyan';
}

function payableRows(items:Payable[]):PendingRow[]{
  return items.map(item=>({
    id:'payable:'+item.id,
    sourceId:item.id,
    source:'payable',
    description:item.description,
    dueDate:String(item.dueDate).slice(0,10),
    amount:amountOf(item.openAmount||item.totalAmount),
    category:item.category?.group||item.category?.name||'Conta',
    status:amountOf(item.openAmount)>0&&!['paid','cancelled'].includes(normalize(item.status))?'open':'paid'
  }));
}

function eventRows(events:FinancialEvent[],official:PendingRow[]):PendingRow[]{
  const signatures=new Set(official.map(item=>normalize(item.description)+'|'+item.dueDate+'|'+item.amount.toFixed(2)));
  return events
    .filter(event=>event.type==='expense'&&event.status==='planned')
    .filter(event=>!isBenefit([event.account?.name,event.account?.type,event.paymentMethod?.name,event.description].join(' ')))
    .map(event=>{
      const raw=Math.abs(Number(event.signedAmount||event.amount||0));
      return {
        id:'event:'+event.id,
        sourceId:event.id,
        source:'event' as const,
        description:event.description,
        dueDate:String(event.date).slice(0,10),
        amount:raw,
        category:event.category?.group||event.category?.name||event.sourceDetails?.group||'Pendente',
        status:'open' as const,
        accountId:event.accountId,
        paymentMethodId:event.paymentMethodId
      };
    })
    .filter(item=>!signatures.has(normalize(item.description)+'|'+item.dueDate+'|'+item.amount.toFixed(2)));
}

function cardRows(cards:CreditCard[],month:string):PendingRow[]{
  return cards.flatMap(card=>{
    const statement=card.statement;
    const amount=amountOf(card.payableStatementAmount??statement?.payableAmount??card.statementAmount);
    if(amount<=0)return [];
    return [{
      id:'card:'+card.id+':'+month,
      sourceId:card.id,
      source:'card' as const,
      description:'Fatura '+card.name,
      dueDate:String(statement?.dueDate||month+'-'+String(card.dueDay||1).padStart(2,'0')).slice(0,10),
      amount,
      category:'Cartão de crédito',
      status:'open' as const,
      statementMonth:month
    }];
  });
}

export function EvolutionPayables({month,qaMode=false,refreshToken=0,onChanged}:Props){
  const [rows,setRows]=useState<PendingRow[]>([]);
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [methods,setMethods]=useState<PaymentMethod[]>([]);
  const [filter,setFilter]=useState<Filter>('all');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [busy,setBusy]=useState(!qaMode);
  const [settlementOpen,setSettlementOpen]=useState(false);
  const [paidAt,setPaidAt]=useState(todayIso());
  const [accountId,setAccountId]=useState('');
  const [paymentMethodId,setPaymentMethodId]=useState('');
  const [balance,setBalance]=useState<{status:'idle'|'loading'|'ready'|'error';available:number}>({status:'idle',available:0});
  const [message,setMessage]=useState('');
  const [paying,setPaying]=useState(false);

  async function load(){
    if(qaMode){
      const demo:PendingRow[]=[
        {id:'p1',sourceId:'p1',source:'payable',description:'Netflix',dueDate:'2026-09-30',amount:55.90,category:'Entretenimento',status:'open'},
        {id:'p2',sourceId:'p2',source:'payable',description:'Neoenergia',dueDate:'2026-10-01',amount:214.85,category:'Casa',status:'open'},
        {id:'p3',sourceId:'p3',source:'payable',description:'Claro Internet',dueDate:'2026-10-02',amount:129.90,category:'Casa',status:'open'},
        {id:'p4',sourceId:'p4',source:'card',description:'Fatura Nubank',dueDate:'2026-10-03',amount:532.18,category:'Cartão de crédito',status:'open',statementMonth:'2026-10'},
        {id:'p5',sourceId:'p5',source:'payable',description:'Aluguel',dueDate:'2026-10-05',amount:1250,category:'Moradia',status:'open'},
        {id:'p6',sourceId:'p6',source:'payable',description:'Spotify',dueDate:'2026-10-06',amount:24.90,category:'Entretenimento',status:'open'},
        {id:'p7',sourceId:'p7',source:'payable',description:'Academia Smart Fit',dueDate:'2026-10-07',amount:99.90,category:'Saúde',status:'open'},
        {id:'p8',sourceId:'p8',source:'payable',description:'Condomínio',dueDate:'2026-10-10',amount:410.50,category:'Moradia',status:'open'},
        {id:'p9',sourceId:'p9',source:'payable',description:'Vivo Pós',dueDate:'2026-10-12',amount:89.90,category:'Comunicação',status:'open'},
        {id:'p10',sourceId:'p10',source:'payable',description:'IPTU',dueDate:'2026-10-15',amount:680,category:'Impostos',status:'open'}
      ];
      setRows(demo);
      setAccounts([{id:'qa-main',name:'Conta corrente principal',type:'checking',institution:'MEG Finanças',openingBalance:3049.15,isActive:true}]);
      setMethods([{id:'qa-pix',name:'PIX',type:'cash',isActive:true}]);
      setAccountId('qa-main');setPaymentMethodId('qa-pix');setBusy(false);
      return;
    }
    setBusy(true);
    try{
      const [payables,eventPage,cards,nextAccounts,nextMethods]=await Promise.all([
        payablesClient.list(month),
        financeClient.listEventsForMonth(month),
        cardsClient.list(month),
        financeClient.listAccounts(),
        financeClient.listPaymentMethods()
      ]);
      const official=payableRows(payables);
      const merged=[...cardRows(cards,month),...official,...eventRows(eventPage.items,official)];
      setRows(merged.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.description.localeCompare(b.description,'pt-BR')));
      const monetary=nextAccounts.filter(isMonetaryAccount);
      const settlement=nextMethods.filter(isSettlementMethod);
      setAccounts(monetary);
      setMethods(settlement);
      setAccountId(current=>current&&monetary.some(item=>item.id===current)?current:(monetary.find(item=>/principal/.test(normalize(item.name)))?.id||monetary[0]?.id||''));
      setPaymentMethodId(current=>current&&settlement.some(item=>item.id===current)?current:(settlement.find(item=>/(^|\s)pix($|\s)/.test(normalize(item.name)))?.id||settlement[0]?.id||''));
    }finally{
      setBusy(false);
    }
  }

  useEffect(()=>{void load()},[month,qaMode,refreshToken]);

  const openRows=rows.filter(item=>item.status==='open');
  const paidRows=rows.filter(item=>item.status==='paid');
  const overdueRows=openRows.filter(item=>dayDiff(item.dueDate)<0);
  const dueRows=openRows.filter(item=>dayDiff(item.dueDate)>=0&&dayDiff(item.dueDate)<=7);
  const upcomingRows=openRows.filter(item=>dayDiff(item.dueDate)>7);
  const counts={all:openRows.length,due:dueRows.length,overdue:overdueRows.length,paid:paidRows.length};

  const visible=useMemo(()=>{
    const source=filter==='paid'?paidRows:filter==='overdue'?overdueRows:filter==='due'?dueRows:openRows;
    const needle=normalize(query.trim());
    return source.filter(item=>!needle||normalize(item.description+' '+item.category).includes(needle));
  },[rows,filter,query]);

  const groups=useMemo(()=>{
    if(filter==='paid')return [{key:'paid',label:'Pagos',tone:'paid',items:visible}];
    const source=[
      {key:'overdue',label:'Vencidos',tone:'overdue',items:visible.filter(item=>dayDiff(item.dueDate)<0)},
      {key:'due',label:'Vencendo esta semana',tone:'due',items:visible.filter(item=>dayDiff(item.dueDate)>=0&&dayDiff(item.dueDate)<=7)},
      {key:'upcoming',label:'Próximos',tone:'upcoming',items:visible.filter(item=>dayDiff(item.dueDate)>7)}
    ];
    return source.filter(group=>group.items.length);
  },[visible,filter]);

  const selectedRows=openRows.filter(item=>selected.has(item.id));
  const selectedTotal=selectedRows.reduce((sum,item)=>sum+item.amount,0);
  const missing=balance.status==='ready'?Math.max(0,selectedTotal-balance.available):0;
  const after=balance.status==='ready'?balance.available-selectedTotal:0;

  useEffect(()=>{
    if(!settlementOpen||!accountId){setBalance({status:'idle',available:0});return}
    if(qaMode){setBalance({status:'ready',available:3049.15});return}
    let active=true;
    setBalance(current=>({status:'loading',available:current.available}));
    void financeClient.getMonetaryBalance(accountId,paidAt)
      .then(value=>{if(active)setBalance({status:'ready',available:Number(value.available||0)})})
      .catch(()=>{if(active)setBalance({status:'error',available:0})});
    return()=>{active=false};
  },[settlementOpen,accountId,paidAt,qaMode]);

  function toggle(id:string){
    setSelected(current=>{
      const next=new Set(current);
      if(next.has(id))next.delete(id);else next.add(id);
      return next;
    });
  }

  async function confirmPayment(){
    if(!selectedRows.length||!accountId||!paymentMethodId||balance.status!=='ready'||missing>0||paying)return;
    setPaying(true);setMessage('');
    try{
      if(qaMode){
        setRows(current=>current.map(item=>selected.has(item.id)?{...item,status:'paid' as const}:item));
      }else{
        for(const item of selectedRows){
          const op=operationId();
          if(item.source==='payable'){
            await payablesClient.pay(item.sourceId,{amount:item.amount,paidAt,accountId,paymentMethodId,operationId:op});
          }else if(item.source==='event'){
            await financeClient.settleEvent(item.sourceId,{paidAt,accountId,paymentMethodId,operationId:op});
          }else{
            await cardsClient.payStatement(item.sourceId,item.statementMonth||month,{accountId,paymentMethodId,paidAt,operationId:op});
          }
        }
        await load();
      }
      setSelected(new Set());setSettlementOpen(false);onChanged?.();
    }catch(error){
      setMessage(error instanceof Error?error.message:'Não foi possível concluir a baixa.');
    }finally{
      setPaying(false);
    }
  }

  const selectedAccount=accounts.find(item=>item.id===accountId);
  const selectedMethod=methods.find(item=>item.id===paymentMethodId);

  return <section className="evo-payables" data-evolution-screen="payables">
    <header className="evo-payables-hero">
      <span className="hero-icon"><EvolutionFinancialIcon name="receipt" size={32}/></span>
      <div><h1>Contas a pagar</h1><p>Organize e quite seus compromissos em dia.</p></div>
      <nav aria-label="Filtros rápidos">
        <button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Todos <b>{counts.all}</b></button>
        <button className={filter==='due'?'active':''} onClick={()=>setFilter('due')}>Vencendo <b>{counts.due}</b></button>
        <button className={filter==='overdue'?'active':''} onClick={()=>setFilter('overdue')}>Vencidos <b>{counts.overdue}</b></button>
        <button className={filter==='paid'?'active':''} onClick={()=>setFilter('paid')}>Pagos <b>{counts.paid}</b></button>
      </nav>
      <label className="evo-payables-search"><EvolutionFinancialIcon name="search" size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar pendência"/></label>
    </header>

    <div className="evo-payables-layout">
      <section className="evo-payables-list-panel">
        <header>
          <label><input type="checkbox" checked={selectedRows.length>0&&selectedRows.length===openRows.length} onChange={event=>setSelected(event.target.checked?new Set(openRows.map(item=>item.id)):new Set())}/><span/>Selecionar todos ({visible.length} de {openRows.length})</label>
          <div><button type="button">Ordenar por: Data de vencimento⌄</button><button type="button">Agrupar por: Vencimento⌄</button></div>
        </header>
        <div className="evo-payables-groups" data-meg-scroll-region="true">
          {groups.map(group=><section className={'evo-payables-group '+group.tone} key={group.key}>
            <header><div><EvolutionFinancialIcon name={group.tone==='overdue'?'alert':group.tone==='due'?'clock':group.tone==='paid'?'check-line':'calendar'} size={21}/><strong>{group.label}</strong><span>({group.items.length})</span></div><b>{money.format(group.items.reduce((sum,item)=>sum+item.amount,0))}</b></header>
            {group.items.map(item=>{
              const diff=dayDiff(item.dueDate);
              const selectedNow=selected.has(item.id);
              return <article className={selectedNow?'selected':''} key={item.id}>
                <button className="select" type="button" disabled={item.status==='paid'} onClick={()=>toggle(item.id)} aria-label={selectedNow?'Remover seleção':'Selecionar'}><span className={selectedNow?'checked':''}>{selectedNow&&<EvolutionFinancialIcon name="check-line" size={16}/>}</span></button>
                <span className={'item-icon '+categoryTone(item.category)}><EvolutionFinancialIcon name={iconFor(item)} size={21}/></span>
                <div className="description"><strong>{item.description}</strong><small>{item.source==='card'?'Fatura do cartão':item.category}</small></div>
                <em className={'category '+categoryTone(item.category)}>{item.category}</em>
                <div className={'due '+(diff<0?'late':diff<=1?'soon':'')}>
                  <EvolutionFinancialIcon name={diff<0?'alert':'calendar'} size={17}/>
                  <span><strong>{fmtDate(item.dueDate)}</strong><small>{item.status==='paid'?'Pago':diff<0?Math.abs(diff)+' dias em atraso':diff===0?'Hoje':diff===1?'Amanhã':'Em '+diff+' dias'}</small></span>
                </div>
                <b className="amount">{money.format(item.amount)}</b>
                <button className="more" type="button">⋮</button>
              </article>;
            })}
          </section>)}
          {!groups.length&&!busy&&<div className="evo-payables-empty">Nenhuma pendência encontrada com os filtros atuais.</div>}
          {busy&&<div className="evo-payables-empty">Atualizando compromissos…</div>}
        </div>
      </section>

      <aside className="evo-payables-side">
        <section className="evo-payables-selection">
          <header><EvolutionFinancialIcon name="check" size={25}/><h2>Resumo de seleção</h2></header>
          <p>{selectedRows.length} {selectedRows.length===1?'conta selecionada':'contas selecionadas'}</p>
          <small>Total selecionado</small>
          <strong>{money.format(selectedTotal)}</strong>
          <div className="selected-list">
            {selectedRows.slice(0,5).map(item=><div key={item.id}><span><EvolutionFinancialIcon name={iconFor(item)} size={18}/>{item.description}</span><b>{money.format(item.amount)}</b><button type="button" onClick={()=>toggle(item.id)}>⊖</button></div>)}
            {!selectedRows.length&&<em>Selecione contas para preparar a baixa.</em>}
          </div>
          <button className="pay" type="button" disabled={!selectedRows.length} onClick={()=>{setMessage('');setSettlementOpen(true)}}><EvolutionFinancialIcon name="card" size={21}/>Pagar selecionados <b>›</b></button>
          <div className="payment-source">
            <span>Conta para baixa</span>
            <select value={accountId} onChange={event=>setAccountId(event.target.value)}>{accounts.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <span>Forma de pagamento</span>
            <select value={paymentMethodId} onChange={event=>setPaymentMethodId(event.target.value)}>{methods.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>
          </div>
        </section>

        <section className="evo-payables-overview">
          <header><EvolutionFinancialIcon name="chart" size={23}/><h2>Visão geral</h2></header>
          <div><span>Total em aberto</span><b>{counts.all}</b><strong>{money.format(openRows.reduce((sum,item)=>sum+item.amount,0))}</strong></div>
          <div className="red"><span>Vencidas</span><b>{counts.overdue}</b><strong>{money.format(overdueRows.reduce((sum,item)=>sum+item.amount,0))}</strong></div>
          <div className="amber"><span>Vencendo esta semana</span><b>{counts.due}</b><strong>{money.format(dueRows.reduce((sum,item)=>sum+item.amount,0))}</strong></div>
          <div className="blue"><span>Próximas</span><b>{upcomingRows.length}</b><strong>{money.format(upcomingRows.reduce((sum,item)=>sum+item.amount,0))}</strong></div>
        </section>
      </aside>
    </div>

    {settlementOpen&&<div className="evo-settlement-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!paying)setSettlementOpen(false)}}>
      <section className="evo-settlement-modal" role="dialog" aria-modal="true" aria-label="Confirmar pagamento">
        <header><span><EvolutionFinancialIcon name="wallet" size={28}/></span><div><h2>Confirmar pagamento</h2><p>Você está prestes a realizar a baixa das pendências selecionadas.</p></div><button type="button" onClick={()=>!paying&&setSettlementOpen(false)}><EvolutionFinancialIcon name="x" size={23}/></button></header>
        <section className="evo-settlement-items">
          <div className="headline"><strong>Pendências selecionadas ({selectedRows.length})</strong><span><small>Total a pagar</small><b>{money.format(selectedTotal)}</b></span></div>
          <div className="items" data-meg-scroll-region="true">{selectedRows.map(item=><article key={item.id}><span className={'item-icon '+categoryTone(item.category)}><EvolutionFinancialIcon name={iconFor(item)} size={21}/></span><div><strong>{item.description}</strong><small>{item.category}</small></div><span><small>Vencimento</small><b>{fmtDate(item.dueDate)}</b></span><strong>{money.format(item.amount)}</strong></article>)}</div>
        </section>
        <section className="evo-settlement-controls">
          <label><span>Data da baixa</span><div><EvolutionFinancialIcon name="calendar" size={19}/><input type="date" value={paidAt} onChange={event=>setPaidAt(event.target.value)}/></div></label>
          <label><span>Conta</span><select value={accountId} onChange={event=>setAccountId(event.target.value)}>{accounts.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <article className={'balance '+(missing>0?'insufficient':'')}>
            <span><EvolutionFinancialIcon name="banknote" size={25}/></span>
            <div><small>{missing>0?'Saldo insuficiente':'Saldo após pagamento'}</small><strong>{balance.status==='ready'?money.format(Math.max(0,after)):'Validando…'}</strong><p>{balance.status==='ready'?(missing>0?'Faltam '+money.format(missing):'Saldo atual: '+money.format(balance.available)):balance.status==='error'?'Não foi possível validar o saldo.':'Consultando saldo da conta…'}</p></div>
          </article>
        </section>
        {message&&<div className="evo-settlement-message">{message}</div>}
        <footer><button type="button" className="cancel" onClick={()=>!paying&&setSettlementOpen(false)}>Cancelar</button><button type="button" className="confirm" disabled={paying||balance.status!=='ready'||missing>0||!accountId||!paymentMethodId} onClick={()=>void confirmPayment()}><EvolutionFinancialIcon name="check-line" size={21}/>{paying?'Processando…':'Confirmar pagamento'}</button></footer>
        <small className="evo-settlement-source">{selectedAccount?.name||'Selecione a conta'} · {selectedMethod?.name||'Selecione a forma'}</small>
      </section>
    </div>}
  </section>;
}
