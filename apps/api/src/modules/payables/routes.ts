import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@meg/database';
import { addMonthsClamped, moveWeekendToMonday, parseIsoDay } from './core';
import {
  createRecurringExpense,
  listPayables,
  payPayableProtected,
  PayableDomainError,
} from './service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const isoDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}/);

const payableSchema = z.object({
  categoryId: z.string().optional().nullable(),
  description: z.string().trim().min(2).max(160),
  totalAmount: z.coerce.number().positive(),
  dueDate: isoDaySchema,
  installmentQty: z.coerce.number().int().min(1).max(60).default(1),
  notes: z.string().max(500).optional().nullable(),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paidAt: isoDaySchema,
  interestAmount: z.coerce.number().min(0).default(0),
  fineAmount: z.coerce.number().min(0).default(0),
  accountId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  operationId: z.string().trim().min(8).max(128).optional(),
});

const recurringSchema = z.object({
  categoryId: z.string().optional().nullable(),
  description: z.string().trim().min(2).max(160),
  amount: z.coerce.number().positive(),
  frequency: z.enum(['weekly', 'monthly', 'yearly']).default('monthly'),
  nextDueDate: isoDaySchema,
  endDate: isoDaySchema.optional().nullable(),
  occurrenceCount: z.coerce.number().int().min(2).max(120).optional(),
  notes: z.string().max(500).optional().nullable(),
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function domainError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof PayableDomainError)) throw error;
  const status = error.code === 'PAYABLE_NOT_FOUND' ? 404 : error.code === 'OPERATION_ID_REUSED' ? 409 : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

export async function payableRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listPayables(request.user.sub, parsed.data.month);
  });

  app.post('/', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = payableSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const firstDay = parsed.data.dueDate.slice(0, 10);
    const anchor = parseIsoDay(firstDay)?.day;
    if (!anchor) return validationError(reply, { dueDate: ['Data de vencimento inválida.'] });
    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: parsed.data.categoryId, isActive: true } });
      if (!category) return reply.code(400).send({ error: 'INVALID_CATEGORY' });
    }
    const totalCents = Math.round(parsed.data.totalAmount * 100);
    const base = Math.floor(totalCents / parsed.data.installmentQty);
    const remainder = totalCents - base * parsed.data.installmentQty;
    const rows = Array.from({ length: parsed.data.installmentQty }, (_, index) => {
      const amount = (base + (index < remainder ? 1 : 0)) / 100;
      const calendarDay = addMonthsClamped(firstDay, index, anchor);
      const dueDay = moveWeekendToMonday(calendarDay);
      return {
        userId: request.user.sub,
        categoryId: parsed.data.categoryId,
        description: parsed.data.installmentQty > 1 ? `${parsed.data.description} ${index + 1}/${parsed.data.installmentQty}` : parsed.data.description,
        totalAmount: amount,
        openAmount: amount,
        dueDate: new Date(`${dueDay}T00:00:00.000Z`),
        installmentNo: index + 1,
        installmentQty: parsed.data.installmentQty,
        notes: parsed.data.notes,
      };
    });
    await prisma.payable.createMany({ data: rows });
    return reply.code(201).send({ created: rows.length });
  });

  app.post('/recurring', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = recurringSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      const result = await createRecurringExpense(request.user.sub, parsed.data);
      return reply.code(201).send(result);
    } catch (error) {
      return domainError(reply, error);
    }
  });

  app.post('/:id/payments', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = paymentSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      const payment = await payPayableProtected(request.user.sub, id, parsed.data);
      return reply.code(201).send(payment);
    } catch (error) {
      return domainError(reply, error);
    }
  });

  app.delete('/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.payable.updateMany({
      where: { id, userId: request.user.sub, status: { not: 'paid' } },
      data: { status: 'cancelled' },
    });
    if (!result.count) return reply.code(404).send({ error: 'PAYABLE_NOT_FOUND' });
    return { id, cancelled: true };
  });
}
