import { useEffect, useMemo, useState } from 'react';
import { financeClient, type FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../../phoenix/contracts';
import {
  phoenixWriteMessage,
  runPhoenixBenefitEventEdit,
  runPhoenixCardPurchaseCancel,
  runPhoenixCardPurchaseEdit,
  runPhoenixSimpleEventArchive,
  runPhoenixSimpleEventEdit,
  type PhoenixCardPurchaseInput,
  type PhoenixSimpleEventFlow,
  type PhoenixSimpleEventInput,
} from '../../phoenix/data/phoenix-write-gateway';
import type { PhoenixTransferInput } from '../../phoenix/data/phoenix-transfer-write-gateway';
import {
  cardDueDateForPurchase,
  cardDueDateForStatement,
  cardMonthPlus,
  cardStatementMonthForPurchase,
} from '../../phoenix/data/card-dates';
import { WebNextIcon } from './WebNextIcon';
import { WebNextLaunchWriteControl } from './WebNextLaunchWriteControl';
import '../styles/launch-editor.css';

export type WebNextLaunchPreset = 'expense' | 'income' | 'benefit' | 'transfer';

type TxType = 'expense' | 'income' | 'transfer';
type PaymentMode = 'cash' | 'credit' | 'crediario' | 'benefit';
type Situation = 'planned' | 'paid';

type Draft = {
  type: TxType;
  description: string;
  date: string;
  accountId: string;
  destinationId: string;
  classification: string;
  categoryId: string;
  paymentMethodId: string;
  cardId: string;
  installments: number;
  situation: Situation;
  notes: string;
  recurring: boolean;
  recurrenceCount: number;
  saveTemplate: boolean;
  templateName: string;
};

const money = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });

function normalize(value?: string | null) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

function saoPauloDay() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(new Date());
  const get = (type:string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function initialDraft(type:TxType='expense'):Draft {
  return {
    type,
    description:'',
    date:saoPauloDay(),
    accountId:'',
    destinationId:'',
    classification:'',
    categoryId:'',
    paymentMethodId:'',
    cardId:'',
    installments:1,
    situation:type === 'income' ? 'paid' : 'planned',
    notes:'',
    recurring:false,
    recurrenceCount:12,
    saveTemplate:false,
    templateName:'',
  };
}

function launchType(event:FinancialEvent):TxType {
  if (event.type === 'income' || event.type === 'redemption') return 'income';
  if (event.type === 'transfer') return 'transfer';
  return 'expense';
}

function isCreditMethod(name?:string|null,type?:string|null) {
  const value=normalize(`${name || ''} ${type || ''}`);
  return value.includes('credito') || value.includes('cartao');
}

function isCrediarioMethod(name?:string|null,type?:string|null) {
  return normalize(`${name || ''} ${type || ''}`).includes('crediario');
}

function isPixMethod(name?:string|null,type?:string|null) {
  return normalize(`${name || ''} ${type || ''}`).includes('pix');
}

function isBenefitEvent(event:FinancialEvent) {
  const account=normalize(`${event.account?.name || ''} ${event.account?.type || ''}`);
  const payment=normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`);
  return account.includes('benef') || account.includes('verocard') || account.includes('alimentacao') || payment.includes('verocard');
}

function cardMeta(event:FinancialEvent) {
  const payload=event.sourcePayload;
  if (!payload || typeof payload !== 'object' || payload.cardDomain !== true) return null;
  const cardId=String(payload.cardId || '').trim();
  const purchaseId=String(payload.purchaseId || '').trim();
  if (!cardId || !purchaseId) return null;
  return { cardId, purchaseId, purchaseDate:String(payload.purchaseDate || '').slice(0,10) };
}

function eventAmount(event:FinancialEvent) {
  const signed=Number(event.signedAmount);
  const amount=Math.abs(Number(event.amount || 0));
  return Number.isFinite(signed) && signed !== 0 ? signed : launchType(event) === 'income' ? amount : -amount;
}

function centsFromInput(value:string) {
  return Math.min(999999999999, Number(value.replace(/\D/g,'') || 0));
}

function formatMoneyInput(cents:number,negative:boolean) {
  return money.format((negative ? -1 : 1) * cents / 100);
}

function formatIsoDate(value:string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? shortDate.format(new Date(`${value}T12:00:00Z`))
    : value || '—';
}

export function WebNextLaunchEditor({
  data,
  launchRequest,
  launchPreset,
  editEventRequest,
  onDataCommitted,
}:{
  data:PhoenixReadModel;
  launchRequest:number;
  launchPreset:WebNextLaunchPreset;
  editEventRequest:string;
  onDataCommitted?:(snapshot:PhoenixReadModel)=>void;
}) {
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState<Draft>(()=>initialDraft());
  const [paymentMode,setPaymentMode]=useState<PaymentMode>('cash');
  const [amountCents,setAmountCents]=useState(0);
  const [negative,setNegative]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editingUpdatedAt,setEditingUpdatedAt]=useState<string|null>(null);
  const [reviewed,setReviewed]=useState(false);
  const [validationVisible,setValidationVisible]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [discardOpen,setDiscardOpen]=useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [settlementOpen,setSettlementOpen]=useState(false);
  const [installmentsOpen,setInstallmentsOpen]=useState(false);
  const [advancedOpen,setAdvancedOpen]=useState(false);
  const [transferBalance,setTransferBalance]=useState<{ available:number; loading:boolean; error:string }>({ available:0, loading:false, error:'' });

  const activeAccounts=useMemo(()=>data.accounts.filter((item)=>item.isActive),[data.accounts]);
  const activeMethods=useMemo(()=>data.paymentMethods.filter((item)=>item.isActive),[data.paymentMethods]);
  const activeCards=useMemo(()=>data.cards.filter((item)=>item.isActive),[data.cards]);
  const benefitAccount=activeAccounts.find((item)=>item.type === 'benefit' || normalize(item.name).includes('benef')) || null;
  const verocardMethod=activeMethods.find((item)=>normalize(item.name).includes('verocard')) || null;

  const expenseCategories=useMemo(
    ()=>data.categories.filter((item)=>item.isActive && (!item.type || item.type === 'expense')),
    [data.categories]
  );
  const incomeCategories=useMemo(
    ()=>data.categories.filter((item)=>item.isActive && (!item.type || item.type === 'income')).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),
    [data.categories]
  );
  const classifications=useMemo(()=>{
    const values=new Map<string,string>();
    expenseCategories.forEach((item)=>{
      const label=String(item.group || '').trim();
      if(label) values.set(normalize(label),label);
    });
    return [...values.values()].sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'}));
  },[expenseCategories]);
  const groups=useMemo(
    ()=>expenseCategories
      .filter((item)=>normalize(item.group) === normalize(draft.classification))
      .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'})),
    [expenseCategories,draft.classification]
  );

  const cashMethods=useMemo(()=>activeMethods.filter((item)=>
    !isCreditMethod(item.name,item.type)
    && !isCrediarioMethod(item.name,item.type)
    && !normalize(item.name).includes('verocard')
  ),[activeMethods]);
  const crediarioMethods=useMemo(()=>activeMethods.filter((item)=>isCrediarioMethod(item.name,item.type)),[activeMethods]);

  const selectedAccount=activeAccounts.find((item)=>item.id === draft.accountId) || null;
  const selectedDestination=activeAccounts.find((item)=>item.id === draft.destinationId) || null;
  const selectedMethod=activeMethods.find((item)=>item.id === draft.paymentMethodId) || null;
  const selectedCard=activeCards.find((item)=>item.id === draft.cardId) || null;
  const editingEvent=editingId ? data.events.items.find((item)=>item.id === editingId) || null : null;
  const editingCardMeta=editingEvent ? cardMeta(editingEvent) : null;
  const editingBenefit=Boolean(editingEvent && isBenefitEvent(editingEvent));

  const benefit=paymentMode === 'benefit';
  const credit=paymentMode === 'credit';
  const crediario=paymentMode === 'crediario';
  const pix=draft.type === 'expense' && paymentMode === 'cash' && isPixMethod(selectedMethod?.name,selectedMethod?.type);
  const effectiveSituation:Situation=draft.type === 'income' ? 'paid' : credit ? 'planned' : benefit ? 'paid' : pix ? 'paid' : draft.situation;

  const calculatedDue=selectedCard ? cardDueDateForPurchase(draft.date,selectedCard.closingDay,selectedCard.dueDay) : '';
  const installmentPreview=useMemo(()=>{
    const qty=Math.max(1,Math.min(credit ? 48 : 120,Number(draft.installments || 1)));
    const base=Math.floor(amountCents/qty);
    const remainder=amountCents-base*qty;
    const statement=selectedCard ? cardStatementMonthForPurchase(draft.date,selectedCard.closingDay) : '';
    return Array.from({length:qty},(_,index)=>{
      const cents=base+(index<remainder ? 1 : 0);
      const due=credit && selectedCard && statement
        ? cardDueDateForStatement(cardMonthPlus(statement,index),selectedCard.closingDay,selectedCard.dueDay)
        : '';
      return { number:index+1,cents,due };
    });
  },[draft.installments,draft.date,amountCents,credit,selectedCard]);

  const descriptionMatches=useMemo(()=>{
    const needle=normalize(draft.description);
    const seen=new Set<string>();
    return data.events.items
      .filter((event)=>{
        const key=normalize(event.description);
        if(!key || seen.has(key)) return false;
        if(needle && !key.includes(needle)) return false;
        seen.add(key);
        return true;
      })
      .slice(0,6);
  },[data.events.items,draft.description]);

  const update=<K extends keyof Draft>(key:K,value:Draft[K])=>{
    setDraft((current)=>({...current,[key]:value}));
    setDirty(true);
    setReviewed(false);
    setMessage('');
  };

  const reset=()=>{
    setDraft(initialDraft());
    setPaymentMode('cash');
    setAmountCents(0);
    setNegative(false);
    setEditingId(null);
    setEditingUpdatedAt(null);
    setReviewed(false);
    setValidationVisible(false);
    setDirty(false);
    setBusy(false);
    setMessage('');
    setDiscardOpen(false);
    setDeleteOpen(false);
    setSettlementOpen(false);
    setInstallmentsOpen(false);
    setAdvancedOpen(false);
    setTransferBalance({available:0,loading:false,error:''});
  };

  const closeNow=()=>{
    setOpen(false);
    reset();
  };

  const requestClose=()=>{
    if(busy) {
      setMessage('A operação já foi enviada. Aguarde a confirmação do servidor.');
      return;
    }
    if(dirty) {
      setDiscardOpen(true);
      return;
    }
    closeNow();
  };

  const applyPreset=(preset:WebNextLaunchPreset)=>{
    reset();
    const type:TxType=preset === 'income' ? 'income' : preset === 'transfer' ? 'transfer' : 'expense';
    setDraft({
      ...initialDraft(type),
      accountId:preset === 'benefit' ? benefitAccount?.id || '' : '',
      paymentMethodId:preset === 'benefit' ? verocardMethod?.id || '' : '',
      situation:preset === 'benefit' || preset === 'income' ? 'paid' : 'planned',
    });
    setPaymentMode(preset === 'benefit' ? 'benefit' : 'cash');
    setOpen(true);
  };

  const loadEvent=(event:FinancialEvent)=>{
    reset();
    const type=launchType(event);
    const meta=cardMeta(event);
    const card=meta ? data.cards.find((item)=>item.id === meta.cardId) || null : null;
    const purchase=meta && card ? card.purchases.find((item)=>item.id === meta.purchaseId) || null : null;
    const benefitEvent=isBenefitEvent(event);
    const method=event.paymentMethod;
    const mode:PaymentMode=purchase ? 'credit' : benefitEvent ? 'benefit' : isCrediarioMethod(method?.name,method?.type) ? 'crediario' : 'cash';
    const categoryId=purchase?.category?.id || event.categoryId || '';
    const category=data.categories.find((item)=>item.id === categoryId) || event.category || null;
    const rawAmount=purchase ? Math.abs(Number(purchase.totalAmount || 0)) : Math.abs(Number(event.amount || eventAmount(event)));

    setDraft({
      ...initialDraft(type),
      description:purchase?.description || event.description,
      date:purchase ? String(purchase.purchaseDate).slice(0,10) : event.date.slice(0,10),
      accountId:purchase ? '' : event.accountId || '',
      classification:type === 'expense' ? String(category?.group || event.sourceDetails?.expenseClass || '') : '',
      categoryId,
      paymentMethodId:benefitEvent ? verocardMethod?.id || event.paymentMethodId || '' : event.paymentMethodId || '',
      cardId:meta?.cardId || '',
      installments:purchase ? Math.max(1,Number(purchase.installments || 1)) : 1,
      situation:type === 'income' ? 'paid' : event.status === 'planned' ? 'planned' : 'paid',
      notes:purchase ? '' : event.notes || '',
      recurring:false,
      recurrenceCount:12,
      saveTemplate:false,
      templateName:'',
      destinationId:'',
    });
    setPaymentMode(mode);
    setAmountCents(Math.round(rawAmount*100));
    setNegative(!purchase && eventAmount(event)<0);
    setEditingId(event.id);
    setEditingUpdatedAt(event.updatedAt || null);
    setOpen(true);
  };

  useEffect(()=>{
    if(launchRequest<=0) return;
    applyPreset(launchPreset);
  },[launchRequest,launchPreset]);

  useEffect(()=>{
    if(!editEventRequest) return;
    const event=data.events.items.find((item)=>item.id === editEventRequest);
    if(event) loadEvent(event);
  },[editEventRequest]);

  useEffect(()=>{
    if(!open || draft.type !== 'transfer' || !draft.accountId || !draft.date) {
      setTransferBalance({available:0,loading:false,error:''});
      return;
    }
    const account=activeAccounts.find((item)=>item.id === draft.accountId);
    if(!account || account.type === 'benefit') return;
    let active=true;
    setTransferBalance((current)=>({...current,loading:true,error:''}));
    void financeClient.getMonetaryBalance(draft.accountId,draft.date)
      .then((result)=>{
        if(!active) return;
        setTransferBalance({available:Number(result.available || 0),loading:false,error:''});
      })
      .catch(()=>{
        if(!active) return;
        setTransferBalance({available:0,loading:false,error:'Não foi possível consultar o saldo da conta de origem.'});
      });
    return ()=>{active=false;};
  },[open,draft.type,draft.accountId,draft.date,activeAccounts]);

  useEffect(()=>{
    if(!open) return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.key !== 'Escape') return;
      if(installmentsOpen) setInstallmentsOpen(false);
      else if(deleteOpen) setDeleteOpen(false);
      else if(settlementOpen) setSettlementOpen(false);
      else if(discardOpen) setDiscardOpen(false);
      else requestClose();
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[open,installmentsOpen,deleteOpen,settlementOpen,discardOpen,dirty,busy]);

  const selectPaymentMode=(mode:PaymentMode)=>{
    setPaymentMode(mode);
    setReviewed(false);
    setDirty(true);
    setMessage('');
    setNegative(false);
    if(mode === 'benefit') {
      setDraft((current)=>({
        ...current,
        accountId:benefitAccount?.id || '',
        paymentMethodId:verocardMethod?.id || '',
        cardId:'',
        installments:1,
        situation:'paid',
      }));
      return;
    }
    if(mode === 'credit') {
      setDraft((current)=>({...current,accountId:'',paymentMethodId:'',installments:Math.max(1,current.installments),situation:'planned'}));
      return;
    }
    if(mode === 'crediario') {
      setDraft((current)=>({...current,cardId:'',paymentMethodId:crediarioMethods[0]?.id || '',situation:'planned'}));
      return;
    }
    setDraft((current)=>({...current,cardId:'',installments:1,paymentMethodId:cashMethods.some((item)=>item.id === current.paymentMethodId) ? current.paymentMethodId : ''}));
  };

  const applyHistory=(event:FinancialEvent)=>{
    const meta=cardMeta(event);
    const category=event.category || data.categories.find((item)=>item.id === event.categoryId) || null;
    setDraft((current)=>({
      ...current,
      description:event.description,
      accountId:meta ? '' : event.accountId || current.accountId,
      classification:current.type === 'expense' ? String(category?.group || event.sourceDetails?.expenseClass || current.classification) : current.classification,
      categoryId:category?.id || current.categoryId,
      paymentMethodId:meta ? '' : event.paymentMethodId || current.paymentMethodId,
      cardId:meta?.cardId || current.cardId,
    }));
    if(meta) setPaymentMode('credit');
    else if(isBenefitEvent(event)) setPaymentMode('benefit');
    else if(isCrediarioMethod(event.paymentMethod?.name,event.paymentMethod?.type)) setPaymentMode('crediario');
    setDirty(true);
    setReviewed(false);
  };

  const missing=useMemo(()=>{
    const list:string[]=[];
    if(!draft.description.trim()) list.push('Descrição');
    if(!draft.date) list.push('Data');
    if(!amountCents) list.push('Valor');
    if(draft.type === 'transfer') {
      if(!draft.accountId) list.push('Conta de origem');
      if(!draft.destinationId) list.push('Conta de destino');
      if(draft.accountId && draft.destinationId && draft.accountId === draft.destinationId) list.push('Contas diferentes');
      if(selectedAccount?.type === 'benefit' || selectedDestination?.type === 'benefit') list.push('Contas monetárias');
      if(transferBalance.error) list.push('Saldo da origem');
      if(amountCents/100 > transferBalance.available && !transferBalance.loading) list.push('Saldo suficiente');
      return list;
    }
    if(draft.type === 'expense' && !draft.categoryId) list.push('Categoria');
    if(credit) {
      if(!draft.cardId) list.push('Cartão');
      if(draft.installments<1 || draft.installments>48) list.push('Parcelas');
      return list;
    }
    if(!draft.accountId) list.push('Conta');
    if(!draft.paymentMethodId) list.push(draft.type === 'income' ? 'Forma de recebimento' : 'Forma de pagamento');
    if(benefit && (!benefitAccount || !verocardMethod)) list.push('Configuração do benefício');
    if(draft.recurring && draft.recurrenceCount<2) list.push('Recorrência');
    if(draft.saveTemplate && !draft.templateName.trim()) list.push('Nome do modelo');
    return list;
  },[draft,amountCents,credit,benefit,benefitAccount,verocardMethod,selectedAccount?.type,selectedDestination?.type,transferBalance]);

  const simpleInput=useMemo<PhoenixSimpleEventInput|null>(()=>{
    if(draft.type === 'transfer') return null;
    return {
      type:draft.type,
      status:effectiveSituation,
      description:draft.description,
      date:draft.date,
      competence:draft.date.slice(0,7),
      amount:(negative ? -1 : 1)*amountCents/100,
      accountId:draft.accountId,
      categoryId:draft.categoryId || undefined,
      paymentMethodId:draft.paymentMethodId,
      notes:draft.notes || undefined,
    };
  },[draft,effectiveSituation,negative,amountCents]);

  const cardInput=useMemo<PhoenixCardPurchaseInput|null>(()=>{
    if(draft.type !== 'expense' || !credit) return null;
    return {
      cardId:draft.cardId,
      categoryId:draft.categoryId || undefined,
      description:draft.description,
      totalAmount:amountCents/100,
      purchaseDate:draft.date,
      installments:draft.installments,
    };
  },[draft,credit,amountCents]);

  const transferInput=useMemo<PhoenixTransferInput|null>(()=>{
    if(draft.type !== 'transfer') return null;
    return {
      sourceAccountId:draft.accountId,
      destinationAccountId:draft.destinationId,
      amount:amountCents/100,
      date:draft.date,
      description:draft.description,
      notes:draft.notes || undefined,
    };
  },[draft,amountCents]);

  const flow=useMemo<PhoenixSimpleEventFlow>(()=>({
    type:draft.type,
    negative,
    benefit,
    credit,
    crediario,
    recurring:draft.recurring,
    saveTemplate:draft.saveTemplate,
    installments:draft.installments,
    manualDue:false,
  }),[draft.type,draft.recurring,draft.saveTemplate,draft.installments,negative,benefit,credit,crediario]);

  const duplicateMessage=useMemo(()=>{
    if(!draft.description.trim() || !draft.date || !amountCents) return null;
    const target=normalize(draft.description);
    if(credit) {
      const match=data.events.items.find((event)=>{
        if(event.id === editingId) return false;
        const meta=cardMeta(event);
        return meta
          && meta.cardId === draft.cardId
          && meta.purchaseDate === draft.date
          && normalize(event.description) === target
          && Math.round(Math.abs(Number(event.amount || 0))*100) === amountCents;
      });
      return match ? `Possível duplicidade: ${match.description}, ${money.format(amountCents/100)}, em ${formatIsoDate(draft.date)}.` : null;
    }
    if(!draft.accountId) return null;
    const expected=(negative ? -1 : 1)*amountCents;
    const match=data.events.items.find((event)=>event.id !== editingId
      && normalize(event.description) === target
      && event.accountId === draft.accountId
      && event.date.slice(0,10) === draft.date
      && Math.round(eventAmount(event)*100) === expected);
    return match ? `Possível duplicidade: ${match.description}, ${money.format(amountCents/100)}, em ${formatIsoDate(draft.date)}.` : null;
  },[data.events.items,draft.description,draft.date,draft.accountId,draft.cardId,amountCents,negative,credit,editingId]);

  const review=()=>{
    if(missing.length) {
      setValidationVisible(true);
      setMessage(`Revise: ${missing.join(', ')}.`);
      return;
    }
    setValidationVisible(false);
    setMessage('');
    setReviewed(true);
  };

  const saveEdit=async()=>{
    if(!editingEvent || missing.length || busy) return;
    if(editingEvent.type === 'transfer') {
      setMessage('Transferências confirmadas não são editadas. Para corrigir, registre a operação inversa.');
      return;
    }
    if(crediario || draft.recurring || draft.saveTemplate || (!credit && draft.installments>1)) {
      setMessage('Este fluxo avançado permanece protegido e não pode ser alterado por edição direta.');
      return;
    }
    setBusy(true);
    setMessage('Salvando alteração…');
    try {
      if(editingCardMeta) {
        if(!cardInput) return;
        const result=await runPhoenixCardPurchaseEdit(
          editingCardMeta.purchaseId,
          cardInput,
          data.month,
          ()=>closeNow(),
        );
        if(result.snapshot) onDataCommitted?.(result.snapshot);
        return;
      }
      if(!simpleInput) return;
      const accepted=()=>closeNow();
      const result=editingBenefit
        ? await runPhoenixBenefitEventEdit(
            editingEvent.id,
            {...simpleInput,status:'paid',amount:Math.abs(simpleInput.amount)},
            data.month,
            editingUpdatedAt || undefined,
            accepted,
          )
        : await runPhoenixSimpleEventEdit(
            editingEvent.id,
            simpleInput,
            data.month,
            editingUpdatedAt || undefined,
            accepted,
          );
      if(result.snapshot) onDataCommitted?.(result.snapshot);
    } catch(error) {
      const code=error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setMessage(code.includes('CARD_PURCHASE_ALREADY_PAID')
        ? 'Esta compra possui parcela já paga e foi protegida contra alteração.'
        : phoenixWriteMessage(code));
    } finally {
      setBusy(false);
    }
  };

  const requestSaveEdit=()=>{
    if(missing.length) {
      setValidationVisible(true);
      setMessage(`Revise: ${missing.join(', ')}.`);
      return;
    }
    if(editingEvent?.status === 'planned' && effectiveSituation === 'paid' && !editingCardMeta) {
      setSettlementOpen(true);
      return;
    }
    void saveEdit();
  };

  const deleteEvent=async()=>{
    if(!editingEvent || busy || !['ADMIN','MANAGER'].includes(data.user.role)) return;
    setBusy(true);
    setMessage('');
    try {
      if(editingCardMeta) {
        const result=await runPhoenixCardPurchaseCancel(editingCardMeta.purchaseId,data.month,()=>closeNow());
        if(result.snapshot) onDataCommitted?.(result.snapshot);
      } else {
        const result=await runPhoenixSimpleEventArchive(editingEvent.id,data.month,editingUpdatedAt || undefined,()=>closeNow());
        if(result.snapshot) onDataCommitted?.(result.snapshot);
      }
    } catch(error) {
      const code=error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setDeleteOpen(false);
      setMessage(code.includes('CARD_PURCHASE_ALREADY_PAID')
        ? 'Esta compra possui parcela já paga e foi protegida contra exclusão.'
        : phoenixWriteMessage(code));
    } finally {
      setBusy(false);
    }
  };

  if(!open) return null;

  const transferMissing=Math.max(0,amountCents/100-transferBalance.available);
  const title=editingId ? 'Editar lançamento' : draft.type === 'transfer' ? 'Nova transferência' : draft.type === 'income' ? 'Nova receita' : benefit ? 'Novo lançamento de benefício' : 'Nova despesa';

  return <div className="mnx-editor-overlay" data-web-next-overlay="launch-editor">
    <button className="mnx-editor-backdrop" type="button" aria-label="Fechar editor" onClick={requestClose}/>
    <section className="mnx-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="mnx-editor-title">
      <header className="mnx-editor-head">
        <div className="mnx-editor-head-mark"><WebNextIcon name={draft.type === 'income' ? 'receivables' : draft.type === 'transfer' ? 'cashflow' : benefit ? 'food' : 'payables'}/></div>
        <div><span>{editingId ? 'EDIÇÃO FINANCEIRA' : 'NOVO MOVIMENTO'}</span><h2 id="mnx-editor-title">{title}</h2><p>Preencha os dados. O MEG valida as regras antes de gravar.</p></div>
        <button className="mnx-editor-close" type="button" aria-label="Fechar" onClick={requestClose}>×</button>
      </header>

      <div className="mnx-editor-body">
        <div className="mnx-editor-form">
          <section className="mnx-editor-section">
            <div className="mnx-editor-section-title"><span>01</span><div><strong>Movimento</strong><small>O que está acontecendo com o dinheiro?</small></div></div>
            <div className="mnx-editor-type-tabs">
              {(['expense','income','transfer'] as TxType[]).map((type)=><button
                key={type}
                type="button"
                className={draft.type === type ? 'is-active' : ''}
                disabled={Boolean(editingId)}
                onClick={()=>{
                  update('type',type);
                  setPaymentMode('cash');
                  setDraft((current)=>({...current,type,situation:type === 'income' ? 'paid' : 'planned',accountId:'',destinationId:'',paymentMethodId:'',cardId:'',categoryId:'',classification:''}));
                }}
              ><WebNextIcon name={type === 'expense' ? 'payables' : type === 'income' ? 'receivables' : 'cashflow'}/><span>{type === 'expense' ? 'Despesa' : type === 'income' ? 'Receita' : 'Transferência'}</span></button>)}
            </div>

            <label className={`mnx-editor-field mnx-editor-description ${validationVisible && missing.includes('Descrição') ? 'is-invalid' : ''}`}>
              <span>Descrição *</span>
              <input value={draft.description} onChange={(event)=>update('description',event.target.value)} placeholder="Ex.: supermercado, salário, recarga do benefício" autoComplete="off"/>
              {draft.description.trim() && descriptionMatches.length ? <div className="mnx-editor-suggestions">
                {descriptionMatches.map((event)=><button key={event.id} type="button" onClick={()=>applyHistory(event)}><strong>{event.description}</strong><small>{event.category?.name || event.sourceDetails?.group || event.account?.name || 'Histórico'}</small></button>)}
              </div> : null}
            </label>

            <div className="mnx-editor-row">
              <label className={`mnx-editor-field ${validationVisible && missing.includes('Data') ? 'is-invalid' : ''}`}><span>{credit ? 'Data da compra *' : 'Data *'}</span><input type="date" value={draft.date} onChange={(event)=>update('date',event.target.value)}/></label>
              <label className={`mnx-editor-field is-money ${validationVisible && missing.includes('Valor') ? 'is-invalid' : ''}`}><span>Valor total *</span><input inputMode="decimal" value={formatMoneyInput(amountCents,negative)} onChange={(event)=>{setAmountCents(centsFromInput(event.target.value));setDirty(true);setReviewed(false);}}/></label>
            </div>
            {draft.type !== 'transfer' && !benefit && !credit ? <div className="mnx-editor-sign">
              <span>Sinal</span><button type="button" className={!negative ? 'is-active' : ''} onClick={()=>{setNegative(false);setDirty(true);setReviewed(false);}}>+ Normal</button><button type="button" className={negative ? 'is-active is-negative' : ''} onClick={()=>{setNegative(true);setDirty(true);setReviewed(false);}}>− Estorno</button>
            </div> : null}
          </section>

          {draft.type !== 'transfer' ? <section className="mnx-editor-section">
            <div className="mnx-editor-section-title"><span>02</span><div><strong>Forma do movimento</strong><small>Conta, pagamento e classificação.</small></div></div>

            {draft.type !== 'transfer' ? <div className="mnx-editor-payment-modes" role="group" aria-label={draft.type === 'income' ? 'Tipo de recebimento' : 'Tipo de pagamento'}>
              {([
                ['cash',draft.type === 'income' ? 'Recebimento' : 'À vista',draft.type === 'income' ? 'Pix, transferência ou crédito em conta' : 'Pix, débito, boleto ou dinheiro'],
                ...(draft.type === 'expense' ? [
                  ['credit','Crédito','Cartão e parcelamento 1–48x'],
                  ['crediario','Crediário','Parcelamento fora do cartão'],
                ] : []),
                ['benefit','Benefício',draft.type === 'income' ? 'Crédito / recarga do Verocard' : 'Verocard Alimentação'],
              ] as Array<[PaymentMode,string,string]>).map(([mode,label,detail])=><button
                key={mode}
                type="button"
                className={paymentMode === mode ? 'is-active' : ''}
                disabled={Boolean(editingId && paymentMode !== mode)}
                onClick={()=>selectPaymentMode(mode)}
              ><strong>{label}</strong><small>{detail}</small></button>)}
            </div> : null}

            {draft.type === 'expense' ? <div className="mnx-editor-row">
              <label className="mnx-editor-field"><span>Classificação *</span><select value={draft.classification} onChange={(event)=>{update('classification',event.target.value);setDraft((current)=>({...current,categoryId:''}));}}><option value="">Selecione</option>{classifications.map((item)=><option key={item} value={item}>{item}</option>)}</select></label>
              <label className={`mnx-editor-field ${validationVisible && missing.includes('Categoria') ? 'is-invalid' : ''}`}><span>Categoria / grupo *</span><select value={draft.categoryId} disabled={!draft.classification} onChange={(event)=>update('categoryId',event.target.value)}><option value="">{draft.classification ? 'Selecione' : 'Escolha a classificação'}</option>{groups.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            </div> : <label className="mnx-editor-field"><span>Classificação da receita</span><select value={draft.categoryId} onChange={(event)=>update('categoryId',event.target.value)}><option value="">Sem classificação</option>{incomeCategories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}

            {credit ? <div className="mnx-editor-credit-box">
              <label className={`mnx-editor-field ${validationVisible && missing.includes('Cartão') ? 'is-invalid' : ''}`}><span>Cartão de crédito *</span><select value={draft.cardId} onChange={(event)=>update('cardId',event.target.value)}><option value="">Selecione o cartão</option>{activeCards.map((card)=><option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
              <div className="mnx-editor-row">
                <label className="mnx-editor-field"><span>Parcelas</span><div className="mnx-editor-stepper"><button type="button" disabled={draft.installments<=1} onClick={()=>update('installments',Math.max(1,draft.installments-1))}>−</button><input type="number" min={1} max={48} value={draft.installments} onChange={(event)=>update('installments',Math.min(48,Math.max(1,Number(event.target.value)||1)))}/><button type="button" disabled={draft.installments>=48} onClick={()=>update('installments',Math.min(48,draft.installments+1))}>+</button></div></label>
                <div className="mnx-editor-calculated"><span>Vencimento calculado</span><strong>{calculatedDue ? formatIsoDate(calculatedDue) : 'Selecione o cartão'}</strong><small>Competência {calculatedDue ? calculatedDue.slice(5,7)+'/'+calculatedDue.slice(0,4) : '—'}</small></div>
              </div>
              {draft.installments>1 && amountCents ? <button className="mnx-editor-installments-link" type="button" onClick={()=>setInstallmentsOpen(true)}>Visualizar {draft.installments} parcelas</button> : null}
            </div> : benefit ? <div className="mnx-editor-benefit-box"><WebNextIcon name="food"/><div><strong>Verocard Alimentação</strong><span>Conta e forma de pagamento são definidas automaticamente.</span></div><em>{benefitAccount?.name || 'Conta benefício não configurada'} · {verocardMethod?.name || 'VEROCARD não configurado'}</em></div> : <div className="mnx-editor-row">
              <label className={`mnx-editor-field ${validationVisible && missing.includes('Conta') ? 'is-invalid' : ''}`}><span>Conta financeira *</span><select value={draft.accountId} onChange={(event)=>update('accountId',event.target.value)}><option value="">Selecione</option>{activeAccounts.filter((item)=>item.type !== 'benefit').map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="mnx-editor-field"><span>{draft.type === 'income' ? 'Forma de recebimento *' : 'Forma de pagamento *'}</span><select value={draft.paymentMethodId} onChange={(event)=>update('paymentMethodId',event.target.value)}><option value="">Selecione</option>{(crediario ? crediarioMethods : cashMethods).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            </div>}

            {draft.type === 'expense' && !credit ? <label className="mnx-editor-field is-compact"><span>Situação</span><select value={effectiveSituation} disabled={benefit || pix} onChange={(event)=>update('situation',event.target.value as Situation)}><option value="planned">Pendente</option><option value="paid">Pago</option></select><small>{benefit ? 'Benefício é registrado como pago.' : pix ? 'Pix é imediato e fica como pago.' : 'Escolha se a despesa já foi paga.'}</small></label> : null}
          </section> : <section className="mnx-editor-section">
            <div className="mnx-editor-section-title"><span>02</span><div><strong>Transferência</strong><small>Movimento real entre duas contas monetárias.</small></div></div>
            <div className="mnx-editor-transfer-grid">
              <label className="mnx-editor-field"><span>Conta de origem *</span><select value={draft.accountId} onChange={(event)=>update('accountId',event.target.value)}><option value="">Selecione</option>{activeAccounts.filter((item)=>item.type !== 'benefit').map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <span className="mnx-editor-transfer-arrow"><WebNextIcon name="cashflow"/></span>
              <label className="mnx-editor-field"><span>Conta de destino *</span><select value={draft.destinationId} onChange={(event)=>update('destinationId',event.target.value)}><option value="">Selecione</option>{activeAccounts.filter((item)=>item.type !== 'benefit' && item.id !== draft.accountId).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            </div>
            <div className={`mnx-editor-balance ${transferMissing>0 ? 'is-insufficient' : ''}`}>
              <div><span>Saldo disponível na origem</span><strong>{transferBalance.loading ? 'Consultando…' : transferBalance.error || money.format(transferBalance.available)}</strong></div>
              <div><span>Após a transferência</span><strong>{transferBalance.loading || transferBalance.error ? '—' : money.format(transferBalance.available-amountCents/100)}</strong></div>
              {transferMissing>0 && !transferBalance.loading ? <em>Faltam {money.format(transferMissing)} para concluir.</em> : null}
            </div>
          </section>}

          <section className="mnx-editor-section">
            <button className="mnx-editor-advanced-toggle" type="button" aria-expanded={advancedOpen} onClick={()=>setAdvancedOpen((value)=>!value)}><div><strong>Mais opções</strong><small>Recorrência, modelo e observações</small></div><span>{advancedOpen ? '−' : '+'}</span></button>
            {advancedOpen ? <div className="mnx-editor-advanced">
              <label className="mnx-editor-field"><span>Observações</span><textarea value={draft.notes} maxLength={500} onChange={(event)=>update('notes',event.target.value)} placeholder="Informações úteis para consulta futura"/></label>
              {draft.type !== 'transfer' && !benefit && !credit ? <>
                <label className="mnx-editor-switch"><div><strong>Lançamento recorrente</strong><small>Série protegida até o contrato atômico de recorrência.</small></div><input type="checkbox" checked={draft.recurring} onChange={(event)=>update('recurring',event.target.checked)}/></label>
                {draft.recurring ? <label className="mnx-editor-field is-compact"><span>Quantidade</span><input type="number" min={2} max={120} value={draft.recurrenceCount} onChange={(event)=>update('recurrenceCount',Number(event.target.value)||0)}/></label> : null}
                <label className="mnx-editor-switch"><div><strong>Salvar como modelo</strong><small>Mantido visível, mas protegido até o writer próprio.</small></div><input type="checkbox" checked={draft.saveTemplate} onChange={(event)=>update('saveTemplate',event.target.checked)}/></label>
                {draft.saveTemplate ? <label className="mnx-editor-field is-compact"><span>Nome do modelo</span><input value={draft.templateName} maxLength={60} onChange={(event)=>update('templateName',event.target.value)}/></label> : null}
              </> : null}
            </div> : null}
          </section>
        </div>

        <aside className="mnx-editor-summary">
          <span>RESUMO</span>
          <h3>{draft.description || 'Novo lançamento'}</h3>
          <strong className={draft.type === 'income' ? 'is-income' : draft.type === 'expense' ? 'is-expense' : 'is-transfer'}>{formatMoneyInput(amountCents,negative)}</strong>
          <div><span>Tipo</span><b>{draft.type === 'income' ? 'Receita' : draft.type === 'expense' ? 'Despesa' : 'Transferência'}</b></div>
          <div><span>Data</span><b>{formatIsoDate(draft.date)}</b></div>
          {draft.type !== 'transfer' ? <><div><span>Modalidade</span><b>{benefit ? 'Benefício' : credit ? 'Cartão de crédito' : crediario ? 'Crediário' : 'À vista'}</b></div><div><span>Situação</span><b>{effectiveSituation === 'paid' ? draft.type === 'income' ? 'Recebida' : 'Pago' : 'Pendente'}</b></div></> : <><div><span>Origem</span><b>{selectedAccount?.name || '—'}</b></div><div><span>Destino</span><b>{selectedDestination?.name || '—'}</b></div></>}
          {credit ? <div><span>Parcelamento</span><b>{draft.installments}x · {selectedCard?.name || 'Cartão não selecionado'}</b></div> : null}
          {draft.type === 'expense' ? <div><span>Categoria</span><b>{data.categories.find((item)=>item.id === draft.categoryId)?.name || '—'}</b></div> : null}
          <p>O valor e a data nunca são copiados do histórico de descrições. O MEG reaproveita apenas contexto como conta, categoria e forma.</p>
        </aside>
      </div>

      <footer className="mnx-editor-footer">
        <div className="mnx-editor-footer-message">{message ? <span className="is-message">{message}</span> : <span>{editingId ? 'Alterações só são efetivadas após confirmação.' : 'Revise os dados antes de confirmar.'}</span>}</div>
        <div className="mnx-editor-footer-actions">
          <button className="mnx-editor-secondary" type="button" disabled={busy} onClick={requestClose}>Cancelar</button>
          {editingId ? <>
            {['ADMIN','MANAGER'].includes(data.user.role) ? <button className="mnx-editor-delete" type="button" disabled={busy} onClick={()=>setDeleteOpen(true)}>Excluir</button> : null}
            <button className="mnx-editor-primary" type="button" disabled={busy} onClick={requestSaveEdit}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
          </> : <WebNextLaunchWriteControl
            reviewed={reviewed}
            missing={missing}
            input={simpleInput}
            cardInput={cardInput}
            transferInput={transferInput}
            flow={flow}
            refreshMonth={data.month}
            duplicateMessage={duplicateMessage}
            onReview={review}
            onBusyChange={setBusy}
            onAccepted={closeNow}
            onCommitted={onDataCommitted}
          />}
        </div>
      </footer>
    </section>

    {discardOpen ? <div className="mnx-editor-confirm" role="dialog" aria-modal="true"><button type="button" className="mnx-editor-confirm-backdrop" aria-label="Voltar" onClick={()=>setDiscardOpen(false)}/><section><span>ALTERAÇÕES NÃO SALVAS</span><h3>Descartar o que foi preenchido?</h3><p>As alterações desta edição serão perdidas.</p><div><button type="button" onClick={()=>setDiscardOpen(false)}>Continuar editando</button><button type="button" className="is-danger" onClick={closeNow}>Descartar</button></div></section></div> : null}

    {deleteOpen ? <div className="mnx-editor-confirm" role="dialog" aria-modal="true"><button type="button" className="mnx-editor-confirm-backdrop" aria-label="Voltar" onClick={()=>setDeleteOpen(false)}/><section><span>EXCLUSÃO</span><h3>Excluir este lançamento?</h3><p>{editingEvent?.description}. A operação respeitará as proteções financeiras do domínio.</p><div><button type="button" onClick={()=>setDeleteOpen(false)}>Cancelar</button><button type="button" className="is-danger" disabled={busy} onClick={()=>void deleteEvent()}>{busy ? 'Excluindo…' : 'Excluir'}</button></div></section></div> : null}

    {settlementOpen ? <div className="mnx-editor-confirm" role="dialog" aria-modal="true"><button type="button" className="mnx-editor-confirm-backdrop" aria-label="Voltar" onClick={()=>setSettlementOpen(false)}/><section><span>CONFIRMAR SITUAÇÃO</span><h3>Marcar como pago?</h3><p>O lançamento está pendente e passará a realizado com os dados desta edição.</p><div><button type="button" onClick={()=>setSettlementOpen(false)}>Cancelar</button><button type="button" className="is-primary" onClick={()=>{setSettlementOpen(false);void saveEdit();}}>Confirmar</button></div></section></div> : null}

    {installmentsOpen ? <div className="mnx-editor-confirm mnx-installments-preview" role="dialog" aria-modal="true"><button type="button" className="mnx-editor-confirm-backdrop" aria-label="Fechar" onClick={()=>setInstallmentsOpen(false)}/><section><span>PARCELAMENTO</span><h3>{draft.installments} parcelas</h3><p>{draft.description || 'Nova compra'} · total {money.format(amountCents/100)}</p><div className="mnx-installment-list">{installmentPreview.map((item)=><div key={item.number}><span><strong>{item.number}/{draft.installments}</strong><small>{item.due ? formatIsoDate(item.due) : 'Vencimento a calcular'}</small></span><b>{money.format(item.cents/100)}</b></div>)}</div><button type="button" className="is-primary" onClick={()=>setInstallmentsOpen(false)}>Fechar</button></section></div> : null}
  </div>;
}
