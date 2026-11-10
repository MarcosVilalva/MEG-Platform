import {useEffect,useState} from 'react';
import {HomeGlyph,type HomeIconName} from './HomeGlyph';
import './quick-actions.css';

/** Navegação restrita aos quatro destinos já presentes na Home homologada. */
export type HomeQuickAction='transferencia'|'pendentes'|'relatorios'|'metas';
const CATALOG:ReadonlyArray<{id:HomeQuickAction;title:string;description:string;icon:HomeIconName;kind:string}>=[
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
 const [message,setMessage]=useState('');
 useEffect(()=>{setActions(readActions(key));setEditing(false);setMessage('')},[key]);
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
   <button className="pano-quick-edit-toggle" type="button" aria-expanded={editing} aria-controls="pano-quick-editor" onClick={()=>{setEditing(v=>!v);setMessage('')}}>{editing?'Concluir':'Personalizar'}</button>
  </div>
  <div className="pano-action-list">
   {actions.map(id=>{
    const action=CATALOG.find(item=>item.id===id);
    if(!action)return null;
    return <button className={'pano-action is-'+action.kind} key={id} type="button" onClick={()=>onNavigate(id)}>
     <span className="pano-action-icon"><HomeGlyph name={action.icon} size={17}/></span><strong>{action.title}</strong><small>{action.description}</small>
    </button>
   })}
  </div>
  {actions.length===0&&<p className="pano-quick-empty">Nenhum atalho selecionado. Use Personalizar para adicionar.</p>}
  {editing&&<div className="pano-quick-editor" id="pano-quick-editor" aria-label="Editar atalhos">
    <p>Organize seus atalhos. A ordem é salva somente neste navegador.</p>
    <ul className="pano-quick-editor-list">
     {actions.map((id,index)=>{
      const action=CATALOG.find(item=>item.id===id)!;
      return <li key={id}><span>{action.title}</span><div className="pano-quick-editor-controls">
       <button type="button" disabled={index===0} onClick={()=>reorder(index,-1)} aria-label={'Mover '+action.title+' para cima'} data-tooltip={'Subir '+action.title}><HomeGlyph name="chevronUp" size={20}/></button>
       <button type="button" disabled={index===actions.length-1} onClick={()=>reorder(index,1)} aria-label={'Mover '+action.title+' para baixo'} data-tooltip={'Descer '+action.title}><HomeGlyph name="chevronDown" size={20}/></button>
       <button type="button" onClick={()=>save(actions.filter(item=>item!==id))} aria-label={'Remover '+action.title} data-tooltip={'Remover '+action.title}><HomeGlyph name="trash" size={20}/></button>
      </div></li>
     })}
    </ul>
    {available.length>0&&<div className="pano-quick-available"><strong>Adicionar atalho</strong><div>{available.map(item=><button key={item.id} type="button" aria-label={'Adicionar '+item.title} onClick={()=>save([...actions,item.id])}><HomeGlyph name="plus" size={17}/><span>{item.title}</span></button>)}</div></div>}
    <button type="button" className="pano-quick-reset" onClick={()=>save([...DEFAULT_QUICK_ACTIONS])}><HomeGlyph name="reload" size={17}/><span>Restaurar configuração padrão</span></button>
   </div>}
  <span className="pano-quick-status" role="status" aria-live="polite">{message}</span>
 </section>;
}
