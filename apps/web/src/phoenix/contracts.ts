import type { ApiHealth, AuthUser } from '../app/auth-client';
import type { CreditCard } from '../app/cards-client';
import type {
  Account,
  Category,
  FinanceSummary,
  FinancialEvent,
  PaymentMethod
} from '../app/finance-client';
import type { Payable } from '../app/payables-client';

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
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  cards: CreditCard[];
  payables: Payable[];
  events: PhoenixEventPage;
  sourcePolicy: {
    mode: 'read-only';
    summary: 'finance-domain';
    events: 'finance-domain';
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
