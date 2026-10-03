import {useMemo,useState} from 'react';
import {EvolutionFinancialIcon,type EvolutionFinancialIconName} from './EvolutionFinancialIcon';

export type EvolutionPickerOption={
  id:string;
  label:string;
  subtitle?:string;
  badge?:string;
  icon?:EvolutionFinancialIconName;
  imageSrc?:string;
  tone?:'cyan'|'green'|'red'|'yellow'|'violet';
};

export function EvolutionPicker({
  label,value,placeholder='Selecione',options,disabled=false,lockedText,searchable=true,onChange
}:{
  label:string;
  value:string;
  placeholder?:string;
  options:EvolutionPickerOption[];
  disabled?:boolean;
  lockedText?:string;
  searchable?:boolean;
  onChange:(value:string)=>void;
}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const selected=options.find(item=>item.id===value);
  const filtered=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase('pt-BR');
    if(!needle)return options;
    return options.filter(item=>[item.label,item.subtitle,item.badge].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(needle));
  },[options,query]);

  const close=()=>{setOpen(false);setQuery('')};

  return <>
    <button type="button" className={'evo-picker-field '+(disabled?'locked':'')+(selected?' has-value':'')} disabled={disabled} onClick={()=>!disabled&&setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <span>{label}</span>
      {selected?.imageSrc?<b className="evo-picker-field-image"><img src={selected.imageSrc} alt="" draggable={false}/></b>:selected?.icon?<b className={'evo-picker-field-icon '+(selected.tone||'cyan')}><EvolutionFinancialIcon name={selected.icon} size={18}/></b>:null}
      <strong>{disabled&&lockedText?lockedText:selected?.label||placeholder}</strong>
      {selected?.subtitle&&!disabled&&<small>{selected.subtitle}</small>}
      <i><EvolutionFinancialIcon name="chevron-down" size={16}/></i>
    </button>
    {open&&<div className="evo-picker-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
      <section className="evo-picker-dialog" role="dialog" aria-modal="true" aria-label={label}>
        <header><div><small>SELECIONAR</small><h3>{label}</h3></div><button type="button" onClick={close} aria-label="Fechar"><EvolutionFinancialIcon name="x" size={19}/></button></header>
        {searchable&&options.length>6&&<label className="evo-picker-search"><EvolutionFinancialIcon name="search" size={18}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder={'Buscar '+label.toLocaleLowerCase('pt-BR')+'...'}/></label>}
        <div className="evo-picker-grid" data-meg-scroll-region="true">
          {filtered.map(item=><button type="button" key={item.id} className={item.id===value?'selected':''} onClick={()=>{onChange(item.id);close()}}>
            {item.imageSrc?<span className="evo-picker-option-image"><img src={item.imageSrc} alt="" draggable={false}/></span>:item.icon?<span className={'evo-picker-option-icon '+(item.tone||'cyan')}><EvolutionFinancialIcon name={item.icon} size={20}/></span>:null}
            <span className="evo-picker-option-copy"><strong>{item.label}</strong>{item.subtitle&&<small>{item.subtitle}</small>}</span>
            {item.badge&&<em>{item.badge}</em>}
            <i className="evo-picker-check">{item.id===value&&<EvolutionFinancialIcon name="check-line" size={17}/>}</i>
          </button>)}
          {!filtered.length&&<p className="evo-picker-empty">Nenhuma opção encontrada.</p>}
        </div>
      </section>
    </div>}
  </>;
}
