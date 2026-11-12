import {useEffect, useRef, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import './LaunchTypeChooser.css';

/** Exclusivamente seleção de tipo. Nenhum writer financeiro é invocado aqui. */
import {NEW_LAUNCH_TYPES, type NewLaunchType} from './launch-type-options';
export type {NewLaunchType} from './launch-type-options';

type Props = {
 open:boolean;
 onClose:()=>void;
 onSelect:(type:NewLaunchType)=>void;
};
function Glyph({type}:{type:NewLaunchType}):ReactNode {
 const paths:Record<NewLaunchType,ReactNode>={
  expense:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  income:<><path d="M12 21V3M4 11l8-8 8 8"/></>,
  transfer:<><path d="M3 8h18m-6-5 6 5-6 5M21 16H3m6-5-6 5 6 5"/></>,
  benefit:<><path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18M17 3c-3 3-3 8-3 11h5M19 3v18"/></>,
 };
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export function LaunchTypeChooser({open,onClose,onSelect}:Props){
 const ref=useRef<HTMLDivElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const formerOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  function keydown(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();onClose();return;}
   if(event.key!=='Tab')return;
   const focusables=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled])')||[]);
   if(!focusables.length)return;
   const first=focusables[0],last=focusables[focusables.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  function keepFocusInside(event:FocusEvent){
   if(ref.current && event.target instanceof Node && !ref.current.contains(event.target)){
    closeRef.current?.focus();
   }
  }
  document.addEventListener('keydown',keydown);
  document.addEventListener('focusin',keepFocusInside);
  return ()=>{
   document.body.style.overflow=formerOverflow;
   document.removeEventListener('keydown',keydown);
   document.removeEventListener('focusin',keepFocusInside);
   previous?.focus();
  };
 },[open,onClose]);
 if(!open)return null;
 return createPortal(
  <div className="meg-stage10-backdrop" data-stage10-chooser onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
   <div className="meg-stage10-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="meg-stage10-heading" aria-describedby="meg-stage10-description">
    <header className="meg-stage10-header">
     <button type="button" className="meg-stage10-back" aria-label="Voltar" onClick={onClose}><span aria-hidden="true">←</span></button>
     <div><h2 id="meg-stage10-heading">Novo lançamento</h2><p id="meg-stage10-description">Escolha o tipo de lançamento e siga com um formulário inteligente para Web.</p></div>
     <button type="button" className="meg-stage10-close" ref={closeRef} aria-label="Fechar" onClick={onClose}><span aria-hidden="true">×</span></button>
    </header>
    <div className="meg-stage10-content">
     <section className="meg-stage10-intro" aria-label="Novo lançamento">
      <span className="meg-stage10-eyebrow">NOVO LANÇAMENTO</span>
      <h3>Mais controle{' '}<br/>para o seu{' '}<br/>dia a dia</h3>
      <p>Escolha o tipo de lançamento e preencha as informações no formulário inteligente. O layout da versão Web se adapta automaticamente à largura da sua tela, oferecendo mais espaço, organização e agilidade.</p>
      <div className="meg-stage10-art" aria-hidden="true"><span className="meg-stage10-art-grid"/><span className="meg-stage10-art-line"/></div>
     </section>
     <div className="meg-stage10-options" aria-label="Tipos disponíveis">
      {NEW_LAUNCH_TYPES.map(option=><button key={option.type} type="button" className={`meg-stage10-choice is-${option.type}`} onClick={()=>onSelect(option.type)}>
       <span className="meg-stage10-choice-icon"><Glyph type={option.type}/></span>
       <span className="meg-stage10-choice-text"><strong>{option.title}</strong><span>{option.description}</span><span className="meg-stage10-tags">{option.tags.map(tag=><span key={tag}>{tag}</span>)}</span></span>
       <span className="meg-stage10-choice-arrow" aria-hidden="true">›</span>
      </button>)}
     </div>
    </div>
    <footer className="meg-stage10-footer">
     <div><span className="meg-stage10-footer-icon" aria-hidden="true">▣</span><span><strong>Dimensionamento automático</strong><small>O layout se ajusta à largura da sua tela.</small></span></div>
     <div><span className="meg-stage10-footer-icon" aria-hidden="true">Aa</span><span><strong>Tipografia ampliada</strong><small>Mais legibilidade e conforto visual.</small></span></div>
     <div><span className="meg-stage10-footer-icon" aria-hidden="true">▤</span><span><strong>Responsivo para Web</strong><small>Aproveite todo o espaço da sua tela.</small></span></div>
     <div><span className="meg-stage10-footer-icon is-primary" aria-hidden="true">→</span><span><strong>Escolha uma opção</strong><small>para continuar</small></span></div>
    </footer>
   </div>
  </div>,document.body
 );
}
