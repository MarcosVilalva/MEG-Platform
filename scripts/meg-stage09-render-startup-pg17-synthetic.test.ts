/**
 * Teste de caracterizacao de rotinas reais (nao executa server.ts) em PG17 efemero.
 * Unico destino permitido: 127.0.0.1:65431/meg_stage09_ephemeral.
 * Nunca rodar contra um banco de dados existente ou produtivo.
 */
import assert from 'node:assert/strict';
import { env } from 'node:process';

const LOCAL_URL = 'postgresql://stage09:stage09@127.0.0.1:65431/meg_stage09_ephemeral?schema=public';
const TEST_ADMIN = 'stage09-synthetic-admin@example.invalid';
function verifyIsolation() {
  assert.equal(env.CI, 'true', 'CI obrigatorio');
  assert.equal(env.GITHUB_ACTIONS, 'true', 'GitHub Actions obrigatorio');
  assert.equal(env.NODE_ENV, 'test', 'NODE_ENV deve ser test');
  assert.equal(env.DATABASE_URL, LOCAL_URL, 'Destino postgres efemero fixo');
  assert.equal(env.ADMIN_EMAIL, TEST_ADMIN, 'Administrador somente sintetico');
  for (const key of [
    'RESEND_API_KEY', 'BREVO_API_KEY', 'EVOLUTION_API_KEY', 'EVOLUTION_API_URL',
    'NOTIFICATION_CRON_SECRET', 'ALEXA_ANNOUNCEMENT_WEBHOOK_URL',
  ]) assert.ok(!env[key], 'Integracao externa nao permitida: ' + key);
}
verifyIsolation();

const { prisma, UserRole, InvoiceStatus, LicenseStatus } = await import('@meg/database');
const { ensurePrimaryWorkspace } = await import('../apps/api/src/modules/workspaces/service.ts');
const { ensureCommercialFoundation } = await import('../apps/api/src/modules/platform-admin/service.ts');
const { refreshCommercialBillingStatuses } = await import('../apps/api/src/modules/billing/service.ts');
const { materializeRecurringExpenses } = await import('../apps/api/src/modules/payables/service.ts');
const { migrateLegacyCardsForAllWorkspaces } = await import('../apps/api/src/modules/cards/service.ts');
const { reconcilePrimaryAppStateFromNormalized } = await import('../apps/api/src/modules/app-state/normalized-primary-writeback.ts');
const {
  activateNormalizationPrimary,
  normalizationPreview,
  normalizedStateForRead,
  rollbackNormalizationPrimary,
} = await import('../apps/api/src/modules/app-state/normalization-migration.ts');

const date = (s: string) => new Date(s + 'T00:00:00.000Z');
const fixedDate = new Date('2026-11-14T12:00:00.000Z');

async function main() {
  // O workflow usa DB nova e sem importacao. Recusar executar em base nao vazia.
  const existing = await prisma.user.count();
  assert.equal(existing, 0, 'Banco nao vazio: abortar sem alterar nenhum registro');
  const admin = await prisma.user.create({
    data: { name: 'SYNTHETIC_STAGE09_ONLY', email: TEST_ADMIN, role: UserRole.ADMIN },
  });
  const workspace = await ensurePrimaryWorkspace();
  assert.ok(workspace);
  assert.equal(workspace.ownerId, admin.id);
  const again = await ensurePrimaryWorkspace();
  assert.equal(again?.id, workspace.id);
  assert.equal(await prisma.workspace.count(), 1);
  assert.equal(await prisma.workspaceMember.count(), 1);
  assert.equal(await prisma.appState.count(), 1);

  await ensureCommercialFoundation();
  const plans = await prisma.plan.findMany();
  assert.equal(plans.length, 3, 'Planos oficiais esperados neste fixture');
  assert.equal(await prisma.workspaceSubscription.count(), 1);
  await ensureCommercialFoundation();
  assert.equal(await prisma.plan.count(), 3);
  assert.equal(await prisma.workspaceSubscription.count(), 1);
  assert.equal(await prisma.platformAdministrator.count(), 1);

  const subscription = await prisma.workspaceSubscription.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  await prisma.workspaceSubscription.update({
    where: { id: subscription.id },
    data: { billingEnabled: true, billingDay: 10, autoSuspendAfterDays: 5 },
  });
  const firstBilling = await refreshCommercialBillingStatuses(fixedDate);
  assert.equal(firstBilling.suspended, 0);
  const invoice = await prisma.workspaceInvoice.findUniqueOrThrow({
    where: { workspaceId_reference: { workspaceId: workspace.id, reference: '2026-11' } },
  });
  assert.equal(invoice.status, InvoiceStatus.OVERDUE);
  assert.equal((await prisma.workspaceSubscription.findUniqueOrThrow({ where: { id: subscription.id } })).status, LicenseStatus.PAST_DUE);
  await refreshCommercialBillingStatuses(fixedDate);
  assert.equal(await prisma.workspaceInvoice.count(), 1);
  assert.equal((await prisma.workspaceInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).status, InvoiceStatus.OVERDUE);
  assert.equal((await prisma.workspaceSubscription.findUniqueOrThrow({ where: { id: subscription.id } })).status, LicenseStatus.PAST_DUE);

  // Invariante financeiro: um evento anterior e um orcamento ficticios devem
  // permanecer byte-equivalentes depois da manutencao das outras funcionalidades.
  const originalEvent = await prisma.financialEvent.create({
    data: {
      userId: admin.id, workspaceId: workspace.id,
      description: 'SYNTHETIC FINANCIAL EVENT', type: 'expense', status: 'planned',
      date: date('2026-11-14'), competence: '2026-11',
      amount: '12.34', signedAmount: '-12.34',
    },
  });
  const budget = await prisma.budget.create({
    data: { userId: admin.id, month: '2026-11', group: 'SYNTHETIC', amount: '100.42' },
  });
  const baselineState = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });

  // O server.ts chama reconcile ANTES da ativacao automatica da normalizacao.
  // Um AppState legado ainda nao e fonte normalizada: registrar recusas, sem
  // converter isso em defeito de dados ou "corrigir" a regra por conta propria.
  await assert.rejects(
    reconcilePrimaryAppStateFromNormalized(workspace.id),
    /NORMALIZATION_PRIMARY_REQUIRED/,
  );
  const afterRejectedReconcile = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  assert.equal(afterRejectedReconcile.revision, baselineState.revision);
  assert.deepEqual(afterRejectedReconcile.state, baselineState.state);


  await prisma.recurringExpense.create({
    data: {
      userId: admin.id, description: 'SYNTHETIC RECURRING', amount: '89.17',
      frequency: 'monthly', nextDueDate: date('2026-11-13'), endDate: date('2026-11-30'),
    },
  });
  const materialized = await materializeRecurringExpenses(fixedDate);
  assert.equal(materialized.created, 1);
  const againMaterialized = await materializeRecurringExpenses(fixedDate);
  assert.equal(againMaterialized.created, 0);
  const payable = await prisma.payable.findFirstOrThrow({ where: { userId: admin.id, description: 'SYNTHETIC RECURRING' } });
  assert.equal(payable.totalAmount.toFixed(2), '89.17');
  assert.equal(payable.openAmount.toFixed(2), '89.17');
  assert.equal(await prisma.payable.count(), 1);

  // A fonte para o migrador legado e catalogs.cards, conforme o codigo atual.
  const stateWithCard = {
    transactions: [], budgets: {},
    catalogs: { cards: [{
      paymentMethod: 'SYNTHETIC CARD', productName: 'SYNTHETIC CARD',
      closingDay: 5, dueDay: 15, limit: 1500, isActive: true,
    }] },
  };
  await prisma.appState.update({
    where: { workspaceId: workspace.id }, data: { state: stateWithCard },
  });
  const cardFirst = await migrateLegacyCardsForAllWorkspaces();
  assert.equal(cardFirst.created, 1);
  const cardAgain = await migrateLegacyCardsForAllWorkspaces();
  assert.equal(cardAgain.created, 0);
  assert.equal(await prisma.creditCard.count(), 1);
  const card = await prisma.creditCard.findFirstOrThrow();
  assert.equal(card.name, 'SYNTHETIC CARD');
  assert.equal(card.creditLimit.toFixed(2), '1500.00');

  const afterEvent = await prisma.financialEvent.findUniqueOrThrow({ where: { id: originalEvent.id } });
  assert.equal(await prisma.financialEvent.count(), 1);
  assert.equal(afterEvent.amount.toFixed(2), '12.34');
  assert.equal(afterEvent.signedAmount.toFixed(2), '-12.34');
  assert.equal(afterEvent.status, originalEvent.status);
  assert.equal((await prisma.budget.findUniqueOrThrow({ where: { id: budget.id } })).amount.toFixed(2), '100.42');
  assert.equal(await prisma.budget.count(), 1);
  // O appState muda apenas na alteracao intencional da fixture, antes da migracao.
  const finalState = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  assert.equal(finalState.revision, baselineState.revision);
  assert.deepEqual(finalState.state, stateWithCard);


  // Caso NORMALIZACAO LEGADA, usando a camada financeira realmente existente:
  // primeiro o servidor tentaria reconciliar (recusa); depois a ativacao e
  // um passo explicitamente separado, testado AQUI, sem alterar server.ts.
  const legacyTransaction = {
    id: 'stage09-legacy-only-001',
    date: '2026-11-12',
    description: 'SYNTHETIC LEGACY EXPENSE',
    type: 'expense',
    status: 'pending',
    expenseAmount: 27.35,
    amount: 27.35,
  };
  const legacyState = { ...stateWithCard, transactions: [legacyTransaction] };
  await prisma.appState.update({ where: { workspaceId: workspace.id }, data: { state: legacyState } });
  const beforeNormalization = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  const beforePreview = await normalizationPreview(workspace.id, admin.id);
  assert.equal(beforePreview.primary, false);
  assert.equal(beforePreview.source.validCount, 1);
  assert.equal(beforePreview.normalized.count, 0);
  const legacyRead = await normalizedStateForRead(workspace.id, admin.id);
  assert.equal(legacyRead?.dataSource, 'app-state');
  await assert.rejects(reconcilePrimaryAppStateFromNormalized(workspace.id), /NORMALIZATION_PRIMARY_REQUIRED/);
  const afterRefusal = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  assert.equal(afterRefusal.revision, beforeNormalization.revision);
  assert.deepEqual(afterRefusal.state, beforeNormalization.state);

  // Ativacao isolada: aplica sombra reconciliada, depois marca normalized-primary.
  const activated = await activateNormalizationPrimary(workspace.id, admin.id, { automatic: true });
  assert.equal(activated.activated, true);
  assert.equal(activated.primary, true);
  assert.equal(activated.reconciled, true);
  const normalizedRow = await prisma.financialEvent.findFirstOrThrow({
    where: { workspaceId: workspace.id, legacyTransactionId: legacyTransaction.id },
  });
  assert.equal(normalizedRow.amount.toFixed(2), '27.35');
  assert.equal(normalizedRow.signedAmount.toFixed(2), '-27.35');
  assert.equal(await prisma.financialEvent.count(), 2);
  const normalizedRead = await normalizedStateForRead(workspace.id, admin.id);
  assert.equal(normalizedRead?.normalizedPrimary, true);
  assert.equal(normalizedRead?.dataSource, 'normalized');
  const secondActivation = await activateNormalizationPrimary(workspace.id, admin.id, { automatic: true });
  assert.equal(secondActivation.activated, false);
  const afterActivation = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  assert.equal(afterActivation.revision, beforeNormalization.revision + 1);

  // O evento normalizado passa a ser fonte autoritativa. A reconciliacao
  // restaura o espelho legado sem criar outra transacao.
  await prisma.financialEvent.update({
    where: { id: normalizedRow.id },
    data: { description: 'SYNTHETIC UPDATED EXPENSE', amount: '29.40', signedAmount: '-29.40' },
  });
  const concurrent = await Promise.allSettled([
    reconcilePrimaryAppStateFromNormalized(workspace.id),
    reconcilePrimaryAppStateFromNormalized(workspace.id),
  ]);
  // Sob corrida, uma execucao pode perder o CAS e ser rejeitada. Exigimos
  // convergencia, nao a ausencia artificial de conflitos.
  assert.ok(concurrent.some((item) => item.status === 'fulfilled'), 'Nenhuma reconciliacao concluiu');
  const firstStable = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  const mirroredTransactions = (firstStable.state as { transactions?: Array<Record<string, unknown>> }).transactions || [];
  assert.equal(mirroredTransactions.length, 1);
  assert.equal(mirroredTransactions[0].id, legacyTransaction.id);
  assert.equal(mirroredTransactions[0].description, 'SYNTHETIC UPDATED EXPENSE');
  assert.equal(Number(mirroredTransactions[0].amount), 29.40);
  assert.ok(firstStable.revision >= afterActivation.revision + 1);
  const afterConverged = await reconcilePrimaryAppStateFromNormalized(workspace.id);
  assert.equal(afterConverged.changed, false);
  assert.equal((await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } })).revision, firstStable.revision);
  assert.equal(await prisma.financialEvent.count(), 2);
  assert.equal(await prisma.payable.count(), 1);
  assert.equal(await prisma.creditCard.count(), 1);
  const finalOriginalEvent = await prisma.financialEvent.findUniqueOrThrow({ where: { id: originalEvent.id } });
  assert.equal(finalOriginalEvent.amount.toFixed(2), '12.34');
  assert.equal(finalOriginalEvent.signedAmount.toFixed(2), '-12.34');
  assert.equal((await prisma.budget.findUniqueOrThrow({ where: { id: budget.id } })).amount.toFixed(2), '100.42');

  // Revisao obsoleta deve ser recusada sem atualizar espelho, eventos ou saldo.
  await assert.rejects(
    reconcilePrimaryAppStateFromNormalized(workspace.id, { expectedRevision: beforeNormalization.revision }),
    /NORMALIZATION_REVISION_CONFLICT/,
  );
  assert.equal((await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } })).revision, firstStable.revision);
  assert.equal(await prisma.financialEvent.count(), 2);

  // Regra de protecao do rollback: ativacao automatica nao pode sobrescrever
  // a escolha explicita de retornar ao AppState. Teste APENAS no PG17 efemero.
  const rollback = await rollbackNormalizationPrimary(workspace.id);
  assert.equal(rollback.active, false);
  assert.equal(rollback.mode, 'app-state-rollback');
  const rolledBackState = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  const afterRollbackAuto = await activateNormalizationPrimary(workspace.id, admin.id, { automatic: true });
  assert.equal(afterRollbackAuto.blockedByRollback, true);
  const rollbackStillIntact = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  assert.equal(rollbackStillIntact.revision, rolledBackState.revision);
  assert.deepEqual(rollbackStillIntact.state, rolledBackState.state);
  await assert.rejects(reconcilePrimaryAppStateFromNormalized(workspace.id), /NORMALIZATION_PRIMARY_REQUIRED/);
  assert.equal(await prisma.financialEvent.count(), 2);
  assert.equal((await prisma.budget.findUniqueOrThrow({ where: { id: budget.id } })).amount.toFixed(2), '100.42');

  console.log(JSON.stringify({
    result: 'PG17_SYNTHETIC_STARTUP_CHARACTERIZATION_PASS',
    workspace_runs: 2, foundation_runs: 2, billing_runs: 2,
    recurrence_runs: 2, card_migration_runs: 2,
    payables: 1, cards: 1, invoices: 1, financial_events_preserved: 1,
    budget_preserved: 1, pre_normalization_reconcile_rejected: true,
    normalized_activated: true, concurrent_reconcile_executions: 2,
    concurrent_fulfilled: concurrent.filter((item) => item.status === 'fulfilled').length,
    normalized_legacy_event_preserved: 1, stale_revision_rejected: true,
    rollback_automatic_reactivation_blocked: true, isolated: true,
  }));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
