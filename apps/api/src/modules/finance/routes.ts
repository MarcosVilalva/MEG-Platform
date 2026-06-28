import type { FastifyInstance } from 'fastify';
import { createFinancialEventSchema, updateFinancialEventSchema } from './schemas';
import {
  createFinancialEvent,
  deleteFinancialEvent,
  listFinancialEvents,
  updateFinancialEvent
} from './service';
import { prisma } from '@meg/database';

export async function financeRoutes(app: FastifyInstance) {
  app.get('/events', async () => listFinancialEvents());

  app.post('/events', async (request, reply) => {
    const parsed = createFinancialEventSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    return createFinancialEvent(parsed.data);
  });

  app.patch('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateFinancialEventSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    return updateFinancialEvent(id, parsed.data);
  });

  app.delete('/events/:id', async (request) => {
    const { id } = request.params as { id: string };
    return deleteFinancialEvent(id);
  });

  app.get('/accounts', async () => {
    return prisma.account.findMany({ orderBy: { name: 'asc' } });
  });

  app.get('/categories', async () => {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  });

  app.get('/payment-methods', async () => {
    return prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } });
  });

  app.get('/ledger', async () => {
    return prisma.ledgerEntry.findMany({
      orderBy: { date: 'desc' },
      include: {
        account: true,
        event: true
      }
    });
  });
}
