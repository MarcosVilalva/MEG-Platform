import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';

export type PeriodMode = 'month' | 'range' | 'all';

export type PeriodSelection = {
  mode: PeriodMode;
  month: string;
  start: string;
  end: string;
};

const day = (value: string) => String(value || '').slice(0, 10);

function isBenefit(item: { description: string; category?: string; group?: string; account?: string; paymentMethod?: string }) {
  return /benef|aliment|vero/i.test(`${item.description} ${item.category || ''} ${item.group || ''} ${item.account || ''} ${item.paymentMethod || ''}`);
}

function isRealized(item: { type: string; status: string }) {
  return item.type === 'income' || ['paid', 'confirmed', 'reconciled'].includes(item.status);
}

export function deriveDashboard(transactions: LegacyTransaction[], period: PeriodSelection) {
  const events = normalizeEvents(transactions);
  const monetary = events.filter((item) => !isBenefit(item));
  const before = monetary.filter((item) => day(item.date) < `${period.month}-01` && isRealized(item));
  const inPeriod = (value: string) => period.mode === 'all'
    || (period.mode === 'range' ? value >= period.start && value <= period.end : value.startsWith(period.month));

  const current = monetary.filter((item) => inPeriod(day(item.date)));
  const benefitEvents = events.filter((item) => inPeriod(day(item.date)) && isBenefit(item));
  const opening = before.reduce((sum, item) => sum + item.signedAmount, 0);
  const income = current.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const paidExpense = current.filter((item) => item.type === 'expense' && isRealized(item)).reduce((sum, item) => sum + item.amount, 0);
  const pendingEvents = current.filter((item) => item.type === 'expense' && item.status === 'planned');
  const pending = pendingEvents.reduce((sum, item) => sum + item.amount, 0);
  const benefit = benefitEvents.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);
  const realized = opening + income - paidExpense;
  const projected = realized - pending;
  const recent = events.filter((item) => inPeriod(day(item.date))).sort((a, b) => day(b.date).localeCompare(day(a.date))).slice(0, 4);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = pendingEvents.filter((item) => day(item.date) < today).reduce((sum, item) => sum + item.amount, 0);
  const next = pendingEvents.filter((item) => day(item.date) >= today).reduce((sum, item) => sum + item.amount, 0);

  return {
    opening,
    income,
    paidExpense,
    pending,
    pendingCount: pendingEvents.length,
    benefit,
    realized,
    projected,
    recent,
    overdue,
    next
  };
}
