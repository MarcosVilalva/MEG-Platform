import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import {
  dateRangeForShortcut,
  distinctKey,
  displayValue,
  isFilterActive,
  parsePtBrNumber,
  toDateKey,
} from './core';
import type {
  DataGridColumn,
  DataGridFilter,
  DateShortcut,
  DistinctOption,
} from './types';

const textOperators = [
  ['contains', 'Contém'],
  ['notContains', 'Não contém'],
  ['startsWith', 'Começa com'],
  ['endsWith', 'Termina com'],
  ['equals', 'É igual a'],
  ['empty', 'Está vazio'],
] as const;

const numberOperators = [
  ['eq', '='],
  ['neq', '≠'],
  ['gt', '>'],
  ['gte', '≥'],
  ['lt', '<'],
  ['lte', '≤'],
  ['between', 'Entre'],
  ['empty', 'Está vazio'],
] as const;

const dateOperators = [
  ['between', 'Está entre'],
  ['equals', 'É igual a'],
  ['before', 'Antes de'],
  ['after', 'Depois de'],
] as const;

const shortcuts: Array<[DateShortcut, string]> = [
  ['today', 'Hoje'],
  ['thisWeek', 'Esta semana'],
  ['thisMonth', 'Este mês'],
  ['lastMonth', 'Mês passado'],
  ['last30Days', 'Últimos 30 dias'],
  ['thisYear', 'Este ano'],
];

function emptyFilter(type: DataGridFilter['type']): DataGridFilter {
  if (type === 'boolean') return { type, booleanValue: null };
  if (type === 'date') return { type, operator: 'between', value: '', value2: '', selected: [] };
  if (type === 'number' || type === 'currency') return { type, operator: 'eq', value: '', value2: '', selected: [] };
  if (type === 'text') return { type, operator: 'contains', value: '', selected: [] };
  return { type, selected: [] };
}

function formatNumericDraft(value: unknown, type: 'number' | 'currency') {
  const parsed = parsePtBrNumber(value);
  if (parsed == null) return String(value ?? '');
  return new Intl.NumberFormat('pt-BR', type === 'currency'
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 6 }).format(parsed);
}

function formatDistinct(option: DistinctOption, type: DataGridFilter['type']) {
  if (type === 'currency') {
    const number = parsePtBrNumber(option.value);
    return number == null
      ? option.label
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
  }
  if (type === 'number') {
    const number = parsePtBrNumber(option.value);
    return number == null ? option.label : new Intl.NumberFormat('pt-BR').format(number);
  }
  if (type === 'date') {
    const key = toDateKey(option.value);
    if (!key) return option.label;
    const [year, month, day] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
  }
  return option.label;
}

function DistinctList<T extends Record<string, unknown>>({
  column,
  options,
  selected,
  onSelected,
}: {
  column: DataGridColumn<T>;
  options: DistinctOption[];
  selected: string[];
  onSelected: (next: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('pt-BR');
    if (!needle) return options;
    return options.filter((option) =>
      formatDistinct(option, column.type).toLocaleLowerCase('pt-BR').includes(needle),
    );
  }, [column.type, options, search]);

  const allVisibleSelected = visible.length > 0 && visible.every((option) => selected.includes(option.key));
  const rendered = visible.slice(0, 200);

  const toggle = (key: string) => {
    onSelected(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  };

  const moveOptionFocus = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const current = event.currentTarget;
    const list = current.closest('.meg-datagrid-filter__values');
    const inputs = list ? [...list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')] : [];
    const index = inputs.indexOf(current);
    if (index < 0 || !inputs.length) return;
    const nextIndex = event.key === 'ArrowDown'
      ? Math.min(inputs.length - 1, index + 1)
      : Math.max(0, index - 1);
    inputs[nextIndex]?.focus();
    inputs[nextIndex]?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <div className="meg-datagrid-filter__distinct">
      <div className="meg-datagrid-filter__controls">
        <label className="meg-datagrid-filter__search">
          <span>Buscar valores</span>
          <input
            type="search"
            name={`filter-${column.key}-distinct-search`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar..."
          />
        </label>

        <label className="meg-datagrid-check meg-datagrid-check--all">
          <input
            type="checkbox"
            name={`filter-${column.key}-select-visible`}
            checked={allVisibleSelected}
            onChange={() => {
              if (allVisibleSelected) {
                const visibleKeys = new Set(visible.map((option) => option.key));
                onSelected(selected.filter((key) => !visibleKeys.has(key)));
              } else {
                onSelected([...new Set([...selected, ...visible.map((option) => option.key)])]);
              }
            }}
          />
          <span>Selecionar tudo ({visible.length})</span>
        </label>
      </div>

      <div
        className="meg-datagrid-filter__values"
        role="group"
        aria-label={`Valores de ${column.label}`}
        data-filter-scroll-region="values"
      >
        {rendered.map((option) => {
          const record = option.value && typeof option.value === 'object'
            ? option.value as Record<string, unknown>
            : null;
          const visual = column.enumValues?.[option.key];
          const color = visual?.color ?? (typeof record?.color === 'string' ? record.color : undefined);
          const icon = visual?.icon ?? (record?.icon as ReactNode | undefined);
          const label = visual?.label ?? (typeof record?.label === 'string' ? record.label : undefined);
          return (
            <label className="meg-datagrid-check" key={option.key}>
              <input
                type="checkbox"
                name={`filter-${column.key}-distinct-value`}
                checked={selected.includes(option.key)}
                onChange={() => toggle(option.key)}
                onKeyDown={moveOptionFocus}
              />
              {column.type === 'enum' && (
                <span
                  className="meg-datagrid-enum-dot"
                  style={color ? { backgroundColor: color } : undefined}
                  aria-hidden="true"
                />
              )}
              <span className="meg-datagrid-check__label" title={String(label ?? formatDistinct(option, column.type))}>
                {icon}
                {label ?? formatDistinct(option, column.type)}
              </span>
              <span className="meg-datagrid-count" aria-label={`${option.count} ocorrências`}>{option.count}</span>
            </label>
          );
        })}
        {!visible.length && <p className="meg-datagrid-filter__no-values">Nenhum valor encontrado.</p>}
        {visible.length > rendered.length && (
          <p className="meg-datagrid-filter__limit-note">Mostrando {rendered.length} de {visible.length}. Refine a busca para localizar outros valores.</p>
        )}
      </div>
    </div>
  );
}

function DateTree({
  columnKey,
  options,
  selected,
  onSelected,
}: {
  columnKey: string;
  options: DistinctOption[];
  selected: string[];
  onSelected: (next: string[]) => void;
}) {
  const tree = useMemo(() => {
    const years = new Map<string, Map<string, DistinctOption[]>>();
    for (const option of options) {
      const key = toDateKey(option.value);
      if (!key) continue;
      const [year, month] = key.split('-');
      const months = years.get(year) ?? new Map<string, DistinctOption[]>();
      const days = months.get(month) ?? [];
      days.push({ ...option, key });
      months.set(month, days);
      years.set(year, months);
    }
    return years;
  }, [options]);

  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set());

  const toggleYear = (year: string) => {
    setExpandedYears((current) => {
      const next = new Set(current);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const toggle = (key: string) => {
    onSelected(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  };

  const toggleMany = (keys: string[]) => {
    const allSelected = keys.length > 0 && keys.every((key) => selected.includes(key));
    const keySet = new Set(keys);
    if (allSelected) onSelected(selected.filter((key) => !keySet.has(key)));
    else onSelected([...new Set([...selected, ...keys])]);
  };

  return (
    <div className="meg-datagrid-date-tree" aria-label="Árvore de datas" data-filter-scroll-region="dates">
      {[...tree.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([year, months]) => {
        const yearKeys = [...months.values()].flat().map((day) => day.key);
        const yearChecked = yearKeys.length > 0 && yearKeys.every((key) => selected.includes(key));
        const expanded = expandedYears.has(year);
        return (
          <section className="meg-datagrid-date-year" key={year}>
            <button
              type="button"
              className="meg-datagrid-date-year__toggle"
              aria-expanded={expanded}
              aria-controls={`meg-datagrid-year-${year}`}
              onClick={() => toggleYear(year)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                toggleYear(year);
              }}
            >
              <span className="meg-datagrid-date-year__indicator" aria-hidden="true">{expanded ? '−' : '+'}</span>
              <span>{year}</span>
            </button>
            {expanded && (
              <div className="meg-datagrid-date-year__content" id={`meg-datagrid-year-${year}`}>
                <label className="meg-datagrid-check meg-datagrid-date-tree__level">
                  <input
                    type="checkbox"
                    name={`filter-${columnKey}-year`}
                    checked={yearChecked}
                    onChange={() => toggleMany(yearKeys)}
                    aria-label={`Selecionar ano ${year}`}
                  />
                  <span>Todos de {year}</span>
                </label>
                {[...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, days]) => {
                  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
                    new Date(Number(year), Number(month) - 1, 1),
                  );
                  const sortedDays = [...days].sort((a, b) => a.key.localeCompare(b.key));
                  const monthKeys = sortedDays.map((day) => day.key);
                  const monthChecked = monthKeys.length > 0 && monthKeys.every((key) => selected.includes(key));
                  return (
                    <details key={month}>
                      <summary>{monthLabel}</summary>
                      <label className="meg-datagrid-check meg-datagrid-date-tree__level">
                        <input
                          type="checkbox"
                          name={`filter-${columnKey}-month`}
                          checked={monthChecked}
                          onChange={() => toggleMany(monthKeys)}
                          aria-label={`Selecionar mês ${monthLabel} de ${year}`}
                        />
                        <span>Todo o mês</span>
                      </label>
                      {sortedDays.map((day) => (
                        <label className="meg-datagrid-check" key={day.key}>
                          <input
                            type="checkbox"
                            name={`filter-${columnKey}-day`}
                            checked={selected.includes(day.key)}
                            onChange={() => toggle(day.key)}
                          />
                          <span>{day.key.slice(-2)}</span>
                          <span className="meg-datagrid-count">{day.count}</span>
                        </label>
                      ))}
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function FilterPanel<T extends Record<string, unknown>>({
  column,
  filter,
  distinctOptions,
  onApply,
  onClear,
}: {
  column: DataGridColumn<T>;
  filter?: DataGridFilter;
  distinctOptions: DistinctOption[];
  onApply: (filter: DataGridFilter | null) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<DataGridFilter>(() => filter ?? emptyFilter(column.type));

  useEffect(() => {
    setDraft(filter ?? emptyFilter(column.type));
  }, [column.type, filter]);

  const setSelected = (selected: string[]) => setDraft((current) => ({ ...current, selected }));

  const applyShortcut = (shortcut: DateShortcut) => {
    const { from, to } = dateRangeForShortcut(shortcut, new Date());
    setDraft((current) => ({
      ...current,
      operator: 'between',
      value: from,
      value2: to,
      shortcut,
    }));
  };

  return (
    <div className="meg-datagrid-filter-panel">
      <div className="meg-datagrid-filter-panel__body">
        {column.type === 'text' && (
          <>
            <div className="meg-datagrid-filter__criteria">
              <label className="meg-datagrid-field">
                <span>Operador</span>
                <select
                  name={`filter-${column.key}-operator`}
                  value={String(draft.operator ?? 'contains')}
                  onChange={(event) => setDraft((current) => ({ ...current, operator: event.target.value as DataGridFilter['operator'] }))}
                >
                  {textOperators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {draft.operator !== 'empty' && (
                <label className="meg-datagrid-field">
                  <span>Texto</span>
                  <input
                    name={`filter-${column.key}-text`}
                    value={String(draft.value ?? '')}
                    onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
                  />
                </label>
              )}
            </div>
            <DistinctList column={column} options={distinctOptions} selected={draft.selected ?? []} onSelected={setSelected} />
          </>
        )}

        {(column.type === 'number' || column.type === 'currency') && (
          <>
            <label className="meg-datagrid-field">
              <span>Operador</span>
              <select
                name={`filter-${column.key}-operator`}
                value={String(draft.operator ?? 'eq')}
                onChange={(event) => setDraft((current) => ({ ...current, operator: event.target.value as DataGridFilter['operator'] }))}
              >
                {numberOperators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {draft.operator !== 'empty' && (
              <div className="meg-datagrid-filter__range">
                <label className="meg-datagrid-field">
                  <span>{draft.operator === 'between' ? 'De' : 'Valor'}</span>
                  <input
                    name={`filter-${column.key}-value`}
                    inputMode="decimal"
                    value={String(draft.value ?? '')}
                    onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
                    onBlur={() => setDraft((current) => ({ ...current, value: formatNumericDraft(current.value, column.type as 'number' | 'currency') }))}
                    placeholder={column.type === 'currency' ? '0,00' : '0'}
                  />
                </label>
                {draft.operator === 'between' && (
                  <label className="meg-datagrid-field">
                    <span>Até</span>
                    <input
                      name={`filter-${column.key}-value2`}
                      inputMode="decimal"
                      value={String(draft.value2 ?? '')}
                      onChange={(event) => setDraft((current) => ({ ...current, value2: event.target.value }))}
                      onBlur={() => setDraft((current) => ({ ...current, value2: formatNumericDraft(current.value2, column.type as 'number' | 'currency') }))}
                      placeholder={column.type === 'currency' ? '0,00' : '0'}
                    />
                  </label>
                )}
              </div>
            )}
            <DistinctList column={column} options={distinctOptions} selected={draft.selected ?? []} onSelected={setSelected} />
          </>
        )}

        {column.type === 'date' && (
          <>
            <label className="meg-datagrid-field">
              <span>Operador</span>
              <select
                name={`filter-${column.key}-operator`}
                value={String(draft.operator ?? 'between')}
                onChange={(event) => setDraft((current) => ({ ...current, operator: event.target.value as DataGridFilter['operator'], shortcut: null }))}
              >
                {dateOperators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="meg-datagrid-filter__range">
              <label className="meg-datagrid-field">
                <span>{draft.operator === 'between' ? 'De' : 'Data'}</span>
                <input
                  type="date"
                  name={`filter-${column.key}-date-from`}
                  value={String(draft.value ?? '')}
                  onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value, shortcut: null }))}
                />
              </label>
              {draft.operator === 'between' && (
                <label className="meg-datagrid-field">
                  <span>Até</span>
                  <input
                    type="date"
                    name={`filter-${column.key}-date-to`}
                    value={String(draft.value2 ?? '')}
                    onChange={(event) => setDraft((current) => ({ ...current, value2: event.target.value, shortcut: null }))}
                  />
                </label>
              )}
            </div>
            <div className="meg-datagrid-shortcuts" aria-label="Atalhos de data">
              {shortcuts.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={draft.shortcut === value ? 'is-active' : ''}
                  onClick={() => applyShortcut(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <DateTree columnKey={column.key} options={distinctOptions} selected={draft.selected ?? []} onSelected={setSelected} />
          </>
        )}

        {column.type === 'enum' && (
          <DistinctList column={column} options={distinctOptions} selected={draft.selected ?? []} onSelected={setSelected} />
        )}

        {column.type === 'boolean' && (
          <fieldset className="meg-datagrid-boolean">
            <legend>Valor</legend>
            {[
              [null, 'Todos'],
              [true, 'Sim'],
              [false, 'Não'],
            ].map(([value, label]) => (
              <label key={label as string}>
                <input
                  type="radio"
                  name={`filter-${column.key}-boolean`}
                  checked={draft.booleanValue === value}
                  onChange={() => setDraft((current) => ({ ...current, booleanValue: value as boolean | null }))}
                />
                <span>{label as string}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>

      <footer className="meg-datagrid-filter-panel__footer">
        <button
          type="button"
          className="meg-datagrid-secondary-action"
          onClick={() => {
            setDraft(emptyFilter(column.type));
            onClear();
          }}
        >
          Limpar
        </button>
        <button
          type="button"
          className="meg-datagrid-primary-action"
          onClick={() => onApply(isFilterActive(draft) ? draft : null)}
        >
          Aplicar
        </button>
      </footer>
    </div>
  );
}

function formatDateSummaryValue(value: unknown) {
  const key = toDateKey(value);
  if (!key) return displayValue(value);
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

function filterOperatorLabel(filter: DataGridFilter): string {
  const operators: ReadonlyArray<readonly [string, string]> =
    filter.type === 'date'
      ? dateOperators
      : filter.type === 'number' || filter.type === 'currency'
        ? numberOperators
        : filter.type === 'text'
          ? textOperators
          : [];
  return operators.find(([value]) => value === filter.operator)?.[1] ?? '';
}

export function filterSummary(filter: DataGridFilter | undefined): string {
  if (!filter || !isFilterActive(filter)) return '';
  if (filter.type === 'boolean') return filter.booleanValue ? 'Sim' : 'Não';
  if (filter.selected?.length) return filter.selected.length === 1 ? '1 selecionado' : `${filter.selected.length} selecionados`;
  if (filter.operator === 'empty') return 'Está vazio';

  const operatorLabel = filterOperatorLabel(filter);

  if (filter.type === 'date') {
    const from = formatDateSummaryValue(filter.value);
    if (filter.operator === 'between') {
      const to = formatDateSummaryValue(filter.value2);
      const range = from === to ? from : `${from} e ${to}`;
      return operatorLabel ? `${operatorLabel} ${range}` : range;
    }
    return operatorLabel ? `${operatorLabel} ${from}` : from;
  }

  if (filter.operator === 'between') {
    const range = `${displayValue(filter.value)} e ${displayValue(filter.value2)}`;
    return operatorLabel ? `${operatorLabel} ${range}` : range;
  }

  const value = displayValue(filter.value);
  return operatorLabel ? `${operatorLabel} ${value}` : value;
}
