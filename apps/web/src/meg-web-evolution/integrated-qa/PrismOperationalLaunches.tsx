import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {OperationalLaunches,type PrismReadData,type PrismReadOnlyCallbacks} from '../launches/OperationalLaunches';
import type {QaLaunchTarget} from '../stage10/LaunchActionsQa';
import {ExpenseForm,EMPTY_EXPENSE_DRAFT,type ExpenseCatalogs,type ExpenseDraft} from '../stage10/ExpenseForm';
import {PrismLaunchChoice,PrismCloseGlyph} from './PrismLaunchChoice';
import type {HistorySnapshot} from '../stage10/autocomplete-history';
import {brlFromPasted,brlSignedDecimal} from '../stage10/brl-money-mask';
import prismCssText from '../stage08-qa/prism-type-pilot.css?inline';
import '../launches/new-launch.css';
import '../launches/launch-type-picker.css';
import './unified-qa.css';

/**
 * Etapa 10: composição Prism em sessão AUTENTICADA da Web operacional.
 * Fonte: OperationalLaunches, cujo histórico e totais vêm da API canônica.
 * Nenhuma fixture, simulação de sessão, override de fetch ou writer.
 * A rota da API e o banco não são alterados por este componente.
 */
type Overlay='choice'|'expense'|'edit'|null;
type Props={
 userId:string;userName:string;onHome:()=>void;
 periodMonth?:string;onPeriodChange?:(month:string)=>void;
 initialNew?:boolean;onInitialNewConsumed?:()=>void;
};

function catalogsFromRealRead(data:PrismReadData):ExpenseCatalogs{
 return {
  categories:data.categories.map(category=>({
   id:category.id,name:category.name,active:category.isActive,group:category.group??undefined,
  })),
  accounts:data.accounts.flatMap(account=>{
   const kind=account.type==='checking'?'monetary':
    account.type==='benefit'?'benefit':
    account.type==='investment'?'investment':null;
   // Unknown types are excluded instead of assigning an invented scope.
   return kind?[{id:account.id,name:account.name,active:account.isActive,kind}]:[];
  }),
  paymentMethods:data.methods.map(method=>({
   id:method.id,name:method.name,active:method.isActive,
   kind:method.type==='credit'?'credit':method.type==='benefit'?'benefit':'ordinary',
  })),
  // These are real CreditCard catalog entries, never benefit/prepaid cards.
  creditCards:data.cards.map(card=>({
   id:card.id,name:card.name,active:card.isActive,
   closingDay:card.closingDay,dueDay:card.dueDay,
   issuer:card.issuer,brand:card.brand,lastFour:card.lastFour,
  })),
 };
}

/** Adapt DTO to the APPROVED editor. Only explicit catalog IDs are retained. */
function existingExpenseDraft(
 data:PrismReadData,catalogs:ExpenseCatalogs,eventId:string,
):ExpenseDraft|null{
 const event=data.events.find(row=>row.id===eventId);
 if(!event||event.type!=='expense'||!['paid','planned'].includes(event.status))return null;
 if(!event.accountId||!catalogs.accounts.some(account=>account.id===event.accountId&&account.kind==='monetary'))return null;
 const method=event.paymentMethodId?data.methods.find(item=>item.id===event.paymentMethodId):undefined;
 if(method?.type==='credit'||method?.type==='benefit')return null;
 const amountText=String(event.amount);
 if(!/^\d+(?:\.\d{1,2})?$/.test(amountText))return null;
 const amountInput=brlSignedDecimal(brlFromPasted(amountText));
 if(!amountInput)return null;
 const validCategory=event.categoryId&&catalogs.categories.some(item=>item.id===event.categoryId);
 const validMethod=event.paymentMethodId&&catalogs.paymentMethods.some(item=>item.id===event.paymentMethodId);
 return {
  ...EMPTY_EXPENSE_DRAFT,
  description:event.description,
  notes:event.notes??'',
  categoryId:validCategory?event.categoryId!:'',
  accountId:event.accountId,
  paymentMethodId:validMethod?event.paymentMethodId!:'',
  date:event.date.slice(0,10),
  amountInput,
  requestedStatus:event.status==='paid'?'paid':'planned',
 };
}

export default function PrismOperationalLaunches({
 userId,userName,onHome,periodMonth,onPeriodChange,initialNew=false,onInitialNewConsumed,
}:Props){
 const [readData,setReadData]=useState<PrismReadData|null>(null);
 const readDataRef=useRef<PrismReadData|null>(null);
 const [overlay,setOverlay]=useState<Overlay>(null);
 const [editId,setEditId]=useState<string|null>(null);
 const [notice,setNotice]=useState('');

 useEffect(()=>{
  const root=document.documentElement;
  const previousTypography=root.dataset.megTypographyPilot;
  const previousPrism=root.dataset.megPrismUi;
  root.dataset.megTypographyPilot='true';
  root.dataset.megPrismUi='true';
  const style=document.createElement('style');
  style.dataset.megPrismStyle='operational-readonly';
  style.textContent=prismCssText;
  document.head.appendChild(style);
  return ()=>{
   style.remove();
   if(previousTypography===undefined)delete root.dataset.megTypographyPilot;
   else root.dataset.megTypographyPilot=previousTypography;
   if(previousPrism===undefined)delete root.dataset.megPrismUi;
   else root.dataset.megPrismUi=previousPrism;
  };
 },[]);

 const catalogs=useMemo(()=>readData?catalogsFromRealRead(readData):null,[readData]);
 const history=useMemo<HistorySnapshot|undefined>(()=>readData?
  {kind:'complete',protocol:'financial-history-v1',items:readData.events}:undefined,[readData]);
 const editDraft=useMemo(()=>readData&&catalogs&&editId?
  existingExpenseDraft(readData,catalogs,editId):null,[readData,catalogs,editId]);

 const startNew=useCallback(()=>{
  setNotice('');setEditId(null);setOverlay('choice');
 },[]);
 const startEdit=useCallback((row:QaLaunchTarget)=>{
  const current=readDataRef.current;
  if(!current){setNotice('Histórico financeiro ainda não disponível.');return;}
  const event=current.events.find(item=>item.id===row.id);
  if(!event||event.type!=='expense'||row.accountKind!=='monetary'){
   setNotice('Este lançamento não pertence ao editor monetário de despesas. Consulta preservada.');
   return;
  }
  if(!['paid','planned'].includes(event.status)){
   setNotice('O status original exige um editor canônico específico. Nenhuma alteração permitida.');
   return;
  }
  setNotice('');setEditId(row.id);setOverlay('edit');
 },[]);
 const receive=useCallback((next:PrismReadData)=>{readDataRef.current=next;setReadData(next);},[]);
 const clear=useCallback(()=>{readDataRef.current=null;setReadData(null);setEditId(null);setOverlay(null);},[]);
 const callbacks=useMemo<PrismReadOnlyCallbacks>(()=>({
  onLoaded:receive,onLoading:clear,onNew:startNew,onEdit:startEdit,onNotice:setNotice,
 }),[receive,clear,startNew,startEdit]);

 useEffect(()=>{
  if(initialNew&&readData){
   startNew();
   onInitialNewConsumed?.();
  }
 },[initialNew,readData,startNew,onInitialNewConsumed]);

 return <div data-meg-operational-prism="read-only">
  <OperationalLaunches userId={userId} userName={userName} onHome={onHome}
   periodMonth={periodMonth} onPeriodChange={onPeriodChange} prismReadOnlyCallbacks={callbacks}/>
  {overlay==='choice'&&catalogs&&<div className="meg-new-launch__overlay is-choice-overlay meg-unified-choice-overlay">
   <section className="meg-new-launch is-choose" role="dialog" aria-modal="true" aria-labelledby="meg-unified-new-title">
    <header className="meg-new-launch__header">
     <div className="meg-new-launch__headline">
      <h2 id="meg-unified-new-title">Novo lançamento</h2>
      <p>Escolha o tipo de lançamento.</p>
     </div>
     <button type="button" className="meg-new-launch__close" aria-label="Fechar novo lançamento"
      title="Fechar novo lançamento" onClick={()=>setOverlay(null)}><PrismCloseGlyph/></button>
    </header>
    <PrismLaunchChoice onBack={()=>setOverlay(null)} onChoose={type=>{
     if(type==='expense')setOverlay('expense');
     else{setOverlay(null);setNotice('Receita permanece fora do formulário monetário de despesa autorizado.');}
    }}/>
   </section>
  </div>}
  {overlay==='expense'&&catalogs&&<ExpenseForm
   catalogs={catalogs} historySnapshot={history} readOnlyRealData saveEnabled={false}
   onBack={()=>setOverlay('choice')}/>}
  {overlay==='edit'&&catalogs&&editDraft&&<ExpenseForm
   key={'prism-read-'+editId} mode="edit" catalogs={catalogs}
   initialDraft={editDraft} readOnlyRealData saveEnabled={false}
   onBack={()=>{setOverlay(null);setEditId(null);}}/>}
  {overlay==='edit'&&!editDraft&&<div role="alert">
   O lançamento não pode ser representado com segurança no editor. Nenhum valor foi estimado.
   <button type="button" onClick={()=>{setOverlay(null);setEditId(null);}}>Fechar</button>
  </div>}
  {notice&&<output className="meg-unified-notice" role="status">{notice}
   <button type="button" aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button>
  </output>}
 </div>;
}
