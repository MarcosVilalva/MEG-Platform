import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import {cardsClient,type CreditCard,type CardPurchase,type CanonicalCardStatementLine} from '../../app/cards-client';
import {financeClient,type Account,type PaymentMethod} from '../../app/finance-client';
import {EvolutionFinancialIcon,type EvolutionFinancialIconName} from '../components/EvolutionFinancialIcon';
import '../styles/cards.css';

type Props={month:string;qaMode?:boolean;refreshToken?:number;onChanged?:()=>void};
type CardView='overview'|'center';
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const dateFmt=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
const normalize=(value:unknown)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const todayIso=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const operationId=()=>globalThis.crypto?.randomUUID?.()||('evo-card-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const isBenefit=(value:unknown)=>/benef|verocard|aliment/.test(normalize(value));
const isMonetary=(account:Account)=>account.isActive&&!isBenefit(account.name+' '+account.type+' '+(account.institution||''));
const isSettlementMethod=(method:PaymentMethod)=>method.isActive&&!isBenefit(method.name+' '+(method.type||''));
const amount=(value:unknown)=>Number(value||0);
const fmtDate=(iso:string)=>dateFmt.format(new Date(String(iso).slice(0,10)+'T12:00:00'));

function artwork(card:CreditCard,index=0){
  const key=normalize(card.name+' '+(card.issuer||'')+' '+(card.brand||''));
  if(/latam/.test(key))return './assets/cards/latam-user-model-v61.svg';
  if(/mercado|meli/.test(key))return './assets/cards/mercado-pago-visa-v662.svg';
  if(/riachuelo|midway/.test(key))return './assets/cards/riachuelo-mastercard-visual.svg';
  if(/nubank|nu bank/.test(key))return './assets/cards/nubank-visual.svg';
  if(/azul/.test(key))return './assets/cards/azul-itau-platinum-v659.svg';
  return ['./assets/cards/latam-user-model-v61.svg','./assets/cards/nubank-visual.svg','./assets/cards/riachuelo-mastercard-visual.svg','./assets/cards/azul-itau-platinum-v659.svg'][index%4];
}
function iconFor(description:string):EvolutionFinancialIconName{
  const key=normalize(description);
  if(/ifood|restaurante|aliment/.test(key))return 'food';
  if(/uber|posto|gasolina|combust/.test(key))return /posto|gasolina|combust/.test(key)?'fuel':'car';
  if(/netflix|spotify|steam|game/.test(key))return 'gamepad';
  if(/passagem|latam|azul|aerea/.test(key))return 'plane';
  if(/mercado|americanas|loja|zara/.test(key))return 'shopping-bag';
  return 'receipt';
}
function categoryOf(description:string){
  const key=normalize(description);
  if(/ifood|restaurante|mercado/.test(key))return 'Alimentação';
  if(/uber|posto|gasolina|combust/.test(key))return 'Transporte';
  if(/netflix|spotify|steam|game/.test(key))return 'Entretenimento';
  if(/passagem|latam|azul|aerea/.test(key))return 'Viagem';
  return 'Compras';
}
function dueDate(card:CreditCard,month:string){
  if(card.statement?.dueDate)return card.statement.dueDate.slice(0,10);
  const [y,m]=month.split('-').map(Number);
  const d=Math.max(1,Math.min(new Date(Date.UTC(y,m,0)).getUTCDate(),Number(card.dueDay||1)));
  return month+'-'+String(d).padStart(2,'0');
}
function statementAmount(card:CreditCard){
  return Math.max(0,amount(card.payableStatementAmount??card.statement?.payableAmount??card.statementAmount));
}
function percentUsed(card:CreditCard){
  const limit=Math.max(1,amount(card.creditLimit));
  return Math.max(0,Math.min(100,Math.round(amount(card.usedLimit)/limit*100)));
}
function bestDay(card:CreditCard){return Math.max(1,Math.min(31,(Number(card.closingDay||1)%31)+1))}
function purchaseRows(card:CreditCard){
  const rows=card.purchases.map(p=>({id:p.id,description:p.description,date:p.purchaseDate,amount:Math.abs(amount(p.totalAmount)),category:p.category?.name||categoryOf(p.description),installments:p.installments}));
  if(rows.length)return rows.sort((a,b)=>b.date.localeCompare(a.date));
  return (card.statement?.lines||[]).map((line:CanonicalCardStatementLine)=>({id:line.id,description:line.description,date:line.purchaseDate,amount:Math.abs(line.effect),category:categoryOf(line.description),installments:line.installmentQty})).sort((a,b)=>b.date.localeCompare(a.date));
}

const qaCards:CreditCard[]=[
  {id:'qa-meg',name:'MEG Visa Infinite',issuer:'MEG Finanças',brand:'VISA Infinite',lastFour:'1234',creditLimit:20000,closingDay:11,dueDay:12,isActive:true,usedLimit:7000,availableLimit:13000,statementAmount:2317.99,payableStatementAmount:2317.99,purchases:[
    {id:'qa1',description:'iFood',totalAmount:68.90,purchaseDate:'2026-10-08',installments:1,status:'open',entries:[]},
    {id:'qa2',description:'Uber',totalAmount:24.50,purchaseDate:'2026-10-07',installments:1,status:'open',entries:[]},
    {id:'qa3',description:'Netflix',totalAmount:55.90,purchaseDate:'2026-10-05',installments:1,status:'open',entries:[]},
    {id:'qa4',description:'Americanas',totalAmount:149.90,purchaseDate:'2026-10-03',installments:1,status:'open',entries:[]},
    {id:'qa5',description:'Posto Ipiranga',totalAmount:180,purchaseDate:'2026-10-02',installments:1,status:'open',entries:[]}
  ]},
  {id:'qa-nu',name:'Nubank',issuer:'Nubank',brand:'Mastercard',lastFour:'5678',creditLimit:10000,closingDay:4,dueDay:10,isActive:true,usedLimit:2800,availableLimit:7200,statementAmount:532.18,payableStatementAmount:532.18,purchases:[]},
  {id:'qa-c6',name:'C6 Bank',issuer:'C6 Bank',brand:'Mastercard',lastFour:'9012',creditLimit:8000,closingDay:6,dueDay:12,isActive:true,usedLimit:1900,availableLimit:6100,statementAmount:423.50,payableStatementAmount:423.50,purchases:[]},
  {id:'qa-amex',name:'American Express',issuer:'American Express',brand:'Amex',lastFour:'3456',creditLimit:14000,closingDay:8,dueDay:15,isActive:true,usedLimit:3600,availableLimit:10400,statementAmount:312.45,payableStatementAmount:312.45,purchases:[]}
];

export function EvolutionCards({month,qaMode=false,refreshToken=0,onChanged}:Props){
  const [cards,setCards]=useState<CreditCard[]>(qaMode?qaCards:[]);
  const [selectedId,setSelectedId]=useState(qaMode?qaCards[0].id:'');
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [methods,setMethods]=useState<PaymentMethod[]>([]);
  const [view,setView]=useState<CardView>('overview');
  const [busy,setBusy]=useState(!qaMode);
  const [payOpen,setPayOpen]=useState(false);
  const [accountId,setAccountId]=useState('');
  const [paymentMethodId,setPaymentMethodId]=useState('');
  const [paidAt,setPaidAt]=useState(todayIso());
  const [balance,setBalance]=useState<{status:'idle'|'loading'|'ready'|'error';available:number}>({status:'idle',available:0});
  const [paying,setPaying]=useState(false);
  const [message,setMessage]=useState('');

  async function load(){
    if(qaMode){
      setCards(qaCards);
      setSelectedId(current=>current||qaCards[0].id);
      setAccounts([{id:'qa-main',name:'Conta corrente principal',type:'checking',institution:'MEG Finanças',openingBalance:3049.15,isActive:true}]);
      setMethods([{id:'qa-pix',name:'PIX',type:'cash',isActive:true}]);
      setAccountId('qa-main');setPaymentMethodId('qa-pix');setBusy(false);return;
    }
    setBusy(true);
    try{
      const [nextCards,nextAccounts,nextMethods]=await Promise.all([cardsClient.list(month),financeClient.listAccounts(),financeClient.listPaymentMethods()]);
      const active=nextCards.filter(card=>card.isActive!==false);
      setCards(active);
      setSelectedId(current=>current&&active.some(card=>card.id===current)?current:(active[0]?.id||''));
      const monetary=nextAccounts.filter(isMonetary);
      const settlement=nextMethods.filter(isSettlementMethod);
      setAccounts(monetary);setMethods(settlement);
      setAccountId(current=>current&&monetary.some(item=>item.id===current)?current:(monetary.find(item=>/principal/.test(normalize(item.name)))?.id||monetary[0]?.id||''));
      setPaymentMethodId(current=>current&&settlement.some(item=>item.id===current)?current:(settlement.find(item=>/(^|\s)pix($|\s)/.test(normalize(item.name)))?.id||settlement[0]?.id||''));
    }finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[month,qaMode,refreshToken]);

  const selected=cards.find(card=>card.id===selectedId)||cards[0];
  const purchases=selected?purchaseRows(selected):[];
  const invoice=selected?statementAmount(selected):0;
  const used=selected?amount(selected.usedLimit):0;
  const limit=selected?amount(selected.creditLimit):0;
  const available=selected?amount(selected.availableLimit):0;
  const usedPct=selected?percentUsed(selected):0;
  const selectedAccount=accounts.find(item=>item.id===accountId);

  useEffect(()=>{
    if(!payOpen||!accountId){setBalance({status:'idle',available:0});return}
    if(qaMode){setBalance({status:'ready',available:3049.15});return}
    let active=true;
    setBalance(current=>({status:'loading',available:current.available}));
    void financeClient.getMonetaryBalance(accountId,paidAt).then(value=>{if(active)setBalance({status:'ready',available:Number(value.available||0)})}).catch(()=>{if(active)setBalance({status:'error',available:0})});
    return()=>{active=false};
  },[payOpen,accountId,paidAt,qaMode]);

  const missing=balance.status==='ready'?Math.max(0,invoice-balance.available):0;
  const after=balance.status==='ready'?balance.available-invoice:0;

  async function payInvoice(){
    if(!selected||invoice<=0||!accountId||balance.status!=='ready'||missing>0||paying)return;
    setPaying(true);setMessage('');
    try{
      if(!qaMode)await cardsClient.payStatement(selected.id,month,{accountId,paymentMethodId:paymentMethodId||undefined,paidAt,operationId:operationId()});
      setPayOpen(false);
      if(!qaMode)await load();
      onChanged?.();
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível pagar a fatura.')}
    finally{setPaying(false)}
  }

  if(!selected)return <section className="evo-cards empty"><p>{busy?'Carregando cartões…':'Nenhum cartão ativo encontrado.'}</p></section>;

  if(view==='center'&&selected)return <section className="evo-card-center" data-evolution-screen="card-center">
    <header className="evo-card-center-hero">
      <div><h1>Central do <strong>cartão</strong></h1><p>Gerencie faturas, limites e parcelas do seu cartão principal.</p></div>
      <button type="button" onClick={()=>setView('overview')}>Voltar aos cartões</button>
    </header>
    <div className="evo-card-center-layout">
      <section className="evo-card-center-main">
        <article className="evo-card-center-summary">
          <img src={artwork(selected,cards.indexOf(selected))} alt={selected.name}/>
          <div className="identity"><h2>{selected.name}</h2><span>Cartão principal</span><dl><div><dt>Bandeira</dt><dd>{selected.brand||'—'}</dd></div><div><dt>Banco</dt><dd>{selected.issuer||'—'}</dd></div><div><dt>Final</dt><dd>{selected.lastFour||'••••'}</dd></div></dl></div>
          <div className="metrics">
            <div><span><EvolutionFinancialIcon name="card" size={20}/></span><small>Limite total</small><strong>{money.format(limit)}</strong><i><em style={{width:usedPct+'%'}}/></i><b>Utilizado {usedPct}%</b></div>
            <div><span><EvolutionFinancialIcon name="check" size={20}/></span><small>Disponível</small><strong>{money.format(available)}</strong><i><em style={{width:Math.max(0,100-usedPct)+'%'}}/></i><b>{100-usedPct}% do limite</b></div>
            <div className="invoice"><span><EvolutionFinancialIcon name="receipt" size={20}/></span><small>Fatura atual</small><strong>{money.format(invoice)}</strong><b>Vence em {fmtDate(dueDate(selected,month))}</b></div>
            <div><span><EvolutionFinancialIcon name="calendar" size={20}/></span><small>Melhor dia de compra</small><strong>Dia {bestDay(selected)}</strong><b>Com base no fechamento</b></div>
          </div>
        </article>
        <article className="evo-card-center-table">
          <header><nav><button className="active">Movimentações</button><button>Fatura</button><button>Parcelas</button><button>Limites</button><button>Ajustes</button></nav><button>Todos os lançamentos⌄</button></header>
          <div className="table head"><span/> <span>Data</span><span>Descrição</span><span>Categoria</span><span>Estabelecimento</span><span>Valor</span><span/></div>
          <div className="rows" data-meg-scroll-region="true">
            {purchases.slice(0,18).map(row=><div className="table row" key={row.id}><input type="checkbox"/><time>{fmtDate(row.date)}</time><span className="description"><EvolutionFinancialIcon name={iconFor(row.description)} size={18}/><b>{row.description}</b></span><em>{row.category}</em><span>{row.description}</span><strong>- {money.format(row.amount)}</strong><b>⋮</b></div>)}
          </div>
          <footer><span>1–{Math.min(12,purchases.length)} de {purchases.length} movimentações</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div><span>Mostrar <b>12⌄</b> por página</span></footer>
        </article>
      </section>
      <aside className="evo-card-center-side">
        <section className="next-invoice"><header><EvolutionFinancialIcon name="calendar" size={22}/><h3>Próxima fatura</h3><button>Ver fatura›</button></header><div className="due"><span><small>Vencimento</small><strong>{fmtDate(dueDate(selected,month))}</strong><em>Aberta</em></span><b>{money.format(invoice)}</b></div><button className="pay" type="button" disabled={invoice<=0} onClick={()=>setPayOpen(true)}><EvolutionFinancialIcon name="card" size={19}/>Pagar fatura</button><div className="usage"><strong>{money.format(invoice)}</strong><small>de {money.format(used)} utilizados</small><i><em style={{width:usedPct+'%'}}/></i><b>{usedPct}%</b></div></section>
        <section className="open-installments"><header><EvolutionFinancialIcon name="list" size={22}/><h3>Parcelas em aberto</h3><button>Ver todas›</button></header>{selected.purchases.filter(p=>p.installments>1).slice(0,5).map(p=><div key={p.id}><EvolutionFinancialIcon name={iconFor(p.description)} size={18}/><span><b>{p.description}</b><small>{p.installments} parcelas</small></span><strong>{money.format(amount(p.totalAmount)/Math.max(1,p.installments))}</strong></div>)}</section>
        <section className="card-alerts"><header><EvolutionFinancialIcon name="bell" size={22}/><h3>Alertas do cartão</h3></header><div><EvolutionFinancialIcon name="alert" size={20}/><span><b>Fatura próxima do vencimento</b><small>Vence em {fmtDate(dueDate(selected,month))}</small></span></div><div><EvolutionFinancialIcon name="chart" size={20}/><span><b>Utilização do limite</b><small>Você já utilizou {usedPct}% do seu limite.</small></span></div></section>
      </aside>
    </div>
    {payOpen&&renderPayModal()}
  </section>;

  function renderPayModal(){
    if(!selected)return null;
    return <div className="evo-card-pay-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!paying)setPayOpen(false)}}>
      <section className="evo-card-pay-modal" role="dialog" aria-modal="true" aria-label="Pagar fatura">
        <header><span><EvolutionFinancialIcon name="wallet" size={28}/></span><div><h2>Pagar fatura</h2><p>Confirme o pagamento da fatura selecionada.</p></div><button type="button" onClick={()=>!paying&&setPayOpen(false)}><EvolutionFinancialIcon name="x" size={24}/></button></header>
        <section className="card-summary"><img src={artwork(selected,cards.indexOf(selected))} alt=""/><div><h3>{selected.name}</h3><p>Final {selected.lastFour||'••••'}</p><em>Cartão principal</em></div><span><small>Valor da fatura</small><strong>{money.format(invoice)}</strong><p>Vencimento <b>{fmtDate(dueDate(selected,month))}</b></p></span></section>
        <section className="payment-grid">
          <label><span>Conta para pagamento</span><select value={accountId} onChange={event=>setAccountId(event.target.value)}>{accounts.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <article className={'balance '+(missing>0?'insufficient':'')}><EvolutionFinancialIcon name="banknote" size={28}/><div><small>Saldo atual</small><strong>{balance.status==='ready'?money.format(balance.available):'Validando…'}</strong><p>Saldo após pagamento <b>{balance.status==='ready'?money.format(Math.max(0,after)):'—'}</b></p></div></article>
          <label><span>Data do pagamento</span><div><EvolutionFinancialIcon name="calendar" size={19}/><input type="date" value={paidAt} onChange={event=>setPaidAt(event.target.value)}/></div></label>
          <section className="payment-type"><span>Tipo de pagamento</span><div><button className="active"><i/>Pagamento total</button><button disabled><i/>Pagamento parcial</button></div></section>
        </section>
        {missing>0&&<div className="warning">Saldo insuficiente. Faltam {money.format(missing)} para pagar a fatura.</div>}
        {balance.status==='error'&&<div className="warning">Não foi possível validar o saldo da conta. O pagamento foi bloqueado.</div>}
        {message&&<div className="warning">{message}</div>}
        <section className="pay-insights"><div><EvolutionFinancialIcon name="calendar" size={24}/><span><small>Melhor dia de compra</small><strong>Dia {bestDay(selected)}</strong><p>Com base no fechamento do cartão.</p></span></div><div><EvolutionFinancialIcon name="list" size={24}/><span><small>Parcelas em aberto</small><strong>{selected.purchases.filter(p=>p.installments>1).length} parcelas</strong><p>Total parcelado em acompanhamento.</p></span></div></section>
        <footer><button className="cancel" onClick={()=>!paying&&setPayOpen(false)}>Cancelar</button><button className="confirm" disabled={paying||invoice<=0||balance.status!=='ready'||missing>0||!accountId} onClick={()=>void payInvoice()}><EvolutionFinancialIcon name="check-line" size={21}/>{paying?'Processando…':'Pagar fatura'}</button></footer>
        <small>{selectedAccount?.name||'Selecione a conta'}</small>
      </section>
    </div>;
  }

  return <section className="evo-cards" data-evolution-screen="cards">
    <header className="evo-cards-hero">
      <div><h1>Meus <strong>cartões</strong></h1><p>Mais controle, mais benefícios, mais para você.</p><section><span><EvolutionFinancialIcon name="calendar" size={20}/><b>Acompanhe</b><small>seus gastos e faturas</small></span><span><EvolutionFinancialIcon name="card" size={20}/><b>Gerencie limites</b><small>e melhores datas</small></span><span><EvolutionFinancialIcon name="gift" size={20}/><b>Aproveite</b><small>benefícios exclusivos</small></span><span><EvolutionFinancialIcon name="check" size={20}/><b>Compare</b><small>para decidir melhor</small></span></section></div>
      <div className="fan">{cards.slice(0,4).map((card,index)=><img key={card.id} src={artwork(card,index)} alt="" style={{'--i':index} as CSSProperties}/>)}</div>
    </header>

    <section className="evo-card-strip">
      {cards.map((card,index)=><button key={card.id} className={card.id===selected.id?'active':''} onClick={()=>setSelectedId(card.id)}><img src={artwork(card,index)} alt=""/><span><strong>{card.name}</strong><small>•••• {card.lastFour||'••••'}</small></span>{index===0&&<em>Principal</em>}</button>)}
      <button className="add" type="button"><EvolutionFinancialIcon name="plus" size={23}/><span>Adicionar cartão</span></button>
    </section>

    <section className="evo-card-detail">
      <div className="card-visual"><img src={artwork(selected,cards.indexOf(selected))} alt={selected.name}/></div>
      <div className="identity"><div><h2>{selected.name}</h2><em>Cartão principal</em></div><dl><div><dt>Bandeira</dt><dd>{selected.brand||'—'}</dd></div><div><dt>Banco</dt><dd>{selected.issuer||'—'}</dd></div><div><dt>Final</dt><dd>{selected.lastFour||'••••'}</dd></div></dl></div>
      <div className="metric"><span><EvolutionFinancialIcon name="card" size={20}/></span><small>Limite total</small><strong>{money.format(limit)}</strong><i><em style={{width:usedPct+'%'}}/></i><b>Utilizado {usedPct}%</b></div>
      <div className="metric"><span><EvolutionFinancialIcon name="check" size={20}/></span><small>Disponível</small><strong>{money.format(available)}</strong><i><em style={{width:Math.max(0,100-usedPct)+'%'}}/></i><b>{100-usedPct}% de {money.format(limit)}</b></div>
      <div className="metric invoice"><span><EvolutionFinancialIcon name="receipt" size={20}/></span><small>Fatura atual</small><strong>{money.format(invoice)}</strong><b>Vence em {fmtDate(dueDate(selected,month))}</b></div>
      <div className="metric"><span><EvolutionFinancialIcon name="calendar" size={20}/></span><small>Melhor dia de compra</small><strong>Dia {bestDay(selected)}</strong><b>Com base no fechamento</b></div>
      <button className="more" type="button" onClick={()=>setView('center')}>Mais opções⌄</button>
    </section>

    <section className="evo-cards-bottom">
      <article className="evo-cards-table">
        <header><nav><button className="active">Movimentações</button><button>Fatura</button><button>Limites e ajustes</button><button>Benefícios</button><button>Informações</button></nav><button>Todos os cartões⌄</button></header>
        <div className="table head"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Cartão</span><span>Valor</span></div>
        <div className="rows" data-meg-scroll-region="true">{purchases.slice(0,14).map(row=><div className="table row" key={row.id}><time>{fmtDate(row.date)}</time><span className="description"><EvolutionFinancialIcon name={iconFor(row.description)} size={18}/><b>{row.description}</b></span><em>{row.category}</em><span>{selected.name} •••• {selected.lastFour}</span><strong>- {money.format(row.amount)}</strong></div>)}</div>
      </article>
      <aside className="evo-cards-side">
        <section className="next-invoice"><header><EvolutionFinancialIcon name="receipt" size={20}/><h3>Próxima fatura</h3><button onClick={()=>setView('center')}>Ver fatura⌄</button></header><div><span><small>Vencimento</small><strong>{fmtDate(dueDate(selected,month))}</strong><em>Aberta</em></span><b>{money.format(invoice)}</b></div><button className="pay" type="button" onClick={()=>setPayOpen(true)} disabled={invoice<=0}><EvolutionFinancialIcon name="card" size={18}/>Pagar fatura</button><article><strong>{money.format(invoice)}</strong><small>de {money.format(used)} utilizados</small><i><em style={{width:usedPct+'%'}}/></i><b>{usedPct}%</b></article></section>
        <section className="installments"><header><EvolutionFinancialIcon name="list" size={20}/><h3>Parcelas em aberto</h3><button>Ver todas⌄</button></header>{selected.purchases.filter(p=>p.installments>1).slice(0,4).map(p=><div key={p.id}><EvolutionFinancialIcon name={iconFor(p.description)} size={18}/><span><b>{p.description}</b><small>{p.installments} parcelas</small></span><strong>{money.format(amount(p.totalAmount)/Math.max(1,p.installments))}</strong></div>)}</section>
      </aside>
    </section>
    {payOpen&&renderPayModal()}
  </section>;
}
