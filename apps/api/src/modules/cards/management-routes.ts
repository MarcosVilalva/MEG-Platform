import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@meg/database';
import { serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

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

  app.post('/:id/reactivate', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const context = await resolveWorkspaceContext(request.user.sub);
    const ownerId = context.workspace.ownerId;

    try {
      const result = await serializableFinancialTransaction(async (tx) => {
        const card = await tx.creditCard.findFirst({
          where: { id: parsed.data.id, userId: ownerId },
        });
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

        const updated = await tx.creditCard.update({
          where: { id: card.id },
          data: { isActive: true },
        });
        await tx.auditLog.create({
          data: {
            userId: request.user.sub,
            entity: 'CreditCard',
            entityId: card.id,
            action: 'CARD_REACTIVATED',
            metadata: auditMetadata({ before: card, after: updated, workspaceId: context.workspaceId }),
          },
        });

        return { card: updated, reactivated: true, idempotentReplay: false };
      });

      return reply.send(result);
    } catch (error) {
      if (error instanceof CardManagementError) {
        return reply.code(error.statusCode).send({ error: error.code, details: error.details });
      }
      throw error;
    }
  });
}
