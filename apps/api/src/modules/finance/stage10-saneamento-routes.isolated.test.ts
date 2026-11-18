import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import { LicenseStatus, Prisma, prisma, UserRole, UserStatus } from '@meg/database';
import { appStateRoutes } from '../app-state/routes';

/**
 * Teste real de roteamento HTTP Fastify.inject, com identidade autenticada
 * SIMULADA e PostgreSQL 17 descartavel. NAO valida JWT real da aplicacao.
 */
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || !['127.0.0.1', 'localhost'].includes(url.hostname)
  || url.pathname !== '/meg_stage10_sandbox'
  || url.username !== 'meg_stage10_ci') {
  throw new Error('STAGE10_QA_DISPOSABLE_ONLY');
}

const stamp = 'stage10-http-p0-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const legacyId = 'legacy-' + stamp;
const stateTransaction = {
  id: legacyId, date: '2026-11-11', description: 'Despesa QA',
  type: 'expense' as const, amount: 12.35, expenseAmount: 12.35,
  status: 'paid', situation: 'PAGO',
  category: 'Mercado', group: 'Mercado', expenseClass: 'CONTAS GERAIS',
  paymentMethod: 'PIX', modality: 'À VISTA',
};
const stateFor = (transactions: unknown[]) => ({
  transactions, budgets: {},
  __megNormalization: { mode: 'normalized-primary' },
});
let ownerId: string | null = null;
let workspaceId: string | null = null;
let planId: string | null = null;
let eventId: string | null = null;
let app: ReturnType<typeof fastify> | null = null;

async function main() {
  try {
    const owner = await prisma.user.create({ data: {
      email: stamp + '@meg.test', name: 'Titular QA HTTP', passwordHash: 'QA_ONLY',
      role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true, approvedAt: new Date(),
    } });
    ownerId = owner.id;
    const plan = await prisma.plan.create({ data: {
      code: stamp, name: 'Plano QA ficticio', monthlyPrice: 0,
      maxMembers: 2, features: [],
    } });
    planId = plan.id;
    const workspace = await prisma.workspace.create({ data: {
      name: 'QA HTTP de sincronizacao', slug: stamp, ownerId: owner.id,
      members: { create: { userId: owner.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true } },
      appState: { create: {
        userId: owner.id, revision: 1,
        state: stateFor([{ ...stateTransaction }]) as unknown as Prisma.InputJsonValue,
      } },
      subscription: { create: { planId: plan.id, status: LicenseStatus.ACTIVE } },
    } });
    workspaceId = workspace.id;
    const account = await prisma.account.create({ data: {
      userId: owner.id, name: 'Conta QA', type: 'checking', openingBalance: 100,
    } });
    const category = await prisma.category.create({ data: {
      userId: owner.id, name: 'Mercado', group: 'CONTAS GERAIS', type: 'expense',
    } });
    const method = await prisma.paymentMethod.create({ data: {
      userId: owner.id, name: 'PIX', type: 'instant',
    } });
    const payload = { ...stateTransaction, financialAccountId: account.id };
    const state = stateFor([payload]);
    await prisma.appState.update({ where: { workspaceId: workspace.id }, data: { state: state as unknown as Prisma.InputJsonValue } });
    const event = await prisma.financialEvent.create({ data: {
      userId: owner.id, workspaceId: workspace.id, legacyTransactionId: legacyId,
      description: payload.description, type: 'expense', status: 'paid',
      date: new Date('2026-11-11T12:00:00Z'), competence: '2026-11',
      amount: 12.35, signedAmount: -12.35, accountId: account.id,
      categoryId: category.id, paymentMethodId: method.id, sourcePayload: payload,
    } });
    eventId = event.id;

    // Guard de papel simulado: testa a rota real, NAO o mecanismo JWT.
    app = fastify();
    app.decorate('authenticate', async (request: unknown) => {
      (request as { user: unknown }).user = { sub: owner.id, role: UserRole.ADMIN };
    });
    app.decorate('authorize', (_roles: unknown) => async (request: unknown) => {
      (request as { user: unknown }).user = { sub: owner.id, role: UserRole.ADMIN };
    });
    await app.register(appStateRoutes, { prefix: '/app-state' });
    await app.ready();
    const patch = async (expectedRevision: number, upserts: unknown[], deletes: string[] = []) =>
      app!.inject({
        method: 'PATCH', url: '/app-state/transactions',
        payload: { operationId: randomUUID(), expectedRevision, upserts, deletes },
      });
    const put = async (expectedRevision: number, transactions: unknown[]) =>
      app!.inject({
        method: 'PUT', url: '/app-state',
        payload: { expectedRevision, state: stateFor(transactions) },
      });

    const updatePayload = { ...payload, description: 'Despesa QA atualizada' };
    const ok = await patch(1, [updatePayload]);
    assert.equal(ok.statusCode, 200, 'PATCH permitido: ' + ok.body);
    const afterPatch = await prisma.financialEvent.findUniqueOrThrow({ where: { id: event.id } });
    assert.equal(afterPatch.id, event.id);
    assert.equal(afterPatch.categoryId, category.id);
    assert.equal(afterPatch.paymentMethodId, method.id);
    assert.equal(afterPatch.description, updatePayload.description);
    assert.equal((await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } })).revision, 2);

    const stalePatch = await patch(1, [{ ...updatePayload, description: 'stale' }]);
    assert.equal(stalePatch.statusCode, 409);
    assert.equal(JSON.parse(stalePatch.body).error, 'STATE_CONFLICT');

    const conflictingCategory = await patch(2, [{ ...updatePayload, category: 'Nao e mercado' }]);
    assert.equal(conflictingCategory.statusCode, 409, conflictingCategory.body);
    assert.equal(JSON.parse(conflictingCategory.body).error, 'NORMALIZATION_CANONICAL_CATEGORY_CONFLICT');
    assert.equal(JSON.parse(conflictingCategory.body).retryable, false);
    const afterRejected = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
    assert.equal(afterRejected.revision, 2, 'Conflito nao atualiza AppState');
    assert.equal((afterRejected.state as { transactions: { category: string }[] }).transactions[0].category, 'Mercado');
    assert.equal((await prisma.financialEvent.findUniqueOrThrow({ where: { id: event.id } })).categoryId, category.id);

    const okPut = await put(2, [updatePayload]);
    assert.equal(okPut.statusCode, 200, okPut.body);
    assert.equal((await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } })).revision, 3);
    assert.equal((await prisma.financialEvent.findUniqueOrThrow({ where: { id: event.id } })).id, event.id);

    const stalePut = await put(2, [{ ...updatePayload, description: 'PUT stale' }]);
    assert.equal(stalePut.statusCode, 409);
    assert.equal(JSON.parse(stalePut.body).error, 'STATE_CONFLICT');

    await prisma.ledgerEntry.create({ data: {
      eventId: event.id, accountId: account.id, date: event.date,
      debit: 0, credit: 12.35, memo: 'Ledger QA',
    } });
    const linkedPatch = await patch(3, [{ ...updatePayload, description: 'Nao alterar ledger vinculado' }]);
    assert.equal(linkedPatch.statusCode, 409, linkedPatch.body);
    assert.equal(JSON.parse(linkedPatch.body).error, 'NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER');
    assert.equal(JSON.parse(linkedPatch.body).retryable, false);
    const linkedPut = await put(3, [{ ...updatePayload, description: 'Nao alterar via PUT' }]);
    assert.equal(linkedPut.statusCode, 409, linkedPut.body);
    assert.equal(JSON.parse(linkedPut.body).error, 'NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER');
    assert.equal(JSON.parse(linkedPut.body).retryable, false);
    assert.equal((await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } })).revision, 3);
    assert.equal(await prisma.ledgerEntry.count({ where: { eventId: event.id } }), 1);
    assert.equal((await prisma.financialEvent.findUniqueOrThrow({ where: { id: event.id } })).id, event.id);
    // Contrato legado: o cliente envia um delete e pode tentar reinserir a
    // mesma ID. A sincronizacao conserva o ID arquivado, mas ainda bloqueia
    // restauracao implicita. Registrar divergencia antes de liberar Android.
    const legacyAdditionalId = 'qa-delete-restore-' + stamp;
    const additionalPayload = {
      ...payload, id: legacyAdditionalId, description: 'Evento QA para exclusao',
      amount: 8.15, expenseAmount: 8.15,
    };
    const createdByPatch = await patch(3, [additionalPayload]);
    assert.equal(createdByPatch.statusCode, 200, createdByPatch.body);
    const createdLegacy = await prisma.financialEvent.findFirstOrThrow({
      where: { workspaceId: workspace.id, legacyTransactionId: legacyAdditionalId },
    });
    assert.equal(createdLegacy.archivedAt, null);
    const deletedByPatch = await patch(4, [], [legacyAdditionalId]);
    assert.equal(deletedByPatch.statusCode, 200, deletedByPatch.body);
    const archivedLegacy = await prisma.financialEvent.findUniqueOrThrow({
      where: { id: createdLegacy.id },
    });
    assert.ok(archivedLegacy.archivedAt, 'Excluir deve arquivar, preservando a identidade');
    assert.equal(archivedLegacy.id, createdLegacy.id);
    const attemptedRestore = await patch(5, [additionalPayload]);
    assert.equal(attemptedRestore.statusCode, 409, attemptedRestore.body);
    assert.equal(JSON.parse(attemptedRestore.body).error, 'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE');
    assert.equal(JSON.parse(attemptedRestore.body).retryable, false);

    // A release APK 2.0.708 NAO contem o literal /app-state/transactions.
    // Exercitar tambem o PUT de estado completo para preservar a protecao
    // contra reintroducao de ID arquivado em clientes com outro protocolo.
    const attemptedRestoreViaFullState = await put(5, [updatePayload, additionalPayload]);
    assert.equal(attemptedRestoreViaFullState.statusCode, 409, attemptedRestoreViaFullState.body);
    assert.equal(JSON.parse(attemptedRestoreViaFullState.body).error,
      'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE');
    assert.equal(JSON.parse(attemptedRestoreViaFullState.body).retryable, false);
    assert.equal((await prisma.financialEvent.findUniqueOrThrow({
      where: { id: createdLegacy.id },
    })).archivedAt?.toISOString(), archivedLegacy.archivedAt?.toISOString(),
      'PUT legado nao pode restaurar silenciosamente o evento arquivado');
    const afterBlockedRestore = await prisma.appState.findUniqueOrThrow({
      where: { workspaceId: workspace.id },
    });
    assert.equal(afterBlockedRestore.revision, 5);
    assert.equal((afterBlockedRestore.state as { transactions: { id: string }[] })
      .transactions.some(item => item.id === legacyAdditionalId), false);
    assert.equal(await prisma.financialEvent.count({
      where: { workspaceId: workspace.id, legacyTransactionId: legacyAdditionalId },
    }), 1);

    const restoreRoute = await app!.inject({ method: 'GET', url: '/app-state/legacy-restore/' + legacyAdditionalId });
    assert.equal(restoreRoute.statusCode, 404);

    console.log('MEG_STAGE10_LEGACY_DELETE_REINSERT_GAP_CHARACTERIZED PASS');
    console.log('MEG_STAGE10_QA_P0_PATCH_PUT_409_REVISION_LEDGER_ROLLBACK PASS');
  } finally {
    if (app) await app.close();
    // Limpar dependencias da fixture antes de remover o workspace.
    if (workspaceId) await prisma.ledgerEntry.deleteMany({ where: { event: { workspaceId } } });
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } });
    if (planId) await prisma.plan.delete({ where: { id: planId } });
    if (ownerId) await prisma.user.delete({ where: { id: ownerId } });
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error('MEG_STAGE10_QA_HTTP_P0_FAIL', e); process.exitCode = 1; });
