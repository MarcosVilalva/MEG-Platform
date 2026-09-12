import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './phoenix-grid.css';

export type PhoenixGridSortDirection = 'asc' | 'desc';
export type PhoenixGridFilterKind = 'text' | 'multi' | 'number' | 'date';
export type PhoenixGridOption = { value: string; label: string; count?: number };
export type PhoenixGridFilterValue =
  | { kind: 'text'; value: string }
  | { kind: 'multi'; values: string[] }
  | { kind: 'number'; min: string; max: string }
  | { kind: 'date'; from: string; to: string };

type PhoenixGridFilterProps = {
  label: string;
  kind: PhoenixGridFilterKind;
  value: PhoenixGridFilterValue;
  options?: PhoenixGridOption[];
  sort?: PhoenixGridSortDirection | null;
  onSort?: (direction: PhoenixGridSortDirection) => void;
  onChange: (value: PhoenixGridFilterValue) => void;
};

function activeCount(value: PhoenixGridFilterValue) {
  if (value.kind === 'text') return value.value.trim() ? 1 : 0;
  if (value.kind === 'multi') return value.values.length;
  if (value.kind === 'number') return Number(Boolean(value.min)) + Number(Boolean(value.max));
  return Number(Boolean(value.from)) + Number(Boolean(value.to));
}

function emptyValue(kind: PhoenixGridFilterKind): PhoenixGridFilterValue {
  if (kind === 'text') return { kind, value: '' };
  if (kind === 'multi') return { kind, values: [] };
  if (kind === 'number') return { kind, min: '', max: '' };
  return { kind, from: '', to: '' };
}

function normalize(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

export function PhoenixGridFilter({ label, kind, value, options = [], sort = null, onSort, onChange }: PhoenixGridFilterProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<PhoenixGridFilterValue>(value);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const count = activeCount(value);

  const visibleOptions = useMemo(() => {
    const needle = normalize(search);
    return options
      .filter((option) => !needle || normalize(option.label).includes(needle))
      .slice(0, 300);
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setSearch('');
    const updatePosition = () => {
      const anchor = buttonRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
      const estimated = 430;
      const below = rect.bottom + 8;
      const top = below + estimated <= window.innerHeight - 12 ? below : Math.max(12, rect.top - estimated - 8);
      setPosition({ top, left, width });
    };
    updatePosition();
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', escape);
    };
  }, [open, value]);

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  function clear() {
    const next = emptyValue(kind);
    setDraft(next);
    onChange(next);
    setOpen(false);
  }

  function toggleValue(option: string) {
    if (draft.kind !== 'multi') return;
    const values = new Set(draft.values);
    if (values.has(option)) values.delete(option); else values.add(option);
    setDraft({ kind: 'multi', values: [...values] });
  }

  function toggleVisible() {
    if (draft.kind !== 'multi') return;
    const values = new Set(draft.values);
    const allVisibleSelected = visibleOptions.length > 0 && visibleOptions.every((option) => values.has(option.value));
    visibleOptions.forEach((option) => allVisibleSelected ? values.delete(option.value) : values.add(option.value));
    setDraft({ kind: 'multi', values: [...values] });
  }

  const selectedValues = draft.kind === 'multi' ? new Set(draft.values) : new Set<string>();
  const allVisibleSelected = visibleOptions.length > 0 && visibleOptions.every((option) => selectedValues.has(option.value));

  return <>
    <button
      ref={buttonRef}
      type="button"
      className={`px-grid-filter-trigger ${count ? 'is-active' : ''} ${open ? 'is-open' : ''}`}
      title={`Filtrar ${label}`}
      aria-label={`Filtrar ${label}`}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      {count ? <span>{count > 9 ? '9+' : count}</span> : null}
    </button>

    {open ? createPortal(<div
      ref={popoverRef}
      className="px-grid-filter-popover"
      role="dialog"
      aria-label={`Filtro de ${label}`}
      style={{ top: position.top, left: position.left, width: position.width }}
    >
      <header className="px-grid-filter-head"><div><small>FILTRO DA COLUNA</small><strong>{label}</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar">×</button></header>

      {onSort ? <div className="px-grid-sort-row">
        <button type="button" className={sort === 'asc' ? 'active' : ''} onClick={() => { onSort('asc'); setOpen(false); }}><span>↑</span> Crescente</button>
        <button type="button" className={sort === 'desc' ? 'active' : ''} onClick={() => { onSort('desc'); setOpen(false); }}><span>↓</span> Decrescente</button>
      </div> : null}

      <div className="px-grid-filter-body">
        {draft.kind === 'text' ? <label className="px-grid-field"><span>Contém</span><input autoFocus type="search" value={draft.value} onChange={(event) => setDraft({ kind: 'text', value: event.target.value })} placeholder="Pesquisar nesta coluna" /></label> : null}

        {draft.kind === 'number' ? <div className="px-grid-range"><label className="px-grid-field"><span>Valor mínimo</span><input inputMode="decimal" value={draft.min} onChange={(event) => setDraft({ ...draft, min: event.target.value })} placeholder="0,00" /></label><label className="px-grid-field"><span>Valor máximo</span><input inputMode="decimal" value={draft.max} onChange={(event) => setDraft({ ...draft, max: event.target.value })} placeholder="Sem limite" /></label></div> : null}

        {draft.kind === 'date' ? <div className="px-grid-range"><label className="px-grid-field"><span>De</span><input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label><label className="px-grid-field"><span>Até</span><input type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label></div> : null}

        {draft.kind === 'multi' ? <>
          <label className="px-grid-filter-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar valores" /></label>
          <button className="px-grid-select-all" type="button" onClick={toggleVisible}><span className={`px-grid-check ${allVisibleSelected ? 'checked' : ''}`}>{allVisibleSelected ? '✓' : ''}</span><strong>{allVisibleSelected ? 'Desmarcar valores visíveis' : 'Selecionar valores visíveis'}</strong><small>{visibleOptions.length}</small></button>
          <div className="px-grid-filter-values">
            {visibleOptions.map((option) => <label key={option.value} className="px-grid-option"><input type="checkbox" checked={selectedValues.has(option.value)} onChange={() => toggleValue(option.value)} /><span className="px-grid-check" aria-hidden="true">{selectedValues.has(option.value) ? '✓' : ''}</span><strong title={option.label}>{option.label || '(Vazio)'}</strong>{option.count !== undefined ? <small>{option.count}</small> : null}</label>)}
            {!visibleOptions.length ? <p>Nenhum valor encontrado.</p> : null}
          </div>
        </> : null}
      </div>

      <footer className="px-grid-filter-actions"><button type="button" onClick={clear}>Limpar</button><div><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="primary" onClick={apply}>Aplicar</button></div></footer>
    </div>, document.body) : null}
  </>;
}
