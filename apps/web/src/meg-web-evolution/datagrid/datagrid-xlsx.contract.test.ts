import assert from 'node:assert/strict';
import { createDataGridXlsxWorkbook, dataGridXlsxFilename, nativeNumber } from './datagrid-xlsx';
import type { DataGridColumn } from './types';

type Row = Record<string, unknown> & {
  id: string;
  description: string;
  amount: number | string;
  quantity: number | string;
  date: string;
};

const columns: DataGridColumn<Row>[] = [
  { key: 'description', label: 'Descrição', type: 'text' },
  { key: 'amount', label: 'Valor', type: 'currency' },
  { key: 'quantity', label: 'Quantidade', type: 'number' },
];

const rows: Row[] = [
  { id: 'r1', description: 'Salário', amount: '1.234,56', quantity: '2,5', date: '2026-10-01' },
  { id: 'r2', description: 'Mercado', amount: 3.25, quantity: 8, date: '2026-10-02' },
  { id: 'r3', description: 'Ajuste+', amount: '-2,00', quantity: '1.234.567', date: '2026-10-03' },
];

assert.equal(dataGridXlsxFilename(new Date('2026-10-12T17:00:00Z')), 'datagrid-tecnico_2026-10-12_1400.xlsx');
assert.equal(nativeNumber('3.25'), 3.25);
assert.equal(nativeNumber('1,25'), 1.25);
assert.equal(nativeNumber('1.234,56'), 1234.56);
assert.equal(nativeNumber('1.234.567'), null);
assert.equal(nativeNumber('R$ 1.234,56'), 1234.56);

class FakeWorkbook {
  addWorksheet() {
    const rowsByNumber: Record<number, { cells: Record<number, { value?: unknown; numFmt?: string }> }> = {};
    return {
      getRow(row: number) {
        if (!rowsByNumber[row]) rowsByNumber[row] = { cells: {} };
        return {
          getCell: (col: number) => {
            if (!rowsByNumber[row].cells[col]) rowsByNumber[row].cells[col] = {};
            return rowsByNumber[row].cells[col];
          },
        };
      },
      getColumn(col: number) {
        return { width: 0, col };
      },
      mergeCells() {
        return undefined;
      },
      views: [],
    };
  }
  xlsx = { writeBuffer: async () => new Uint8Array() };
}

const workbook = createDataGridXlsxWorkbook({
  Workbook: FakeWorkbook,
  rows,
  columns,
  filters: [{ label: 'Busca', summary: 'tecnico' }],
  aggregates: [
    { key: 'amount', label: 'Valor', mode: 'sum', value: 1234.56, formatted: 'R$ 1.234,56' },
    { key: 'quantity', label: 'Quantidade', mode: 'count', value: 2, formatted: '2' },
  ],
  userName: 'Ana',
  period: 'Outubro/2026',
  totalCount: rows.length,
  now: new Date('2026-10-12T17:00:00Z'),
});

assert.ok(workbook);
assert.equal(typeof workbook.xlsx.writeBuffer, 'function');
console.log('Etapa 05: contrato XLSX PASS');
