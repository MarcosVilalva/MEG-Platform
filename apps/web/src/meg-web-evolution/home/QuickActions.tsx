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
 const [choosing,setChoosing]=useState<HomeQuickAction|null>(null);
 const [message,setMessage]=useState('');
 useEffect(()=>{setActions(readActions(key));setEditing(false);setChoosing(null);setMessage('')},[key]);
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
 const replace=(current:HomeQuickAction,chosen:HomeQuickAction)=>{
  const index=actions.indexOf(current);
  const existing=actions.indexOf(chosen);
  if(index<0)return;
  const next=[...actions];
  if(existing===index){setChoosing(null);return}
  if(existing>=0)next[existing]=current; // Ações já em uso trocam de lugar, sem duplicação.
  next[index]=chosen;
  save(next);
  setChoosing(null);
 };
 const available=CATALOG.filter(action=>!actions.includes(action.id));
 return <section className="pano-panel pano-actions" aria-label="Ações rápidas">
  <div className="pano-panel-title pano-quick-heading">
   <h2><HomeGlyph name="sparkle" size={19}/>Ações rápidas</h2>
   <button className={'pano-quick-edit-toggle'+(editing?' is-editing':'')} type="button"
    aria-label={editing?'Concluir personalização':'Personalizar ações rápidas'}
    data-tooltip={editing?'Concluir personalização':'Personalizar ações rápidas'}
    aria-expanded={editing} aria-controls="pano-quick-editor"
    onClick={()=>{setEditing(v=>!v);setChoosing(null);setMessage('')}}>
    <HomeGlyph name={editing?'check':'pencil'} size={20}/>
    <span className="sr-only">{editing?'Concluir':'Personalizar'}</span>
   </button>
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
  {actions.length===0&&<p className="pano-quick-empty">Nenhum atalho selecionado. Abra a personalização para adicionar.</p>}
  {editing&&<div className="pano-quick-editor" id="pano-quick-editor" aria-label="Editar atalhos">
   <p>Organize, substitua ou remova atalhos. A preferência fica salva neste navegador.</p>
   <ul className="pano-quick-editor-list">
    {actions.map((id,index)=>{
     const action=CATALOG.find(item=>item.id===id)!;
     return <li key={id} className={'pano-quick-editor-card is-'+action.kind}>
      <div className="pano-quick-editor-card-main">
       <span className="pano-quick-editor-icon"><HomeGlyph name={action.icon} size={22}/></span>
       <span className="pano-quick-editor-copy"><strong>{action.title}</strong><small>{action.description}</small></span>
       <button type="button" className="pano-quick-choose" aria-label={'Escolher funcionalidade para '+action.title}
        aria-expanded={choosing===id} aria-controls="pano-quick-chooser" data-tooltip={'Escolher outro atalho para '+action.title}
        onClick={()=>setChoosing(current=>current===id?null:id)}><HomeGlyph name="chevronRight" size={20}/></button>
      </div>
      <div className="pano-quick-editor-controls">
       <button type="button" disabled={index===0} onClick={()=>reorder(index,-1)} aria-label={'Mover '+action.title+' para cima'} data-tooltip={'Subir '+action.title}><HomeGlyph name="chevronUp" size={20}/></button>
       <button type="button" disabled={index===actions.length-1} onClick={()=>reorder(index,1)} aria-label={'Mover '+action.title+' para baixo'} data-tooltip={'Descer '+action.title}><HomeGlyph name="chevronDown" size={20}/></button>
       <button type="button" onClick={()=>{save(actions.filter(item=>item!==id));setChoosing(null)}} aria-label={'Remover '+action.title} data-tooltip={'Remover '+action.title}><HomeGlyph name="trash" size={20}/></button>
      </div>
     </li>
    })}
   </ul>
   {choosing&&actions.includes(choosing)&&<div className="pano-quick-chooser" id="pano-quick-chooser" aria-label="Escolher funcionalidade">
    <div className="pano-quick-chooser-heading"><strong>Escolher funcionalidade</strong><button type="button" aria-label="Fechar seleção de atalhos" onClick={()=>setChoosing(null)}><HomeGlyph name="chevronDown" size={18}/></button></div>
    <p>Escolha um atalho disponível. Um item já utilizado troca de posição com o atual.</p>
    <div className="pano-quick-chooser-options">
     {CATALOG.map(item=><button type="button" key={item.id} className={'is-'+item.kind} aria-label={'Selecionar '+item.title} aria-current={item.id===choosing?'true':undefined}
       onClick={()=>replace(choosing,item)}><span className="pano-quick-editor-icon"><HomeGlyph name={item.icon} size={21}/></span><span><strong>{item.title}</strong><small>{item.description}</small></span>{item.id===choosing&&<HomeGlyph name="check" size={17}/>}</button>)}
    </div>
    <p className="pano-quick-catalog-note">Outras funcionalidades serão incluídas quando as rotas e permissões estiverem validadas.</p>
   </div>}
   {available.length>0&&<div className="pano-quick-available"><strong>Adicionar atalho</strong><div>{available.map(item=><button key={item.id} type="button" aria-label={'Adicionar '+item.title} onClick={()=>save([...actions,item.id])}><HomeGlyph name={item.icon} size={18}/><span>{item.title}</span></button>)}</div></div>}
   <button type="button" className="pano-quick-reset" onClick={()=>{save([...DEFAULT_QUICK_ACTIONS]);setChoosing(null)}}><HomeGlyph name="reload" size={17}/><span>Restaurar configuração padrão</span></button>
  </div>}
  <span className="pano-quick-status" role="status" aria-live="polite">{message}</span>
 </section>;
}
