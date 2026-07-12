import { prisma } from '@meg/database';
import { config } from '../../config';

type LegacyTransaction = {
  id?: string;
  date?: string;
  description?: string;
  status?: string;
  situation?: string;
  type?: string;
  expenseAmount?: number;
  amount?: number;
};

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export async function notificationDigest(userId: string, referenceDate = new Date()) {
  const saved = await prisma.appState.findUnique({ where: { userId } });
  const state = saved?.state as { transactions?: LegacyTransaction[] } | null;
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 3);

  const pending = (state?.transactions || []).filter((item) => {
    if (item.type !== 'expense' || !item.date) return false;
    const status = String(item.status || item.situation || '').toUpperCase();
    if (status === 'PAID' || status === 'PAGO') return false;
    const due = new Date(`${item.date}T12:00:00`);
    return !Number.isNaN(due.valueOf()) && due <= limit;
  });
  const overdue = pending.filter((item) => new Date(`${item.date}T12:00:00`) < today);
  const upcoming = pending.filter((item) => new Date(`${item.date}T12:00:00`) >= today);
  const total = (items: LegacyTransaction[]) => items.reduce((sum, item) => sum + Number(item.expenseAmount ?? item.amount ?? 0), 0);

  const lines = [
    'MEG Finanças — contas que precisam de atenção',
    '',
    `Vencidas: ${overdue.length} (${money(total(overdue))})`,
    ...overdue.slice(0, 12).map((item) => `• ${dateLabel(item.date!)} — ${item.description} — ${money(Number(item.expenseAmount ?? item.amount ?? 0))}`),
    '',
    `Vencem nos próximos 3 dias: ${upcoming.length} (${money(total(upcoming))})`,
    ...upcoming.slice(0, 12).map((item) => `• ${dateLabel(item.date!)} — ${item.description} — ${money(Number(item.expenseAmount ?? item.amount ?? 0))}`)
  ];

  return { overdue, upcoming, text: lines.join('\n'), totalCount: pending.length };
}

async function sendEmail(subject: string, text: string) {
  if (!config.resendApiKey) return { status: 'skipped', detail: 'RESEND_API_KEY não configurada' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.notificationEmailFrom, to: [config.adminEmail], subject, text })
  });
  if (!response.ok) throw new Error(`E-mail recusado (${response.status}): ${await response.text()}`);
  return { status: 'sent', detail: await response.text() };
}

async function sendWhatsApp(text: string) {
  if (!config.evolutionApiUrl || !config.evolutionApiKey || !config.evolutionInstance || !config.whatsappRecipient) {
    return { status: 'skipped', detail: 'Evolution API não configurada' };
  }
  const response = await fetch(`${config.evolutionApiUrl.replace(/\/$/, '')}/message/sendText/${config.evolutionInstance}`, {
    method: 'POST',
    headers: { apikey: config.evolutionApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: config.whatsappRecipient, text })
  });
  if (!response.ok) throw new Error(`WhatsApp recusado (${response.status}): ${await response.text()}`);
  return { status: 'sent', detail: await response.text() };
}

export async function deliverNotifications(userId: string, force = false) {
  const digest = await notificationDigest(userId);
  if (!digest.totalCount) return { digest, deliveries: [], message: 'Nenhuma conta vencida ou próxima do vencimento.' };
  const reference = new Date().toISOString().slice(0, 10);
  const subject = `MEG Finanças: ${digest.totalCount} conta(s) exigem atenção`;
  const channels = [
    { channel: 'email', send: () => sendEmail(subject, digest.text) },
    { channel: 'whatsapp', send: () => sendWhatsApp(digest.text) }
  ];
  const deliveries = [];
  for (const item of channels) {
    const key = `${reference}:${item.channel}`;
    const existing = await prisma.notificationDelivery.findUnique({
      where: { userId_channel_reference: { userId, channel: item.channel, reference: key } }
    });
    if (existing && !force) {
      deliveries.push({ channel: item.channel, status: 'already-sent' });
      continue;
    }
    try {
      const result = await item.send();
      if (result.status === 'sent') {
        await prisma.notificationDelivery.upsert({
          where: { userId_channel_reference: { userId, channel: item.channel, reference: key } },
          create: { userId, channel: item.channel, reference: key, status: result.status, detail: result.detail },
          update: { status: result.status, detail: result.detail, deliveredAt: new Date() }
        });
      }
      deliveries.push({ channel: item.channel, ...result });
    } catch (error) {
      deliveries.push({ channel: item.channel, status: 'failed', detail: error instanceof Error ? error.message : 'Falha desconhecida' });
    }
  }
  return { digest, deliveries };
}
