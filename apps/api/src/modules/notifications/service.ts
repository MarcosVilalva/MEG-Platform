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
  paymentMethod?: string;
  account?: string;
};

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function paymentLabel(item: LegacyTransaction) {
  return String(item.paymentMethod || item.account || 'NÃO INFORMADO').toUpperCase();
}

function saoPauloDate(referenceDate: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(referenceDate);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  const iso = `${part('year')}-${part('month')}-${part('day')}`;
  return { iso, date: new Date(`${iso}T12:00:00-03:00`) };
}

export async function notificationDigest(userId: string, referenceDate = new Date()) {
  const saved = await prisma.appState.findUnique({ where: { userId } });
  const state = saved?.state as { transactions?: LegacyTransaction[] } | null;
  const local = saoPauloDate(referenceDate);
  const today = local.date;
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
    '🚨 *MEG Finanças — Alerta de Vencimento* 🚨',
    '',
    'Oi! Aqui é o seu assistente financeiro favorito 🤖💚',
    'Vim te dar um toque antes que o dinheiro saia voando sem você perceber! 💸',
    '',
    `📅 *Consulta em:* ${dateLabel(local.iso)}`,
    `💰 *Total em aberto:* ${money(total(pending))}`,
  ];

  if (overdue.length) {
    lines.push('', '🔴 *JÁ VENCIDAS — Corre que tá atrasado(a)!* 😬');
    overdue.forEach((item) => lines.push(
      `  ⚠️ *${String(item.description || 'Conta sem descrição').toUpperCase()}*`,
      `     📆 ${dateLabel(item.date!)} · 💵 ${money(Number(item.expenseAmount ?? item.amount ?? 0))} · 🏦 ${paymentLabel(item)}`,
    ));
  }
  if (upcoming.length) {
    lines.push('', '🟡 *PRÓXIMOS 3 DIAS — Já deixa no radar!* 👀');
    upcoming.forEach((item) => lines.push(
      `  ⏰ *${String(item.description || 'Conta sem descrição').toUpperCase()}*`,
      `     📆 ${dateLabel(item.date!)} · 💵 ${money(Number(item.expenseAmount ?? item.amount ?? 0))} · 🏦 ${paymentLabel(item)}`,
    ));
  }
  lines.push('', '━━━━━━━━━━━━━━━━━━━━', '💡 *Dica do dia:* Conta paga é conta que não te tira o sono! 😴✅', '', '🤖 *MEG Finanças — Seu copiloto financeiro*');

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

async function sendWhatsApp(number: string, text: string) {
  if (!config.evolutionApiUrl || !config.evolutionApiKey || !config.evolutionInstance || !number) {
    return { status: 'skipped', detail: 'Evolution API não configurada' };
  }
  const response = await fetch(`${config.evolutionApiUrl.replace(/\/$/, '')}/message/sendText/${config.evolutionInstance}`, {
    method: 'POST',
    headers: { apikey: config.evolutionApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, text })
  });
  if (!response.ok) throw new Error(`WhatsApp recusado (${response.status}): ${await response.text()}`);
  return { status: 'sent', detail: await response.text() };
}

export async function deliverNotifications(userId: string, force = false, recipientIds: string[] = []) {
  const digest = await notificationDigest(userId);
  if (!digest.totalCount) return { digest, deliveries: [], message: 'Nenhuma conta vencida ou próxima do vencimento.' };
  const reference = new Date().toISOString().slice(0, 10);
  const subject = `MEG Finanças: ${digest.totalCount} conta(s) exigem atenção`;
  const recipients = await prisma.notificationRecipient.findMany({
    where: { userId, isActive: true, ...(recipientIds.length ? { id: { in: recipientIds } } : {}) },
    orderBy: { name: 'asc' }
  });
  const whatsappTargets = recipients.length
    ? recipients.map((recipient) => ({ id: recipient.id, name: recipient.name, phone: recipient.phone }))
    : config.whatsappRecipient
      ? [{ id: 'default', name: 'Número padrão', phone: config.whatsappRecipient }]
      : [];
  const channels = [
    { channel: 'email', label: config.adminEmail, send: () => sendEmail(subject, digest.text) },
    ...whatsappTargets.map((recipient) => ({
      channel: `whatsapp:${recipient.id}`,
      label: `${recipient.name} (${recipient.phone})`,
      send: () => sendWhatsApp(recipient.phone, digest.text)
    }))
  ];
  const deliveries = [];
  for (const item of channels) {
    const key = `${reference}:${item.channel}`;
    const existing = await prisma.notificationDelivery.findUnique({
      where: { userId_channel_reference: { userId, channel: item.channel, reference: key } }
    });
    if (existing && !force) {
      deliveries.push({ channel: item.channel, recipient: item.label, status: 'already-sent' });
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
      deliveries.push({ channel: item.channel, recipient: item.label, ...result });
    } catch (error) {
      deliveries.push({ channel: item.channel, recipient: item.label, status: 'failed', detail: error instanceof Error ? error.message : 'Falha desconhecida' });
    }
  }
  return { digest, deliveries };
}
