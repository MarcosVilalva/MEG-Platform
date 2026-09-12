import type { ApiHealth, AuthUser } from '../app/auth-client';
import type { CreditCard } from '../app/cards-client';
import type {
  Account,
  BudgetOverview,
  Category,
  FinanceSummary,
  FinancialAnalytics,
  FinancialCashflow,
  FinancialEvent,
  PaymentMethod
} from '../app/finance-client';
import type { Payable } from '../app/payables-client';
import type { Customer, Receivable } from '../app/receivables-client';

export type PhoenixNormalizationPreview = {
  revision: number;
  updatedAt?: string | null;
  primary: boolean;
  mode: string;
  reconciled: boolean;
  source?: {
    validCount?: number;
    invalidCount?: number;
    fingerprint?: string;
  };
  normalized?: {
    count?: number;
    income?: number;
    expense?: number;
    net?: number;
    fingerprint?: string;
  };
};

export type PhoenixActivityTransaction = {
  id?: string;
  date?: string;
  purchaseDate?: string;
  description?: string;
  type?: 'income' | 'expense' | string;
  amount?: number;
  paymentMethod?: string;
  group?: string;
  status?: string;
  installmentSeriesId?: string;
  installmentNumber?: number;
  installmentCount?: number;
  purchaseTotal?: number;
};

export type PhoenixActivity = {
  id: string;
  at: string;
  userId?: string;
  userName?: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'RECOVERED' | string;
  transactionId?: string;
  transaction?: PhoenixActivityTransaction | null;
  recovery?: {
    snapshotId?: string;
    snapshotCreatedAt?: string;
    snapshotReason?: string;
  } | null;
};

export type PhoenixFinancialAuditItem = {
  id: string;
  at: string;
  actor?: { id?: string; name?: string; email?: string } | null;
  entity: string;
  entityId: string;
  action: string;
  schemaVersion: number;
  before?: unknown;
  after?: unknown;
  context?: Record<string, unknown>;
};

export type PhoenixFinancialAuditPage = {
  items: PhoenixFinancialAuditItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type PhoenixWorkspaceUsers = {
  status: 'ready' | 'restricted' | 'error';
  users: AuthUser[];
  workspace?: {
    id?: string;
    name?: string;
    slug?: string;
  } | null;
  error?: string;
};

export type PhoenixEventPage = {
  items: FinancialEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export type PhoenixReadModel = {
  month: string;
  loadedAt: string;
  user: AuthUser;
  health: ApiHealth;
  normalization: PhoenixNormalizationPreview;
  summary: FinanceSummary;
  analytics: FinancialAnalytics;
  cashflow: FinancialCashflow;
  budgets: BudgetOverview[];
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  cards: CreditCard[];
  payables: Payable[];
  customers: Customer[];
  receivables: Receivable[];
  events: PhoenixEventPage;
  financialAudit: PhoenixFinancialAuditPage;
  activities: PhoenixActivity[];
  workspaceUsers: PhoenixWorkspaceUsers;
  sourcePolicy: {
    mode: 'read-only';
    summary: 'finance-domain';
    events: 'finance-domain';
    financialAudit: 'finance-audit-log';
    activities: 'app-state-activity-log-legacy';
    users: 'auth-admin-read';
    receivables: 'receivables-domain';
    analytics: 'finance-domain';
    cashflow: 'finance-domain';
    budgets: 'finance-domain';
    sharedFallback: 'app-state-normalized-read';
    cards: 'cards-domain-with-legacy-compatibility';
    payables: 'payables-domain';
  };
};

export type PhoenixLoadState =
  | { status: 'idle' }
  | { status: 'loading'; startedAt: number }
  | { status: 'ready'; data: PhoenixReadModel }
  | { status: 'error'; message: string };
