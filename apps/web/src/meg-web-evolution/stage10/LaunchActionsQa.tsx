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
function ActionGlyph({kind}:{kind:'edit'|'view'|'dots'|'duplicate'|'history'|'settle'|'archive'|'batch'}){
 const paths={
  edit:<><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/></>,
  view:<><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  dots:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
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
  const keys=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close();trigger.current?.focus();}};
  const scroll=()=>close();
  document.addEventListener('pointerdown',dismiss);
  document.addEventListener('keydown',keys);
  window.addEventListener('scroll',scroll,true);
  return ()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',keys);window.removeEventListener('scroll',scroll,true);};
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
  ['view','view','Ver detalhes'],['edit','edit','Editar lançamento'],['duplicate','duplicate','Duplicar como rascunho'],
  ['history','history','Histórico de alterações'],['settle','settle','Confirmar pagamento'],['archive','archive','Arquivar lançamento']
 ];
 return <span className="meg-t10-qa-row-actions" data-testid={'qa-actions-'+row.id}>
  <button type="button" className="meg-t10-qa-action primary" aria-label={(canEdit?'Editar ':'Ver detalhes de ')+row.description}
   title={canEdit?'Editar lançamento (QA, sem gravação)':'Ver detalhes'} onClick={canEdit?onEdit:onView}>
   <ActionGlyph kind={canEdit?'edit':'view'}/>
  </button>
  <button ref={trigger} type="button" className="meg-t10-qa-action" aria-label={'Mais ações de '+row.description}
   aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={open}><ActionGlyph kind="dots"/></button>
  {position&&createPortal(<div ref={menuNode} className="meg-t10-qa-menu" role="menu"
   aria-label={'Ações de '+row.description} style={{top:position.top,left:position.left}}>
   <p>{row.description}</p>
   {options.map(([action,glyph,label])=><button key={action} type="button" role="menuitem" onClick={()=>perform(action)}>
    <ActionGlyph kind={glyph}/><span>{label}</span>
    {(action==='settle'||action==='archive'||action==='history')&&<small>Protegido</small>}
   </button>)}
   <small className="meg-t10-qa-menu-foot">Simulação QA, nenhuma gravação financeira.</small>
  </div>,document.body)}
 </span>;
}

export function QaBatchEditor({items,categories,onClose,onSimulate}:{
 items:readonly QaLaunchTarget[];categories:readonly {id:string;name:string}[];
 onClose:()=>void;onSimulate:(count:number)=>void;
}){
 const [notesChecked,setNotesChecked]=useState(false);
 const [categoryChecked,setCategoryChecked]=useState(false);
 const [notes,setNotes]=useState('');
 const [categoryId,setCategoryId]=useState('');
 const surface=useRef<HTMLElement|null>(null);
 const closeButton=useRef<HTMLButtonElement|null>(null);
 const valid=items.length>0&&((notesChecked&&notes.trim().length>0)||(categoryChecked&&Boolean(categoryId)))&&
  (!notesChecked||notes.trim().length>0)&&(!categoryChecked||Boolean(categoryId));
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';closeButton.current?.focus();
  const keys=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();return;}
   if(event.key!=='Tab')return;
   const active=[...(surface.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')??[])].filter(el=>el.getClientRects().length>0);
   if(!active.length)return;
   if(event.shiftKey&&document.activeElement===active[0]){event.preventDefault();active[active.length-1].focus();}
   else if(!event.shiftKey&&document.activeElement===active[active.length-1]){event.preventDefault();active[0].focus();}
  };
  document.addEventListener('keydown',keys);
  return ()=>{document.removeEventListener('keydown',keys);document.body.style.overflow=overflow;previous?.focus();};
 },[onClose]);
 return createPortal(<div className="meg-t10-qa-batch-backdrop">
  <section ref={surface} className="meg-t10-qa-batch" role="dialog" aria-modal="true"
   aria-labelledby="meg-t10-batch-title" aria-describedby="meg-t10-batch-description" data-testid="qa-batch-dialog">
   <header><div><span>MEG PRISM 2.0 · EDIÇÃO EM LOTE</span><h2 id="meg-t10-batch-title">Editar em lote ({items.length})</h2>
    <p id="meg-t10-batch-description">Prévia demonstrativa: selecione campos para alterar. Nenhum lançamento será gravado.</p></div>
    <button ref={closeButton} type="button" aria-label="Fechar edição em lote" onClick={onClose}>×</button>
   </header>
   <div className="meg-t10-qa-batch-content">
    <div className="meg-t10-qa-batch-fields">
     <h3>Alterações solicitadas</h3><p>Somente os campos marcados participam da simulação.</p>
     <label className="meg-t10-qa-batch-toggle"><input type="checkbox" checked={notesChecked} onChange={e=>setNotesChecked(e.target.checked)}/> Alterar observações</label>
     {notesChecked&&<label>Novas observações<textarea value={notes} onChange={e=>setNotes(e.target.value.toLocaleUpperCase('pt-BR'))} maxLength={500} placeholder="Digite as observações"/></label>}
     <label className="meg-t10-qa-batch-toggle"><input type="checkbox" checked={categoryChecked} onChange={e=>setCategoryChecked(e.target.checked)}/> Alterar categoria</label>
     {categoryChecked&&<label>Nova categoria<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
      <option value="">Selecione uma categoria</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
     </select></label>}
     <div className="meg-t10-qa-batch-locked"><strong>Campos financeiros protegidos</strong><p>Valor, data, conta, status, cartão, fatura, parcelas e competência não estão disponíveis para edição coletiva. Classificação exige catálogo canônico.</p></div>
    </div>
    <div className="meg-t10-qa-batch-selection"><h3>Registros selecionados <span>{items.length}</span></h3>
     <p>A seleção pode incluir outras páginas ou filtros. Confira todos os registros.</p>
     <ul>{items.map(item=><li key={item.id}><strong>{item.description}</strong><span>{item.date} · {item.category} · {item.type==='expense'?'Despesa':item.type==='income'?'Receita':item.type}</span></li>)}</ul>
    </div>
   </div>
   <footer><span>QA isolada: sem PATCH, DELETE ou baixa.</span><div>
    <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
    <button type="button" className="primary" disabled={!valid} onClick={()=>onSimulate(items.length)}>Simular alterações</button>
   </div></footer>
  </section>
 </div>,document.body);
}
