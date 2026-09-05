import { createHash } from 'node:crypto';
import { classifyTransactionsPreview } from './transaction-classification-core';

type LegacyTransaction = Record<string, unknown>;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value as LegacyTransaction).sort().map((key) => [key, canonical((value as LegacyTransaction)[key])]));
}

function validDate(value: unknown): string | null {
  const candidate = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const date = new Date(`${candidate}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== candidate ? null : candidate;
}

function normalizedStatus(item: LegacyTransaction): string {
  const status = text(item.status || item.situation).toUpperCase();
  if (['PAID', 'PAGO', 'RECEBIDO', 'CONFIRMED', 'CONFIRMADO'].includes(status)) return 'paid';
  if (['RECONCILED', 'CONCILIADO'].includes(status)) return 'reconciled';
  if (['ARCHIVED', 'ARQUIVADO'].includes(status)) return 'archived';
  return 'planned';
}

export function legacyTransactionAmount(item: LegacyTransaction): number {
  const type = text(item.type).toLowerCase() === 'income' ? 'income' : 'expense';
  const raw = type === 'income'
    ? item.incomeAmount ?? item.amount
    : item.expenseAmount ?? item.amount;
  return Math.abs(number(raw));
}

export function legacyTransactionEnteredAmount(item: LegacyTransaction): number {
  const type = text(item.type).toLowerCase() === 'income' ? 'income' : 'expense';
  const raw = type === 'income'
    ? item.incomeAmount ?? item.amount
    : item.expenseAmount ?? item.amount;
  return number(raw);
}

export function legacyTransactionToFinancialEvent(item: LegacyTransaction, context: {
  workspaceId: string;
  userId: string;
  revision: number;
}) {
  const legacyTransactionId = text(item.id);
  const isoDate = validDate(item.date);
  const description = text(item.description);
  if (!legacyTransactionId || !isoDate || !description) return null;
  const type = text(item.type).toLowerCase() === 'income' ? 'income' : 'expense';
  const enteredAmount = legacyTransactionEnteredAmount(item);
  const amount = Math.abs(enteredAmount);
  return {
    workspaceId: context.workspaceId,
    userId: context.userId,
    legacyTransactionId,
    description,
    type,
    status: normalizedStatus(item),
    date: new Date(`${isoDate}T12:00:00.000Z`),
    competence: isoDate.slice(0, 7),
    amount,
    signedAmount: type === 'income' ? enteredAmount : -enteredAmount,
    notes: text(item.notes) || null,
    sourceRevision: context.revision,
    sourcePayload: canonical(item),
    amountBehavior: text(item.amountBehavior) || null,
    necessity: text(item.necessity) || null,
    frequency: text(item.frequency) || null,
    classificationConfidence: item.classificationConfidence == null ? null : number(item.classificationConfidence),
    classificationSource: text(item.classificationSource) || null,
  };
}

type FingerprintEvent = {
  legacyTransactionId: string | null;
  date: Date;
  description: string;
  type: string;
  status: string;
  amount: unknown;
  signedAmount: unknown;
  notes: string | null;
  sourcePayload: unknown;
  amountBehavior: string | null;
  necessity: string | null;
  frequency: string | null;
  classificationConfidence: number | null;
  classificationSource: string | null;
};

export function normalizationFingerprint(items: FingerprintEvent[]): string {
  const projection = items.map((item) => ({
    id: String(item.legacyTransactionId || ''),
    date: item.date.toISOString().slice(0, 10),
    description: item.description,
    type: item.type,
    status: item.status,
    amount: Number(item.amount),
    signedAmount: Number(item.signedAmount),
    notes: item.notes || null,
    sourcePayload: canonical(item.sourcePayload),
    amountBehavior: item.amountBehavior || null,
    necessity: item.necessity || null,
    frequency: item.frequency || null,
    classificationConfidence: item.classificationConfidence == null ? null : Number(item.classificationConfidence),
    classificationSource: item.classificationSource || null,
  })).sort((left, right) => left.id.localeCompare(right.id));
  return createHash('sha256').update(JSON.stringify(projection)).digest('hex');
}

export function financialEventToLegacyTransaction(item: FingerprintEvent): LegacyTransaction {
  const payload = item.sourcePayload && typeof item.sourcePayload === 'object' && !Array.isArray(item.sourcePayload)
    ? canonical(item.sourcePayload) as LegacyTransaction
    : {};
  // sourcePayload is the lossless representation of the original transaction.
  // The normalized columns are its queryable, reconciled projection and must not
  // silently add, rename or standardize fields when the source is switched.
  return payload;
}

export function buildNormalizationPreview(state: unknown, context: {
  workspaceId: string;
  userId: string;
  revision: number;
}) {
  const transactions = Array.isArray((state as { transactions?: unknown[] })?.transactions)
    ? (state as { transactions: LegacyTransaction[] }).transactions
    : [];
  const suggestions = new Map(classifyTransactionsPreview(transactions).map((item) => [item.transactionId, item]));
  const events = transactions
    .map((item) => {
      const event = legacyTransactionToFinancialEvent(item, context);
      const suggestion = suggestions.get(text(item.id));
      if (!event || !suggestion) return event;
      return {
        ...event,
        amountBehavior: event.amountBehavior || suggestion.amountBehavior,
        necessity: event.necessity || suggestion.necessity,
        frequency: event.frequency || suggestion.frequency,
        classificationConfidence: event.classificationConfidence ?? ({ HIGH: 0.95, MEDIUM: 0.7, LOW: 0.4, REVIEWED: 1 }[suggestion.confidence] || 0.4),
        classificationSource: event.classificationSource || 'SYSTEM_PREVIEW',
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const invalid = transactions.length - events.length;
  const income = events.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.signedAmount, 0);
  const expense = events.filter((item) => item.type === 'expense').reduce((sum, item) => sum - item.signedAmount, 0);
  const fingerprint = normalizationFingerprint(events);
  const classification = [...suggestions.values()].reduce((summary, item) => {
    summary[item.confidence] = (summary[item.confidence] || 0) + 1;
    if (item.necessity === 'REVIEW') summary.review += 1;
    return summary;
  }, { HIGH: 0, MEDIUM: 0, LOW: 0, REVIEWED: 0, review: 0 } as Record<string, number>);
  return { events, suggestions: [...suggestions.values()], summary: { sourceCount: transactions.length, validCount: events.length, invalidCount: invalid, income, expense, net: income - expense, fingerprint, classification } };
}
