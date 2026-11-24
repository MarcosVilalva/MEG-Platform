import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { LicenseStatus, Prisma, prisma, UserRole, UserStatus } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { financeRoutes } from './routes';
import { financeBenefitEventRoutes } from './benefit-event-routes';
import { createQaFaultProxy } from '../../../../../scripts/meg-stage10-qa-fault-proxy.mjs';

/**
 * Gate NOVO: proxy HTTP local verdadeiro + JWT + writers canônicos + PG17.
 * Não repete o teste de troca de versões, build da API ou APK.
 * Nunca aponta para banco de produção nem usa titulares reais.
 */
const dbUrl = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || process.env.MEG_STAGE10_QA_LOCAL_ONLY !== '1'
  || dbUrl.hostname !== '127.0.0.1'
  || dbUrl.port !== '5432'
  || dbUrl.pathname !== '/meg_stage10_sandbox'
  || dbUrl.username !== 'meg_stage10_ci') {
  throw new Error('STAGE10_QA_PROXY_PG17_ONLY');
}

const stamp = 'stage10-fault-' + randomUUID().slice(0, 12);
const password = 'Synthetic-QA-Only-2026-Not-Production';
let ownerId: string | null = null;
let planId: string | null = null;
let workspaceId: string | null = null;
const app = fastify();

async function main() {
  try {
    const user = await prisma.user.create({ data: {
      email: stamp + '@meg.test', name: 'Conta QA fictícia',
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true, approvedAt: new Date(),
    } });
    ownerId = user.id;
    const plan = await prisma.plan.create({ data: {
      code: stamp, name: 'Plano QA descartável', monthlyPrice: 0, maxMembers: 2, features: [],
    } });
    planId = plan.id;
    const workspace = await prisma.workspace.create({ data: {
      name: 'Workspace QA proxy descartável', slug: stamp, ownerId: user.id,
      members: { create: { userId: user.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true } },
      appState: { create: { userId: user.id, revision: 1,
        state: { transactions: [], budgets: {}, __megNormalization: { mode: 'normalized-primary' } } as Prisma.InputJsonValue,
      } },
      subscription: { create: { planId: plan.id, status: LicenseStatus.ACTIVE } },
    } });
    workspaceId = workspace.id;
    const monetaryAccount = await prisma.account.create({ data: {
      userId: user.id, name: 'Conta QA', type: 'checking', openingBalance: 100,
    } });
    const category = await prisma.category.create({ data: {
      userId: user.id, name: 'Mercado QA', group: 'ALIMENTACAO', type: 'expense',
    } });
    const pix = await prisma.paymentMethod.create({ data: {
      userId: user.id, name: 'PIX', type: 'instant',
    } });
    const benefitAccount = await prisma.account.create({ data: {
      userId: user.id, name: 'Conta Benefício QA', type: 'benefit', openingBalance: 0,
    } });
    const verocard = await prisma.paymentMethod.create({ data: {
      userId: user.id, name: 'Verocard', type: 'other',
    } });

    await registerAuth(app);
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(financeRoutes, { prefix: '/finance' });
    await app.register(financeBenefitEventRoutes, { prefix: '/finance' });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('API_QA_INVALID_LOOPBACK_ADDRESS');
    const apiPort = address.port;
    assert.equal(address.address, '127.0.0.1');
    const login = await fetch(`http://127.0.0.1:${apiPort}/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user.email, password }),
    });
    assert.equal(login.status, 200);
    const token = (await login.json()).accessToken as string;
    assert.ok(token && token.split('.').length === 3);

    async function verifyLostResponse(
      path: '/finance/events' | '/finance/benefit-events',
      payload: Record<string, unknown>,
      accountId: string,
    ) {
      const messages: string[] = [];
      const proxy = createQaFaultProxy({
        upstreamPort: apiPort, listenPort: 0, dropPath: path,
        log: (message: string) => messages.push(message),
      });
      proxy.server.listen(0, '127.0.0.1');
      await once(proxy.server, 'listening');
      const proxyAddress = proxy.server.address();
      if (!proxyAddress || typeof proxyAddress === 'string') throw new Error('PROXY_NOT_LOOPBACK');
      assert.equal(proxyAddress.address, '127.0.0.1');
      const post = () => fetch(`http://127.0.0.1:${proxyAddress.port}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
      try {
        const before = await prisma.financialEvent.count({ where: { workspaceId: workspace.id, accountId } });
        let unexpectedlyReturned = false;
        try {
          const initialResponse = await post();
          unexpectedlyReturned = true;
          const initialError = await initialResponse.json().catch(() => ({})) as { error?: string };
          throw new Error(`QA_PROXY_EXPECTED_CONNECTION_DROP_BUT_RECEIVED_STATUS_${initialResponse.status}_${initialError.error || 'NO_ERROR_CODE'}`);
        } catch (error) {
          if (unexpectedlyReturned) throw error;
          assert.match(String(error), /fetch failed|terminated|aborted|socket/i);
        }
        assert.equal(proxy.wasDropped(), true, 'Proxy descartou resposta 2xx do writer');
        const afterCommit = await prisma.financialEvent.findMany({
          where: { workspaceId: workspace.id, accountId }, include: { ledgerEntries: true },
        });
        assert.equal(afterCommit.length, before + 1);
        const row = afterCommit.find((item) => item.description === payload.description);
        assert.ok(row, 'O evento foi persistido antes da resposta sumir');
        assert.equal(row.ledgerEntries.length, 1, 'Uma e somente uma entrada contábil');
        const replay = await post();
        assert.equal(replay.status, 201);
        const answer = await replay.json();
        assert.equal(answer.id, row.id);
        assert.equal(answer.idempotentReplay, true);
        assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id, accountId } }), before + 1);
        assert.equal(await prisma.ledgerEntry.count({ where: { eventId: row.id } }), 1);
        assert.equal(messages.filter((m) => m.includes('QA_FAULT_DROP_AFTER_COMMIT')).length, 1);
        console.log('MEG_STAGE10_QA_PG17_FAULT_PROXY_' + (path.endsWith('benefit-events') ? 'BENEFIT' : 'MONETARY') + '=PASS');
      } finally {
        proxy.server.closeAllConnections();
        await new Promise<void>((resolve) => proxy.server.close(() => resolve()));
      }
    }

    await verifyLostResponse('/finance/events', {
      operationId: randomUUID(), description: 'Despesa QA proxy',
      type: 'expense', status: 'paid', date: '2026-11-11', amount: 12.35,
      accountId: monetaryAccount.id, categoryId: category.id, paymentMethodId: pix.id,
    }, monetaryAccount.id);
    await verifyLostResponse('/finance/benefit-events', {
      operationId: 'phoenix-benefit-' + randomUUID(), description: 'Recarga QA proxy',
      type: 'income', date: '2026-11-11', amount: 25,
      accountId: benefitAccount.id, paymentMethodId: verocard.id,
    }, benefitAccount.id);

    const monetary = await prisma.financialEvent.findMany({
      where: { workspaceId: workspace.id, accountId: monetaryAccount.id },
    });
    const benefit = await prisma.financialEvent.findMany({
      where: { workspaceId: workspace.id, accountId: benefitAccount.id },
    });
    assert.equal(monetary.length, 1);
    assert.equal(benefit.length, 1);
    assert.equal(await prisma.ledgerEntry.count({ where: { event: { workspaceId: workspace.id } } }), 2);
    console.log('MEG_STAGE10_QA_PG17_FAULT_PROXY_FINANCIAL_ISOLATION=PASS');
  } finally {
    await app.close();
    if (workspaceId) {
      await prisma.ledgerEntry.deleteMany({ where: { event: { workspaceId } } });
      await prisma.workspace.delete({ where: { id: workspaceId } });
    }
    if (planId) await prisma.plan.delete({ where: { id: planId } });
    if (ownerId) await prisma.user.delete({ where: { id: ownerId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('MEG_STAGE10_QA_PG17_FAULT_PROXY=FAILED', error);
  process.exitCode = 1;
});
