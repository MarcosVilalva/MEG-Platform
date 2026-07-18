import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { assertPlatformAdministrator, listCommercialWorkspaces, updateCommercialLicense } from './service';

const licenseSchema = z.object({
  action: z.enum(['ACTIVATE', 'START_TRIAL', 'RENEW', 'SUSPEND', 'CANCEL', 'CHANGE_PLAN']),
  planCode: z.string().min(2).max(40).optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
  notes: z.string().max(500).optional()
});

export async function platformAdminRoutes(app: FastifyInstance) {
  const platformGuard = async (request: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(request, reply);
    if (reply.sent) return;
    try { await assertPlatformAdministrator(request.user.sub); }
    catch { return reply.status(403).send({ error: 'PLATFORM_ADMIN_REQUIRED' }); }
  };

  app.get('/workspaces', { preHandler: platformGuard }, async () => listCommercialWorkspaces());

  app.patch('/workspaces/:id/license', { preHandler: platformGuard }, async (request, reply) => {
    const parsed = licenseSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });
    const { id } = request.params as { id: string };
    try { return await updateCommercialLicense({ actorId: request.user.sub, workspaceId: id, ...parsed.data }); }
    catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      if (message === 'WORKSPACE_NOT_FOUND' || message === 'PLAN_NOT_FOUND') return reply.status(404).send({ error: message });
      if (message === 'PLATFORM_ADMIN_REQUIRED') return reply.status(403).send({ error: message });
      throw error;
    }
  });
}