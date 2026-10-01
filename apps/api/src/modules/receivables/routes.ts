import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@meg/database';
import { ReceivableDomainError, createReceivableProtected, receiveReceivableProtected } from './service';
import { CustomerMutationError, createCustomerProtected, updateCustomerProtected } from './customer-mutation';
import { resolveWorkspaceContext } from '../workspaces/service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const operationIdSchema = z.string().trim().min(8).max(128).optional();
const isoDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'INVALID_DATE');

const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  document: z.string().trim().max(30).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  operationId: operationIdSchema,
});
const customerUpdateSchema = customerSchema.partial().extend({
  isActive: z.boolean().optional(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
});
const customerDeactivateSchema = z.object({
  operationId: operationIdSchema,
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
}).optional();

const receivableSchema = z.object({
  customerId: z.string().optional().nullable(),
  description: z.string().min(2).max(160),
  totalAmount: z.coerce.number().positive(),
  dueDate: isoDaySchema,
  installmentNo: z.coerce.number().int().positive().default(1),
  installmentQty: z.coerce.number().int().positive().default(1),
  interestRate: z.coerce.number().min(0).default(0),
  fineRate: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  operationId: operationIdSchema
});

const receiptSchema = z.object({
  amount: z.coerce.number().positive(),
  receivedAt: isoDaySchema,
  interestAmount: z.coerce.number().min(0).default(0),
  fineAmount: z.coerce.number().min(0).default(0),
  accountId: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  operationId: operationIdSchema
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function domainError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof ReceivableDomainError)) throw error;
  const status = error.code === 'RECEIVABLE_NOT_FOUND' ? 404 : error.code === 'OPERATION_ID_REUSED' ? 409 : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

function customerError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof CustomerMutationError)) throw error;
  const status = error.code === 'CUSTOMER_NOT_FOUND' ? 404
    : ['CUSTOMER_ALREADY_EXISTS', 'CUSTOMER_STALE_VERSION', 'OPERATION_ID_REUSED'].includes(error.code) ? 409
      : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

export async function receivableRoutes(app: FastifyInstance) {
  app.get('/customers', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const context = await resolveWorkspaceContext(request.user.sub);
    return prisma.customer.findMany({
      where: { userId: context.workspace.ownerId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });
  });

  app.post('/customers', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = customerSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await createCustomerProtected(request.user.sub, parsed.data));
    } catch (error) {
      return customerError(reply, error);
    }
  });

  app.patch('/customers/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = customerUpdateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      return await updateCustomerProtected(request.user.sub, id, parsed.data);
    } catch (error) {
      return customerError(reply, error);
    }
  });

  app.delete('/customers/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = customerDeactivateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      return await updateCustomerProtected(request.user.sub, id, { ...(parsed.data || {}), isActive: false });
    } catch (error) {
      return customerError(reply, error);
    }
  });

  app.get('/receivables', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const context = await resolveWorkspaceContext(request.user.sub);
    return prisma.receivable.findMany({
      where: { userId: context.workspace.ownerId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: { customer: true, receipts: { orderBy: { receivedAt: 'desc' } } }
    });
  });

  app.post('/receivables', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = receivableSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      const receivable = await createReceivableProtected(request.user.sub, parsed.data);
      return reply.code(201).send(receivable);
    } catch (error) {
      return domainError(reply, error);
    }
  });

  app.post('/receivables/:id/receipts', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = receiptSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      const receipt = await receiveReceivableProtected(request.user.sub, id, parsed.data);
      return reply.code(201).send(receipt);
    } catch (error) {
      return domainError(reply, error);
    }
  });
}
