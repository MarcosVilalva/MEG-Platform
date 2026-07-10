import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@meg/database';

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
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});
const purchaseSchema = z.object({
  cardId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  description: z.string().trim().min(2).max(160),
  totalAmount: z.coerce.number().positive().finite(),
  purchaseDate: z.string().min(10),
  installments: z.coerce.number().int().min(1).max(48).default(1)
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

export async function cardRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const cards = await prisma.creditCard.findMany({
      where: { userId: request.user.sub, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        purchases: {
          where: { status: 'active' },
          include: { entries: true, category: true },
          orderBy: { purchaseDate: 'desc' }
        }
      }
    });
    return cards.map((card) => {
      const entries = card.purchases.flatMap((purchase) => purchase.entries);
      const usedLimit = entries.filter((entry) => entry.status === 'open').reduce((sum, entry) => sum + Number(entry.amount), 0);
      const statementAmount = entries.filter((entry) => entry.statementMonth === parsed.data.month && entry.status === 'open').reduce((sum, entry) => sum + Number(entry.amount), 0);
      return { ...card, usedLimit, availableLimit: Number(card.creditLimit) - usedLimit, statementAmount };
    });
  });

  app.post('/', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await prisma.creditCard.create({ data: { userId: request.user.sub, ...parsed.data } }));
  });

  app.patch('/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const card = await prisma.creditCard.findFirst({ where: { id, userId: request.user.sub } });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    return prisma.creditCard.update({ where: { id }, data: parsed.data });
  });

  app.delete('/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await prisma.creditCard.findFirst({ where: { id, userId: request.user.sub } });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    return prisma.creditCard.update({ where: { id }, data: { isActive: false } });
  });

  app.post('/purchases', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = purchaseSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const card = await prisma.creditCard.findFirst({ where: { id: parsed.data.cardId, userId: request.user.sub, isActive: true } });
    if (!card) return reply.code(400).send({ error: 'INVALID_CARD' });
    if (parsed.data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
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
        userId: request.user.sub,
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
            statementMonth: addMonths(firstMonth, index)
          }))
        }
      },
      include: { entries: true, category: true }
    });
    return reply.code(201).send(purchase);
  });

  app.delete('/purchases/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const purchase = await prisma.cardPurchase.findFirst({ where: { id, userId: request.user.sub } });
    if (!purchase) return reply.code(404).send({ error: 'PURCHASE_NOT_FOUND' });
    return prisma.cardPurchase.update({ where: { id }, data: { status: 'cancelled' } });
  });

  app.post('/:id/statements/:month/pay', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const params = z.object({ id: z.string(), month: monthSchema }).safeParse(request.params);
    const body = z.object({ accountId: z.string().optional().nullable(), paymentMethodId: z.string().optional().nullable(), paidAt: z.string().min(10) }).safeParse(request.body);
    if (!params.success || !body.success) return validationError(reply, { params: params.success ? null : params.error.flatten(), body: body.success ? null : body.error.flatten() });
    const card = await prisma.creditCard.findFirst({ where: { id: params.data.id, userId: request.user.sub } });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    const entries = await prisma.cardInstallment.findMany({ where: { purchase: { cardId: card.id, userId: request.user.sub, status: 'active' }, statementMonth: params.data.month, status: 'open' } });
    if (!entries.length) return reply.code(400).send({ error: 'EMPTY_STATEMENT' });
    const amount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    return prisma.$transaction(async (tx) => {
      await tx.cardInstallment.updateMany({ where: { id: { in: entries.map((entry) => entry.id) } }, data: { status: 'paid', paidAt: new Date(body.data.paidAt) } });
      const event = await tx.financialEvent.create({ data: {
        userId: request.user.sub,
        description: `Fatura ${card.name} ${params.data.month}`,
        type: 'expense', status: 'paid', date: new Date(body.data.paidAt), competence: body.data.paidAt.slice(0, 7),
        amount, signedAmount: -amount, accountId: body.data.accountId, paymentMethodId: body.data.paymentMethodId
      } });
      return { paid: true, amount, eventId: event.id };
    });
  });
}