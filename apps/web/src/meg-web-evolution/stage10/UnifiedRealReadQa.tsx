import {useEffect,useState,type MouseEvent} from 'react';
import {clearSession} from '../../app/auth-client';
import {LoginScreen} from '../auth/LoginScreen';
import {CreateAccountScreen} from '../auth/CreateAccountScreen';
import {RecoverPasswordScreen} from '../auth/RecoverPasswordScreen';
import {AppShell} from '../shell/AppShell';
import {LaunchesStage09} from '../launches/LaunchesStage09';
import {PrismLaunchChoice,PrismCloseGlyph} from '../integrated-qa/PrismLaunchChoice';
import {ExpenseForm,EMPTY_EXPENSE_DRAFT,type ExpenseDraft} from './ExpenseForm';
import {EditExpensePreview,type EditExpenseSnapshot} from './EditExpensePreview';
import type {QaLaunchTarget} from './LaunchActionsQa';
import {loadStage10RealRead,type Stage10RealRead} from './real-data-read';

type Screen='login'|'register'|'recover'|'home'|'launches';
type Overlay='choice'|'expense'|'edit'|'duplicate'|null;
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

function brazilMonth(){
 const values=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date());
 return (values.find(v=>v.type==='year')?.value||'0000')+'-'+(values.find(v=>v.type==='month')?.value||'00');
}
function selectedRealExpense(row:QaLaunchTarget,data:Stage10RealRead):{
 event:Stage10RealRead['events'][number];accountName:string;
}|null{
 const event=data.events.find(item=>item.id===row.id);
 const account=data.catalogs.accounts.find(item=>item.id===event?.accountId&&item.active&&item.kind==='monetary');
 if(!event||event.type!=='expense'||!['paid','planned'].includes(event.status)||!account)return null;
 return {event,accountName:account.name};
}
function realEdit(row:QaLaunchTarget,data:Stage10RealRead):EditExpenseSnapshot|null{
 const selected=selectedRealExpense(row,data);
 if(!selected)return null;
 const {event,accountName}=selected;
 return {
  source:'financial-event',financialScope:'monetary',type:'expense',
  id:event.id,description:event.description,notes:event.notes||'',
  categoryId:event.categoryId||'',categoryName:row.category,
  accountId:event.accountId,paymentMethodId:event.paymentMethodId,
  strictReferences:true,
  dateDisplay:row.date.slice(8)+'/'+row.date.slice(5,7)+'/'+row.date.slice(0,4),
  amountDisplay:money.format(Math.abs(row.signedAmount)),
  paymentMethodName:row.paymentMethod,accountName,
  statusLabel:event.status==='paid'?'Paga':'Pendente',
 };
}
function realDuplicate(row:QaLaunchTarget,data:Stage10RealRead):ExpenseDraft|null{
 const selected=selectedRealExpense(row,data);
 if(!selected)return null;
 const {event}=selected;
 const category=data.catalogs.categories.find(item=>item.active&&item.id===event.categoryId);
 const method=data.catalogs.paymentMethods.find(item=>item.active&&item.id===event.paymentMethodId&&item.kind==='ordinary');
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
 function navigate(next:Screen){setOverlay(null);setNotice('');setScreen(next);}
 function signOut(){clearSession();setAuthenticated(false);setData(null);setOverlay(null);navigate('login');}
 function openNew(){setOverlay('choice');setNotice('');}
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
  if(!snapshot){setNotice('Edicao bloqueada: identidade da conta monetaria nao comprovada.');return;}
  setEdit(snapshot);setNotice('');setOverlay('edit');
 }
 function openDuplicate(row:QaLaunchTarget){
  if(!data)return;
  const draft=realDuplicate(row,data);
  if(!draft){setNotice('Duplicacao bloqueada: conta monetaria nao comprovada.');return;}
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
   saveEnabled={false} onBack={()=>setOverlay('choice')}/>}
  {overlay==='edit'&&edit&&<EditExpensePreview snapshot={edit} catalogs={data.catalogs}
   onBack={()=>{setOverlay(null);setEdit(null);}}
   onSimulatedSave={()=>setNotice('Previa: alteracao simulada. Nenhuma escrita executada.')}/>}
  {overlay==='duplicate'&&duplicate&&<ExpenseForm catalogs={data.catalogs} historySnapshot={data.history}
   initialDraft={duplicate} saveEnabled={false} onBack={()=>{setOverlay(null);setDuplicate(null);}}/>}
  {notice&&<output className="meg-unified-notice" role="status">{notice}
   <button type="button" aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button>
  </output>}
  <aside className="meg-unified-stamp" role="note">QA UNIFICADA · Dados reais autenticados · Somente leitura</aside>
 </div>;
}
