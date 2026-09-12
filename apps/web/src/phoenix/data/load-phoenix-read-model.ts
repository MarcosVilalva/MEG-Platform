import {
  authenticatedRequest,
  getApiHealth,
  readSession
} from '../../app/auth-client';
import { cardsClient } from '../../app/cards-client';
import { financeClient } from '../../app/finance-client';
import { payablesClient } from '../../app/payables-client';
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

/**
 * Bootstrap oficial da fase de leitura da Phoenix V15.
 *
 * Regras:
 * - nenhuma mutação acontece aqui;
 * - totais financeiros vêm dos serviços oficiais do backend;
 * - consultas independentes são iniciadas em paralelo;
 * - a normalização é observada explicitamente para evitar esconder fallback;
 * - o histórico operacional é lido do activityLog persistido no AppState,
 *   sem fingir que ele equivale ao AuditLog estrutural do banco;
 * - usuários são consultados pela rota administrativa oficial e nunca alterados aqui.
 */
export async function loadPhoenixReadModel(month: string): Promise<PhoenixReadModel> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('PHOENIX_INVALID_MONTH');
  }

  const session = readSession();
  if (!session) throw new Error('PHOENIX_UNAUTHORIZED');

  const [
    health,
    normalization,
    sharedState,
    summary,
    accounts,
    categories,
    paymentMethods,
    cards,
    payables,
    events,
    workspaceUsers
  ] = await Promise.all([
    getApiHealth(),
    authenticatedRequest<PhoenixNormalizationPreview>('/app-state/normalization-preview'),
    authenticatedRequest<SharedStateRead>('/app-state'),
    financeClient.getSummary(month),
    financeClient.listAccounts(),
    financeClient.listCategories(),
    financeClient.listPaymentMethods(),
    cardsClient.list(month),
    payablesClient.list(month),
    financeClient.listEvents(1, 100, ''),
    loadWorkspaceUsers(session.user.role)
  ]);

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
    summary,
    accounts,
    categories,
    paymentMethods,
    cards,
    payables,
    events,
    activities,
    workspaceUsers,
    sourcePolicy: {
      mode: 'read-only',
      summary: 'finance-domain',
      events: 'finance-domain',
      activities: 'app-state-activity-log',
      users: 'auth-admin-read',
      sharedFallback: 'app-state-normalized-read',
      cards: 'cards-domain-with-legacy-compatibility',
      payables: 'payables-domain'
    }
  };
}
