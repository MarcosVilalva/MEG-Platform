import {
  authenticatedRequest,
  getApiHealth,
  readSession
} from '../../app/auth-client';
import { financeClient } from '../../app/finance-client';
import { receivablesClient } from '../../app/receivables-client';
import type {
  PhoenixActivity,
  PhoenixNormalizationPreview,
  PhoenixReadModel,
  PhoenixWorkspaceUsers
} from '../contracts';

type SharedStateRead = {
  state?: {
    activityLog?: PhoenixActivity[];
    [key: string]: unknown;
  };
  revision?: number;
  updatedAt?: string | null;
};

type ManagedUsersRead = {
  users?: PhoenixReadModel['workspaceUsers']['users'];
  workspace?: {
    id?: string;
    name?: string;
    slug?: string;
  };
};

type PhoenixPreviewCoreRead = Pick<
  PhoenixReadModel,
  | 'summary'
  | 'analytics'
  | 'cashflow'
  | 'accounts'
  | 'categories'
  | 'paymentMethods'
  | 'cards'
  | 'payables'
  | 'events'
  | 'financialAudit'
> & {
  month: string;
};

type CachedReadModel = {
  data: PhoenixReadModel;
  storedAt: number;
};

const readModelCache = new Map<string, CachedReadModel>();
const readModelInFlight = new Map<string, Promise<PhoenixReadModel>>();
const BOOTSTRAP_CACHE_TTL = 45_000;

async function loadWorkspaceUsers(role: string): Promise<PhoenixWorkspaceUsers> {
  if (role !== 'ADMIN') return { status: 'restricted', users: [] };
  try {
    const result = await authenticatedRequest<ManagedUsersRead>('/auth/users');
    return {
      status: 'ready',
      users: Array.isArray(result.users) ? result.users : [],
      workspace: result.workspace || null
    };
  } catch (error) {
    return {
      status: 'error',
      users: [],
      error: error instanceof Error ? error.message : 'USERS_READ_FAILED'
    };
  }
}

async function fetchPhoenixReadModel(month: string): Promise<PhoenixReadModel> {
  const session = readSession();
  if (!session) throw new Error('PHOENIX_UNAUTHORIZED');

  const [
    health,
    normalization,
    sharedState,
    previewCore,
    budgets,
    customers,
    receivables,
    workspaceUsers
  ] = await Promise.all([
    getApiHealth(),
    authenticatedRequest<PhoenixNormalizationPreview>('/app-state/normalization-preview'),
    authenticatedRequest<SharedStateRead>('/app-state'),
    authenticatedRequest<PhoenixPreviewCoreRead>(`/finance/phoenix-preview?month=${encodeURIComponent(month)}`),
    financeClient.listBudgets(month),
    receivablesClient.listCustomers(),
    receivablesClient.listReceivables(),
    loadWorkspaceUsers(session.user.role)
  ]);

  if (previewCore.month !== month) throw new Error('PHOENIX_PREVIEW_MONTH_MISMATCH');

  const activities = Array.isArray(sharedState.state?.activityLog)
    ? sharedState.state.activityLog
        .filter((item): item is PhoenixActivity => Boolean(item && item.id && item.at && item.action))
        .sort((left, right) => String(right.at).localeCompare(String(left.at)))
    : [];

  return {
    month,
    loadedAt: new Date().toISOString(),
    user: session.user,
    health,
    normalization,
    summary: previewCore.summary,
    analytics: previewCore.analytics,
    cashflow: previewCore.cashflow,
    budgets,
    accounts: previewCore.accounts,
    categories: previewCore.categories,
    paymentMethods: previewCore.paymentMethods,
    cards: previewCore.cards,
    payables: previewCore.payables,
    customers,
    receivables,
    events: previewCore.events,
    financialAudit: previewCore.financialAudit,
    activities,
    workspaceUsers,
    sourcePolicy: {
      mode: 'read-only',
      summary: 'finance-domain',
      events: 'finance-domain-month',
      financialAudit: 'finance-audit-log',
      activities: 'app-state-activity-log-legacy',
      users: 'auth-admin-read',
      receivables: 'receivables-domain',
      analytics: 'finance-domain',
      cashflow: 'finance-domain',
      budgets: 'finance-domain',
      sharedFallback: 'app-state-normalized-read',
      cards: 'cards-domain-with-legacy-compatibility',
      payables: 'payables-domain'
    }
  };
}

export function peekPhoenixReadModel(month: string) {
  const cached = readModelCache.get(month);
  if (!cached || Date.now() - cached.storedAt > BOOTSTRAP_CACHE_TTL) return null;
  return cached.data;
}

/**
 * Bootstrap oficial da fase de leitura da Phoenix V15.
 *
 * Regras:
 * - nenhuma mutação acontece aqui;
 * - o núcleo financeiro mensal vem de um snapshot único e somente leitura do backend;
 * - resumo, benefício, eventos, cartões, pendências e auditoria pertencem à mesma fotografia mensal;
 * - orçamentos e contas a receber permanecem em seus domínios oficiais até entrarem no snapshot;
 * - a normalização é observada explicitamente para evitar esconder fallback;
 * - activityLog permanece carregado somente como histórico legado anterior à auditoria normalizada;
 * - usuários são consultados pela rota administrativa oficial e nunca alterados aqui;
 * - o snapshot pode ser preparado durante a entrada para que a navegação interna não exiba carregamentos repetidos.
 */
export async function loadPhoenixReadModel(month: string, options: { force?: boolean } = {}): Promise<PhoenixReadModel> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('PHOENIX_INVALID_MONTH');
  }

  if (!readSession()) throw new Error('PHOENIX_UNAUTHORIZED');

  const cached = readModelCache.get(month);
  if (!options.force && cached && Date.now() - cached.storedAt <= BOOTSTRAP_CACHE_TTL) {
    return cached.data;
  }

  if (!options.force) {
    const pending = readModelInFlight.get(month);
    if (pending) return pending;
  }

  const pending = fetchPhoenixReadModel(month)
    .then((data) => {
      readModelCache.set(month, { data, storedAt: Date.now() });
      return data;
    })
    .finally(() => {
      if (readModelInFlight.get(month) === pending) readModelInFlight.delete(month);
    });

  readModelInFlight.set(month, pending);
  return pending;
}

export function clearPhoenixReadModelCache() {
  readModelCache.clear();
  readModelInFlight.clear();
}
