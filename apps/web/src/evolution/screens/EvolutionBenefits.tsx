import {useEffect,useMemo,useState} from 'react';
import {financeClient,type Account,type BenefitSummary,type Category,type FinancialEvent,type PaymentMethod} from '../../app/finance-client';
import {EvolutionFinancialIcon,type EvolutionFinancialIconName} from '../components/EvolutionFinancialIcon';
import '../styles/benefits.css';

type Props={month:string;qaMode?:boolean;refreshToken?:number;onChanged?:()=>void};
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const dateFmt=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
const monthFmt=new Intl.DateTimeFormat('pt-BR',{month:'short'});
const normalize=(value:unknown)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const todayIso=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const operationId=()=>globalThis.crypto?.randomUUID?.()||('evo-benefit-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const parseAmount=(value:string)=>{const n=Number(value.replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.abs(n):0};
const formatCurrencyInput=(raw:string)=>{const digits=raw.replace(/\D/g,'').replace(/^0+(?=\d)/,'');if(!digits)return '';return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(digits)/100)};
const isBenefit=(value:unknown)=>/benef|verocard|aliment|refeic/.test(normalize(value));
const shiftMonth=(month:string,offset:number)=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+offset,1)).toISOString().slice(0,7)};
const fmtDate=(iso:string)=>dateFmt.format(new Date(String(iso).slice(0,10)+'T12:00:00'));
const signedAmount=(event:FinancialEvent)=>{const raw=Number(event.signedAmount??event.amount??0);return event.type==='income'?Math.abs(raw):-Math.abs(raw)};

function iconFor(event:FinancialEvent):EvolutionFinancialIconName{
  const key=normalize(event.description+' '+(event.category?.name||'')+' '+(event.category?.group||''));
  if(event.type==='income')return 'arrows-right-left';
  if(/mercado|supermerc|carrefour|acucar/.test(key))return 'cart';
  if(/posto|shell|ipiranga|gasolina|combust/.test(key))return 'fuel';
  if(/restaurante|outback|ifood|food/.test(key))return 'food';
  if(/farmac|droga|remedio/.test(key))return 'heart-pulse';
  return 'food';
}
function categoryOf(event:FinancialEvent){
  return event.category?.name||event.category?.group||(event.type==='income'?'Recarga':'Alimentação');
}
const qaSummary:BenefitSummary={month:'2026-10',balance:1436.52,credits:2440,used:1003.48};
const qaAccount:Account={id:'qa-benefit',name:'Verocard Alimentação',type:'benefit',institution:'Verocard',openingBalance:0,isActive:true};
const qaMethod:PaymentMethod={id:'qa-verocard',name:'VEROCARD',type:'benefit',isActive:true};
const qaEvents:FinancialEvent[]=[
  {id:'b1',description:'Carrefour',type:'expense',status:'paid',date:'2026-10-08',competence:'2026-10',amount:342.50,signedAmount:-342.50,accountId:qaAccount.id,account:qaAccount,paymentMethodId:qaMethod.id,paymentMethod:qaMethod},
  {id:'b2',description:'Shell',type:'expense',status:'paid',date:'2026-10-06',competence:'2026-10',amount:180,signedAmount:-180,accountId:qaAccount.id,account:qaAccount,paymentMethodId:qaMethod.id,paymentMethod:qaMethod},
  {id:'b3',description:'Outback',type:'expense',status:'paid',date:'2026-10-04',competence:'2026-10',amount:198.70,signedAmount:-198.70,accountId:qaAccount.id,account:qaAccount,paymentMethodId:qaMethod.id,paymentMethod:qaMethod},
  {id:'b4',description:'Droga Raia',type:'expense',status:'paid',date:'2026-10-02',competence:'2026-10',amount:129.90,signedAmount:-129.90,accountId:qaAccount.id,account:qaAccount,paymentMethodId:qaMethod.id,paymentMethod:qaMethod},
  {id:'b5',description:'RECARGA VEROCARD',type:'income',status:'paid',date:'2026-10-01',competence:'2026-10',amount:2440,signedAmount:2440,accountId:qaAccount.id,account:qaAccount,paymentMethodId:qaMethod.id,paymentMethod:qaMethod},
  {id:'b6',description:'Pão de Açúcar',type:'expense',status:'paid',date:'2026-09-29',competence:'2026-10',amount:256.80,signedAmount:-256.80,accountId:qaAccount.id,account:qaAccount,paymentMethodId:qaMethod.id,paymentMethod:qaMethod}
];

export function EvolutionBenefits({month,qaMode=false,refreshToken=0,onChanged}:Props){
  const [summary,setSummary]=useState<BenefitSummary>(qaMode?qaSummary:{month,balance:0,credits:0,used:0});
  const [events,setEvents]=useState<FinancialEvent[]>(qaMode?qaEvents:[]);
  const [account,setAccount]=useState<Account|null>(qaMode?qaAccount:null);
  const [method,setMethod]=useState<PaymentMethod|null>(qaMode?qaMethod:null);
  const [categories,setCategories]=useState<Category[]>([]);
  const [busy,setBusy]=useState(!qaMode);
  const [rechargeOpen,setRechargeOpen]=useState(false);
  const [rechargeDate,setRechargeDate]=useState(todayIso());
  const [rechargeAmount,setRechargeAmount]=useState('');
  const [notes,setNotes]=useState('');
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');

  async function load(){
    if(qaMode){setBusy(false);return}
    setBusy(true);
    try{
      const [nextSummary,page,accounts,methods,nextCategories]=await Promise.all([
        financeClient.getBenefitSummary(month),
        financeClient.listEventsForMonth(month),
        financeClient.listAccounts(),
        financeClient.listPaymentMethods(),
        financeClient.listCategories()
      ]);
      const benefitAccount=accounts.find(item=>item.isActive&&isBenefit(item.name+' '+item.type+' '+(item.institution||'')))||null;
      const benefitMethod=methods.find(item=>item.isActive&&isBenefit(item.name+' '+(item.type||'')))||null;
      setSummary(nextSummary);
      setAccount(benefitAccount);
      setMethod(benefitMethod);
      setCategories(nextCategories.filter(item=>item.isActive));
      setEvents(page.items.filter(item=>isBenefit([item.account?.name,item.account?.type,item.paymentMethod?.name,item.description].join(' '))).sort((a,b)=>b.date.localeCompare(a.date)));
    }finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[month,qaMode,refreshToken]);

  const totalLimit=Math.max(summary.credits,summary.balance+summary.used,1);
  const usedPct=Math.max(0,Math.min(100,Math.round(summary.used/totalLimit*100)));
  const expenseEvents=events.filter(event=>signedAmount(event)<0);
  const chartMax=Math.max(1,...expenseEvents.map(event=>Math.abs(signedAmount(event))));
  const incomeCategory=categories.find(item=>item.type==='income'&&/benef|recarga|aliment/.test(normalize(item.name+' '+(item.group||''))))||categories.find(item=>item.type==='income');

  const upcoming=useMemo(()=>[1,2,3].map(offset=>{const next=shiftMonth(month,offset);const [y,m]=next.split('-').map(Number);const d=new Date(Date.UTC(y,m-1,1));return {month:next,label:monthFmt.format(d).replace('.','').toUpperCase(),amount:summary.credits||totalLimit}}),[month,summary.credits,totalLimit]);

  async function saveRecharge(){
    const value=parseAmount(rechargeAmount);
    if(!value||!account||!method||saving)return;
    setSaving(true);setMessage('');
    try{
      if(qaMode){
        setSummary(current=>({...current,balance:current.balance+value,credits:current.credits+value}));
        setEvents(current=>[{id:'qa-recharge-'+Date.now(),description:'RECARGA VEROCARD',type:'income',status:'paid',date:rechargeDate,competence:month,amount:value,signedAmount:value,accountId:account.id,account,paymentMethodId:method.id,paymentMethod:method,notes},...current]);
      }else{
        await financeClient.createEvent({
          description:'RECARGA VEROCARD',
          type:'income',
          status:'paid',
          date:rechargeDate,
          amount:value,
          accountId:account.id,
          paymentMethodId:method.id,
          categoryId:incomeCategory?.id,
          notes:notes.trim().toLocaleUpperCase('pt-BR')||undefined,
          operationId:operationId()
        });
        await load();
      }
      setRechargeOpen(false);setRechargeAmount('');setNotes('');onChanged?.();
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível registrar a recarga.')}
    finally{setSaving(false)}
  }

  const rechargeValue=parseAmount(rechargeAmount);

  return <section className="evo-benefits" data-evolution-screen="benefits">
    <header className="evo-benefits-hero">
      <div><h1>Benefícios</h1><p>Acompanhe saldo, consumo e vantagens do seu benefício.</p></div>
      <button type="button" onClick={()=>setRechargeOpen(true)}>Registrar recarga</button>
    </header>

    <section className="evo-benefit-main-card">
      <div className="copy"><span><EvolutionFinancialIcon name="wallet" size={30}/></span><div><h2>Benefícios Verocard</h2><p>Mais praticidade, economia e qualidade de vida no seu dia a dia.</p></div></div>
      <img src="./assets/cards/verocard-alimentacao-v659.svg" alt="Verocard Alimentação"/>
      <div className="balance"><span><EvolutionFinancialIcon name="wallet" size={28}/></span><div><small>Saldo disponível</small><strong>{money.format(summary.balance)}</strong><p>↗ {usedPct>0?Math.max(1,Math.round((summary.credits-summary.used)/Math.max(1,summary.credits)*100)):0}% <em>em relação ao mês anterior</em></p></div><i><em style={{width:Math.max(0,100-usedPct)+'%'}}/></i><footer><span>Utilizado {usedPct}%<b>{money.format(summary.used)}</b></span><span>Limite total<b>{money.format(totalLimit)}</b></span></footer></div>
    </section>

    <section className="evo-benefit-kpis">
      <article className="green"><span><EvolutionFinancialIcon name="wallet" size={24}/></span><div><small>Saldo disponível</small><strong>{money.format(summary.balance)}</strong><p>Limite total: {money.format(totalLimit)}</p></div><b>›</b></article>
      <article className="blue"><span><EvolutionFinancialIcon name="arrows-right-left" size={24}/></span><div><small>Recarga do mês</small><strong>{money.format(summary.credits)}</strong><p>Última em {events.find(e=>e.type==='income')?fmtDate(events.find(e=>e.type==='income')!.date):'—'}</p></div><b>›</b></article>
      <article className="red"><span><EvolutionFinancialIcon name="receipt" size={24}/></span><div><small>Gasto no mês</small><strong>{money.format(summary.used)}</strong><p>{usedPct}% do limite</p></div><b>›</b></article>
      <article className="green"><span><EvolutionFinancialIcon name="shopping-bag" size={24}/></span><div><small>Estabelecimentos parceiros</small><strong>1.250</strong><p>Em todo o Brasil</p></div><b>›</b></article>
    </section>

    <section className="evo-benefit-middle">
      <article className="advantages"><header><div><span><EvolutionFinancialIcon name="gift" size={22}/></span><h2>Vantagens exclusivas</h2></div><button>Ver todos os parceiros ›</button></header><div>
        <section><EvolutionFinancialIcon name="cart" size={32}/><span><b>Supermercados</b><small>Até 15% OFF</small><em>+420 parceiros</em></span></section>
        <section><EvolutionFinancialIcon name="fuel" size={32}/><span><b>Postos de gasolina</b><small>Até 12% OFF</small><em>+320 parceiros</em></span></section>
        <section><EvolutionFinancialIcon name="food" size={32}/><span><b>Restaurantes</b><small>Até 20% OFF</small><em>+280 parceiros</em></span></section>
        <section><EvolutionFinancialIcon name="heart-pulse" size={32}/><span><b>Farmácias</b><small>Até 18% OFF</small><em>+230 parceiros</em></span></section>
      </div></article>
      <article className="consumption"><header><div><span><EvolutionFinancialIcon name="chart" size={22}/></span><h2>Consumo no período</h2></div><button>{month.split('-').reverse().join('/')}⌄</button></header><strong>{money.format(summary.used)}</strong><p>↓ {usedPct}% <em>em relação ao mês anterior</em></p><div className="bars">{expenseEvents.slice(0,18).reverse().map((event,index)=><span key={event.id}><i style={{height:(Math.abs(signedAmount(event))/chartMax*100)+'%'}}/><small>{index%4===0?String(Number(event.date.slice(-2))).padStart(2,'0'):''}</small></span>)}</div></article>
    </section>

    <section className="evo-benefit-bottom">
      <article className="movements"><header><div><EvolutionFinancialIcon name="arrows-right-left" size={22}/><h2>Últimas movimentações</h2></div><button>Ver todas⌄</button></header><div className="head"><span>Data</span><span>Descrição</span><span>Estabelecimento</span><span>Categoria</span><span>Valor</span></div><div className="rows" data-meg-scroll-region="true">{events.slice(0,8).map(event=><div className="row" key={event.id}><time>{fmtDate(event.date)}</time><span className="desc"><EvolutionFinancialIcon name={iconFor(event)} size={18}/><b>{event.description}</b></span><span>{event.description}</span><em>{categoryOf(event)}</em><strong className={event.type==='income'?'positive':'negative'}>{event.type==='income'?'+ ':'- '}{money.format(Math.abs(signedAmount(event)))}</strong></div>)}</div></article>
      <aside className="credits"><header><div><EvolutionFinancialIcon name="calendar" size={22}/><h2>Próximos créditos</h2></div><button>Ver todos⌄</button></header>{upcoming.map(item=><div key={item.month}><time><b>01</b><small>{item.label}</small></time><span><strong>Recarga mensal</strong><small>Benefício Verocard</small></span><b>{money.format(item.amount)}</b><em>Programado</em></div>)}</aside>
    </section>

    {rechargeOpen&&<div className="evo-recharge-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!saving)setRechargeOpen(false)}}>
      <section className="evo-recharge-modal" role="dialog" aria-modal="true" aria-label="Registrar recarga">
        <header><span><EvolutionFinancialIcon name="gift" size={29}/></span><div><h2>Registrar recarga</h2><p>Adicione um novo crédito ao benefício.</p></div><button onClick={()=>!saving&&setRechargeOpen(false)}><EvolutionFinancialIcon name="x" size={23}/></button></header>
        <div className="body"><section className="form">
          <label><span>Benefício</span><div><EvolutionFinancialIcon name="food" size={20}/><strong>{account?.name||'Verocard Alimentação'}</strong><b>⌄</b></div></label>
          <label><span>Data da recarga</span><div><EvolutionFinancialIcon name="calendar" size={20}/><input type="date" value={rechargeDate} onChange={event=>setRechargeDate(event.target.value)}/></div></label>
          <label><span>Valor da recarga</span><div><b>R$</b><input inputMode="numeric" value={rechargeAmount} onChange={event=>setRechargeAmount(formatCurrencyInput(event.target.value))} placeholder="0,00"/></div></label>
          <label><span>Origem do crédito</span><div><EvolutionFinancialIcon name="banknote" size={20}/><strong>Transferência bancária</strong><b>⌄</b></div></label>
          <label className="notes"><span>Observações <small>(opcional)</small></span><textarea maxLength={300} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Recarga mensal de benefício alimentação."/><em>{notes.length}/300</em></label>
        </section><aside className="summary"><h3>Resumo da recarga</h3><img src="./assets/cards/verocard-alimentacao-v659.svg" alt=""/><dl><div><dt><EvolutionFinancialIcon name="food" size={18}/>Benefício</dt><dd>{account?.name||'Verocard Alimentação'}</dd></div><div><dt><EvolutionFinancialIcon name="banknote" size={18}/>Valor da recarga</dt><dd className="green">{money.format(rechargeValue)}</dd></div><div><dt><EvolutionFinancialIcon name="calendar" size={18}/>Data da recarga</dt><dd>{fmtDate(rechargeDate)}</dd></div><div><dt><EvolutionFinancialIcon name="card" size={18}/>Limite total</dt><dd>{money.format(totalLimit)}</dd></div><div><dt><EvolutionFinancialIcon name="wallet" size={18}/>Saldo atual</dt><dd>{money.format(summary.balance)}</dd></div><div className="after"><dt><EvolutionFinancialIcon name="chart" size={18}/>Saldo após recarga</dt><dd>{money.format(summary.balance+rechargeValue)}</dd></div></dl></aside></div>
        {message&&<div className="message">{message}</div>}
        <footer><button className="cancel" onClick={()=>!saving&&setRechargeOpen(false)}>Cancelar</button><button className="confirm" disabled={saving||!rechargeValue||!account||!method} onClick={()=>void saveRecharge()}><EvolutionFinancialIcon name="check-line" size={20}/>{saving?'Salvando…':'Confirmar recarga'}</button></footer>
      </section>
    </div>}
  </section>;
}
