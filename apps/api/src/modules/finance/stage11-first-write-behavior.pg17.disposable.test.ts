/**
 * MEG #699 Stage11 first-write, real Fastify/JWT/PostgreSQL 17 disposable QA.
 * Never connect to protected PostgreSQL or execute outside explicitly flagged QA.
 * Founder: provenance, actor, timestamp, origin/channel, immutable audit.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, UserRole, UserStatus, LicenseStatus } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { financeRoutes } from './routes';

const database = new URL(process.env.DATABASE_URL || 'https://invalid');
assert.ok(
  process.env.GITHUB_ACTIONS === 'true'
  && process.env.GITHUB_REPOSITORY === 'MarcosVilalva/MEG-Platform'
  && process.env.MEG_STAGE10_ISOLATED_PG === '1'
  && process.env.MEG_STAGE11_FIRST_WRITE_SYNTHETIC === '1'
  && process.env.NODE_ENV === 'test'
  && process.env.MEG_STAGE10_ISSUE699_A17_REVIEW_ENABLED !== '1'
  && database.protocol === 'postgresql:'
  && database.hostname === '127.0.0.1'
  && database.port === '5432'
  && database.pathname === '/meg_stage11_first_write_sandbox'
  && database.username === 'meg_stage10_ci',
  'STAGE11_FIRST_WRITE_PROTECTED_DB_FORBIDDEN'
);

const tag = randomUUID();
const password = 'stage11-first-write-fake-' + tag;
async function syntheticWorkspace(name: string) {
  const user = await prisma.user.create({data: {
    email: `first-write-${name}-${tag}@example.invalid`.toLowerCase(), name: `FAKE ${name}`,
    passwordHash: await bcrypt.hash(password, 8),
    role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true,
    approvedAt: new Date(),
  }});
  const plan = await prisma.plan.create({data: {
    code: `FW-${name}-${tag}`, name: 'first-write synthetic',
    monthlyPrice: 0, maxMembers: 3, features: [],
  }});
  const workspace = await prisma.workspace.create({data: {
    ownerId: user.id, slug: `fw-${name}-${tag}`, name: `FAKE ${name}`,
    members: {create: {userId: user.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true}},
    subscription: {create: {planId: plan.id, status: LicenseStatus.ACTIVE}},
    appState: {create: {userId: user.id, revision: 1,
      state: {transactions: [], budgets: {}, __megNormalization: {mode: 'normalized-primary'}} as Prisma.InputJsonValue}},
  }});
  const account = await prisma.account.create({data: {
    userId: user.id, name: 'TEST ACCOUNT', type: 'checking', openingBalance: 10000, isActive: true,
  }});
  const category = await prisma.category.create({data: {
    userId: user.id, name: 'TEST CATEGORY', type: 'expense', group: 'TEST', isActive: true,
  }});
  const method = await prisma.paymentMethod.create({data: {
    userId: user.id, name: 'TEST PIX', type: 'instant', isActive: true,
  }});
  return {user, workspace, account, category, method};
}

const app = Fastify({logger: false});
let listening = false;
try {
  const a = await syntheticWorkspace('A');
  const b = await syntheticWorkspace('B');
  await registerAuth(app);
  await app.register(authRoutes, {prefix: '/auth'});
  await app.register(financeRoutes, {prefix: '/finance'});
  await app.listen({host: '127.0.0.1', port: 33569});
  listening = true;
  const root = 'http://127.0.0.1:33569';
  async function unpack(response: Response) {
    return {status: response.status, body: await response.json() as any};
  }
  async function login(email: string) {
    const result = await unpack(await fetch(root + '/auth/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password}),
    }));
    assert.equal(result.status, 200, JSON.stringify(result));
    return result.body.accessToken as string;
  }
  const jwtA = await login(a.user.email);
  const jwtB = await login(b.user.email);
  async function create(token: string, expectedWorkspaceId: string, input: Record<string, unknown>) {
    return unpack(await fetch(root + '/finance/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        'X-MEG-Expected-Workspace-Id': expectedWorkspaceId,
      },
      body: JSON.stringify(input),
    }));
  }
  function payload(owner: typeof a, opId: string, label: string, changes: Record<string,unknown> = {}) {
    return {operationId: opId, description: label, type: 'expense', status: 'paid',
      date: '2026-11-24', competence: '2026-11', amount: 7.49,
      accountId: owner.account.id, categoryId: owner.category.id,
      paymentMethodId: owner.method.id, notes: 'STAGE11_FAKE_DATA', ...changes};
  }
  const counts = async (wsId: string) => ({
    events: await prisma.financialEvent.count({where: {workspaceId: wsId}}),
    ledgers: await prisma.ledgerEntry.count({where: {event: {workspaceId: wsId}}}),
    receipts: await prisma.cloudMutationReceipt.count({where: {workspaceId: wsId, mutationType: 'FINANCIAL_EVENT_CREATE'}}),
  });
  async function assertCreateAudit(id: string, actorId: string, workspaceId: string, opId: string) {
    const rows = await prisma.auditLog.findMany({where: {
      entity: 'FinancialEvent', entityId: id, action: 'FINANCIAL_EVENT_CREATED',
    }});
    assert.equal(rows.length, 1, 'Each persisted event must have exactly one creation audit');
    const audit = rows[0];
    assert.equal(audit.userId, actorId, 'Author must be authenticated actor');
    assert.ok(audit.createdAt instanceof Date && Number.isFinite(audit.createdAt.getTime()), 'Audit timestamp');
    const data = JSON.parse(audit.metadata || '{}');
    assert.equal(data.schemaVersion, 1);
    assert.equal(data.context?.operationId, opId);
    assert.equal(data.context?.workspaceId, workspaceId);
    assert.equal(data.after?.id, id);
    assert.equal(data.after?.workspaceId, workspaceId);
    const persisted = await prisma.financialEvent.findUniqueOrThrow({where: {id}});
    assert.equal(persisted.workspaceId, workspaceId);
    assert.equal(persisted.userId, actorId);
    assert.ok(Number.isFinite(persisted.createdAt.getTime()), 'Event creation timestamp');
    return data;
  }
  function ok(name: string, value: Record<string, unknown>) {
    console.log('STAGE11_FIRST_WRITE_' + name + '=PASS ' + JSON.stringify(value));
  }

  const opSame = randomUUID();
  const sameRequest = payload(a, opSame, 'same-intent-concurrent');
  const beforeSame = await counts(a.workspace.id);
  const [first, second] = await Promise.all([
    create(jwtA, a.workspace.id, sameRequest), create(jwtA, a.workspace.id, sameRequest),
  ]);
  assert.deepEqual([first.status, second.status], [201, 201], JSON.stringify([first, second]));
  assert.equal(first.body.id, second.body.id);
  assert.equal(new Set([first.body.idempotentReplay, second.body.idempotentReplay]).size, 2,
    'One writer creates, one obtains idempotent replay');
  const afterSame = await counts(a.workspace.id);
  assert.equal(afterSame.events - beforeSame.events, 1);
  assert.equal(afterSame.ledgers - beforeSame.ledgers, 1);
  assert.equal(afterSame.receipts - beforeSame.receipts, 1);
  const sourceAudit = await assertCreateAudit(first.body.id, a.user.id, a.workspace.id, opSame);
  ok('SAME_OPERATION_CONCURRENT', {requests: 2, events: 1, ledgers: 1, receipts: 1, audits: 1});

  const repeat = await create(jwtA, a.workspace.id, sameRequest);
  assert.equal(repeat.status, 201, JSON.stringify(repeat));
  assert.equal(repeat.body.idempotentReplay, true);
  assert.equal(repeat.body.id, first.body.id);
  assert.deepEqual(await counts(a.workspace.id), afterSame);
  await assertCreateAudit(first.body.id, a.user.id, a.workspace.id, opSame);
  const tampered = await create(jwtA, a.workspace.id, {...sameRequest, amount: 7.50});
  assert.equal(tampered.status, 409, JSON.stringify(tampered));
  assert.equal(tampered.body.error, 'OPERATION_ID_REUSED');
  assert.deepEqual(await counts(a.workspace.id), afterSame);
  ok('REPLAY_NO_EXTRA_WRITE', {status: repeat.status, idempotentReplay: true, changedPayload: tampered.status});

  const beforeDistinct = await counts(a.workspace.id);
  const opA = randomUUID(), opB = randomUUID();
  const [distinctA, distinctB] = await Promise.all([
    create(jwtA, a.workspace.id, payload(a, opA, 'distinct-concurrent-A')),
    create(jwtA, a.workspace.id, payload(a, opB, 'distinct-concurrent-B')),
  ]);
  assert.equal(distinctA.status, 201, JSON.stringify(distinctA));
  assert.equal(distinctB.status, 201, JSON.stringify(distinctB));
  assert.notEqual(distinctA.body.id, distinctB.body.id);
  const afterDistinct = await counts(a.workspace.id);
  assert.equal(afterDistinct.events - beforeDistinct.events, 2);
  assert.equal(afterDistinct.ledgers - beforeDistinct.ledgers, 2);
  assert.equal(afterDistinct.receipts - beforeDistinct.receipts, 2);
  await assertCreateAudit(distinctA.body.id, a.user.id, a.workspace.id, opA);
  await assertCreateAudit(distinctB.body.id, a.user.id, a.workspace.id, opB);
  ok('DISTINCT_OPERATIONS_CONCURRENT', {events: 2, ledgers: 2, receipts: 2, audits: 2});

  const beforeWrongA = await counts(a.workspace.id);
  const beforeWrongB = await counts(b.workspace.id);
  const wrong = await create(jwtA, b.workspace.id, payload(a, randomUUID(), 'wrong-workspace'));
  assert.equal(wrong.status, 409, JSON.stringify(wrong));
  assert.equal(wrong.body.error, 'WORKSPACE_CONTEXT_CHANGED');
  assert.deepEqual(await counts(a.workspace.id), beforeWrongA, 'No write in actor workspace');
  assert.deepEqual(await counts(b.workspace.id), beforeWrongB, 'No write in target workspace');
  const wrongAudits = await prisma.auditLog.count({where: {
    action: 'FINANCIAL_EVENT_CREATED', userId: a.user.id,
  }});
  assert.equal(wrongAudits, 3, 'Denied write creates no financial creation audit');
  const opBWorkspace = randomUUID();
  const createdB = await create(jwtB, b.workspace.id, payload(b, opBWorkspace, 'B-authorized'));
  assert.equal(createdB.status, 201, JSON.stringify(createdB));
  await assertCreateAudit(createdB.body.id, b.user.id, b.workspace.id, opBWorkspace);
  assert.equal((await counts(b.workspace.id)).events, 1);
  ok('WORKSPACE_MISMATCH_NO_WRITE', {rejectedStatus: wrong.status, eventsInA: beforeWrongA.events, eventsInBAfterAuthorized: 1});

  // Founder §4.1: source/canal must be identifiable in every finance record.
  // This is an independent requirement. It does not prove a concurrency defect.
  const channel = sourceAudit?.context?.sourceChannel ?? sourceAudit?.context?.origin ?? sourceAudit?.context?.channel;
  assert.ok(typeof channel === 'string' && channel.length > 0,
    'FOUNDER_SECTION_4_ORIGIN_CHANNEL_MISSING_IN_CREATE_AUDIT');
  ok('ORIGIN_CHANNEL_TRACEABILITY', {channel});

  console.log('STAGE11_FIRST_WRITE_ALL_BEHAVIOR_GATES=PASS');
} finally {
  if (listening) await app.close();
  await prisma.$disconnect();
  console.log('STAGE11_FIRST_WRITE_DISPOSABLE_CLIENT_CLOSED=PASS');
}
