import {useEffect,useMemo,useRef,useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
import {financeClient,type Account,type Category,type FinancialEvent,type PaymentMethod} from '../../app/finance-client';
import {cardsClient,type CreditCard} from '../../app/cards-client';
import {EvolutionFinancialIcon,resolveEvolutionFinancialIcon,type EvolutionFinancialIconName} from '../components/EvolutionFinancialIcon';
import {EvolutionPicker,type EvolutionPickerOption} from '../components/EvolutionPicker';
import '../styles/launch-modal.css';

type LaunchMode='expense'|'income'|'benefit';
type PaymentMode='cash'|'credit';
type LaunchStep='choose'|'form'|'success';
type AccountClassification='general'|'investment'|'benefit';
type AccountKind='monetary'|'benefit';

type Props={
  month:string;
  qaMode?:boolean;
  onClose:()=>void;
  onSaved:()=>void;
  onTransfer?:()=>void;
  initialMode?:LaunchMode;
};

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const normalize=(value:unknown)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const isBenefitText=(value:unknown)=>/benef|verocard|aliment|refeic|vale/.test(normalize(value));
const isCreditText=(value:unknown)=>/credit|credito|cartao/.test(normalize(value));
const isCrediarioText=(value:unknown)=>/crediario|carne|parcelado loja/.test(normalize(value));
const isPixText=(value:unknown)=>/(^|\s)pix($|\s)/.test(normalize(value));
const isMainMonetary=(account:Account)=>!isBenefitText(account.name+' '+account.type+' '+(account.institution||''))&&/conta monetaria principal|conta principal/.test(normalize(account.name));
const isInvestmentAccount=(account:Account)=>/invest|investment|aplic|cdb|poupanc|corretora|broker/.test(normalize(account.name+' '+account.type+' '+(account.institution||'')));
const accountClassificationOf=(account:Account):AccountClassification=>isBenefitText(account.name+' '+account.type+' '+(account.institution||''))?'benefit':isInvestmentAccount(account)?'investment':'general';
const accountKindOf=(account:Account):AccountKind=>isBenefitText(account.name+' '+account.type+' '+(account.institution||''))?'benefit':'monetary';
const accountClassificationLabel=(value:AccountClassification)=>value==='general'?'Contas gerais':value==='investment'?'Investimentos':'Benefício';
const accountKindLabel=(value:AccountKind)=>value==='monetary'?'Conta monetária':'Conta benefício';
const operationId=()=>globalThis.crypto?.randomUUID?.()||('evo-'+Date.now()+'-'+Math.random().toString(16).slice(2));

function parseAmount(value:string){
  const normalized=value.replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
  const result=Number(normalized);
  return Number.isFinite(result)?Math.abs(result):0;
}
function formatCurrencyInput(raw:string){
  const digits=raw.replace(/\D/g,'').replace(/^0+(?=\d)/,'');
  if(!digits)return '';
  return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(digits)/100);
}
function uniqueCategories(items:Category[]){
  const seen=new Set<string>();
  return items.filter(item=>{
    const key=normalize(item.name);
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
function uniqueEvents(items:FinancialEvent[]){
  const seen=new Set<string>();
  return items.filter(item=>{
    const key=normalize(item.description).replace(/\s+\d+\/\d+$/,'');
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
function cardArtwork(name:string){
  const key=normalize(name);
  if(/latam/.test(key))return './assets/cards/latam-user-model-v61.svg';
  if(/azul/.test(key))return './assets/cards/azul-itau-platinum-v659.svg';
  if(/mercado|meli/.test(key))return './assets/cards/mercado-pago-visa-v662.svg';
  if(/riachuelo|midway/.test(key))return './assets/cards/riachuelo-mastercard-visual.svg';
  if(/nubank/.test(key))return './assets/cards/nubank-visual.svg';
  return '';
}
function paymentIcon(method:PaymentMethod):EvolutionFinancialIconName{
  const source=normalize(method.name+' '+(method.type||''));
  if(/verocard|aliment/.test(source))return 'food';
  if(/pix|transferencia|ted|doc/.test(source))return 'arrows-right-left';
  if(/boleto/.test(source))return 'receipt';
  if(/dinheiro|cash/.test(source))return 'banknote';
  if(/debito automatico/.test(source))return 'repeat';
  if(/cartao|credito|debito/.test(source))return 'card';
  if(/deposito|banco/.test(source))return 'landmark';
  return 'wallet';
}
function monthPlus(month:string,offset:number){
  const [year,monthNumber]=month.split('-').map(Number);
  return new Date(Date.UTC(year,monthNumber-1+offset,1)).toISOString().slice(0,7);
}
function validDay(month:string,day:number){
  const [year,monthNumber]=month.split('-').map(Number);
  const last=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  return Math.max(1,Math.min(last,Number(day||1)));
}
function nextWeekday(isoDay:string){
  const date=new Date(isoDay+'T12:00:00.000Z');
  if(Number.isNaN(date.getTime()))return isoDay;
  if(date.getUTCDay()===6)date.setUTCDate(date.getUTCDate()+2);
  else if(date.getUTCDay()===0)date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}
function statementMonthForPurchase(purchaseDate:string,closingDay:number){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate))return '';
  const purchaseMonth=purchaseDate.slice(0,7);
  const day=Number(purchaseDate.slice(8,10));
  return monthPlus(purchaseMonth,day>closingDay?1:0);
}
function dueDateForStatement(statementMonth:string,closingDay:number,dueDay:number){
  const dueMonth=dueDay<=closingDay?monthPlus(statementMonth,1):statementMonth;
  return nextWeekday(dueMonth+'-'+String(validDay(dueMonth,dueDay)).padStart(2,'0'));
}
function formatIso(iso:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return iso;
  return iso.split('-').reverse().join('/');
}
function formatMonth(month:string){return /^\d{4}-\d{2}$/.test(month)?month.split('-').reverse().join('/'):month}

const qaAccounts:Account[]=[
  {id:'qa-main',name:'Conta Monetária Principal',type:'monetary',institution:'MEG',openingBalance:0,isActive:true},
  {id:'qa-bb',name:'Banco do Brasil',type:'monetary',institution:'Banco do Brasil',openingBalance:0,isActive:true},
  {id:'qa-invest',name:'Conta de Investimentos',type:'investment',institution:'MEG Invest',openingBalance:0,isActive:true},
  {id:'qa-benefit',name:'Conta Benefício (Verocard)',type:'benefit',institution:'Verocard',openingBalance:0,isActive:true}
];
const qaCategories:Category[]=[
  {id:'qa-food',name:'Alimentação',group:'Alimentação',type:'expense',isActive:true},
  {id:'qa-market',name:'Supermercado',group:'Alimentação',type:'expense',isActive:true},
  {id:'qa-transport',name:'Transporte',group:'Transporte',type:'expense',isActive:true},
  {id:'qa-fuel',name:'Combustível',group:'Transporte',type:'expense',isActive:true},
  {id:'qa-home',name:'Moradia',group:'Moradia',type:'expense',isActive:true},
  {id:'qa-health',name:'Saúde',group:'Saúde',type:'expense',isActive:true},
  {id:'qa-communication',name:'Comunicação',group:'Comunicação',type:'expense',isActive:true},
  {id:'qa-fastfood',name:'Fast Food',group:'Alimentação',type:'expense',isActive:true},
  {id:'qa-course',name:'Cursos',group:'Educação',type:'expense',isActive:true},
  {id:'qa-gifts',name:'Presentes',group:'Pessoal',type:'expense',isActive:true},
  {id:'qa-electronics',name:'Eletrônicos / Utilidades',group:'Utilidades',type:'expense',isActive:true},
  {id:'qa-income',name:'Receitas',group:'Receitas',type:'income',isActive:true}
];
const qaMethods:PaymentMethod[]=[
  {id:'qa-pix',name:'PIX',type:'cash',isActive:true},
  {id:'qa-cash',name:'Dinheiro',type:'cash',isActive:true},
  {id:'qa-debit',name:'Débito',type:'debit',isActive:true},
  {id:'qa-boleto',name:'Boleto',type:'cash',isActive:true},
  {id:'qa-credit',name:'Cartão de Crédito',type:'credit',isActive:true},
  {id:'qa-verocard',name:'VEROCARD',type:'benefit',isActive:true}
];
const qaCards:CreditCard[]=[
  {id:'qa-latam',name:'LATAM Pass',issuer:'Itaú',brand:'Mastercard',lastFour:'5934',creditLimit:10000,closingDay:2,dueDay:10,isActive:true,usedLimit:0,availableLimit:10000,statementAmount:0,purchases:[]},
  {id:'qa-mercado',name:'Mercado Pago',issuer:'Mercado Pago',brand:'Visa',lastFour:'4021',creditLimit:8000,closingDay:5,dueDay:12,isActive:true,usedLimit:0,availableLimit:8000,statementAmount:0,purchases:[]},
  {id:'qa-riachuelo',name:'Riachuelo',issuer:'Riachuelo',brand:'Mastercard',lastFour:'8827',creditLimit:5000,closingDay:8,dueDay:15,isActive:true,usedLimit:0,availableLimit:5000,statementAmount:0,purchases:[]}
];

export function EvolutionLaunchModal({month,qaMode=false,onClose,onSaved,onTransfer,initialMode:preferredMode}:Props){
  const params=useMemo(()=>new URLSearchParams(window.location.search),[]);
  const forced=preferredMode||params.get('mode');
  const initialMode:LaunchMode=forced==='income'||forced==='benefit'?'income'===forced?'income':'benefit':'expense';
  const [step,setStep]=useState<LaunchStep>(forced?'form':'choose');
  const [mode,setMode]=useState<LaunchMode>(initialMode);
  const [paymentMode,setPaymentMode]=useState<PaymentMode>('cash');
  const [accountClassification,setAccountClassification]=useState<AccountClassification>(initialMode==='benefit'?'benefit':'general');
  const [accountKind,setAccountKind]=useState<AccountKind>(initialMode==='benefit'?'benefit':'monetary');
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
  const [historyOpen,setHistoryOpen]=useState(false);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historySuggestions,setHistorySuggestions]=useState<FinancialEvent[]>([]);
  const [previewOpen,setPreviewOpen]=useState(false);
  const saveLock=useRef(false);
  const lastOperation=useRef<{payload:string;id:string}|null>(null);
  function idFor(payload:unknown){const key=JSON.stringify(payload);if(lastOperation.current?.payload!==key)lastOperation.current={payload:key,id:operationId()};return lastOperation.current!.id;}
  useEffect(()=>{if(step!=='success')return;const timer=window.setTimeout(onSaved,900);return()=>window.clearTimeout(timer);},[step,onSaved]);

  useEffect(()=>{
    if(qaMode)return;
    let active=true;
    void Promise.all([financeClient.listAccounts(),financeClient.listCategories(),financeClient.listPaymentMethods(),cardsClient.list(month)])
      .then(([nextAccounts,nextCategories,nextMethods,nextCards])=>{
        if(!active)return;
        setAccounts(nextAccounts.filter(item=>item.isActive));
        setCategories(nextCategories.filter(item=>item.isActive));
        setMethods(nextMethods.filter(item=>item.isActive));
        setCards(nextCards.filter(item=>item.isActive));
      })
      .catch(()=>{if(active)setMessage('Não foi possível carregar as opções do lançamento.')});
    return()=>{active=false};
  },[month,qaMode]);

  const activeCategories=useMemo(()=>uniqueCategories(categories.filter(item=>item.isActive&&(!item.type||item.type===(mode==='income'?'income':'expense')))),[categories,mode]);
  const benefitAccount=accounts.find(item=>item.isActive&&isBenefitText(item.name+' '+item.type+' '+(item.institution||'')));
  const verocard=methods.find(item=>item.isActive&&isBenefitText(item.name+' '+(item.type||'')));
  const mainAccount=accounts.find(item=>item.isActive&&isMainMonetary(item));
  const pixMethod=methods.find(item=>item.isActive&&isPixText(item.name+' '+(item.type||'')));
  const selectedAccount=accounts.find(item=>item.id===accountId);
  const selectedCategory=activeCategories.find(item=>item.id===categoryId);
  const selectedCard=cards.find(item=>item.id===cardId);
  const incomeBenefit=mode==='income'&&Boolean(selectedAccount&&isBenefitText(selectedAccount.name+' '+selectedAccount.type+' '+(selectedAccount.institution||'')));

  const visibleAccounts=accounts.filter(account=>{
    if(!account.isActive)return false;
    if(mode==='benefit')return accountClassificationOf(account)==='benefit';
    return accountClassificationOf(account)===accountClassification&&accountKindOf(account)===accountKind;
  });
  const accountControlsLocked=mode==='benefit'||(mode==='expense'&&paymentMode==='credit')||(mode==='expense'&&status==='planned');
  const visibleMethods=methods.filter(method=>{
    const source=method.name+' '+(method.type||'');
    if(mode==='benefit')return isBenefitText(source);
    if(mode==='income')return incomeBenefit?isBenefitText(source):!isCreditText(source)&&!isCrediarioText(source)&&!isBenefitText(source);
    return paymentMode==='cash'&&!isCreditText(source)&&!isCrediarioText(source)&&!isBenefitText(source);
  });

  const categoryOptions:EvolutionPickerOption[]=activeCategories.map(category=>{
    const icon=resolveEvolutionFinancialIcon({type:mode==='income'?'income' as const:'expense' as const,signedAmount:mode==='income'?1:-1,categoryName:category.name,categoryGroup:category.group});
    const tone=icon==='food'||icon==='cart'||icon==='sandwich'||icon==='cup-soda'?'yellow':icon==='house'||icon==='car'||icon==='fuel'?'violet':icon==='heart-pulse'?'red':mode==='income'?'green':'cyan';
    return {id:category.id,label:category.name,subtitle:category.group||undefined,icon,tone};
  });
  const accountOptions:EvolutionPickerOption[]=visibleAccounts.map(account=>{
    const classification=accountClassificationOf(account);
    return {
      id:account.id,
      label:account.name,
      subtitle:[account.institution,accountClassificationLabel(classification)].filter(Boolean).join(' · '),
      icon:classification==='benefit'?'gift':classification==='investment'?'trend':'landmark',
      tone:classification==='benefit'?'yellow':classification==='investment'?'violet':'cyan'
    };
  });
  const methodOptions:EvolutionPickerOption[]=visibleMethods.map(method=>({id:method.id,label:method.name,subtitle:method.type||undefined,icon:paymentIcon(method),tone:isBenefitText(method.name+' '+(method.type||''))?'yellow':paymentIcon(method)==='banknote'?'green':paymentIcon(method)==='card'?'violet':'cyan'}));
  const cardOptions:EvolutionPickerOption[]=cards.filter(card=>card.isActive!==false).map(card=>({id:card.id,label:card.name,subtitle:card.lastFour?'Final '+card.lastFour:'Cartão de crédito',imageSrc:cardArtwork(card.name)||undefined,tone:'violet'}));

  const selectedMethod=methods.find(item=>item.id===paymentMethodId);
  const selectedAccountClassification=selectedAccount?accountClassificationOf(selectedAccount):accountClassification;
  const selectedAccountKind=selectedAccount?accountKindOf(selectedAccount):accountKind;
  const categoryShortcuts=categoryOptions.slice(0,6);

  function selectAccountClassification(next:AccountClassification){
    if(accountControlsLocked)return;
    setAccountClassification(next);
    if(next==='benefit'){
      setAccountKind('benefit');
      setAccountId(benefitAccount?.id||'');
      if(mode==='expense'){
        setMode('benefit');
        setPaymentMode('cash');
        setPaymentMethodId(verocard?.id||'');
        setStatus('paid');
      }else if(mode==='income'){
        setPaymentMethodId(verocard?.id||'');
      }
      return;
    }
    setAccountKind('monetary');
    setAccountId(next==='general'&&mainAccount?mainAccount.id:'');
    if(mode==='income'&&pixMethod?.id)setPaymentMethodId(pixMethod.id);
  }

  function selectAccountKind(next:AccountKind){
    if(accountControlsLocked)return;
    setAccountKind(next);
    if(next==='benefit'){
      setAccountClassification('benefit');
      setAccountId(benefitAccount?.id||'');
      if(mode==='expense'){
        setMode('benefit');
        setPaymentMethodId(verocard?.id||'');
        setStatus('paid');
      }else if(mode==='income'){
        setPaymentMethodId(verocard?.id||'');
      }
    }else{
      if(accountClassification==='benefit')setAccountClassification('general');
      setAccountId(mainAccount?.id||'');
      if(mode==='income'&&pixMethod?.id)setPaymentMethodId(pixMethod.id);
    }
  }

  useEffect(()=>{
    if(step!=='form')return;
    if(mode==='benefit'){
      setPaymentMode('cash');
      setAccountClassification('benefit');
      setAccountKind('benefit');
      setAccountId(benefitAccount?.id||'');
      setPaymentMethodId(verocard?.id||'');
      setStatus('paid');
      setCardId('');
      return;
    }
    if(mode==='income'){
      setPaymentMode('cash');
      setStatus('paid');
      setCardId('');
      if(accountClassification==='benefit'){
        setAccountKind('benefit');
        if(!accountId&&benefitAccount)setAccountId(benefitAccount.id);
        if(!paymentMethodId&&verocard)setPaymentMethodId(verocard.id);
      }else{
        setAccountKind('monetary');
        if(!accountId&&accountClassification==='general'&&mainAccount)setAccountId(mainAccount.id);
        if(!paymentMethodId&&pixMethod)setPaymentMethodId(pixMethod.id);
      }
      return;
    }
    if(paymentMode==='credit'){
      setStatus('planned');
      setAccountId('');
      setPaymentMethodId('');
    }else{
      setCardId('');
      if(!accountId&&accountClassification==='general'&&mainAccount)setAccountId(mainAccount.id);
      if(!paymentMethodId&&pixMethod)setPaymentMethodId(pixMethod.id);
    }
  },[step,mode,paymentMode,accountClassification,benefitAccount?.id,verocard?.id,mainAccount?.id,pixMethod?.id]);

  useEffect(()=>{
    if(step!=='form'||accountControlsLocked)return;
    if(accountId&&!visibleAccounts.some(account=>account.id===accountId))setAccountId('');
    if(!accountId&&accountClassification==='general'&&accountKind==='monetary'&&mainAccount&&visibleAccounts.some(account=>account.id===mainAccount.id))setAccountId(mainAccount.id);
  },[step,accountControlsLocked,accountClassification,accountKind,accountId,visibleAccounts.map(account=>account.id).join('|'),mainAccount?.id]);

  useEffect(()=>{
    if(mode!=='income')return;
    if(incomeBenefit&&verocard?.id)setPaymentMethodId(verocard.id);
    else if(paymentMethodId&&verocard?.id===paymentMethodId)setPaymentMethodId('');
  },[mode,incomeBenefit,verocard?.id]);

  useEffect(()=>{
    if(mode!=='expense'||paymentMode==='credit'||!selectedCategory)return;
    if(/(^|\s)fixo(s)?($|\s)/.test(normalize(selectedCategory.name+' '+(selectedCategory.group||''))))setStatus('paid');
  },[mode,paymentMode,selectedCategory?.id]);

  useEffect(()=>{
    if(step!=='form'||mode==='benefit'||description.trim().length<2){
      setHistorySuggestions([]);
      setHistoryLoading(false);
      return;
    }
    if(qaMode){
      const matches=[
        {id:'qa-history-1',description:'SUPERMERCADO AVENIDA',type:'expense',status:'paid',date:today(),competence:month,amount:125.90,signedAmount:-125.90,categoryId:'qa-food',accountId:'qa-bb',paymentMethodId:'qa-pix',category:qaCategories[0],account:qaAccounts[1],paymentMethod:qaMethods[0]},
        {id:'qa-history-2',description:'SUPERMERCADO CARREFOUR',type:'expense',status:'paid',date:today(),competence:month,amount:89.40,signedAmount:-89.40,categoryId:'qa-food',accountId:'qa-main',paymentMethodId:'qa-pix',category:qaCategories[0],account:qaAccounts[0],paymentMethod:qaMethods[0]}
      ] as FinancialEvent[];
      setHistorySuggestions(matches.filter(item=>normalize(item.description).includes(normalize(description))));
      return;
    }
    let active=true;
    const timer=window.setTimeout(()=>{
      setHistoryLoading(true);
      void financeClient.listEvents(1,12,description.trim()).then(page=>{
        if(!active)return;
        setHistorySuggestions(uniqueEvents(page.items.filter(item=>item.type===(mode==='income'?'income':'expense'))).slice(0,6));
      }).catch(()=>{if(active)setHistorySuggestions([])}).finally(()=>{if(active)setHistoryLoading(false)});
    },140);
    return()=>{active=false;window.clearTimeout(timer)};
  },[description,mode,step,qaMode,month]);

  const cardSchedule=useMemo(()=>{
    if(mode!=='expense'||paymentMode!=='credit'||!selectedCard||!date)return [];
    const firstStatement=statementMonthForPurchase(date,Number(selectedCard.closingDay||1));
    if(!firstStatement)return [];
    return Array.from({length:Math.max(1,Math.min(48,installments))},(_,index)=>{
      const statementMonth=monthPlus(firstStatement,index);
      return {number:index+1,statementMonth,due:dueDateForStatement(statementMonth,Number(selectedCard.closingDay||1),Number(selectedCard.dueDay||1))};
    });
  },[mode,paymentMode,selectedCard?.id,date,installments]);

  const installmentPreview=useMemo(()=>{
    const total=parseAmount(amount);
    if(!cardSchedule.length||total<=0)return [];
    const cents=Math.round(total*100);
    const base=Math.floor(cents/cardSchedule.length);
    const remainder=cents-base*cardSchedule.length;
    return cardSchedule.map((item,index)=>({...item,amount:(base+(index<remainder?1:0))/100}));
  },[cardSchedule,amount]);

  function chooseMode(next:LaunchMode){
    setMode(next);
    setDescription('');
    setCategoryId('');
    setAmount('');
    setNotes('');
    setMessage('');
    setHistoryOpen(false);
    setInstallments(1);
    setPaymentMode('cash');
    setAccountClassification(next==='benefit'?'benefit':'general');
    setAccountKind(next==='benefit'?'benefit':'monetary');
    if(next==='benefit'){
      setAccountId(benefitAccount?.id||'');
      setPaymentMethodId(verocard?.id||'');
      setStatus('paid');
    }else{
      setAccountId(mainAccount?.id||'');
      setPaymentMethodId(pixMethod?.id||'');
      setStatus('paid');
    }
    setStep('form');
  }

  function applyHistorySuggestion(event:FinancialEvent){
    setDescription(event.description.replace(/\s+\d+\/\d+\s*$/,'').toLocaleUpperCase('pt-BR'));
    const category=activeCategories.find(item=>item.id===event.categoryId)||activeCategories.find(item=>normalize(item.name)===normalize(event.category?.name));
    if(category)setCategoryId(category.id);
    const context=[event.account?.name,event.account?.type,event.paymentMethod?.name,event.paymentMethod?.type].filter(Boolean).join(' ');
    if(mode==='expense'&&isCreditText(context))setPaymentMode('credit');
    else{
      if(mode==='expense')setPaymentMode('cash');
      if(event.accountId||event.account?.id)setAccountId(event.accountId||event.account?.id||'');
      if(event.paymentMethodId||event.paymentMethod?.id)setPaymentMethodId(event.paymentMethodId||event.paymentMethod?.id||'');
    }
    if(mode==='expense')setStatus(event.status==='planned'?'planned':'paid');
    setHistoryOpen(false);
    setHistorySuggestions([]);
  }

  function validate(){
    if(!description.trim())return 'Informe a descrição.';
    if(mode!=='income'&&!categoryId)return 'Selecione a categoria.';
    if(parseAmount(amount)<=0)return 'Informe um valor maior que zero.';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return 'Informe uma data válida.';
    if(mode==='expense'&&paymentMode==='credit'&&!cardId)return 'Selecione o cartão de crédito.';
    if(mode==='expense'&&paymentMode==='cash'&&status==='paid'&&!accountId)return 'Selecione a conta.';
    if(mode==='expense'&&paymentMode==='cash'&&status==='paid'&&!paymentMethodId)return 'Selecione a forma de pagamento.';
    if(mode==='benefit'&&!benefitAccount)return 'A conta de benefício não está disponível.';
    if(mode==='income'&&!accountId)return 'Selecione a conta de recebimento.';
    if(mode==='income'&&!paymentMethodId)return 'Selecione a forma de recebimento.';
    return '';
  }

  async function save(){
    if(busy||saveLock.current)return;
    const error=validate();
    if(error){setMessage(error);return;}
    if(qaMode){setMessage('Prévia visual: operações financeiras desativadas.');return;}
    saveLock.current=true;
    setBusy(true);
    setMessage('Salvando lançamento…');
    try{
      const value=parseAmount(amount);
      if(mode==='expense'&&paymentMode==='credit'){
        const payload={cardId,categoryId:categoryId||undefined,description:description.trim().toLocaleUpperCase('pt-BR'),totalAmount:value,purchaseDate:date,installments:Math.max(1,Math.min(48,Math.trunc(installments||1)))};
        await cardsClient.createPurchase({...payload,operationId:idFor(payload)});
      }else{
        const planned=mode==='expense'&&status==='planned';
        const payload={
          description:description.trim().toLocaleUpperCase('pt-BR'),
          type:mode==='income'?'income' as const:'expense' as const,
          status:mode==='income'||mode==='benefit'?'paid' as const:status,
          date,
          amount:value,
          accountId:planned?undefined:(mode==='benefit'?benefitAccount?.id:accountId)||undefined,
          categoryId:categoryId||undefined,
          paymentMethodId:planned?undefined:(mode==='benefit'?verocard?.id:paymentMethodId)||undefined,
          notes:notes.trim().toLocaleUpperCase('pt-BR')||undefined,
        };
        if(mode==='benefit'||incomeBenefit){
          if(!benefitAccount||!verocard)throw Error('Conta benefício e forma Verocard são obrigatórias.');
          await authenticatedRequest('/finance/benefit-events',{method:'POST',body:JSON.stringify({...payload,accountId:benefitAccount.id,paymentMethodId:verocard.id,operationId:idFor(payload)})});
        }else await financeClient.createEvent({...payload,operationId:idFor(payload)});
      }
      setStep('success');
    }catch(error){
      setMessage(error instanceof Error?error.message:'Não foi possível salvar o lançamento.');
    }finally{
      saveLock.current=false;
      setBusy(false);
    }
  }

  function resetForNew(){
    setDescription('');
    setAmount('');
    setCategoryId('');
    setNotes('');
    setInstallments(1);
    setMessage('');
    setStep('choose');
  }

  const badgeLabel=mode==='expense'?'Despesa':mode==='income'?'Receita':'Alimentação';
  const badgeIcon:EvolutionFinancialIconName=mode==='expense'?'wallet':mode==='income'?'up':'food';
  const selectedCategoryIcon=selectedCategory?resolveEvolutionFinancialIcon({type:mode==='income'?'income' as const:'expense' as const,signedAmount:mode==='income'?1:-1,categoryName:selectedCategory.name,categoryGroup:selectedCategory.group}):'receipt';

  const summaryClassification=accountControlsLocked&&mode==='expense'&&paymentMode==='credit'?'Cartão de crédito':accountClassificationLabel(selectedAccountClassification);
  const summaryAccountKind=accountControlsLocked&&mode==='expense'&&paymentMode==='credit'?'Origem no cartão':accountKindLabel(selectedAccountKind);
  const summaryAccount=mode==='expense'&&paymentMode==='credit'?(selectedCard?.name||'Selecione o cartão'):(selectedAccount?.name||(status==='planned'?'Definida na baixa':'Selecione a conta'));
  const summaryPayment=mode==='benefit'?(verocard?.name||'VEROCARD'):mode==='expense'&&paymentMode==='credit'?'Cartão de crédito':(selectedMethod?.name||'Selecione a forma');
  const summaryStatus=mode==='expense'&&paymentMode==='credit'?'Na fatura':status==='planned'?'Pendente':'Pago';

  return <div className="evo-launch-backdrop" role="presentation" onMouseDown={event=>{if(!busy&&event.target===event.currentTarget)onClose()}}>
    <section className={'evo-launch-modal evo-launch-step-'+step} role="dialog" aria-modal="true" aria-labelledby="evo-launch-title">
      <header className="evo-launch-head app-pattern">
        {step==='form'?<button type="button" className="evo-launch-back" onClick={()=>setStep('choose')} aria-label="Voltar"><EvolutionFinancialIcon name="chevron-left" size={20}/></button>:<span className="evo-launch-title-icon"><EvolutionFinancialIcon name="plus" size={28}/></span>}
        <div><h2 id="evo-launch-title">{step==='success'?'Lançamento salvo':'Novo Lançamento'}</h2>{step==='choose'?<p>O que deseja lançar?</p>:step==='form'?<span className={'evo-launch-badge '+mode}><EvolutionFinancialIcon name={badgeIcon} size={14}/>{badgeLabel}</span>:<p>Operação concluída com sucesso.</p>}</div>
        <button type="button" className="evo-launch-close" disabled={busy} onClick={onClose} aria-label="Fechar"><EvolutionFinancialIcon name="x" size={19}/></button>
      </header>

      {step==='choose'&&<main className="evo-launch-choose">
        <section className="evo-launch-choose-copy"><small>NOVO MOVIMENTO</small><h3>Mais controle<br/>para o seu<br/>dia a dia</h3><span className="evo-launch-choice-hint">Escolha o tipo de lançamento</span><p>Controle receitas, despesas e benefícios em um só lugar. Escolha o tipo de movimento para começar.</p></section>
        <div className="evo-launch-choice-cards">
          <button type="button" className="expense" onClick={()=>chooseMode('expense')}><i><EvolutionFinancialIcon name="wallet" size={26}/></i><span><strong>Despesa</strong><small>Saídas, compras e gastos</small></span><b><EvolutionFinancialIcon name="chevron-right" size={20}/></b></button>
          <button type="button" className="income" onClick={()=>chooseMode('income')}><i><EvolutionFinancialIcon name="up" size={26}/></i><span><strong>Receita</strong><small>Entradas e recebimentos</small></span><b><EvolutionFinancialIcon name="chevron-right" size={20}/></b></button>
          <button type="button" className="benefit" onClick={()=>chooseMode('benefit')}><i><EvolutionFinancialIcon name="food" size={26}/></i><span><strong>Alimentação</strong><small>Usa o benefício Verocard</small></span><b><EvolutionFinancialIcon name="chevron-right" size={20}/></b></button>
          {onTransfer&&<button type="button" className="income" onClick={onTransfer}><i><EvolutionFinancialIcon name="arrows-right-left" size={26}/></i><span><strong>Transferência</strong><small>Mover entre suas contas</small></span><b><EvolutionFinancialIcon name="chevron-right" size={20}/></b></button>}
        </div>
      </main>}

      {step==='form'&&<>
        <main className="evo-launch-form-layout evo-launch-control-v1">
          <section className="evo-launch-form-primary">
            <label className="evo-launch-field wide evo-launch-description">
              <span><EvolutionFinancialIcon name="note" size={20}/>Descrição *</span>
              <input value={description} onFocus={()=>mode!=='benefit'&&setHistoryOpen(true)} onChange={event=>{setDescription(event.target.value.toLocaleUpperCase('pt-BR'));if(mode!=='benefit')setHistoryOpen(true)}} onKeyDown={event=>{if(event.key==='Escape')setHistoryOpen(false)}} placeholder="Digite a descrição do lançamento" autoComplete="off" aria-autocomplete="list" aria-expanded={historyOpen}/>
              {historyOpen&&mode!=='benefit'&&description.trim().length>=2&&<div className="evo-launch-history" role="listbox">
                <header><EvolutionFinancialIcon name="repeat" size={16}/><span>Histórico parecido</span>{historyLoading&&<i/>}</header>
                {historySuggestions.map(item=><button type="button" role="option" key={item.id} onMouseDown={event=>event.preventDefault()} onClick={()=>applyHistorySuggestion(item)}>
                  <i><EvolutionFinancialIcon name={resolveEvolutionFinancialIcon({type:item.type,signedAmount:Number(item.signedAmount||item.amount),categoryName:item.category?.name,categoryGroup:item.category?.group,description:item.description,paymentName:item.paymentMethod?.name})} size={19}/></i>
                  <span><strong>{item.description.replace(/\s+\d+\/\d+\s*$/,'')}</strong><small>{[item.category?.name||item.sourceDetails?.group,item.paymentMethod?.name||item.sourceDetails?.paymentMethod,item.account?.name].filter(Boolean).join(' · ')}</small></span>
                </button>)}
                {!historyLoading&&!historySuggestions.length&&<div className="empty">Nenhum lançamento semelhante encontrado.</div>}
              </div>}
            </label>

            <section className="evo-launch-category-zone">
              <EvolutionPicker label={mode==='income'?'Classificação da receita (opcional)':'Categoria *'} value={categoryId} options={categoryOptions} placeholder="Selecione uma categoria" openByDefault={params.get('picker')==='category'} onChange={setCategoryId}/>
              {!!categoryShortcuts.length&&<div className="evo-launch-category-shortcuts" aria-label="Categorias mais usadas">
                {categoryShortcuts.map(option=><button type="button" key={option.id} className={(option.id===categoryId?'active ':'')+(option.tone||'cyan')} onClick={()=>setCategoryId(option.id)}>
                  <span>{option.icon&&<EvolutionFinancialIcon name={option.icon} size={20}/>}</span><small>{option.label}</small>
                </button>)}
              </div>}
            </section>

            <section className={'evo-launch-account-taxonomy'+(accountControlsLocked?' locked':'')}>
              <header><div><span><EvolutionFinancialIcon name="landmark" size={21}/></span><strong>Conta do lançamento</strong></div>{accountControlsLocked&&<small>{mode==='expense'&&paymentMode==='credit'?'No crédito, o cartão é a origem financeira.':status==='planned'?'Definida quando o pendente for baixado.':'Definida automaticamente.'}</small>}</header>
              <div className="evo-launch-taxonomy-block">
                <span>Classificação da conta *</span>
                <div className="evo-launch-taxonomy-options three">
                  <button type="button" disabled={accountControlsLocked} className={accountClassification==='general'?'active':''} onClick={()=>selectAccountClassification('general')}><EvolutionFinancialIcon name="landmark" size={19}/><b>Contas gerais</b></button>
                  <button type="button" disabled={accountControlsLocked} className={accountClassification==='investment'?'active':''} onClick={()=>selectAccountClassification('investment')}><EvolutionFinancialIcon name="trend" size={19}/><b>Investimentos</b></button>
                  <button type="button" disabled={accountControlsLocked} className={accountClassification==='benefit'?'active benefit':''} onClick={()=>selectAccountClassification('benefit')}><EvolutionFinancialIcon name="gift" size={19}/><b>Benefício</b></button>
                </div>
              </div>
              <div className="evo-launch-taxonomy-block">
                <span>Tipo de conta *</span>
                <div className="evo-launch-taxonomy-options two">
                  <button type="button" disabled={accountControlsLocked} className={accountKind==='monetary'?'active':''} onClick={()=>selectAccountKind('monetary')}><EvolutionFinancialIcon name="wallet" size={19}/><b>Conta monetária</b></button>
                  <button type="button" disabled={accountControlsLocked} className={accountKind==='benefit'?'active benefit':''} onClick={()=>selectAccountKind('benefit')}><EvolutionFinancialIcon name="gift" size={19}/><b>Conta benefício</b></button>
                </div>
              </div>
              {mode==='expense'&&paymentMode==='credit'
                ?<div className="evo-launch-account-credit-note"><EvolutionFinancialIcon name="card" size={19}/><span>Compra no crédito: a conta monetária não é debitada agora. O lançamento nasce na fatura do cartão selecionado.</span></div>
                :<EvolutionPicker label={mode==='income'?'Conta de recebimento *':'Conta *'} value={accountId} options={accountOptions} disabled={mode==='expense'&&status==='planned'} lockedText="Definida na baixa" placeholder={accountOptions.length?'Selecione a conta':'Nenhuma conta nesta classificação'} onChange={setAccountId}/>}
            </section>

            <div className="evo-launch-data-grid">
              <label className="evo-launch-field"><span><EvolutionFinancialIcon name="calendar" size={20}/>{mode==='income'?'Data do recebimento':paymentMode==='credit'?'Data da compra':status==='planned'?'Vencimento':'Data do lançamento'} *</span><input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
              <label className="evo-launch-field"><span><EvolutionFinancialIcon name="banknote" size={20}/>Valor *</span><div className="evo-launch-money"><b>R$</b><input inputMode="numeric" value={amount} onChange={event=>setAmount(formatCurrencyInput(event.target.value))} placeholder="0,00"/></div></label>
            </div>

            <label className="evo-launch-field wide evo-launch-notes"><span><EvolutionFinancialIcon name="note" size={20}/>Observações <small>(opcional)</small></span><textarea rows={3} maxLength={300} value={notes} onChange={event=>setNotes(event.target.value.toLocaleUpperCase('pt-BR'))} placeholder="Informações adicionais do lançamento"/><small className="evo-launch-counter">{notes.length}/300</small></label>
          </section>

          <aside className="evo-launch-form-side">
            {mode==='expense'&&<section className="evo-launch-side-section evo-launch-payment-panel">
              <header><span><EvolutionFinancialIcon name="card" size={20}/></span><div><strong>Forma do lançamento</strong><small>Escolha como a despesa será registrada.</small></div></header>
              <span className="evo-launch-side-label">Modalidade de pagamento</span>
              <div className="evo-launch-payment-modes app-pattern">
                <button type="button" className={paymentMode==='cash'?'active':''} onClick={()=>setPaymentMode('cash')}><EvolutionFinancialIcon name="banknote" size={19}/><span>À Vista</span></button>
                <button type="button" className={paymentMode==='credit'?'active':''} onClick={()=>setPaymentMode('credit')}><EvolutionFinancialIcon name="card" size={19}/><span>Crédito</span></button>
              </div>
            </section>}

            {mode==='benefit'?<section className="evo-launch-auto-card">
              <header><span><EvolutionFinancialIcon name="gift" size={22}/></span><div><strong>Campos automáticos</strong><small>Alimentação / Verocard</small></div></header>
              <p>Conta, forma de pagamento e situação são definidos automaticamente para manter a mesma regra do aplicativo.</p>
              <dl>
                <div><dt>Classificação</dt><dd>Benefício</dd></div>
                <div><dt>Conta</dt><dd>{benefitAccount?.name||'Conta Benefício (Verocard)'}</dd></div>
                <div><dt>Forma</dt><dd>{verocard?.name||'VEROCARD'}</dd></div>
                <div><dt>Situação</dt><dd className="paid">Pago</dd></div>
              </dl>
            </section>:mode==='expense'&&paymentMode==='credit'?<section className="evo-launch-credit-stack">
              <EvolutionPicker label="Cartão de crédito *" value={cardId} options={cardOptions} placeholder="Selecione o cartão" onChange={setCardId}/>
              {selectedCard&&<div className="evo-launch-card-context">
                {cardArtwork(selectedCard.name)&&<img src={cardArtwork(selectedCard.name)} alt=""/>}
                <div><small>Fatura / Competência</small><strong>{cardSchedule[0]?formatMonth(cardSchedule[0].statementMonth):'Selecione a data'}</strong><span>{cardSchedule[0]?'Vence '+formatIso(cardSchedule[0].due):'Regra calculada pelo cartão'}</span></div>
              </div>}
              <section className="evo-launch-installments">
                <span className="evo-launch-side-label">Parcelamento</span>
                <div className="evo-launch-stepper"><button type="button" aria-label="Diminuir parcelas" onClick={()=>setInstallments(value=>Math.max(1,value-1))}>−</button><strong>{installments}</strong><button type="button" aria-label="Aumentar parcelas" onClick={()=>setInstallments(value=>Math.min(48,value+1))}>+</button></div>
                {installments===1?<div className="evo-launch-single-due"><span>Primeiro vencimento</span><strong>{cardSchedule[0]?formatIso(cardSchedule[0].due):'Selecione cartão e data'}</strong></div>:<button type="button" className="evo-launch-preview-trigger" disabled={!installmentPreview.length} onClick={()=>setPreviewOpen(true)}><span>Visualizar parcelas</span><small>{installmentPreview.length?installmentPreview.length+' parcelas calculadas':'Informe o valor para calcular'}</small></button>}
              </section>
            </section>:<section className="evo-launch-cash-stack">
              <EvolutionPicker label={mode==='income'?'Forma de recebimento *':'Forma de pagamento *'} value={paymentMethodId} options={methodOptions} disabled={mode==='expense'&&status==='planned'} lockedText="Definida na baixa" onChange={setPaymentMethodId}/>
            </section>}

            {mode==='expense'&&paymentMode==='cash'&&<section className="evo-launch-side-section">
              <span className="evo-launch-side-label">Situação</span>
              <div className="evo-launch-status app-pattern"><button type="button" className={status==='paid'?'active paid':''} onClick={()=>setStatus('paid')}><EvolutionFinancialIcon name="check-line" size={18}/>Pago</button><button type="button" className={status==='planned'?'active planned':''} onClick={()=>{setStatus('planned');setAccountId('');setPaymentMethodId('')}}><EvolutionFinancialIcon name="clock" size={18}/>Pendente</button></div>
              {status==='planned'&&<div className="evo-launch-pending-note"><EvolutionFinancialIcon name="wallet" size={18}/><span>Será incluído em Pendentes. Conta e forma de pagamento serão definidas na baixa.</span></div>}
            </section>}

            <section className="evo-launch-live-summary evo-launch-summary-detailed">
              <header><span className={'icon '+mode}><EvolutionFinancialIcon name={mode==='expense'?'receipt':mode==='income'?'up':'gift'} size={22}/></span><div><strong>Resumo do lançamento</strong><small>Confira os detalhes antes de salvar.</small></div></header>
              <b className="evo-launch-summary-amount">{parseAmount(amount)?money.format(parseAmount(amount)):'R$ 0,00'}</b>
              <div className="evo-launch-summary-rows">
                <div><span><EvolutionFinancialIcon name={selectedCategoryIcon} size={18}/>Categoria</span><strong>{selectedCategory?.name||'Não selecionada'}</strong></div>
                <div><span><EvolutionFinancialIcon name="landmark" size={18}/>Classificação</span><strong>{summaryClassification}</strong></div>
                <div><span><EvolutionFinancialIcon name={selectedAccountKind==='benefit'?'gift':'wallet'} size={18}/>Tipo de conta</span><strong>{summaryAccountKind}</strong></div>
                <div><span><EvolutionFinancialIcon name={mode==='expense'&&paymentMode==='credit'?'card':selectedAccountClassification==='investment'?'trend':selectedAccountClassification==='benefit'?'gift':'landmark'} size={18}/>Origem</span><strong>{summaryAccount}</strong></div>
                <div><span><EvolutionFinancialIcon name={paymentMode==='credit'?'card':selectedMethod?paymentIcon(selectedMethod):'wallet'} size={18}/>Forma</span><strong>{summaryPayment}</strong></div>
                <div><span><EvolutionFinancialIcon name="calendar" size={18}/>Data</span><strong>{formatIso(date)}</strong></div>
                <div><span><EvolutionFinancialIcon name={summaryStatus==='Pago'?'check-line':'clock'} size={18}/>Status</span><strong>{summaryStatus}</strong></div>
                {mode==='expense'&&paymentMode==='credit'&&<div><span><EvolutionFinancialIcon name="list" size={18}/>Parcelamento</span><strong>{installments}x{parseAmount(amount)>0?' de '+money.format(parseAmount(amount)/Math.max(1,installments)):''}</strong></div>}
              </div>
            </section>

            {!!categoryShortcuts.length&&<section className="evo-launch-quick-categories">
              <header><span><EvolutionFinancialIcon name="bolt" size={20}/></span><div><strong>Categorias mais usadas</strong><small>Preencha a categoria com um clique.</small></div></header>
              <div>{categoryShortcuts.slice(0,5).map(option=><button type="button" key={option.id} className={(option.id===categoryId?'active ':'')+(option.tone||'cyan')} onClick={()=>setCategoryId(option.id)}>{option.icon&&<EvolutionFinancialIcon name={option.icon} size={19}/>}<span>{option.label}</span></button>)}</div>
            </section>}
          </aside>
        </main>

        {message&&<div className="evo-launch-message" role="status">{message}</div>}
        <footer className="evo-launch-actions">
          <button type="button" className="cancel" disabled={busy} onClick={()=>setStep('choose')}><EvolutionFinancialIcon name="chevron-left" size={20}/>Voltar</button>
          <button type="button" className="save" disabled={busy||qaMode} onClick={()=>void save()}><EvolutionFinancialIcon name="check-line" size={21}/>{busy?'Salvando…':'Salvar lançamento'}</button>
        </footer>
      </>}

      {step==='success'&&<main className="evo-launch-success">
        <div className="evo-launch-success-ring"><EvolutionFinancialIcon name="check-line" size={42}/></div>
        <small>LANÇAMENTO SALVO</small>
        <h3>Tudo certo!</h3>
        <section><span className={'icon '+mode}><EvolutionFinancialIcon name={mode==='expense'?'wallet':mode==='income'?'up':'food'} size={24}/></span><div><strong>{description}</strong><b>{money.format(parseAmount(amount))}</b><small>{[badgeLabel,selectedCategory?.name,status==='planned'?'Pendente':'Pago'].filter(Boolean).join(' · ')}</small></div></section>
        <button type="button" className="primary" onClick={resetForNew}>Novo lançamento</button>
        <button type="button" className="ghost" onClick={()=>{onSaved();onClose()}}>Voltar para Início</button>
      </main>}

      {previewOpen&&<div className="evo-installment-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPreviewOpen(false)}}>
        <section className="evo-installment-dialog" role="dialog" aria-modal="true" aria-label="Parcelas do lançamento">
          <header><div><small>PARCELAMENTO</small><h3>Parcelas do lançamento</h3></div><button type="button" onClick={()=>setPreviewOpen(false)}><EvolutionFinancialIcon name="x" size={18}/></button></header>
          <div className="evo-installment-list" data-meg-scroll-region="true">
            {installmentPreview.map(item=><article key={item.number}><span><strong>Parcela {item.number}/{installmentPreview.length}</strong><small>Fatura {formatMonth(item.statementMonth)} · vence {formatIso(item.due)}</small></span><b>{money.format(item.amount)}</b></article>)}
          </div>
          <footer><span><small>Total</small><strong>{money.format(installmentPreview.reduce((sum,item)=>sum+item.amount,0))}</strong></span><button type="button" onClick={()=>setPreviewOpen(false)}>Editar parcelas</button></footer>
        </section>
      </div>}
    </section>
  </div>;
}
