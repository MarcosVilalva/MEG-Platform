import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { WebNextIcon } from './WebNextIcon';
import { normalizeWebNextSearch, type WebNextSearchResult } from '../data/search-model';
import '../styles/search.css';

export function WebNextSearchDialog({
  open,
  results,
  onClose,
  onOpen,
}: {
  open: boolean;
  results: WebNextSearchResult[];
  onClose: () => void;
  onOpen: (result: WebNextSearchResult) => boolean | void | Promise<boolean | void>;
}) {
  const [query,setQuery]=useState('');
  const [activeIndex,setActiveIndex]=useState(0);
  const inputRef=useRef<HTMLInputElement|null>(null);

  const visible=useMemo(() => {
    const needle=normalizeWebNextSearch(query.trim());
    if (!needle) return results.slice(0,12);
    return results.filter((item)=>normalizeWebNextSearch(`${item.kind} ${item.title} ${item.detail}`).includes(needle)).slice(0,24);
  },[query,results]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timer=window.setTimeout(()=>inputRef.current?.focus(),0);
    return ()=>window.clearTimeout(timer);
  },[open]);

  useEffect(() => {
    setActiveIndex((current)=>visible.length ? Math.min(current,visible.length-1) : 0);
  },[visible.length]);

  useEffect(() => {
    if (!open) return;
    const close=(event:globalThis.KeyboardEvent)=>{ if(event.key==='Escape') onClose(); };
    window.addEventListener('keydown',close);
    return ()=>window.removeEventListener('keydown',close);
  },[open,onClose]);

  async function choose(result:WebNextSearchResult) {
    const opened=await onOpen(result);
    if (opened === false) return;
    onClose();
  }

  function onKeyDown(event:KeyboardEvent<HTMLInputElement>) {
    if(event.key==='ArrowDown'){
      event.preventDefault();
      setActiveIndex((current)=>visible.length?(current+1)%visible.length:0);
      return;
    }
    if(event.key==='ArrowUp'){
      event.preventDefault();
      setActiveIndex((current)=>visible.length?(current-1+visible.length)%visible.length:0);
      return;
    }
    if(event.key==='Enter' && visible[activeIndex]){
      event.preventDefault();
      void choose(visible[activeIndex]);
    }
  }

  if(!open) return null;

  return <div className="mnx-search-overlay" data-web-next-overlay="search" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget) onClose();}}>
    <section className="mnx-search-dialog" role="dialog" aria-modal="true" aria-label="Buscar no MEG">
      <div className="mnx-search-input">
        <WebNextIcon name="search" aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls="mnx-search-results"
          aria-activedescendant={visible[activeIndex] ? `mnx-search-result-${activeIndex}` : undefined}
          value={query}
          onChange={(event)=>{setQuery(event.target.value);setActiveIndex(0);}}
          onKeyDown={onKeyDown}
          placeholder="Buscar tela, lançamento, pendência, cartão, conta, categoria, meta..."
        />
        <kbd>ESC</kbd>
      </div>
      <div className="mnx-search-results" id="mnx-search-results" role="listbox">
        {visible.map((result,index)=><button
          id={`mnx-search-result-${index}`}
          key={result.id}
          type="button"
          role="option"
          aria-selected={activeIndex===index}
          className={activeIndex===index?'is-active':''}
          onMouseEnter={()=>setActiveIndex(index)}
          onClick={()=>{void choose(result);}}
        >
          <span className="mnx-search-kind">{result.kind}</span>
          <span className="mnx-search-copy"><strong>{result.title}</strong><small>{result.detail}</small></span>
          <WebNextIcon name="chevron" aria-hidden="true" />
        </button>)}
        {!visible.length?<div className="mnx-search-empty"><WebNextIcon name="search"/><strong>Nenhum resultado</strong><span>Tente outro termo de busca.</span></div>:null}
      </div>
      <footer><span>↑↓ selecionar</span><span>Enter abrir · Esc fechar</span><strong>Busca global</strong></footer>
    </section>
  </div>;
}
