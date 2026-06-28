import type { FinancialEvent } from '@shared';

export type LedgerAccountType =
  | 'asset'
  | 'liability'
  | 'income'
  | 'expense'
  | 'equity'
  | 'control';

export interface LedgerAccount {
  id: string;
  name: string;
  type: LedgerAccountType;
}

export interface LedgerEntry {
  id: string;
  eventId: string;
  date: string;
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface LedgerPosting {
  event: FinancialEvent;
  entries: LedgerEntry[];
}

export function createLedgerAccountId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function eventToLedgerPosting(event: FinancialEvent): LedgerPosting {
  const cashAccount = createLedgerAccountId(event.account || 'Carteira');
  const categoryAccount = createLedgerAccountId(
    event.group || event.category || (event.signedAmount >= 0 ? 'Receitas' : 'Despesas')
  );

  const amount = Math.abs(event.signedAmount);

  if (event.signedAmount >= 0) {
    return {
      event,
      entries: [
        {
          id: `${event.id}-cash-debit`,
          eventId: event.id,
          date: event.date,
          accountId: cashAccount,
          debit: amount,
          credit: 0,
          memo: event.description
        },
        {
          id: `${event.id}-income-credit`,
          eventId: event.id,
          date: event.date,
          accountId: categoryAccount,
          debit: 0,
          credit: amount,
          memo: event.description
        }
      ]
    };
  }

  return {
    event,
    entries: [
      {
        id: `${event.id}-expense-debit`,
        eventId: event.id,
        date: event.date,
        accountId: categoryAccount,
        debit: amount,
        credit: 0,
        memo: event.description
      },
      {
        id: `${event.id}-cash-credit`,
        eventId: event.id,
        date: event.date,
        accountId: cashAccount,
        debit: 0,
        credit: amount,
        memo: event.description
      }
    ]
  };
}

export function eventsToLedger(events: FinancialEvent[]): LedgerEntry[] {
  return events.flatMap((event) => eventToLedgerPosting(event).entries);
}

export function validateLedgerBalance(entries: LedgerEntry[]): boolean {
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

  return Math.round((totalDebit - totalCredit) * 100) === 0;
}

export function ledgerBalanceByAccount(entries: LedgerEntry[]) {
  const map = new Map<string, number>();

  entries.forEach((entry) => {
    map.set(entry.accountId, (map.get(entry.accountId) || 0) + entry.debit - entry.credit);
  });

  return [...map.entries()]
    .map(([accountId, balance]) => ({ accountId, balance }))
    .sort((a, b) => a.accountId.localeCompare(b.accountId));
}
