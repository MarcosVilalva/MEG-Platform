import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { PhoenixReadModel } from './contracts';
import { buildPhoenixHomeAgenda } from './home-agenda';

const CHANNEL_ID = 'meg-operacional-vencimentos';
const MANAGED_BY = 'MEG_PHOENIX_DUE';
let syncTimer: number | null = null;

function localDate(value: string, hour: number, minute = 0) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function dateOffset(value: string, days: number, hour: number, minute = 0) {
  const date = localDate(value, hour, minute);
  date.setDate(date.getDate() + days);
  return date;
}

function notificationId(key: string, suffix: string) {
  let hash = 0;
  for (const char of `${key}:${suffix}`) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return 100000 + (Math.abs(hash) % 800000);
}

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((item) => item.type === 'year')?.value || '1970';
  const month = parts.find((item) => item.type === 'month')?.value || '01';
  const day = parts.find((item) => item.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

async function performPhoenixNotificationSync(data: PhoenixReadModel) {
  if (!Capacitor.isNativePlatform()) return;

  let permission = await LocalNotifications.checkPermissions();
  if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
    permission = await LocalNotifications.requestPermissions();
  }
  if (permission.display !== 'granted') return;

  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'MEG Operacional · Vencimentos',
      description: 'Alertas financeiros do MEG para contas vencidas e próximas do vencimento',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  }

  const pending = await LocalNotifications.getPending();
  const managed = pending.notifications
    .filter((item) => item.extra?.managedBy === MANAGED_BY)
    .map((item) => ({ id: item.id }));
  if (managed.length) await LocalNotifications.cancel({ notifications: managed });

  const agenda = buildPhoenixHomeAgenda(data, todayIso());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 45);

  const notifications: Array<{
    id: number;
    title: string;
    body: string;
    channelId: string;
    schedule: { at: Date; allowWhileIdle: boolean };
    extra: Record<string, string>;
  }> = [];

  const overdue = agenda.items.filter((item) => item.kind === 'VENCIDO');
  if (overdue.length) {
    let at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0, 0);
    if (at <= now) at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 30, 0, 0);
    const total = overdue.reduce((sum, item) => sum + item.amount, 0);
    notifications.push({
      id: notificationId(todayIso(), 'overdue-summary'),
      title: overdue.length === 1 ? 'Conta vencida no MEG' : `${overdue.length} contas vencidas no MEG`,
      body: `${brl(total)} ainda em aberto. Abra Pendentes para revisar.`,
      channelId: CHANNEL_ID,
      schedule: { at, allowWhileIdle: true },
      extra: { managedBy: MANAGED_BY, kind: 'overdue' },
    });
  }

  agenda.items
    .filter((item) => item.kind !== 'VENCIDO')
    .filter((item) => {
      const due = localDate(item.dueDate, 12);
      return due >= today && due <= horizon;
    })
    .slice(0, 30)
    .forEach((item) => {
      const key = `${item.id}:${item.dueDate}`;
      const schedules = [
        { suffix: 'five-days', at: dateOffset(item.dueDate, -5, 8, 30), title: 'Conta vence em 5 dias' },
        { suffix: 'three-days', at: dateOffset(item.dueDate, -3, 8, 30), title: 'Conta vence em 3 dias' },
        { suffix: 'day-before', at: dateOffset(item.dueDate, -1, 18), title: 'Conta vence amanhã' },
        { suffix: 'due-day-morning', at: localDate(item.dueDate, 8), title: 'Conta vence hoje' },
        { suffix: 'due-day-noon', at: localDate(item.dueDate, 12), title: 'Pagamento pendente hoje' },
        { suffix: 'due-day-evening', at: localDate(item.dueDate, 19), title: 'Último alerta do vencimento' },
      ];
      schedules.forEach(({ suffix, at, title }) => {
        if (at <= now) return;
        notifications.push({
          id: notificationId(key, suffix),
          title,
          body: `${item.description} · ${brl(item.amount)}`,
          channelId: CHANNEL_ID,
          schedule: { at, allowWhileIdle: true },
          extra: { managedBy: MANAGED_BY, dueDate: item.dueDate.slice(0, 10), sourceId: item.id },
        });
      });
    });

  if (notifications.length) {
    await LocalNotifications.schedule({ notifications });
  }
}

export function syncPhoenixLocalDueNotifications(data: PhoenixReadModel) {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void performPhoenixNotificationSync(structuredClone(data)).catch((cause) => {
      console.warn('MEG Phoenix notification sync failed', cause);
    });
  }, 700);
}
