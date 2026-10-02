import { useEffect, type ReactNode } from 'react';
import { WebNextIcon } from './WebNextIcon';
import '../styles/overlays.css';

export function WebNextModal({
  open,
  title,
  eyebrow,
  children,
  footer,
  size='md',
  onClose,
  ariaLabel,
}:{
  open:boolean;
  title:string;
  eyebrow?:string;
  children:ReactNode;
  footer?:ReactNode;
  size?:'sm'|'md'|'lg'|'xl';
  onClose:()=>void;
  ariaLabel?:string;
}) {
  useEffect(()=>{
    if(!open) return;
    const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[open,onClose]);

  if(!open)return null;

  return <div className="mnx-overlay" data-web-next-overlay="modal">
    <button className="mnx-overlay-backdrop" type="button" aria-label="Fechar" onClick={onClose}/>
    <section className={`mnx-modal is-${size}`} role="dialog" aria-modal="true" aria-label={ariaLabel||title}>
      <header><div>{eyebrow?<small>{eyebrow}</small>:null}<h2>{title}</h2></div><button type="button" aria-label="Fechar" onClick={onClose}>×</button></header>
      <div className="mnx-modal-body">{children}</div>
      {footer?<footer className="mnx-modal-footer">{footer}</footer>:null}
    </section>
  </div>;
}

export function WebNextConfirm({
  open,
  title,
  message,
  confirmLabel='Confirmar',
  cancelLabel='Cancelar',
  tone='danger',
  onConfirm,
  onCancel,
}:{
  open:boolean;
  title:string;
  message:string;
  confirmLabel?:string;
  cancelLabel?:string;
  tone?:'danger'|'primary';
  onConfirm:()=>void;
  onCancel:()=>void;
}) {
  return <WebNextModal open={open} title={title} eyebrow="MEG Finanças" size="sm" onClose={onCancel} ariaLabel={title}>
    <div className="mnx-confirm-copy"><span className={`mnx-confirm-icon is-${tone}`}><WebNextIcon name={tone==='danger'?'logout':'bell'}/></span><p>{message}</p></div>
    <div className="mnx-confirm-actions"><button type="button" onClick={onCancel}>{cancelLabel}</button><button className={tone==='danger'?'is-danger':'is-primary'} type="button" onClick={onConfirm}>{confirmLabel}</button></div>
  </WebNextModal>;
}
