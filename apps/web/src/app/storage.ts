import type { LegacyTransaction } from '@core/finance/events';

const STORAGE_KEY = 'meg-financial-os-alpha-state';

export function loadTransactions(): LegacyTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: LegacyTransaction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions }));
}
