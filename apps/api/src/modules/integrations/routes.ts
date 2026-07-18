import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@meg/database';
import { saveWorkspaceIntegration, sendWorkspaceWhatsApp, workspaceIntegrationForUser } from './service';
import { resolveWorkspaceContext } from '../workspaces/service';

const integrationSchema = z.object({
  whatsappEnabled: z.boolean().default(false),
  evolutionApiUrl: z.string().url().optional().or(z.literal('')),
  evolutionInstance: z.string().max(120).optional(),
  evolutionApiKey: z.string().max(500).optional(),
  emailEnabled: z.boolean().default(true),
  replyToEmail: z.string().email().optional().or(z.literal('')),
  senderName: z.string().min(2).max(80).optional()
});

export async function integrationRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authorize(['ADMIN']) }, async (request) => workspaceIntegrationForUser(request.user.sub));
  app.put('/', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const parsed = integrationSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });
    try { return await saveWorkspaceIntegration(request.user.sub, parsed.data); }
    catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      if (message === 'WORKSPACE_ADMIN_REQUIRED') return reply.status(403).send({ error: message });
      if (message === 'WHATSAPP_CONFIGURATION_INCOMPLETE') return reply.status(400).send({ error: message });
      throw error;
    }
  });
  app.post('/test-whatsapp', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const context = await resolveWorkspaceContext(request.user.sub);
    const owner = await prisma.user.findUnique({ where: { id: context.workspace.ownerId }, select: { phone: true, name: true } });
    if (!owner?.phone) return reply.status(400).send({ error: 'OWNER_PHONE_REQUIRED' });
    const result = await sendWorkspaceWhatsApp(request.user.sub, owner.phone, `✅ *MEG Finanças — Integração validada*\n\nOlá, ${owner.name}. O WhatsApp do seu espaço está conectado e pronto para enviar alertas.`);
    if (!result) return reply.status(400).send({ error: 'WORKSPACE_WHATSAPP_NOT_CONFIGURED' });
    return result;
  });
}