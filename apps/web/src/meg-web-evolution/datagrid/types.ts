import type { ReactNode } from 'react';

export type DataGridColumnType = 'text' | 'number' | 'currency' | 'date' | 'enum' | 'boolean';
export type DataGridAggregate = 'sum' | 'count' | 'avg';
export type SortDirection = 'asc' | 'desc';
export type DateShortcut = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'last30Days' | 'thisYear';

export type EnumVisual = {
  label?: string;
  color?: string;
  icon?: ReactNode;
};

export type DataGridColumn<T> = {
  key: keyof T & string;
  label: string;
  type: DataGridColumnType;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
  aggregate?: DataGridAggregate;
  enumValues?: Record<string, EnumVisual>;
};

export type TextOperator =
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'equals'
  | 'empty';

export type NumberOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'empty';
export type DateOperator = 'between' | 'equals' | 'before' | 'after';

export type DataGridFilter = {
  type: DataGridColumnType;
  operator?: TextOperator | NumberOperator | DateOperator;
  value?: string | number | null;
  value2?: string | number | null;
  selected?: string[];
  booleanValue?: boolean | null;
  shortcut?: DateShortcut | null;
};

export type DataGridFilterState = Record<string, DataGridFilter>;

export type DataGridSort = {
  key: string;
  direction: SortDirection;
};

export type DataGridPersistenceState = {
  filters: DataGridFilterState;
  sort: DataGridSort[];
  columnOrder: string[];
  hiddenColumns: string[];
  widths: Record<string, number>;
  pageSize: number;
};

export type DataGridFilterChange = {
  filters: DataGridFilterState;
  activeKeys: string[];
  filteredCount: number;
};

export type DataGridProps<T extends Record<string, unknown>> = {
  data: T[];
  columns: DataGridColumn<T>[];
  pageSize?: number;
  groupBy?: keyof T & string;
  selectable?: boolean;
  footerAggregates?: boolean | Record<string, DataGridAggregate>;
  onFilterChange?: (state: DataGridFilterChange) => void;
  persistenceKey?: string;
  rowKey?: keyof T & string | ((row: T) => string);
  loading?: boolean;
  ariaLabel?: string;
  /** Nome fornecido pela sessão atual do consumidor; não derivar de mock. */
  exportUserName?: string;
  /** Período canônico de referência, quando disponível. */
  exportPeriod?: string;
  pdfMaxRows?: number;
};

export type DistinctOption = {
  key: string;
  value: unknown;
  label: string;
  count: number;
};

export type DataGridGroup<T> = {
  id: string;
  value: unknown;
  label: string;
  rows: T[];
};

export type DataGridDisplayEntry<T> =
  | { kind: 'group'; group: DataGridGroup<T> }
  | { kind: 'row'; row: T; groupId?: string };

export type VirtualWindow = {
  start: number;
  end: number;
  before: number;
  after: number;
};
