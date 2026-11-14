import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './LaunchActionsQa.css';

/** Exclusively Stage 10 QA. No financial mutation, identity inference or writer. */
export type QaLaunchTarget={
 id:string;description:string;date:string;notes:string;type:string;status:string;
 categoryId:string;category:string;accountId:string;account:string;
 accountKind:'monetary'|'benefit'|'unknown';paymentMethod:string;signedAmount:number;
};
type Action='edit'|'view'|'duplicate'|'history'|'settle'|'archive';
function ActionGlyph({kind}:{kind:'edit'|'view'|'duplicate'|'history'|'settle'|'archive'|'batch'}){
 const paths={
  edit:<><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/></>,
  view:<><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  duplicate:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  history:<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  settle:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  archive:<><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/></>,
  batch:<><path d="M9 6h12M9 12h12M9 18h12M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/></>
 };
 return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
export {ActionGlyph};

export function LaunchRowQaActions({row,canEdit,onView,onEdit,onDuplicate,onNotice}:{
 row:QaLaunchTarget;canEdit:boolean;onView:()=>void;onEdit:()=>void;
 onDuplicate:()=>void;onNotice:(message:string)=>void;
}){
 const trigger=useRef<HTMLButtonElement|null>(null);
 const menuNode=useRef<HTMLDivElement|null>(null);
 const [position,setPosition]=useState<{top:number;left:number}|null>(null);
 const close=()=>{setPosition(null);};
 useEffect(()=>{
  if(!position)return;
  const dismiss=(event:PointerEvent)=>{
   const target=event.target;
   if(target instanceof Node&&!menuNode.current?.contains(target)&&!trigger.current?.contains(target))close();
  };
  const keys=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();close();trigger.current?.focus();return;}
   if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
   const items=Array.from(menuNode.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')??[]);
   if(!items.length)return;
   event.preventDefault();
   const current=items.findIndex(item=>item===document.activeElement);
   const next=event.key==='Home'?0:event.key==='End'?items.length-1:
    event.key==='ArrowDown'?(current+1)%items.length:(current-1+items.length)%items.length;
   items[next].focus({preventScroll:true});
  };
  document.addEventListener('pointerdown',dismiss);
  document.addEventListener('keydown',keys);
  // O DataGrid pode rolar ao dar foco ao menu; não confundir isso com fechamento voluntário.
  const focusFrame=window.requestAnimationFrame(()=>menuNode.current?.querySelector<HTMLButtonElement>('button[role="menuitem"]')?.focus({preventScroll:true}));
  return ()=>{window.cancelAnimationFrame(focusFrame);document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',keys);};
 },[position]);
 const open=()=>{
  if(position){close();return;}
  const rect=trigger.current?.getBoundingClientRect();
  if(!rect)return;
  setPosition({left:Math.min(Math.max(8,rect.right-232),Math.max(8,window.innerWidth-240)),
   top:rect.bottom+282>window.innerHeight?Math.max(8,rect.top-282):rect.bottom+6});
 };
 const perform=(action:Action)=>{
  close();
  switch(action){
   case 'view':onView();break;
   case 'edit':canEdit?onEdit():onNotice('Este tipo de lançamento exige um editor próprio. Consulta preservada.');break;
   case 'duplicate':canEdit?onDuplicate():onNotice('Duplicação indisponível para este domínio financeiro na QA.');break;
   case 'history':onNotice('Histórico de auditoria requer leitura canônica. Nenhum histórico de alterações foi inventado nesta QA.');break;
   case 'settle':onNotice('Baixa financeira exige writer protegido e permanece bloqueada.');break;
   case 'archive':onNotice('Arquivamento exige autorização e writer protegido. Nenhum dado foi alterado.');break;
  }
 };
 const options:readonly [Action,'edit'|'view'|'duplicate'|'history'|'settle'|'archive',string][]=[
  ['edit','edit','Editar lançamento'],['view','view','Ver detalhes'],['duplicate','duplicate','Duplicar como rascunho'],
  ['history','history','Histórico de alterações'],['settle','settle','Confirmar pagamento'],['archive','archive','Arquivar lançamento']
 ];
 return <span className="meg-t10-qa-row-actions" data-testid={'qa-actions-'+row.id}>
  <button ref={trigger} type="button" className="meg-t10-qa-action meg-t10-qa-dropdown"
   aria-label={'Ações de '+row.description} title={'Ações de '+row.description}
   aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={open}>
    <span className="meg-t10-qa-dropdown-symbol" aria-hidden="true">
     <svg className="meg-t10-qa-dropdown-list" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M2 4.5h13M2 9h13M2 13.5h13"/>
     </svg>
     <svg className="meg-t10-qa-dropdown-caret" viewBox="0 0 12 12" fill="none">
      <path d="M1.8 4.1 6 8.2l4.2-4.1Z" fill="currentColor"/>
     </svg>
    </span>
   </button>
  {position&&createPortal(<div ref={menuNode} className="meg-t10-qa-menu" role="menu"
   aria-label={'Ações de '+row.description} style={{top:position.top,left:position.left}}>
   <p>{row.description}</p>
   {options.map(([action,glyph,label])=><button key={action} type="button" role="menuitem" onClick={()=>perform(action)}>
    <ActionGlyph kind={glyph}/><span>{label}</span>
    {(action==='settle'||action==='archive'||action==='history'||(!canEdit&&(action==='edit'||action==='duplicate')))&&<small>Protegido</small>}
   </button>)}
   <small className="meg-t10-qa-menu-foot">Simulação QA, nenhuma gravação financeira.</small>
  </div>,document.body)}
 </span>;
}

