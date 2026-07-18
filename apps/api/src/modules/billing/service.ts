import { InvoiceStatus, LicenseStatus, prisma } from '@meg/database';
import { assertPlatformAdministrator, ensureWorkspaceSubscription } from '../platform-admin/service';

const DAY_MS = 24 * 60 * 60 * 1000;

export function billingGraceDeadline(dueAt: Date, graceDays: number) {
  return new Date(dueAt.getTime() + Math.max(0, graceDays) * DAY_MS);
}

export async function ensureCurrentMonthlyInvoices(referenceDate = new Date()) {
  const reference = `${referenceDate.getUTCFullYear()}-${String(referenceDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const subscriptions = await prisma.workspaceSubscription.findMany({
    where: { billingEnabled: true, status: { in: [LicenseStatus.ACTIVE, LicenseStatus.PAST_DUE] } },
    include: { plan: true }
  });
  let created = 0;
  for (const subscription of subscriptions) {
    const dueAt = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), Math.min(28, Math.max(1, subscription.billingDay)), 15));
    const result = await prisma.workspaceInvoice.upsert({
      where: { workspaceId_reference: { workspaceId: subscription.workspaceId, reference } },
      create: { workspaceId: subscription.workspaceId, subscriptionId: subscription.id, reference, amount: subscription.plan.monthlyPrice, dueAt },
      update: {}
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created += 1;
  }
  return { reference, created };
}
export async function refreshCommercialBillingStatuses(referenceDate = new Date()) {
  await ensureCurrentMonthlyInvoices(referenceDate);
  await prisma.workspaceInvoice.updateMany({ where: { status: InvoiceStatus.PENDING, dueAt: { lt: referenceDate } }, data: { status: InvoiceStatus.OVERDUE } });
  const overdue = await prisma.workspaceInvoice.findMany({ where: { status: InvoiceStatus.OVERDUE }, include: { subscription: true } });
  let suspended = 0;
  for (const invoice of overdue) {
    if (!invoice.subscription) continue;
    const graceUntil = billingGraceDeadline(invoice.dueAt, invoice.subscription.autoSuspendAfterDays);
    if (graceUntil >= referenceDate) {
      if (invoice.subscription.status === LicenseStatus.ACTIVE) await prisma.workspaceSubscription.update({ where: { id: invoice.subscription.id }, data: { status: LicenseStatus.PAST_DUE, graceUntil } });
      continue;
    }
    if (invoice.subscription.status !== LicenseStatus.SUSPENDED && invoice.subscription.status !== LicenseStatus.CANCELLED) {
      await prisma.workspaceSubscription.update({ where: { id: invoice.subscription.id }, data: { status: LicenseStatus.SUSPENDED, graceUntil, suspendedAt: referenceDate } });
      suspended += 1;
    }
  }
  return { overdue: overdue.length, suspended };
}

export async function createWorkspaceInvoice(input: { actorId: string; workspaceId: string; reference: string; amount?: number; dueAt: Date; notes?: string }) {
  await assertPlatformAdministrator(input.actorId);
  const subscription = await ensureWorkspaceSubscription(input.workspaceId);
  const complete = await prisma.workspaceSubscription.findUniqueOrThrow({ where: { id: subscription.id }, include: { plan: true } });
  const amount = input.amount ?? Number(complete.plan.monthlyPrice);
  await prisma.workspaceSubscription.update({ where: { id: subscription.id }, data: { billingEnabled: true, billingDay: Math.min(28, Math.max(1, input.dueAt.getUTCDate())) } });
  const invoice = await prisma.workspaceInvoice.upsert({
    where: { workspaceId_reference: { workspaceId: input.workspaceId, reference: input.reference } },
    create: { workspaceId: input.workspaceId, subscriptionId: subscription.id, reference: input.reference, amount, dueAt: input.dueAt, notes: input.notes },
    update: { amount, dueAt: input.dueAt, notes: input.notes, subscriptionId: subscription.id }
  });
  await prisma.auditLog.create({ data: { userId: input.actorId, entity: 'WorkspaceInvoice', entityId: invoice.id, action: 'UPSERT', metadata: JSON.stringify({ workspaceId: input.workspaceId, reference: input.reference, amount }) } });
  return invoice;
}

export async function updateWorkspaceInvoice(input: { actorId: string; invoiceId: string; action: 'MARK_PAID' | 'REOPEN' | 'CANCEL'; paymentMethod?: string }) {
  await assertPlatformAdministrator(input.actorId);
  const invoice = await prisma.workspaceInvoice.findUnique({ where: { id: input.invoiceId }, include: { subscription: true } });
  if (!invoice) throw new Error('INVOICE_NOT_FOUND');
  const now = new Date();
  const status = input.action === 'MARK_PAID' ? InvoiceStatus.PAID : input.action === 'CANCEL' ? InvoiceStatus.CANCELLED : (invoice.dueAt < now ? InvoiceStatus.OVERDUE : InvoiceStatus.PENDING);
  const updated = await prisma.workspaceInvoice.update({ where: { id: invoice.id }, data: { status, paidAt: input.action === 'MARK_PAID' ? now : null, paymentMethod: input.action === 'MARK_PAID' ? input.paymentMethod ?? 'manual' : null } });
  if (invoice.subscription && input.action === 'MARK_PAID') {
    const renewalBase = invoice.subscription.expiresAt && invoice.subscription.expiresAt > now ? invoice.subscription.expiresAt : now;
    await prisma.workspaceSubscription.update({ where: { id: invoice.subscription.id }, data: { status: LicenseStatus.ACTIVE, graceUntil: null, suspendedAt: null, expiresAt: new Date(renewalBase.getTime() + 30 * DAY_MS) } });
  }
  await prisma.auditLog.create({ data: { userId: input.actorId, entity: 'WorkspaceInvoice', entityId: invoice.id, action: input.action, metadata: JSON.stringify({ workspaceId: invoice.workspaceId, paymentMethod: input.paymentMethod ?? null }) } });
  return updated;
}
