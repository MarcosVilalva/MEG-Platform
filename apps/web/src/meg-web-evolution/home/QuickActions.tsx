import {useEffect,useRef,useState,type CSSProperties,type TouchEvent} from 'react';
import {HomeGlyph,type HomeIconName} from './HomeGlyph';
import './quick-actions.css';

/** Destinos da Home já identificados. A interface não inventa rotas financeiras. */
export type HomeQuickAction='transferencia'|'pendentes'|'relatorios'|'metas'|'lancamentos'|'cartoes'|'beneficios';
type CatalogEntry={id:HomeQuickAction;title:string;description:string;icon:HomeIconName;kind:string};
const CATALOG:ReadonlyArray<CatalogEntry>=[
 {id:'transferencia',title:'Transferência',description:'Mover entre contas',icon:'transfer',kind:'blue'},
 {id:'pendentes',title:'Pagar conta',description:'Contas e boletos',icon:'receipt',kind:'violet'},
 {id:'relatorios',title:'Relatórios',description:'Extratos e análises',icon:'chart',kind:'amber'},
 {id:'metas',title:'Configurações',description:'Preferências do sistema',icon:'settings',kind:'slate'},
 {id:'lancamentos',title:'Lançamentos',description:'Movimentações financeiras',icon:'activity',kind:'blue'},
 {id:'cartoes',title:'Cartões',description:'Cartões e faturas',icon:'card',kind:'violet'},
 {id:'beneficios',title:'Benefícios',description:'Saldos e recargas',icon:'gift',kind:'slate'}
];
export const DEFAULT_QUICK_ACTIONS:readonly HomeQuickAction[]=CATALOG.slice(0,4).map(item=>item.id);
const PREFIX='meg.web.home.quick-actions.v1.';
function validIds(input:unknown):HomeQuickAction[]|null{
 if(!Array.isArray(input)||input.length>CATALOG.length||input.some(item=>typeof item!=='string'))return null;
 const allowed=new Set<string>(CATALOG.map(item=>item.id));
 if(input.some(item=>!allowed.has(item))||new Set(input).size!==input.length)return null;
 return input as HomeQuickAction[];
}
function storageKey(userId:string|undefined,preview:boolean):string|null{
 if(preview)return PREFIX+'demo';
 return userId?.trim()?PREFIX+'user.'+encodeURIComponent(userId):null;
}
function readActions(key:string|null):HomeQuickAction[]{
 if(!key)return [...DEFAULT_QUICK_ACTIONS];
 try{
  const raw=window.localStorage.getItem(key);
  return raw===null?[...DEFAULT_QUICK_ACTIONS]:validIds(JSON.parse(raw))??[...DEFAULT_QUICK_ACTIONS];
 }catch{return [...DEFAULT_QUICK_ACTIONS]}
}
type Props={userId?:string;preview:boolean;onNavigate:(id:HomeQuickAction)=>void};
export function QuickActions({userId,preview,onNavigate}:Props){
 const key=storageKey(userId,preview);
 const [actions,setActions]=useState<HomeQuickAction[]>(()=>readActions(key));
 const [editing,setEditing]=useState(false);
 const [choosing,setChoosing]=useState(false);
 const [managing,setManaging]=useState<HomeQuickAction|null>(null);
 const [message,setMessage]=useState('');
 const [visibleCount,setVisibleCount]=useState(1);
 const [startIndex,setStartIndex]=useState(0);
 const [motion,setMotion]=useState<'left'|'right'|null>(null);
 const viewport=useRef<HTMLDivElement>(null);
 const touchStart=useRef<number|null>(null);
 const dialogRef=useRef<HTMLDivElement>(null);
 const managementDialog=useRef<HTMLDialogElement>(null);

 useEffect(()=>{setActions(readActions(key));setEditing(false);setChoosing(false);setManaging(null);setMessage('');setStartIndex(0)},[key]);
 useEffect(()=>{
  const el=viewport.current;
  if(!el)return;
  const measure=()=>{
   const width=el.getBoundingClientRect().width;
   const count=Math.max(1,Math.min(4,Math.floor((width+12)/252)));
   setVisibleCount(count);
  };
  const observer=new ResizeObserver(measure);
  observer.observe(el);measure();
  return ()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!choosing)return;
  dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const onEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setChoosing(false)};
  document.addEventListener('keydown',onEscape);
  return ()=>document.removeEventListener('keydown',onEscape);
 },[choosing]);
 useEffect(()=>{
  const dialog=managementDialog.current;
  if(!managing||!dialog)return;
  if(!dialog.open)dialog.showModal();
  return ()=>{if(dialog.open)dialog.close()};
 },[managing]);
 const save=(next:HomeQuickAction[])=>{
  const clean=validIds(next);
  if(!clean)return;
  if(!key){setMessage('Sessão indisponível. Preferências não foram gravadas.');return}
  try{
   window.localStorage.setItem(key,JSON.stringify(clean));
   setActions(clean);
   setStartIndex(old=>old%(clean.length+1));
   setMessage('Preferências salvas neste navegador.');
  }catch{setMessage('Não foi possível salvar as preferências neste navegador.')}
 };
 const reorder=(index:number,step:number)=>{
  const destination=index+step;
  if(destination<0||destination>=actions.length)return;
  const copy=[...actions];[copy[index],copy[destination]]=[copy[destination],copy[index]];
  save(copy);
 };
 const available=CATALOG.filter(item=>!actions.includes(item.id));
 const managed=managing?CATALOG.find(item=>item.id===managing):null;
 const managedPosition=managing?actions.indexOf(managing):-1;
 const sequence:(HomeQuickAction|'add')[]=[...actions,'add'];
 const count=Math.min(visibleCount,sequence.length);
 const index=((startIndex%sequence.length)+sequence.length)%sequence.length;
 const shown=Array.from({length:count},(_,i)=>sequence[(index+i)%sequence.length]);
 const pageCount=Math.ceil(sequence.length/count);
 const activePage=Math.floor(index/count);
 const goToPage=(page:number)=>{
  if(page<0||page>=pageCount)return;
  setStartIndex(page*count);
  setMotion(page>=activePage?'right':'left');
 };
 const cycle=(step:number)=>{
  if(sequence.length<=count)return;
  setStartIndex(old=>(old+step+sequence.length)%sequence.length);
  setMotion(step>0?'right':'left');
 };
 const openAdd=()=>{
  setMessage('');
  if(available.length===0){
   setChoosing(false);
   setMessage('Todos os ícones disponíveis já foram adicionados.');
   return;
  }
  setManaging(null);
  setChoosing(true);
 };
 const onTouchStart=(event:TouchEvent<HTMLDivElement>)=>{touchStart.current=event.touches[0]?.clientX??null};
 const onTouchEnd=(event:TouchEvent<HTMLDivElement>)=>{
  if(touchStart.current===null)return;
  const delta=(event.changedTouches[0]?.clientX??touchStart.current)-touchStart.current;
  touchStart.current=null;
  if(Math.abs(delta)>=48)cycle(delta<0?1:-1);
 };
 return <section className="pano-panel pano-actions pano-quick" aria-label="Ações rápidas">
  <div className="pano-panel-title pano-quick-heading">
   <h2><HomeGlyph name="sparkle" size={19}/>Ações rápidas</h2>
   <button className={'pano-quick-edit-toggle'+(editing?' is-editing':'')} type="button"
    aria-label={editing?'Concluir personalização':'Personalizar ações rápidas'}
    data-tooltip={editing?'Concluir personalização':'Personalizar ações rápidas'}
    aria-expanded={editing} aria-pressed={editing} aria-controls="pano-quick-rail"
    onClick={()=>{setEditing(!editing);setChoosing(false);setManaging(null);setMessage('')}}>
    <HomeGlyph name={editing?'check':'pencil'} size={20}/>
   </button>
   {editing&&<button type="button" className="pano-quick-reset" aria-label="Restaurar configuração padrão" data-tooltip="Restaurar padrão" onClick={()=>{save([...DEFAULT_QUICK_ACTIONS]);setChoosing(false);setStartIndex(0)}}><HomeGlyph name="reload" size={18}/></button>}
   <div className="pano-quick-carousel-controls" aria-label="Navegar nos atalhos">
    <button type="button" aria-label="Ver atalhos anteriores" data-tooltip="Anterior, volta ao final" disabled={sequence.length<=count} onClick={()=>cycle(-1)}><HomeGlyph name="chevronLeft" size={19}/></button>
    <button type="button" aria-label="Ver próximos atalhos" data-tooltip="Próximo, volta ao início" disabled={sequence.length<=count} onClick={()=>cycle(1)}><HomeGlyph name="chevronRight" size={19}/></button>
   </div>
  </div>
  <div ref={viewport} className="pano-quick-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
   onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='ArrowRight'){event.preventDefault();cycle(1)}if(event.key==='ArrowLeft'){event.preventDefault();cycle(-1)}}}>
   <div className="pano-quick-rail" id="pano-quick-rail" role="region" aria-roledescription="carrossel"
    aria-label={editing?'Editar ações rápidas':'Atalhos da Home'} tabIndex={0}
    data-carousel-motion={motion??'initial'} style={{'--quick-visible':count} as CSSProperties}>
    {shown.map((id,slot)=>{
     if(id==='add')return <button className={'pano-quick-item pano-quick-add'+(editing?' is-editing':'')} type="button"
      key="add" aria-label="Adicionar atalho" onClick={openAdd}>
      <span className="pano-quick-add-mark"><HomeGlyph name="plus" size={22}/></span>
      <span className="pano-quick-item-label"><strong>Adicionar</strong><small>Novo atalho</small></span>
     </button>;
     const item=CATALOG.find(entry=>entry.id===id)!;
     const position=actions.indexOf(id);
     return <div className={'pano-quick-item is-'+item.kind+(editing?' is-editing':'')} key={id} data-slot={slot}>
      {editing?<button className="pano-quick-item-content pano-quick-link pano-quick-manage-trigger" type="button"
       aria-label={'Organizar '+item.title} aria-haspopup="dialog" onClick={()=>setManaging(id)}>
       <span className="pano-quick-item-icon"><HomeGlyph name={item.icon} size={21}/></span>
       <span className="pano-quick-item-label"><strong>{item.title}</strong><small>{item.description}</small></span>
       <span className="pano-quick-manage-indicator" aria-hidden="true"><HomeGlyph name="pencil" size={15}/></span>
      </button>:<button className="pano-quick-item-content pano-quick-link" type="button" onClick={()=>onNavigate(id)}>
       <span className="pano-quick-item-icon"><HomeGlyph name={item.icon} size={21}/></span>
       <span className="pano-quick-item-label"><strong>{item.title}</strong><small>{item.description}</small></span>
      </button>}
     </div>;
    })}
   </div>
  </div>
  {pageCount>1&&<div className="pano-quick-pagination" role="group" aria-label="Páginas de ações rápidas">
   {Array.from({length:pageCount},(_,page)=><button key={page} type="button"
    className={'pano-quick-dot'+(page===activePage?' is-active':'')}
    aria-label={'Ir à página '+(page+1)+' de '+pageCount+' dos atalhos'}
    aria-current={page===activePage?'true':undefined}
    onClick={()=>goToPage(page)}><span aria-hidden="true"/></button>)}
  </div>}
  {editing&&managed&&managedPosition>=0&&<dialog ref={managementDialog}
   className="pano-quick-manage-dialog" aria-labelledby="pano-quick-manage-title"
   onCancel={event=>{event.preventDefault();setManaging(null)}}
   onClose={()=>setManaging(null)}>
   <div className="pano-quick-picker-header">
    <h3 id="pano-quick-manage-title">Organizar atalho</h3>
    <button type="button" aria-label="Fechar organização do atalho" onClick={()=>setManaging(null)}>×</button>
   </div>
   <div className="pano-quick-manage-summary">
    <span className="pano-quick-manage-icon"><HomeGlyph name={managed.icon} size={23}/></span>
    <span><strong>{managed.title}</strong><small>Posição {managedPosition+1} de {actions.length}</small></span>
   </div>
   <div className="pano-quick-manage-move">
    <button type="button" disabled={managedPosition===0}
     aria-label={'Mover '+managed.title+' para esquerda'} onClick={()=>reorder(managedPosition,-1)}>
     <HomeGlyph name="chevronLeft" size={18}/> Mover para esquerda
    </button>
    <button type="button" disabled={managedPosition===actions.length-1}
     aria-label={'Mover '+managed.title+' para direita'} onClick={()=>reorder(managedPosition,1)}>
     Mover para direita <HomeGlyph name="chevronRight" size={18}/>
    </button>
   </div>
   <button type="button" className="pano-quick-manage-remove"
    aria-label={'Remover '+managed.title} onClick={()=>{save(actions.filter(id=>id!==managed.id));setManaging(null)}}>
    <HomeGlyph name="trash" size={18}/> Remover este atalho
   </button>
  </dialog>}
  {choosing&&<div className="pano-quick-picker-backdrop" onClick={()=>setChoosing(false)}>
   <div ref={dialogRef} className="pano-quick-picker" role="dialog" aria-modal="true" aria-label="Adicionar funcionalidade"
    onClick={event=>event.stopPropagation()}>
    <div className="pano-quick-picker-header"><strong>Adicionar funcionalidade</strong><button type="button" aria-label="Fechar seleção de atalhos" onClick={()=>setChoosing(false)}>×</button></div>
    <p>Selecione uma funcionalidade para incluir no carrossel.</p>
    <div className="pano-quick-picker-options">
     {available.map(item=><button type="button" key={item.id} aria-label={'Adicionar '+item.title}
      onClick={()=>{save([...actions,item.id]);setChoosing(false);setStartIndex(Math.max(0,actions.length+1-count))}}>
      <HomeGlyph name={item.icon} size={21}/><span>{item.title}</span></button>)}
    </div>
    <p className="pano-quick-picker-note">A prévia demonstra destinos existentes na Home; a navegação financeira depende da integração das telas.</p>
   </div>
  </div>}
  <span className="pano-quick-status" role="status" aria-live="polite">{message}</span>
 </section>;
}
