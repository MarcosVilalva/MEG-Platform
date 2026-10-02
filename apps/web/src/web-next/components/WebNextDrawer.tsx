import { useEffect, type ReactNode } from 'react';
import '../styles/overlays.css';

export function WebNextDrawer({
  open,
  title,
  eyebrow,
  children,
  footer,
  onClose,
}:{
  open:boolean;
  title:string;
  eyebrow?:string;
  children:ReactNode;
  footer?:ReactNode;
  onClose:()=>void;
}) {
  useEffect(()=>{
    if(!open)return;
    const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[open,onClose]);

  if(!open)return null;

  return <div className="mnx-overlay" data-web-next-overlay="drawer">
    <button className="mnx-overlay-backdrop" type="button" aria-label="Fechar painel" onClick={onClose}/>
    <aside className="mnx-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <header><div>{eyebrow?<small>{eyebrow}</small>:null}<h2>{title}</h2></div><button type="button" aria-label="Fechar" onClick={onClose}>×</button></header>
      <div className="mnx-drawer-body">{children}</div>
      {footer?<footer className="mnx-drawer-footer">{footer}</footer>:null}
    </aside>
  </div>;
}
