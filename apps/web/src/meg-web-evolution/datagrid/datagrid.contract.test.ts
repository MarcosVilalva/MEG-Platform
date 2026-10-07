import assert from 'node:assert/strict';
import {
  aggregateRows,
  applyFilters,
  cycleSort,
  dateRangeForShortcut,
  flattenGroups,
  getDistinctOptions,
  getVirtualWindow,
  groupRows,
  isFilterActive,
  paginateRows,
  persistenceStorageKey,
  pruneSelection,
  reorderKeys,
  resizeWidth,
  sanitizePersistenceState,
  sortRows,
  toCsv,
  updateFilteredSelection,
} from './core';
import { createDataGridHarnessRows, dataGridHarnessColumns, type HarnessRow } from './harness-fixture';
import type { DataGridColumn, DataGridFilterState } from './types';

type TestRow = Record<string, unknown> & {
  id: string;
  description: string;
  quantity: number | null;
  amount: number | null;
  date: string;
  segment: string;
  active: boolean;
};

const rows: TestRow[] = [
  { id: 'r1', description: 'Café São Paulo', quantity: 10, amount: 10.01, date: '2026-10-01', segment: 'alpha', active: true },
  { id: 'r2', description: 'Mercado Central', quantity: 20, amount: 20.2, date: '2026-10-07', segment: 'beta', active: false },
  { id: 'r3', description: 'Café Especial', quantity: 30, amount: 30.03, date: '2026-10-15', segment: 'gamma', active: true },
  { id: 'r4', description: '', quantity: null, amount: null, date: '2026-11-01', segment: 'alpha', active: false },
];

const columns: DataGridColumn<TestRow>[] = [
  { key: 'description', label: 'Descrição', type: 'text', sortable: true, filterable: true, aggregate: 'count' },
  { key: 'quantity', label: 'Quantidade', type: 'number', sortable: true, filterable: true, aggregate: 'avg' },
  { key: 'amount', label: 'Valor', type: 'currency', sortable: true, filterable: true, aggregate: 'sum' },
  { key: 'date', label: 'Data', type: 'date', sortable: true, filterable: true },
  { key: 'segment', label: 'Segmento', type: 'enum', sortable: true, filterable: true },
  { key: 'active', label: 'Ativo', type: 'boolean', sortable: true, filterable: true },
];

const ids = (items: TestRow[]) => items.map((item) => item.id);

// TEXT: operadores e vazio.
assert.deepEqual(ids(applyFilters(rows, columns, {
  description: { type: 'text', operator: 'contains', value: 'cafe' },
})), ['r1', 'r3']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  description: { type: 'text', operator: 'notContains', value: 'café' },
})), ['r2', 'r4']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  description: { type: 'text', operator: 'startsWith', value: 'merc' },
})), ['r2']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  description: { type: 'text', operator: 'endsWith', value: 'especial' },
})), ['r3']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  description: { type: 'text', operator: 'equals', value: 'café são paulo' },
})), ['r1']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  description: { type: 'text', operator: 'empty' },
})), ['r4']);

// NUMBER/CURRENCY: comparação, entre, vazio e entrada pt-BR.
assert.deepEqual(ids(applyFilters(rows, columns, {
  quantity: { type: 'number', operator: 'gte', value: '20' },
})), ['r2', 'r3']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  quantity: { type: 'number', operator: 'between', value: '11', value2: '29' },
})), ['r2']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  quantity: { type: 'number', operator: 'empty' },
})), ['r4']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  amount: { type: 'currency', operator: 'eq', value: 'R$ 10,01' },
})), ['r1']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  amount: { type: 'currency', operator: 'gt', value: '20,20' },
})), ['r3']);

// DATE: igual, antes, depois e intervalo.
assert.deepEqual(ids(applyFilters(rows, columns, {
  date: { type: 'date', operator: 'equals', value: '2026-10-07' },
})), ['r2']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  date: { type: 'date', operator: 'before', value: '2026-10-07' },
})), ['r1']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  date: { type: 'date', operator: 'after', value: '2026-10-15' },
})), ['r4']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  date: { type: 'date', operator: 'between', value: '2026-10-02', value2: '2026-10-20' },
})), ['r2', 'r3']);

// ENUM + BOOLEAN e lógica OR na coluna.
assert.deepEqual(ids(applyFilters(rows, columns, {
  segment: { type: 'enum', selected: ['alpha', 'gamma'] },
})), ['r1', 'r3', 'r4']);
assert.deepEqual(ids(applyFilters(rows, columns, {
  active: { type: 'boolean', booleanValue: true },
})), ['r1', 'r3']);

// AND entre colunas.
const andFilters: DataGridFilterState = {
  description: { type: 'text', operator: 'contains', value: 'café' },
  segment: { type: 'enum', selected: ['gamma'] },
  active: { type: 'boolean', booleanValue: true },
};
assert.deepEqual(ids(applyFilters(rows, columns, andFilters)), ['r3']);

// Cascata: distintos da coluna atual refletem os demais filtros, não o próprio.
const cascadeFilters: DataGridFilterState = {
  active: { type: 'boolean', booleanValue: true },
  segment: { type: 'enum', selected: ['alpha'] },
};
const cascadeRows = applyFilters(rows, columns, cascadeFilters, 'segment');
assert.deepEqual(ids(cascadeRows), ['r1', 'r3']);
assert.deepEqual(
  getDistinctOptions(cascadeRows, columns.find((column) => column.key === 'segment')!).map((item) => [item.key, item.count]),
  [['alpha', 1], ['gamma', 1]],
);

// Limpar filtro e limpar tudo equivalem à ausência de estado ativo.
assert.equal(isFilterActive({ type: 'text', operator: 'contains', value: '' }), false);
assert.equal(isFilterActive({ type: 'enum', selected: [] }), false);
assert.deepEqual(ids(applyFilters(rows, columns, {})), ['r1', 'r2', 'r3', 'r4']);

// Ordenação simples, ciclo asc/desc/nenhuma e multi-sort por Shift (motor).
let sortState = cycleSort([], 'segment', false);
assert.deepEqual(sortState, [{ key: 'segment', direction: 'asc' }]);
sortState = cycleSort(sortState, 'segment', false);
assert.deepEqual(sortState, [{ key: 'segment', direction: 'desc' }]);
sortState = cycleSort(sortState, 'segment', false);
assert.deepEqual(sortState, []);
const multiSort = cycleSort(cycleSort([], 'segment', false), 'quantity', true);
assert.deepEqual(multiSort, [
  { key: 'segment', direction: 'asc' },
  { key: 'quantity', direction: 'asc' },
]);
assert.deepEqual(ids(sortRows(rows, columns, multiSort)), ['r1', 'r4', 'r2', 'r3']);

// Resize, reorder e visibilidade/persistência.
assert.equal(resizeWidth(120, -100, 96), 96);
assert.equal(resizeWidth(120, 35, 96), 155);
assert.deepEqual(reorderKeys(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);

const persisted = sanitizePersistenceState({
  filters: { segment: { type: 'enum', selected: ['alpha'] }, ghost: { type: 'text', value: 'x' } },
  sort: [{ key: 'amount', direction: 'desc' }, { key: 'ghost', direction: 'asc' }],
  columnOrder: ['amount', 'description'],
  hiddenColumns: ['quantity', 'ghost'],
  widths: { amount: 188, ghost: 999 },
  pageSize: 25,
}, columns.map((column) => column.key), 12);
assert.deepEqual(persisted.columnOrder, ['amount', 'description', 'quantity', 'date', 'segment', 'active']);
assert.deepEqual(persisted.hiddenColumns, ['quantity']);
assert.deepEqual(persisted.widths, { amount: 188 });
assert.deepEqual(persisted.sort, [{ key: 'amount', direction: 'desc' }]);
assert.equal('ghost' in persisted.filters, false);
assert.equal(persisted.pageSize, 25);
assert.notEqual(persistenceStorageKey('grid-a'), persistenceStorageKey('grid-b'));

// Seleção estável e "selecionar todos" do conjunto filtrado.
const selected = updateFilteredSelection(new Set(['r4']), ['r1', 'r3'], true);
assert.deepEqual([...selected].sort(), ['r1', 'r3', 'r4']);
const deselected = updateFilteredSelection(selected, ['r1', 'r3'], false);
assert.deepEqual([...deselected], ['r4']);
assert.deepEqual([...pruneSelection(new Set(['r1', 'gone']), rows.map((row) => row.id))], ['r1']);

// Paginação.
assert.deepEqual(paginateRows(rows, 0, 2), { rows: rows.slice(0, 2), start: 1, end: 2, pages: 2 });
assert.deepEqual(paginateRows(rows, 1, 2), { rows: rows.slice(2, 4), start: 3, end: 4, pages: 2 });

// Agrupamento e recolhimento.
const groups = groupRows(rows, 'segment');
assert.equal(groups.find((group) => group.label === 'alpha')?.rows.length, 2);
const alphaId = groups.find((group) => group.label === 'alpha')!.id;
const flattened = flattenGroups(groups, new Set([alphaId]));
assert.equal(flattened.some((entry) => entry.kind === 'row' && entry.groupId === alphaId), false);

// Agregados genéricos.
assert.equal(aggregateRows(rows, columns.find((column) => column.key === 'amount')!, 'sum'), 60.24);
assert.equal(aggregateRows(rows, columns.find((column) => column.key === 'description')!, 'count'), 4);
assert.equal(aggregateRows(rows, columns.find((column) => column.key === 'quantity')!, 'avg'), 20);

// CSV filtrado/ordenado: BOM UTF-8, acentuação e centavos preservados.
const csv = toCsv([rows[0]], columns.filter((column) => ['description', 'amount'].includes(column.key)));
assert.equal(csv.charCodeAt(0), 0xFEFF);
assert.match(csv, /Descrição;Valor/);
assert.match(csv, /Café São Paulo;10,01/);

// Virtualização só acima de 500 entradas.
assert.deepEqual(getVirtualWindow(500, 0, 480), { start: 0, end: 500, before: 0, after: 0 });
const virtual = getVirtualWindow(640, 1000, 480, 48, 8);
assert.ok(virtual.end - virtual.start < 640);
assert.ok(virtual.before > 0);
assert.ok(virtual.after > 0);

// Atalhos de data usam referência de runtime, sem datas fixas no componente.
const fixedNow = new Date(2026, 9, 7, 12, 0, 0);
assert.deepEqual(dateRangeForShortcut('today', fixedNow), { from: '2026-10-07', to: '2026-10-07' });
assert.deepEqual(dateRangeForShortcut('thisMonth', fixedNow), { from: '2026-10-01', to: '2026-10-31' });
assert.deepEqual(dateRangeForShortcut('lastMonth', fixedNow), { from: '2026-09-01', to: '2026-09-30' });
assert.deepEqual(dateRangeForShortcut('last30Days', fixedNow), { from: '2026-09-08', to: '2026-10-07' });
assert.deepEqual(dateRangeForShortcut('thisYear', fixedNow), { from: '2026-01-01', to: '2026-12-31' });

// Fixture/harness cobre todos os tipos e ultrapassa o limiar de virtualização.
const harnessRows = createDataGridHarnessRows(640, fixedNow);
assert.equal(harnessRows.length, 640);
assert.equal(new Set(harnessRows.map((row) => row.id)).size, 640);
assert.deepEqual(new Set(dataGridHarnessColumns.map((column) => column.type)), new Set(['date', 'text', 'enum', 'number', 'currency', 'boolean']));

console.log('MEG Web Evolution DataGrid pure contract: OK');
