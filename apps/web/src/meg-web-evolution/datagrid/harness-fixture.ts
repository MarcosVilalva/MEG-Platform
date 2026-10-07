import type { DataGridColumn } from './types';

export type HarnessRow = Record<string, unknown> & {
  id: string;
  date: string;
  description: string;
  segment: 'alpha' | 'beta' | 'gamma' | 'delta';
  quantity: number;
  amount: number;
  active: boolean;
};

const segmentLabels: Record<HarnessRow['segment'], string> = {
  alpha: 'Grupo Alpha',
  beta: 'Grupo Beta',
  gamma: 'Grupo Gamma',
  delta: 'Grupo Delta',
};

const segmentColors: Record<HarnessRow['segment'], string> = {
  alpha: '#14e3c8',
  beta: '#3b82f6',
  gamma: '#8b5cf6',
  delta: '#f5b942',
};

function isoDayOffset(offset: number, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fixture exclusivamente técnica do harness da Etapa 04.
 * Não representa lançamentos oficiais, saldo, fatura, status financeiro ou regra de negócio.
 */
export function createDataGridHarnessRows(total = 640, now = new Date()): HarnessRow[] {
  const segments = Object.keys(segmentLabels) as HarnessRow['segment'][];
  return Array.from({ length: total }, (_, index) => {
    const sequence = index + 1;
    const segment = segments[index % segments.length];
    return {
      id: `technical-row-${String(sequence).padStart(4, '0')}`,
      date: isoDayOffset((index % 120) - 60, now),
      description: `Registro técnico ${String(sequence).padStart(3, '0')}`,
      segment,
      quantity: (index % 37) + 1,
      amount: Number((((index % 97) + 1) * 1.13 + (index % 7) * 0.01).toFixed(2)),
      active: index % 3 !== 0,
    };
  });
}

export const dataGridHarnessColumns: DataGridColumn<HarnessRow>[] = [
  {
    key: 'date',
    label: 'Data',
    type: 'date',
    width: 132,
    minWidth: 118,
    sortable: true,
    filterable: true,
  },
  {
    key: 'description',
    label: 'Descrição técnica',
    type: 'text',
    width: 250,
    minWidth: 180,
    sortable: true,
    filterable: true,
  },
  {
    key: 'segment',
    label: 'Segmento',
    type: 'enum',
    width: 160,
    minWidth: 132,
    sortable: true,
    filterable: true,
    enumValues: Object.fromEntries(
      (Object.keys(segmentLabels) as HarnessRow['segment'][]).map((key) => [
        key,
        { label: segmentLabels[key], color: segmentColors[key] },
      ]),
    ),
  },
  {
    key: 'quantity',
    label: 'Quantidade',
    type: 'number',
    width: 138,
    minWidth: 120,
    sortable: true,
    filterable: true,
    aggregate: 'avg',
  },
  {
    key: 'amount',
    label: 'Valor técnico',
    type: 'currency',
    width: 154,
    minWidth: 136,
    sortable: true,
    filterable: true,
    aggregate: 'sum',
  },
  {
    key: 'active',
    label: 'Ativo',
    type: 'boolean',
    width: 112,
    minWidth: 104,
    sortable: true,
    filterable: true,
  },
];
