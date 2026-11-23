/**
 * PT109: somente PG17 sintético com identidade estrita, API/Fastify/JWT real.
 * Testa exclusivamente o novo guard da restauração retroativa PT107.
 * Não executa Android nem escreve em bancos protegidos ou produção.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { LicenseStatus, Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from './routes';

const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1'
  || url.port !== '55459' || url.pathname !== '/meg_stage10_sandbox'
  || url.username !== 'meg_stage10_ci'
  || process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || process.env.MEG_STAGE10_LEGACY_RESTORE_QA !== '1'
  || process.env.MEG_STAGE10_PT109_SYNTHETIC !== '1'
  || process.env.NODE_ENV !== 'test') {
  throw new Error('PT109_REQUIRES_EXCLUSIVE_SYNTHETIC_PG17');
}

let app: ReturnType<typeof fastify> | undefined;
try {
  const suffix = randomUUID();
  const user = await prisma.user.create({ data: {
    email: 'pt109-' + suffix + '@example.invalid',
    name: 'Proprietario ficticio PT109',
    passwordHash: await bcrypt.hash('Synthetic-PT109-' + suffix, 10),
    role: UserRole.ADMIN, status: UserStatus.ACTIVE,
    isActive: true, approvedAt: new Date(),
  } });
  const plan = await prisma.plan.create({ data: {
    code: 'PT109-' + suffix, name: 'Plano ficticio PT109', monthlyPrice: 0,
    maxMembers: 2, features: [],
  } });
  const workspace = await prisma.workspace.create({ data: {
    ownerId: user.id, name: 'PT109 Synthetic', slug: 'pt109-' + suffix,
    members: { create: { userId: user.id, role: UserRole.ADMIN,
      status: UserStatus.ACTIVE, isActive: true } },
    subscription: { create: { planId: plan.id, status: LicenseStatus.ACTIVE } },
    appState: { create: { userId: user.id, revision: 1,
      state: { transactions: [], budgets: {},
        __megNormalization: { mode: 'normalized-primary' } } as Prisma.InputJsonValue } },
  } });
  const account = await prisma.account.create({ data: {
    userId: user.id, name: 'Conta monetaria ficticia',
    type: 'checking', openingBalance: 100,
  } });
  const category = await prisma.category.create({ data: {
    userId: user.id, name: 'Mercado PT109', group: 'CONTAS GERAIS', type: 'expense',
  } });
  const method = await prisma.paymentMethod.create({ data: {
    userId: user.id, name: 'PIX PT109', type: 'instant',
  } });
  const legacyId = 'pt109-archived-' + suffix;
  const futureId = 'pt109-future-' + suffix;
  const transaction = (id: string, day: string, amount: number) => ({
    id, date: day, description: 'Despesa ficticia PT109',
    type: 'expense', amount, expenseAmount: amount,
    status: 'paid', situation: 'PAGO',
    category: 'Mercado PT109', group: 'CONTAS GERAIS',
    paymentMethod: 'PIX PT109', modality: 'À VISTA',
    financialAccountId: account.id,
  });
  const archivedPayload = transaction(legacyId, '2026-11-10', 20);
  const futurePayload = transaction(futureId, '2026-11-20', 90);
  const state = { transactions: [futurePayload], budgets: {},
    __megNormalization: { mode: 'normalized-primary' } };
  await prisma.appState.update({ where: { workspaceId: workspace.id },
    data: { state: state as Prisma.InputJsonValue } });
  const archivedAt = new Date('2026-11-21T12:00:00.000Z');
  const archived = await prisma.financialEvent.create({ data: {
    userId: user.id, workspaceId: workspace.id, legacyTransactionId: legacyId,
    description: archivedPayload.description, type: 'expense', status: 'paid',
    date: new Date('2026-11-10T12:00:00Z'), competence: '2026-11',
    amount: 20, signedAmount: -20, accountId: account.id,
    categoryId: category.id, paymentMethodId: method.id,
    sourcePayload: archivedPayload, archivedAt,
  } });
  await prisma.financialEvent.create({ data: {
    userId: user.id, workspaceId: workspace.id, legacyTransactionId: futureId,
    description: futurePayload.description, type: 'expense', status: 'paid',
    date: new Date('2026-11-20T12:00:00Z'), competence: '2026-11',
    amount: 90, signedAmount: -90, accountId: account.id,
    categoryId: category.id, paymentMethodId: method.id,
    sourcePayload: futurePayload,
  } });
  app = fastify({ logger: false });
  await registerAuth(app);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(appStateRoutes, { prefix: '/app-state' });
  await app.ready();
  const login = await app.inject({ method: 'POST', url: '/auth/login',
    payload: { email: user.email, password: 'Synthetic-PT109-' + suffix } });
  assert.equal(login.statusCode, 200, login.body);
  const token = (login.json() as { accessToken: string }).accessToken;
  assert.ok(token);
  console.log('PT109_REAL_JWT=PASS');

  const getPreview = async () => app!.inject({ method: 'GET',
    url: '/app-state/legacy-restore/' + legacyId,
    headers: { authorization: 'Bearer ' + token } });
  const postRestore = async (payload: Record<string, unknown>) => app!.inject({
    method: 'POST', url: '/app-state/legacy-restore/' + legacyId,
    headers: { authorization: 'Bearer ' + token }, payload,
  });
  const preview = await getPreview();
  assert.equal(preview.statusCode, 200, preview.body);
  const intent = preview.json() as {
    eligible: boolean; eventId: string; expectedRevision: number;
    expectedArchivedAt: string; expectedUpdatedAt: string;
  };
  assert.equal(intent.eligible, true, preview.body);
  const payloadRestore = {
    operationId: randomUUID(), eventId: intent.eventId,
    expectedRevision: intent.expectedRevision,
    expectedArchivedAt: intent.expectedArchivedAt,
    expectedUpdatedAt: intent.expectedUpdatedAt,
    confirmation: 'CONFIRMAR_RESTAURACAO_EXPLICITA',
  };
  const failure = await postRestore(payloadRestore);
  assert.equal(failure.statusCode, 409, failure.body);
  assert.equal((failure.json() as { error: string }).error,
    'RESTORE_INSUFFICIENT_MONETARY_BALANCE');
  const afterFail = await prisma.financialEvent.findUniqueOrThrow({
    where: { id: archived.id },
  });
  assert.equal(afterFail.archivedAt?.toISOString(), archivedAt.toISOString());
  assert.equal(afterFail.id, archived.id);
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: archived.id } }), 0);
  assert.equal((await prisma.appState.findUniqueOrThrow({
    where: { workspaceId: workspace.id },
  })).revision, 1);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id },
  }), 0);
  assert.equal(await prisma.auditLog.count({
    where: { entityId: archived.id },
  }), 0);
  console.log('PT109_FUTURE_NEGATIVE_HTTP_409_NO_WRITE=PASS');
  console.log('PT109_FAILURE_ROLLBACK_APPSTATE_LEDGER_RECEIPT_AUDIT=PASS');

  // Modifica somente a fixture descartável: R$10 de despesa permite saldo
  // posterior zero (100-90-10). Não repete testes PT77/78; valida o boundary.
  const adjustedPayload = transaction(legacyId, '2026-11-10', 10);
  await prisma.financialEvent.update({ where: { id: archived.id },
    data: { amount: 10, signedAmount: -10, sourcePayload: adjustedPayload } });
  const nextPreview = await getPreview();
  assert.equal(nextPreview.statusCode, 200, nextPreview.body);
  const nextIntent = nextPreview.json() as typeof intent;
  assert.equal(nextIntent.eligible, true);
  const allowedPayload = {
    ...payloadRestore, operationId: randomUUID(),
    expectedRevision: nextIntent.expectedRevision,
    expectedArchivedAt: nextIntent.expectedArchivedAt,
    expectedUpdatedAt: nextIntent.expectedUpdatedAt,
  };
  const allowed = await postRestore(allowedPayload);
  assert.equal(allowed.statusCode, 200, allowed.body);
  assert.equal((allowed.json() as { id: string }).id, archived.id);
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: archived.id } }), 1);
  assert.equal((await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } })).revision, 2);
  const replay = await postRestore(allowedPayload);
  assert.equal(replay.statusCode, 200, replay.body);
  assert.equal((replay.json() as { idempotentReplay: boolean }).idempotentReplay, true);
  assert.equal(await prisma.ledgerEntry.count({ where: { eventId: archived.id } }), 1);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: workspace.id },
  }), 1);
  console.log('PT109_ZERO_BALANCE_BOUNDARY_HTTP_ACCEPTED=PASS');
  console.log('PT109_REPLAY_SAME_OPERATION_SINGLE_LEDGER=PASS');
  console.log('PT109_RESULT=PASS');
} finally {
  if (app) await app.close();
  await prisma.$disconnect();
}
