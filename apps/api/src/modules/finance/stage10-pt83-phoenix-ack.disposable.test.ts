/**
 * PT83: caracterização Phoenix/API sem Android nem dados reais.
 * Executar APENAS no PG17 efêmero e com flags exclusivas PT83.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { build } from 'esbuild';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';
import { financeRoutes } from './routes';
import { LicenseStatus, Prisma, UserRole, UserStatus, prisma } from '@meg/database';

const url = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(url.protocol, 'postgresql:');
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.port, '55459');
assert.equal(url.pathname, '/meg_stage10_pt63_disposable');
assert.equal(url.username, 'meg_stage10_pt63_writer');
assert.equal(process.env.MEG_STAGE10_PT83_SYNTHETIC, '1');
assert.equal(process.env.NODE_ENV, 'test');

let app: ReturnType<typeof fastify> | undefined;
let exit = 1;
try {
  const suffix = randomUUID();
  const password = 'Synthetic-PT83-' + randomUUID();
  const user = await prisma.user.create({ data: {
    email: 'pt83-' + suffix + '@example.invalid',
    name: 'Titular sintético PT83',
    passwordHash: await bcrypt.hash(password, 10),
    role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true, approvedAt: new Date(),
  } });
  const plan = await prisma.plan.create({ data: {
    code: 'PT83-' + suffix, name: 'Plano sintético PT83', monthlyPrice: 0,
    maxMembers: 2, features: [],
  } });
  const workspace = await prisma.workspace.create({ data: {
    ownerId: user.id, name: 'PT83 Synthetic Workspace', slug: 'pt83-' + suffix,
    members: { create: { userId: user.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true } },
    appState: { create: { userId: user.id, revision: 1,
      state: { transactions: [], budgets: {}, __megNormalization: { mode: 'normalized-primary' } } as Prisma.InputJsonValue } },
    subscription: { create: { planId: plan.id, status: LicenseStatus.ACTIVE } },
  } });
  const account = await prisma.account.create({ data: {
    userId: user.id, name: 'Conta fictícia PT83', type: 'checking', openingBalance: 500,
  } });
  const category = await prisma.category.create({ data: {
    userId: user.id, name: 'Categoria PT83', group: 'CONTAS GERAIS', type: 'expense',
  } });
  const method = await prisma.paymentMethod.create({ data: {
    userId: user.id, name: 'PIX PT83', type: 'instant',
  } });
  app = fastify({ logger: false });
  await registerAuth(app);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(appStateRoutes, { prefix: '/app-state' });
  await app.register(financeRoutes, { prefix: '/finance' });
  await app.ready();
  const login = await app.inject({ method: 'POST', url: '/auth/login',
    payload: { email: user.email, password } });
  assert.equal(login.statusCode, 200);
  const jwt = (login.json() as { accessToken: string }).accessToken;
  assert.ok(jwt);
  console.log('PT83_REAL_JWT=PASS');

  const inject = async (route: string, methodName: string, payload?: unknown) =>
    app!.inject({ method: methodName as 'GET' | 'POST', url: route,
      headers: { authorization: 'Bearer ' + jwt },
      ...(payload === undefined ? {} : { payload }) });
  let networkFault: 'none' | 'drop-after-commit' | 'transient409' = 'none';
  let transientCount = 0;
  let readMode: 'pending' | 'matched' | 'missing' = 'pending';
  let releaseRead: ((value: unknown) => void) | undefined;
  let pendingRead = new Promise<unknown>(resolve => { releaseRead = resolve; });
  const history = async () => {
    const response = await inject('/finance/events/history-snapshot', 'GET');
    assert.equal(response.statusCode, 200);
    const body = response.json() as { kind: string; items: Array<{ id: string }> };
    assert.equal(body.kind, 'complete');
    return body.items;
  };
  const snapshot = async (excludeId?: string) => ({
    events: { items: (await history()).filter(x => x.id !== excludeId), total: 1, pageSize: 1 },
    summary: { month: '2026-11' }, analytics: { summary: { month: '2026-11' } },
  });
  const apiRequest = async (route: string, init: { method?: string; body?: string }) => {
    if (networkFault === 'transient409' && transientCount++ === 0) {
      throw Object.assign(new Error('STATE_CONFLICT'), { status: 409, retryable: true });
    }
    const response = await inject(route, init.method || 'GET',
      init.body === undefined ? undefined : JSON.parse(init.body));
    if (networkFault === 'drop-after-commit' && response.statusCode === 201) {
      throw new Error('PT83_RESPONSE_LOST_AFTER_COMMIT');
    }
    if (response.statusCode >= 400) {
      const error = response.json() as { error?: string; retryable?: boolean };
      throw Object.assign(new Error(error.error || 'HTTP_' + response.statusCode),
        { status: response.statusCode, retryable: error.retryable });
    }
    return response.json();
  };
  const globals = globalThis as typeof globalThis & { __pt83?: Record<string, unknown>; window?: unknown; CustomEvent?: unknown };
  globals.window = {
    location: { hostname: 'localhost' },
    dispatchEvent: () => undefined,
    setTimeout: (fn: (...args: unknown[]) => void, delay: number) => {
      const timer = setTimeout(fn, delay);
      timer.unref?.();
      return timer;
    },
  };
  globals.CustomEvent ||= class { constructor(public type: string, public options: unknown) {} };
  globals.__pt83 = {
    readSession: () => ({ user: { id: user.id }, accessToken: jwt }),
    request: apiRequest,
    peek: () => null,
    invalidate: async () => undefined,
    read: async () => {
      if (readMode === 'pending') return pendingRead;
      if (readMode === 'missing') return snapshot(committedId);
      return snapshot();
    },
  };
  const stubs: Record<string, string> = {
    '../../app/auth-client': `export const readSession=()=>globalThis.__pt83.readSession();
      export const authenticatedRequest=(p,i)=>globalThis.__pt83.request(p,i);`,
    '../../app/finance-client': `export const financeClient={
      createEvent:(p)=>globalThis.__pt83.request('/finance/events',{method:'POST',body:JSON.stringify(p)})};`,
    '../../app/cards-client': 'export const cardsClient={};',
    './load-phoenix-read-model': `export const invalidatePhoenixReadModelMonth=(m)=>globalThis.__pt83.invalidate(m);
      export const loadPhoenixReadModel=(m,o)=>globalThis.__pt83.read(m,o);
      export const peekPhoenixReadModel=(m)=>globalThis.__pt83.peek(m);`,
  };
  const source = path.resolve('apps/web/src/phoenix/data/phoenix-write-gateway.ts');
  const built = await build({
    entryPoints: [source], bundle: true, platform: 'node', format: 'esm', write: false,
    define: { 'import.meta.env': JSON.stringify({
      VITE_API_URL: 'http://127.0.0.1:3333',
      VITE_STAGE10_ANDROID_CONFIRMATION_QA: 'false',
      VITE_PHOENIX_SIMPLE_EVENT_WRITE: 'enabled',
      VITE_PHOENIX_BENEFIT_WRITE: 'enabled',
    }) },
    plugins: [{ name: 'pt83-transport-only', setup(plugin) {
      plugin.onResolve({ filter: /.*/ }, args =>
        Object.prototype.hasOwnProperty.call(stubs, args.path)
          ? { path: args.path, namespace: 'pt83' } : undefined);
      plugin.onLoad({ filter: /.*/, namespace: 'pt83' }, args =>
        ({ contents: stubs[args.path], loader: 'js' }));
    } }],
  });
  assert.equal(built.outputFiles?.length, 1);
  const moduleUri = 'data:text/javascript;base64,' +
    Buffer.from(built.outputFiles![0].text).toString('base64');
  const gateway = await import(moduleUri);
  console.log('PT83_REAL_PHOENIX_GATEWAY_BUNDLED=PASS');

  const input = (name: string, amount = 12.34) => ({
    description: name, type: 'expense' as const, status: 'paid' as const,
    date: '2026-11-21', amount, accountId: account.id,
    categoryId: category.id, paymentMethodId: method.id,
  });
  const prepared = gateway.preparePhoenixSimpleEvent(input('PT83 post-commit loss'));
  const originalId = prepared.operationId;
  const state: string[] = [];
  networkFault = 'drop-after-commit';
  const lost = await gateway.runPhoenixSimpleEventWrite(prepared, '2026-11',
    (s: { status: string }) => state.push(s.status));
  assert.equal(lost.status, 'error');
  assert.equal(lost.operationId, originalId);
  const afterLost = await prisma.financialEvent.findMany({ where: {
    workspaceId: workspace.id, description: 'PT83 post-commit loss',
  } });
  assert.equal(afterLost.length, 1);
  const committedId = afterLost[0].id;
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: committedId } }), 1);
  console.log('PT83_LOST_RESPONSE_AFTER_COMMIT=PASS');
  console.log('PT83_GATEWAY_ERROR_ON_LOST_ACK=OBSERVED');

  networkFault = 'none';
  const replay = await gateway.runPhoenixSimpleEventWrite(prepared, '2026-11',
    (s: { status: string }) => state.push(s.status));
  assert.equal(replay.status, 'accepted');
  assert.equal(replay.operationId, originalId);
  assert.equal(replay.event.id, committedId);
  assert.equal(await prisma.financialEvent.count({ where: {
    workspaceId: workspace.id, description: 'PT83 post-commit loss',
  } }), 1);
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: committedId } }), 1);
  assert.equal(state.includes('confirmed'), false);
  readMode = 'matched';
  releaseRead?.(await snapshot());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.includes('confirmed'), true);
  console.log('PT83_SAME_OPERATION_REPLAY_ONE_EVENT_ONE_LEDGER=PASS');
  console.log('PT83_ACCEPTED_BEFORE_READBACK_CONFIRMED_CALLBACK=PASS');

  const changed = await inject('/finance/events', 'POST', {
    ...input('PT83 post-commit loss', 13.75), operationId: originalId,
  });
  assert.equal(changed.statusCode, 409);
  assert.equal((changed.json() as { error: string }).error, 'OPERATION_ID_REUSED');
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: committedId } }), 1);
  console.log('PT83_HTTP_409_PERMANENT_NO_DUPLICATE=PASS');

  const transient = gateway.preparePhoenixSimpleEvent(input('PT83 409 transient'));
  networkFault = 'transient409';
  transientCount = 0;
  const first = await gateway.runPhoenixSimpleEventWrite(transient, '2026-11');
  assert.equal(first.status, 'error');
  assert.equal(await prisma.financialEvent.count({ where: {
    workspaceId: workspace.id, description: 'PT83 409 transient',
  } }), 0);
  networkFault = 'none';
  const second = await gateway.runPhoenixSimpleEventWrite(transient, '2026-11');
  assert.equal(second.status, 'accepted');
  assert.equal(await prisma.financialEvent.count({ where: {
    workspaceId: workspace.id, description: 'PT83 409 transient',
  } }), 1);
  console.log('PT83_INJECTED_TRANSIENT_409_SAME_KEY_RECOVERY=PASS');

  const restarted = await import(moduleUri + '#pt83-restart');
  const fromDurableHarness = restarted.preparePhoenixSimpleEvent(
    input('PT83 post-commit loss'), originalId);
  assert.equal(fromDurableHarness.operationId, originalId);
  const restartReplay = await restarted.runPhoenixSimpleEventWrite(fromDurableHarness, '2026-11');
  assert.equal(restartReplay.status, 'accepted');
  assert.equal(restartReplay.event.id, committedId);
  console.log('PT83_RESTART_REPLAY_WITH_EXTERNALLY_PRESERVED_KEY=PASS');
  console.log('PT83_APK708_NATIVE_DURABLE_KEY=NOT_PROVEN');

  // Caracterizar lacuna: callback nao valida pertença do ID ao snapshot.
  readMode = 'missing';
  pendingRead = Promise.resolve(await snapshot(committedId));
  const missingStates: Array<{ status: string; snapshot?: { events?: { items?: Array<{ id: string }> } } }> = [];
  const missing = await gateway.runPhoenixSimpleEventWrite(prepared, '2026-11',
    (s: { status: string; snapshot?: { events?: { items?: Array<{ id: string }> } } }) => missingStates.push(s));
  console.log('PT83_MISSING_READBACK_RETURN=' + missing.status);
  assert.equal(missing.status, 'accepted');
  for (let i = 0; i < 100 && !missingStates.some(s => s.status === 'confirmed'); i++) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  console.log('PT83_MISSING_READBACK_STATES=' + missingStates.map(s => s.status).join(','));
  const improperlyConfirmed = missingStates.find(s => s.status === 'confirmed');
  assert.ok(improperlyConfirmed, 'PT83_CALLBACK_NOT_OBSERVED');
  assert.equal(improperlyConfirmed.snapshot?.events?.items?.some(x => x.id === committedId), false);
  console.log('PT83_GATEWAY_CONFIRMS_SNAPSHOT_WITHOUT_EVENT_ID=DETECTED');
  console.log('PT83_READBACK_ID_VERIFICATION=GAP');
  console.log('PT83_RESULT=CHARACTERIZED_WITH_P0_GAP');
  exit = 0;
} finally {
  if (app) await app.close();
  await prisma.$disconnect();
  console.log('PT83_FASTIFY_AND_PRISMA_CLOSED=PASS');
}
process.exitCode = exit;
