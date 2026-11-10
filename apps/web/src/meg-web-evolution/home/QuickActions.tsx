import {useCallback,useEffect,useRef,useState} from 'react';
import {HomeGlyph,type HomeIconName} from './HomeGlyph';
import './quick-actions.css';

/** Catálogo restrito aos destinos já tipados pela Home. Não implementa novas rotas financeiras. */
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
export const DEFAULT_QUICK_ACTIONS:readonly HomeQuickAction[]=CATALOG.slice(0,4).map(action=>action.id);
const PREFIX='meg.web.home.quick-actions.v1.';

function validIds(input:unknown):HomeQuickAction[]|null{
 if(!Array.isArray(input)||input.length>CATALOG.length||input.some(v=>typeof v!=='string'))return null;
 const allowed=new Set<string>(CATALOG.map(action=>action.id));
 if(input.some(v=>!allowed.has(v))||new Set(input).size!==input.length)return null;
 return input as HomeQuickAction[];
}
function storageKey(userId:string|undefined,preview:boolean):string|null{
 if(preview)return PREFIX+'demo';
 if(!userId||!userId.trim())return null;
 return PREFIX+'user.'+encodeURIComponent(userId);
}
function readActions(key:string|null):HomeQuickAction[]{
 if(!key)return [...DEFAULT_QUICK_ACTIONS];
 try{
  const stored=window.localStorage.getItem(key);
  return stored===null?[...DEFAULT_QUICK_ACTIONS]:validIds(JSON.parse(stored))??[...DEFAULT_QUICK_ACTIONS];
 }catch{return [...DEFAULT_QUICK_ACTIONS]}
}
type Props={userId?:string;preview:boolean;onNavigate:(id:HomeQuickAction)=>void};
export function QuickActions({userId,preview,onNavigate}:Props){
 const key=storageKey(userId,preview);
 const [actions,setActions]=useState<HomeQuickAction[]>(()=>readActions(key));
 const [editing,setEditing]=useState(false);
 const [choosing,setChoosing]=useState(false);
 const [message,setMessage]=useState('');
 const [scrollState,setScrollState]=useState({left:false,right:false});
 const rail=useRef<HTMLDivElement>(null);
 const addButton=useRef<HTMLButtonElement>(null);

 const syncScroll=useCallback(()=>{
  const el=rail.current;
  if(!el)return;
  setScrollState({left:el.scrollLeft>2,right:el.scrollLeft+el.clientWidth<el.scrollWidth-2});
 },[]);

 useEffect(()=>{setActions(readActions(key));setEditing(false);setChoosing(false);setMessage('')},[key]);
 useEffect(()=>{
  const el=rail.current;
  if(!el)return;
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(syncScroll);
  observer?.observe(el);
  for(const child of Array.from(el.children))observer?.observe(child);
  el.addEventListener('scroll',syncScroll,{passive:true});
  syncScroll();
  return ()=>{observer?.disconnect();el.removeEventListener('scroll',syncScroll)};
 },[actions,editing,syncScroll]);
 const save=(next:HomeQuickAction[])=>{
  const normalized=validIds(next);
  if(!normalized)return;
  if(!key){setMessage('Sessão de usuário indisponível. Preferências não foram gravadas.');return}
  try{
   window.localStorage.setItem(key,JSON.stringify(normalized));
   setActions(normalized);
   setMessage('Preferências salvas neste navegador.');
  }catch{setMessage('Não foi possível salvar as preferências neste navegador.')}
 };
 const reorder=(index:number,step:number)=>{
  const destination=index+step;
  if(destination<0||destination>=actions.length)return;
  const next=[...actions];[next[index],next[destination]]=[next[destination],next[index]];
  save(next);
 };
 const available=CATALOG.filter(action=>!actions.includes(action.id));
 const openAdd=()=>{
  setMessage('');
  if(available.length===0){
   setChoosing(false);
   setMessage('Todos os ícones disponíveis já foram adicionados.');
   return;
  }
  setChoosing(value=>!value);
 };
 const scroll=(direction:number)=>{
  const el=rail.current;
  if(!el)return;
  const item=el.querySelector<HTMLElement>('.pano-quick-item');
  const distance=(item?.offsetWidth??240)+12;
  el.scrollBy({left:distance*direction,behavior:'smooth'});
 };
 return <section className="pano-panel pano-actions pano-quick" aria-label="Ações rápidas">
  <div className="pano-panel-title pano-quick-heading">
   <h2><HomeGlyph name="sparkle" size={19}/>Ações rápidas</h2>
   <button className={'pano-quick-edit-toggle'+(editing?' is-editing':'')} type="button"
    aria-label={editing?'Concluir personalização':'Personalizar ações rápidas'}
    data-tooltip={editing?'Concluir personalização':'Personalizar ações rápidas'}
    aria-expanded={editing} aria-controls="pano-quick-rail"
    onClick={()=>{setEditing(v=>!v);setChoosing(false);setMessage('')}}>
    <HomeGlyph name={editing?'check':'pencil'} size={20}/>
   </button>
   {editing&&<button type="button" className="pano-quick-reset" aria-label="Restaurar configuração padrão" data-tooltip="Restaurar padrão" onClick={()=>{save([...DEFAULT_QUICK_ACTIONS]);setChoosing(false);rail.current?.scrollTo({left:0,behavior:'smooth'})}}><HomeGlyph name="reload" size={18}/></button>}
   <div className="pano-quick-carousel-controls" aria-label="Navegar nos atalhos">
    <button type="button" aria-label="Ver atalhos anteriores" data-tooltip="Voltar no carrossel" disabled={!scrollState.left} onClick={()=>scroll(-1)}><HomeGlyph name="chevronLeft" size={19}/></button>
    <button type="button" aria-label="Ver próximos atalhos" data-tooltip="Avançar no carrossel" disabled={!scrollState.right} onClick={()=>scroll(1)}><HomeGlyph name="chevronRight" size={19}/></button>
   </div>
  </div>
  <div className="pano-quick-rail" id="pano-quick-rail" ref={rail} role="region" aria-roledescription="carrossel" aria-label={editing?'Editar ações rápidas':'Atalhos da Home'} tabIndex={0}>
   {actions.map((id,index)=>{
    const action=CATALOG.find(item=>item.id===id);
    if(!action)return null;
    return <div className={'pano-quick-item is-'+action.kind+(editing?' is-editing':'')} key={id}>
     {editing?<div className="pano-quick-item-content" aria-label={action.title}>
       <span className="pano-quick-item-icon"><HomeGlyph name={action.icon} size={21}/></span>
       <span className="pano-quick-item-label"><strong>{action.title}</strong><small>{action.description}</small></span>
      </div>:<button className="pano-quick-item-content pano-quick-link" type="button" onClick={()=>onNavigate(id)}>
       <span className="pano-quick-item-icon"><HomeGlyph name={action.icon} size={21}/></span>
       <span className="pano-quick-item-label"><strong>{action.title}</strong><small>{action.description}</small></span>
      </button>}
     {editing&&<div className="pano-quick-inline-controls">
       <button type="button" disabled={index===0} aria-label={'Mover '+action.title+' para esquerda'} data-tooltip="Mover para esquerda" onClick={()=>reorder(index,-1)}><HomeGlyph name="chevronLeft" size={17}/></button>
       <button type="button" disabled={index===actions.length-1} aria-label={'Mover '+action.title+' para direita'} data-tooltip="Mover para direita" onClick={()=>reorder(index,1)}><HomeGlyph name="chevronRight" size={17}/></button>
       <button type="button" className="is-remove" aria-label={'Remover '+action.title} data-tooltip={'Remover '+action.title} onClick={()=>{save(actions.filter(item=>item!==id));setChoosing(false)}}><HomeGlyph name="trash" size={17}/></button>
      </div>}
    </div>;
   })}
   <button ref={addButton} className="pano-quick-item pano-quick-add" type="button" aria-label="Adicionar atalho" onClick={openAdd}>
    <HomeGlyph name="plus" size={24}/><span>Adicionar</span>
   </button>
  </div>
  {choosing&&<div className="pano-quick-picker-backdrop" onClick={()=>setChoosing(false)}>
   <div className="pano-quick-picker" role="dialog" aria-modal="true" aria-label="Adicionar funcionalidade" onClick={event=>event.stopPropagation()}>
    <div className="pano-quick-picker-header"><strong>Adicionar funcionalidade</strong><button type="button" aria-label="Fechar seleção de atalhos" onClick={()=>setChoosing(false)}><HomeGlyph name="chevronDown" size={20}/></button></div>
    <p>Selecione uma funcionalidade para incluir no carrossel.</p>
    <div className="pano-quick-picker-options">
     {available.map(item=><button type="button" key={item.id} aria-label={'Adicionar '+item.title} onClick={()=>{
      save([...actions,item.id]);setChoosing(false);
      requestAnimationFrame(()=>addButton.current?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'end'}));
     }}><HomeGlyph name={item.icon} size={21}/><span>{item.title}</span></button>)}
    </div>
    <p className="pano-quick-picker-note">A prévia demonstra os destinos existentes na Home. A navegação operacional depende da integração das telas.</p>
   </div>
  </div>}
  <span className="pano-quick-status" role="status" aria-live="polite">{message}</span>
 </section>;
}
