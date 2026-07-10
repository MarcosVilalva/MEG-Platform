import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createFinancialEventSchema, updateFinancialEventSchema } from './schemas';
import {
  createFinancialEvent,
  deleteFinancialEvent,
  getFinancialSummary,
  getFinancialCashflow,
  listFinancialEvents,
  updateFinancialEvent
} from './service';
import { prisma } from '@meg/database';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;

const accountSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['checking', 'savings', 'cash', 'investment', 'credit']),
  institution: z.string().max(120).optional().nullable(),
  openingBalance: z.coerce.number().finite().default(0),
  isActive: z.boolean().optional()
});

const categorySchema = z.object({
  name: z.string().min(2).max(120),
  group: z.string().max(120).optional().nullable(),
  type: z.enum(['income', 'expense']).optional().nullable(),
  isActive: z.boolean().optional()
});

const paymentMethodSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['instant', 'bill', 'credit', 'debit', 'transfer', 'cash', 'other']).optional().nullable(),
  isActive: z.boolean().optional()
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function eventError(reply: FastifyReply, error: unknown) {
  if (error instanceof Error && error.message === 'FINANCIAL_EVENT_NOT_FOUND') {
    return reply.code(404).send({ error: 'FINANCIAL_EVENT_NOT_FOUND' });
  }
  throw error;
}

export async function financeRoutes(app: FastifyInstance) {
  app.get('/cashflow', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return getFinancialCashflow(request.user.sub, parsed.data.month);
  });
  app.get('/summary', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return getFinancialSummary(request.user.sub, parsed.data.month);
  });
  app.get('/events', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(10).max(100).default(50),
      search: z.string().trim().max(120).optional()
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listFinancialEvents(request.user.sub, parsed.data);
  });

  app.post('/events', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = createFinancialEventSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await createFinancialEvent(request.user.sub, parsed.data));
  });

  app.patch('/events/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateFinancialEventSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return await updateFinancialEvent(request.user.sub, id, parsed.data);
    } catch (error) {
      return eventError(reply, error);
    }
  });

  app.delete('/events/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await deleteFinancialEvent(request.user.sub, id);
    } catch (error) {
      return eventError(reply, error);
    }
  });

  app.get('/accounts', { preHandler: app.authorize([...readRoles]) }, async () =>
    prisma.account.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })
  );

  app.post('/accounts', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = accountSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await prisma.account.create({ data: parsed.data }));
  });

  app.patch('/accounts/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = accountSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    return prisma.account.update({ where: { id }, data: parsed.data });
  });

  app.delete('/accounts/:id', { preHandler: app.authorize([...adminRoles]) }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.account.update({ where: { id }, data: { isActive: false } });
  });

  app.get('/categories', { preHandler: app.authorize([...readRoles]) }, async () =>
    prisma.category.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })
  );

  app.post('/categories', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = categorySchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await prisma.category.create({ data: parsed.data }));
  });

  app.patch('/categories/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = categorySchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    return prisma.category.update({ where: { id }, data: parsed.data });
  });

  app.delete('/categories/:id', { preHandler: app.authorize([...adminRoles]) }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.category.update({ where: { id }, data: { isActive: false } });
  });

  app.get('/payment-methods', { preHandler: app.authorize([...readRoles]) }, async () =>
    prisma.paymentMethod.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })
  );

  app.post('/payment-methods', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = paymentMethodSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await prisma.paymentMethod.create({ data: parsed.data }));
  });

  app.patch('/payment-methods/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = paymentMethodSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    return prisma.paymentMethod.update({ where: { id }, data: parsed.data });
  });

  app.delete('/payment-methods/:id', { preHandler: app.authorize([...adminRoles]) }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.paymentMethod.update({ where: { id }, data: { isActive: false } });
  });

  app.get('/ledger', { preHandler: app.authorize([...readRoles]) }, async (request) =>
    prisma.ledgerEntry.findMany({
      where: { event: { userId: request.user.sub } },
      orderBy: { date: 'desc' },
      include: { account: true, event: true }
    })
  );
}