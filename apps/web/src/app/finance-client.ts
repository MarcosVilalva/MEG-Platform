import { authenticatedRequest } from './auth-client';

export type Account = {
  id: string;
  name: string;
  type: string;
  institution?: string | null;
  openingBalance: string | number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Category = {
  id: string;
  name: string;
  group?: string | null;
  type?: 'income' | 'expense' | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  type?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FinancialEventType = 'income' | 'expense' | 'transfer' | 'investment' | 'redemption' | 'adjustment';
export type FinancialEventStatus = 'draft' | 'planned' | 'confirmed' | 'paid' | 'reconciled' | 'archived';

export type FinancialEvent = {
  id: string;
  legacyTransactionId?: string | null;
  description: string;
  type: FinancialEventType;
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
  createdAt?: string;
  updatedAt?: string;
  idempotentReplay?: boolean;
};

export type FinancialEventPage = {
  items: FinancialEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export type FinancialEventInput = {
  description: string;
  type: FinancialEventType;
  status: FinancialEventStatus;
  date: string;
  amount: number;
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  notes?: string;
};

export type BulkLegacyTransactionPatch = {
  launchType?: string;
  situation?: string;
  account?: string;
  paymentMethod?: string;
  group?: string;
  category?: string;
  classification?: string;
  modality?: string;
  financialAccountId?: string;
  paymentMethodId?: string;
  categoryId?: string;
  incomeAmount?: number;
  expenseAmount?: number;
  amount?: number;
};

export type BulkEventChanges = {
  date?: string;
  description?: string;
  type?: 'income' | 'expense';
  status?: 'planned' | 'paid' | 'reconciled';
  amount?: number;
  notes?: string | null;
  accountId?: string | null;
  paymentMethodId?: string | null;
  categoryId?: string | null;
  legacy?: BulkLegacyTransactionPatch;
};

async function authorizedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedRequest<T>(path, init);
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
  concentrationTop3: number;
  categories: Array<{ name: string; amount: number }>;
  monthlyTrend: Array<{ month: string; income: number; expense: number; result: number }>;
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
export type BenefitSummary = {
  month: string;
  balance: number;
  credits: number;
  used: number;
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
  getBenefitSummary: (month: string) =>
    authorizedRequest<BenefitSummary>(`/finance/benefit-summary?month=${encodeURIComponent(month)}`),
  listEventsForMonth: (month: string) =>
    authorizedRequest<FinancialEventPage>(`/finance/events/month?month=${encodeURIComponent(month)}`),
  getSyncStatus: () =>
    authorizedRequest<{ token: string; changedAt: string | null; mutationType: string | null }>('/finance/sync-status', { cache: 'no-store' }),
  listEvents: (page = 1, pageSize = 50, search = '') =>
    authorizedRequest<FinancialEventPage>(
      `/finance/events?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`
    ),
  createEvent: (data: FinancialEventInput & { operationId?: string }) => authorizedRequest<FinancialEvent>('/finance/events', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateEvent: (id: string, data: Partial<FinancialEventInput>) => authorizedRequest<FinancialEvent>(`/finance/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  archiveEvent: (id: string) => authorizedRequest<{ id: string; archived: boolean }>(`/finance/events/${id}`, { method: 'DELETE' }),
  bulkUpdateEvents: (data: { ids: string[]; changes: BulkEventChanges; operationId: string; expectedUpdatedAtById?: Record<string, string> }) =>
    authorizedRequest<{ ids: string[]; updated: number; events: FinancialEvent[]; idempotentReplay: boolean }>('/finance/events/bulk/update', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  bulkArchiveEvents: (data: { ids: string[]; operationId: string; expectedUpdatedAtById?: Record<string, string> }) =>
    authorizedRequest<{ ids: string[]; archived: number; idempotentReplay: boolean }>('/finance/events/bulk/archive', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  listAccounts: () => authorizedRequest<Account[]>('/finance/accounts'),
  createAccount: (data: Omit<Account, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> & { operationId?: string }) => authorizedRequest<Account>('/finance/accounts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAccount: (id: string, data: Pick<Partial<Account>, 'name' | 'institution' | 'isActive'> & { operationId?: string; expectedUpdatedAt?: string }) => authorizedRequest<Account>(`/finance/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deactivateAccount: (id: string, meta: { operationId?: string; expectedUpdatedAt?: string } = {}) => authorizedRequest<Account>(`/finance/accounts/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(meta),
  }),

  listCategories: () => authorizedRequest<Category[]>('/finance/categories'),
  createCategory: (data: Omit<Category, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> & { operationId?: string }) => authorizedRequest<Category>('/finance/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCategory: (id: string, data: Pick<Partial<Category>, 'name' | 'group' | 'isActive'> & { operationId?: string; expectedUpdatedAt?: string }) => authorizedRequest<Category>(`/finance/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deactivateCategory: (id: string, meta: { operationId?: string; expectedUpdatedAt?: string } = {}) => authorizedRequest<Category>(`/finance/categories/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(meta),
  }),

  listPaymentMethods: () => authorizedRequest<PaymentMethod[]>('/finance/payment-methods'),
  createPaymentMethod: (data: Omit<PaymentMethod, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> & { operationId?: string }) => authorizedRequest<PaymentMethod>('/finance/payment-methods', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updatePaymentMethod: (id: string, data: Pick<Partial<PaymentMethod>, 'name' | 'isActive'> & { operationId?: string; expectedUpdatedAt?: string }) => authorizedRequest<PaymentMethod>(`/finance/payment-methods/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deactivatePaymentMethod: (id: string, meta: { operationId?: string; expectedUpdatedAt?: string } = {}) => authorizedRequest<PaymentMethod>(`/finance/payment-methods/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(meta),
  })
};
