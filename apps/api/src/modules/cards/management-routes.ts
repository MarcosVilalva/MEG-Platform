import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Prisma, prisma } from '@meg/database';
import { serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const cardSchema = z.object({
  name: z.string().trim().min(2).max(80),
  issuer: z.string().trim().max(80).optional().nullable(),
  brand: z.string().trim().max(40).optional().nullable(),
  lastFour: z.string().regex(/^\d{4}$/).optional().nullable(),
  creditLimit: z.coerce.number().positive().finite(),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

type Tx = Prisma.TransactionClient;

class CardManagementError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, public readonly details?: unknown) {
    super(code);
  }
}

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function key(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function auditMetadata(input: { before: unknown; after: unknown; workspaceId: string }) {
  return JSON.stringify({
    schemaVersion: 1,
    before: input.before,
    after: input.after,
    context: { workspaceId: input.workspaceId, source: 'card-management' },
  });
}

async function assertUniqueCardName(tx: Tx, ownerId: string, name: string, ignoreId?: string) {
  const cards = await tx.creditCard.findMany({
    where: { userId: ownerId },
    select: { id: true, name: true, isActive: true },
  });
  const conflict = cards.find((card) => card.id !== ignoreId && key(card.name) === key(name));
  if (conflict) {
    throw new CardManagementError(409, conflict.isActive ? 'CARD_NAME_ALREADY_ACTIVE' : 'CARD_NAME_ALREADY_INACTIVE', {
      conflictingCardId: conflict.id,
      conflictingCardName: conflict.name,
      conflictingCardActive: conflict.isActive,
    });
  }
}

async function writeAudit(tx: Tx, input: {
  actorId: string;
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  workspaceId: string;
}) {
  await tx.auditLog.create({
    data: {
      userId: input.actorId,
      entity: 'CreditCard',
      entityId: input.entityId,
      action: input.action,
      metadata: auditMetadata({ before: input.before, after: input.after, workspaceId: input.workspaceId }),
    },
  });
}

export async function cardManagementRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const context = await resolveWorkspaceContext(request.user.sub);
    const ownerId = context.workspace.ownerId;
    const cards = await prisma.creditCard.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: 'asc' },
      include: {
        purchases: {
          where: { status: 'active' },
          include: { entries: true, category: true },
          orderBy: { purchaseDate: 'desc' },
        },
      },
    });

    return cards.map((card) => {
      const entries = card.purchases.flatMap((purchase) => purchase.entries);
      const openEntries = entries.filter((entry) => entry.status === 'open');
      const usedLimit = openEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
      const payableStatementAmount = openEntries
        .filter((entry) => entry.statementMonth === parsed.data.month)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      return {
        ...card,
        usedLimit,
        availableLimit: Number(card.creditLimit) - usedLimit,
        statementAmount: payableStatementAmount,
        payableStatementAmount,
      };
    });
  });

  app.post('/', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const context = await resolveWorkspaceContext(request.user.sub);
    const ownerId = context.workspace.ownerId;

    try {
      const result = await serializableFinancialTransaction(async (tx) => {
        await assertUniqueCardName(tx, ownerId, parsed.data.name);
        const card = await tx.creditCard.create({ data: { userId: ownerId, ...parsed.data } });
        await writeAudit(tx, {
          actorId: request.user.sub,
          entityId: card.id,
          action: 'CARD_CREATED',
          before: null,
          after: card,
          workspaceId: context.workspaceId,
        });
        return card;
      });
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof CardManagementError) return reply.code(error.statusCode).send({ error: error.code, details: error.details });
      throw error;
    }
  });

  app.patch('/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = cardSchema.partial().safeParse(request.body);
    if (!params.success || !body.success) {
      return validationError(reply, { params: params.success ? null : params.error.flatten(), body: body.success ? null : body.error.flatten() });
    }
    const context = await resolveWorkspaceContext(request.user.sub);
    const ownerId = context.workspace.ownerId;

    try {
      const result = await serializableFinancialTransaction(async (tx) => {
        const before = await tx.creditCard.findFirst({ where: { id: params.data.id, userId: ownerId } });
        if (!before) throw new CardManagementError(404, 'CARD_NOT_FOUND');
        if (body.data.name) await assertUniqueCardName(tx, ownerId, body.data.name, before.id);
        const after = await tx.creditCard.update({ where: { id: before.id }, data: body.data });
        await writeAudit(tx, {
          actorId: request.user.sub,
          entityId: before.id,
          action: 'CARD_UPDATED',
          before,
          after,
          workspaceId: context.workspaceId,
        });
        return after;
      });
      return reply.send(result);
    } catch (error) {
      if (error instanceof CardManagementError) return reply.code(error.statusCode).send({ error: error.code, details: error.details });
      throw error;
    }
  });

  app.delete('/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const context = await resolveWorkspaceContext(request.user.sub);
    const ownerId = context.workspace.ownerId;

    try {
      const result = await serializableFinancialTransaction(async (tx) => {
        const before = await tx.creditCard.findFirst({ where: { id: parsed.data.id, userId: ownerId } });
        if (!before) throw new CardManagementError(404, 'CARD_NOT_FOUND');
        if (!before.isActive) return { ...before, idempotentReplay: true };
        const after = await tx.creditCard.update({ where: { id: before.id }, data: { isActive: false } });
        await writeAudit(tx, {
          actorId: request.user.sub,
          entityId: before.id,
          action: 'CARD_DEACTIVATED',
          before,
          after,
          workspaceId: context.workspaceId,
        });
        return after;
      });
      return reply.send(result);
    } catch (error) {
      if (error instanceof CardManagementError) return reply.code(error.statusCode).send({ error: error.code, details: error.details });
      throw error;
    }
  });

  app.post('/:id/reactivate', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const context = await resolveWorkspaceContext(request.user.sub);
    const ownerId = context.workspace.ownerId;

    try {
      const result = await serializableFinancialTransaction(async (tx) => {
        const card = await tx.creditCard.findFirst({ where: { id: parsed.data.id, userId: ownerId } });
        if (!card) throw new CardManagementError(404, 'CARD_NOT_FOUND');
        if (card.isActive) return { card, reactivated: false, idempotentReplay: true };

        const activeCards = await tx.creditCard.findMany({
          where: { userId: ownerId, isActive: true },
          select: { id: true, name: true },
        });
        const conflict = activeCards.find((candidate) => candidate.id !== card.id && key(candidate.name) === key(card.name));
        if (conflict) {
          throw new CardManagementError(409, 'CARD_NAME_ALREADY_ACTIVE', {
            conflictingCardId: conflict.id,
            conflictingCardName: conflict.name,
          });
        }

        const updated = await tx.creditCard.update({ where: { id: card.id }, data: { isActive: true } });
        await writeAudit(tx, {
          actorId: request.user.sub,
          entityId: card.id,
          action: 'CARD_REACTIVATED',
          before: card,
          after: updated,
          workspaceId: context.workspaceId,
        });

        return { card: updated, reactivated: true, idempotentReplay: false };
      });

      return reply.send(result);
    } catch (error) {
      if (error instanceof CardManagementError) return reply.code(error.statusCode).send({ error: error.code, details: error.details });
      throw error;
    }
  });
}
