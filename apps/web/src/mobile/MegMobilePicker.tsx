import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './meg-mobile-picker.css';
import { MegIcon, type MegIconName } from './MegMobileIcon';

export type MegMobilePickerOption = {
  id: string;
  label: string;
  subtitle?: string;
  badge?: string;
  icon?: MegIconName;
  imageSrc?: string;
  imageKind?: 'card' | 'square';
  tone?: 'red' | 'green' | 'yellow' | 'cyan' | 'violet';
};

export function MegMobilePicker({
  label,
  value,
  placeholder = 'Selecione',
  options,
  disabled = false,
  lockedText,
  className = '',
  searchable = true,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: MegMobilePickerOption[];
  disabled?: boolean;
  lockedText?: string;
  className?: string;
  searchable?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((item) => item.id === value);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    document.body.classList.add('meg-picker-open');
    return () => document.body.classList.remove('meg-picker-open');
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR');
    if (!needle) return options;
    return options.filter((item) =>
      [item.label, item.subtitle, item.badge]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(needle)
    );
  }, [options, query]);

  function dismissKeyboard() {
    searchRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  function close() {
    dismissKeyboard();
    setOpen(false);
    setQuery('');
    setSearching(false);
  }

  function closeSearch() {
    dismissKeyboard();
    setQuery('');
    setSearching(false);
  }

  const overlay = open ? <div className="meg5-picker-overlay" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) close();
  }}>
    <section className={`meg5-picker-sheet ${searching ? 'is-searching' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <header>
        <div><small>SELECIONAR</small><h3>{label}</h3></div>
        <button type="button" aria-label="Fechar" onClick={close}><MegIcon name="x" size={18}/></button>
      </header>

      {searchable && options.length > 7 ? <div className="meg5-picker-search-zone">
        {!searching ? <button type="button" className="meg5-picker-search-trigger" onClick={() => setSearching(true)}><MegIcon name="search" size={17}/><span>Buscar</span></button> : <label className="meg5-picker-search">
          <MegIcon name="search" size={18}/>
          <input ref={searchRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${label.toLocaleLowerCase('pt-BR')}...`}/>
          <button type="button" aria-label="Fechar busca" onClick={closeSearch}><MegIcon name="x" size={15}/></button>
        </label>}
      </div> : null}

      <div className="meg5-picker-list" data-meg-scroll-region="true">
        <button type="button" className={!value ? 'selected' : ''} onClick={() => { onChange(''); close(); }}>
          <span><strong>{placeholder}</strong></span>
          <i aria-hidden="true">{!value ? <MegIcon name="check-line" size={15}/> : null}</i>
        </button>

        {filtered.map((item) => <button type="button" key={item.id} className={item.id === value ? 'selected' : ''} onClick={() => { onChange(item.id); close(); }}>
          {item.imageSrc
            ? <span className={`meg5-picker-option-icon image ${item.imageKind === 'card' ? 'card' : 'square'}`}><img src={item.imageSrc} alt="" draggable={false}/></span>
            : item.icon
              ? <span className={`meg5-picker-option-icon ${item.tone || 'cyan'}`}><MegIcon name={item.icon} size={19}/></span>
              : null}
          <span>
            <strong>{item.label}</strong>
            {item.subtitle ? <small>{item.subtitle}</small> : null}
          </span>
          {item.badge ? <em>{item.badge}</em> : null}
          <i aria-hidden="true">{item.id === value ? <MegIcon name="check-line" size={15}/> : null}</i>
        </button>)}

        {!filtered.length ? <p className="meg5-picker-empty">Nenhuma opção encontrada.</p> : null}
      </div>
    </section>
  </div> : null;

  return <>
    <button
      type="button"
      className={`meg5-picker-field ${className} ${disabled ? 'locked' : ''}`}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => !disabled && setOpen(true)}
    >
      <span>{label}</span>
      <strong>{disabled && lockedText ? lockedText : selected?.label || placeholder}</strong>
      {!disabled && selected?.subtitle ? <small>{selected.subtitle}</small> : null}
      <i aria-hidden="true"><MegIcon name="chevron-down" size={16}/></i>
    </button>

    {overlay && typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay}
  </>;
}
