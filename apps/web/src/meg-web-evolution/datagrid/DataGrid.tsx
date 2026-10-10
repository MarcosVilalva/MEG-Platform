import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  aggregateRows,
  applyFilters,
  cycleSort,
  flattenGroups,
  getDistinctOptions,
  getVirtualWindow,
  groupRows,
  isFilterActive,
  paginateRows,
  parsePtBrNumber,
  persistenceStorageKey,
  pruneSelection,
  reorderKeys,
  resizeWidth,
  sanitizePersistenceState,
  sortRows,
  toCsv,
  toDateKey,
  updateFilteredSelection,
} from './core';
import { FilterPanel, filterSummary } from './FilterPanel';
import type {
  DataGridAggregate,
  DataGridColumn,
  DataGridDisplayEntry,
  DataGridFilter,
  DataGridFilterState,
  DataGridPersistenceState,
  DataGridProps,
  DataGridSort,
  DistinctOption,
} from './types';
import './datagrid.css';

type GridIconName =
  | 'funnel'
  | 'columns'
  | 'download'
  | 'x'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'chevronUp'
  | 'grip'
  | 'filter'
  | 'sort';

function GridIcon({ name, size = 18 }: { name: GridIconName; size?: number }) {
  const path: Record<GridIconName, ReactNode> = {
    funnel: <><path d="M4 5h16l-6.2 7.1v5.2l-3.6 1.8v-7L4 5Z" /><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" stroke="none" /></>,
    columns: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M9 5v14M15 5v14" /></>,
    download: <><path d="M12 3v11" /><path d="m8 10 4 4 4-4" /><path d="M5 20h14" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    chevronDown: <path d="m7 10 5 5 5-5" />,
    chevronUp: <path d="m7 14 5-5 5 5" />,
    grip: <><circle cx="9" cy="7" r=".8" fill="currentColor" stroke="none" /><circle cx="15" cy="7" r=".8" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none" /><circle cx="9" cy="17" r=".8" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r=".8" fill="currentColor" stroke="none" /></>,
    filter: <><path d="M5 6h14M8 12h8M10.5 18h3" /></>,
    sort: <><path d="m8 7 3-3 3 3M11 4v16" /><path d="m16 17 3 3 3-3M19 20V4" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path[name]}
    </svg>
  );
}

function useDesktopGrid() {
  const [desktop, setDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return desktop;
}

function getAnchoredOverlayStyle(trigger: HTMLElement | null, preferredWidth: number, measuredHeight = 560): CSSProperties {
  const margin = 8;
  const gap = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const responsiveWidth = Math.max(280, Math.min(360, viewportWidth * .24));
  const width = Math.min(preferredWidth, responsiveWidth, Math.max(1, viewportWidth - margin * 2));
  const rect = trigger?.getBoundingClientRect();

  if (!rect) {
    return {
      left: margin,
      top: margin,
      width,
      maxHeight: Math.max(1, Math.min(560, viewportHeight - margin * 2)),
    };
  }

  const sidebar = document.querySelector<HTMLElement>('.meg-sidebar-wrap');
  const sidebarRect = sidebar?.getBoundingClientRect();
  const sidebarRight = sidebarRect && sidebarRect.width > 0 && rect.left >= sidebarRect.right - 1
    ? sidebarRect.right + margin
    : margin;
  const minLeft = Math.max(margin, sidebarRight);
  const maxLeft = Math.max(minLeft, viewportWidth - width - margin);
  const preferLeft = rect.left + width <= viewportWidth - margin ? rect.left : rect.right - width;
  const left = Math.min(Math.max(minLeft, preferLeft), maxLeft);

  const viewportMaxHeight = Math.max(1, Math.min(560, viewportHeight - margin * 2));
  const desiredHeight = Math.min(viewportMaxHeight, Math.max(180, measuredHeight));
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap - margin);
  const spaceAbove = Math.max(0, rect.top - gap - margin);
  const openUp = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
  const preferredTop = openUp ? rect.top - gap - desiredHeight : rect.bottom + gap;
  const maxTop = Math.max(margin, viewportHeight - desiredHeight - margin);
  const top = Math.min(Math.max(margin, preferredTop), maxTop);

  return {
    left,
    top,
    width,
    maxHeight: viewportMaxHeight,
  };
}

function useAnchoredOverlay(
  trigger: HTMLElement | null,
  containerRef: React.RefObject<HTMLElement | null>,
  preferredWidth: number,
  onClose: () => void,
) {
  const [style, setStyle] = useState<CSSProperties>(() =>
    typeof window === 'undefined' ? {} : getAnchoredOverlayStyle(trigger, preferredWidth),
  );

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = trigger?.getBoundingClientRect();
        if (!rect || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
          onClose();
          return;
        }
        const measuredHeight = containerRef.current?.scrollHeight ?? 560;
        setStyle(getAnchoredOverlayStyle(trigger, preferredWidth, measuredHeight));
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const observer = typeof ResizeObserver !== 'undefined' && containerRef.current
      ? new ResizeObserver(update)
      : null;
    if (containerRef.current) observer?.observe(containerRef.current);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      observer?.disconnect();
    };
  }, [containerRef, onClose, preferredWidth, trigger]);

  return style;
}

function useOutsideDismiss(
  containerRef: React.RefObject<HTMLElement | null>,
  trigger: HTMLElement | null,
  onClose: () => void,
) {
  useEffect(() => {
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target) || trigger?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [containerRef, onClose, trigger]);
}

function useDialogKeyboard(
  open: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  trigger: HTMLElement | null,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const previous = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const timer = window.setTimeout(() => {
      const container = containerRef.current;
      const preferred = container?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), [data-dialog-initial-focus]',
      );
      const fallback = container?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (preferred ?? fallback)?.focus();
    }, 0);

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        window.setTimeout(() => previous?.focus(), 0);
        return;
      }

      if (event.key !== 'Tab' || !containerRef.current) return;
      const focusable = [...containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [containerRef, onClose, open, trigger]);
}

function FilterDialog<T extends Record<string, unknown>>({
  column,
  filter,
  distinctOptions,
  trigger,
  onApply,
  onClear,
  onClose,
}: {
  column: DataGridColumn<T>;
  filter?: DataGridFilter;
  distinctOptions: DistinctOption[];
  trigger: HTMLElement | null;
  onApply: (filter: DataGridFilter | null) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeAndRestore = useCallback(() => {
    onClose();
    window.setTimeout(() => trigger?.focus(), 0);
  }, [onClose, trigger]);
  const style = useAnchoredOverlay(trigger, ref, 360, closeAndRestore);
  useDialogKeyboard(true, ref, trigger, closeAndRestore);
  useOutsideDismiss(ref, trigger, closeAndRestore);

  return createPortal(
    <div
      ref={ref}
      className="meg-datagrid-filter-dialog"
      role="dialog"
      aria-modal="false"
      aria-label={`Filtro: ${column.label}`}
      style={style}
      data-datagrid-filter-dialog={column.key}
    >
      <header className="meg-datagrid-dialog-header">
        <div>
          <span className="meg-datagrid-dialog-kicker">Filtrar coluna</span>
          <strong>{column.label}</strong>
        </div>
        <button type="button" aria-label="Fechar filtro" onClick={closeAndRestore}>
          <GridIcon name="x" />
        </button>
      </header>
      <FilterPanel
        column={column}
        filter={filter}
        distinctOptions={distinctOptions}
        onApply={(next) => {
          onApply(next);
          closeAndRestore();
        }}
        onClear={() => {
          onClear();
          closeAndRestore();
        }}
      />
    </div>,
    document.body,
  );
}

function MobileFilterSheet<T extends Record<string, unknown>>({
  columns,
  filters,
  getOptions,
  trigger,
  onChange,
  onClose,
}: {
  columns: DataGridColumn<T>[];
  filters: DataGridFilterState;
  getOptions: (column: DataGridColumn<T>) => DistinctOption[];
  trigger: HTMLElement | null;
  onChange: (key: string, filter: DataGridFilter | null) => void;
  onClose: () => void;
  onClearAll: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const filterableColumns = useMemo(
    () => columns.filter((column) => column.filterable !== false),
    [columns],
  );
  const [activeKey, setActiveKey] = useState<string>(() =>
    filterableColumns.find((column) => isFilterActive(filters[column.key]))?.key
      ?? filterableColumns[0]?.key
      ?? '',
  );
  const activeColumn = filterableColumns.find((column) => column.key === activeKey) ?? filterableColumns[0];

  const closeAndRestore = useCallback(() => {
    onClose();
    window.setTimeout(() => trigger?.focus(), 0);
  }, [onClose, trigger]);
  const style = useAnchoredOverlay(trigger, ref, 360, closeAndRestore);
  useDialogKeyboard(true, ref, trigger, closeAndRestore);
  useOutsideDismiss(ref, trigger, closeAndRestore);

  return createPortal(
    <section
      ref={ref}
      className="meg-datagrid-filter-popover"
      role="dialog"
      aria-modal="false"
      aria-label="Filtros do DataGrid"
      style={style}
      data-datagrid-mobile-sheet
    >
      <header className="meg-datagrid-dialog-header">
        <div>
          <span className="meg-datagrid-dialog-kicker">Filtrar coluna</span>
          <strong>{activeColumn?.label ?? 'Filtros'}</strong>
        </div>
        <button type="button" aria-label="Fechar filtros" onClick={closeAndRestore}>
          <GridIcon name="x" />
        </button>
      </header>

      <label className="meg-datagrid-mobile-filter-column">
        <span>Coluna</span>
        <select
          name="meg-datagrid-filter-column"
          data-datagrid-mobile-column
          value={activeColumn?.key ?? ''}
          onChange={(event) => setActiveKey(event.target.value)}
        >
          {filterableColumns.map((column) => (
            <option key={column.key} value={column.key}>{column.label}</option>
          ))}
        </select>
      </label>

      {activeColumn && (
        <FilterPanel
          key={activeColumn.key}
          column={activeColumn}
          filter={filters[activeColumn.key]}
          distinctOptions={getOptions(activeColumn)}
          onApply={(next) => {
            onChange(activeColumn.key, next);
            closeAndRestore();
          }}
          onClear={() => {
            onChange(activeColumn.key, null);
            closeAndRestore();
          }}
        />
      )}
    </section>,
    document.body,
  );
}

function formatCell<T extends Record<string, unknown>>(column: DataGridColumn<T>, row: T): ReactNode {
  const value = row[column.key];
  if (column.render) return column.render(value as T[keyof T], row);
  if (value == null || value === '') return <span className="meg-datagrid-muted">—</span>;

  switch (column.type) {
    case 'currency': {
      const number = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(number)
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number)
        : String(value);
    }
    case 'number': {
      const number = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(number) ? new Intl.NumberFormat('pt-BR').format(number) : String(value);
    }
    case 'date': {
      const key = toDateKey(value);
      if (!key) return String(value);
      const [year, month, day] = key.split('-').map(Number);
      return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
    }
    case 'boolean':
      return <span className={`meg-datagrid-boolean-pill ${Boolean(value) ? 'is-yes' : 'is-no'}`}>{Boolean(value) ? 'Sim' : 'Não'}</span>;
    case 'enum': {
      const record = typeof value === 'object' ? value as Record<string, unknown> : null;
      const key = String(record?.value ?? record?.id ?? value);
      const visual = column.enumValues?.[key];
      const label = visual?.label ?? String(record?.label ?? record?.name ?? value);
      return (
        <span className="meg-datagrid-enum-pill">
          <span className="meg-datagrid-enum-dot" style={visual?.color ? { backgroundColor: visual.color } : undefined} aria-hidden="true" />
          {visual?.icon}
          {label}
        </span>
      );
    }
    default:
      return String(value);
  }
}

function aggregateForColumn<T extends Record<string, unknown>>(
  column: DataGridColumn<T>,
  config: DataGridProps<T>['footerAggregates'],
): DataGridAggregate | undefined {
  if (!config) return undefined;
  if (config === true) return column.aggregate;
  return config[column.key] ?? column.aggregate;
}

function formatAggregate<T extends Record<string, unknown>>(column: DataGridColumn<T>, value: number, mode: DataGridAggregate) {
  if (mode === 'count') return new Intl.NumberFormat('pt-BR').format(value);
  if (column.type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: mode === 'avg' ? 2 : 6 }).format(value);
}

function ColumnManager<T extends Record<string, unknown>>({
  columns,
  order,
  hidden,
  trigger,
  onToggle,
  onMove,
  onClose,
}: {
  columns: DataGridColumn<T>[];
  order: string[];
  hidden: Set<string>;
  trigger: HTMLElement | null;
  onToggle: (key: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeAndRestore = useCallback(() => {
    onClose();
    window.setTimeout(() => trigger?.focus(), 0);
  }, [onClose, trigger]);
  const style = useAnchoredOverlay(trigger, ref, 340, closeAndRestore);
  useDialogKeyboard(true, ref, trigger, closeAndRestore);
  useOutsideDismiss(ref, trigger, closeAndRestore);

  const ordered = order.map((key) => columns.find((column) => column.key === key)).filter(Boolean) as DataGridColumn<T>[];
  const visibleCount = ordered.filter((column) => !hidden.has(column.key)).length;

  return createPortal(
    <div
      ref={ref}
      className="meg-datagrid-column-menu"
      role="dialog"
      aria-modal="false"
      aria-label="Colunas"
      style={style}
      data-datagrid-column-dialog
    >
      <header className="meg-datagrid-dialog-header">
        <strong>Colunas</strong>
        <button type="button" aria-label="Fechar colunas" onClick={closeAndRestore}><GridIcon name="x" /></button>
      </header>
      <div className="meg-datagrid-column-menu__list">
        {ordered.map((column, index) => (
          <div className="meg-datagrid-column-menu__item" key={column.key}>
            <GridIcon name="grip" />
            <label>
              <input
                type="checkbox"
                name={`meg-datagrid-column-${column.key}`}
                checked={!hidden.has(column.key)}
                disabled={!hidden.has(column.key) && visibleCount === 1}
                onChange={() => onToggle(column.key)}
              />
              <span title={column.label}>{column.label}</span>
            </label>
            <span className="meg-datagrid-column-menu__moves">
              <button type="button" aria-label={`Mover ${column.label} para cima`} disabled={index === 0} onClick={() => onMove(column.key, -1)}>
                <GridIcon name="chevronUp" size={16} />
              </button>
              <button type="button" aria-label={`Mover ${column.label} para baixo`} disabled={index === ordered.length - 1} onClick={() => onMove(column.key, 1)}>
                <GridIcon name="chevronDown" size={16} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

type ActiveFilterItem = {
  key: string;
  label: string;
  summary: string;
  tooltipSummary: string;
};

function formatTooltipDate(value: unknown): string {
  const key = toDateKey(value);
  if (!key) return String(value ?? '');
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

function formatSelectedTooltipValue<T extends Record<string, unknown>>(
  column: DataGridColumn<T>,
  option: DistinctOption | undefined,
  key: string,
): string {
  if (key === '__EMPTY__') return '(vazio)';
  if (column.type === 'date') return formatTooltipDate(option?.value ?? key);
  if (column.type === 'enum') return column.enumValues?.[key]?.label ?? option?.label ?? key;
  if (column.type === 'number' || column.type === 'currency') {
    const parsed = parsePtBrNumber(option?.value ?? key);
    if (parsed != null) {
      return new Intl.NumberFormat('pt-BR', column.type === 'currency'
        ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        : { maximumFractionDigits: 6 }).format(parsed);
    }
  }
  return option?.label ?? key;
}

function filterTooltipSummary<T extends Record<string, unknown>>(
  filter: DataGridFilter | undefined,
  column: DataGridColumn<T>,
  rows: T[],
): string {
  if (!filter?.selected?.length) return filterSummary(filter);
  const optionMap = new Map(getDistinctOptions(rows, column).map((option) => [option.key, option]));
  const values = filter.selected.map((key) => formatSelectedTooltipValue(column, optionMap.get(key), key));
  const firstFive = values.slice(0, 5);
  const remaining = values.length - firstFive.length;
  return `${firstFive.join(', ')}${remaining > 0 ? `, +${remaining}` : ''}`;
}

function DataGridTooltip({ anchor, text }: { anchor: HTMLElement; text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({
    left: 8,
    top: 8,
    visibility: 'hidden',
  });

  const updatePosition = useCallback(() => {
    const tooltip = ref.current;
    if (!tooltip) return;

    const margin = 8;
    const gap = 8;
    const triggerRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    const triggerCenter = triggerRect.left + triggerRect.width / 2;

    const idealLeft = triggerCenter - tooltipWidth / 2;
    const maxLeft = Math.max(margin, window.innerWidth - tooltipWidth - margin);
    const left = Math.min(Math.max(margin, idealLeft), maxLeft);

    const below = triggerRect.bottom + gap;
    const above = triggerRect.top - gap - tooltipHeight;
    const fitsBelow = below + tooltipHeight <= window.innerHeight - margin;
    const fitsAbove = above >= margin;
    const fallbackTop = Math.min(
      Math.max(margin, below),
      Math.max(margin, window.innerHeight - tooltipHeight - margin),
    );
    const top = fitsBelow ? below : fitsAbove ? above : fallbackTop;

    setStyle({ left, top, visibility: 'visible' });
  }, [anchor]);

  useLayoutEffect(() => {
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePosition);
    };

    updatePosition();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);

    const observer = typeof ResizeObserver !== 'undefined' && ref.current
      ? new ResizeObserver(schedule)
      : null;
    if (ref.current) observer?.observe(ref.current);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      observer?.disconnect();
    };
  }, [text, updatePosition]);

  return createPortal(
    <div
      ref={ref}
      id="meg-datagrid-tooltip"
      className="meg-datagrid-tooltip"
      role="tooltip"
      style={style}
      data-datagrid-tooltip
    >
      {text}
    </div>,
    document.body,
  );
}

function ActiveFiltersPopover({
  items,
  trigger,
  onRemove,
  onClearAll,
  onClose,
}: {
  items: ActiveFilterItem[];
  trigger: HTMLElement | null;
  onRemove: (key: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeAndRestore = useCallback(() => {
    onClose();
    window.setTimeout(() => trigger?.focus(), 0);
  }, [onClose, trigger]);
  const style = useAnchoredOverlay(trigger, ref, 360, closeAndRestore);
  useDialogKeyboard(true, ref, trigger, closeAndRestore);
  useOutsideDismiss(ref, trigger, closeAndRestore);

  return createPortal(
    <div
      ref={ref}
      className="meg-datagrid-active-filters-popover"
      role="dialog"
      aria-modal="false"
      aria-label="Todos os filtros ativos"
      style={style}
      data-datagrid-active-filters-popover
    >
      <header className="meg-datagrid-dialog-header">
        <div>
          <span className="meg-datagrid-dialog-kicker">Filtros ativos</span>
          <strong>{items.length} {items.length === 1 ? 'filtro' : 'filtros'}</strong>
        </div>
        <button type="button" aria-label="Fechar filtros ativos" onClick={closeAndRestore}>
          <GridIcon name="x" />
        </button>
      </header>
      <div className="meg-datagrid-active-filters-popover__list">
        {items.map((item) => (
          <div className="meg-datagrid-active-filter-row" key={item.key} data-active-filter-row={item.key}>
            <div className="meg-datagrid-active-filter-row__copy">
              <span className="meg-datagrid-active-filter-row__label">{item.label}</span>
              <span className="meg-datagrid-active-filter-row__summary">{item.tooltipSummary}</span>
            </div>
            <button
              type="button"
              className="meg-datagrid-active-filter-row__remove"
              onClick={() => onRemove(item.key)}
              aria-label={`Remover filtro ${item.label}: ${item.tooltipSummary}`}
            >
              <GridIcon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>
      <footer className="meg-datagrid-active-filters-popover__footer">
        <button
          type="button"
          className="meg-datagrid-clear-all"
          onClick={() => {
            onClearAll();
            closeAndRestore();
          }}
        >
          Limpar tudo
        </button>
      </footer>
    </div>,
    document.body,
  );
}

export function DataGrid<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 12,
  groupBy,
  selectable = false,
  footerAggregates = false,
  onFilterChange,
  persistenceKey,
  rowKey,
  loading = false,
  ariaLabel = 'Grade de dados',
}: DataGridProps<T>) {
  const columnKeys = useMemo(() => columns.map((column) => column.key), [columns]);
  const persisted = useMemo<DataGridPersistenceState>(() => {
    if (!persistenceKey || typeof window === 'undefined') {
      return sanitizePersistenceState(null, columnKeys, pageSize);
    }
    try {
      return sanitizePersistenceState(
        JSON.parse(window.localStorage.getItem(persistenceStorageKey(persistenceKey)) ?? 'null'),
        columnKeys,
        pageSize,
      );
    } catch {
      return sanitizePersistenceState(null, columnKeys, pageSize);
    }
  // Initial state is intentionally read once per grid instance/persistence key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<DataGridFilterState>(persisted.filters);
  const [sort, setSort] = useState<DataGridSort[]>(persisted.sort);
  const [columnOrder, setColumnOrder] = useState<string[]>(persisted.columnOrder);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => new Set(persisted.hiddenColumns));
  const [widths, setWidths] = useState<Record<string, number>>(persisted.widths);
  const [currentPageSize, setCurrentPageSize] = useState(persisted.pageSize);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeFiltersOpen, setActiveFiltersOpen] = useState(false);
  const [tooltipState, setTooltipState] = useState<{ anchor: HTMLElement; text: string } | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);
  const viewportRef = useRef<HTMLDivElement>(null);
  const mobileFilterButtonRef = useRef<HTMLButtonElement>(null);
  const activeFiltersButtonRef = useRef<HTMLButtonElement>(null);
  const columnMenuButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const isDesktop = useDesktopGrid();

  const getRowKey = useCallback((row: T) => {
    if (typeof rowKey === 'function') return String(rowKey(row));
    const key = rowKey ?? ('id' as keyof T & string);
    const value = row[key];
    if (value == null || value === '') {
      throw new Error(`DataGrid exige chave estável por linha. Informe rowKey ou um campo id. Coluna ausente: ${String(key)}`);
    }
    return String(value);
  }, [rowKey]);

  const orderedColumns = useMemo(() => {
    const map = new Map(columns.map((column) => [column.key, column]));
    return columnOrder.map((key) => map.get(key)).filter(Boolean) as DataGridColumn<T>[];
  }, [columnOrder, columns]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => !hiddenColumns.has(column.key)),
    [hiddenColumns, orderedColumns],
  );

  useEffect(() => {
    const sanitized = sanitizePersistenceState(
      { filters, sort, columnOrder, hiddenColumns: [...hiddenColumns], widths, pageSize: currentPageSize },
      columnKeys,
      pageSize,
    );
    setColumnOrder((current) => current.length === sanitized.columnOrder.length && current.every((key, index) => key === sanitized.columnOrder[index])
      ? current
      : sanitized.columnOrder);
  }, [columnKeys, columnOrder, currentPageSize, filters, hiddenColumns, pageSize, sort, widths]);

  useEffect(() => {
    if (!persistenceKey) return;
    const state: DataGridPersistenceState = {
      filters,
      sort,
      columnOrder,
      hiddenColumns: [...hiddenColumns],
      widths,
      pageSize: currentPageSize,
    };
    window.localStorage.setItem(persistenceStorageKey(persistenceKey), JSON.stringify(state));
  }, [columnOrder, currentPageSize, filters, hiddenColumns, persistenceKey, sort, widths]);

  const filteredRows = useMemo(
    () => applyFilters(data, columns, filters),
    [columns, data, filters],
  );

  const sortedRows = useMemo(
    () => sortRows(filteredRows, columns, sort),
    [columns, filteredRows, sort],
  );

  useEffect(() => {
    const available = data.map(getRowKey);
    setSelected((current) => {
      const next = pruneSelection(current, available);
      return next.size === current.size && [...next].every((key) => current.has(key)) ? current : next;
    });
  }, [data, getRowKey]);

  const activeFilterKeys = useMemo(
    () => Object.keys(filters).filter((key) => isFilterActive(filters[key])),
    [filters],
  );

  const activeFilterItems = useMemo(
    () => activeFilterKeys.map((key) => {
      const column = columns.find((item) => item.key === key);
      if (!column) return null;
      const filter = filters[key];
      return {
        key,
        label: column.label,
        summary: filterSummary(filter),
        tooltipSummary: filterTooltipSummary(filter, column, data),
      };
    }).filter(Boolean) as ActiveFilterItem[],
    [activeFilterKeys, columns, data, filters],
  );

  const hiddenFiltersTooltip = useMemo(
    () => activeFilterItems.slice(2).map((item) => `${item.label} · ${item.tooltipSummary}`).join('\n'),
    [activeFilterItems],
  );

  const showTooltip = useCallback((anchor: HTMLElement, text: string) => {
    setTooltipState({ anchor, text });
  }, []);

  const hideTooltip = useCallback((anchor: HTMLElement) => {
    setTooltipState((current) => current?.anchor === anchor ? null : current);
  }, []);

  useEffect(() => {
    onFilterChange?.({
      filters,
      activeKeys: activeFilterKeys,
      filteredCount: filteredRows.length,
    });
  }, [activeFilterKeys, filteredRows.length, filters, onFilterChange]);

  const filteredGroups = useMemo(() => {
    if (!groupBy) return new Map<string, T[]>();
    return new Map(groupRows(sortedRows, groupBy).map((group) => [group.id, group.rows]));
  }, [groupBy, sortedRows]);

  const page = useMemo(
    () => paginateRows(sortedRows, pageIndex, currentPageSize),
    [currentPageSize, pageIndex, sortedRows],
  );

  useEffect(() => {
    if (pageIndex >= page.pages) setPageIndex(Math.max(0, page.pages - 1));
  }, [page.pages, pageIndex]);

  const displayEntries = useMemo<DataGridDisplayEntry<T>[]>(() => {
    if (!groupBy) return page.rows.map((row) => ({ kind: 'row', row }));
    return flattenGroups(groupRows(page.rows, groupBy), collapsedGroups);
  }, [collapsedGroups, groupBy, page.rows]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const measure = () => setViewportHeight(Math.max(1, Math.min(element.clientHeight || 480, window.innerHeight || 480)));
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);

  const virtual = useMemo(
    () => getVirtualWindow(displayEntries.length, scrollTop, viewportHeight, isDesktop ? 48 : 248, 8),
    [displayEntries.length, isDesktop, scrollTop, viewportHeight],
  );
  const renderedEntries = displayEntries.slice(virtual.start, virtual.end);
  const virtualized = displayEntries.length > 500;

  const resetViewport = () => {
    setScrollTop(0);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  };

  const updateFilter = (key: string, filter: DataGridFilter | null) => {
    setFilters((current) => {
      const next = { ...current };
      if (filter && isFilterActive(filter)) next[key] = filter;
      else delete next[key];
      return next;
    });
    setPageIndex(0);
    resetViewport();
  };

  const clearAllFilters = () => {
    setFilters({});
    setActiveFiltersOpen(false);
    setPageIndex(0);
    resetViewport();
  };

  const getCascadeOptions = useCallback((column: DataGridColumn<T>) => {
    const cascaded = applyFilters(data, columns, filters, column.key);
    return getDistinctOptions(cascaded, column);
  }, [columns, data, filters]);

  const toggleSort = (key: string, multi = false) => {
    setSort((current) => cycleSort(current, key, multi));
    setPageIndex(0);
    resetViewport();
  };

  const moveColumn = (key: string, direction: -1 | 1) => {
    setColumnOrder((current) => {
      const index = current.indexOf(key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resizeColumn = (column: DataGridColumn<T>, delta: number) => {
    const current = widths[column.key] ?? column.width ?? 160;
    setWidths((state) => ({
      ...state,
      [column.key]: resizeWidth(current, delta, column.minWidth ?? 96),
    }));
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>, column: DataGridColumn<T>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widths[column.key] ?? column.width ?? 160;
    const minWidth = column.minWidth ?? 96;
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture?.(pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      setWidths((current) => ({
        ...current,
        [column.key]: resizeWidth(startWidth, moveEvent.clientX - startX, minWidth),
      }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const filteredKeys = useMemo(() => filteredRows.map(getRowKey), [filteredRows, getRowKey]);
  const allFilteredSelected = selectable && filteredKeys.length > 0 && filteredKeys.every((key) => selected.has(key));
  const someFilteredSelected = selectable && filteredKeys.some((key) => selected.has(key)) && !allFilteredSelected;

  const toggleAllFiltered = (checked: boolean) => {
    setSelected((current) => updateFilteredSelection(current, filteredKeys, checked));
  };

  const toggleRow = (key: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      checked ? next.add(key) : next.delete(key);
      return next;
    });
  };

  const tableMinWidth = visibleColumns.reduce(
    (total, column) => total + (widths[column.key] ?? column.width ?? 160),
    selectable ? 52 : 0,
  );

  const aggregateCells = (rows: T[]) => visibleColumns.map((column) => {
    const aggregate = aggregateForColumn(column, footerAggregates);
    if (!aggregate) return null;
    return {
      key: column.key,
      label: column.label,
      mode: aggregate,
      value: aggregateRows(rows, column, aggregate),
      formatted: formatAggregate(column, aggregateRows(rows, column, aggregate), aggregate),
    };
  }).filter(Boolean) as Array<{ key: string; label: string; mode: DataGridAggregate; value: number; formatted: string }>;

  const groupSummary = (rows: T[]) => aggregateCells(rows)
    .map((item) => `${item.label}: ${item.formatted}`)
    .join(' · ');

  const exportCsv = () => {
    const csv = toCsv(sortedRows, visibleColumns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'meg-datagrid.csv';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const pageSizes = [...new Set([pageSize, 12, 25, 50, 100, 250, 600])]
    .filter((size) => size > 0)
    .sort((a, b) => a - b);

  const mobileSortValue = sort.length === 1 ? `${sort[0].key}:${sort[0].direction}` : '';
  const mobileSortLabel = sort.length === 1
    ? `${orderedColumns.find((column) => column.key === sort[0].key)?.label ?? sort[0].key} · ${sort[0].direction === 'asc' ? 'crescente' : 'decrescente'}`
    : 'Sem ordenação';

  const renderGroupHeader = (entry: Extract<DataGridDisplayEntry<T>, { kind: 'group' }>, asCard = false) => {
    const expanded = !collapsedGroups.has(entry.group.id);
    const totalGroupRows = filteredGroups.get(entry.group.id) ?? entry.group.rows;
    const totalCount = totalGroupRows.length;
    const pageCount = entry.group.rows.length;
    const countLabel = totalCount === pageCount
      ? `${totalCount} ${totalCount === 1 ? 'item' : 'itens'}`
      : `${totalCount} itens no conjunto · ${pageCount} nesta página`;
    const subtotal = groupSummary(totalGroupRows);
    const toggle = () => setCollapsedGroups((current) => {
      const next = new Set(current);
      expanded ? next.add(entry.group.id) : next.delete(entry.group.id);
      return next;
    });
    const button = (
      <button
        type="button"
        className="meg-datagrid-group-button"
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          toggle();
        }}
      >
        <GridIcon name={expanded ? 'chevronDown' : 'chevronRight'} />
        <strong>{entry.group.label}</strong>
        <span>{countLabel}</span>
        {subtotal && (
          <span className="meg-datagrid-group-subtotal" title={subtotal} aria-label={subtotal}>
            {subtotal}
          </span>
        )}
      </button>
    );
    return asCard ? <div className="meg-datagrid-card-group" data-grid-group>{button}</div> : (
      <tr className="meg-datagrid-group-row" data-grid-group>
        <td colSpan={visibleColumns.length + (selectable ? 1 : 0)}>{button}</td>
      </tr>
    );
  };

  const renderTableHead = () => (
<thead>
                <tr>
                  {selectable && (
                    <th className="meg-datagrid-select-column">
                      <input
                        type="checkbox"
                        name="meg-datagrid-select-all-table"
                        aria-label="Selecionar todos os itens filtrados"
                        checked={allFilteredSelected}
                        ref={(element) => { if (element) element.indeterminate = Boolean(someFilteredSelected); }}
                        onChange={(event) => toggleAllFiltered(event.target.checked)}
                      />
                    </th>
                  )}
                  {visibleColumns.map((column) => {
                    const sortIndex = sort.findIndex((item) => item.key === column.key);
                    const sortState = sortIndex >= 0 ? sort[sortIndex] : null;
                    const activeFilter = isFilterActive(filters[column.key]);
                    const currentWidth = widths[column.key] ?? column.width ?? 160;
                    const minimumWidth = column.minWidth ?? 96;
                    const currentWidthPercent = Math.max(0, Math.min(100, Math.round((currentWidth / Math.max(1, tableMinWidth)) * 100)));
                    const minimumWidthPercent = Math.max(0, Math.min(currentWidthPercent, Math.round((minimumWidth / Math.max(1, tableMinWidth)) * 100)));
                    return (
                      <th
                        key={column.key}
                        aria-sort={sortState ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        draggable
                        onDragStart={() => setDraggedColumn(column.key)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedColumn) setColumnOrder((current) => reorderKeys(current, draggedColumn, column.key));
                          setDraggedColumn(null);
                        }}
                      >
                        <div className="meg-datagrid-th">
                          {column.sortable === false ? (
                            <span className="meg-datagrid-th__label">{column.label}</span>
                          ) : (
                            <button
                              type="button"
                              className="meg-datagrid-sort-button"
                              onClick={(event) => toggleSort(column.key, event.shiftKey)}
                              aria-label={`Ordenar por ${column.label}`}
                            >
                              <span>{column.label}</span>
                              {sortState ? (
                                <span className="meg-datagrid-sort-indicator" aria-hidden="true">
                                  <GridIcon name={sortState.direction === 'asc' ? 'chevronUp' : 'chevronDown'} size={14} />
                                  {sort.length > 1 && <small>{sortIndex + 1}</small>}
                                </span>
                              ) : <GridIcon name="sort" size={14} />}
                            </button>
                          )}

                          {column.filterable !== false && (
                            <button
                              ref={(element) => {
                                if (element) filterButtonRefs.current.set(column.key, element);
                                else filterButtonRefs.current.delete(column.key);
                              }}
                              type="button"
                              className={`meg-datagrid-filter-button ${activeFilter ? 'is-active' : ''}`}
                              aria-label={`Filtrar ${column.label}`}
                              aria-expanded={openFilterKey === column.key}
                              aria-haspopup="dialog"
                              onClick={() => {
                                setColumnMenuOpen(false);
                                setMobileFiltersOpen(false);
                                setActiveFiltersOpen(false);
                                setOpenFilterKey((current) => current === column.key ? null : column.key);
                              }}
                            >
                              <GridIcon name="funnel" size={16} />
                              {activeFilter && <span className="sr-only">Filtro ativo</span>}
                            </button>
                          )}

                          <button
                            type="button"
                            className="meg-datagrid-resizer"
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={`Redimensionar coluna ${column.label}`}
                            aria-valuemin={minimumWidthPercent}
                            aria-valuemax={100}
                            aria-valuenow={currentWidthPercent}
                            aria-valuetext={`${Math.round(currentWidth)} pixels`}
                            onPointerDown={(event) => beginResize(event, column)}
                            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                              event.preventDefault();
                              resizeColumn(column, event.key === 'ArrowRight' ? 8 : -8);
                            }}
                          />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
  );

  const renderPaginationFooter = () => (
    <footer className="meg-datagrid-footer">
      <label className="meg-datagrid-page-size">
        <span>Mostrar</span>
        <select
          name="meg-datagrid-page-size"
          value={currentPageSize}
          onChange={(event) => {
            setCurrentPageSize(Number(event.target.value));
            setPageIndex(0);
            resetViewport();
          }}
        >
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <span>por página</span>
      </label>

      <span className="meg-datagrid-page-range" aria-live="polite">{page.start}–{page.end} de {sortedRows.length}</span>

      <div className="meg-datagrid-pagination" aria-label="Paginação">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={pageIndex === 0}
          onClick={() => { setPageIndex((value) => Math.max(0, value - 1)); resetViewport(); }}
        >
          <GridIcon name="chevronLeft" />
        </button>
        <span>{Math.min(pageIndex + 1, page.pages)} / {page.pages}</span>
        <button
          type="button"
          aria-label="Próxima página"
          disabled={pageIndex >= page.pages - 1}
          onClick={() => { setPageIndex((value) => Math.min(page.pages - 1, value + 1)); resetViewport(); }}
        >
          <GridIcon name="chevronRight" />
        </button>
      </div>
    </footer>
  );

  if (loading) {
    return (
      <section className="meg-datagrid" aria-label={ariaLabel} aria-busy="true" data-datagrid data-state="loading">
        <div className="meg-datagrid-skeleton" role="status" aria-label="Carregando dados">
          <div className="meg-datagrid-skeleton__toolbar" />
          {Array.from({ length: 8 }, (_, index) => <div className="meg-datagrid-skeleton__row" key={index} />)}
        </div>
      </section>
    );
  }

  return (
    <section
      className="meg-datagrid"
      aria-label={ariaLabel}
      data-datagrid
      data-virtualized={virtualized ? 'true' : 'false'}
    >
      <div className="meg-datagrid-toolbar">
        <div className="meg-datagrid-toolbar__primary">
          <button
            ref={mobileFilterButtonRef}
            type="button"
            className={`meg-datagrid-tool meg-datagrid-mobile-filter ${activeFilterKeys.length ? 'is-active' : ''}`}
            aria-expanded={mobileFiltersOpen}
            aria-haspopup="dialog"
            aria-label={`Filtros (${activeFilterKeys.length}). ${activeFilterKeys.length === 1 ? '1 filtro ativo' : `${activeFilterKeys.length} filtros ativos`}`}
            onMouseEnter={(event) => showTooltip(event.currentTarget, activeFilterKeys.length === 1 ? '1 filtro ativo' : `${activeFilterKeys.length} filtros ativos`)}
            onMouseLeave={(event) => hideTooltip(event.currentTarget)}
            onFocus={(event) => showTooltip(event.currentTarget, activeFilterKeys.length === 1 ? '1 filtro ativo' : `${activeFilterKeys.length} filtros ativos`)}
            onBlur={(event) => hideTooltip(event.currentTarget)}
            onClick={() => {
              setTooltipState(null);
              setOpenFilterKey(null);
              setColumnMenuOpen(false);
              setActiveFiltersOpen(false);
              setMobileFiltersOpen((open) => !open);
            }}
          >
            <GridIcon name="filter" />
            <span className="meg-datagrid-filter-count-label">Filtros ({activeFilterKeys.length})</span>
          </button>

          {selectable && (
            <label className="meg-datagrid-mobile-select-all">
              <input
                type="checkbox"
                name="meg-datagrid-select-all-mobile"
                aria-label="Selecionar todos os itens filtrados"
                checked={allFilteredSelected}
                ref={(element) => { if (element) element.indeterminate = Boolean(someFilteredSelected); }}
                onChange={(event) => toggleAllFiltered(event.target.checked)}
              />
              <span>Selecionar filtrados</span>
            </label>
          )}

          <label className="meg-datagrid-mobile-sort">
            <span>Ordenar por</span>
            <select
              name="meg-datagrid-mobile-sort"
              aria-label="Ordenar por"
              title={mobileSortLabel}
              value={mobileSortValue}
              onChange={(event) => {
                if (!event.target.value) setSort([]);
                else {
                  const [key, direction] = event.target.value.split(':');
                  setSort([{ key, direction: direction as 'asc' | 'desc' }]);
                }
                setPageIndex(0);
                resetViewport();
              }}
            >
              <option value="">Sem ordenação</option>
              {orderedColumns.filter((column) => column.sortable !== false).flatMap((column) => [
                <option key={`${column.key}:asc`} value={`${column.key}:asc`}>{column.label} · crescente</option>,
                <option key={`${column.key}:desc`} value={`${column.key}:desc`}>{column.label} · decrescente</option>,
              ])}
            </select>
          </label>
        </div>

        {activeFilterItems.length > 0 && (
          <div className="meg-datagrid-toolbar__filters" aria-label="Filtros ativos">
            {activeFilterItems.slice(0, 2).map((item) => {
              const tooltipText = `${item.label} · ${item.tooltipSummary}`;
              return (
                <button
                  type="button"
                  className="meg-datagrid-filter-chip"
                  key={item.key}
                  onClick={(event) => {
                    setTooltipState(null);
                    updateFilter(item.key, null);
                    event.currentTarget.blur();
                  }}
                  onMouseEnter={(event) => showTooltip(event.currentTarget, tooltipText)}
                  onMouseLeave={(event) => hideTooltip(event.currentTarget)}
                  onFocus={(event) => showTooltip(event.currentTarget, tooltipText)}
                  onBlur={(event) => hideTooltip(event.currentTarget)}
                  aria-label={`Remover filtro ${item.label}: ${item.tooltipSummary}`}
                >
                  <span><strong>{item.label}</strong> · {item.summary}</span>
                  <GridIcon name="x" size={14} />
                </button>
              );
            })}
            {activeFilterItems.length > 2 && (
              <button
                ref={activeFiltersButtonRef}
                type="button"
                className="meg-datagrid-more-filters"
                aria-haspopup="dialog"
                aria-expanded={activeFiltersOpen}
                aria-label={`Mostrar ${activeFilterItems.length - 2} filtros ocultos: ${hiddenFiltersTooltip.replace(/\n/g, '; ')}`}
                onMouseEnter={(event) => showTooltip(event.currentTarget, hiddenFiltersTooltip)}
                onMouseLeave={(event) => hideTooltip(event.currentTarget)}
                onFocus={(event) => showTooltip(event.currentTarget, hiddenFiltersTooltip)}
                onBlur={(event) => hideTooltip(event.currentTarget)}
                onClick={() => {
                  setTooltipState(null);
                  setOpenFilterKey(null);
                  setColumnMenuOpen(false);
                  setMobileFiltersOpen(false);
                  setActiveFiltersOpen((open) => !open);
                }}
              >
                +{activeFilterItems.length - 2} filtros
              </button>
            )}
            <button type="button" className="meg-datagrid-clear-all" onClick={clearAllFilters}>Limpar tudo</button>
            {activeFiltersOpen && activeFilterItems.length > 2 && (
              <ActiveFiltersPopover
                items={activeFilterItems}
                trigger={activeFiltersButtonRef.current}
                onRemove={(key) => updateFilter(key, null)}
                onClearAll={clearAllFilters}
                onClose={() => setActiveFiltersOpen(false)}
              />
            )}
          </div>
        )}

        <div className="meg-datagrid-toolbar__actions">
          <div className="meg-datagrid-column-menu-wrap">
            <button
              ref={columnMenuButtonRef}
              type="button"
              className="meg-datagrid-tool"
              aria-expanded={columnMenuOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setOpenFilterKey(null);
                setMobileFiltersOpen(false);
                setActiveFiltersOpen(false);
                setColumnMenuOpen((open) => !open);
              }}
            >
              <GridIcon name="columns" />
              Colunas
            </button>
            {columnMenuOpen && (
              <ColumnManager
                columns={columns}
                order={columnOrder}
                hidden={hiddenColumns}
                trigger={columnMenuButtonRef.current}
                onToggle={(key) => setHiddenColumns((current) => {
                  const next = new Set(current);
                  next.has(key) ? next.delete(key) : next.add(key);
                  return next;
                })}
                onMove={moveColumn}
                onClose={() => setColumnMenuOpen(false)}
              />
            )}
          </div>
          <button type="button" className="meg-datagrid-tool" onClick={exportCsv}>
            <GridIcon name="download" />
            CSV
          </button>
        </div>
      </div>

      {!data.length ? (
        <div className="meg-datagrid-empty" role="status">
          <strong>Nenhum dado disponível</strong>
          <span>Esta grade ainda não recebeu registros.</span>
        </div>
      ) : !filteredRows.length ? (
        <>
          <div className="meg-datagrid__viewport meg-datagrid-filtered-empty" aria-label="Área rolável da grade sem resultados">
            <table
              className="meg-datagrid-table"
              aria-label={ariaLabel}
              style={{ minWidth: `${tableMinWidth}px` }}
            >
              <colgroup>
                {selectable && <col style={{ width: 52 }} />}
                {visibleColumns.map((column) => (
                  <col key={column.key} style={{ width: widths[column.key] ?? column.width ?? 160 }} />
                ))}
              </colgroup>
              {renderTableHead()}
              <tbody />
            </table>
            <div className="meg-datagrid-empty" role="status">
              <strong>Nenhum resultado com os filtros atuais</strong>
              <span>Use “Limpar tudo” na toolbar para restaurar os resultados.</span>
            </div>
          </div>
          {renderPaginationFooter()}
        </>
      ) : (
        <>
          <div
            ref={viewportRef}
            className="meg-datagrid__viewport"
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            tabIndex={0}
            aria-label="Área rolável da grade"
          >
            <table
              className="meg-datagrid-table"
              aria-label={ariaLabel}
              style={{ minWidth: `${tableMinWidth}px` }}
            >
              <colgroup>
                {selectable && <col style={{ width: 52 }} />}
                {visibleColumns.map((column) => (
                  <col key={column.key} style={{ width: widths[column.key] ?? column.width ?? 160 }} />
                ))}
              </colgroup>
              {renderTableHead()}
              <tbody>
                {virtual.before > 0 && (
                  <tr aria-hidden="true" className="meg-datagrid-spacer">
                    <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} style={{ height: virtual.before }} />
                  </tr>
                )}
                {renderedEntries.map((entry, index) => {
                  if (entry.kind === 'group') return <Fragment key={entry.group.id}>{renderGroupHeader(entry)}</Fragment>;
                  const key = getRowKey(entry.row);
                  const selectedRow = selected.has(key);
                  return (
                    <tr
                      key={key}
                      className={selectedRow ? 'is-selected' : ''}
                      data-grid-row
                      data-row-key={key}
                    >
                      {selectable && (
                        <td className="meg-datagrid-select-column">
                          <input
                            type="checkbox"
                            name={`meg-datagrid-table-row-${key}`}
                            aria-label={`Selecionar linha ${key}`}
                            checked={selectedRow}
                            onChange={(event) => toggleRow(key, event.target.checked)}
                          />
                        </td>
                      )}
                      {visibleColumns.map((column) => (
                        <td key={column.key} data-column={column.key}>{formatCell(column, entry.row)}</td>
                      ))}
                    </tr>
                  );
                })}
                {virtual.after > 0 && (
                  <tr aria-hidden="true" className="meg-datagrid-spacer">
                    <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} style={{ height: virtual.after }} />
                  </tr>
                )}
              </tbody>
              {footerAggregates && (
                <tfoot>
                  <tr>
                    {selectable && <td />}
                    {visibleColumns.map((column) => {
                      const mode = aggregateForColumn(column, footerAggregates);
                      return (
                        <td key={column.key}>
                          {mode ? (
                            <span className="meg-datagrid-aggregate">
                              <small>{mode === 'sum' ? 'Soma' : mode === 'avg' ? 'Média' : 'Contagem'}</small>
                              <strong>{formatAggregate(column, aggregateRows(filteredRows, column, mode), mode)}</strong>
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>

            <div className="meg-datagrid-cards" aria-label={ariaLabel}>
              {virtual.before > 0 && <div aria-hidden="true" style={{ height: virtual.before }} />}
              {renderedEntries.map((entry) => {
                if (entry.kind === 'group') return <Fragment key={entry.group.id}>{renderGroupHeader(entry, true)}</Fragment>;
                const key = getRowKey(entry.row);
                const selectedRow = selected.has(key);
                return (
                  <article
                    className={`meg-datagrid-card-row ${selectedRow ? 'is-selected' : ''}`}
                    key={key}
                    data-grid-row
                    data-row-key={key}
                  >
                    {selectable && (
                      <label className="meg-datagrid-card-select">
                        <input name={`meg-datagrid-card-row-${key}`} type="checkbox" checked={selectedRow} onChange={(event) => toggleRow(key, event.target.checked)} />
                        <span>Selecionar</span>
                      </label>
                    )}
                    <dl>
                      {visibleColumns.map((column) => (
                        <div key={column.key}>
                          <dt>{column.label}</dt>
                          <dd>{formatCell(column, entry.row)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                );
              })}
              {virtual.after > 0 && <div aria-hidden="true" style={{ height: virtual.after }} />}
            </div>
          </div>

          {footerAggregates && (
            <div className="meg-datagrid-mobile-aggregates" aria-label="Agregados do conjunto filtrado">
              {aggregateCells(filteredRows).map((item) => (
                <span key={item.key}>
                  <small>{item.label}</small>
                  <strong>{item.formatted}</strong>
                </span>
              ))}
            </div>
          )}

          {renderPaginationFooter()}
        </>
      )}

      {openFilterKey && (() => {
        const column = columns.find((item) => item.key === openFilterKey);
        if (!column) return null;
        return (
          <FilterDialog
            column={column}
            filter={filters[column.key]}
            distinctOptions={getCascadeOptions(column)}
            trigger={filterButtonRefs.current.get(column.key) ?? null}
            onApply={(next) => updateFilter(column.key, next)}
            onClear={() => updateFilter(column.key, null)}
            onClose={() => setOpenFilterKey(null)}
          />
        );
      })()}

      {mobileFiltersOpen && (
        <MobileFilterSheet
          columns={orderedColumns}
          filters={filters}
          getOptions={getCascadeOptions}
          trigger={mobileFilterButtonRef.current}
          onChange={updateFilter}
          onClose={() => setMobileFiltersOpen(false)}
          onClearAll={clearAllFilters}
        />
      )}

      {tooltipState && <DataGridTooltip anchor={tooltipState.anchor} text={tooltipState.text} />}
    </section>
  );
}
