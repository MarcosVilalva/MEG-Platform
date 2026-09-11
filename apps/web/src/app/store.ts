import { create } from 'zustand';
import type { LegacyTransaction } from '@core/finance/events';
import { loadTransactions, saveTransactions } from './storage';
import { monthInSaoPaulo } from './calendar';

interface AppState {
  transactions: LegacyTransaction[];
  selectedMonth: string;
  periodMode: 'month' | 'range' | 'all';
  periodStart: string;
  periodEnd: string;
  theme: 'light' | 'dark';
  setSelectedMonth: (month: string) => void;
  setGlobalPeriod: (period: { mode: 'month' | 'range' | 'all'; month?: string; start?: string; end?: string }) => void;
  addTransaction: (transaction: LegacyTransaction) => void;
  updateTransaction: (id: string, patch: Partial<LegacyTransaction>) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (id: string) => void;
  markAsPaid: (id: string) => void;
  markAsReconciled: (id: string) => void;
  toggleTheme: () => void;
  replaceTransactions: (transactions: LegacyTransaction[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  transactions: loadTransactions(),
  selectedMonth: monthInSaoPaulo(),
  periodMode: 'month',
  periodStart: `${monthInSaoPaulo()}-01`,
  periodEnd: `${monthInSaoPaulo()}-31`,
  theme: (localStorage.getItem('meg-theme') as 'light' | 'dark') || 'light',

  setSelectedMonth: (month) => set({ selectedMonth: month, periodMode: 'month', periodStart: `${month}-01`, periodEnd: `${month}-31` }),
  setGlobalPeriod: ({ mode, month, start, end }) => set((state) => ({
    periodMode: mode,
    selectedMonth: month || state.selectedMonth,
    periodStart: start || (month ? `${month}-01` : state.periodStart),
    periodEnd: end || (month ? `${month}-31` : state.periodEnd)
  })),

  addTransaction: (transaction) => {
    const transactions = [transaction, ...get().transactions];
    saveTransactions(transactions);
    set({ transactions });
  },

  updateTransaction: (id, patch) => {
    const transactions = get().transactions.map((transaction) =>
      transaction.id === id ? { ...transaction, ...patch } : transaction
    );
    saveTransactions(transactions);
    set({ transactions });
  },

  deleteTransaction: (id) => {
    const transactions = get().transactions.filter((transaction) => transaction.id !== id);
    saveTransactions(transactions);
    set({ transactions });
  },

  duplicateTransaction: (id) => {
    const original = get().transactions.find((transaction) => transaction.id === id);
    if (!original) return;

    const copy: LegacyTransaction = {
      ...original,
      id: crypto.randomUUID(),
      description: `${original.description || 'Lançamento'} (cópia)`,
      status: original.type === 'income' ? 'paid' : 'planned',
      situation: original.type === 'income' ? 'PAGO' : 'PENDENTE'
    };

    const transactions = [copy, ...get().transactions];
    saveTransactions(transactions);
    set({ transactions });
  },

  markAsPaid: (id) => {
    const transactions = get().transactions.map((transaction) =>
      transaction.id === id
        ? { ...transaction, status: 'paid', situation: 'PAGO' }
        : transaction
    );
    saveTransactions(transactions);
    set({ transactions });
  },

  markAsReconciled: (id) => {
    const transactions = get().transactions.map((transaction) =>
      transaction.id === id
        ? { ...transaction, status: 'reconciled', situation: 'CONCILIADO' }
        : transaction
    );
    saveTransactions(transactions);
    set({ transactions });
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('meg-theme', next);
    set({ theme: next });
  },

  replaceTransactions: (transactions) => {
    saveTransactions(transactions);
    set({ transactions });
  }
}));
