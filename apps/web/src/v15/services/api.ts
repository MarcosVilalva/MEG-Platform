import type { LegacyTransaction } from '@core/finance/events';
import {
  authenticatedRequest,
  login as existingLogin,
  logout as existingLogout,
  readSession,
  type AuthSession,
  type AuthUser
} from '../../app/auth-client';
import { readCloudState } from '../../app/app-state-client';

export type V15Card = {
  id: string;
  name: string;
  issuer?: string | null;
  brand?: string | null;
  lastFour?: string | null;
  creditLimit: number | string;
  closingDay: number;
  dueDay: number;
  usedLimit?: number;
  availableLimit?: number;
  statementAmount?: number;
  payableStatementAmount?: number;
};

export type V15Payable = {
  id: string;
  description: string;
  totalAmount: number | string;
  openAmount: number | string;
  dueDate: string;
  status: string;
};

export type V15CatalogItem = {
  id: string;
  name: string;
  isActive?: boolean;
  [key: string]: unknown;
};

export type V15CoreModel = {
  transactions: LegacyTransaction[];
  revision: number;
  updatedAt?: string | null;
};

export type V15SupplementalModel = {
  cards: V15Card[];
  payables: V15Payable[];
  accounts: V15CatalogItem[];
  categories: V15CatalogItem[];
  paymentMethods: V15CatalogItem[];
  errors: string[];
};

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

async function optionalList<T>(path: string, signal?: AbortSignal) {
  try {
    return { items: list<T>(await authenticatedRequest<unknown>(path, { signal })), error: null };
  } catch (error) {
    return { items: [] as T[], error: error instanceof Error ? `${path}: ${error.message}` : `${path}: UNKNOWN_ERROR` };
  }
}

export function currentSession() {
  return readSession();
}

export async function signIn(email: string, password: string) {
  return existingLogin(email, password);
}

export async function signOut(session: AuthSession) {
  return existingLogout(session);
}

export async function loadV15Core(signal?: AbortSignal): Promise<V15CoreModel> {
  const cloud = await readCloudState(signal);
  return {
    transactions: Array.isArray(cloud.state?.transactions) ? cloud.state.transactions : [],
    revision: cloud.revision,
    updatedAt: cloud.updatedAt
  };
}

export async function loadV15Supplemental(month: string, signal?: AbortSignal): Promise<V15SupplementalModel> {
  const encoded = encodeURIComponent(month);
  const [cards, payables, accounts, categories, paymentMethods] = await Promise.all([
    optionalList<V15Card>(`/cards?month=${encoded}`, signal),
    optionalList<V15Payable>(`/payables?month=${encoded}`, signal),
    optionalList<V15CatalogItem>('/finance/accounts', signal),
    optionalList<V15CatalogItem>('/finance/categories', signal),
    optionalList<V15CatalogItem>('/finance/payment-methods', signal)
  ]);

  return {
    cards: cards.items,
    payables: payables.items,
    accounts: accounts.items,
    categories: categories.items,
    paymentMethods: paymentMethods.items,
    errors: [cards.error, payables.error, accounts.error, categories.error, paymentMethods.error].filter((value): value is string => Boolean(value))
  };
}

export type { AuthSession, AuthUser };
