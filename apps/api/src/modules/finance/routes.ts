import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createFinancialEventSchema, updateFinancialEventSchema } from './schemas';
import { listFinancialAudit } from './audit';
import {
  deleteFinancialEvent,
  listBudgetOverview,
  upsertBudget,
  deleteBudget,
  listFinancialEvents,
  updateFinancialEvent
} from './service';
import { getCanonicalFinancialAnalytics, getCanonicalFinancialCashflow, getCanonicalFinancialSummary } from './read-model';
import { getPhoenixBenefitSummary, listPhoenixFinancialEventsForMonth } from './phoenix-read';
import { registerPhoenixPreviewReads } from './phoenix-preview-routes';
import { FinancialEventMutationError, createFinancialEventProtected } from './event-mutation';
import { FinancialTransferError, createFinancialTransfer } from './transfer-service';
import { prisma } from '@meg/database';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const operationIdSchema = z.string().trim().min(8).max(128).optional();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const createEventRequestSchema = createFinancialEventSchema.extend({ operationId: operationIdSchema });
const transferRequestSchema = z.object({
  operationId: z.string().trim().min(8).max(128),
  sourceAccountId: z.string().trim().min(1).max(128),
  destinationAccountId: z.string().trim().min(1).max(128),
  amount: z.coerce.number().positive().finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(2).max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const accountSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['checking', 'savings', 'cash', 'investment', 'credit', 'benefit']),
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
  if (error instanceof FinancialEventMutationError) {
    const status = error.code === 'FINANCIAL_EVENT_NOT_FOUND' ? 404 : error.code === 'OPERATION_ID_REUSED' ? 409 : 400;
    return reply.code(status).send({ error: error.code, ...(error.details || {}) });
  }
  if (!(error instanceof Error)) throw error;
  if (error.message === 'FINANCIAL_EVENT_NOT_FOUND') return reply.code(404).send({ error: error.message });
  if (['INVALID_ACCOUNT', 'INVALID_CATEGORY', 'INVALID_PAYMENT_METHOD'].includes(error.message)) {
    return reply.code(400).send({ error: error.message });
  }
  throw error;
}

function transferError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof FinancialTransferError)) throw error;
  const status = ['OPERATION_ID_REUSED', 'INSUFFICIENT_SOURCE_ACCOUNT_BALANCE'].includes(error.code) ? 409 : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

export async function financeRoutes(app: FastifyInstance) {
  registerPhoenixPreviewReads(app);

  app.get('/analytics', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return getCanonicalFinancialAnalytics(request.user.sub, parsed.data.month);
  });

  app.get('/budgets', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listBudgetOverview(request.user.sub, parsed.data.month);
  });

  app.put('/budgets', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = z.object({
      month: monthSchema,
      group: z.string().trim().min(2).max(120),
      amount: z.coerce.number().positive().finite()
    }).safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return upsertBudget(request.user.sub, parsed.data);
  });

  app.delete('/budgets/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await deleteBudget(request.user.sub, id);
    } catch (error) {
      if (error instanceof Error && error.message === 'BUDGET_NOT_FOUND') {
        return reply.code(404).send({ error: 'BUDGET_NOT_FOUND' });
      }
      throw error;
    }
  });

  app.get('/cashflow', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return getCanonicalFinancialCashflow(request.user.sub, parsed.data.month);
  });

  app.get('/summary', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return getCanonicalFinancialSummary(request.user.sub, parsed.data.month);
  });

  app.get('/benefit-summary', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return getPhoenixBenefitSummary(request.user.sub, parsed.data.month);
  });

  app.get('/events/month', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listPhoenixFinancialEventsForMonth(request.user.sub, parsed.data.month);
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

  app.get('/audit', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(10).max(100).default(50),
      action: z.string().trim().max(80).optional(),
      entity: z.string().trim().max(80).optional(),
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listFinancialAudit(request.user.sub, parsed.data);
  });

  app.post('/events', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = createEventRequestSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await createFinancialEventProtected(request.user.sub, parsed.data));
    } catch (error) {
      return eventError(reply, error);
    }
  });

  app.post('/transfers', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = transferRequestSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await createFinancialTransfer(request.user.sub, parsed.data));
    } catch (error) {
      return transferError(reply, error);
    }
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

  app.get('/accounts', { preHandler: app.authorize([...readRoles]) }, async (request) =>
    prisma.account.findMany({ where: { userId: request.user.sub }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })
  );

  app.post('/accounts', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = accountSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await prisma.account.create({ data: { userId: request.user.sub, ...parsed.data } }));
  });

  app.patch('/accounts/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = accountSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const current = await prisma.account.findFirst({ where: { id, userId: request.user.sub } });
    if (!current) return reply.code(404).send({ error: 'ACCOUNT_NOT_FOUND' });
    return prisma.account.update({ where: { id }, data: parsed.data });
  });

  app.delete('/accounts/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const current = await prisma.account.findFirst({ where: { id, userId: request.user.sub } });
    if (!current) return reply.code(404).send({ error: 'ACCOUNT_NOT_FOUND' });
    return prisma.account.update({ where: { id }, data: { isActive: false } });
  });

  app.get('/categories', { preHandler: app.authorize([...readRoles]) }, async (request) =>
    prisma.category.findMany({ where: { userId: request.user.sub }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })
  );

  app.post('/categories', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = categorySchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await prisma.category.create({ data: { userId: request.user.sub, ...parsed.data } }));
  });

  app.patch('/categories/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = categorySchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const current = await prisma.category.findFirst({ where: { id, userId: request.user.sub } });
    if (!current) return reply.code(404).send({ error: 'CATEGORY_NOT_FOUND' });
    return prisma.category.update({ where: { id }, data: parsed.data });
  });

  app.delete('/categories/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const current = await prisma.category.findFirst({ where: { id, userId: request.user.sub } });
    if (!current) return reply.code(404).send({ error: 'CATEGORY_NOT_FOUND' });
    return prisma.category.update({ where: { id }, data: { isActive: false } });
  });

  app.get('/payment-methods', { preHandler: app.authorize([...readRoles]) }, async (request) =>
    prisma.paymentMethod.findMany({ where: { userId: request.user.sub }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })
  );

  app.post('/payment-methods', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = paymentMethodSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const duplicate = await prisma.paymentMethod.findFirst({ where: { userId: request.user.sub, name: parsed.data.name } });
    if (duplicate) return reply.code(409).send({ error: 'PAYMENT_METHOD_ALREADY_EXISTS' });
    return reply.code(201).send(await prisma.paymentMethod.create({ data: { userId: request.user.sub, ...parsed.data } }));
  });

  app.patch('/payment-methods/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = paymentMethodSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const current = await prisma.paymentMethod.findFirst({ where: { id, userId: request.user.sub } });
    if (!current) return reply.code(404).send({ error: 'PAYMENT_METHOD_NOT_FOUND' });
    if (parsed.data.name) {
      const duplicate = await prisma.paymentMethod.findFirst({ where: { userId: request.user.sub, name: parsed.data.name, id: { not: id } } });
      if (duplicate) return reply.code(409).send({ error: 'PAYMENT_METHOD_ALREADY_EXISTS' });
    }
    return prisma.paymentMethod.update({ where: { id }, data: parsed.data });
  });

  app.delete('/payment-methods/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const current = await prisma.paymentMethod.findFirst({ where: { id, userId: request.user.sub } });
    if (!current) return reply.code(404).send({ error: 'PAYMENT_METHOD_NOT_FOUND' });
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
