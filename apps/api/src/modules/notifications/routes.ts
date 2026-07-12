import type { FastifyInstance } from 'fastify';
import { prisma } from '@meg/database';
import { config } from '../../config';
import { deliverNotifications, notificationDigest } from './service';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/preview', { preHandler: app.authenticate }, async (request) => notificationDigest(request.user.sub));

  app.get('/recipients', { preHandler: app.authenticate }, async (request) => prisma.notificationRecipient.findMany({
    where: { userId: request.user.sub }, orderBy: { name: 'asc' }
  }));

  app.post('/recipients', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const body = request.body as { name?: string; phone?: string };
    const name = String(body?.name || '').trim();
    const phone = String(body?.phone || '').replace(/\D/g, '');
    if (!name || phone.length < 10 || phone.length > 15) return reply.status(400).send({ error: 'INVALID_RECIPIENT' });
    return prisma.notificationRecipient.upsert({
      where: { userId_phone: { userId: request.user.sub, phone } },
      create: { userId: request.user.sub, name, phone },
      update: { name, isActive: true }
    });
  });

  app.delete('/recipients/:id', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.notificationRecipient.deleteMany({ where: { id, userId: request.user.sub } });
    if (!result.count) return reply.status(404).send({ error: 'RECIPIENT_NOT_FOUND' });
    return reply.status(204).send();
  });

  app.post('/send', { preHandler: app.authorize(['ADMIN']) }, async (request) => {
    const body = (request.body || {}) as { recipientIds?: string[] };
    return deliverNotifications(request.user.sub, true, Array.isArray(body.recipientIds) ? body.recipientIds : []);
  });

  app.post('/cron', async (request, reply) => {
    if (!config.notificationCronSecret || request.headers['x-cron-secret'] !== config.notificationCronSecret) {
      return reply.status(401).send({ error: 'INVALID_CRON_SECRET' });
    }
    const users = await prisma.user.findMany({ where: { isActive: true, status: 'ACTIVE' }, select: { id: true, email: true } });
    const results = [];
    for (const user of users) results.push({ email: user.email, result: await deliverNotifications(user.id) });
    return { users: results.length, results };
  });
}
