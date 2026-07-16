import type { FastifyInstance } from 'fastify';
import { prisma } from '@meg/database';
import { config } from '../../config';
import { automationSlot, deliverNotifications, notificationDigest, notificationIntegrationStatus, shouldSendOpenSummary } from './service';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/status', { preHandler: app.authorize(['ADMIN']) }, async () => notificationIntegrationStatus());

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

  app.get('/email-recipients', { preHandler: app.authenticate }, async (request) => prisma.notificationEmailRecipient.findMany({
    where: { userId: request.user.sub }, orderBy: { name: 'asc' }
  }));

  app.post('/email-recipients', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const body = request.body as { name?: string; email?: string };
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply.status(400).send({ error: 'INVALID_EMAIL_RECIPIENT' });
    return prisma.notificationEmailRecipient.upsert({
      where: { userId_email: { userId: request.user.sub, email } },
      create: { userId: request.user.sub, name, email },
      update: { name, isActive: true }
    });
  });

  app.delete('/email-recipients/:id', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await prisma.notificationEmailRecipient.deleteMany({ where: { id, userId: request.user.sub } });
    if (!result.count) return reply.status(404).send({ error: 'EMAIL_RECIPIENT_NOT_FOUND' });
    return reply.status(204).send();
  });

  app.post('/send', { preHandler: app.authorize(['ADMIN']) }, async (request) => {
    const body = (request.body || {}) as { recipientIds?: string[]; emailRecipientIds?: string[] };
    return deliverNotifications(request.user.sub, {
      force: true,
      recipientIds: Array.isArray(body.recipientIds) ? body.recipientIds : [],
      emailRecipientIds: Array.isArray(body.emailRecipientIds) ? body.emailRecipientIds : []
    });
  });

  app.post('/cron', async (request, reply) => {
    if (!config.notificationCronSecret || request.headers['x-cron-secret'] !== config.notificationCronSecret) {
      return reply.status(401).send({ error: 'INVALID_CRON_SECRET' });
    }
    const now = new Date();
    const body = (request.body || {}) as { slot?: string; force?: boolean };
    const slot = automationSlot(now, body.slot);
    if (!slot) return { skipped: true, reason: 'Fora dos horários automáticos de 06:00, 12:00 e 19:00 (São Paulo).' };
    const users = await prisma.user.findMany({ where: { isActive: true, status: 'ACTIVE' }, select: { id: true, email: true } });
    const results = [];
    for (const user of users) {
      const fullSummary = slot.hour === 6 && await shouldSendOpenSummary(user.id, now);
      const deliveries = [await deliverNotifications(user.id, fullSummary
        ? { referenceDate: now, mode: 'open-summary', slot: '06:00-5dias', force: Boolean(body.force) }
        : { referenceDate: now, mode: slot.mode, slot: slot.slot, force: Boolean(body.force) })];
      results.push({ email: user.email, deliveries });
    }
    return { users: results.length, results };
  });
}
