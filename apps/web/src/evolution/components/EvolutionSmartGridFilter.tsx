import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {EvolutionFinancialIcon as Icon} from './EvolutionFinancialIcon';
import '../styles/smart-grid.css';

export type EvolutionSmartSortDirection='asc'|'desc'|null;
export type EvolutionSmartFilterValue=
  |{kind:'text';text:string}
  |{kind:'multi';values:string[]}
  |{kind:'date';from:string;to:string}
  |{kind:'number';min:string;max:string};

export type EvolutionSmartFilterOption={value:string;label:string;count?:number};

type Props={
  label:string;
  value:EvolutionSmartFilterValue;
  options?:EvolutionSmartFilterOption[];
  sortDirection?:EvolutionSmartSortDirection;
  onApply:(value:EvolutionSmartFilterValue)=>void;
  onSort?:(direction:EvolutionSmartSortDirection)=>void;
};

function cloneValue(value:EvolutionSmartFilterValue):EvolutionSmartFilterValue{
  if(value.kind==='multi')return {...value,values:[...value.values]};
  return {...value};
}
function isActive(value:EvolutionSmartFilterValue){
  if(value.kind==='text')return Boolean(value.text.trim());
  if(value.kind==='multi')return value.values.length>0;
  if(value.kind==='date')return Boolean(value.from||value.to);
  return Boolean(value.min||value.max);
}
function sortLabels(kind:EvolutionSmartFilterValue['kind']){
  if(kind==='number')return ['Menor → maior','Maior → menor'];
  if(kind==='date')return ['Mais antiga → recente','Mais recente → antiga'];
  return ['A → Z','Z → A'];
}

export function EvolutionSmartGridFilter({label,value,options=[],sortDirection=null,onApply,onSort}:Props){
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState<EvolutionSmartFilterValue>(()=>cloneValue(value));
  const [search,setSearch]=useState('');
  const [position,setPosition]=useState({top:0,left:0,width:340});
  const anchorRef=useRef<HTMLButtonElement|null>(null);
  const panelRef=useRef<HTMLDivElement|null>(null);
  const active=isActive(value);
  const count=value.kind==='multi'?value.values.length:active?1:0;

  useEffect(()=>{if(!open)return;setDraft(cloneValue(value));setSearch('')},[open,value]);
  useEffect(()=>{
    if(!open)return;
    const place=()=>{
      const anchor=anchorRef.current;
      if(!anchor)return;
      const rect=anchor.getBoundingClientRect(),margin=12,width=Math.min(360,window.innerWidth-margin*2);
      const left=Math.min(Math.max(margin,rect.right-width),window.innerWidth-width-margin);
      const desiredTop=rect.bottom+8;
      const estimated=460;
      const top=desiredTop+estimated>window.innerHeight-margin?Math.max(margin,rect.top-estimated-8):desiredTop;
      setPosition({top,left,width});
    };
    place();
    const close=(event:MouseEvent)=>{
      const target=event.target as Node;
      if(anchorRef.current?.contains(target)||panelRef.current?.contains(target))return;
      setOpen(false);
    };
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,true);
    document.addEventListener('mousedown',close);
    document.addEventListener('keydown',escape);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);document.removeEventListener('mousedown',close);document.removeEventListener('keydown',escape)};
  },[open]);

  const normalizedSearch=search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const visibleOptions=useMemo(()=>options
    .filter(option=>!normalizedSearch||option.label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(normalizedSearch))
    .sort((a,b)=>a.label.localeCompare(b.label,'pt-BR',{numeric:true,sensitivity:'base'}))
  ,[options,normalizedSearch]);

  const [ascLabel,descLabel]=sortLabels(value.kind);
  const clearValue=():EvolutionSmartFilterValue=>{
    if(value.kind==='text')return {kind:'text',text:''};
    if(value.kind==='multi')return {kind:'multi',values:[]};
    if(value.kind==='date')return {kind:'date',from:'',to:''};
    return {kind:'number',min:'',max:''};
  };
  const apply=()=>{onApply(cloneValue(draft));setOpen(false)};
  const clear=()=>{const next=clearValue();setDraft(next);onApply(next);setOpen(false)};

  const panel=open?createPortal(
    <div ref={panelRef} className="evo-smart-filter-popover" role="dialog" aria-label={'Filtro de '+label} style={{top:position.top,left:position.left,width:position.width}}>
      <header><div><small>FILTRO DA COLUNA</small><strong>{label}</strong></div><button type="button" aria-label="Fechar filtro" onClick={()=>setOpen(false)}><Icon name="x" size={17}/></button></header>
      {onSort&&<div className="evo-smart-filter-sort">
        <button type="button" className={sortDirection==='asc'?'active':''} onClick={()=>{onSort(sortDirection==='asc'?null:'asc');setOpen(false)}}><Icon name="up" size={15}/>{ascLabel}</button>
        <button type="button" className={sortDirection==='desc'?'active':''} onClick={()=>{onSort(sortDirection==='desc'?null:'desc');setOpen(false)}}><Icon name="down" size={15}/>{descLabel}</button>
      </div>}
      <div className="evo-smart-filter-body">
        {draft.kind==='text'&&<label className="evo-smart-filter-field"><span>Contém</span><input autoFocus type="search" value={draft.text} onChange={e=>setDraft({kind:'text',text:e.target.value})} placeholder="Digite para filtrar…"/></label>}
        {draft.kind==='date'&&<div className="evo-smart-filter-range"><label><span>De</span><input type="date" value={draft.from} onChange={e=>setDraft({kind:'date',from:e.target.value,to:draft.to})}/></label><label><span>Até</span><input type="date" min={draft.from} value={draft.to} onChange={e=>setDraft({kind:'date',from:draft.from,to:e.target.value})}/></label></div>}
        {draft.kind==='number'&&<div className="evo-smart-filter-range"><label><span>Valor mínimo</span><input inputMode="decimal" value={draft.min} onChange={e=>setDraft({kind:'number',min:e.target.value,max:draft.max})} placeholder="0,00"/></label><label><span>Valor máximo</span><input inputMode="decimal" value={draft.max} onChange={e=>setDraft({kind:'number',min:draft.min,max:e.target.value})} placeholder="0,00"/></label></div>}
        {draft.kind==='multi'&&<>
          <label className="evo-smart-filter-search"><Icon name="search" size={16}/><input autoFocus type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar valores"/></label>
          <label className="evo-smart-filter-select-all"><input type="checkbox" checked={visibleOptions.length>0&&visibleOptions.every(option=>draft.values.includes(option.value))} onChange={e=>{
            const current=new Set(draft.values);
            visibleOptions.forEach(option=>e.target.checked?current.add(option.value):current.delete(option.value));
            setDraft({kind:'multi',values:[...current]});
          }}/><span>Selecionar tudo</span><b>{visibleOptions.length}</b></label>
          <div className="evo-smart-filter-options">
            {visibleOptions.map(option=><label key={option.value}><input type="checkbox" checked={draft.values.includes(option.value)} onChange={e=>{
              const next=new Set(draft.values);
              e.target.checked?next.add(option.value):next.delete(option.value);
              setDraft({kind:'multi',values:[...next]});
            }}/><span title={option.label}>{option.label}</span>{option.count!==undefined&&<b>{option.count}</b>}</label>)}
            {!visibleOptions.length&&<p>Nenhum valor encontrado.</p>}
          </div>
        </>}
      </div>
      <footer><button type="button" onClick={clear}>Limpar filtro</button><span/><button type="button" onClick={()=>setOpen(false)}>Cancelar</button><button type="button" className="primary" onClick={apply}>Aplicar</button></footer>
    </div>,document.body):null;

  return <>
    <button ref={anchorRef} type="button" className={'evo-smart-filter-trigger '+(active?'filtered ':'')+(sortDirection?'sorted':'')} onClick={()=>setOpen(current=>!current)} aria-expanded={open} aria-label={'Filtrar '+label}>
      <span>{label}</span><Icon name="chevron-down" size={15}/>{count>0&&<b>{count}</b>}
    </button>
    {panel}
  </>;
}
