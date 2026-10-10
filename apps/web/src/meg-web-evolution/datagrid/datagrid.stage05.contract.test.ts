import assert from 'node:assert/strict';
import { searchVisibleRows } from './core';
import type { DataGridColumn } from './types';

type RecordRow = Record<string, unknown> & { id: string; description: string; hidden: string; category: string; value: number };
const columns: DataGridColumn<RecordRow>[] = [
  { key: 'description', label: 'Descrição', type: 'text' },
  { key: 'category', label: 'Categoria', type: 'enum', enumValues: { mercado: { label: 'Alimentação' } } },
  { key: 'value', label: 'Valor', type: 'currency' },
];
const rows: RecordRow[] = [
  { id: 'a', description: 'Café técnico', hidden: 'secreto', category: 'mercado', value: 1.5 },
  { id: 'b', description: 'Açúcar orgânico', hidden: 'secreto', category: 'outro', value: 2 },
  { id: 'c', description: 'Plástico', hidden: 'negado', category: 'outro', value: 3 },
];
assert.equal(searchVisibleRows(rows, columns, '').length, 3, 'Busca vazia preserva conjunto');
assert.deepEqual(searchVisibleRows(rows, columns, 'cafe tecnico').map(x => x.id), ['a'], 'Ignore acentos e caixa');
assert.deepEqual(searchVisibleRows(rows, columns, 'alimentacao').map(x => x.id), ['a'], 'Enum usa rótulo visível');
assert.deepEqual(searchVisibleRows(rows, columns, 'secreto').map(x => x.id), [], 'Coluna oculta não participa');
assert.deepEqual(searchVisibleRows(rows, columns.slice(0, 1), 'acucar').map(x => x.id), ['b'], 'Conjunto de colunas ativas');
assert.equal(rows.length, 3, 'Não muta fonte');
console.log('Etapa 05: contratos puros de busca PASS');
