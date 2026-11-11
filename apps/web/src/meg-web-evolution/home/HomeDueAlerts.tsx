import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {authenticatedRequest} from '../../app/auth-client';
import {Icon} from '../components/Icon';
import {readCanonicalHomeCommitments,type CanonicalHomeCommitment} from './home-commitments-read';
import './home-due-alerts.css';

export const DUE_REMINDER_INTERVAL_MS=60*60*1000;
type Source={
 items:CanonicalHomeCommitment[];
 owner:string;
 preview:boolean;
 hidden:boolean;
 openAll:()=>void;
};
type ContextValue={
 publish:(source:Source|null)=>void;
 indicator:boolean;
 bellOpen:boolean;
 toggleBell:()=>void;
};
const AlertsContext=createContext<ContextValue|null>(null);
const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const dateBR=(v:string)=>v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4);
const todayBR=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=(k:string)=>parts.find(v=>v.type===k)?.value??'00';
 return get('year')+get('month')+get('day');
};
const seenKey=(owner:string)=>'meg-due-entry-alert:'+owner+':'+todayBR();
const wasShown=(owner:string)=>{
 try{return sessionStorage.getItem(seenKey(owner))==='1'}catch{return false}
};
const markShown=(owner:string)=>{
 try{sessionStorage.setItem(seenKey(owner),'1')}catch{/* sessão sem storage permanece funcional */}
};
export const shouldRemindDueAlert=(now:number,last:number,visible:boolean)=>
 visible&&now-last>=DUE_REMINDER_INTERVAL_MS;

export function useHomeDueAlertPublisher(){
 return useContext(AlertsContext)?.publish;
}

function AlertItem({item,hidden}:{item:CanonicalHomeCommitment;hidden:boolean}){
 return <li className={'meg-due-alert-item is-'+item.dueState.replace('_','-')}>
  <span className="meg-due-alert-item__state">
   {item.dueState==='overdue'?'Vencido':'Vence hoje'}
  </span>
  <span className="meg-due-alert-item__detail">
   <strong title={item.description}>{item.description}</strong>
   <small>Vencimento: {dateBR(item.dueDate)}</small>
  </span>
  <strong className="meg-due-alert-item__amount">
   {hidden?'R$ •••••':currency.format(Number(item.amount))}
  </strong>
 </li>;
}

export function HomeDueAlertsBell(){
 const alerts=useContext(AlertsContext);
 return <button type="button" className="meg-notification meg-due-bell-button"
  aria-label="Notificações" aria-expanded={alerts?.bellOpen??false}
  onClick={()=>alerts?.toggleBell()}>
  <Icon name="bell" width={21} height={21}/>
  {alerts?.indicator&&<span className="meg-notification-dot" aria-hidden="true"/>}
 </button>;
}

/**
 * Exibe itens canônicos, jamais calcula vencimento/valor/total.
 * Ao entrar: modal uma vez por sessão e proprietário.
 * A cada hora com a aplicação visível: reconsulta a API antes de lembrar.
 * Prévia: apenas dados sintéticos, nenhuma chamada à API.
 */
export function HomeDueAlertsProvider({children}:{children:ReactNode}){
 const [source,setSource]=useState<Source|null>(null);
 const currentSource=useRef<Source|null>(null);
 const [verified,setVerified]=useState<CanonicalHomeCommitment[]|null>(null);
 const [modalOpen,setModalOpen]=useState(false);
 const [bellOpen,setBellOpen]=useState(false);
 const [toastOpen,setToastOpen]=useState(false);
 const [refreshError,setRefreshError]=useState(false);
 const lastCheck=useRef(Date.now());
 const checking=useRef(false);
 const dialog=useRef<HTMLDialogElement|null>(null);

 const publish=useCallback((next:Source|null)=>{
  const previous=currentSource.current;
  currentSource.current=next;
  setSource(next);
  setVerified(null);
  if(!next){
   setBellOpen(false);
   setModalOpen(false);
   setToastOpen(false);
   return;
  }
  if(previous?.owner!==next.owner)lastCheck.current=Date.now();
  const urgent=next.items.some(i=>i.dueState==='overdue'||i.dueState==='due_today');
  if(urgent&&!wasShown(next.owner)){
   markShown(next.owner);
   lastCheck.current=Date.now();
   setModalOpen(true);
  }
 },[]);
 const items=verified??source?.items??[];
 const overdue=items.filter(i=>i.dueState==='overdue');
 const today=items.filter(i=>i.dueState==='due_today');
 const selected=[...overdue.slice(0,3),...today.slice(0,2)];
 const hasAlert=selected.length>0;
 const ctx=useMemo<ContextValue>(()=>({
  publish,indicator:hasAlert,bellOpen,toggleBell:()=>setBellOpen(v=>!v),
 }),[publish,hasAlert,bellOpen]);
 const openAll=()=>{
  setModalOpen(false);
  setBellOpen(false);
  setToastOpen(false);
  currentSource.current?.openAll();
 };
 const dismiss=()=>setModalOpen(false);

 useEffect(()=>{
  if(modalOpen&&dialog.current&&!dialog.current.open)dialog.current.showModal();
  if(!modalOpen&&dialog.current?.open)dialog.current.close();
 },[modalOpen]);

 const check=useCallback(async()=>{
  const snap=currentSource.current;
  if(!snap||checking.current||!shouldRemindDueAlert(Date.now(),lastCheck.current,document.visibilityState==='visible'))return;
  checking.current=true;
  try{
   // Nenhum lembrete com registro antigo é disparado sem revalidação.
   const fresh=snap.preview?snap.items:await readCanonicalHomeCommitments(authenticatedRequest);
   if(currentSource.current!==snap)return;
   setVerified(fresh);
   setRefreshError(false);
   lastCheck.current=Date.now();
   setToastOpen(fresh.some(i=>i.dueState==='overdue'));
  }catch{
   if(currentSource.current===snap){
    // Erro de API não prova que uma dívida permaneça vencida.
    setRefreshError(true);
    setToastOpen(false);
    lastCheck.current=Date.now();
   }
  }finally{checking.current=false}
 },[]);
 useEffect(()=>{
  if(!source)return;
  const timer=window.setInterval(()=>void check(),60*1000);
  const onVisible=()=>{if(document.visibilityState==='visible')void check()};
  document.addEventListener('visibilitychange',onVisible);
  window.addEventListener('focus',onVisible);
  return()=>{
   window.clearInterval(timer);
   document.removeEventListener('visibilitychange',onVisible);
   window.removeEventListener('focus',onVisible);
  };
 },[source,check]);
 useEffect(()=>{
  if(!toastOpen)return;
  const id=window.setTimeout(()=>setToastOpen(false),16000);
  return()=>window.clearTimeout(id);
 },[toastOpen]);

 return <AlertsContext.Provider value={ctx}>
  {children}
  {modalOpen&&source&&hasAlert&&createPortal(
   <dialog className="meg-due-alert-dialog" ref={dialog}
    aria-labelledby="meg-due-alert-title" onCancel={dismiss} onClose={dismiss}>
    <div className="meg-due-alert-dialog__top">
     <span className="meg-due-alert-dialog__emblem" aria-hidden="true"><Icon name="clock" width={28} height={28}/></span>
     <button type="button" className="meg-due-alert-dialog__close"
      aria-label="Fechar alerta de vencimentos" onClick={dismiss}>×</button>
    </div>
    <span className="meg-due-alert-dialog__eyebrow">ALERTA FINANCEIRO</span>
    <h2 id="meg-due-alert-title">Atenção aos seus vencimentos</h2>
    <p className="meg-due-alert-dialog__intro">
     {overdue.length?'Identificamos compromisso vencido na consulta inicial.':
      'Há compromissos com vencimento hoje na consulta inicial.'}
     {' '}Confira os detalhes e decida o próximo passo.
    </p>
    <ul className="meg-due-alert-dialog__list">
     {selected.map(item=><AlertItem key={item.id} item={item} hidden={source.hidden}/>)}
    </ul>
    <p className="meg-due-alert-dialog__note">
     Estes são destaques da consulta inicial. Outros compromissos podem existir na lista completa.
    </p>
    <div className="meg-due-alert-dialog__actions">
     <button type="button" className="meg-due-alert-dialog__primary" onClick={openAll}>
      Ver todos os compromissos <Icon name="chevronRight" width={17} height={17}/>
     </button>
     <button type="button" className="meg-due-alert-dialog__secondary" onClick={dismiss}>Entendi</button>
    </div>
   </dialog>,document.body
  )}
  {bellOpen&&createPortal(
   <div className="meg-due-bell-layer">
    <button type="button" className="meg-due-bell-backdrop"
     aria-label="Fechar notificações" onClick={()=>setBellOpen(false)}/>
    <section className="meg-due-bell-panel" aria-label="Notificações financeiras">
     <header><strong>Notificações financeiras</strong>
      <button type="button" aria-label="Fechar painel de notificações" onClick={()=>setBellOpen(false)}>×</button>
     </header>
     {hasAlert&&source?<>
      <p>Destaques dos compromissos consultados</p>
      <ul>{selected.map(item=><AlertItem key={item.id} item={item} hidden={source.hidden}/>)}</ul>
      <button type="button" className="meg-due-bell-panel__all" onClick={openAll}>Ver todos os compromissos</button>
     </>:<p>{source?
      'Nenhum alerta identificado nesta consulta. A lista completa pode conter outros compromissos.':
      'A consulta de compromissos ainda não foi carregada nesta tela.'}</p>}
     {refreshError&&<p role="status">Não foi possível atualizar a leitura. Nenhum lembrete foi emitido com dados antigos.</p>}
    </section>
   </div>,document.body
  )}
  {toastOpen&&overdue.length>0&&createPortal(
   <div className="meg-due-reminder" role="status">
    <Icon name="bell" width={19} height={19}/>
    <div><strong>Lembrete de vencimento</strong>
     <p>Há compromisso vencido confirmado na última consulta. Verifique as notificações.</p>
    </div>
    <button type="button" aria-label="Dispensar lembrete" onClick={()=>setToastOpen(false)}>×</button>
   </div>,document.body
  )}
 </AlertsContext.Provider>;
}
