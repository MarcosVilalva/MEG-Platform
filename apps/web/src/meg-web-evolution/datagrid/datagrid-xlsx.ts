import { parsePtBrNumber } from './core';
import { exportFilterLabels, exportPeriodLabel, timeInSaoPaulo } from './datagrid-export-header';
import type { DataGridAggregate, DataGridColumn } from './types';

export const NUMBER_FORMAT = '#,##0.00';

export type DataGridXlsxAggregate = {
  key: string;
  label: string;
  mode: DataGridAggregate;
  value: number;
  formatted: string;
};

type XlsxCell = {
  value?: unknown;
  numFmt?: string;
  fill?: Record<string, unknown>;
  font?: Record<string, unknown>;
  border?: Record<string, unknown>;
  alignment?: Record<string, unknown>;
};

type XlsxRow = {
  getCell: (col: number) => XlsxCell;
  values?: unknown;
};

type XlsxWorksheet = {
  getCell?: (row: number, col: number) => XlsxCell;
  getRow: (row: number) => XlsxRow;
  getColumn?: (col: number) => { width?: number };
  views?: Array<Record<string, unknown>>;
  properties?: Record<string, unknown>;
  mergeCells?: (range: string) => void;
  autoFilter?: unknown;
};

type XlsxWorkbook = {
  addWorksheet: (name: string, options?: Record<string, unknown>) => XlsxWorksheet;
  xlsx: {
    writeBuffer: () => Promise<Uint8Array | Buffer>;
  };
};

export type DataGridXlsxInput<T extends Record<string, unknown>> = {
  Workbook: new () => XlsxWorkbook;
  rows: T[];
  columns: DataGridColumn<T>[];
  filters: Array<{ label: string; summary: string }>;
  aggregates: DataGridXlsxAggregate[];
  userName?: string;
  period?: string;
  totalCount: number;
  maxRows?: number;
  now?: Date;
};

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value);
}

export function nativeNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsed = parsePtBrNumber(value);
  if (parsed != null) return parsed;

  const raw = String(value).trim().replace(/\s+/g, '').replace(/R\$/gi, '');
  if (!raw) return null;
  if (!/^-?\d+(?:[.,]\d+)?$/.test(raw)) return null;

  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function columnLabel(index: number): string {
  let label = '';
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

export function dataGridXlsxFilename(now = new Date()): string {
  const stamp = timeInSaoPaulo(now);
  return `datagrid-tecnico_${stamp.file}.xlsx`;
}

function styleTotalCell(cell: { fill?: Record<string, unknown>; font?: Record<string, unknown>; border?: Record<string, unknown>; alignment?: Record<string, unknown> }, columnIndex: number, totalColumns: number) {
  const isLabel = columnIndex === 1;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  cell.border = { top: { style: 'thin', color: { argb: 'FF0F766E' } }, left: { style: 'thin', color: { argb: 'FF0F766E' } }, bottom: { style: 'thin', color: { argb: 'FF0F766E' } }, right: { style: 'thin', color: { argb: 'FF0F766E' } } };
  cell.alignment = isLabel ? { horizontal: 'left', vertical: 'middle' } : { horizontal: 'right', vertical: 'middle' };
  if (columnIndex === totalColumns) {
    cell.border = { ...cell.border, right: { style: 'thin', color: { argb: 'FF115E59' } } } as Record<string, unknown>;
  }
}

function formatCellValue<T extends Record<string, unknown>>(column: DataGridColumn<T>, value: unknown): { value: string | number; numFmt?: string } {
  if (value == null || value === '') return { value: '' };

  if (column.type === 'boolean') {
    return { value: value ? 'Sim' : 'Não' };
  }

  if (column.type === 'currency' || column.type === 'number') {
    const numeric = nativeNumber(value);
    if (numeric != null) {
      return { value: numeric, numFmt: column.type === 'currency' ? NUMBER_FORMAT : NUMBER_FORMAT };
    }
    return { value: asText(value) };
  }

  if (column.type === 'date') {
    const label = asText(value);
    const match = /^\d{4}-\d{2}-\d{2}/.exec(label);
    if (match) {
      return { value: label };
    }
    return { value: label };
  }

  if (column.type === 'enum') {
    const label = String(value);
    return { value: label };
  }

  const text = asText(value);
  return { value: /^([=+\-@])/.test(text.trimStart()) ? text : text };
}

export function createDataGridXlsxWorkbook<T extends Record<string, unknown>>({
  Workbook,
  rows,
  columns,
  filters,
  aggregates,
  userName,
  period,
  totalCount,
  now = new Date(),
}: DataGridXlsxInput<T>) {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('DataGrid técnico', {
    views: [{ state: 'frozen', ySplit: 9, xSplit: 0, topLeftCell: 'A10', activeCell: 'A10', selection: { activeCell: 'A10' } }],
    properties: { tabColor: { argb: 'FF0F766E' } },
  });

  const stamp = timeInSaoPaulo(now);
  const safeUser = userName?.trim() || 'Usuário não identificado';
  const safePeriod = exportPeriodLabel(period);
  const filterSummary = exportFilterLabels(filters);
  const lastColumnIndex = Math.max(columns.length, 1);
  const metadataStart = 1;
  const headerRow = 9;
  const firstDataRow = 10;

  const fillCell = (rowNumber: number, colNumber: number, value: string | number, style?: Record<string, unknown>) => {
    const cell = sheet.getRow(rowNumber).getCell(colNumber);
    cell.value = value;
    if (style) {
      Object.assign(cell, style);
    }
    return cell;
  };

  const title = fillCell(metadataStart, 1, 'Relatório DataGrid técnico', {
    font: { size: 18, bold: true, color: { argb: 'FF083B42' } },
    alignment: { horizontal: 'center' },
  });
  sheet.mergeCells?.(`A${metadataStart}:${columnLabel(lastColumnIndex)}${metadataStart}`);
  title.value = 'Relatório DataGrid técnico';
  title.font = { size: 18, bold: true, color: { argb: 'FF083B42' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  fillCell(2, 1, 'Período');
  fillCell(2, 2, safePeriod);
  fillCell(3, 1, 'Usuário');
  fillCell(3, 2, safeUser);
  fillCell(4, 1, 'Gerado em');
  fillCell(4, 2, `${stamp.label} (São Paulo)`);
  fillCell(5, 1, 'Registros');
  fillCell(5, 2, `${rows.length.toLocaleString('pt-BR')} de ${totalCount.toLocaleString('pt-BR')}`);
  fillCell(6, 1, 'Filtros');
  fillCell(6, 2, filterSummary.join(' | '));

  const header = sheet.getRow(headerRow);
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B5E5E' } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF0B5E5E' } }, left: { style: 'thin', color: { argb: 'FF0B5E5E' } }, bottom: { style: 'thin', color: { argb: 'FF0B5E5E' } }, right: { style: 'thin', color: { argb: 'FF0B5E5E' } } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  rows.forEach((row, index) => {
    const target = sheet.getRow(firstDataRow + index);
    columns.forEach((column, columnIndex) => {
      const cell = target.getCell(columnIndex + 1);
      const item = formatCellValue(column, row[column.key]);
      cell.value = item.value;
      if (item.numFmt) cell.numFmt = item.numFmt;
      if (typeof item.value === 'string' && /^([=+\-@])/.test(String(item.value).trimStart())) {
        cell.numFmt = '@';
      }
      cell.border = { top: { style: 'thin', color: { argb: 'FFDDE7E8' } }, left: { style: 'thin', color: { argb: 'FFDDE7E8' } }, bottom: { style: 'thin', color: { argb: 'FFDDE7E8' } }, right: { style: 'thin', color: { argb: 'FFDDE7E8' } } };
      cell.alignment = { vertical: 'middle' };
      if (column.type === 'currency' || column.type === 'number') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  });

  const byMode = new Map<DataGridAggregate, Map<string, number>>();
  for (const mode of ['sum', 'avg', 'count'] as const) {
    const values = new Map<string, number>();
    for (const aggregate of aggregates) {
      if (aggregate.mode === mode) values.set(aggregate.key, aggregate.value);
    }
    byMode.set(mode, values);
  }

  const lastDataRow = firstDataRow + rows.length - 1;
  const subtotalCode = (mode: DataGridAggregate) => (mode === 'sum' ? 109 : mode === 'avg' ? 101 : 103);

  const totalModes = ([
    { label: 'Soma', mode: 'sum' },
    { label: 'Média', mode: 'avg' },
    { label: 'Contagem', mode: 'count' },
  ] as Array<{ label: string; mode: DataGridAggregate }>).filter(({ mode }) => (byMode.get(mode)?.size ?? 0) > 0);

  totalModes.forEach(({ label, mode }, rowOffset) => {
    const rowNumber = firstDataRow + rows.length + rowOffset + 1;
    const totalRow = sheet.getRow(rowNumber);
    for (let columnIndex = 1; columnIndex <= lastColumnIndex; columnIndex++) {
      const cell = totalRow.getCell(columnIndex);
      const columnKey = columns[columnIndex - 1]?.key as string | undefined;
      const aggregateValue = columnKey ? byMode.get(mode)?.get(columnKey) : undefined;
      if (columnIndex === 1) {
        cell.value = label;
      } else if (aggregateValue == null) {
        cell.value = '';
      } else {
        const result = mode === 'count' ? Math.round(aggregateValue) : aggregateValue;
        const col = columnLabel(columnIndex);
        cell.value = rows.length > 0
          ? { formula: `SUBTOTAL(${subtotalCode(mode)},${col}${firstDataRow}:${col}${lastDataRow})`, result }
          : result;
        cell.numFmt = mode === 'count' ? '0' : NUMBER_FORMAT;
      }
      styleTotalCell(cell, columnIndex, lastColumnIndex);
    }
  });

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: lastDataRow, column: lastColumnIndex },
    };
  }

  for (let columnIndex = 1; columnIndex <= lastColumnIndex; columnIndex++) {
    const column = sheet.getColumn?.(columnIndex);
    if (column) column.width = 18;
  }

  sheet.views = [{ state: 'frozen', ySplit: 9, xSplit: 0, topLeftCell: 'A10', activeCell: 'A10', selection: { activeCell: 'A10' } }];
  return workbook;
}

export async function saveDataGridXlsx<T extends Record<string, unknown>>(input: DataGridXlsxInput<T>): Promise<void> {
  const { Workbook, rows, columns, filters, aggregates, userName, period, totalCount, maxRows = 5000, now = new Date() } = input;

  if (rows.length > maxRows) {
    throw new Error(`Limite de ${maxRows.toLocaleString('pt-BR')} linhas excedido. Refine os filtros.`);
  }

  const workbook = createDataGridXlsxWorkbook({
    Workbook,
    rows,
    columns,
    filters,
    aggregates,
    userName,
    period,
    totalCount,
    now,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const normalizedBuffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBufferLike);
  const bytes = new Uint8Array(normalizedBuffer);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = dataGridXlsxFilename(now);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
