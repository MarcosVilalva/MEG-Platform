import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../../phoenix/contracts';

export type WebNextMovementKind = 'income' | 'expense' | 'transfer';
export type WebNextMovementStatus = 'pending' | 'paid' | 'reconciled' | 'other';

export type WebNextMovementItem = {
  id: string;
  dueDate: string;
  purchaseDate: string;
  weekday: string;
  kind: WebNextMovementKind;
  kindLabel: string;
  description: string;
  classification: string;
  group: string;
  amount: number;
  signedAmount: number;
  paymentMethod: string;
  status: WebNextMovementStatus;
  statusLabel: string;
  modality: string;
  accountId: string;
  accountName: string;
  isBenefit: boolean;
  realized: boolean;
};

export type WebNextMovementsModel = {
  month: string;
  total: number;
  summary: {
    income: number;
    expense: number;
    result: number;
    pendingCount: number;
  };
  accounts: Array<{ id: string; name: string; type: string }>;
  items: WebNextMovementItem[];
};

function normalize(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ');
}

function movementKind(type: FinancialEvent['type']): WebNextMovementKind {
  if (type === 'income' || type === 'redemption') return 'income';
  if (type === 'transfer') return 'transfer';
  return 'expense';
}

function numericAmount(event: FinancialEvent) {
  const raw = Number(event.signedAmount);
  const amount = Math.abs(Number(event.amount || 0));
  const kind = movementKind(event.type);
  if (kind === 'transfer') return { amount, signed: 0 };
  const signed = Number.isFinite(raw) && raw !== 0
    ? raw
    : kind === 'income' ? amount : -amount;
  return {
    amount,
    signed: kind === 'income' ? Math.abs(signed) : -Math.abs(signed),
  };
}

function eventStatus(event: FinancialEvent): Pick<WebNextMovementItem, 'status' | 'statusLabel'> {
  if (event.status === 'draft' || event.status === 'planned') return { status: 'pending', statusLabel: 'Pendente' };
  if (event.status === 'reconciled') return { status: 'reconciled', statusLabel: 'Conciliado' };
  if (event.status === 'paid' || event.status === 'confirmed') {
    return { status: 'paid', statusLabel: movementKind(event.type) === 'income' ? 'Recebida' : 'Pago' };
  }
  return { status: 'other', statusLabel: event.status === 'archived' ? 'Arquivado' : event.sourceDetails?.situation || 'Outro' };
}

function purchaseDate(event: FinancialEvent) {
  const value = event.sourcePayload && typeof event.sourcePayload === 'object'
    ? String(event.sourcePayload.purchaseDate || '').slice(0, 10)
    : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : event.date.slice(0, 10);
}

function isBenefitEvent(event: FinancialEvent) {
  const account = normalize(`${event.account?.name || ''} ${event.account?.type || ''}`);
  const payment = normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`);
  const description = normalize(event.description);
  return account.includes('benef') || account.includes('verocard') || account.includes('alimentacao')
    || payment.includes('verocard')
    || description.includes('verocard');
}

function weekday(event: FinancialEvent) {
  if (event.sourceDetails?.weekday) return event.sourceDetails.weekday;
  const value = event.date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00Z`))
    .replace('.', '');
}

function toItem(event: FinancialEvent): WebNextMovementItem {
  const kind = movementKind(event.type);
  const amounts = numericAmount(event);
  const status = eventStatus(event);
  return {
    id: event.id,
    dueDate: event.date.slice(0, 10),
    purchaseDate: purchaseDate(event),
    weekday: weekday(event),
    kind,
    kindLabel: kind === 'income' ? 'Receita' : kind === 'transfer' ? 'Transferência' : 'Despesa',
    description: event.description,
    classification: event.category?.group || event.sourceDetails?.expenseClass || 'Sem classificação',
    group: event.category?.name || event.sourceDetails?.group || 'Sem grupo',
    amount: amounts.amount,
    signedAmount: amounts.signed,
    paymentMethod: event.paymentMethod?.name || event.sourceDetails?.paymentMethod || 'Não informado',
    status: status.status,
    statusLabel: status.statusLabel,
    modality: event.sourceDetails?.modality || 'Não informada',
    accountId: event.accountId || event.account?.id || '',
    accountName: event.account?.name || 'Conta não informada',
    isBenefit: isBenefitEvent(event),
    realized: event.status === 'paid' || event.status === 'confirmed' || event.status === 'reconciled',
  };
}

export function buildWebNextMovementsModel(data: PhoenixReadModel): WebNextMovementsModel {
  const items = data.events.items
    .map(toItem)
    .sort((left, right) =>
      right.dueDate.localeCompare(left.dueDate)
      || right.purchaseDate.localeCompare(left.purchaseDate)
      || right.id.localeCompare(left.id));

  return {
    month: data.month,
    total: data.events.total,
    summary: {
      income: Number(data.summary.realizedIncome || 0),
      expense: Number(data.summary.realizedExpense || 0),
      result: Number(data.summary.realizedResult || 0),
      pendingCount: data.events.items.filter((event) => event.status === 'draft' || event.status === 'planned').length,
    },
    accounts: data.accounts
      .filter((account) => account.isActive)
      .map((account) => ({ id: account.id, name: account.name, type: account.type }))
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    items,
  };
}
