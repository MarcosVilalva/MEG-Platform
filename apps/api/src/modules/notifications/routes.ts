import type { FastifyInstance } from 'fastify';
import { prisma } from '@meg/database';
import { config } from '../../config';
import { alexaSecretsMatch } from './alexa-auth';
import { alexaFinancialPanorama, deliverAlexaNextDuePreview, deliverNotifications, notificationDigest, notificationIntegrationStatus, type AlexaSkillIntent, type AlexaSkillQuery } from './service';
import { deliverDailyFinancialSummary } from './daily-summary';
import { alexaCycleForSlot, messagingCycleForSlot, runAlexaCycle, runMessagingCycle, runNotificationWatchdog } from './watchdog';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/status', { preHandler: app.authorize(['ADMIN']) }, async () => notificationIntegrationStatus());

  app.get('/deliveries', { preHandler: app.authorize(['ADMIN']) }, async (request) => {
    const allDeliveries = await prisma.notificationDelivery.findMany({
      where: { userId: request.user.sub },
      orderBy: { deliveredAt: 'desc' },
      take: 150,
      select: { id: true, channel: true, reference: true, status: true, detail: true, deliveredAt: true }
    });
    const deliveries = allDeliveries.filter((item) => !item.channel.startsWith('watchdog:')).slice(0, 100);
    const watchdogCycles = allDeliveries.filter((item) => item.channel.startsWith('watchdog:')).slice(0, 30);
    const last24Hours = Date.now() - 86_400_000;
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        total: deliveries.length,
        sentLast24Hours: deliveries.filter((item) => item.status === 'sent' && item.deliveredAt.valueOf() >= last24Hours).length,
        failedLast24Hours: deliveries.filter((item) => item.status === 'failed' && item.deliveredAt.valueOf() >= last24Hours).length,
        lastSuccessAt: deliveries.find((item) => item.status === 'sent')?.deliveredAt ?? null,
        lastFailureAt: deliveries.find((item) => item.status === 'failed')?.deliveredAt ?? null,
        watchdog: {
          lastCheckAt: watchdogCycles[0]?.deliveredAt ?? null,
          failedLast24Hours: watchdogCycles.filter((item) => item.status === 'failed' && item.deliveredAt.valueOf() >= last24Hours).length,
          processing: watchdogCycles.filter((item) => item.status === 'processing').length,
          status: watchdogCycles.some((item) => item.status === 'failed' && item.deliveredAt.valueOf() >= last24Hours) ? 'attention' : 'ok'
        }
      },
      deliveries,
      watchdogCycles
    };
  });

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
    const result = await deliverNotifications(request.user.sub, {
      force: true,
      recipientIds: Array.isArray(body.recipientIds) ? body.recipientIds : [],
      emailRecipientIds: Array.isArray(body.emailRecipientIds) ? body.emailRecipientIds : []
    });
    if (result.deliveries.length || result.digest.totalCount) return result;
    return deliverDailyFinancialSummary(request.user.sub, { force: true, slot: 'manual' });
  });

  app.post('/test-channels', { preHandler: app.authorize(['ADMIN']) }, async (request) => {
    const referenceDate = new Date();
    const [messaging, alexa] = await Promise.allSettled([
      deliverNotifications(request.user.sub, { referenceDate, mode: 'open-summary', slot: 'manual-test', force: true }),
      deliverAlexaNextDuePreview(request.user.sub, referenceDate, true)
    ]);
    const messagingValue = messaging.status === 'fulfilled' ? messaging.value : null;
    const deliveries = messagingValue?.deliveries || [];
    const channelResult = (channel: string) => {
      const rows = deliveries.filter((item: any) => String(item.channel || '').toLowerCase().includes(channel));
      if (!rows.length) return { status: 'not-sent', detail: 'Nenhuma entrega registrada para este canal.' };
      const failed = rows.find((item: any) => item.status === 'failed');
      const failedDetail = failed && 'detail' in failed ? failed.detail : undefined;
      const first = rows[0];
      const firstDetail = first && 'detail' in first ? first.detail : undefined;
      return failed ? { status: 'failed', detail: failedDetail || 'Falha no provedor.' } : { status: 'sent', detail: firstDetail || 'Entrega registrada.' };
    };
    return {
      testedAt: referenceDate.toISOString(),
      email: channelResult('email'),
      whatsapp: channelResult('whatsapp'),
      alexa: alexa.status === 'fulfilled'
        ? {
            status: ['sent', 'already-sent'].includes(String((alexa.value as any)?.status || '')) ? 'sent'
              : String((alexa.value as any)?.status || '') === 'skipped' ? 'not-sent'
                : 'failed',
            detail: alexa.value
          }
        : { status: 'failed', detail: alexa.reason instanceof Error ? alexa.reason.message : 'Falha no anúncio Alexa.' }
    };
  });

  app.post('/cron', async (request, reply) => {
    if (!config.notificationCronSecret || request.headers['x-cron-secret'] !== config.notificationCronSecret) {
      return reply.status(401).send({ error: 'INVALID_CRON_SECRET' });
    }
    const now = new Date();
    const body = (request.body || {}) as { slot?: string; force?: boolean };
    const cycle = messagingCycleForSlot(String(body.slot || ''));
    if (!cycle) return { skipped: true, reason: 'Slot de notificação inválido.' };
    const users = await prisma.user.findMany({
      where: { isActive: true, status: 'ACTIVE', ownedWorkspace: { isActive: true } },
      select: { id: true, email: true }
    });
    const results = [];
    for (const user of users) {
      const execution = await runMessagingCycle(user.id, cycle, now, Boolean(body.force));
      results.push({ email: user.email, status: execution.status, deliveries: 'delivery' in execution ? [execution.delivery] : [] });
    }
    return { users: results.length, slot: cycle.slot, results };
  });

  app.post('/watchdog', async (request, reply) => {
    const providedCron = Array.isArray(request.headers['x-cron-secret'])
      ? request.headers['x-cron-secret'][0]
      : request.headers['x-cron-secret'];
    const providedWatchdog = Array.isArray(request.headers['x-watchdog-secret'])
      ? request.headers['x-watchdog-secret'][0]
      : request.headers['x-watchdog-secret'];
    const authorizedByCron = Boolean(config.notificationCronSecret && providedCron === config.notificationCronSecret);
    const authorizedByWatchdog = alexaSecretsMatch(providedWatchdog, config.notificationWatchdogSecret);
    if (!authorizedByCron && !authorizedByWatchdog) {
      return reply.status(401).send({ error: 'INVALID_WATCHDOG_SECRET' });
    }
    const body = (request.body || {}) as { force?: boolean };
    return runNotificationWatchdog(new Date(), Boolean(body.force));
  });

  app.post('/alexa/cron', async (request, reply) => {
    if (!config.notificationCronSecret || request.headers['x-cron-secret'] !== config.notificationCronSecret) {
      return reply.status(401).send({ error: 'INVALID_CRON_SECRET' });
    }
    const now = new Date();
    const body = (request.body || {}) as { slot?: string; force?: boolean; mode?: 'scheduled' | 'next-due-preview' };
    const owner = await prisma.user.findUnique({ where: { email: config.alexaOwnerEmail.trim().toLowerCase() }, select: { id: true, email: true, isActive: true, status: true } });
    if (!owner?.isActive || owner.status !== 'ACTIVE') return reply.status(404).send({ error: 'ALEXA_OWNER_NOT_ACTIVE' });
    if (body.mode === 'next-due-preview') {
      const result = await deliverAlexaNextDuePreview(owner.id, now, Boolean(body.force));
      return { owner: owner.email, mode: body.mode, result };
    }
    const cycle = alexaCycleForSlot(now, String(body.slot || ''));
    if (!cycle) return { skipped: true, reason: 'Slot fora da agenda de voz da Alexa.' };
    const result = await runAlexaCycle(owner.id, cycle, now, Boolean(body.force));
    return { owner: owner.email, slot: cycle.slot, mode: cycle.task === 'alexa-daily-briefing' ? 'daily-briefing' : 'scheduled', result };
  });

  app.post('/alexa/skill', async (request, reply) => {
    const providedSecret = Array.isArray(request.headers['x-alexa-skill-secret'])
      ? request.headers['x-alexa-skill-secret'][0]
      : request.headers['x-alexa-skill-secret'];
    const validExplicitSecret = alexaSecretsMatch(providedSecret, config.alexaSkillSecret);
    const validDerivedSecret = alexaSecretsMatch(providedSecret, config.alexaDerivedSkillSecret);
    if (!validExplicitSecret && !validDerivedSecret) {
      return reply.status(401).send({ error: 'INVALID_ALEXA_SKILL_SECRET' });
    }
    const body = (request.body || {}) as { intent?: AlexaSkillIntent; query?: AlexaSkillQuery };
    const allowed: AlexaSkillIntent[] = [
      'overview', 'pending', 'next-due', 'balance', 'monetary-balance', 'benefit-balance',
      'monthly-income', 'monthly-expenses', 'projected-closing',
      'due-in-days', 'due-next-days', 'due-on-date', 'overdue'
    ];
    const intent = allowed.includes(body.intent as AlexaSkillIntent) ? body.intent as AlexaSkillIntent : 'overview';
    const query: AlexaSkillQuery = {
      days: Number.isFinite(Number(body.query?.days)) ? Math.min(365, Math.max(0, Math.trunc(Number(body.query?.days)))) : undefined,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(body.query?.date || '')) ? String(body.query?.date) : undefined
    };
    try {
      return await alexaFinancialPanorama(new Date(), intent, query);
    } catch (error) {
      if (error instanceof Error && error.message === 'ALEXA_OWNER_NOT_ACTIVE') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });
}
