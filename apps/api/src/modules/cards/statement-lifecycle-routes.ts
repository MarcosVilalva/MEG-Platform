import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '@meg/database';
import { z } from 'zod';
import { resolveWorkspaceContext } from '../workspaces/service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

type JsonRecord = Record<string, unknown>;

type TimelineItem = {
  id: string;
  kind: 'closing' | 'due' | 'payment' | 'reopen' | 'legacy-payment';
  at: string;
  effectiveAt: string | null;
  title: string;
  description: string | null;
  amount: number | null;
  auditId: string | null;
  actor: { id: string; name: string | null; email: string | null } | null;
  account: ReturnType<typeof nestedSnapshot>;
  paymentMethod: ReturnType<typeof nestedSnapshot>;
  event: { id: string; description: string | null; status: string | null; date: string | null; archivedAt: string | null } | null;
  source: 'calculated' | 'audit' | 'installments';
};

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

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function monthDay(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  const iso = `${month}-${String(safeDay).padStart(2, '0')}`;
  return { date: iso, at: `${iso}T12:00:00.000Z` };
}

function eventSnapshot(event: {
  id: string;
  description: string;
  status: string;
  date: Date;
  archivedAt: Date | null;
} | null | undefined) {
  if (!event) return null;
  return {
    id: event.id,
    description: event.description,
    status: event.status,
    date: isoDate(event.date),
    archivedAt: isoDate(event.archivedAt),
  };
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
    const lifecycleAudits = await prisma.auditLog.findMany({
      where: { ...auditWhere, action: { in: ['CARD_STATEMENT_PAID', 'CARD_STATEMENT_REOPENED'] } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    const paymentAudits = lifecycleAudits.filter((item) => item.action === 'CARD_STATEMENT_PAID');
    const latestLifecycle = lifecycleAudits.length ? lifecycleAudits[lifecycleAudits.length - 1] : null;
    const latestPayment = paymentAudits.length ? paymentAudits[paymentAudits.length - 1] : null;

    const auditMetadata = new Map(lifecycleAudits.map((item) => [item.id, parseAuditMetadata(item.metadata)]));
    const eventIds = [...new Set(lifecycleAudits
      .map((item) => text(auditMetadata.get(item.id)?.after.eventId))
      .filter(Boolean))];
    const linkedEvents = eventIds.length
      ? await prisma.financialEvent.findMany({
        where: { id: { in: eventIds }, userId: ownerId },
        include: { account: true, paymentMethod: true },
      })
      : [];
    const eventById = new Map(linkedEvents.map((item) => [item.id, item]));

    const lifecycleMetadata = parseAuditMetadata(latestLifecycle?.metadata || null);
    const paymentMetadata = parseAuditMetadata(latestPayment?.metadata || null);
    const paymentAfter = paymentMetadata.after;
    const lifecycleAfter = lifecycleMetadata.after;
    const eventId = text(paymentAfter.eventId);
    const financialEvent = eventId ? eventById.get(eventId) || null : null;

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

    const closing = monthDay(parsed.data.month, card.closingDay);
    const dueMonth = card.dueDay <= card.closingDay ? addMonths(parsed.data.month, 1) : parsed.data.month;
    const due = monthDay(dueMonth, card.dueDay);
    const timeline: TimelineItem[] = [
      {
        id: `closing:${card.id}:${parsed.data.month}`,
        kind: 'closing',
        at: closing.at,
        effectiveAt: closing.date,
        title: 'Fechamento da fatura',
        description: `Data calculada pelas regras do cartão · dia ${card.closingDay}`,
        amount: null,
        auditId: null,
        actor: null,
        account: null,
        paymentMethod: null,
        event: null,
        source: 'calculated',
      },
      {
        id: `due:${card.id}:${parsed.data.month}`,
        kind: 'due',
        at: due.at,
        effectiveAt: due.date,
        title: 'Vencimento da fatura',
        description: `Data calculada pelas regras do cartão · dia ${card.dueDay}`,
        amount: statementAmount || null,
        auditId: null,
        actor: null,
        account: null,
        paymentMethod: null,
        event: null,
        source: 'calculated',
      },
    ];

    for (const audit of lifecycleAudits) {
      const metadata = auditMetadata.get(audit.id) || { before: {}, after: {}, context: {} };
      const after = metadata.after;
      const linkedEventId = text(after.eventId);
      const linkedEvent = linkedEventId ? eventById.get(linkedEventId) || null : null;
      const account = linkedEvent?.account ? {
        id: linkedEvent.account.id,
        name: linkedEvent.account.name,
        type: linkedEvent.account.type,
        institution: linkedEvent.account.institution || null,
      } : nestedSnapshot(after.account);
      const paymentMethod = linkedEvent?.paymentMethod ? {
        id: linkedEvent.paymentMethod.id,
        name: linkedEvent.paymentMethod.name,
        type: linkedEvent.paymentMethod.type || null,
        institution: null,
      } : nestedSnapshot(after.paymentMethod);
      const amount = round(number(after.amount) || number(linkedEvent?.amount));
      const isPayment = audit.action === 'CARD_STATEMENT_PAID';
      const effectiveAt = isPayment ? text(after.paidAt) || isoDate(linkedEvent?.date) : isoDate(audit.createdAt);
      timeline.push({
        id: audit.id,
        kind: isPayment ? 'payment' : 'reopen',
        at: isoDate(audit.createdAt) || new Date(0).toISOString(),
        effectiveAt: effectiveAt || null,
        title: isPayment ? 'Pagamento da fatura' : 'Reabertura / estorno do pagamento',
        description: isPayment
          ? `Pagamento confirmado${linkedEvent?.archivedAt ? ' · lançamento posteriormente arquivado' : ''}`
          : text(after.reason) || 'Pagamento estornado com reabertura das parcelas.',
        amount: amount || null,
        auditId: audit.id,
        actor: audit.user,
        account,
        paymentMethod,
        event: linkedEvent ? eventSnapshot(linkedEvent) : linkedEventId ? {
          id: linkedEventId,
          description: null,
          status: null,
          date: null,
          archivedAt: null,
        } : null,
        source: 'audit',
      });
    }

    if (!paymentAudits.length && lastPaidAtFromEntries) {
      timeline.push({
        id: `legacy-payment:${card.id}:${parsed.data.month}`,
        kind: 'legacy-payment',
        at: lastPaidAtFromEntries.toISOString(),
        effectiveAt: lastPaidAtFromEntries.toISOString(),
        title: 'Pagamento identificado nas parcelas',
        description: 'Baixa anterior à trilha moderna de auditoria; conta e forma podem não estar disponíveis.',
        amount: paidAmount || null,
        auditId: null,
        actor: null,
        account: null,
        paymentMethod: null,
        event: null,
        source: 'installments',
      });
    }

    timeline.sort((left, right) => left.at.localeCompare(right.at) || left.kind.localeCompare(right.kind));

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
      closingDate: closing.date,
      dueDate: due.date,
      timeline,
      lastLifecycleAction: lifecycleAction,
      lastLifecycleAt: isoDate(latestLifecycle?.createdAt),
      lifecycleAuditId: latestLifecycle?.id || null,
      lastPayment: latestPayment || lastPaidAtFromEntries ? {
        amount: paymentAmount,
        paidAt: paidAt || null,
        account: accountSnapshot,
        paymentMethod: paymentMethodSnapshot,
        event: financialEvent ? eventSnapshot(financialEvent) : eventId ? {
          id: eventId,
          description: null,
          status: null,
          date: null,
          archivedAt: null,
        } : null,
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
