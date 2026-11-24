/**
 * PT110: segurança da recuperação por operationId no QA.
 * Somente PostgreSQL descartável 127.0.0.1:55459/meg_stage10_sandbox.
 * Sem Android, produção ou rede externa.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { LicenseStatus, Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { financeRoutes } from './routes';

const uri = new URL(process.env.DATABASE_URL || 'http://invalid');
if (uri.protocol !== 'postgresql:' || uri.hostname !== '127.0.0.1'
    || uri.port !== '55459' || uri.pathname !== '/meg_stage10_sandbox'
    || uri.username !== 'meg_stage10_ci'
    || process.env.MEG_STAGE10_ISOLATED_PG !== '1'
    || process.env.MEG_STAGE10_WEB_WRITE_QA !== '1'
    || process.env.MEG_STAGE10_PT110_SYNTHETIC !== '1'
    || process.env.NODE_ENV !== 'test') {
  throw new Error('PT110_REQUIRES_EXCLUSIVE_PG17_SYNTHETIC');
}
const stamp = randomUUID();
const password = 'PT110-Test-' + stamp;
let app: ReturnType<typeof fastify> | undefined;
try {
  const createPerson = async (suffix: string) => prisma.user.create({ data: {
    name: 'QA Actor ' + suffix,
    email: 'pt110-' + suffix + '-' + stamp + '@example.invalid',
    passwordHash: await bcrypt.hash(password, 10),
    role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true,
    approvedAt: new Date(),
  } });
  const ownerA = await createPerson('owner-a');
  const ownerB = await createPerson('owner-b');
  const viewer = await createPerson('viewer');
  const plan = await prisma.plan.create({ data: {
    code: 'PT110-' + stamp, name: 'Plan QA PT110',
    monthlyPrice: 0, maxMembers: 5, features: [],
  } });
  const createWorkspace = async (owner: typeof ownerA, suffix: string, withViewer: boolean) =>
    prisma.workspace.create({ data: {
      ownerId: owner.id, slug: 'pt110-' + suffix + '-' + stamp,
      name: 'Tenant QA ' + suffix,
      members: { create: [
        { userId: owner.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true },
        ...(withViewer ? [{ userId: viewer.id, role: UserRole.VIEWER,
          status: UserStatus.ACTIVE, isActive: true }] : []),
      ] },
      subscription: { create: { planId: plan.id, status: LicenseStatus.ACTIVE } },
      appState: { create: { userId: owner.id, revision: 1,
        state: { transactions: [], budgets: {},
          __megNormalization: { mode: 'normalized-primary' } } as Prisma.InputJsonValue } },
    } });
  const wa = await createWorkspace(ownerA, 'a', true);
  const wb = await createWorkspace(ownerB, 'b', false);
  const catalog = async (owner: typeof ownerA) => {
    const account = await prisma.account.create({ data: {
      userId: owner.id, name: 'Synthetic Account', type: 'checking', openingBalance: 900,
    } });
    const category = await prisma.category.create({ data: {
      userId: owner.id, name: 'Expense QA', group: 'CONTAS GERAIS', type: 'expense',
    } });
    const payment = await prisma.paymentMethod.create({ data: {
      userId: owner.id, name: 'PIX PT110', type: 'instant',
    } });
    return { account, category, payment };
  };
  const catA = await catalog(ownerA);
  const catB = await catalog(ownerB);
  app = fastify({ logger: false });
  await registerAuth(app);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(financeRoutes, { prefix: '/finance' });
  await app.ready();
  const token = async (owner: typeof ownerA) => {
    const r = await app!.inject({ method: 'POST', url: '/auth/login',
      payload: { email: owner.email, password } });
    assert.equal(r.statusCode, 200, r.body);
    return (r.json() as { accessToken: string }).accessToken;
  };
  const ta = await token(ownerA);
  const tb = await token(ownerB);
  const tv = await token(viewer);
  console.log('PT110_REAL_JWT_THREE_DISTINCT_ACTORS=PASS');

  const sameOperationId = randomUUID();
  const url = '/finance/events/stage10-qa-operation/' + sameOperationId + '?month=2026-11';
  const read = (jwt: string) => app!.inject({ method: 'GET',
    url, headers: { authorization: 'Bearer ' + jwt } });
  const create = (jwt: string, catalogItem: typeof catA, name: string) =>
    app!.inject({ method: 'POST', url: '/finance/events',
      headers: { authorization: 'Bearer ' + jwt },
      payload: {
        operationId: sameOperationId, date: '2026-11-20', type: 'expense',
        status: 'paid', description: name, amount: 12.37,
        accountId: catalogItem.account.id,
        categoryId: catalogItem.category.id,
        paymentMethodId: catalogItem.payment.id,
      } });

  const createdA = await create(ta, catA, 'PT110-A');
  assert.equal(createdA.statusCode, 201, createdA.body);
  const aid = (createdA.json() as { id: string }).id;
  const foundA = await read(ta);
  assert.equal(foundA.statusCode, 200, foundA.body);
  assert.deepEqual(foundA.json(), {
    status: 'found', operationId: sameOperationId, eventId: aid, date: '2026-11-20',
  });
  assert.equal(foundA.headers['cache-control'], 'private, no-store');
  console.log('PT110_OWNER_CAN_READ_OWN_OPERATION=PASS');

  const foreignWithoutReceipt = await read(tb);
  assert.equal(foreignWithoutReceipt.statusCode, 200);
  assert.equal((foreignWithoutReceipt.json() as { status: string }).status, 'pending');
  assert.ok(!foreignWithoutReceipt.body.includes(aid));
  console.log('PT110_FOREIGN_WORKSPACE_CANNOT_READ_OR_INFER_EVENT=PASS');

  // Global ADMIN but local VIEWER must fail before receipt/audit lookup.
  const viewerRead = await read(tv);
  assert.equal(viewerRead.statusCode, 403, viewerRead.body);
  assert.equal((viewerRead.json() as { error: string }).error,
    'STAGE10_QA_WORKSPACE_ADMIN_REQUIRED');
  assert.ok(!viewerRead.body.includes(aid));
  console.log('PT110_GLOBAL_ADMIN_LOCAL_VIEWER_DENIED=PASS');

  const createdB = await create(tb, catB, 'PT110-B');
  assert.equal(createdB.statusCode, 201, createdB.body);
  const bid = (createdB.json() as { id: string }).id;
  assert.notEqual(aid, bid);
  const foundB = await read(tb);
  assert.equal(foundB.statusCode, 200, foundB.body);
  assert.equal((foundB.json() as { eventId: string }).eventId, bid);
  assert.equal((await read(ta)).json().eventId, aid);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: wa.id, operationId: sameOperationId },
  }), 1);
  assert.equal(await prisma.cloudMutationReceipt.count({
    where: { workspaceId: wb.id, operationId: sameOperationId },
  }), 1);
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: wa.id } }), 1);
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: wb.id } }), 1);
  console.log('PT110_IDENTICAL_OPERATION_ID_TWO_WORKSPACES_ISOLATED=PASS');

  // Revoking the viewer must not invoke legacy bootstrap or disclose receipts.
  await prisma.workspaceMember.update({ where: {
    workspaceId_userId: { workspaceId: wa.id, userId: viewer.id },
  }, data: { isActive: false } });
  const revoked = await read(tv);
  assert.equal(revoked.statusCode, 403, revoked.body);
  assert.equal((revoked.json() as { error: string }).error, 'WORKSPACE_ACCESS_REQUIRED');
  console.log('PT110_REVOKED_WORKSPACE_MEMBER_DENIED_NO_BOOTSTRAP=PASS');
  console.log('PT110_RESULT=PASS');
} finally {
  if (app) await app.close();
  await prisma.$disconnect();
}
