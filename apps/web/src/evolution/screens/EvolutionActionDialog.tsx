import {useEffect,useRef,useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
import {financeClient,type FinancialEvent} from '../../app/finance-client';
import {cardsClient,type CreditCard} from '../../app/cards-client';
import {Button,Modal,EventsTable} from '../components/SystemUI';
import {EvolutionFinancialIcon as Icon} from '../components/EvolutionFinancialIcon';
import {amountInput,amountValue,cents,datePt,errorMessage,isBenefit,isBenefitAccount,isMonetary,isSettlementMethod,money,operationId,posted,settlementSources,signed,sum,today,type PendingItem,type SystemData} from '../app/system-domain';

export type ActionKind='settlement'|'card-payment'|'transfer'|'benefit-recharge'|'edit-launch'|'benefit-evolution';
export function EvolutionActionDialog({kind,data,items=[],card,event,qaMode,onClose,onSaved}:{kind:ActionKind;data:SystemData;items?:PendingItem[];card?:CreditCard;event?:FinancialEvent;qaMode:boolean;onClose:()=>void;onSaved:()=>void}){
  const monetary=data.accounts.filter(isMonetary),benefitAccount=data.accounts.find(isBenefitAccount),benefitMethod=data.methods.find(x=>x.name.toUpperCase()==='VEROCARD'),methods=data.methods.filter(isSettlementMethod);
  const [accountId,setAccountId]=useState(event?.accountId||monetary[0]?.id||''),[destinationId,setDestinationId]=useState(monetary[1]?.id||''),[methodId,setMethodId]=useState(event?.paymentMethodId||methods[0]?.id||''),[date,setDate]=useState(event?.date.slice(0,10)||today()),[description,setDescription]=useState(event?.description||(kind==='benefit-recharge'?'RECARGA VEROCARD':'')),[value,setValue]=useState(event?amountInput(String(cents(event.amount))):''),[categoryId,setCategoryId]=useState(event?.categoryId||''),[status,setStatus]=useState<string>(event?.status||'paid'),[notes,setNotes]=useState(event?.notes||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[balance,setBalance]=useState<number|null>(null),[balanceError,setBalanceError]=useState(''),[deleting,setDeleting]=useState(false);
  const request=useRef<{payload:string;id:string}|null>(null),submitting=useRef(false);
  const cardOrigin=event?data.cards.find(c=>c.statement?.lines.some(l=>l.eventId===event.id)):undefined;
  const payment=kind==='settlement'||kind==='card-payment',transfer=kind==='transfer';
  const amount=payment?(card?Number(card.statement?.payableAmount??card.payableStatementAmount??Math.max(0,card.statementAmount)):sum(items.map(x=>x.amount))):amountValue(value);
  const needsBalance=payment||transfer;
  useEffect(()=>{if(!needsBalance||!accountId||!date)return;let alive=true;setBalance(null);setBalanceError('');if(qaMode){setBalance(data.summary.availableBalance);return}financeClient.getMonetaryBalance(accountId,date).then(r=>{if(alive)setBalance(r.available)}).catch(e=>{if(alive)setBalanceError(errorMessage(e))});return()=>{alive=false};},[accountId,date,needsBalance,qaMode,data.summary.availableBalance]);
  const missing=balance===null?null:Math.max(0,cents(amount)-cents(balance))/100;
  const formValid=Number.isFinite(amount)&&amount>0&&date&&(!needsBalance||Boolean(accountId&&balance!==null&&missing===0&&date<=today()))&&(!payment||Boolean(methodId))&&(!transfer||Boolean(destinationId&&destinationId!==accountId));
  function idFor(payload:unknown){const serialized=JSON.stringify(payload);if(request.current?.payload!==serialized)request.current={payload:serialized,id:operationId()};return request.current!.id;}
  async function save(){
    if(submitting.current||qaMode||!formValid)return;submitting.current=true;setBusy(true);setError('');
    try{
      if(kind==='settlement'){
        const payload={items:settlementSources(items,data),paidAt:date,accountId,paymentMethodId:methodId};
        await authenticatedRequest('/finance/pending/batch/settle',{method:'POST',body:JSON.stringify({...payload,operationId:idFor(payload)})});
      }else if(kind==='card-payment'&&card){const payload={accountId,paymentMethodId:methodId,paidAt:date};await cardsClient.payStatement(card.id,data.summary.month,{...payload,operationId:idFor(payload)});
      }else if(kind==='transfer'){const payload={sourceAccountId:accountId,destinationAccountId:destinationId,amount,date,description:description.trim()||'TRANSFERÊNCIA ENTRE CONTAS',notes:notes||undefined};await financeClient.createTransfer({...payload,operationId:idFor(payload)});
      }else if(kind==='benefit-recharge'){
        if(!benefitAccount||!benefitMethod)throw Error('Cadastre a conta Benefício e a forma VEROCARD para registrar a recarga.');
        const payload={description:description.trim(),type:'income',amount,date,accountId:benefitAccount.id,paymentMethodId:benefitMethod.id,notes:notes||undefined};
        await authenticatedRequest('/finance/benefit-events',{method:'POST',body:JSON.stringify({...payload,operationId:idFor(payload)})});
      }else if(kind==='edit-launch'&&event){
        if(!['income','expense'].includes(event.type))throw Error('Transferências e ajustes devem ser revisados no fluxo de origem.');
        if(isBenefit(event)){
          if(!benefitAccount||!benefitMethod)throw Error('Conta de benefício indisponível.');
          const payload={description:description.trim(),type:event.type as 'income'|'expense',amount,date,accountId:benefitAccount.id,paymentMethodId:benefitMethod.id,categoryId:categoryId||undefined,notes:notes||undefined,expectedUpdatedAt:event.updatedAt};
          await financeClient.updateBenefitEvent(event.id,{...payload,operationId:idFor(payload)});
        }else{
          // A baixa de um pendente nunca é uma simples alteração de status.
          if(!posted(event.status)&&posted(status))throw Error('Use Pagar selecionados em Pendentes para baixar com validação de saldo.');
          const changes={description:description.trim(),amount:event.type==='expense'?(signed(event)>0?amount:-amount):amount,date,categoryId:categoryId||null,...(cardOrigin?{}:{accountId:status==='planned'?null:accountId||null,paymentMethodId:status==='planned'?null:methodId||null}),notes,status:status as 'paid'|'planned'|'reconciled'};
          const payload={ids:[event.id],changes,expectedUpdatedAtById:event.updatedAt?{[event.id]:event.updatedAt}:undefined};await financeClient.bulkUpdateEvents({...payload,operationId:idFor(payload)});
        }
      }
      onSaved();
    }catch(e){setError(errorMessage(e))}finally{submitting.current=false;setBusy(false)}
  }
  async function archive(){if(!event||qaMode||submitting.current)return;submitting.current=true;setBusy(true);setError('');try{const payload={ids:[event.id],expectedUpdatedAtById:event.updatedAt?{[event.id]:event.updatedAt}:undefined};await financeClient.bulkArchiveEvents({...payload,operationId:idFor(payload)});onSaved()}catch(e){setError(errorMessage(e))}finally{submitting.current=false;setBusy(false)}}
  const titles:Record<ActionKind,string>={'settlement':'Confirmar pagamento','card-payment':'Pagar fatura','transfer':'Nova transferência','benefit-recharge':'Registrar recarga','edit-launch':'Editar lançamento','benefit-evolution':'Evolução do benefício'};
  const evolution=data.events.filter(isBenefit).filter(e=>posted(e.status));
  return <Modal title={titles[kind]} icon={transfer?'arrows-right-left':kind==='benefit-recharge'?'gift':payment?'wallet':'note'} onClose={onClose} busy={busy} wide={transfer||kind==='edit-launch'||kind==='benefit-evolution'}>
    {kind==='benefit-evolution'?<><section className="meg-dialog-body"><div className="meg-result-card"><small>Saldo Verocard</small><strong>{money(data.benefit.balance)}</strong><span>Créditos {money(data.benefit.credits)} · Consumo {money(data.benefit.used)}</span></div><EventsTable events={evolution} compact/></section><footer><Button onClick={onClose}>Fechar</Button></footer></>:<form onSubmit={e=>{e.preventDefault();void save()}}>
      <fieldset disabled={busy} className="meg-dialog-body">
        {qaMode&&<p className="meg-info">Prévia visual. As operações financeiras estão desativadas.</p>}
        {payment&&<><p>Confira os valores e escolha a data do pagamento.</p><div className="meg-payment-items meg-scroll">{card?<div><Icon name="card"/><span>{card.name}<small>Fatura {data.summary.month}</small></span><b>{money(amount)}</b></div>:items.map(x=><div key={x.key}><Icon name={x.source==='card'?'card':'receipt'}/><span>{x.description}<small>{datePt(x.date)}</small></span><b>{money(x.amount)}</b></div>)}</div><div className="meg-result-card"><small>Total selecionado</small><strong>{money(amount)}</strong></div></>}
        <div className="meg-form-grid">
          {!payment&&<label className="span-two">Descrição<input required minLength={2} value={description} onChange={e=>setDescription(e.target.value.toUpperCase())}/></label>}
          {!payment&&<label>Valor (R$)<input required inputMode="numeric" value={value} onChange={e=>setValue(amountInput(e.target.value))}/></label>}
          <label>{payment?'Data da baixa':transfer?'Data da transferência':'Data'}<input required type="date" max={needsBalance?today():undefined} value={date} onChange={e=>setDate(e.target.value)}/></label>
          {cardOrigin?<label className="span-two">Cartão de origem<input readOnly value={cardOrigin.name+' · Na fatura'}/></label>:kind==='benefit-recharge'||(event&&isBenefit(event))?<label className="span-two">Conta benefício<input value={benefitAccount?.name||'Conta de benefício indisponível'} readOnly/></label>:<label>{transfer?'Conta de origem':'Conta monetária'}<select required value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Selecione</option>{monetary.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label>}
          {transfer&&<label>Conta de destino<select required value={destinationId} onChange={e=>setDestinationId(e.target.value)}><option value="">Selecione</option>{monetary.filter(a=>a.id!==accountId).map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label>}
          {payment&&<label>Forma de pagamento<select required value={methodId} onChange={e=>setMethodId(e.target.value)}><option value="">Selecione</option>{methods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
          {kind==='edit-launch'&&event&&<><label>Categoria<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Sem categoria</option>{data.categories.filter(c=>!c.type||c.type===event.type).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{!isBenefit(event)&&!cardOrigin&&<><label>Forma<select required={posted(status)} value={methodId} onChange={e=>setMethodId(e.target.value)}><option value="">Na baixa</option>{data.methods.filter(m=>m.type!=='BENEFIT').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{posted(event.status)?<><option value="paid">Pago</option><option value="reconciled">Conciliado</option></>:<option value="planned">Pendente — baixar em Pendentes</option>}</select></label></>}</>}
          {!payment&&<label className="span-two">Observações<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/></label>}
        </div>
        {needsBalance&&<div className={'meg-balance-check '+(missing?'red':'green')} role="status"><Icon name={missing?'alert':'wallet'}/><span>{balance===null?(balanceError||'Verificando saldo na data…'):missing?'Saldo insuficiente. Faltam '+money(missing):'Saldo disponível: '+money(balance)}{balance!==null&&!missing&&<small>Saldo após a operação: {money(balance-amount)}</small>}</span></div>}
        {kind==='benefit-recharge'&&<p className="meg-info">Crédito exclusivo na conta Verocard. Não altera o saldo monetário.</p>}
        {error&&<p className="meg-error" role="alert">{error}</p>}
        {deleting&&<p className="meg-error">Confirme a exclusão deste lançamento. A operação será registrada no histórico.</p>}
      </fieldset>
      <footer>{kind==='edit-launch'&&<Button disabled={busy||qaMode} onClick={()=>deleting?void archive():setDeleting(true)} icon="x">{deleting?'Confirmar exclusão':'Excluir lançamento'}</Button>}<Button disabled={busy} onClick={onClose}>Cancelar</Button><Button primary type="submit" disabled={busy||qaMode||!formValid} icon="check-line">{busy?'Confirmando…':payment?'Confirmar pagamento':transfer?'Salvar transferência':kind==='benefit-recharge'?'Confirmar recarga':'Salvar alterações'}</Button></footer>
    </form>}
  </Modal>;
}
