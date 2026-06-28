import type { FinancialEvent, FinancialEventStatus } from '@shared';

export interface LegacyTransaction {
  id: string;
  type?: string;
  launchType?: string;
  date: string;
  description?: string;
  amount?: number;
  incomeAmount?: number;
  expenseAmount?: number;
  status?: string;
  situation?: string;
  account?: string;
  paymentMethod?: string;
  group?: string;
  category?: string;
  tags?: string[];
  notes?: string;
}

export function normalizeStatus(transaction: LegacyTransaction): FinancialEventStatus {
  const status = String(transaction.status || transaction.situation || '').toLowerCase();

  if (status.includes('concili')) return 'reconciled';
  if (status.includes('paid') || status.includes('pago')) return 'paid';
  if (status.includes('confirm')) return 'confirmed';
  if (status.includes('arquiv')) return 'archived';

  return 'planned';
}

export function normalizeFinancialEvent(transaction: LegacyTransaction): FinancialEvent {
  const isIncome =
    transaction.type === 'income' ||
    String(transaction.launchType || '').toUpperCase() === 'RECEITA';

  const isExpense =
    transaction.type === 'expense' ||
    String(transaction.launchType || '').toUpperCase() === 'DESPESA';

  const amount = Math.abs(
    Number(transaction.amount ?? transaction.incomeAmount ?? transaction.expenseAmount ?? 0) || 0
  );

  return {
    id: transaction.id,
    type: isIncome ? 'income' : isExpense ? 'expense' : 'adjustment',
    status: normalizeStatus(transaction),
    date: transaction.date,
    competence: String(transaction.date || '').slice(0, 7),
    description: transaction.description || 'Evento financeiro',
    amount,
    signedAmount: isIncome ? amount : -amount,
    account: transaction.account,
    paymentMethod: transaction.paymentMethod,
    group: transaction.group,
    category: transaction.category,
    tags: transaction.tags || [],
    notes: transaction.notes || ''
  };
}

export function normalizeEvents(transactions: LegacyTransaction[]): FinancialEvent[] {
  return transactions.map(normalizeFinancialEvent);
}
