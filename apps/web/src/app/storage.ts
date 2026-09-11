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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions }));
    return true;
  } catch {
    // A base oficial é a nuvem. Limite, bloqueio ou corrupção do cache local
    // nunca pode impedir o usuário de entrar ou concluir uma operação.
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* armazenamento indisponível */ }
    return false;
  }
}
