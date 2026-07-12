import type { FastifyInstance } from 'fastify';
import { prisma } from '@meg/database';
import { config } from '../../config';
import { deliverNotifications, notificationDigest } from './service';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/preview', { preHandler: app.authenticate }, async (request) => notificationDigest(request.user.sub));

  app.post('/send', { preHandler: app.authorize(['ADMIN']) }, async (request) => deliverNotifications(request.user.sub, true));

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
