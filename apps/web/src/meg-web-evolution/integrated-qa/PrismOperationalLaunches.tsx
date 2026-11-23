import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {LaunchPeriod} from '../launches/period-scope';
import {OperationalLaunches,type PrismReadData,type PrismReadOnlyCallbacks} from '../launches/OperationalLaunches';
import type {QaLaunchTarget} from '../stage10/LaunchActionsQa';
import {ExpenseForm,EMPTY_EXPENSE_DRAFT,type ExpenseCatalogs,type ExpenseDraft} from '../stage10/ExpenseForm';
import type {HistoricalExpenseEditPayload} from './HistoricalExpenseWorkbenchEditor';
import {PrismLaunchChoice,PrismCloseGlyph} from './PrismLaunchChoice';
import {suggestionsFromCanonicalHistory} from '../stage10/autocomplete-history';
import {readAuthorizedHistory} from '../launches/authorized-history';
import {financeClient} from '../../app/finance-client';
import {authenticatedRequest} from '../../app/auth-client';
import {stage10LocalQaWriteOptIn,approvedQaCatalogs,toQaMonetaryExpense} from './stage10-qa-monetary-create';
import {createStage10QaExpenseWithDurableReadback,pendingQaCreateForUser,recoverStage10QaCreateWithoutPayload} from './stage10-qa-durable-create';
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
 periodSelection?:LaunchPeriod;onPeriodSelectionChange?:(period:LaunchPeriod)=>void;
 globalSearch?:{query:string;revision:number};
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
 userId,userName,onHome,periodMonth,onPeriodChange,periodSelection,onPeriodSelectionChange,globalSearch,initialNew=false,onInitialNewConsumed,
}:Props){
 const [readData,setReadData]=useState<PrismReadData|null>(null);
 const readDataRef=useRef<PrismReadData|null>(null);
 const [overlay,setOverlay]=useState<Overlay>(null);
 const [editId,setEditId]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 const [qaWriteReady,setQaWriteReady]=useState(false);
 // Estabiliza onNew entre mudanças do gate. O efeito de leitura não pode
 // reiniciar e desmontar o modal por mudança de identidade do callback.
 const qaWriteReadyRef=useRef(false);
 qaWriteReadyRef.current=qaWriteReady;
 const [historicalWorkbenchReady,setHistoricalWorkbenchReady]=useState(false);
 const [qaSaving,setQaSaving]=useState(false);
 const [writeRefreshRevision,setWriteRefreshRevision]=useState(0);
 const qaSavingRef=useRef(false);
 const recoveryForUserRef=useRef<string|null>(null);
 const lastEditRef=useRef<{fingerprint:string;operationId:string}|null>(null);

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

 const catalogs=useMemo(()=>readData
    ? stage10LocalQaWriteOptIn()
      ? {...catalogsFromRealRead(readData),...approvedQaCatalogs(readData)}
      : catalogsFromRealRead(readData)
    : null,[readData]);
 useEffect(()=>{
  setQaWriteReady(false);
  if(!readData||!stage10LocalQaWriteOptIn())return;
  let cancelled=false;
  void authenticatedRequest<{protocol:string;allowed:boolean}>('/app-state/stage10-qa-write-gate',{cache:'no-store'})
   .then(result=>{if(!cancelled)setQaWriteReady(result.protocol==='meg-stage10-qa-transactional-mirror-v1'&&result.allowed===true);})
   .catch(()=>{if(!cancelled)setQaWriteReady(false);});
  return()=>{cancelled=true;};
 },[readData,userId]);
 useEffect(()=>{
  setHistoricalWorkbenchReady(false);
  if(!readData||import.meta.env.VITE_STAGE10_EDIT_WORKBENCH!=='true')return;
  let cancelled=false;
  void authenticatedRequest<{allowed:boolean;protocol:string}>(
   '/finance/stage10-historical-write-gate',{cache:'no-store'}
  ).then(gate=>{
   if(!cancelled)setHistoricalWorkbenchReady(gate.allowed===true&&
    gate.protocol==='stage10-historical-monetary-edit-v1');
  }).catch(()=>{if(!cancelled)setHistoricalWorkbenchReady(false);});
  return()=>{cancelled=true;};
 },[readData,userId]);
 // PT90: após reload, reconciliar somente por identidade/recibo canônico.
 // Nenhum payload fica em localStorage e nenhuma tentativa POST é iniciada.
 useEffect(()=>{
  if(!qaWriteReady||!readData||recoveryForUserRef.current===userId)return;
  recoveryForUserRef.current=userId;
  if(!pendingQaCreateForUser(userId))return;
  let cancelled=false;
  qaSavingRef.current=true;setQaSaving(true);
  setNotice('Verificando lançamento pendente na API QA, sem reenviar dados...');
  void recoverStage10QaCreateWithoutPayload(userId).then(state=>{
    if(cancelled)return;
    if(state.phase==='confirmed'){
      setOverlay(null);setWriteRefreshRevision(v=>v+1);
      setNotice('Operação anterior confirmada por recibo e histórico canônico, sem novo POST ou reentrada dos campos.');
    }else if(state.phase==='pending'){
      setNotice('Operação anterior ainda pendente ('+state.reason+'). Identidade preservada. Só é permitido reenviar os dados originais, com a mesma chave.');
    }else if(state.phase==='blocked'){
      setNotice('Recuperação segura bloqueada ('+state.reason+'). Não criar outra operação até conciliação.');
    }
  }).catch(()=>{
    if(!cancelled)setNotice('Não foi possível verificar a operação pendente. Não gere outra identidade.');
  }).finally(()=>{
    qaSavingRef.current=false;
    if(!cancelled)setQaSaving(false);
  });
  return()=>{cancelled=true;};
 },[qaWriteReady,readData,userId]);
 const editQaExpense=useCallback(async(draft:ExpenseDraft)=>{
  if(!qaWriteReady||!catalogs||!editId||qaSavingRef.current)return;
  const current=readDataRef.current?.events.find(item=>item.id===editId);
  if(!current||current.legacyTransactionId!==current.id
    ||current.sourcePayload?.__megStage10QaSource!=='web-monetary-create-v1'
    ||!current.updatedAt){
    setNotice('Edição QA permitida somente para lançamentos criados na Web QA e identificados por ID.');
    return;
  }
  try{
   const payload=toQaMonetaryExpense(draft,catalogs);
   const fingerprint=JSON.stringify({id:editId,payload,updatedAt:current.updatedAt});
   if(!lastEditRef.current||lastEditRef.current.fingerprint!==fingerprint){
     lastEditRef.current={fingerprint,operationId:globalThis.crypto.randomUUID()};
   }
   qaSavingRef.current=true;setQaSaving(true);setNotice('');
   const gate=await authenticatedRequest<{
     protocol:string;allowed:boolean;editSupported:boolean;revision:number|null;
   }>('/app-state/stage10-qa-write-gate',{cache:'no-store'});
   if(!gate.allowed||!gate.editSupported||gate.revision===null
     ||gate.protocol!=='meg-stage10-qa-transactional-mirror-v1')
     throw new Error('STAGE10_QA_GATE_NAO_AUTORIZADO');
   const saved=await financeClient.updateStage10QaMonetaryExpense(editId,{
     ...payload,status:payload.status as 'planned'|'paid',
     notes:payload.notes??'',expectedUpdatedAt:current.updatedAt,
     expectedRevision:gate.revision,operationId:lastEditRef.current.operationId,
   });
   if(!saved?.id||saved.id!==editId||saved.legacyTransactionId!==editId){
     throw new Error('STAGE10_QA_EDICAO_SEM_CONFIRMACAO');
   }
   lastEditRef.current=null;
   setOverlay(null);setEditId(null);setWriteRefreshRevision(v=>v+1);
   setNotice('Alterações confirmadas na base QA e no espelho Android.');
  }catch(error){
   setNotice(error instanceof Error?error.message:'Falha na edição QA. Nenhum dado foi confirmado.');
  }finally{qaSavingRef.current=false;setQaSaving(false);}
 },[qaWriteReady,catalogs,editId]);

 const saveHistoricalWorkbenchExpense=useCallback(async(next:HistoricalExpenseEditPayload)=>{
  if(!historicalWorkbenchReady||!editId||qaSavingRef.current){
   throw new Error('Edição histórica ainda não autorizada pela API local.');
  }
  const current=readDataRef.current?.events.find(item=>item.id===editId);
  if(!current||!current.legacyTransactionId||!current.updatedAt||
   current.type!=='expense'||!['paid','planned'].includes(current.status)||
   !current.accountId||!current.account||
   !['checking','savings','cash'].includes(current.account.type)){
   throw new Error('Este lançamento exige um editor financeiro específico.');
  }
  const fingerprint=JSON.stringify({id:editId,updatedAt:current.updatedAt,...next});
  if(!lastEditRef.current||lastEditRef.current.fingerprint!==fingerprint){
   if(!globalThis.crypto?.randomUUID)throw new Error('Identificador seguro indisponível.');
   lastEditRef.current={fingerprint,operationId:globalThis.crypto.randomUUID()};
  }
  qaSavingRef.current=true;setQaSaving(true);
  try{
   const gate=await authenticatedRequest<{
    allowed:boolean;protocol:string;revision:number;
   }>('/finance/stage10-historical-write-gate',{cache:'no-store'});
   if(!gate.allowed||gate.protocol!=='stage10-historical-monetary-edit-v1'||
    !Number.isSafeInteger(gate.revision))throw new Error('Gate financeiro não autorizado.');
   const saved=await authenticatedRequest<{
    id:string;legacyTransactionId:string;revision:number;updatedAt:string;
   }>('/finance/events/'+encodeURIComponent(editId)+'/stage10-historical-edit',{
    method:'PATCH',
    body:JSON.stringify({
     ...next,operationId:lastEditRef.current!.operationId,
     expectedUpdatedAt:current.updatedAt,expectedRevision:gate.revision,
    }),
   });
   if(saved.id!==editId||saved.legacyTransactionId!==current.legacyTransactionId||
    saved.revision!==gate.revision+1)throw new Error('A API não confirmou a edição.');
   lastEditRef.current=null;
   setOverlay(null);setEditId(null);setWriteRefreshRevision(v=>v+1);
   setNotice('Alteração financeira salva e confirmada no banco local de homologação.');
  }finally{qaSavingRef.current=false;setQaSaving(false);}
 },[historicalWorkbenchReady,editId]);
 const createQaExpense=useCallback(async(draft:ExpenseDraft)=>{
  if(!qaWriteReady||!catalogs||qaSavingRef.current)return;
  try {
   const payload=toQaMonetaryExpense(draft,catalogs);
   qaSavingRef.current=true;setQaSaving(true);
   setNotice('Registrando operação QA com identidade durável e conferência canônica…');
   const gate=await authenticatedRequest<{protocol:string;allowed:boolean}>('/app-state/stage10-qa-write-gate',{cache:'no-store'});
   if(!gate.allowed||gate.protocol!=='meg-stage10-qa-transactional-mirror-v1'){
    throw new Error('STAGE10_QA_GATE_NAO_AUTORIZADO');
   }
   const result=await createStage10QaExpenseWithDurableReadback(payload,userId);
   if(result.phase==='confirmed'){
    setOverlay(null);setWriteRefreshRevision(v=>v+1);
    setNotice('Lançamento confirmado na API QA e relido pelo identificador exato no histórico canônico. Identidade de operação liberada.');
   }else if(result.phase==='pending'){
    setNotice('Gravação QA ainda não reconciliada ('+result.reason+'). A operação original foi preservada neste navegador. Não crie outro lançamento: confira o mesmo formulário para retomar com a mesma chave.');
   }else if(result.phase==='blocked'){
    setNotice('Gravação QA bloqueada ('+result.reason+'). Nenhuma nova tentativa foi iniciada sem reconciliação segura.');
   }else{
    setNotice('Gravação QA sem estado final. Não gerar nova operação até revisão.');
   }
  }catch(error){
   setNotice('Confirmação QA não comprovada. Não repita com novos dados até reconciliar a operação pendente. Detalhe: '+
     (error instanceof Error?error.message:'erro desconhecido'));
  }finally{qaSavingRef.current=false;setQaSaving(false);}
 },[qaWriteReady,catalogs,userId]);
 // Full historical suggestions are fetched only after the user types a query.
 // Never label the selected month's records as a complete lifetime snapshot.
 const searchHistorySuggestions=useCallback(async(query:string,signal:AbortSignal)=>{
  const term=query.trim();
  if(term.length<2)return [];
  if(term.length>120)throw new Error('A descrição da pesquisa excedeu o limite autorizado.');
  const read=await readAuthorizedHistory(
   (page,pageSize,requestSignal)=>financeClient.listEvents(page,pageSize,term,requestSignal),
   signal,
  );
  return suggestionsFromCanonicalHistory(
   {kind:'complete',protocol:'financial-history-v1',items:read},term,5,
  );
 },[]);
 const editDraft=useMemo(()=>readData&&catalogs&&editId?
  existingExpenseDraft(readData,catalogs,editId):null,[readData,catalogs,editId]);
 const editedEvent=useMemo(()=>readData?.events.find(e=>e.id===editId),[readData,editId]);

 const startNew=useCallback(()=>{
  setNotice(qaWriteReadyRef.current&&pendingQaCreateForUser(userId)
    ? 'Há uma gravação anterior pendente neste navegador QA. Refaça exatamente os mesmos dados para reconciliar com o mesmo identificador, sem gerar duplicidade.'
    : '');
  setEditId(null);setOverlay('choice');
 },[userId]);
 const startEdit=useCallback((row:QaLaunchTarget)=>{
  lastEditRef.current=null;
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

 return <div data-meg-operational-prism={historicalWorkbenchReady?'isolated-historical-expense-edit':qaWriteReady?'isolated-qa-financial-write':'read-only'}>
  <OperationalLaunches key={'stage10-qa-write-'+writeRefreshRevision} userId={userId} userName={userName} onHome={onHome}
   periodMonth={periodMonth} onPeriodChange={onPeriodChange}
    periodSelection={periodSelection} onPeriodSelectionChange={onPeriodSelectionChange} globalSearch={globalSearch} prismReadOnlyCallbacks={callbacks}/>
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
   catalogs={catalogs} searchHistorySuggestions={searchHistorySuggestions}
   readOnlyRealData={!qaWriteReady} saveEnabled={qaWriteReady&&!qaSaving}
   onRequestSave={createQaExpense} onBack={()=>setOverlay('choice')}/>}
  {overlay==='edit'&&historicalWorkbenchReady&&editedEvent&&catalogs&&editDraft&&<ExpenseForm
   key={'historical-canonical-'+editedEvent.id} mode="edit" catalogs={catalogs}
   initialDraft={editDraft} historicalRestricted readOnlyRealData={false}
   saveEnabled={!qaSaving}
   onRequestSave={draft=>{
    const current=existingExpenseDraft(readData!,catalogs,editedEvent.id);
    if(!current||draft.categoryId!==current.categoryId||draft.accountId!==current.accountId||
     draft.paymentMethodId!==current.paymentMethodId||draft.modality!==current.modality||
     draft.date!==current.date||draft.requestedStatus!==current.requestedStatus||
     draft.creditCardId!==current.creditCardId||draft.installmentsInput!==current.installmentsInput){
     setNotice('Campo financeiro protegido: alteração não homologada. Nenhum dado foi salvo.');return;
    }
    const amount=Number(draft.amountInput);
    if(!Number.isFinite(amount)||amount<=0){setNotice('Valor inválido para a edição histórica.');return;}
    void saveHistoricalWorkbenchExpense({description:draft.description,notes:draft.notes,amount})
     .catch(error=>setNotice(error instanceof Error?error.message:'Falha na edição histórica.'));
   }}
   onBack={()=>{setOverlay(null);setEditId(null);}}/>}
  {overlay==='edit'&&!historicalWorkbenchReady&&catalogs&&editDraft&&<ExpenseForm
   key={'prism-read-'+editId} mode="edit" catalogs={catalogs}
   initialDraft={editDraft} searchHistorySuggestions={searchHistorySuggestions}
   readOnlyRealData={!qaWriteReady} saveEnabled={qaWriteReady&&!qaSaving
     &&readData?.events.find(event=>event.id===editId)?.sourcePayload?.__megStage10QaSource==='web-monetary-create-v1'}
   onRequestSave={editQaExpense}
   onBack={()=>{setOverlay(null);setEditId(null);}}/>}
  {overlay==='edit'&&((historicalWorkbenchReady&&(!editedEvent||!editDraft))||(!historicalWorkbenchReady&&!editDraft))&&<div role="alert">
   O lançamento não pode ser representado com segurança no editor. Nenhum valor foi estimado.
   <button type="button" onClick={()=>{setOverlay(null);setEditId(null);}}>Fechar</button>
  </div>}
  {notice&&<output className="meg-unified-notice" role="status">{notice}
   <button type="button" aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button>
  </output>}
 </div>;
}
