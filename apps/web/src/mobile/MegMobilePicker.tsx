import { useMemo, useState } from 'react';
import './meg-mobile-picker.css';

export type MegMobilePickerOption = {
  id: string;
  label: string;
  subtitle?: string;
  badge?: string;
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
  const selected = options.find((item) => item.id === value);

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

  function close() {
    setOpen(false);
    setQuery('');
  }

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
      <strong>{selected?.label || lockedText || placeholder}</strong>
      {selected?.subtitle ? <small>{selected.subtitle}</small> : null}
      <i aria-hidden="true">⌄</i>
    </button>

    {open ? <div className="meg5-picker-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section className="meg5-picker-sheet" role="dialog" aria-modal="true" aria-label={label}>
        <header>
          <div><small>SELECIONAR</small><h3>{label}</h3></div>
          <button type="button" aria-label="Fechar" onClick={close}>×</button>
        </header>

        {searchable && options.length > 7 ? <label className="meg5-picker-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${label.toLocaleLowerCase('pt-BR')}...`}/>
        </label> : null}

        <div className="meg5-picker-list" data-meg-scroll-region="true">
          <button
            type="button"
            className={!value ? 'selected' : ''}
            onClick={() => { onChange(''); close(); }}
          >
            <span><strong>{placeholder}</strong></span>
            <i aria-hidden="true">{!value ? '✓' : ''}</i>
          </button>

          {filtered.map((item) => <button
            type="button"
            key={item.id}
            className={item.id === value ? 'selected' : ''}
            onClick={() => { onChange(item.id); close(); }}
          >
            <span>
              <strong>{item.label}</strong>
              {item.subtitle ? <small>{item.subtitle}</small> : null}
            </span>
            {item.badge ? <em>{item.badge}</em> : null}
            <i aria-hidden="true">{item.id === value ? '✓' : ''}</i>
          </button>)}

          {!filtered.length ? <p className="meg5-picker-empty">Nenhuma opção encontrada.</p> : null}
        </div>
      </section>
    </div> : null}
  </>;
}
