/**
 * Etapa 10 principal: integração incremental Web Evolution -> API -> PostgreSQL 17.
 *
 * Guardas:
 * - PostgreSQL local, descartável e identificado por host/porta/banco/usuário;
 * - dados e credenciais exclusivamente fictícios;
 * - API montada sem importar server.ts e sem rotinas automáticas;
 * - cliente Web real carregado pelo Vite com VITE_API_URL;
 * - nenhum acesso de rede fora do loopback da API criada pelo teste.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcryptjs';
import { createServer, type ViteDevServer } from 'vite';
import {
  LicenseStatus,
  Prisma,
  prisma,
  UserRole,
  UserStatus,
} from '@meg/database';
import { isAllowedOrigin } from '../../cors';
import { registerSecurityHeaders } from '../../security';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';
import { cardRoutes } from '../cards/routes';
import { cardManagementRoutes } from '../cards/management-routes';
import { payableRoutes } from '../payables/routes';
import { financeRoutes } from './routes';

const DATABASE = new URL(process.env.DATABASE_URL || 'http://invalid');
const DB_NAME = 'meg_stage10_final_disposable';
const DB_USER = 'meg_stage10_final';
const DB_PORT = '55439';
const WEB_ORIGIN = 'http://127.0.0.1:4173';
const MONTH = '2026-11';
const PASSWORD = 'Fictitious-Stage10-Final-Only-2026!';

assert.equal(process.env.MEG_STAGE10_FINAL_DISPOSABLE, '1');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(DATABASE.protocol, 'postgresql:');
assert.equal(DATABASE.hostname, '127.0.0.1');
assert.equal(DATABASE.port, DB_PORT);
assert.equal(DATABASE.pathname, '/' + DB_NAME);
assert.equal(DATABASE.username, DB_USER);
assert.equal(process.env.CORS_ORIGINS, WEB_ORIGIN);
assert.match(process.env.JWT_SECRET || '', /^stage10-final-fictitious-/);

class MemoryStorage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

if (typeof globalThis.CustomEvent === 'undefined') {
  class QaCustomEvent<T = unknown> extends Event {
    readonly detail: T;
    constructor(type: string, init?: CustomEventInit<T>) {
      super(type);
      this.detail = init?.detail as T;
    }
  }
  Object.defineProperty(globalThis, 'CustomEvent', { value: QaCustomEvent });
}
const sessionStorage = new MemoryStorage();
const localStorage = new MemoryStorage();
const windowTarget = Object.assign(new EventTarget(), {
  location: { hostname: '127.0.0.1' },
});
Object.defineProperties(globalThis, {
  sessionStorage: { value: sessionStorage, configurable: true },
  localStorage: { value: localStorage, configurable: true },
  window: { value: windowTarget, configurable: true },
});

type Tenant = {
  userId: string;
  email: string;
  workspaceId: string;
  accountId: string;
  categoryId: string;
  paymentMethodId: string;
  cardId: string;
  payableId: string;
  eventId: string;
};

type WebModules = {
  auth: {
    login(email: string, password: string): Promise<unknown>;
    clearSession(): void;
    readSession(): { accessToken: string; refreshToken: string } | null;
    saveSession(session: unknown): void;
    authenticatedRequest<T>(path: string, init?: RequestInit): Promise<T>;
  };
  finance: {
    financeClient: {
      listAccounts(): Promise<Array<{ id: string }>>;
      listEventsForMonth(month: string): Promise<{ items: Array<{ id: string; description: string }> }>;
      getMonetaryBalance(accountId: string, date: string): Promise<{ available: number }>;
      createEvent(data: Record<string, unknown>): Promise<Record<string, unknown>>;
      updateEvent(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
      archiveEvent(id: string): Promise<{ id: string; archived: boolean }>;
    };
  };
  system: {
    loadSystem(month: string): Promise<{
      summary: { availableBalance: number; realizedResult: number };
      events: Array<{ id: string }>;
      accounts: Array<{ id: string }>;
      cards: Array<{ id: string }>;
      payables: Array<{ id: string }>;
    }>;
    pendingItems(data: unknown, month: string): Array<{ source: string; sourceId: string }>;
  };
};

const app = Fastify({ logger: false, bodyLimit: 25 * 1024 * 1024, trustProxy: false });
let vite: ViteDevServer | undefined;
let apiOrigin = '';
let nativeFetch: typeof fetch | undefined;
const requestedPaths: string[] = [];

async function createTenant(label: string, planId: string): Promise<Tenant> {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      name: 'Pessoa fictícia ' + label,
      email: `stage10-final-${label}@example.invalid`,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace fictício ' + label,
      slug: 'stage10-final-' + label + '-' + randomUUID().slice(0, 8),
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          isActive: true,
        },
      },
      appState: {
        create: {
          userId: user.id,
          revision: label === 'a' ? 10 : 20,
          state: { transactions: [], budgets: {} } as Prisma.InputJsonValue,
        },
      },
      subscription: {
        create: { planId, status: LicenseStatus.ACTIVE, startsAt: new Date() },
      },
    },
  });
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Conta fictícia ' + label,
      type: 'checking',
      openingBalance: label === 'a' ? 1000 : 5000,
    },
  });
  const category = await prisma.category.create({
    data: {
      userId: user.id,
      name: 'Categoria fictícia ' + label,
      group: 'QA ISOLADO',
      type: 'expense',
    },
  });
  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      name: 'PIX fictício ' + label,
      type: 'instant',
    },
  });
  const card = await prisma.creditCard.create({
    data: {
      userId: user.id,
      name: 'Cartão fictício ' + label,
      brand: 'QA',
      lastFour: label === 'a' ? '1010' : '2020',
      creditLimit: label === 'a' ? 900 : 1900,
      closingDay: 5,
      dueDay: 12,
      purchases: {
        create: {
          userId: user.id,
          categoryId: category.id,
          description: 'Compra fictícia ' + label,
          totalAmount: label === 'a' ? 75 : 175,
          purchaseDate: new Date('2026-11-04T12:00:00.000Z'),
          installments: 1,
          entries: {
            create: {
              number: 1,
              amount: label === 'a' ? 75 : 175,
              statementMonth: MONTH,
              status: 'open',
            },
          },
        },
      },
    },
  });
  const payable = await prisma.payable.create({
    data: {
      userId: user.id,
      categoryId: category.id,
      description: 'Pendente fictício ' + label,
      totalAmount: label === 'a' ? 55 : 155,
      openAmount: label === 'a' ? 55 : 155,
      dueDate: new Date('2026-11-20T12:00:00.000Z'),
      status: 'open',
    },
  });
  const event = await prisma.financialEvent.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      description: 'Evento persistente fictício ' + label,
      type: 'expense',
      status: 'paid',
      date: new Date('2026-11-03T12:00:00.000Z'),
      competence: MONTH,
      amount: label === 'a' ? 40 : 440,
      signedAmount: label === 'a' ? -40 : -440,
      accountId: account.id,
      categoryId: category.id,
      paymentMethodId: paymentMethod.id,
      ledgerEntries: {
        create: {
          date: new Date('2026-11-03T12:00:00.000Z'),
          accountId: account.id,
          debit: 0,
          credit: label === 'a' ? 40 : 440,
          memo: 'Ledger fictício ' + label,
        },
      },
    },
  });
  return {
    userId: user.id,
    email: user.email,
    workspaceId: workspace.id,
    accountId: account.id,
    categoryId: category.id,
    paymentMethodId: paymentMethod.id,
    cardId: card.id,
    payableId: payable.id,
    eventId: event.id,
  };
}

async function startWebClient(): Promise<WebModules> {
  assert.ok(apiOrigin);
  process.env.VITE_API_URL = apiOrigin;
  const webRoot = resolve('apps/web');
  assert.ok(existsSync(resolve(webRoot, 'src/app/finance-client.ts')), 'STAGE10_WEB_ROOT_NOT_MAPPED');
  vite = await createServer({
    root: webRoot,
    configFile: false,
    envFile: false,
    mode: 'test',
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true },
  });
  const [auth, finance, system] = await Promise.all([
    vite.ssrLoadModule('/src/app/auth-client.ts'),
    vite.ssrLoadModule('/src/app/finance-client.ts'),
    vite.ssrLoadModule('/src/evolution/app/system-domain.ts'),
  ]);
  return { auth, finance, system } as WebModules;
}

async function databaseCounts() {
  return Promise.all([
    prisma.workspace.count(),
    prisma.workspaceMember.count(),
    prisma.appState.count(),
    prisma.financialEvent.count(),
    prisma.ledgerEntry.count(),
  ]);
}

try {
  const plan = await prisma.plan.create({
    data: {
      code: 'STAGE10_FINAL_' + randomUUID().slice(0, 8),
      name: 'Plano fictício da integração final',
      monthlyPrice: 0,
      maxMembers: 2,
      features: [] as Prisma.InputJsonValue,
    },
  });
  const tenantA = await createTenant('a', plan.id);
  const tenantB = await createTenant('b', plan.id);
  const noWorkspace = await prisma.user.create({
    data: {
      name: 'Pessoa fictícia sem workspace',
      email: 'stage10-final-sem-workspace-' + randomUUID().slice(0, 8) + '@example.invalid',
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      role: UserRole.VIEWER,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });

  registerSecurityHeaders(app);
  await app.register(cors, {
    origin(origin, callback) {
      callback(
        isAllowedOrigin(origin, [WEB_ORIGIN]) ? null : new Error('Origin not allowed by CORS'),
        isAllowedOrigin(origin, [WEB_ORIGIN]),
      );
    },
    credentials: true,
  });
  await registerAuth(app);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(financeRoutes, { prefix: '/finance' });
  await app.register(cardRoutes, { prefix: '/cards' });
  await app.register(cardManagementRoutes, { prefix: '/cards-management' });
  await app.register(payableRoutes, { prefix: '/payables' });
  await app.register(appStateRoutes, { prefix: '/app-state' });
  apiOrigin = await app.listen({ host: '127.0.0.1', port: 0 });
  const bound = new URL(apiOrigin);
  assert.equal(bound.hostname, '127.0.0.1');

  const preflight = await fetch(new URL('/finance/accounts', apiOrigin), {
    method: 'OPTIONS',
    headers: {
      Origin: WEB_ORIGIN,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), WEB_ORIGIN);

  nativeFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString(), apiOrigin);
    assert.equal(url.origin, new URL(apiOrigin).origin, 'NETWORK_DESTINATION_NOT_ISOLATED');
    const headers = new Headers(init?.headers);
    headers.set('Origin', WEB_ORIGIN);
    requestedPaths.push(url.pathname);
    return nativeFetch!(url, { ...init, headers, redirect: 'error' });
  }) as typeof fetch;

  let web = await startWebClient();
  await web.auth.login(tenantA.email, PASSWORD);
  const originalSession = web.auth.readSession();
  assert.ok(originalSession?.refreshToken);
  web.auth.saveSession({ ...originalSession!, accessToken: 'invalid.invalid.invalid' });
  const refreshedAccounts = await web.finance.financeClient.listAccounts();
  assert.ok(refreshedAccounts.some(account => account.id === tenantA.accountId));
  assert.notEqual(web.auth.readSession()?.accessToken, 'invalid.invalid.invalid');

  const initial = await web.system.loadSystem(MONTH);
  const initialPending = web.system.pendingItems(initial, MONTH);
  assert.ok(initial.accounts.some(item => item.id === tenantA.accountId));
  assert.ok(initial.events.some(item => item.id === tenantA.eventId));
  assert.ok(initial.cards.some(item => item.id === tenantA.cardId));
  assert.ok(initial.payables.some(item => item.id === tenantA.payableId));
  assert.ok(initialPending.some(item => item.sourceId === tenantA.payableId));
  assert.ok(!initial.events.some(item => item.id === tenantB.eventId));
  assert.ok(!initial.cards.some(item => item.id === tenantB.cardId));
  assert.ok(!initial.payables.some(item => item.id === tenantB.payableId));

  web.auth.clearSession();
  await web.auth.login(tenantB.email, PASSWORD);
  const isolatedB = await web.system.loadSystem(MONTH);
  assert.ok(isolatedB.accounts.some(item => item.id === tenantB.accountId));
  assert.ok(isolatedB.events.some(item => item.id === tenantB.eventId));
  assert.ok(!isolatedB.events.some(item => item.id === tenantA.eventId));
  await assert.rejects(
    () => web.finance.financeClient.updateEvent(tenantA.eventId, { description: 'Intrusão proibida' }),
    (error: unknown) => Number((error as { status?: number }).status) === 404,
  );
  assert.equal(
    (await prisma.financialEvent.findUniqueOrThrow({ where: { id: tenantA.eventId } })).description,
    'Evento persistente fictício a',
  );

  web.auth.clearSession();
  await web.auth.login(noWorkspace.email, PASSWORD);
  const beforeDeniedRead = await databaseCounts();
  await assert.rejects(
    () => web.auth.authenticatedRequest('/app-state'),
    (error: unknown) => Number((error as { status?: number }).status) === 403,
  );
  assert.deepEqual(await databaseCounts(), beforeDeniedRead);

  web.auth.clearSession();
  await web.auth.login(tenantA.email, PASSWORD);
  const beforeBalance = await web.finance.financeClient.getMonetaryBalance(
    tenantA.accountId,
    '2026-11-30',
  );
  const operationId = 'stage10-final-' + randomUUID();
  const createInput = {
    operationId,
    description: 'Despesa incremental fictícia',
    type: 'expense',
    status: 'paid',
    date: '2026-11-15',
    amount: 25,
    accountId: tenantA.accountId,
    categoryId: tenantA.categoryId,
    paymentMethodId: tenantA.paymentMethodId,
  };
  const created = await web.finance.financeClient.createEvent(createInput);
  const replay = await web.finance.financeClient.createEvent(createInput);
  assert.equal(replay.id, created.id);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(await prisma.financialEvent.count({
    where: { workspaceId: tenantA.workspaceId, description: createInput.description },
  }), 1);
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: String(created.id) } }), 1);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: tenantA.workspaceId, operationId },
  }), 1);
  const afterCreate = await web.finance.financeClient.getMonetaryBalance(
    tenantA.accountId,
    '2026-11-30',
  );
  assert.equal(Math.round(afterCreate.available * 100), Math.round((beforeBalance.available - 25) * 100));
  assert.ok((await web.finance.financeClient.listEventsForMonth(MONTH)).items
    .some(event => event.id === created.id));

  await web.finance.financeClient.updateEvent(String(created.id), {
    description: 'Despesa incremental fictícia editada',
    amount: 35,
  });
  const edited = await prisma.financialEvent.findUniqueOrThrow({
    where: { id: String(created.id) },
    include: { ledgerEntries: true },
  });
  assert.equal(edited.description, 'Despesa incremental fictícia editada');
  assert.equal(Number(edited.amount), 35);
  assert.equal(edited.ledgerEntries.length, 1);
  assert.equal(Number(edited.ledgerEntries[0]?.credit), 35);
  const afterEdit = await web.finance.financeClient.getMonetaryBalance(
    tenantA.accountId,
    '2026-11-30',
  );
  assert.equal(Math.round(afterEdit.available * 100), Math.round((beforeBalance.available - 35) * 100));

  const archived = await web.finance.financeClient.archiveEvent(String(created.id));
  assert.equal(archived.archived, true);
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: String(created.id) } }), 0);
  assert.equal((await prisma.financialEvent.findUniqueOrThrow({
    where: { id: String(created.id) },
  })).status, 'archived');
  const afterArchive = await web.finance.financeClient.getMonetaryBalance(
    tenantA.accountId,
    '2026-11-30',
  );
  assert.equal(Math.round(afterArchive.available * 100), Math.round(beforeBalance.available * 100));

  const history = await web.auth.authenticatedRequest<{
    protocol: string;
    items: Array<{ id: string }>;
  }>('/finance/events/history-snapshot');
  const appState = await web.auth.authenticatedRequest<{
    revision: number;
    state: { transactions: unknown[] } | null;
    workspace: { id: string };
  }>('/app-state');
  assert.equal(history.protocol, 'financial-history-v1');
  assert.ok(!history.items.some(item => item.id === created.id));
  assert.equal(appState.workspace.id, tenantA.workspaceId);
  assert.ok(Number.isInteger(appState.revision));
  assert.ok(appState.state === null || Array.isArray(appState.state.transactions));

  if (vite) await vite.close();
  vite = undefined;
  sessionStorage.clear();
  localStorage.clear();
  web = await startWebClient();
  await web.auth.login(tenantA.email, PASSWORD);
  const afterClientRestart = await web.system.loadSystem(MONTH);
  assert.ok(afterClientRestart.events.some(item => item.id === tenantA.eventId));
  assert.ok(!afterClientRestart.events.some(item => item.id === created.id));
  assert.ok(afterClientRestart.accounts.some(item => item.id === tenantA.accountId));
  assert.ok(afterClientRestart.cards.some(item => item.id === tenantA.cardId));
  assert.ok(afterClientRestart.payables.some(item => item.id === tenantA.payableId));

  for (const requiredPath of [
    '/auth/login',
    '/auth/refresh',
    '/finance/accounts',
    '/finance/events/month',
    '/finance/summary',
    '/cards',
    '/payables',
    '/app-state',
  ]) {
    assert.ok(requestedPaths.includes(requiredPath), 'WEB_PATH_NOT_EXERCISED: ' + requiredPath);
  }
  assert.equal(await prisma.user.count(), 3);
  assert.equal(await prisma.workspace.count(), 2);
  assert.equal(await prisma.workspaceMember.count(), 2);

  console.log(JSON.stringify({
    gate: 'MEG_STAGE10_FINAL_WEB_API_PG17',
    result: 'PASS',
    database: { host: DATABASE.hostname, port: DATABASE.port, name: DB_NAME, version: 17 },
    api: { host: bound.hostname, automaticRoutines: false, cors: 'PASS' },
    web: {
      viteApiUrl: apiOrigin,
      login: 'PASS',
      refresh: 'PASS',
      reads: ['accounts', 'events', 'balances', 'cards', 'pending'],
      clientRestart: 'PASS',
    },
    isolation: { workspaces: 2, noWorkspaceDenied: 403, crossWorkspaceWriteDenied: 404 },
    integrity: {
      persistence: 'PASS',
      ledger: 'PASS',
      idempotentReplay: 'PASS',
      canonicalBalance: 'PASS',
      edit: 'PASS',
      archiveReversal: 'PASS',
      appStateContractWithoutAndroid: 'PASS',
    },
    networkDestinations: [new URL(apiOrigin).origin],
  }));
} finally {
  if (nativeFetch) globalThis.fetch = nativeFetch;
  await vite?.close();
  await app.close();
  await prisma.$disconnect();
}
