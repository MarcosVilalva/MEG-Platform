import { prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';

export type NotificationScheduleSettings = {
  automationEnabled: boolean;
  messagingMorningTime: string;
  messagingMiddayTime: string;
  messagingEveningTime: string;
  alexaAutomationEnabled: boolean;
  alexaWeekdayMorningTime: string;
  alexaWeekdayEveningTime: string;
  alexaWeekdayNightTime: string;
  alexaWeekendTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export const DEFAULT_NOTIFICATION_SCHEDULE: NotificationScheduleSettings = {
  automationEnabled: true,
  messagingMorningTime: '06:00',
  messagingMiddayTime: '12:00',
  messagingEveningTime: '19:00',
  alexaAutomationEnabled: true,
  alexaWeekdayMorningTime: '06:20',
  alexaWeekdayEveningTime: '18:00',
  alexaWeekdayNightTime: '21:00',
  alexaWeekendTime: '12:00',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
};

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function notificationTimeToMinute(value: string) {
  if (!TIME_RE.test(value)) throw new Error('INVALID_NOTIFICATION_TIME');
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function sanitizeTime(value: unknown, fallback: string) {
  const text = String(value ?? '').trim();
  return TIME_RE.test(text) ? text : fallback;
}

export function normalizeNotificationSchedule(value?: Partial<NotificationScheduleSettings> | null): NotificationScheduleSettings {
  const source = value || {};
  return {
    automationEnabled: source.automationEnabled !== false,
    messagingMorningTime: sanitizeTime(source.messagingMorningTime, DEFAULT_NOTIFICATION_SCHEDULE.messagingMorningTime),
    messagingMiddayTime: sanitizeTime(source.messagingMiddayTime, DEFAULT_NOTIFICATION_SCHEDULE.messagingMiddayTime),
    messagingEveningTime: sanitizeTime(source.messagingEveningTime, DEFAULT_NOTIFICATION_SCHEDULE.messagingEveningTime),
    alexaAutomationEnabled: source.alexaAutomationEnabled !== false,
    alexaWeekdayMorningTime: sanitizeTime(source.alexaWeekdayMorningTime, DEFAULT_NOTIFICATION_SCHEDULE.alexaWeekdayMorningTime),
    alexaWeekdayEveningTime: sanitizeTime(source.alexaWeekdayEveningTime, DEFAULT_NOTIFICATION_SCHEDULE.alexaWeekdayEveningTime),
    alexaWeekdayNightTime: sanitizeTime(source.alexaWeekdayNightTime, DEFAULT_NOTIFICATION_SCHEDULE.alexaWeekdayNightTime),
    alexaWeekendTime: sanitizeTime(source.alexaWeekendTime, DEFAULT_NOTIFICATION_SCHEDULE.alexaWeekendTime),
    quietHoursEnabled: source.quietHoursEnabled === true,
    quietHoursStart: sanitizeTime(source.quietHoursStart, DEFAULT_NOTIFICATION_SCHEDULE.quietHoursStart),
    quietHoursEnd: sanitizeTime(source.quietHoursEnd, DEFAULT_NOTIFICATION_SCHEDULE.quietHoursEnd),
  };
}

function assertAutomatedTime(value: string) {
  const minute = notificationTimeToMinute(value);
  const min = 6 * 60;
  const max = 21 * 60;
  if (minute < min || minute > max) throw new Error('NOTIFICATION_TIME_OUTSIDE_AUTOMATION_WINDOW');
  return minute;
}

function assertOrdered(times: string[], code: string) {
  const minutes = times.map(assertAutomatedTime);
  for (let index = 1; index < minutes.length; index += 1) {
    if (minutes[index] - minutes[index - 1] < 30) throw new Error(code);
  }
}

export function validateNotificationSchedule(value: Partial<NotificationScheduleSettings>): NotificationScheduleSettings {
  const settings = normalizeNotificationSchedule(value);
  assertOrdered(
    [settings.messagingMorningTime, settings.messagingMiddayTime, settings.messagingEveningTime],
    'MESSAGING_SCHEDULE_ORDER_INVALID',
  );
  assertOrdered(
    [settings.alexaWeekdayMorningTime, settings.alexaWeekdayEveningTime, settings.alexaWeekdayNightTime],
    'ALEXA_SCHEDULE_ORDER_INVALID',
  );
  assertAutomatedTime(settings.alexaWeekendTime);
  notificationTimeToMinute(settings.quietHoursStart);
  notificationTimeToMinute(settings.quietHoursEnd);
  if (settings.quietHoursEnabled && settings.quietHoursStart === settings.quietHoursEnd) {
    throw new Error('QUIET_HOURS_RANGE_INVALID');
  }
  return settings;
}

function settingsFromRow(row: any): NotificationScheduleSettings {
  if (!row) return { ...DEFAULT_NOTIFICATION_SCHEDULE };
  return normalizeNotificationSchedule({
    automationEnabled: row.automationEnabled,
    messagingMorningTime: row.messagingMorningTime,
    messagingMiddayTime: row.messagingMiddayTime,
    messagingEveningTime: row.messagingEveningTime,
    alexaAutomationEnabled: row.alexaAutomationEnabled,
    alexaWeekdayMorningTime: row.alexaWeekdayMorningTime,
    alexaWeekdayEveningTime: row.alexaWeekdayEveningTime,
    alexaWeekdayNightTime: row.alexaWeekdayNightTime,
    alexaWeekendTime: row.alexaWeekendTime,
    quietHoursEnabled: row.quietHoursEnabled,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
  });
}

export async function notificationScheduleForWorkspace(workspaceId: string) {
  const row = await prisma.workspaceNotificationConfig.findUnique({ where: { workspaceId } });
  return settingsFromRow(row);
}

export async function notificationScheduleForUser(userId: string) {
  const context = await resolveWorkspaceContext(userId);
  return {
    workspaceId: context.workspaceId,
    settings: await notificationScheduleForWorkspace(context.workspaceId),
  };
}

export async function saveNotificationSchedule(actorId: string, value: Partial<NotificationScheduleSettings>) {
  const context = await resolveWorkspaceContext(actorId);
  const settings = validateNotificationSchedule(value);
  const before = await notificationScheduleForWorkspace(context.workspaceId);

  const row = await prisma.$transaction(async (tx) => {
    const saved = await tx.workspaceNotificationConfig.upsert({
      where: { workspaceId: context.workspaceId },
      create: {
        workspaceId: context.workspaceId,
        ...settings,
      },
      update: settings,
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        entity: 'WorkspaceNotificationConfig',
        entityId: saved.id,
        action: 'NOTIFICATION_SCHEDULE_UPDATED',
        metadata: JSON.stringify({
          schemaVersion: 1,
          before,
          after: settings,
          context: { workspaceId: context.workspaceId },
        }),
      },
    });

    return saved;
  });

  return {
    workspaceId: context.workspaceId,
    settings: settingsFromRow(row),
    updatedAt: row.updatedAt,
  };
}

export function notificationMinuteIsQuiet(minuteOfDay: number, settings: NotificationScheduleSettings) {
  if (!settings.quietHoursEnabled) return false;
  const start = notificationTimeToMinute(settings.quietHoursStart);
  const end = notificationTimeToMinute(settings.quietHoursEnd);
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
}

export function messagingScheduleLabel(settings: NotificationScheduleSettings) {
  if (!settings.automationEnabled) return 'Automação pausada';
  return `${settings.messagingMorningTime}, ${settings.messagingMiddayTime} e ${settings.messagingEveningTime} America/Sao_Paulo`;
}

export function alexaScheduleLabel(settings: NotificationScheduleSettings) {
  if (!settings.alexaAutomationEnabled) return 'Automação pausada';
  return `dias úteis às ${settings.alexaWeekdayMorningTime}, ${settings.alexaWeekdayEveningTime} e ${settings.alexaWeekdayNightTime}; fins de semana às ${settings.alexaWeekendTime}`;
}

export function quietHoursLabel(settings: NotificationScheduleSettings) {
  return settings.quietHoursEnabled
    ? `${settings.quietHoursStart}–${settings.quietHoursEnd} America/Sao_Paulo`
    : 'Desativado';
}
