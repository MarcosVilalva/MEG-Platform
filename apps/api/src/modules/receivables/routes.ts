import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@meg/database';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;

const customerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  document: z.string().max(30).optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

const receivableSchema = z.object({
  customerId: z.string().optional().nullable(),
  description: z.string().min(2).max(160),
  totalAmount: z.coerce.number().positive(),
  dueDate: z.string().min(10),
  installmentNo: z.coerce.number().int().positive().default(1),
  installmentQty: z.coerce.number().int().positive().default(1),
  interestRate: z.coerce.number().min(0).default(0),
  fineRate: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable()
});

const receiptSchema = z.object({
  amount: z.coerce.number().positive(),
  receivedAt: z.string().min(10),
  interestAmount: z.coerce.number().min(0).default(0),
  fineAmount: z.coerce.number().min(0).default(0),
  accountId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

export async function receivableRoutes(app: FastifyInstance) {
  app.get('/customers', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    return prisma.customer.findMany({
      where: { userId: request.user.sub },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });
  });

  app.post('/customers', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = customerSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return reply.code(201).send(await prisma.customer.create({
      data: { userId: request.user.sub, ...parsed.data }
    }));
  });

  app.patch('/customers/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = customerSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const existing = await prisma.customer.findFirst({ where: { id, userId: request.user.sub } });
    if (!existing) return reply.code(404).send({ error: 'CUSTOMER_NOT_FOUND' });
    return prisma.customer.update({ where: { id }, data: parsed.data });
  });

  app.delete('/customers/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.customer.findFirst({ where: { id, userId: request.user.sub } });
    if (!existing) return reply.code(404).send({ error: 'CUSTOMER_NOT_FOUND' });
    return prisma.customer.update({ where: { id }, data: { isActive: false } });
  });

  app.get('/receivables', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    return prisma.receivable.findMany({
      where: { userId: request.user.sub },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: { customer: true, receipts: { orderBy: { receivedAt: 'desc' } } }
    });
  });

  app.post('/receivables', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = receivableSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if (parsed.data.customerId) {
      const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, userId: request.user.sub } });
      if (!customer) return reply.code(400).send({ error: 'INVALID_CUSTOMER' });
    }
    const value = Math.abs(parsed.data.totalAmount);
    return reply.code(201).send(await prisma.receivable.create({
      data: {
        userId: request.user.sub,
        ...parsed.data,
        dueDate: new Date(parsed.data.dueDate),
        totalAmount: value,
        openAmount: value
      },
      include: { customer: true, receipts: true }
    }));
  });

  app.post('/receivables/:id/receipts', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = receiptSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const receivable = await prisma.receivable.findFirst({ where: { id, userId: request.user.sub } });
    if (!receivable) return reply.code(404).send({ error: 'RECEIVABLE_NOT_FOUND' });

    const principal = Math.abs(parsed.data.amount);
    const open = Number(receivable.openAmount);
    if (principal > open) return reply.code(400).send({ error: 'AMOUNT_EXCEEDS_OPEN_BALANCE' });

    return prisma.$transaction(async (tx) => {
      const event = parsed.data.accountId ? await tx.financialEvent.create({
        data: {
          userId: request.user.sub,
          description: `Recebimento: ${receivable.description}`,
          type: 'income',
          status: 'paid',
          date: new Date(parsed.data.receivedAt),
          competence: parsed.data.receivedAt.slice(0, 7),
          amount: principal + parsed.data.interestAmount + parsed.data.fineAmount,
          signedAmount: principal + parsed.data.interestAmount + parsed.data.fineAmount,
          accountId: parsed.data.accountId,
          paymentMethodId: parsed.data.paymentMethodId,
          notes: parsed.data.notes
        }
      }) : null;

      const receipt = await tx.receipt.create({
        data: {
          receivableId: id,
          amount: principal,
          receivedAt: new Date(parsed.data.receivedAt),
          interestAmount: parsed.data.interestAmount,
          fineAmount: parsed.data.fineAmount,
          accountId: parsed.data.accountId,
          paymentMethodId: parsed.data.paymentMethodId,
          financialEventId: event?.id,
          notes: parsed.data.notes
        }
      });

      const remaining = Math.max(0, open - principal);
      await tx.receivable.update({
        where: { id },
        data: { openAmount: remaining, status: remaining === 0 ? 'paid' : 'partial' }
      });

      return reply.code(201).send(receipt);
    });
  });
}