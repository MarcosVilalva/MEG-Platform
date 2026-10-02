import { WebNextIcon } from './WebNextIcon';
import '../styles/overlays.css';

export type WebNextToast = {
  id:string;
  title:string;
  message?:string;
  tone?:'success'|'warning'|'danger'|'info';
};

export function WebNextToastStack({toasts,onDismiss}:{toasts:WebNextToast[];onDismiss:(id:string)=>void}) {
  if(!toasts.length)return null;
  return <div className="mnx-toast-stack" aria-live="polite" aria-atomic="false">
    {toasts.map((toast)=><article className={`mnx-toast is-${toast.tone||'info'}`} key={toast.id}>
      <span><WebNextIcon name={toast.tone==='danger'?'bell':toast.tone==='warning'?'bell':'analytics'}/></span>
      <div><strong>{toast.title}</strong>{toast.message?<small>{toast.message}</small>:null}</div>
      <button type="button" aria-label="Dispensar" onClick={()=>onDismiss(toast.id)}>×</button>
    </article>)}
  </div>;
}
