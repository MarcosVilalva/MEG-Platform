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

export async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export const financeClient = {
  listEvents: () => authorizedRequest<FinancialEvent[]>('/finance/events'),
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
