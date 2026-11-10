import {useEffect,useState} from 'react';
import {HomeGlyph,type HomeIconName} from './HomeGlyph';
import './quick-actions.css';

/** Catálogo seguro: só destinos já representados na Home oficial; expansão exige rota e autorização verificadas. */
export type HomeQuickAction='transferencia'|'pendentes'|'relatorios'|'metas';
type CatalogEntry={id:HomeQuickAction;title:string;description:string;icon:HomeIconName;kind:string};
const CATALOG:ReadonlyArray<CatalogEntry>=[
 {id:'transferencia',title:'Transferência',description:'Mover entre contas',icon:'transfer',kind:'blue'},
 {id:'pendentes',title:'Pagar conta',description:'Contas e boletos',icon:'receipt',kind:'violet'},
 {id:'relatorios',title:'Relatórios',description:'Extratos e análises',icon:'chart',kind:'amber'},
 {id:'metas',title:'Configurações',description:'Preferências do sistema',icon:'settings',kind:'slate'}
];
export const DEFAULT_QUICK_ACTIONS:readonly HomeQuickAction[]=CATALOG.map(action=>action.id);
const PREFIX='meg.web.home.quick-actions.v1.';
function validIds(input:unknown):HomeQuickAction[]|null{
 if(!Array.isArray(input)||input.length>CATALOG.length||input.some(v=>typeof v!=='string'))return null;
 const allowed=new Set<string>(DEFAULT_QUICK_ACTIONS);
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
  if(stored===null)return [...DEFAULT_QUICK_ACTIONS];
  return validIds(JSON.parse(stored))??[...DEFAULT_QUICK_ACTIONS];
 }catch{return [...DEFAULT_QUICK_ACTIONS]}
}
type Props={userId?:string;preview:boolean;onNavigate:(id:HomeQuickAction)=>void};
export function QuickActions({userId,preview,onNavigate}:Props){
 const key=storageKey(userId,preview);
 const [actions,setActions]=useState<HomeQuickAction[]>(()=>readActions(key));
 const [editing,setEditing]=useState(false);
 const [choosing,setChoosing]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{setActions(readActions(key));setEditing(false);setChoosing(false);setMessage('')},[key]);
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
 return <section className="pano-panel pano-actions" aria-label="Ações rápidas">
  <div className="pano-panel-title pano-quick-heading">
   <h2><HomeGlyph name="sparkle" size={19}/>Ações rápidas</h2>
   <button className={'pano-quick-edit-toggle'+(editing?' is-editing':'')} type="button"
    aria-label={editing?'Concluir personalização':'Personalizar ações rápidas'}
    data-tooltip={editing?'Concluir personalização':'Personalizar ações rápidas'}
    aria-expanded={editing} aria-controls="pano-quick-editor"
    onClick={()=>{setEditing(v=>!v);setChoosing(false);setMessage('')}}>
    <HomeGlyph name={editing?'check':'pencil'} size={20}/>

   </button>
  </div>
  <div className="pano-action-list pano-quick-display-grid">
   {actions.map(id=>{
    const action=CATALOG.find(item=>item.id===id);
    if(!action)return null;
    return <button className={'pano-action is-'+action.kind} key={id} type="button" onClick={()=>onNavigate(id)}>
     <span className="pano-action-icon"><HomeGlyph name={action.icon} size={17}/></span><strong>{action.title}</strong><small>{action.description}</small>
    </button>
   })}
   {Array.from({length:DEFAULT_QUICK_ACTIONS.length-actions.length},(_,index)=><button key={'empty-'+index} type="button" className="pano-quick-placeholder" aria-label="Adicionar atalho" onClick={()=>{setEditing(true);setChoosing(true)}}>
    <HomeGlyph name="plus" size={25}/><span>Adicionar</span>
   </button>)}
  </div>
  {editing&&<div className="pano-quick-editor" id="pano-quick-editor" aria-label="Editar atalhos">
   <p>Organize, adicione ou remova atalhos. A preferência fica salva neste navegador.</p>
   <ul className="pano-quick-editor-list">
    {actions.map((id,index)=>{
     const action=CATALOG.find(item=>item.id===id)!;
     return <li key={id} className={'pano-quick-editor-card is-'+action.kind}>
      <div className="pano-quick-editor-card-main">
       <span className="pano-quick-editor-icon"><HomeGlyph name={action.icon} size={22}/></span>
       <span className="pano-quick-editor-copy"><strong>{action.title}</strong><small>{action.description}</small></span>
      </div>
      <div className="pano-quick-editor-controls">
       <button type="button" disabled={index===0} onClick={()=>reorder(index,-1)} aria-label={'Mover '+action.title+' para esquerda'} data-tooltip={'Mover '+action.title+' para esquerda'}><HomeGlyph name="chevronLeft" size={20}/></button>
       <button type="button" disabled={index===actions.length-1} onClick={()=>reorder(index,1)} aria-label={'Mover '+action.title+' para direita'} data-tooltip={'Mover '+action.title+' para direita'}><HomeGlyph name="chevronRight" size={20}/></button>
       <button type="button" onClick={()=>{save(actions.filter(item=>item!==id));setChoosing(false)}} aria-label={'Remover '+action.title} data-tooltip={'Remover '+action.title}><HomeGlyph name="trash" size={20}/></button>
      </div>
     </li>
    })}
    {Array.from({length:DEFAULT_QUICK_ACTIONS.length-actions.length},(_,index)=><li key={'slot-'+index} className="pano-quick-editor-empty">
     <button type="button" className="pano-quick-placeholder" aria-label="Adicionar atalho" onClick={()=>setChoosing(true)}>
      <HomeGlyph name="plus" size={25}/><span>Adicionar</span>
     </button>
    </li>)}
   </ul>
   {choosing&&<div className="pano-quick-chooser" id="pano-quick-chooser" aria-label="Adicionar funcionalidade">
    <div className="pano-quick-chooser-heading"><strong>Adicionar funcionalidade</strong><button type="button" aria-label="Fechar seleção de atalhos" onClick={()=>setChoosing(false)}><HomeGlyph name="chevronDown" size={18}/></button></div>
    {available.length>0?<div className="pano-quick-chooser-options">
     {available.map(item=><button type="button" key={item.id} className={'is-'+item.kind} aria-label={'Adicionar '+item.title} onClick={()=>{save([...actions,item.id]);setChoosing(false)}}><span className="pano-quick-editor-icon"><HomeGlyph name={item.icon} size={21}/></span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>)}
    </div>:<p>Todos os atalhos atualmente autorizados estão na grade.</p>}
    <p className="pano-quick-catalog-note">Novas funcionalidades serão disponibilizadas após validação das rotas e permissões.</p>
   </div>}
   <button type="button" className="pano-quick-reset" onClick={()=>{save([...DEFAULT_QUICK_ACTIONS]);setChoosing(false)}}><HomeGlyph name="reload" size={17}/><span>Restaurar configuração padrão</span></button>
  </div>}
  <span className="pano-quick-status" role="status" aria-live="polite">{message}</span>
 </section>;
}
