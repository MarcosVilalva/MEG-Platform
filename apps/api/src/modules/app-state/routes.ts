import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma, prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';
import { assertWorkspaceWriteAccess } from '../platform-admin/service';

const transactionSchema = z.object({
  id: z.string().min(1), date: z.string().min(10), description: z.string().min(1),
  type: z.enum(['income', 'expense']), amount: z.coerce.number().finite()
}).passthrough();
const stateSchema = z.object({
  transactions: z.array(transactionSchema).max(20000),
  budgets: z.record(z.string(), z.coerce.number().nonnegative()).default({})
}).passthrough();
const putSchema = z.object({ state: stateSchema, expectedRevision: z.number().int().nonnegative().optional() });

export async function appStateRoutes(app: FastifyInstance) {
  app.get('/revision', { preHandler: app.authenticate }, async (request) => {
    const context = await resolveWorkspaceContext(request.user.sub);
    const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true, updatedAt: true } });
    return saved
      ? { revision: saved.revision, updatedAt: saved.updatedAt, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } }
      : { revision: 0, updatedAt: null, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });

  app.get('/', { preHandler: app.authenticate }, async (request) => {
    const context = await resolveWorkspaceContext(request.user.sub);
    const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
    return saved
      ? { state: saved.state, revision: saved.revision, updatedAt: saved.updatedAt, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } }
      : { state: null, revision: 0, updatedAt: null, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });

  app.put('/', { preHandler: app.authorize(['ADMIN', 'MANAGER', 'OPERATOR']) }, async (request, reply) => {
    const parsed = putSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_APP_STATE', details: parsed.error.flatten() });

    const context = await resolveWorkspaceContext(request.user.sub);
    try { await assertWorkspaceWriteAccess(context.workspaceId); }
    catch (error) {
      const code = error instanceof Error ? error.message : 'LICENSE_REQUIRED';
      return reply.status(402).send({ error: code, readOnly: true });
    }
    const current = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
    if (current && parsed.data.expectedRevision !== undefined && current.revision !== parsed.data.expectedRevision) {
      return reply.status(409).send({ error: 'STATE_CONFLICT', revision: current.revision, updatedAt: current.updatedAt });
    }

    const jsonState = JSON.parse(JSON.stringify(parsed.data.state)) as Prisma.InputJsonValue;
    const saved = current
      ? await prisma.appState.update({ where: { id: current.id }, data: { state: jsonState, revision: { increment: 1 } } })
      : await prisma.appState.create({ data: { userId: context.workspace.ownerId, workspaceId: context.workspaceId, state: jsonState, revision: 1 } });
    return { revision: saved.revision, updatedAt: saved.updatedAt, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });
}