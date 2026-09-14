import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '@meg/database';
import { z } from 'zod';
import { resolveWorkspaceContext } from '../workspaces/service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const historyQuerySchema = z.object({
  through: monthSchema.optional(),
  months: z.coerce.number().int().min(3).max(24).default(12),
});

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

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
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

function auditMonth(metadata: ReturnType<typeof parseAuditMetadata>) {
  const candidate = text(metadata.after.month) || text(metadata.context.month) || text(metadata.before.month);
  return monthSchema.safeParse(candidate).success ? candidate : '';
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
      metadata: { contains: `\\\"month\\\":\\\"${parsed.data.month}\\\"` },
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

  app.get('/:id/statements/history', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const query = historyQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return validationError(reply, {
        params: params.success ? null : params.error.flatten(),
        query: query.success ? null : query.error.flatten(),
      });
    }

    const through = query.data.through || currentMonth();
    const months = query.data.months;
    const monthList = Array.from({ length: months }, (_, index) => addMonths(through, index - (months - 1)));
    const monthSet = new Set(monthList);

    const workspace = await resolveWorkspaceContext(request.user.sub);
    const ownerId = workspace.workspace.ownerId;
    const card = await prisma.creditCard.findFirst({
      where: { id: params.data.id, userId: ownerId },
      include: {
        purchases: {
          where: { status: 'active' },
          include: { entries: true },
        },
      },
    });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.workspaceId },
      select: { userId: true },
    });
    const memberIds = members.map((item) => item.userId);
    const lifecycleAudits = await prisma.auditLog.findMany({
      where: {
        userId: { in: memberIds },
        entity: 'CreditCard',
        entityId: card.id,
        action: { in: ['CARD_STATEMENT_PAID', 'CARD_STATEMENT_REOPENED'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    const auditsByMonth = new Map<string, typeof lifecycleAudits>();
    const metadataByAudit = new Map<string, ReturnType<typeof parseAuditMetadata>>();
    for (const audit of lifecycleAudits) {
      const metadata = parseAuditMetadata(audit.metadata);
      metadataByAudit.set(audit.id, metadata);
      const month = auditMonth(metadata);
      if (!month || !monthSet.has(month)) continue;
      const group = auditsByMonth.get(month) || [];
      group.push(audit);
      auditsByMonth.set(month, group);
    }

    const allEntries = card.purchases.flatMap((purchase) => purchase.entries);
    const items = monthList.map((month) => {
      const entries = allEntries.filter((entry) => entry.statementMonth === month);
      const openEntries = entries.filter((entry) => entry.status === 'open');
      const paidEntries = entries.filter((entry) => entry.status === 'paid');
      const audits = auditsByMonth.get(month) || [];
      const paymentAudits = audits.filter((audit) => audit.action === 'CARD_STATEMENT_PAID');
      const reopenAudits = audits.filter((audit) => audit.action === 'CARD_STATEMENT_REOPENED');
      const latestAudit = audits.length ? audits[audits.length - 1] : null;
      const latestPayment = paymentAudits.length ? paymentAudits[paymentAudits.length - 1] : null;
      const latestPaymentMetadata = latestPayment ? metadataByAudit.get(latestPayment.id) : null;
      const latestAuditMetadata = latestAudit ? metadataByAudit.get(latestAudit.id) : null;
      const auditedAmount = round(
        number(latestPaymentMetadata?.after.amount)
        || number(latestAuditMetadata?.after.amount)
        || 0,
      );
      const entryStatementAmount = round(entries.reduce((sum, entry) => sum + Number(entry.amount), 0));
      const entryOpenAmount = round(openEntries.reduce((sum, entry) => sum + Number(entry.amount), 0));
      const entryPaidAmount = round(paidEntries.reduce((sum, entry) => sum + Number(entry.amount), 0));
      const statementAmount = entryStatementAmount || auditedAmount;
      const latestAction = latestAudit?.action || null;
      const status = entries.length === 0 && audits.length === 0
        ? 'none'
        : latestAction === 'CARD_STATEMENT_REOPENED'
          ? 'reopened'
          : openEntries.length > 0 && paidEntries.length > 0
            ? 'partial'
            : openEntries.length > 0
              ? 'open'
              : paidEntries.length > 0 || paymentAudits.length > 0
                ? 'paid'
                : 'none';
      const openAmount = entryOpenAmount || (status === 'reopened' && !entries.length ? auditedAmount : 0);
      const paidAmount = entryPaidAmount || (status === 'paid' && !entries.length ? auditedAmount : 0);
      const lastPaidAtFromEntries = paidEntries
        .map((entry) => entry.paidAt)
        .filter((value): value is Date => value instanceof Date)
        .sort((left, right) => right.getTime() - left.getTime())[0] || null;
      const lastPaidAt = text(latestPaymentMetadata?.after.paidAt)
        || isoDate(lastPaidAtFromEntries)
        || isoDate(latestPayment?.createdAt)
        || null;
      const closing = monthDay(month, card.closingDay);
      const dueMonth = card.dueDay <= card.closingDay ? addMonths(month, 1) : month;
      const due = monthDay(dueMonth, card.dueDay);

      return {
        month,
        status,
        statementAmount,
        openAmount,
        paidAmount,
        openInstallments: openEntries.length,
        paidInstallments: paidEntries.length,
        totalInstallments: entries.length,
        closingDate: closing.date,
        dueDate: due.date,
        paymentCount: paymentAudits.length || (lastPaidAtFromEntries ? 1 : 0),
        reopenCount: reopenAudits.length,
        lastPaidAt,
        lastLifecycleAt: isoDate(latestAudit?.createdAt),
        source: audits.length ? 'audit' : entries.length ? 'installments' : 'none',
        deltaAmount: 0,
        deltaPercent: null as number | null,
      };
    });

    for (let index = 1; index < items.length; index += 1) {
      const previous = items[index - 1];
      const current = items[index];
      current.deltaAmount = round(current.statementAmount - previous.statementAmount);
      current.deltaPercent = previous.statementAmount > 0
        ? round((current.deltaAmount / previous.statementAmount) * 100)
        : null;
    }

    const withStatement = items.filter((item) => item.statementAmount > 0);
    const highest = withStatement.reduce<{ month: string; amount: number } | null>((best, item) => {
      if (!best || item.statementAmount > best.amount) return { month: item.month, amount: item.statementAmount };
      return best;
    }, null);
    const statusCounts = items.reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});

    return {
      cardId: card.id,
      cardName: card.name,
      through,
      from: monthList[0],
      months,
      items,
      summary: {
        monthsWithStatement: withStatement.length,
        totalStatement: round(items.reduce((sum, item) => sum + item.statementAmount, 0)),
        totalPaid: round(items.reduce((sum, item) => sum + item.paidAmount, 0)),
        totalOpen: round(items.reduce((sum, item) => sum + item.openAmount, 0)),
        averageStatement: withStatement.length
          ? round(withStatement.reduce((sum, item) => sum + item.statementAmount, 0) / withStatement.length)
          : 0,
        highestStatement: highest,
        totalReopens: items.reduce((sum, item) => sum + item.reopenCount, 0),
        totalPayments: items.reduce((sum, item) => sum + item.paymentCount, 0),
        statusCounts,
      },
    };
  });
}
