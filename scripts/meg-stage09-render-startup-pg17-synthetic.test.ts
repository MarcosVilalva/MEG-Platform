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

  console.log(JSON.stringify({
    result: 'PG17_SYNTHETIC_STARTUP_CHARACTERIZATION_PASS',
    workspace_runs: 2, foundation_runs: 2, billing_runs: 2,
    recurrence_runs: 2, card_migration_runs: 2,
    payables: 1, cards: 1, invoices: 1, financial_events_preserved: 1,
    budget_preserved: 1, isolated: true,
  }));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
