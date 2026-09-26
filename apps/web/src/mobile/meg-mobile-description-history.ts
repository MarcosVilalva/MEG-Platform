import type { FinancialEvent } from '../app/finance-client';
import { loadPhoenixAllEvents } from '../phoenix/data/load-phoenix-read-model';

export type MegMobileHistorySuggestion = {
  key: string;
  type: 'expense' | 'income';
  label: string;
  normalized: string;
  occurrences: number;
  lastDate: string;
  accountId?: string | null;
  accountName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryGroup?: string | null;
  paymentMethodId?: string | null;
  paymentMethodName?: string | null;
};

type HistoryIndex = {
  expense: MegMobileHistorySuggestion[];
  income: MegMobileHistorySuggestion[];
};

let cachedIndex: HistoryIndex | null = null;
let indexPromise: Promise<HistoryIndex> | null = null;

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ');
}

function isBenefitEvent(event: FinancialEvent) {
  const account = normalize(event.account?.type) + ' ' + normalize(event.account?.name);
  const payment = normalize(event.paymentMethod?.name) + ' ' + normalize(event.sourceDetails?.paymentMethod);
  const description = normalize(event.description);
  return /benef|alimenta|verocard/.test(account + ' ' + payment + ' ' + description);
}

function eventType(event: FinancialEvent): 'expense' | 'income' | null {
  if (event.status === 'archived' || isBenefitEvent(event)) return null;
  if (event.type === 'expense') return 'expense';
  if (event.type === 'income') return 'income';
  return null;
}

function newer(left: string, right: string) {
  return String(left || '').slice(0, 10) > String(right || '').slice(0, 10);
}

function buildIndex(events: FinancialEvent[]): HistoryIndex {
  const buckets = {
    expense: new Map<string, MegMobileHistorySuggestion>(),
    income: new Map<string, MegMobileHistorySuggestion>(),
  };

  for (const event of events) {
    const type = eventType(event);
    if (!type) continue;

    const label = String(event.description || '').trim();
    const normalized = normalize(label);
    if (!normalized) continue;

    const eventDate = String(event.date || '').slice(0, 10);
    const current = buckets[type].get(normalized);
    const next: MegMobileHistorySuggestion = {
      key: `${type}:${normalized}`,
      type,
      label,
      normalized,
      occurrences: (current?.occurrences || 0) + 1,
      lastDate: current && !newer(eventDate, current.lastDate) ? current.lastDate : eventDate,
      accountId: event.accountId,
      accountName: event.account?.name,
      categoryId: event.categoryId,
      categoryName: event.category?.name || event.sourceDetails?.group || null,
      categoryGroup: event.category?.group || event.sourceDetails?.expenseClass || null,
      paymentMethodId: event.paymentMethodId,
      paymentMethodName: event.paymentMethod?.name || event.sourceDetails?.paymentMethod || null,
    };

    if (current && !newer(eventDate, current.lastDate)) {
      current.occurrences += 1;
      buckets[type].set(normalized, current);
    } else {
      buckets[type].set(normalized, next);
    }
  }

  const defaultSort = (left: MegMobileHistorySuggestion, right: MegMobileHistorySuggestion) =>
    right.lastDate.localeCompare(left.lastDate)
    || right.occurrences - left.occurrences
    || left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' });

  return {
    expense: [...buckets.expense.values()].sort(defaultSort),
    income: [...buckets.income.values()].sort(defaultSort),
  };
}

function ensureIndex() {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  if (indexPromise) return indexPromise;

  indexPromise = loadPhoenixAllEvents()
    .then((page) => buildIndex(page.items))
    .then((index) => {
      cachedIndex = index;
      return index;
    })
    .finally(() => {
      indexPromise = null;
    });

  return indexPromise;
}

function score(item: MegMobileHistorySuggestion, query: string) {
  if (!query) return 1;
  if (item.normalized === query) return 10000;
  if (item.normalized.startsWith(query)) return 7000;
  if (item.normalized.split(' ').some((word) => word.startsWith(query))) return 4500;
  if (item.normalized.includes(query)) return 2000;
  return 0;
}

export async function loadMegMobileHistorySuggestions(
  type: 'expense' | 'income',
  rawQuery: string,
  limit = 6,
) {
  const index = await ensureIndex();
  const query = normalize(rawQuery);

  return index[type]
    .map((item) => ({ item, score: score(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || right.item.occurrences - left.item.occurrences
      || right.item.lastDate.localeCompare(left.item.lastDate)
      || left.item.label.localeCompare(right.item.label, 'pt-BR', { sensitivity: 'base' })
    )
    .slice(0, Math.max(1, limit))
    .map((entry) => entry.item);
}

export function clearMegMobileHistorySuggestionCache() {
  cachedIndex = null;
  indexPromise = null;
}
