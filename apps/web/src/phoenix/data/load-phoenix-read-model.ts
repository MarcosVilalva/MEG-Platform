import {
  authenticatedRequest,
  getApiHealth,
  readSession
} from '../../app/auth-client';
import { financeClient, type FinancialEvent } from '../../app/finance-client';
import { receivablesClient } from '../../app/receivables-client';
import type {
  PhoenixActivity,
  PhoenixLegacyTransaction,
  PhoenixNormalizationPreview,
  PhoenixReadModel,
  PhoenixWorkspaceUsers
} from '../contracts';

type SharedStateRead = {
  state?: {
    activityLog?: PhoenixActivity[];
    transactions?: PhoenixLegacyTransaction[];
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

type CachedAllEvents = {
  data: PhoenixReadModel['events'];
  storedAt: number;
};

type StaticReadContext = {
  key: string;
  storedAt: number;
  health: PhoenixReadModel['health'];
  normalization: PhoenixNormalizationPreview;
  sharedState: SharedStateRead;
  customers: PhoenixReadModel['customers'];
  receivables: PhoenixReadModel['receivables'];
  workspaceUsers: PhoenixWorkspaceUsers;
};

type FinancialEventWithSourcePayload = FinancialEvent & {
  sourcePayload?: unknown;
};

const readModelCache = new Map<string, CachedReadModel>();
const readModelInFlight = new Map<string, Promise<PhoenixReadModel>>();
let allEventsCache: CachedAllEvents | null = null;
let allEventsInFlight: Promise<PhoenixReadModel['events']> | null = null;
let staticContextCache: StaticReadContext | null = null;
let staticContextInFlight: Promise<StaticReadContext> | null = null;

// O mês é atualizado em segundo plano a cada dois minutos pelo shell. Uma janela maior aqui
// permite que meses já visitados ou pré-carregados sejam trocados sem nova espera do servidor.
const BOOTSTRAP_CACHE_TTL = 5 * 60_000;
const ALL_EVENTS_CACHE_TTL = 5 * 60_000;
// Catálogos auxiliares, AppState, clientes e usuários não mudam porque o mês mudou.
const STATIC_CACHE_TTL = 10 * 60_000;

function sourcePayloadDetails(event: FinancialEvent) {
  const payload = (event as FinancialEventWithSourcePayload).sourcePayload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return event.sourceDetails || null;

  const source = payload as Record<string, unknown>;
  const existing = event.sourceDetails;
  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = source[key];
      if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
    }
    return '';
  };

  const details = {
    weekday: existing?.weekday || read('weekday', 'dayOfWeek'),
    launchType: existing?.launchType || read('launchType', 'type'),
    expenseClass: existing?.expenseClass || read('expenseClass', 'classification'),
    group: existing?.group || read('group', 'category'),
    paymentMethod: existing?.paymentMethod || read('paymentMethod', 'account'),
    situation: existing?.situation || read('situation', 'status'),
    modality: existing?.modality || read('modality'),
    observations: existing?.observations || read('observations', 'notes')
  };

  return Object.values(details).some(Boolean) ? details : null;
}

function hydrateEventSourceDetails(event: FinancialEvent): FinancialEvent {
  const details = sourcePayloadDetails(event);
  if (!details) return event;
  return { ...event, sourceDetails: details };
}

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

function staticContextKey(user: { id?: string; role: string }) {
  return `${user.id || 'session'}:${user.role}`;
}

async function fetchStaticContext(session: NonNullable<ReturnType<typeof readSession>>): Promise<StaticReadContext> {
  const [health, normalization, sharedState, customers, receivables, workspaceUsers] = await Promise.all([
    getApiHealth(),
    authenticatedRequest<PhoenixNormalizationPreview>('/app-state/normalization-preview'),
    authenticatedRequest<SharedStateRead>('/app-state'),
    receivablesClient.listCustomers(),
    receivablesClient.listReceivables(),
    loadWorkspaceUsers(session.user.role)
  ]);

  return {
    key: staticContextKey(session.user),
    storedAt: Date.now(),
    health,
    normalization,
    sharedState,
    customers,
    receivables,
    workspaceUsers
  };
}

async function loadStaticContext(session: NonNullable<ReturnType<typeof readSession>>, force = false) {
  const key = staticContextKey(session.user);
  if (!force && staticContextCache && staticContextCache.key === key && Date.now() - staticContextCache.storedAt <= STATIC_CACHE_TTL) {
    return staticContextCache;
  }
  if (!force && staticContextInFlight) return staticContextInFlight;

  const pending = fetchStaticContext(session)
    .then((context) => {
      staticContextCache = context;
      return context;
    })
    .finally(() => {
      if (staticContextInFlight === pending) staticContextInFlight = null;
    });
  staticContextInFlight = pending;
  return pending;
}

async function fetchPhoenixReadModel(month: string, options: { forceStatic?: boolean } = {}): Promise<PhoenixReadModel> {
  const session = readSession();
  if (!session) throw new Error('PHOENIX_UNAUTHORIZED');

  // Trocar mês não deve repetir AppState, usuários, clientes, saúde e normalização.
  // O caminho mensal aguarda somente o snapshot financeiro e orçamentos daquele mês.
  const [staticContext, previewCore, budgets] = await Promise.all([
    loadStaticContext(session, Boolean(options.forceStatic)),
    authenticatedRequest<PhoenixPreviewCoreRead>(`/finance/phoenix-preview?month=${encodeURIComponent(month)}`),
    financeClient.listBudgets(month)
  ]);

  if (previewCore.month !== month) throw new Error('PHOENIX_PREVIEW_MONTH_MISMATCH');

  const activities = Array.isArray(staticContext.sharedState.state?.activityLog)
    ? staticContext.sharedState.state.activityLog
        .filter((item): item is PhoenixActivity => Boolean(item && item.id && item.at && item.action))
        .sort((left, right) => String(right.at).localeCompare(String(left.at)))
    : [];

  const legacyTransactions = Array.isArray(staticContext.sharedState.state?.transactions)
    ? staticContext.sharedState.state.transactions
        .filter((item): item is PhoenixLegacyTransaction => Boolean(item && typeof item === 'object' && item.id && item.date && item.description))
        .map((item) => ({ ...item }))
    : [];

  const events = {
    ...previewCore.events,
    items: previewCore.events.items.map(hydrateEventSourceDetails)
  };

  return {
    month,
    loadedAt: new Date().toISOString(),
    user: session.user,
    health: staticContext.health,
    normalization: staticContext.normalization,
    summary: previewCore.summary,
    analytics: previewCore.analytics,
    cashflow: previewCore.cashflow,
    budgets,
    accounts: previewCore.accounts,
    categories: previewCore.categories,
    paymentMethods: previewCore.paymentMethods,
    cards: previewCore.cards,
    payables: previewCore.payables,
    customers: staticContext.customers,
    receivables: staticContext.receivables,
    events,
    financialAudit: previewCore.financialAudit,
    activities,
    legacyTransactions,
    workspaceUsers: staticContext.workspaceUsers,
    sourcePolicy: {
      mode: 'read-only',
      summary: 'finance-domain',
      events: 'finance-domain-month',
      financialAudit: 'finance-audit-log',
      activities: 'app-state-activity-log-legacy',
      legacyTransactions: 'app-state-transactions-read-only',
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

async function fetchAllFinancialEvents(): Promise<PhoenixReadModel['events']> {
  const first = await financeClient.listEvents(1, 100);
  const pages = Math.max(1, Math.ceil(first.total / 100));
  const items = [...first.items];

  // Não dispara dezenas de consultas simultâneas. O histórico completo é lido em lotes pequenos,
  // somente quando o usuário pede explicitamente “Tudo”.
  for (let page = 2; page <= pages; page += 6) {
    const batch = Array.from({ length: Math.min(6, pages - page + 1) }, (_, index) => page + index);
    const results = await Promise.all(batch.map((current) => financeClient.listEvents(current, 100)));
    results.forEach((result) => items.push(...result.items));
  }

  const unique = new Map(items.map((event) => [event.id, hydrateEventSourceDetails(event)]));
  const hydrated = [...unique.values()].sort((left, right) => String(right.date).localeCompare(String(left.date)));
  return { items: hydrated, total: hydrated.length, page: 1, pageSize: hydrated.length };
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
 * - orçamentos são mensais; clientes/contas a receber e demais leituras estáticas são reutilizados entre trocas de mês;
 * - a normalização é observada explicitamente para evitar esconder fallback;
 * - activityLog permanece carregado somente como histórico legado anterior à auditoria normalizada;
 * - transactions permanece disponível somente como compatibilidade de leitura para cartões/pendências legadas;
 * - sourcePayload do domínio financeiro é usado somente como compatibilidade de leitura para preservar classificação/grupo legados ainda não normalizados em categoryId;
 * - usuários são consultados pela rota administrativa oficial e nunca alterados aqui;
 * - o snapshot mensal pode ser pré-carregado para que a troca de período não bloqueie a interface.
 */
export async function loadPhoenixReadModel(month: string, options: { force?: boolean; forceStatic?: boolean } = {}): Promise<PhoenixReadModel> {
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

  const pending = fetchPhoenixReadModel(month, { forceStatic: options.forceStatic })
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

export async function prefetchPhoenixReadModel(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !readSession()) return;
  try {
    await loadPhoenixReadModel(month);
  } catch {
    // Pré-carga nunca desmonta a fotografia atual nem exibe erro ao usuário.
  }
}

export async function loadPhoenixAllEvents(options: { force?: boolean } = {}) {
  if (!readSession()) throw new Error('PHOENIX_UNAUTHORIZED');
  if (!options.force && allEventsCache && Date.now() - allEventsCache.storedAt <= ALL_EVENTS_CACHE_TTL) return allEventsCache.data;
  if (!options.force && allEventsInFlight) return allEventsInFlight;

  const pending = fetchAllFinancialEvents()
    .then((data) => {
      allEventsCache = { data, storedAt: Date.now() };
      return data;
    })
    .finally(() => {
      if (allEventsInFlight === pending) allEventsInFlight = null;
    });
  allEventsInFlight = pending;
  return pending;
}

export function clearPhoenixReadModelCache() {
  readModelCache.clear();
  readModelInFlight.clear();
  allEventsCache = null;
  allEventsInFlight = null;
  staticContextCache = null;
  staticContextInFlight = null;
}