import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { groupPayableItems, isVerocardTransaction, payableGroupLabel, payableGroupTotal } from './legacy-finance.js';

const CHANNEL_ID = 'meg-vencimentos';
let syncTimer;

function localDate(value, hour) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

function dateOffset(value, days, hour) {
  const date = localDate(value, hour);
  date.setDate(date.getDate() + days);
  return date;
}

function notificationId(key, suffix) {
  let hash = 0;
  for (const char of `${key}:${suffix}`) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return 100000 + (Math.abs(hash) % 800000);
}

function brl(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function performSync(state) {
  if (!Capacitor.isNativePlatform() || !Array.isArray(state?.transactions)) return;
  let permission = await LocalNotifications.checkPermissions();
  if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
    permission = await LocalNotifications.requestPermissions();
  }
  if (permission.display !== 'granted') return;

  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Vencimentos MEG',
      description: 'Alertas de contas próximas do vencimento',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  }

  const pending = await LocalNotifications.getPending();
  const managed = pending.notifications.filter((item) => item.extra?.managedBy === 'MEG_DUE').map((item) => ({ id: item.id }));
  if (managed.length) await LocalNotifications.cancel({ notifications: managed });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 45);
  const dueItems = state.transactions.filter((item) => {
    if (item.type !== 'expense' || item.status !== 'pending' || isVerocardTransaction(item)) return false;
    const due = localDate(item.date, 12);
    return due >= today && due <= limit;
  });
  const groups = groupPayableItems(dueItems).slice(0, 40);
  const notifications = [];

  groups.forEach((group) => {
    const key = `${group.date}:${group.payment}:${group.items.map((item) => item.id).join(',')}`;
    const label = payableGroupLabel(group);
    const total = payableGroupTotal(group);
    const schedules = [
      { suffix: 'three-days', at: dateOffset(group.date, -3, 9), title: '📅 Conta vence em 3 dias' },
      { suffix: 'due-day', at: localDate(group.date, 6), title: '🚨 Conta vence hoje' },
    ];
    schedules.forEach(({ suffix, at, title }) => {
      if (at <= now) return;
      notifications.push({
        id: notificationId(key, suffix),
        title,
        body: `${label} · ${brl(total)}${group.items.length > 1 ? ` · ${group.items.length} lançamentos` : ''}`,
        channelId: CHANNEL_ID,
        schedule: { at, allowWhileIdle: true },
        extra: { managedBy: 'MEG_DUE', dueDate: group.date },
      });
    });
  });

  if (notifications.length) await LocalNotifications.schedule({ notifications });
}

export function syncLocalDueNotifications(state) {
  clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => performSync(structuredClone(state)).catch(() => undefined), 900);
}
