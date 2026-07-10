import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '@meg/database';
import { z } from 'zod';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const validationError = (reply: FastifyReply, details: unknown) => reply.code(400).send({ error: 'VALIDATION_ERROR', details });

export async function planningRoutes(app: FastifyInstance) {
  app.get('/budgets', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query); if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const budgets = await prisma.budget.findMany({ where: { userId: request.user.sub, month: parsed.data.month }, orderBy: { group: 'asc' } });
    const events = await prisma.financialEvent.findMany({ where: { userId: request.user.sub, type: 'expense', competence: parsed.data.month, archivedAt: null }, include: { category: true } });
    const spent = events.reduce<Record<string, number>>((result, event) => { const group = event.category?.group || 'Sem categoria'; result[group] = (result[group] || 0) + Number(event.amount); return result; }, {});
    return budgets.map((budget) => ({ ...budget, spent: spent[budget.group] || 0, remaining: Number(budget.amount) - (spent[budget.group] || 0) }));
  });

  app.put('/budgets/:group', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const params = z.object({ group: z.string().min(1).max(80) }).safeParse(request.params); const body = z.object({ month: monthSchema, amount: z.coerce.number().positive() }).safeParse(request.body);
    if (!params.success || !body.success) return validationError(reply, { params: params.success ? undefined : params.error.flatten(), body: body.success ? undefined : body.error.flatten() });
    return prisma.budget.upsert({ where: { userId_month_group: { userId: request.user.sub, month: body.data.month, group: params.data.group } }, update: { amount: body.data.amount }, create: { userId: request.user.sub, month: body.data.month, group: params.data.group, amount: body.data.amount } });
  });

  app.delete('/budgets/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string }; const budget = await prisma.budget.findFirst({ where: { id, userId: request.user.sub } }); if (!budget) return reply.code(404).send({ error: 'BUDGET_NOT_FOUND' });
    await prisma.budget.delete({ where: { id } }); return reply.code(204).send();
  });
}

