import {useEffect,useRef,useState,type MouseEvent} from 'react';
import {clearSession,readSession} from '../../app/auth-client';
import {financeClient} from '../../app/finance-client';
import {LoginScreen} from '../auth/LoginScreen';
import {CreateAccountScreen} from '../auth/CreateAccountScreen';
import {RecoverPasswordScreen} from '../auth/RecoverPasswordScreen';
import {AppShell} from '../shell/AppShell';
import {LaunchesStage09} from '../launches/LaunchesStage09';
import {PrismLaunchChoice,PrismCloseGlyph} from '../integrated-qa/PrismLaunchChoice';
import {ExpenseForm,EMPTY_EXPENSE_DRAFT,type ExpenseDraft,type InstallmentSchedule} from './ExpenseForm';
import {EditExpensePreview,type EditExpenseSnapshot} from './EditExpensePreview';
import type {QaLaunchTarget} from './LaunchActionsQa';
import {loadStage10RealRead,loadStage10CardPreview,type Stage10RealRead} from './real-data-read';
import {prepareStage10ExpenseCreate,prepareStage10ExpenseUpdate,prepareStage10ExpenseArchive,stage10RealMutationGate} from './real-expense-mutation';
import {isStage10FoodBenefitCategory} from './real-expense-category-policy';
import {prepareStage10BenefitExpenseCreate,prepareStage10BenefitExpenseUpdate} from './real-benefit-expense-mutation';

type Screen='login'|'register'|'recover'|'home'|'launches';
type Overlay='choice'|'expense'|'edit'|'duplicate'|null;
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

function brazilMonth(){
 const values=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date());
 return (values.find(v=>v.type==='year')?.value||'0000')+'-'+(values.find(v=>v.type==='month')?.value||'00');
}
function selectedRealExpense(row:QaLaunchTarget,data:Stage10RealRead):{
 event:Stage10RealRead['events'][number];accountName:string;financialScope:'monetary'|'benefit';
}|null{
 const event=data.events.find(item=>item.id===row.id);
 const category=data.catalogs.categories.find(item=>item.active&&item.id===event?.categoryId);
 const benefit=isStage10FoodBenefitCategory(category);
 const account=data.catalogs.accounts.find(item=>item.id===event?.accountId&&item.active&&
  item.kind===(benefit?'benefit':'monetary'));
 const method=data.catalogs.paymentMethods.find(item=>item.active&&item.id===event?.paymentMethodId&&
  item.kind===(benefit?'benefit':'ordinary'));
 if(!event||event.type!=='expense'||!['paid','planned'].includes(event.status)||
  !Number.isFinite(event.enteredAmount)||!event.categoryId||!event.paymentMethodId||
  !category||!method||(event.accountId&&!account)||(event.status==='paid'&&!account)||
  (benefit&&event.status!=='paid'))return null;
 return {event,accountName:account?.name??'',financialScope:benefit?'benefit':'monetary'};
}
function realEdit(row:QaLaunchTarget,data:Stage10RealRead):EditExpenseSnapshot|null{
 const selected=selectedRealExpense(row,data);
 if(!selected)return null;
 const {event,accountName,financialScope}=selected;
 return {
  source:'financial-event',financialScope,type:'expense',
  id:event.id,description:event.description,notes:event.notes||'',
  categoryId:event.categoryId||'',categoryName:row.category,
  accountId:event.accountId,paymentMethodId:event.paymentMethodId,
  strictReferences:true,
  dateDisplay:row.date.slice(8)+'/'+row.date.slice(5,7)+'/'+row.date.slice(0,4),
  amountDisplay:money.format(event.enteredAmount??Number.NaN),
  paymentMethodName:row.paymentMethod,accountName,
  statusLabel:event.status==='paid'?'Paga':'Pendente',
 };
}
function realDuplicate(row:QaLaunchTarget,data:Stage10RealRead):ExpenseDraft|null{
 const selected=selectedRealExpense(row,data);
 if(!selected)return null;
 const {event,financialScope}=selected;
 const category=data.catalogs.categories.find(item=>item.active&&item.id===event.categoryId);
 const method=data.catalogs.paymentMethods.find(item=>item.active&&item.id===event.paymentMethodId&&
  item.kind===(financialScope==='benefit'?'benefit':'ordinary'));
 return {...EMPTY_EXPENSE_DRAFT,
  description:event.description.toLocaleUpperCase('pt-BR'),notes:(event.notes||'').toLocaleUpperCase('pt-BR'),
  categoryId:category?.id||'',accountId:event.accountId||'',paymentMethodId:method?.id||'',
  date:'',amountInput:'',
 };
}
/**
 * Componente opt-in no MESMO HTML da QA. Nenhuma fixture entra no fluxo real.
 * Nao habilitar sem endpoint de leitura comprovadamente livre de writes e CORS
 * autorizado; a gate de build permanece fechada por padrao.
 */
export function UnifiedRealReadQa({enabled,blockedReason}:{enabled:boolean;blockedReason:string}){
 const [screen,setScreen]=useState<Screen>('login');
 const [authenticated,setAuthenticated]=useState(false);
 const [data,setData]=useState<Stage10RealRead|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 const [overlay,setOverlay]=useState<Overlay>(null);
 const [edit,setEdit]=useState<EditExpenseSnapshot|null>(null);
 const [duplicate,setDuplicate]=useState<ExpenseDraft|null>(null);
 const [notice,setNotice]=useState('');
 const [saving,setSaving]=useState(false);
 const savingRef=useRef(false);
 const operationRef=useRef<{fingerprint:string;operationId:string}|null>(null);
 const [cardSchedule,setCardSchedule]=useState<InstallmentSchedule|undefined>();
 const cardPreviewRef=useRef<AbortController|null>(null);
 const userRole=readSession()?.user.role;
 // A flag so existe na build opt-in. Em QA normal e em producao fica off.
 const writeEnabled=Boolean(enabled&&stage10RealMutationGate({
  enabled:import.meta.env.VITE_MEG_STAGE10_REAL_WRITE_ENABLED,
  apiOrigin:import.meta.env.VITE_API_URL,
  expectedApiOrigin:import.meta.env.VITE_MEG_STAGE10_WRITE_CANONICAL_API_ORIGIN,
  readOrigin:import.meta.env.VITE_MEG_STAGE10_READONLY_API_URL,
 },typeof window==='undefined'?'':window.location.origin,userRole));
 const month=brazilMonth();
 useEffect(()=>{
  if(!enabled||!authenticated)return;
  const controller=new AbortController();
  setLoading(true);setError('');setData(null);
  void loadStage10RealRead(month,controller.signal)
   .then(result=>{if(!controller.signal.aborted)setData(result);})
   .catch(cause=>{if(!controller.signal.aborted)setError(
    cause instanceof Error?cause.message:'Nao foi possivel verificar os dados reais.');})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[enabled,authenticated,revision,month]);
 async function requestCardSchedule(draft:ExpenseDraft){
  cardPreviewRef.current?.abort();
  const controller=new AbortController();
  cardPreviewRef.current=controller;
  setCardSchedule(undefined);
  if(!enabled||!data||!draft.creditCardId||!draft.date)return;
  const expectedUser=data.userId;
  try{
   const preview=await loadStage10CardPreview(draft.creditCardId,draft.date,
    draft.amountInput,Number(draft.installmentsInput),controller.signal);
   if(!controller.signal.aborted&&readSession()?.user.id===expectedUser)
    setCardSchedule(preview);
  }catch(cause){
   if(!controller.signal.aborted)
    setNotice(cause instanceof Error?cause.message:'Não foi possível consultar o parcelamento canônico.');
  }
 }
 async function saveExpense(draft:ExpenseDraft,kind:'create'|'edit'){
  if(savingRef.current)return;
  const session=readSession();
  if(!writeEnabled||!data||!session||session.user.id!==data.userId){
   setNotice('Gravacao indisponivel nesta build. Nenhum dado foi alterado.');return;
  }
  savingRef.current=true;setSaving(true);setNotice('');
  try{
   const fingerprint=JSON.stringify({kind,editId:edit?.id??null,draft});
   if(operationRef.current?.fingerprint!==fingerprint)
    operationRef.current={fingerprint,operationId:crypto.randomUUID()};
   const operationId=operationRef.current.operationId;
   if(kind==='create'){
    const category=data.catalogs.categories.find(item=>item.active&&item.id===draft.categoryId);
    if(isStage10FoodBenefitCategory(category)){
     const command=prepareStage10BenefitExpenseCreate(draft,data.catalogs);
     await financeClient.createBenefitEvent({...command,operationId});
    }else{
     const command=prepareStage10ExpenseCreate(draft,data.catalogs);
     await financeClient.createEvent({...command,operationId});
    }
   }else{
    const event=data.events.find(item=>item.id===edit?.id);
    if(edit?.financialScope==='benefit'){
     const command=prepareStage10BenefitExpenseUpdate(draft,data.catalogs,event!);
     await financeClient.updateBenefitEvent(event!.id,{...command,operationId});
    }else{
     const command=prepareStage10ExpenseUpdate(draft,data.catalogs,event!);
     await financeClient.bulkUpdateEvents({...command,operationId});
    }
   }
   operationRef.current=null;
   setOverlay(null);setEdit(null);setDuplicate(null);
   setNotice(kind==='create'?'Lancamento criado pela API financeira.':'Alteracoes registradas pela API financeira.');
   setRevision(n=>n+1);
  }catch(cause){
   setNotice('Nao foi possivel concluir a gravacao: '+(cause instanceof Error?cause.message:'erro desconhecido')+'. O historico nao foi alterado nesta tela.');
  }finally{savingRef.current=false;setSaving(false);}
 }
 async function archiveExpense(){
  if(savingRef.current)return;
  const session=readSession();
  if(!writeEnabled||!data||!edit||edit.financialScope==='benefit'||!session||session.user.id!==data.userId||
    !['ADMIN','MANAGER'].includes(session.user.role)){
   setNotice('Exclusao nao autorizada. Nenhum dado foi alterado.');return;
  }
  savingRef.current=true;setSaving(true);setNotice('');
  try{
   const event=data.events.find(item=>item.id===edit.id);
   const command=prepareStage10ExpenseArchive(event!);
   const fingerprint=JSON.stringify({kind:'archive',command});
   if(operationRef.current?.fingerprint!==fingerprint)
    operationRef.current={fingerprint,operationId:crypto.randomUUID()};
   await financeClient.bulkArchiveEvents({...command,operationId:operationRef.current.operationId});
   operationRef.current=null;
   setOverlay(null);setEdit(null);
   setNotice('Lancamento arquivado pela API financeira, com auditoria.');
   setRevision(n=>n+1);
  }catch(cause){
   setNotice('Exclusao nao concluida: '+(cause instanceof Error?cause.message:'erro desconhecido')+'.');
  }finally{savingRef.current=false;setSaving(false);}
 }
 function navigate(next:Screen){cardPreviewRef.current?.abort();setCardSchedule(undefined);
  setOverlay(null);setNotice('');setScreen(next);}
 function signOut(){cardPreviewRef.current?.abort();clearSession();setAuthenticated(false);setData(null);setOverlay(null);navigate('login');}
 function openNew(){cardPreviewRef.current?.abort();setCardSchedule(undefined);setOverlay('choice');setNotice('');}
 function capture(event:MouseEvent<HTMLDivElement>){
  const target=event.target;
  if(!(target instanceof Element))return;
  const button=target.closest('button');
  if(button?.getAttribute('aria-label')==='Novo lançamento'){
   event.preventDefault();event.stopPropagation();openNew();
  }
 }
 function openEdit(row:QaLaunchTarget){
  if(!data)return;
  const snapshot=realEdit(row,data);
  if(!snapshot){setNotice('Edicao bloqueada: categoria, conta e forma de pagamento sem identidade canônica comprovada.');return;}
  setEdit(snapshot);setNotice('');setOverlay('edit');
 }
 function openDuplicate(row:QaLaunchTarget){
  if(!data)return;
  const draft=realDuplicate(row,data);
  if(!draft){setNotice('Duplicacao bloqueada: vinculos financeiros nao comprovados.');return;}
  setDuplicate(draft);setNotice('');setOverlay('duplicate');
 }
 if(!enabled)return <main data-meg-unified-screen="real-blocked" className="meg-unified-read-locked" role="alert">
  <h1>Leitura real bloqueada nesta QA</h1>
  <p>{blockedReason}</p>
  <p>Nenhuma credencial foi solicitada e nenhum dado ficticio substituiu dados reais.</p>
 </main>;
 if(!authenticated){
  if(screen==='register')return <div data-meg-unified-screen="register"><CreateAccountScreen previewOnly onNavigateLogin={()=>navigate('login')} onAuthenticated={()=>navigate('login')}/></div>;
  if(screen==='recover')return <div data-meg-unified-screen="recover"><RecoverPasswordScreen previewOnly onNavigateLogin={()=>navigate('login')}/></div>;
  return <div data-meg-unified-screen="login" className="meg-unified-auth">
   <LoginScreen onAuthenticated={()=>{setAuthenticated(true);navigate('launches');}}
    onNavigate={target=>navigate(target==='create-account'?'register':'recover')}/>
  </div>;
 }
 if(loading||!data||error)return <main data-meg-unified-screen="real-loading" className="meg-unified-read-locked" role={error?'alert':'status'}>
  <h1>{error?'Nao foi possivel ler os dados':'Conferindo seus dados financeiros'}</h1>
  <p>{error||'Validando sessao, historico completo e versao. Nenhum resultado parcial sera publicado.'}</p>
  {error&&<button type="button" onClick={()=>setRevision(n=>n+1)}>Tentar novamente</button>}
  <button type="button" onClick={signOut}>Voltar ao login</button>
 </main>;
 const periodLabel=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
 return <div data-meg-unified-screen={screen} onClickCapture={capture}>
  <AppShell activeSection={screen==='launches'?'launches':'home'}
   profileName={data.userName} periodLabel={periodLabel}
   onNavigate={next=>navigate(next==='launches'?'launches':'home')} onLogout={signOut}>
   {screen==='launches'?<LaunchesStage09
    data={data.launches} mode="live" periodMonth={month} userId={data.userId}
    exportUserName={data.userName} qaActions qaBatchCatalogs={data.catalogs}
    onQaEdit={openEdit} onQaDuplicate={openDuplicate} onQaNotice={setNotice}
    onRefresh={()=>setRevision(n=>n+1)} onNew={openNew} onHome={()=>navigate('home')}/>
    :<section className="meg-l09" role="status" aria-label="Home real indisponivel">
      <div className="meg-l09-preview-warning">A Home real permanece bloqueada: beneficios, faturas e compromissos ainda exigem contratos canônicos de leitura sem efeitos colaterais. Nenhum indicador incompleto foi publicado.</div>
      <button type="button" className="meg-l09-add" onClick={()=>navigate('launches')}>Voltar aos lançamentos reais</button>
     </section>}
  </AppShell>
  {overlay==='choice'&&<div className="meg-new-launch__overlay is-choice-overlay meg-unified-choice-overlay">
   <section className="meg-new-launch is-choose" role="dialog" aria-modal="true" aria-labelledby="meg-unified-real-title">
    <header className="meg-new-launch__header">
     <div className="meg-new-launch__headline"><h2 id="meg-unified-real-title">Novo lançamento</h2><p>Escolha o tipo de lançamento.</p></div>
     <button type="button" className="meg-new-launch__close" aria-label="Fechar novo lançamento" onClick={()=>setOverlay(null)}><PrismCloseGlyph/></button>
    </header>
    <PrismLaunchChoice onBack={()=>setOverlay(null)} onChoose={type=>{
     if(type==='expense')setOverlay('expense');
     else setNotice('Este tipo depende de uma etapa financeira nao autorizada.');
    }}/>
   </section>
  </div>}
  {overlay==='expense'&&<ExpenseForm catalogs={data.catalogs} historySnapshot={data.history}
   schedule={cardSchedule} onRequestSchedule={draft=>void requestCardSchedule(draft)}
   dataMode={writeEnabled?'real-write':'real-read'}
   saveEnabled={writeEnabled&&!saving} onRequestSave={draft=>void saveExpense(draft,'create')}
   onBack={()=>setOverlay('choice')}/>}
  {overlay==='edit'&&edit&&<EditExpensePreview snapshot={edit} catalogs={data.catalogs}
   readOnly={!writeEnabled||saving} onRequestSave={draft=>void saveExpense(draft,'edit')}
   onRequestArchive={writeEnabled&&!saving&&edit.financialScope==='monetary'&&['ADMIN','MANAGER'].includes(userRole||'')?
    ()=>void archiveExpense():undefined}
   onBack={()=>{setOverlay(null);setEdit(null);}}/>}
  {overlay==='duplicate'&&duplicate&&<ExpenseForm catalogs={data.catalogs} historySnapshot={data.history}
   schedule={cardSchedule} onRequestSchedule={draft=>void requestCardSchedule(draft)}
   dataMode={writeEnabled?'real-write':'real-read'}
   initialDraft={duplicate} saveEnabled={writeEnabled&&!saving}
   onRequestSave={draft=>void saveExpense(draft,'create')}
   onBack={()=>{setOverlay(null);setDuplicate(null);}}/>}
  {notice&&<output className="meg-unified-notice" role="status">{notice}
   <button type="button" aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button>
  </output>}
  <aside className="meg-unified-stamp" role="note">{writeEnabled?'QA UNIFICADA · Dados reais autenticados · Gravacao canonica':'QA UNIFICADA · Dados reais autenticados · Somente leitura'}</aside>
 </div>;
}
