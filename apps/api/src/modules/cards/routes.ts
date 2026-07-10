import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '@meg/database';
import { z } from 'zod';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const cardSchema = z.object({ name: z.string().min(2).max(80), issuer: z.string().max(80).optional().nullable(), brand: z.string().max(40).optional().nullable(), lastFour: z.string().regex(/^\d{4}$/).optional().nullable(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0f927f'), creditLimit: z.coerce.number().positive(), closingDay: z.coerce.number().int().min(1).max(31), dueDay: z.coerce.number().int().min(1).max(31) });
const purchaseSchema = z.object({ description: z.string().min(2).max(160), purchaseDate: z.string().min(10), totalAmount: z.coerce.number().positive(), installmentQty: z.coerce.number().int().min(1).max(120).default(1), categoryId: z.string().optional().nullable(), notes: z.string().max(500).optional().nullable() });
const validationError = (reply: FastifyReply, details: unknown) => reply.code(400).send({ error: 'VALIDATION_ERROR', details });

function invoiceMonth(date: Date, closingDay: number, index: number) {
  const offset = date.getUTCDate() > closingDay ? 2 : 1;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset + index, 1)).toISOString().slice(0, 7);
}

export async function cardRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const cards = await prisma.creditCard.findMany({ where: { userId: request.user.sub }, include: { purchases: { where: { isCancelled: false }, orderBy: { purchaseDate: 'desc' } } }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
    return cards.map((card) => { const committed = card.purchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount), 0); return { ...card, committed, availableLimit: Math.max(0, Number(card.creditLimit) - committed) }; });
  });

  app.post('/', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await prisma.creditCard.create({ data: { userId: request.user.sub, ...parsed.data } }));
  });

  app.patch('/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.partial().safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string }; const card = await prisma.creditCard.findFirst({ where: { id, userId: request.user.sub } }); if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    return prisma.creditCard.update({ where: { id }, data: parsed.data });
  });

  app.delete('/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string }; const card = await prisma.creditCard.findFirst({ where: { id, userId: request.user.sub } }); if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    return prisma.creditCard.update({ where: { id }, data: { isActive: false } });
  });

  app.post('/:id/purchases', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = purchaseSchema.safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string }; const card = await prisma.creditCard.findFirst({ where: { id, userId: request.user.sub, isActive: true } }); if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    const sum = await prisma.cardPurchase.aggregate({ where: { cardId: id, isCancelled: false }, _sum: { totalAmount: true } });
    if (Number(sum._sum.totalAmount ?? 0) + parsed.data.totalAmount > Number(card.creditLimit)) return reply.code(400).send({ error: 'CARD_LIMIT_EXCEEDED' });
    return reply.code(201).send(await prisma.cardPurchase.create({ data: { userId: request.user.sub, cardId: id, ...parsed.data, purchaseDate: new Date(parsed.data.purchaseDate) } }));
  });

  app.delete('/purchases/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string }; const purchase = await prisma.cardPurchase.findFirst({ where: { id, userId: request.user.sub } }); if (!purchase) return reply.code(404).send({ error: 'PURCHASE_NOT_FOUND' });
    return prisma.cardPurchase.update({ where: { id }, data: { isCancelled: true } });
  });

  app.get('/invoices', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse(request.query); if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const cards = await prisma.creditCard.findMany({ where: { userId: request.user.sub }, include: { purchases: { where: { isCancelled: false } } } });
    return cards.map((card) => { const items = card.purchases.flatMap((purchase) => { const qty = purchase.installmentQty; const base = Math.floor(Number(purchase.totalAmount) * 100 / qty) / 100; return Array.from({ length: qty }, (_, index) => ({ purchaseId: purchase.id, description: purchase.description, installment: index + 1, quantity: qty, amount: index === qty - 1 ? Number(purchase.totalAmount) - base * (qty - 1) : base, month: invoiceMonth(purchase.purchaseDate, card.closingDay, index) })).filter((item) => item.month === parsed.data.month); }); return { cardId: card.id, cardName: card.name, dueDay: card.dueDay, month: parsed.data.month, total: items.reduce((sum, item) => sum + item.amount, 0), items }; });
  });
}
