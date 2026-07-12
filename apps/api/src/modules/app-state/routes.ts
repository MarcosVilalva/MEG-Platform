import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma, prisma } from '@meg/database';

const transactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(10),
  description: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().nonnegative()
}).passthrough();

const stateSchema = z.object({
  transactions: z.array(transactionSchema).max(20000),
  budgets: z.record(z.string(), z.coerce.number().nonnegative()).default({})
}).passthrough();

const putSchema = z.object({
  state: stateSchema,
  expectedRevision: z.number().int().nonnegative().optional()
});

export async function appStateRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authenticate }, async (request) => {
    const saved = await prisma.appState.findUnique({ where: { userId: request.user.sub } });
    return saved
      ? { state: saved.state, revision: saved.revision, updatedAt: saved.updatedAt }
      : { state: null, revision: 0, updatedAt: null };
  });

  app.put('/', { preHandler: app.authorize(['ADMIN', 'MANAGER', 'OPERATOR']) }, async (request, reply) => {
    const parsed = putSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_APP_STATE', details: parsed.error.flatten() });
    }

    const current = await prisma.appState.findUnique({ where: { userId: request.user.sub } });
    if (current && parsed.data.expectedRevision !== undefined && current.revision !== parsed.data.expectedRevision) {
      return reply.status(409).send({
        error: 'STATE_CONFLICT',
        revision: current.revision,
        updatedAt: current.updatedAt
      });
    }

    const jsonState = JSON.parse(JSON.stringify(parsed.data.state)) as Prisma.InputJsonValue;
    const saved = await prisma.appState.upsert({
      where: { userId: request.user.sub },
      create: { userId: request.user.sub, state: jsonState, revision: 1 },
      update: { state: jsonState, revision: { increment: 1 } }
    });

    return { revision: saved.revision, updatedAt: saved.updatedAt };
  });
}
