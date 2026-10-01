import { prisma } from '@meg/database';
import { config } from '../../config';
import { deliverAlexaDailyBriefing, deliverDailyFinancialSummary } from './daily-summary';
import { deliverAlexaAnnouncement, deliverNotifications } from './service';
import {
  DEFAULT_NOTIFICATION_SCHEDULE,
  notificationMinuteIsQuiet,
  notificationScheduleForUser,
  notificationTimeToMinute,
  type NotificationScheduleSettings,
} from './schedule-config';

export type NotificationWatchdogCycle = {
  kind: 'messaging' | 'alexa';
  slot: string;
  task: 'daily-summary' | 'due-now' | 'alexa-daily-briefing' | 'alexa-due';
  dueMinute: number;
  expiresMinute: number;
  includeTomorrow?: boolean;
};

type LocalClock = {
  iso: string;
  hour: number;
  minute: number;
  weekday: number;
  minuteOfDay: number;
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function localClock(referenceDate = new Date()): LocalClock {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(referenceDate);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  const hour = Number(part('hour'));
  const minute = Number(part('minute'));
  return {
    iso: `${part('year')}-${part('month')}-${part('day')}`,
    hour,
    minute,
    weekday: WEEKDAY_MAP[part('weekday')] ?? 0,
    minuteOfDay: hour * 60 + minute,
  };
}

const min = (hour: number, minute = 0) => hour * 60 + minute;

function cycle(
  kind: NotificationWatchdogCycle['kind'],
  slot: string,
  task: NotificationWatchdogCycle['task'],
  recoveryMinutes: number,
  includeTomorrow?: boolean,
): NotificationWatchdogCycle {
  const dueMinute = notificationTimeToMinute(slot);
  return {
    kind,
    slot,
    task,
    dueMinute,
    expiresMinute: Math.min(23 * 60 + 59, dueMinute + recoveryMinutes),
    ...(includeTomorrow === undefined ? {} : { includeTomorrow }),
  };
}

function scheduledCyclesForWeekday(
  weekday: number,
  settings: NotificationScheduleSettings = DEFAULT_NOTIFICATION_SCHEDULE,
): NotificationWatchdogCycle[] {
  const weekend = weekday === 0 || weekday === 6;
  const cycles: NotificationWatchdogCycle[] = [];

  if (settings.automationEnabled) {
    cycles.push(
      cycle('messaging', settings.messagingMorningTime, 'daily-summary', 180),
      cycle('messaging', settings.messagingMiddayTime, 'due-now', 180),
      cycle('messaging', settings.messagingEveningTime, 'due-now', 179),
    );
  }

  if (settings.alexaAutomationEnabled) {
    if (weekend) {
      cycles.push(cycle('alexa', settings.alexaWeekendTime, 'alexa-daily-briefing', 180, false));
    } else {
      cycles.push(
        cycle('alexa', settings.alexaWeekdayMorningTime, 'alexa-daily-briefing', 160, true),
        cycle('alexa', settings.alexaWeekdayEveningTime, 'alexa-due', 120, true),
        cycle('alexa', settings.alexaWeekdayNightTime, 'alexa-due', 59, true),
      );
    }
  }

  return cycles.filter((item) => !notificationMinuteIsQuiet(item.dueMinute, settings));
}

export function notificationWatchdogPlan(
  referenceDate = new Date(),
  settings: NotificationScheduleSettings = DEFAULT_NOTIFICATION_SCHEDULE,
) {
  const local = localClock(referenceDate);
  const cycles = scheduledCyclesForWeekday(local.weekday, settings);
  if (notificationMinuteIsQuiet(local.minuteOfDay, settings)) return { local, cycles: [] };
  return {
    local,
    cycles: cycles.filter((item) => local.minuteOfDay >= item.dueMinute && local.minuteOfDay <= item.expiresMinute),
  };
}

export function notificationCycleIsActive(
  referenceDate: Date,
  item: NotificationWatchdogCycle,
  settings: NotificationScheduleSettings = DEFAULT_NOTIFICATION_SCHEDULE,
) {
  const local = localClock(referenceDate);
  return !notificationMinuteIsQuiet(local.minuteOfDay, settings)
    && !notificationMinuteIsQuiet(item.dueMinute, settings)
    && local.minuteOfDay >= item.dueMinute
    && local.minuteOfDay <= item.expiresMinute;
}

export function messagingCycleForSlot(
  slot: string,
  settings: NotificationScheduleSettings = DEFAULT_NOTIFICATION_SCHEDULE,
): NotificationWatchdogCycle | null {
  return scheduledCyclesForWeekday(1, settings)
    .find((item) => item.kind === 'messaging' && item.slot === slot) || null;
}

export function alexaCycleForSlot(
  referenceDate: Date,
  slot: string,
  settings: NotificationScheduleSettings = DEFAULT_NOTIFICATION_SCHEDULE,
): NotificationWatchdogCycle | null {
  const local = localClock(referenceDate);
  return scheduledCyclesForWeekday(local.weekday, settings)
    .find((item) => item.kind === 'alexa' && item.slot === slot) || null;
}

function markerChannel(cycle: NotificationWatchdogCycle) {
  return cycle.kind === 'messaging' ? 'watchdog:notifications' : 'watchdog:alexa';
}

function markerReference(referenceDate: Date, cycle: NotificationWatchdogCycle) {
  return `${localClock(referenceDate).iso}:${cycle.slot}:${cycle.task}`;
}

export type WatchdogHealthRow = {
  channel: string;
  reference: string;
  status: string;
  deliveredAt: Date | string;
};

export function notificationWatchdogHealth(
  rows: WatchdogHealthRow[],
  referenceDate = new Date(),
  graceMinutes = 35,
  settings: NotificationScheduleSettings = DEFAULT_NOTIFICATION_SCHEDULE,
) {
  const local = localClock(referenceDate);
  const due = scheduledCyclesForWeekday(local.weekday, settings)
    .filter((cycle) => local.minuteOfDay >= cycle.dueMinute + graceMinutes);

  const latestByKind = (['messaging', 'alexa'] as const)
    .map((kind) => due.filter((cycle) => cycle.kind === kind).sort((a, b) => b.dueMinute - a.dueMinute)[0])
    .filter((cycle): cycle is NotificationWatchdogCycle => Boolean(cycle));

  const expected = latestByKind.map((cycle) => {
    const channel = markerChannel(cycle);
    const reference = markerReference(referenceDate, cycle);
    const marker = rows.find((row) => row.channel === channel && row.reference === reference);
    const markerTime = marker ? new Date(marker.deliveredAt).valueOf() : NaN;
    const processingStale = marker?.status === 'processing'
      && (!Number.isFinite(markerTime) || referenceDate.valueOf() - markerTime > 10 * 60_000);
    const state = !marker
      ? 'missing'
      : marker.status === 'sent'
        ? 'ok'
        : marker.status === 'processing' && !processingStale
          ? 'processing'
          : marker.status === 'processing'
            ? 'stale'
            : marker.status === 'failed'
              ? 'failed'
              : 'unknown';

    return {
      kind: cycle.kind,
      slot: cycle.slot,
      task: cycle.task,
      reference,
      state,
      deliveredAt: marker?.deliveredAt ?? null,
    };
  });

  const lastCheckAt = rows
    .map((row) => new Date(row.deliveredAt))
    .filter((value) => Number.isFinite(value.valueOf()))
    .sort((a, b) => b.valueOf() - a.valueOf())[0] ?? null;

  const attention = expected.some((item) => ['missing', 'failed', 'stale', 'unknown'].includes(item.state));
  const processing = !attention && expected.some((item) => item.state === 'processing');
  const status = attention ? 'attention' : processing ? 'processing' : expected.length ? 'ok' : 'waiting';

  return {
    status,
    localDate: local.iso,
    localTime: `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`,
    lastCheckAt,
    expected,
  };
}

async function claimCycle(userId: string, cycle: NotificationWatchdogCycle, referenceDate: Date, force = false) {
  const channel = markerChannel(cycle);
  const reference = markerReference(referenceDate, cycle);
  const now = new Date();
  const existing = await prisma.notificationDelivery.findUnique({
    where: { userId_channel_reference: { userId, channel, reference } },
  });

  if (existing?.status === 'sent' && !force) {
    return { claimed: false as const, reason: 'already-complete', channel, reference };
  }

  if (existing?.status === 'processing' && !force && now.valueOf() - existing.deliveredAt.valueOf() < 5 * 60_000) {
    return { claimed: false as const, reason: 'in-progress', channel, reference };
  }

  if (existing) {
    const claimed = await prisma.notificationDelivery.updateMany({
      where: {
        id: existing.id,
        status: existing.status,
        deliveredAt: existing.deliveredAt,
      },
      data: {
        status: 'processing',
        detail: JSON.stringify({ claimedAt: now.toISOString(), cycle: cycle.task, slot: cycle.slot }),
        deliveredAt: now,
      },
    });
    if (!claimed.count) return { claimed: false as const, reason: 'race-lost', channel, reference };
    return { claimed: true as const, channel, reference };
  }

  try {
    await prisma.notificationDelivery.create({
      data: {
        userId,
        channel,
        reference,
        status: 'processing',
        detail: JSON.stringify({ claimedAt: now.toISOString(), cycle: cycle.task, slot: cycle.slot }),
        deliveredAt: now,
      },
    });
    return { claimed: true as const, channel, reference };
  } catch (error) {
    const concurrent = await prisma.notificationDelivery.findUnique({
      where: { userId_channel_reference: { userId, channel, reference } },
    });
    if (concurrent) return { claimed: false as const, reason: 'race-lost', channel, reference };
    throw error;
  }
}

async function finishCycle(userId: string, channel: string, reference: string, status: 'sent' | 'failed', detail: unknown) {
  await prisma.notificationDelivery.upsert({
    where: { userId_channel_reference: { userId, channel, reference } },
    create: {
      userId,
      channel,
      reference,
      status,
      detail: JSON.stringify(detail),
    },
    update: {
      status,
      detail: JSON.stringify(detail),
      deliveredAt: new Date(),
    },
  });
}

function messagingFailed(deliveries: Array<{ status?: string }> = []) {
  return deliveries.some((item) => !['sent', 'already-sent'].includes(String(item.status || '')));
}

export async function runMessagingCycle(
  userId: string,
  cycle: NotificationWatchdogCycle,
  referenceDate = new Date(),
  force = false,
) {
  const claim = await claimCycle(userId, cycle, referenceDate, force);
  if (!claim.claimed) return { status: 'already-sent' as const, reason: claim.reason, cycle };

  try {
    const delivery = cycle.task === 'daily-summary'
      ? await deliverDailyFinancialSummary(userId, { referenceDate, slot: cycle.slot, force })
      : await deliverNotifications(userId, { referenceDate, mode: 'due-now', slot: cycle.slot, force });
    const failed = messagingFailed(delivery.deliveries as Array<{ status?: string }>);
    await finishCycle(userId, claim.channel, claim.reference, failed ? 'failed' : 'sent', {
      cycle: cycle.task,
      slot: cycle.slot,
      failed,
      deliveryCount: delivery.deliveries.length,
      message: 'message' in delivery ? delivery.message : undefined,
    });
    return { status: failed ? 'failed' as const : 'sent' as const, cycle, delivery };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Falha desconhecida';
    await finishCycle(userId, claim.channel, claim.reference, 'failed', { cycle: cycle.task, slot: cycle.slot, detail });
    return { status: 'failed' as const, cycle, detail };
  }
}

function alexaResultIsSuccessful(result: any) {
  const status = String(result?.status || '');
  if (status === 'sent' || status === 'already-sent') return true;
  if (status !== 'skipped') return false;
  const reason = String(result?.reason || '');
  return /nenhum vencimento/i.test(reason);
}

export async function runAlexaCycle(
  userId: string,
  cycle: NotificationWatchdogCycle,
  referenceDate = new Date(),
  force = false,
) {
  const claim = await claimCycle(userId, cycle, referenceDate, force);
  if (!claim.claimed) return { status: 'already-sent' as const, reason: claim.reason, cycle };

  try {
    const delivery = cycle.task === 'alexa-daily-briefing'
      ? await deliverAlexaDailyBriefing(referenceDate, cycle.slot, force)
      : await deliverAlexaAnnouncement(userId, referenceDate, cycle.slot, Boolean(cycle.includeTomorrow), force);
    const successful = alexaResultIsSuccessful(delivery);
    await finishCycle(userId, claim.channel, claim.reference, successful ? 'sent' : 'failed', {
      cycle: cycle.task,
      slot: cycle.slot,
      providerStatus: delivery.status,
      reason: 'reason' in delivery ? delivery.reason : undefined,
      detail: 'detail' in delivery ? delivery.detail : undefined,
    });
    return { status: successful ? 'sent' as const : 'failed' as const, cycle, delivery };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Falha desconhecida';
    await finishCycle(userId, claim.channel, claim.reference, 'failed', { cycle: cycle.task, slot: cycle.slot, detail });
    return { status: 'failed' as const, cycle, detail };
  }
}

export async function runNotificationWatchdog(referenceDate = new Date(), force = false) {
  const local = localClock(referenceDate);
  const users = await prisma.user.findMany({
    where: { isActive: true, status: 'ACTIVE', ownedWorkspace: { isActive: true } },
    select: { id: true, email: true },
  });

  const results: any[] = [];
  for (const user of users) {
    const { settings } = await notificationScheduleForUser(user.id);
    const messagingCycles = notificationWatchdogPlan(referenceDate, settings).cycles
      .filter((item) => item.kind === 'messaging');
    for (const item of messagingCycles) {
      const result = await runMessagingCycle(user.id, item, referenceDate, force);
      results.push({ kind: 'messaging', user: user.email, ...result });
    }
  }

  const owner = await prisma.user.findUnique({
    where: { email: config.alexaOwnerEmail.trim().toLowerCase() },
    select: { id: true, email: true, isActive: true, status: true },
  });
  if (owner?.isActive && owner.status === 'ACTIVE') {
    const { settings } = await notificationScheduleForUser(owner.id);
    const alexaCycles = notificationWatchdogPlan(referenceDate, settings).cycles
      .filter((item) => item.kind === 'alexa');
    for (const item of alexaCycles) {
      const result = await runAlexaCycle(owner.id, item, referenceDate, force);
      results.push({ kind: 'alexa', user: owner.email, ...result });
    }
  }

  return {
    checkedAt: referenceDate.toISOString(),
    local,
    cycles: results,
    failed: results.filter((item) => item.status === 'failed').length,
  };
}
