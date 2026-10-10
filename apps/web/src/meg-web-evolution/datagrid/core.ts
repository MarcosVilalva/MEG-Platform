import type {
  DataGridAggregate,
  DataGridColumn,
  DataGridDisplayEntry,
  DataGridFilter,
  DataGridFilterState,
  DataGridGroup,
  DataGridPersistenceState,
  DataGridSort,
  DateShortcut,
  DistinctOption,
  VirtualWindow,
} from './types';

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export function distinctKey(value: unknown): string {
  if (value == null) return '__EMPTY__';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferred = record.value ?? record.id ?? record.label ?? record.name;
    if (preferred != null) return String(preferred);
  }
  return String(value);
}

export function displayValue(value: unknown): string {
  if (value == null || value === '') return '(vazio)';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferred = record.label ?? record.name ?? record.value ?? record.id;
    if (preferred != null) return String(preferred);
  }
  return String(value);
}

export function normalizeText(value: unknown): string {
  return displayValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function parsePtBrNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (!raw) return null;

  let normalized = raw;
  if (raw.includes(',') && raw.includes('.')) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (raw.includes(',')) normalized = raw.replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toDateKey(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const text = String(value);
  const direct = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : toDateKey(date);
}

function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return result;
}

export function dateRangeForShortcut(shortcut: DateShortcut, now = new Date()): { from: string; to: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from = new Date(today);
  let to = new Date(today);

  switch (shortcut) {
    case 'today':
      break;
    case 'thisWeek':
      from = startOfWeek(today);
      to = endOfWeek(today);
      break;
    case 'thisMonth':
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'lastMonth':
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'last30Days':
      from.setDate(today.getDate() - 29);
      break;
    case 'thisYear':
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(today.getFullYear(), 11, 31);
      break;
  }

  return { from: toDateKey(from)!, to: toDateKey(to)! };
}

export function isFilterActive(filter: DataGridFilter | undefined): boolean {
  if (!filter) return false;
  if (filter.type === 'boolean') return filter.booleanValue !== null && filter.booleanValue !== undefined;
  if ((filter.selected?.length ?? 0) > 0) return true;
  if (filter.operator === 'empty') return true;
  return filter.value !== null && filter.value !== undefined && String(filter.value) !== '';
}

function matchesSelected(value: unknown, selected?: string[]): boolean {
  if (!selected?.length) return true;
  return selected.includes(distinctKey(value));
}

function matchesText(value: unknown, filter: DataGridFilter): boolean {
  if (filter.operator === 'empty') return value == null || String(value).trim() === '';
  const haystack = normalizeText(value);
  const needle = filter.value == null || String(filter.value) === '' ? '' : normalizeText(filter.value);
  let operatorMatch = true;

  if (needle || filter.operator) {
    switch (filter.operator ?? 'contains') {
      case 'contains': operatorMatch = haystack.includes(needle); break;
      case 'notContains': operatorMatch = !haystack.includes(needle); break;
      case 'startsWith': operatorMatch = haystack.startsWith(needle); break;
      case 'endsWith': operatorMatch = haystack.endsWith(needle); break;
      case 'equals': operatorMatch = haystack === needle; break;
      default: operatorMatch = true;
    }
  }

  return operatorMatch && matchesSelected(value, filter.selected);
}

function matchesNumber(value: unknown, filter: DataGridFilter): boolean {
  const actual = parsePtBrNumber(value);
  if (filter.operator === 'empty') return actual == null;
  const first = parsePtBrNumber(filter.value);
  const second = parsePtBrNumber(filter.value2);
  let operatorMatch = true;

  if (first != null) {
    switch (filter.operator ?? 'eq') {
      case 'eq': operatorMatch = actual === first; break;
      case 'neq': operatorMatch = actual !== first; break;
      case 'gt': operatorMatch = actual != null && actual > first; break;
      case 'gte': operatorMatch = actual != null && actual >= first; break;
      case 'lt': operatorMatch = actual != null && actual < first; break;
      case 'lte': operatorMatch = actual != null && actual <= first; break;
      case 'between':
        operatorMatch = actual != null && second != null && actual >= Math.min(first, second) && actual <= Math.max(first, second);
        break;
      default: operatorMatch = true;
    }
  }

  return operatorMatch && matchesSelected(value, filter.selected);
}

function matchesDate(value: unknown, filter: DataGridFilter): boolean {
  const actual = toDateKey(value);
  if (!actual) return false;
  const first = toDateKey(filter.value);
  const second = toDateKey(filter.value2);
  let operatorMatch = true;

  if (first) {
    switch (filter.operator ?? 'equals') {
      case 'equals': operatorMatch = actual === first; break;
      case 'before': operatorMatch = actual < first; break;
      case 'after': operatorMatch = actual > first; break;
      case 'between':
        operatorMatch = Boolean(second) && actual >= (first < second! ? first : second!) && actual <= (first < second! ? second! : first);
        break;
      default: operatorMatch = true;
    }
  }

  return operatorMatch && matchesSelected(actual, filter.selected);
}

export function rowMatchesFilter<T extends Record<string, unknown>>(
  row: T,
  column: DataGridColumn<T>,
  filter: DataGridFilter,
): boolean {
  const value = row[column.key];
  switch (column.type) {
    case 'text': return matchesText(value, filter);
    case 'number':
    case 'currency': return matchesNumber(value, filter);
    case 'date': return matchesDate(value, filter);
    case 'enum': return matchesSelected(value, filter.selected);
    case 'boolean':
      return filter.booleanValue == null ? true : Boolean(value) === filter.booleanValue;
    default: return true;
  }
}

export function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  columns: DataGridColumn<T>[],
  filters: DataGridFilterState,
  excludeKey?: string,
): T[] {
  const columnMap = new Map(columns.map((column) => [column.key, column]));
  return rows.filter((row) => Object.entries(filters).every(([key, filter]) => {
    if (key === excludeKey || !isFilterActive(filter)) return true;
    const column = columnMap.get(key);
    return column ? rowMatchesFilter(row, column, filter) : true;
  }));
}

export function getDistinctOptions<T extends Record<string, unknown>>(
  rows: T[],
  column: DataGridColumn<T>,
): DistinctOption[] {
  const options = new Map<string, DistinctOption>();
  for (const row of rows) {
    const raw = row[column.key];
    const value = column.type === 'date' ? toDateKey(raw) : raw;
    const key = distinctKey(value);
    const current = options.get(key);
    if (current) current.count += 1;
    else options.set(key, { key, value, label: displayValue(value), count: 1 });
  }

  const distinct = [...options.values()];
  return distinct.sort((a, b) => {
    if (column.type === 'number' || column.type === 'currency') {
      const left = parsePtBrNumber(a.value);
      const right = parsePtBrNumber(b.value);
      if (left == null && right == null) return collator.compare(a.label, b.label);
      if (left == null) return -1;
      if (right == null) return 1;
      return left - right || collator.compare(a.label, b.label);
    }
    if (column.type === 'date') {
      const left = toDateKey(a.value) ?? '';
      const right = toDateKey(b.value) ?? '';
      return left.localeCompare(right);
    }
    return collator.compare(a.label, b.label);
  });
}

function comparableValue(value: unknown, type: DataGridColumn<TypedRow>['type']): string | number | boolean {
  if (type === 'number' || type === 'currency') return parsePtBrNumber(value) ?? Number.NEGATIVE_INFINITY;
  if (type === 'date') return toDateKey(value) ?? '';
  if (type === 'boolean') return Boolean(value);
  return normalizeText(value);
}

type TypedRow = Record<string, unknown>;

export function sortRows<T extends TypedRow>(
  rows: T[],
  columns: DataGridColumn<T>[],
  sort: DataGridSort[],
): T[] {
  if (!sort.length) return [...rows];
  const columnMap = new Map(columns.map((column) => [column.key, column]));

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      for (const rule of sort) {
        const column = columnMap.get(rule.key);
        if (!column) continue;
        const a = comparableValue(left.row[column.key], column.type);
        const b = comparableValue(right.row[column.key], column.type);
        let comparison = 0;
        if (typeof a === 'number' && typeof b === 'number') comparison = a - b;
        else if (typeof a === 'boolean' && typeof b === 'boolean') comparison = Number(a) - Number(b);
        else comparison = collator.compare(String(a), String(b));
        if (comparison !== 0) return rule.direction === 'asc' ? comparison : -comparison;
      }
      return left.index - right.index;
    })
    .map(({ row }) => row);
}

export function cycleSort(sort: DataGridSort[], key: string, multi = false): DataGridSort[] {
  const existing = sort.find((item) => item.key === key);
  let nextForKey: DataGridSort | null = { key, direction: 'asc' };

  if (existing?.direction === 'asc') nextForKey = { key, direction: 'desc' };
  else if (existing?.direction === 'desc') nextForKey = null;

  const base = multi ? sort.filter((item) => item.key !== key) : [];
  return nextForKey ? [...base, nextForKey] : base;
}

export function aggregateRows<T extends TypedRow>(
  rows: T[],
  column: DataGridColumn<T>,
  aggregate: DataGridAggregate,
): number {
  if (aggregate === 'count') return rows.length;
  const values = rows
    .map((row) => parsePtBrNumber(row[column.key]))
    .filter((value): value is number => value != null);
  if (!values.length) return 0;

  const sum = values.reduce((total, value) => total + value, 0);
  return aggregate === 'avg' ? sum / values.length : sum;
}

export function groupRows<T extends TypedRow>(
  rows: T[],
  groupBy: keyof T & string,
): DataGridGroup<T>[] {
  const groups = new Map<string, DataGridGroup<T>>();
  for (const row of rows) {
    const value = row[groupBy];
    const key = distinctKey(value);
    const id = `${groupBy}:${key}`;
    const group = groups.get(id) ?? { id, value, label: displayValue(value), rows: [] };
    group.rows.push(row);
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function flattenGroups<T extends TypedRow>(
  groups: DataGridGroup<T>[],
  collapsed: Set<string>,
): DataGridDisplayEntry<T>[] {
  const entries: DataGridDisplayEntry<T>[] = [];
  for (const group of groups) {
    entries.push({ kind: 'group', group });
    if (collapsed.has(group.id)) continue;
    for (const row of group.rows) entries.push({ kind: 'row', row, groupId: group.id });
  }
  return entries;
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): { rows: T[]; start: number; end: number; pages: number } {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const pages = Math.max(1, Math.ceil(rows.length / safeSize));
  const safePage = Math.min(Math.max(0, page), pages - 1);
  const startIndex = safePage * safeSize;
  const slice = rows.slice(startIndex, startIndex + safeSize);
  return {
    rows: slice,
    start: rows.length ? startIndex + 1 : 0,
    end: startIndex + slice.length,
    pages,
  };
}

export function getVirtualWindow(
  total: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight = 48,
  overscan = 8,
): VirtualWindow {
  if (total <= 500) return { start: 0, end: total, before: 0, after: 0 };
  const visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const end = Math.min(total, visibleStart + visibleCount);
  return {
    start: visibleStart,
    end,
    before: visibleStart * rowHeight,
    after: Math.max(0, (total - end) * rowHeight),
  };
}

export function reorderKeys(order: string[], sourceKey: string, targetKey: string): string[] {
  if (sourceKey === targetKey || !order.includes(sourceKey) || !order.includes(targetKey)) return [...order];
  const next = order.filter((key) => key !== sourceKey);
  const targetIndex = next.indexOf(targetKey);
  next.splice(targetIndex, 0, sourceKey);
  return next;
}

export function resizeWidth(current: number, delta: number, minWidth = 96): number {
  return Math.max(minWidth, Math.round(current + delta));
}

export function updateFilteredSelection(
  selected: Set<string>,
  filteredKeys: string[],
  checked: boolean,
): Set<string> {
  const next = new Set(selected);
  for (const key of filteredKeys) checked ? next.add(key) : next.delete(key);
  return next;
}

export function pruneSelection(selected: Set<string>, availableKeys: string[]): Set<string> {
  const available = new Set(availableKeys);
  return new Set([...selected].filter((key) => available.has(key)));
}

function csvEscape(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvValue(value: unknown, columnType: DataGridColumn<TypedRow>['type']): string {
  if (value == null) return '';
  if (columnType === 'currency') {
    const numeric = parsePtBrNumber(value);
    return numeric == null ? String(value) : numeric.toFixed(2).replace('.', ',');
  }
  if (columnType === 'boolean') return Boolean(value) ? 'Sim' : 'Não';
  if (columnType === 'date') return toDateKey(value) ?? String(value);
  return displayValue(value);
}

export function toCsv<T extends TypedRow>(rows: T[], columns: DataGridColumn<T>[]): string {
  const header = columns.map((column) => csvEscape(column.label)).join(';');
  const body = rows.map((row) =>
    columns.map((column) => csvEscape(csvValue(row[column.key], column.type))).join(';'),
  );
  return '\uFEFF' + [header, ...body].join('\r\n');
}

export function persistenceStorageKey(key: string): string {
  return `meg-web-evolution:datagrid:${key}`;
}

export function sanitizePersistenceState(
  raw: unknown,
  columnKeys: string[],
  fallbackPageSize: number,
): DataGridPersistenceState {
  const source = raw && typeof raw === 'object' ? raw as Partial<DataGridPersistenceState> : {};
  const allowed = new Set(columnKeys);
  const order = Array.isArray(source.columnOrder)
    ? source.columnOrder.filter((key) => allowed.has(key))
    : [];
  for (const key of columnKeys) if (!order.includes(key)) order.push(key);

  const hidden = Array.isArray(source.hiddenColumns)
    ? source.hiddenColumns.filter((key) => allowed.has(key))
    : [];

  const widths = Object.fromEntries(
    Object.entries(source.widths ?? {}).filter(([key, value]) => allowed.has(key) && typeof value === 'number' && Number.isFinite(value)),
  );

  const filters = Object.fromEntries(
    Object.entries(source.filters ?? {}).filter(([key, value]) => allowed.has(key) && value && typeof value === 'object'),
  ) as DataGridFilterState;

  const sort = Array.isArray(source.sort)
    ? source.sort.filter((item) => item && allowed.has(item.key) && (item.direction === 'asc' || item.direction === 'desc'))
    : [];

  const pageSize = typeof source.pageSize === 'number' && source.pageSize > 0
    ? Math.floor(source.pageSize)
    : fallbackPageSize;

  return { filters, sort, columnOrder: order, hiddenColumns: hidden, widths, pageSize };
}
