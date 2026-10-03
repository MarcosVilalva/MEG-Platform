import {useEffect,useMemo,useState} from 'react';
import {financeClient,type Account,type Category,type PaymentMethod} from '../../app/finance-client';
import {cardsClient,type CreditCard} from '../../app/cards-client';
import '../styles/launch-modal.css';

type LaunchMode='expense'|'income';
type PaymentMode='cash'|'credit'|'benefit';

type Props={
  month:string;
  qaMode?:boolean;
  onClose:()=>void;
  onSaved:()=>void;
};

type LaunchIconName='plus'|'expense'|'income'|'tag'|'wallet'|'card'|'note'|'calendar'|'x'|'check';

function LaunchIcon({name}:{name:LaunchIconName}){
  const paths:Record<LaunchIconName,string[]>={
    plus:['M12 5v14','M5 12h14'],
    expense:['M5 5l14 14','M13 19h6v-6'],
    income:['M5 19L19 5','M11 5h8v8'],
    tag:['M3 12V5h7l11 11-5 5z','M7.5 8.5h.01'],
    wallet:['M4 7h16v12H4z','M4 7l3-3h11v3','M15 12h5v4h-5z'],
    card:['M3 7h18v12H3z','M3 11h18','M7 16h4'],
    note:['M5 3h14v18H5z','M8 8h8','M8 12h8','M8 16h5'],
    calendar:['M5 4h14v16H5z','M8 2v4','M16 2v4','M5 9h14'],
    x:['M6 6l12 12','M18 6 6 18'],
    check:['M5 12.5l4 4L19 7']
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name].map((d,index)=><path key={index} d={d}/>)}</svg>;
}

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const isBenefit=(value:string)=>/benef|verocard|aliment|refeic|vale/.test(normalize(value));
const isCredit=(value:string)=>/credit|credito|cartao/.test(normalize(value));
const isInstallment=(value:string)=>/crediario|carne|parcel/.test(normalize(value));
const operationId=()=>globalThis.crypto?.randomUUID?.()||('evo-'+Date.now()+'-'+Math.random().toString(16).slice(2));

function CategoryIcon({name}:{name:string}){
  const key=normalize(name);
  const paths=key.includes('aliment')||key.includes('mercad')
    ?['M6 3v7','M3 3v4a3 3 0 0 0 6 0V3','M6 10v11','M16 3v18','M16 3c4 2 4 8 0 10']
    :key.includes('transp')||key.includes('auto')||key.includes('carro')
      ?['M5 17h14l-1.5-6h-11z','M7 11l2-4h6l2 4','M7 17v2','M17 17v2']
      :key.includes('morad')||key.includes('casa')
        ?['M3 11.5 12 4l9 7.5','M5.5 10.5V20h13v-9.5']
        :key.includes('saud')
          ?['M12 20s-8-4.8-8-11a4 4 0 0 1 7-2.6L12 7.8l1-1.4A4 4 0 0 1 20 9c0 6.2-8 11-8 11z']
          :key.includes('lazer')||key.includes('jogo')
            ?['M7 9h10l3 8-3 2-3-3h-4l-3 3-3-2z','M8 12v4','M6 14h4','M15 13h.01','M17 15h.01']
            :['M3 12V5h7l11 11-5 5z','M7.5 8.5h.01'];
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths.map((d,index)=><path key={index} d={d}/>)}</svg>;
}

function parseAmount(value:string){
  const normalized=value.trim().replace(/\s/g,'').replace(/R\$/gi,'').replace(/\./g,'').replace(',','.');
  const result=Number(normalized);
  return Number.isFinite(result)?Math.abs(result):0;
}

const qaAccounts:Account[]=[
  {id:'qa-main',name:'Conta Principal',type:'monetary',institution:'MEG',openingBalance:0,isActive:true},
  {id:'qa-benefit',name:'Benefício Verocard',type:'benefit',institution:'Verocard',openingBalance:0,isActive:true}
];
const qaCategories:Category[]=[
  {id:'qa-food',name:'Alimentação',group:'Alimentação',type:'expense',isActive:true},
  {id:'qa-transport',name:'Transporte',group:'Transporte',type:'expense',isActive:true},
  {id:'qa-home',name:'Moradia',group:'Moradia',type:'expense',isActive:true},
  {id:'qa-leisure',name:'Lazer',group:'Lazer',type:'expense',isActive:true},
  {id:'qa-health',name:'Saúde',group:'Saúde',type:'expense',isActive:true},
  {id:'qa-income',name:'Receitas',group:'Receitas',type:'income',isActive:true}
];
const qaMethods:PaymentMethod[]=[
  {id:'qa-pix',name:'Pix',type:'cash',isActive:true},
  {id:'qa-debit',name:'Cartão de Débito',type:'debit',isActive:true},
  {id:'qa-boleto',name:'Boleto',type:'cash',isActive:true},
  {id:'qa-credit',name:'Cartão de Crédito',type:'credit',isActive:true},
  {id:'qa-verocard',name:'Verocard',type:'benefit',isActive:true}
];
const qaCards:CreditCard[]=[
  {id:'qa-latam',name:'LATAM Pass',issuer:'Itaú',brand:'Mastercard',lastFour:'5934',creditLimit:10000,closingDay:2,dueDay:10,isActive:true,usedLimit:0,availableLimit:10000,statementAmount:0,purchases:[]},
  {id:'qa-mercado',name:'Mercado Pago',issuer:'Mercado Pago',brand:'Visa',lastFour:'4021',creditLimit:8000,closingDay:5,dueDay:12,isActive:true,usedLimit:0,availableLimit:8000,statementAmount:0,purchases:[]},
  {id:'qa-riachuelo',name:'Riachuelo',issuer:'Riachuelo',brand:'Mastercard',lastFour:'8827',creditLimit:5000,closingDay:8,dueDay:15,isActive:true,usedLimit:0,availableLimit:5000,statementAmount:0,purchases:[]}
];

export function EvolutionLaunchModal({month,qaMode=false,onClose,onSaved}:Props){
  const [mode,setMode]=useState<LaunchMode>('expense');
  const [paymentMode,setPaymentMode]=useState<PaymentMode>('cash');
  const [description,setDescription]=useState('');
  const [amount,setAmount]=useState('');
  const [date,setDate]=useState(today());
  const [categoryId,setCategoryId]=useState('');
  const [accountId,setAccountId]=useState('');
  const [paymentMethodId,setPaymentMethodId]=useState('');
  const [cardId,setCardId]=useState('');
  const [installments,setInstallments]=useState(1);
  const [status,setStatus]=useState<'paid'|'planned'>('paid');
  const [notes,setNotes]=useState('');
  const [accounts,setAccounts]=useState<Account[]>(qaMode?qaAccounts:[]);
  const [categories,setCategories]=useState<Category[]>(qaMode?qaCategories:[]);
  const [methods,setMethods]=useState<PaymentMethod[]>(qaMode?qaMethods:[]);
  const [cards,setCards]=useState<CreditCard[]>(qaMode?qaCards:[]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(qaMode)return;
    let active=true;
    void Promise.all([
      financeClient.listAccounts(),
      financeClient.listCategories(),
      financeClient.listPaymentMethods(),
      cardsClient.list(month)
    ]).then(([nextAccounts,nextCategories,nextMethods,nextCards])=>{
      if(!active)return;
      setAccounts(nextAccounts.filter(item=>item.isActive));
      setCategories(nextCategories.filter(item=>item.isActive));
      setMethods(nextMethods.filter(item=>item.isActive));
      setCards(nextCards.filter(item=>item.isActive));
    }).catch(()=>{if(active)setMessage('Não foi possível carregar as opções do lançamento.')});
    return()=>{active=false};
  },[month,qaMode]);

  const activeCategories=useMemo(
    ()=>categories.filter(item=>item.isActive&&(!item.type||item.type===mode)),
    [categories,mode]
  );
  const benefitAccounts=accounts.filter(item=>item.isActive&&isBenefit(item.name+' '+item.type+' '+(item.institution||'')));
  const regularAccounts=accounts.filter(item=>item.isActive&&!isBenefit(item.name+' '+item.type+' '+(item.institution||'')));
  const selectedAccount=accounts.find(item=>item.id===accountId);
  const incomeBenefit=mode==='income'&&Boolean(selectedAccount&&isBenefit(selectedAccount.name+' '+selectedAccount.type+' '+(selectedAccount.institution||'')));

  const visibleAccounts=mode==='expense'&&paymentMode==='benefit'?benefitAccounts:mode==='expense'?regularAccounts:accounts.filter(item=>item.isActive);
  const visibleMethods=methods.filter(item=>{
    const text=item.name+' '+(item.type||'');
    if(mode==='income') return incomeBenefit?isBenefit(text):!isCredit(text)&&!isInstallment(text)&&!isBenefit(text);
    if(paymentMode==='benefit') return isBenefit(text);
    if(paymentMode==='cash') return !isCredit(text)&&!isInstallment(text)&&!isBenefit(text);
    return false;
  });

  useEffect(()=>{
    setCategoryId('');
    if(mode==='income'){
      setPaymentMode('cash');
      setCardId('');
      setStatus('paid');
    }
  },[mode]);

  useEffect(()=>{
    if(mode!=='expense')return;
    setMessage('');
    if(paymentMode==='credit'){
      setStatus('planned');
      setAccountId('');
      setPaymentMethodId('');
      return;
    }
    if(paymentMode==='benefit'){
      setStatus('paid');
      setCardId('');
      setAccountId(benefitAccounts[0]?.id||'');
      setPaymentMethodId(methods.find(item=>isBenefit(item.name+' '+(item.type||'')))?.id||'');
      return;
    }
    setCardId('');
    if(accountId&&benefitAccounts.some(item=>item.id===accountId))setAccountId('');
    const candidate=visibleMethods[0];
    if(candidate&&!visibleMethods.some(item=>item.id===paymentMethodId))setPaymentMethodId(candidate.id);
  },[paymentMode,mode,accounts,methods]);

  useEffect(()=>{
    if(mode!=='income')return;
    if(incomeBenefit){
      const method=methods.find(item=>isBenefit(item.name+' '+(item.type||'')));
      if(method)setPaymentMethodId(method.id);
    }else if(paymentMethodId&&methods.some(item=>item.id===paymentMethodId&&isBenefit(item.name+' '+(item.type||'')))){
      setPaymentMethodId('');
    }
  },[mode,incomeBenefit,methods,paymentMethodId]);

  const categoryChips=activeCategories.slice(0,5);

  function validate(){
    if(!description.trim())return 'Informe a descrição.';
    if(parseAmount(amount)<=0)return 'Informe um valor maior que zero.';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return 'Informe uma data válida.';
    if(!categoryId&&mode==='expense')return 'Selecione a categoria.';
    if(mode==='expense'&&paymentMode==='credit'&&!cardId)return 'Selecione o cartão de crédito.';
    if(mode==='expense'&&paymentMode!=='credit'&&status==='paid'&&!accountId)return 'Selecione a conta.';
    if(mode==='expense'&&paymentMode!=='credit'&&status==='paid'&&!paymentMethodId)return 'Selecione a forma de pagamento.';
    if(mode==='income'&&!accountId)return 'Selecione a conta de recebimento.';
    if(mode==='income'&&!paymentMethodId)return 'Selecione a forma de recebimento.';
    return '';
  }

  async function save(){
    if(busy)return;
    const error=validate();
    if(error){setMessage(error);return;}
    if(qaMode){setMessage('Prévia visual: gravação desativada nesta rota de QA.');return;}
    setBusy(true);
    setMessage('Salvando lançamento…');
    try{
      const value=parseAmount(amount);
      if(mode==='expense'&&paymentMode==='credit'){
        await cardsClient.createPurchase({
          cardId,
          categoryId:categoryId||undefined,
          description:description.trim().toLocaleUpperCase('pt-BR'),
          totalAmount:value,
          purchaseDate:date,
          installments:Math.max(1,Math.min(48,Math.trunc(installments||1))),
          operationId:operationId()
        });
      }else{
        const planned=mode==='expense'&&status==='planned';
        await financeClient.createEvent({
          description:description.trim().toLocaleUpperCase('pt-BR'),
          type:mode,
          status:mode==='income'?'paid':status,
          date,
          amount:value,
          accountId:planned?undefined:accountId||undefined,
          categoryId:categoryId||undefined,
          paymentMethodId:planned?undefined:paymentMethodId||undefined,
          notes:notes.trim().toLocaleUpperCase('pt-BR')||undefined,
          operationId:operationId()
        });
      }
      onSaved();
    }catch(error){
      setMessage(error instanceof Error?error.message:'Não foi possível salvar o lançamento.');
    }finally{
      setBusy(false);
    }
  }

  return <div className="evo-launch-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="evo-launch-modal" role="dialog" aria-modal="true" aria-labelledby="evo-launch-title">
      <header className="evo-launch-head">
        <span className="evo-launch-title-icon"><LaunchIcon name="plus"/></span>
        <div><h2 id="evo-launch-title">Novo Lançamento</h2><p>Registre uma entrada ou saída e mantenha seu controle em dia.</p></div>
        <button type="button" className="evo-launch-close" onClick={onClose} aria-label="Fechar"><LaunchIcon name="x"/></button>
      </header>

      <div className="evo-launch-type" role="tablist" aria-label="Tipo do lançamento">
        <button type="button" className={mode==='expense'?'active expense':''} onClick={()=>setMode('expense')}><LaunchIcon name="expense"/><span>Despesa</span></button>
        <button type="button" className={mode==='income'?'active income':''} onClick={()=>setMode('income')}><LaunchIcon name="income"/><span>Receita</span></button>
      </div>

      <div className="evo-launch-scroll">
        <label className="evo-launch-field wide">
          <span><LaunchIcon name="note"/>Descrição</span>
          <input value={description} onChange={event=>setDescription(event.target.value.toLocaleUpperCase('pt-BR'))} placeholder="Ex.: Supermercado, salário, internet..." autoComplete="off"/>
        </label>

        <div className="evo-launch-grid two">
          <label className="evo-launch-field">
            <span><LaunchIcon name="wallet"/>Valor</span>
            <div className="evo-launch-money"><b>R$</b><input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="0,00"/></div>
          </label>
          <label className="evo-launch-field">
            <span><LaunchIcon name="calendar"/>Data</span>
            <input type="date" value={date} onChange={event=>setDate(event.target.value)}/>
          </label>
        </div>

        <section className="evo-launch-section">
          <div className="evo-launch-section-title"><LaunchIcon name="tag"/><span>Categoria</span></div>
          <div className="evo-launch-categories">
            {categoryChips.map(category=><button key={category.id} type="button" className={category.id===categoryId?'active':''} onClick={()=>setCategoryId(category.id)}><i><CategoryIcon name={category.name}/></i><span>{category.name}</span></button>)}
          </div>
          {activeCategories.length>5&&<select className="evo-launch-more" value={categoryId} onChange={event=>setCategoryId(event.target.value)}><option value="">Mais categorias…</option>{activeCategories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>}
        </section>

        {mode==='expense'&&<section className="evo-launch-section">
          <div className="evo-launch-section-title"><LaunchIcon name="card"/><span>Tipo de pagamento</span></div>
          <div className="evo-launch-payment-modes">
            <button type="button" className={paymentMode==='cash'?'active':''} onClick={()=>setPaymentMode('cash')}>À vista</button>
            <button type="button" className={paymentMode==='credit'?'active':''} onClick={()=>setPaymentMode('credit')}>Crédito</button>
            <button type="button" className={paymentMode==='benefit'?'active benefit':''} onClick={()=>setPaymentMode('benefit')}>Benefício</button>
          </div>
        </section>}

        {mode==='expense'&&paymentMode==='credit'?<div className="evo-launch-grid credit-grid">
          <label className="evo-launch-field"><span><LaunchIcon name="card"/>Cartão</span><select value={cardId} onChange={event=>setCardId(event.target.value)}><option value="">Selecione</option>{cards.map(card=><option key={card.id} value={card.id}>{card.name}{card.lastFour?' •••• '+card.lastFour:''}</option>)}</select></label>
          <label className="evo-launch-field"><span>Parcelas</span><div className="evo-launch-stepper"><button type="button" onClick={()=>setInstallments(value=>Math.max(1,value-1))}>−</button><strong>{installments}x</strong><button type="button" onClick={()=>setInstallments(value=>Math.min(48,value+1))}>+</button></div></label>
        </div>:<div className="evo-launch-grid two">
          <label className="evo-launch-field"><span><LaunchIcon name="wallet"/>Conta</span><select value={accountId} disabled={mode==='expense'&&status==='planned'} onChange={event=>setAccountId(event.target.value)}><option value="">Selecione</option>{visibleAccounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="evo-launch-field"><span><LaunchIcon name="card"/>{mode==='income'?'Forma de recebimento':'Forma de pagamento'}</span><select value={paymentMethodId} disabled={mode==='expense'&&status==='planned'} onChange={event=>setPaymentMethodId(event.target.value)}><option value="">Selecione</option>{visibleMethods.map(method=><option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
        </div>}

        {mode==='expense'&&paymentMode!=='credit'&&paymentMode!=='benefit'&&<section className="evo-launch-status">
          <span>Status</span>
          <div><button type="button" className={status==='paid'?'active':''} onClick={()=>setStatus('paid')}>Pago</button><button type="button" className={status==='planned'?'active planned':''} onClick={()=>{setStatus('planned');setAccountId('');setPaymentMethodId('')}}>Pendente</button></div>
        </section>}

        <label className="evo-launch-field wide">
          <span><LaunchIcon name="note"/>Observações <small>(opcional)</small></span>
          <textarea rows={2} maxLength={200} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Adicione uma observação…"/>
          <small className="evo-launch-counter">{notes.length}/200</small>
        </label>

        {message&&<div className="evo-launch-message" role="status">{message}</div>}
      </div>

      <footer className="evo-launch-actions">
        <button type="button" className="cancel" onClick={onClose}><LaunchIcon name="x"/>Cancelar</button>
        <button type="button" className="save" disabled={busy} onClick={()=>void save()}><LaunchIcon name="check"/>{busy?'Salvando…':'Salvar lançamento'}</button>
      </footer>
    </section>
  </div>;
}
