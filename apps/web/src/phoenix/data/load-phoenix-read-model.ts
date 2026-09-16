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
import { projectCardInstallmentsIntoEvents } from './card-movement-projection';

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
const supplementalInFlight = new Map<string, Promise<void>>();
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

function staticContextKey(user: { id?: string; role: string }) {
  return `${user.id || 'session'}:${user.role}`;
}

function activitiesFromSharedState(sharedState: SharedStateRead) {
  return Array.isArray(sharedState.state?.activityLog)
    ? sharedState.state.activityLog
        .filter((item): item is PhoenixActivity => Boolean(item && item.id && item.at && item.action))
        .sort((left, right) => String(right.at).localeCompare(String(left.at)))
    : [];
}

function legacyTransactionsFromSharedState(sharedState: SharedStateRead) {
  return Array.isArray(sharedState.state?.transactions)
    ? sharedState.state.transactions
        .filter((item): item is PhoenixLegacyTransaction => Boolean(item && typeof item === 'object' && item.id && item.date && item.description))
        .map((item) => ({ ...item }))
    : [];
}

function normalizationFromHealth(health: PhoenixReadModel['health']): PhoenixNormalizationPreview {
  const runtime = health.normalization;
  return {
    revision: 0,
    updatedAt: null,
    primary: Boolean(runtime?.primary),
    mode: runtime?.status || 'runtime-pending',
    reconciled: Boolean(runtime?.reconciled),
    normalized: runtime ? { count: Number(runtime.count || 0) } : undefined
  };
}

function bootstrapStaticContext(session: NonNullable<ReturnType<typeof readSession>>, health: PhoenixReadModel['health']): StaticReadContext {
  return {
    key: staticContextKey(session.user),
    storedAt: Date.now(),
    health,
    normalization: normalizationFromHealth(health),
    sharedState: {},
    customers: [],
    receivables: [],
    workspaceUsers: session.user.role === 'ADMIN'
      ? { status: 'ready', users: [] }
      : { status: 'restricted', users: [] }
  };
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

function buildPhoenixReadModel(
  session: NonNullable<ReturnType<typeof readSession>>,
  month: string,
  previewCore: PhoenixPreviewCoreRead,
  staticContext: StaticReadContext,
  budgets: PhoenixReadModel['budgets']
): PhoenixReadModel {
  const hydratedEvents = previewCore.events.items.map(hydrateEventSourceDetails);
  const cardInstallmentEvents = projectCardInstallmentsIntoEvents(previewCore.cards, previewCore.categories, month);
  const mergedEvents = [...hydratedEvents, ...cardInstallmentEvents]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));
  const events = {
    ...previewCore.events,
    items: mergedEvents,
    total: mergedEvents.length,
    page: 1,
    pageSize: Math.max(previewCore.events.pageSize || 0, mergedEvents.length)
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
    activities: activitiesFromSharedState(staticContext.sharedState),
    legacyTransactions: legacyTransactionsFromSharedState(staticContext.sharedState),
    workspaceUsers: staticContext.workspaceUsers,
    sourcePolicy: {
      mode: 'read-only',
      summary: 'finance-domain',
      events: 'finance-domain-month+card-domain-projection',
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

function replaceArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...source);
}

function enrichReadModel(
  model: PhoenixReadModel,
  staticContext: StaticReadContext,
  budgets: PhoenixReadModel['budgets']
) {
  model.health = staticContext.health;
  Object.assign(model.normalization, staticContext.normalization);
  replaceArray(model.budgets, budgets);
  replaceArray(model.customers, staticContext.customers);
  replaceArray(model.receivables, staticContext.receivables);
  replaceArray(model.activities, activitiesFromSharedState(staticContext.sharedState));
  replaceArray(model.legacyTransactions, legacyTransactionsFromSharedState(staticContext.sharedState));
  model.workspaceUsers.status = staticContext.workspaceUsers.status;
  model.workspaceUsers.workspace = staticContext.workspaceUsers.workspace;
  model.workspaceUsers.error = staticContext.workspaceUsers.error;
  replaceArray(model.workspaceUsers.users, staticContext.workspaceUsers.users);
  model.loadedAt = new Date().toISOString();
}

function startSupplementalHydration(
  session: NonNullable<ReturnType<typeof readSession>>,
  month: string,
  model: PhoenixReadModel,
  forceStatic = false
) {
  const key = `${staticContextKey(session.user)}:${month}`;
  if (supplementalInFlight.has(key)) return;

  const pending = Promise.all([
    loadStaticContext(session, forceStatic),
    financeClient.listBudgets(month)
  ])
    .then(([staticContext, budgets]) => {
      enrichReadModel(model, staticContext, budgets);
      readModelCache.set(month, { data: model, storedAt: Date.now() });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('meg:phoenix-supplemental-ready', { detail: { month } }));
      }
    })
    .catch(() => {
      // A fotografia financeira principal permanece válida. Leituras auxiliares podem
      // ser tentadas novamente no refresh sem desmontar a Home nem o período atual.
    })
    .finally(() => {
      if (supplementalInFlight.get(key) === pending) supplementalInFlight.delete(key);
    });

  supplementalInFlight.set(key, pending);
}

async function fetchPhoenixReadModel(month: string, options: { forceStatic?: boolean } = {}): Promise<PhoenixReadModel> {
  const session = readSession();
  if (!session) throw new Error('PHOENIX_UNAUTHORIZED');

  // Caminho crítico da entrada: somente o snapshot financeiro mensal. As leituras
  // auxiliares (AppState legado, usuários, clientes, recebíveis e orçamentos) são
  // pré-carregadas logo depois, sem competir com o snapshot que libera a Home.
  const previewCore = await authenticatedRequest<PhoenixPreviewCoreRead>(`/finance/phoenix-preview?month=${encodeURIComponent(month)}`);
  if (previewCore.month !== month) throw new Error('PHOENIX_PREVIEW_MONTH_MISMATCH');

  // Health é barato e, consultado depois do snapshot, normalmente já reflete a
  // checagem de normalização concluída no cold start da API.
  const health = await getApiHealth();
  const key = staticContextKey(session.user);
  const cachedStatic = !options.forceStatic
    && staticContextCache
    && staticContextCache.key === key
    && Date.now() - staticContextCache.storedAt <= STATIC_CACHE_TTL
      ? staticContextCache
      : null;
  const staticContext = cachedStatic || bootstrapStaticContext(session, health);
  const model = buildPhoenixReadModel(session, month, previewCore, staticContext, []);

  startSupplementalHydration(session, month, model, Boolean(options.forceStatic));
  return model;
}

async function fetchAllFinancialEvents(): Promise<PhoenixReadModel['events']> {
  const result = await authenticatedRequest<PhoenixReadModel['events']>('/finance/phoenix-preview/events');
  const unique = new Map(result.items.map((event) => [event.id, hydrateEventSourceDetails(event)]));
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
 * - compras de cartão são projetadas somente para leitura na grade, parcela a parcela, sem criar evento monetário duplicado;
 * - a Home é liberada quando a fotografia financeira mensal está pronta;
 * - AppState legado, usuários, clientes, recebíveis, diagnóstico completo e orçamentos são pré-carregados logo depois;
 * - a normalização inicial usa o estado runtime do health e é substituída pelo diagnóstico completo em segundo plano;
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
  supplementalInFlight.clear();
  allEventsCache = null;
  allEventsInFlight = null;
  staticContextCache = null;
  staticContextInFlight = null;
}
