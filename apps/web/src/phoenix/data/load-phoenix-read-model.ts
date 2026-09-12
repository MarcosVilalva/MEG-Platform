import {
  authenticatedRequest,
  getApiHealth,
  readSession
} from '../../app/auth-client';
import { cardsClient } from '../../app/cards-client';
import { financeClient } from '../../app/finance-client';
import { payablesClient } from '../../app/payables-client';
import { receivablesClient } from '../../app/receivables-client';
import type {
  PhoenixActivity,
  PhoenixFinancialAuditPage,
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
 * - eventos do período vêm de uma leitura mensal completa, sem depender da paginação global;
 * - benefício é lido separadamente e nunca compõe o saldo monetário;
 * - consultas independentes são iniciadas em paralelo;
 * - a normalização é observada explicitamente para evitar esconder fallback;
 * - auditoria financeira nova vem do contrato /finance/audit;
 * - activityLog permanece carregado somente como histórico legado anterior à auditoria normalizada;
 * - usuários são consultados pela rota administrativa oficial e nunca alterados aqui;
 * - telas Web completo usam somente endpoints de leitura dos domínios oficiais.
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
    summaryBase,
    benefitSummary,
    analytics,
    cashflow,
    budgets,
    accounts,
    categories,
    paymentMethods,
    cards,
    payables,
    customers,
    receivables,
    events,
    financialAudit,
    workspaceUsers
  ] = await Promise.all([
    getApiHealth(),
    authenticatedRequest<PhoenixNormalizationPreview>('/app-state/normalization-preview'),
    authenticatedRequest<SharedStateRead>('/app-state'),
    financeClient.getSummary(month),
    financeClient.getBenefitSummary(month),
    financeClient.getAnalytics(month),
    financeClient.getCashflow(month),
    financeClient.listBudgets(month),
    financeClient.listAccounts(),
    financeClient.listCategories(),
    financeClient.listPaymentMethods(),
    cardsClient.list(month),
    payablesClient.list(month),
    receivablesClient.listCustomers(),
    receivablesClient.listReceivables(),
    financeClient.listEventsForMonth(month),
    authenticatedRequest<PhoenixFinancialAuditPage>('/finance/audit?page=1&pageSize=100'),
    loadWorkspaceUsers(session.user.role)
  ]);

  const activities = Array.isArray(sharedState.state?.activityLog)
    ? sharedState.state.activityLog
        .filter((item): item is PhoenixActivity => Boolean(item && item.id && item.at && item.action))
        .sort((left, right) => String(right.at).localeCompare(String(left.at)))
    : [];

  const summary: PhoenixReadModel['summary'] = {
    ...summaryBase,
    benefitBalance: benefitSummary.balance,
    benefitCredits: benefitSummary.credits,
    benefitUsed: benefitSummary.used
  };

  return {
    month,
    loadedAt: new Date().toISOString(),
    user: session.user,
    health,
    normalization,
    summary,
    analytics,
    cashflow,
    budgets,
    accounts,
    categories,
    paymentMethods,
    cards,
    payables,
    customers,
    receivables,
    events,
    financialAudit,
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
