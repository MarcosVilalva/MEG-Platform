import { readSession } from './auth-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export type Account = {
  id: string;
  name: string;
  type: string;
  institution?: string | null;
  openingBalance: string | number;
  isActive: boolean;
};

export type Category = {
  id: string;
  name: string;
  group?: string | null;
  type?: 'income' | 'expense' | null;
  isActive: boolean;
};

export type PaymentMethod = {
  id: string;
  name: string;
  type?: string | null;
  isActive: boolean;
};

export type FinancialEventStatus = 'draft' | 'planned' | 'confirmed' | 'paid' | 'reconciled' | 'archived';

export type FinancialEvent = {
  id: string;
  description: string;
  type: 'income' | 'expense';
  status: FinancialEventStatus;
  date: string;
  competence: string;
  amount: string | number;
  signedAmount: string | number;
  notes?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  paymentMethodId?: string | null;
  account?: Account | null;
  category?: Category | null;
  paymentMethod?: PaymentMethod | null;
  sourceRowNumber?: number | null;
  sourceDetails?: {
    weekday: string;
    launchType: string;
    expenseClass: string;
    group: string;
    paymentMethod: string;
    situation: string;
    modality: string;
    observations: string;
  } | null;
};

export type FinancialEventInput = {
  description: string;
  type: 'income' | 'expense';
  status: FinancialEventStatus;
  date: string;
  amount: number;
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  notes?: string;
};

async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `HTTP_${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type BudgetOverview = {
  id: string;
  month: string;
  group: string;
  amount: number;
  used: number;
  available: number;
  percent: number;
  status: 'good' | 'warning' | 'danger';
};

export type FinancialAnalytics = {
  month: string;
  summary: FinanceSummary;
  previous: { month: string; income: number; expense: number; result: number };
  delta: { income: number; expense: number; result: number };
  dailyAverageExpense: number;
  paymentMethods: Array<{ name: string; amount: number }>;
};
export type FinancialCashflow = {
  month: string;
  openingBalance: number;
  projectedClosing: number;
  realizedClosing: number;
  totalIncome: number;
  totalExpense: number;
  days: Array<{
    date: string;
    income: number;
    expense: number;
    net: number;
    projectedBalance: number;
    realizedBalance: number;
    eventCount: number;
  }>;
};
export type FinanceSummary = {
  month: string;
  availableBalance: number;
  income: number;
  expense: number;
  projectedResult: number;
  realizedIncome: number;
  realizedExpense: number;
  realizedResult: number;
  eventCount: number;
  pendingCount: number;
  pendingAmount: number;
  nextDue?: {
    id: string;
    description: string;
    date: string;
    amount: string | number;
    type: string;
  } | null;
  topCategories: Array<{ name: string; amount: number }>;
};
export const financeClient = {
  getAnalytics: (month: string) =>
    authorizedRequest<FinancialAnalytics>(`/finance/analytics?month=${encodeURIComponent(month)}`),
  listBudgets: (month: string) =>
    authorizedRequest<BudgetOverview[]>(`/finance/budgets?month=${encodeURIComponent(month)}`),
  saveBudget: (data: { month: string; group: string; amount: number }) =>
    authorizedRequest<BudgetOverview>('/finance/budgets', { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id: string) =>
    authorizedRequest<{ id: string; deleted: boolean }>(`/finance/budgets/${id}`, { method: 'DELETE' }),
  getCashflow: (month: string) =>
    authorizedRequest<FinancialCashflow>(`/finance/cashflow?month=${encodeURIComponent(month)}`),
  getSummary: (month: string) =>
    authorizedRequest<FinanceSummary>(`/finance/summary?month=${encodeURIComponent(month)}`),
  listEvents: (page = 1, pageSize = 50, search = '') =>
    authorizedRequest<{ items: FinancialEvent[]; total: number; page: number; pageSize: number }>(
      `/finance/events?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`
    ),
  createEvent: (data: FinancialEventInput) => authorizedRequest<FinancialEvent>('/finance/events', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateEvent: (id: string, data: Partial<FinancialEventInput>) => authorizedRequest<FinancialEvent>(`/finance/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  archiveEvent: (id: string) => authorizedRequest<{ id: string; archived: boolean }>(`/finance/events/${id}`, { method: 'DELETE' }),

  listAccounts: () => authorizedRequest<Account[]>('/finance/accounts'),
  createAccount: (data: Omit<Account, 'id' | 'isActive'>) => authorizedRequest<Account>('/finance/accounts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAccount: (id: string, data: Partial<Account>) => authorizedRequest<Account>(`/finance/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deactivateAccount: (id: string) => authorizedRequest<Account>(`/finance/accounts/${id}`, { method: 'DELETE' }),

  listCategories: () => authorizedRequest<Category[]>('/finance/categories'),
  createCategory: (data: Omit<Category, 'id' | 'isActive'>) => authorizedRequest<Category>('/finance/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCategory: (id: string, data: Partial<Category>) => authorizedRequest<Category>(`/finance/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deactivateCategory: (id: string) => authorizedRequest<Category>(`/finance/categories/${id}`, { method: 'DELETE' }),

  listPaymentMethods: () => authorizedRequest<PaymentMethod[]>('/finance/payment-methods'),
  createPaymentMethod: (data: Omit<PaymentMethod, 'id' | 'isActive'>) => authorizedRequest<PaymentMethod>('/finance/payment-methods', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updatePaymentMethod: (id: string, data: Partial<PaymentMethod>) => authorizedRequest<PaymentMethod>(`/finance/payment-methods/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deactivatePaymentMethod: (id: string) => authorizedRequest<PaymentMethod>(`/finance/payment-methods/${id}`, { method: 'DELETE' })
};
