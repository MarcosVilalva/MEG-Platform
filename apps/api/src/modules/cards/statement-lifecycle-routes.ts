import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '@meg/database';
import { z } from 'zod';
import { resolveWorkspaceContext } from '../workspaces/service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

type JsonRecord = Record<string, unknown>;

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function parseAuditMetadata(value: string | null) {
  if (!value) return { before: {}, after: {}, context: {} };
  try {
    const parsed = record(JSON.parse(value));
    return {
      before: record(parsed.before),
      after: record(parsed.after),
      context: record(parsed.context),
    };
  } catch {
    return { before: {}, after: {}, context: {} };
  }
}

function nestedSnapshot(value: unknown) {
  const item = record(value);
  const id = text(item.id);
  const name = text(item.name);
  const type = text(item.type);
  const institution = text(item.institution);
  if (!id && !name && !type && !institution) return null;
  return {
    id: id || null,
    name: name || null,
    type: type || null,
    institution: institution || null,
  };
}

function isoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function cardStatementLifecycleRoutes(app: FastifyInstance) {
  app.get('/:id/statements/:month/lifecycle', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ id: z.string().min(1), month: monthSchema }).safeParse(request.params);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const workspace = await resolveWorkspaceContext(request.user.sub);
    const ownerId = workspace.workspace.ownerId;
    const card = await prisma.creditCard.findFirst({
      where: { id: parsed.data.id, userId: ownerId },
      include: {
        purchases: {
          where: { status: 'active' },
          include: { entries: true },
        },
      },
    });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });

    const entries = card.purchases
      .flatMap((purchase) => purchase.entries)
      .filter((entry) => entry.statementMonth === parsed.data.month);
    const openEntries = entries.filter((entry) => entry.status === 'open');
    const paidEntries = entries.filter((entry) => entry.status === 'paid');
    const openAmount = round(openEntries.reduce((sum, entry) => sum + Number(entry.amount), 0));
    const paidAmount = round(paidEntries.reduce((sum, entry) => sum + Number(entry.amount), 0));
    const statementAmount = round(entries.reduce((sum, entry) => sum + Number(entry.amount), 0));

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.workspaceId },
      select: { userId: true },
    });
    const memberIds = members.map((item) => item.userId);
    const auditWhere = {
      userId: { in: memberIds },
      entity: 'CreditCard',
      entityId: card.id,
      metadata: { contains: `\"month\":\"${parsed.data.month}\"` },
    };
    const [latestLifecycle, latestPayment] = await Promise.all([
      prisma.auditLog.findFirst({
        where: { ...auditWhere, action: { in: ['CARD_STATEMENT_PAID', 'CARD_STATEMENT_REOPENED'] } },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.findFirst({
        where: { ...auditWhere, action: 'CARD_STATEMENT_PAID' },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const lifecycleMetadata = parseAuditMetadata(latestLifecycle?.metadata || null);
    const paymentMetadata = parseAuditMetadata(latestPayment?.metadata || null);
    const paymentAfter = paymentMetadata.after;
    const lifecycleAfter = lifecycleMetadata.after;
    const eventId = text(paymentAfter.eventId);
    const financialEvent = eventId
      ? await prisma.financialEvent.findFirst({
        where: { id: eventId, userId: ownerId },
        include: { account: true, paymentMethod: true },
      })
      : null;

    const lastPaidAtFromEntries = paidEntries
      .map((entry) => entry.paidAt)
      .filter((value): value is Date => value instanceof Date)
      .sort((left, right) => right.getTime() - left.getTime())[0] || null;
    const accountSnapshot = financialEvent?.account ? {
      id: financialEvent.account.id,
      name: financialEvent.account.name,
      type: financialEvent.account.type,
      institution: financialEvent.account.institution || null,
    } : nestedSnapshot(paymentAfter.account);
    const paymentMethodSnapshot = financialEvent?.paymentMethod ? {
      id: financialEvent.paymentMethod.id,
      name: financialEvent.paymentMethod.name,
      type: financialEvent.paymentMethod.type || null,
      institution: null,
    } : nestedSnapshot(paymentAfter.paymentMethod);

    const lifecycleAction = latestLifecycle?.action || null;
    const status = entries.length === 0
      ? 'none'
      : lifecycleAction === 'CARD_STATEMENT_REOPENED' && openEntries.length > 0
        ? 'reopened'
        : openEntries.length > 0 && paidEntries.length > 0
          ? 'partial'
          : openEntries.length > 0
            ? 'open'
            : 'paid';
    const paidAt = text(paymentAfter.paidAt)
      || isoDate(financialEvent?.date)
      || isoDate(lastPaidAtFromEntries);
    const paymentAmount = latestPayment
      ? round(number(paymentAfter.amount) || number(financialEvent?.amount) || paidAmount)
      : paidAmount;
    const reopenedAt = lifecycleAction === 'CARD_STATEMENT_REOPENED' ? isoDate(latestLifecycle?.createdAt) : null;
    const reopenReason = lifecycleAction === 'CARD_STATEMENT_REOPENED' ? text(lifecycleAfter.reason) || null : null;

    return {
      cardId: card.id,
      cardName: card.name,
      month: parsed.data.month,
      status,
      statementAmount,
      openAmount,
      paidAmount,
      openInstallments: openEntries.length,
      paidInstallments: paidEntries.length,
      lastLifecycleAction: lifecycleAction,
      lastLifecycleAt: isoDate(latestLifecycle?.createdAt),
      lifecycleAuditId: latestLifecycle?.id || null,
      lastPayment: latestPayment || lastPaidAtFromEntries ? {
        amount: paymentAmount,
        paidAt: paidAt || null,
        account: accountSnapshot,
        paymentMethod: paymentMethodSnapshot,
        event: financialEvent ? {
          id: financialEvent.id,
          status: financialEvent.status,
          date: isoDate(financialEvent.date),
          archivedAt: isoDate(financialEvent.archivedAt),
        } : eventId ? { id: eventId, status: null, date: null, archivedAt: null } : null,
        auditId: latestPayment?.id || null,
        actor: latestPayment?.user || null,
      } : null,
      reopenedAt,
      reopenReason,
      reopenedBy: lifecycleAction === 'CARD_STATEMENT_REOPENED' ? latestLifecycle?.user || null : null,
      source: latestLifecycle || latestPayment ? 'audit' : entries.length ? 'installments' : 'none',
    };
  });
}
