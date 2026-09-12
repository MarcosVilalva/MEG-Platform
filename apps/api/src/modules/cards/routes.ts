import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@meg/database';
import {
  CardDomainError,
  listCards,
  payCardStatementProtected,
  sharedCardContext,
} from './service';

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
const purchaseSchema = z.object({
  cardId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  description: z.string().trim().min(2).max(160),
  totalAmount: z.coerce.number().positive().finite(),
  purchaseDate: z.string().min(10),
  installments: z.coerce.number().int().min(1).max(48).default(1),
});
const statementPaymentSchema = z.object({
  accountId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  paidAt: z.string().min(10),
  operationId: z.string().trim().min(8).max(128).optional(),
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function domainError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof CardDomainError)) throw error;
  const status = error.code === 'CARD_NOT_FOUND' ? 404 : error.code === 'OPERATION_ID_REUSED' ? 409 : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

export async function cardRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listCards(request.user.sub, parsed.data.month);
  });

  app.post('/', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { ownerId } = await sharedCardContext(request.user.sub);
    return reply.code(201).send(await prisma.creditCard.create({ data: { userId: ownerId, ...parsed.data } }));
  });

  app.patch('/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const { ownerId } = await sharedCardContext(request.user.sub);
    const card = await prisma.creditCard.findFirst({ where: { id, userId: ownerId } });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    return prisma.creditCard.update({ where: { id }, data: parsed.data });
  });

  app.delete('/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { ownerId } = await sharedCardContext(request.user.sub);
    const card = await prisma.creditCard.findFirst({ where: { id, userId: ownerId } });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    return prisma.creditCard.update({ where: { id }, data: { isActive: false } });
  });

  app.post('/purchases', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = purchaseSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { ownerId } = await sharedCardContext(request.user.sub);
    const card = await prisma.creditCard.findFirst({ where: { id: parsed.data.cardId, userId: ownerId, isActive: true } });
    if (!card) return reply.code(400).send({ error: 'INVALID_CARD' });
    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: parsed.data.categoryId, isActive: true } });
      if (!category) return reply.code(400).send({ error: 'INVALID_CATEGORY' });
    }

    const purchaseDate = new Date(parsed.data.purchaseDate);
    const purchaseMonth = parsed.data.purchaseDate.slice(0, 7);
    const firstMonth = addMonths(purchaseMonth, purchaseDate.getUTCDate() > card.closingDay ? 1 : 0);
    const totalCents = Math.round(parsed.data.totalAmount * 100);
    const baseCents = Math.floor(totalCents / parsed.data.installments);
    const remainder = totalCents - baseCents * parsed.data.installments;

    const purchase = await prisma.cardPurchase.create({
      data: {
        userId: ownerId,
        cardId: card.id,
        categoryId: parsed.data.categoryId,
        description: parsed.data.description,
        totalAmount: parsed.data.totalAmount,
        purchaseDate,
        installments: parsed.data.installments,
        entries: {
          create: Array.from({ length: parsed.data.installments }, (_, index) => ({
            number: index + 1,
            amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
            statementMonth: addMonths(firstMonth, index),
          })),
        },
      },
      include: { entries: true, category: true },
    });
    return reply.code(201).send(purchase);
  });

  app.delete('/purchases/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { ownerId } = await sharedCardContext(request.user.sub);
    const purchase = await prisma.cardPurchase.findFirst({ where: { id, userId: ownerId } });
    if (!purchase) return reply.code(404).send({ error: 'PURCHASE_NOT_FOUND' });
    return prisma.cardPurchase.update({ where: { id }, data: { status: 'cancelled' } });
  });

  app.post('/:id/statements/:month/pay', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const params = z.object({ id: z.string(), month: monthSchema }).safeParse(request.params);
    const body = statementPaymentSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return validationError(reply, {
        params: params.success ? null : params.error.flatten(),
        body: body.success ? null : body.error.flatten(),
      });
    }
    try {
      const result = await payCardStatementProtected(request.user.sub, params.data.id, params.data.month, body.data);
      return reply.code(201).send(result);
    } catch (error) {
      return domainError(reply, error);
    }
  });
}
