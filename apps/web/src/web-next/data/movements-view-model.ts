import type { PhoenixReadModel } from '../../phoenix/contracts';

export type WebNextMovementKind = 'income' | 'expense' | 'transfer';

export type WebNextMovementRow = {
  id: string;
  dueDate: string;
  purchaseDate: string;
  weekday: string;
  kind: WebNextMovementKind;
  typeLabel: string;
  description: string;
  amount: number;
  classification: string;
  group: string;
  paymentMethod: string;
  status: string;
  statusKey: string;
  modality: string;
  accountId: string;
  accountName: string;
  notes: string;
  benefit: boolean;
};

export type WebNextMovementsModel = {
  periodLabel: string;
  rows: WebNextMovementRow[];
  accounts: Array<{ id: string; name: string }>;
  totals: {
    income: number;
    expense: number;
    result: number;
    benefit: number;
  };
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function visualKind(type: PhoenixReadModel['events']['items'][number]['type']): WebNextMovementKind {
  if (type === 'income' || type === 'redemption') return 'income';
  if (type === 'transfer') return 'transfer';
  return 'expense';
}

function displayEffect(event: PhoenixReadModel['events']['items'][number]) {
  const kind = visualKind(event.type);
  const rawSigned = Number(event.signedAmount);
  const amount = Math.abs(Number(event.amount || 0));
  const signed = Number.isFinite(rawSigned) && rawSigned !== 0
    ? rawSigned
    : kind === 'income' ? amount : kind === 'expense' ? -amount : 0;
  if (kind === 'income') return Math.abs(signed);
  if (kind === 'expense') return -Math.abs(signed);
  return 0;
}

function eventStatus(event: PhoenixReadModel['events']['items'][number]) {
  if (visualKind(event.type) === 'income') return 'Recebida';
  return ({
    draft: 'Rascunho',
    planned: 'Pendente',
    confirmed: 'Confirmado',
    paid: 'Pago',
    reconciled: 'Conciliado',
    archived: 'Arquivado',
  } as Record<string, string>)[event.status] || event.sourceDetails?.situation || event.status;
}

function typeLabel(kind: WebNextMovementKind) {
  if (kind === 'income') return 'Receita';
  if (kind === 'transfer') return 'Transferência';
  return 'Despesa';
}

function isBenefitEvent(event: PhoenixReadModel['events']['items'][number]) {
  const reference = [
    event.account?.type,
    event.account?.name,
    event.paymentMethod?.name,
    event.sourceDetails?.paymentMethod,
    event.description,
  ].join(' ');
  const text = normalize(reference);
  return text.includes('benefit')
    || text.includes('beneficio')
    || text.includes('verocard')
    || text.includes('verocheque')
    || text.includes('alimentacao');
}

function purchaseDate(event: PhoenixReadModel['events']['items'][number]) {
  const payload = event.sourcePayload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const value = String((payload as Record<string, unknown>).purchaseDate || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  return String(event.date).slice(0, 10);
}

function weekday(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(value.slice(0, 10) + 'T12:00:00Z'))
    .replace('.', '');
}

function isRealized(status: string) {
  return ['paid', 'reconciled', 'confirmed'].includes(status);
}

export function buildWebNextMovementsModel(
  data: PhoenixReadModel,
  options?: { periodMode?: 'month' | 'range' | 'all'; periodLabel?: string },
): WebNextMovementsModel {
  const periodMode = options?.periodMode || 'month';
  const events = periodMode === 'month'
    ? data.events.items.filter((event) => event.competence === data.month)
    : data.events.items;

  const rows = events
    .filter((event) => event.status !== 'archived')
    .map((event) => {
      const kind = visualKind(event.type);
      const benefit = isBenefitEvent(event);
      return {
        id: event.id,
        dueDate: String(event.date).slice(0, 10),
        purchaseDate: purchaseDate(event),
        weekday: event.sourceDetails?.weekday || weekday(String(event.date)),
        kind,
        typeLabel: typeLabel(kind),
        description: event.description,
        amount: displayEffect(event),
        classification: event.category?.group || event.sourceDetails?.expenseClass || '—',
        group: event.category?.name || event.sourceDetails?.group || '—',
        paymentMethod: event.paymentMethod?.name || event.sourceDetails?.paymentMethod || '—',
        status: eventStatus(event),
        statusKey: event.status,
        modality: event.sourceDetails?.modality || '—',
        accountId: event.accountId || '',
        accountName: event.account?.name || 'Conta não informada',
        notes: event.notes || event.sourceDetails?.observations || '',
        benefit,
      };
    })
    .sort((left, right) =>
      right.dueDate.localeCompare(left.dueDate)
      || right.purchaseDate.localeCompare(left.purchaseDate)
      || left.description.localeCompare(right.description, 'pt-BR', { sensitivity: 'base' }));

  const totals = rows.reduce((sum, row) => {
    if (!isRealized(row.statusKey)) return sum;
    if (row.benefit) {
      sum.benefit += row.amount;
      return sum;
    }
    if (row.kind === 'income') sum.income += Math.max(0, row.amount);
    if (row.kind === 'expense') sum.expense += Math.abs(row.amount);
    return sum;
  }, { income: 0, expense: 0, benefit: 0 });

  return {
    periodLabel: options?.periodLabel || data.month,
    rows,
    accounts: data.accounts
      .filter((account) => account.isActive)
      .map((account) => ({ id: account.id, name: account.name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' })),
    totals: {
      income: totals.income,
      expense: totals.expense,
      result: totals.income - totals.expense,
      benefit: totals.benefit,
    },
  };
}
