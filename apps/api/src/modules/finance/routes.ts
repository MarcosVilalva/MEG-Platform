import type { FastifyInstance } from 'fastify';
import { createFinancialEventSchema, updateFinancialEventSchema } from './schemas';
import {
  createFinancialEvent,
  deleteFinancialEvent,
  listFinancialEvents,
  updateFinancialEvent
} from './service';
import { prisma } from '@meg/database';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;

export async function financeRoutes(app: FastifyInstance) {
  app.get('/events', { preHandler: app.authorize([...readRoles]) }, async () => listFinancialEvents());

  app.post('/events', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = createFinancialEventSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    return createFinancialEvent(parsed.data);
  });

  app.patch('/events/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateFinancialEventSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    return updateFinancialEvent(id, parsed.data);
  });

  app.delete('/events/:id', { preHandler: app.authorize([...adminRoles]) }, async (request) => {
    const { id } = request.params as { id: string };
    return deleteFinancialEvent(id);
  });

  app.get('/accounts', { preHandler: app.authorize([...readRoles]) }, async () => {
    return prisma.account.findMany({ orderBy: { name: 'asc' } });
  });

  app.get('/categories', { preHandler: app.authorize([...readRoles]) }, async () => {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  });

  app.get('/payment-methods', { preHandler: app.authorize([...readRoles]) }, async () => {
    return prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } });
  });

  app.get('/ledger', { preHandler: app.authorize([...readRoles]) }, async () => {
    return prisma.ledgerEntry.findMany({
      orderBy: { date: 'desc' },
      include: {
        account: true,
        event: true
      }
    });
  });
}
