import { prisma } from '@meg/database';
import { config } from '../../config';
import { resolveWorkspaceContext } from '../workspaces/service';

export type NotificationMode = 'upcoming' | 'due-now' | 'open-summary';

export type LegacyTransaction = {
  id?: string;
  date?: string;
  description?: string;
  status?: string;
  situation?: string;
  type?: string;
  expenseAmount?: number;
  amount?: number;
  paymentMethod?: string;
  modality?: string;
  account?: string;
};

type DigestItem = LegacyTransaction & {
  dueDate: string;
  value: number;
  label: string;
  payment: string;
  priority: 'MÁXIMA' | 'CRÍTICA' | 'URGENTE' | 'ALTA' | 'ATENÇÃO' | 'PROGRAMADA';
  daysUntilDue: number;
  entries: number;
  isCard: boolean;
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateLabel = (value: string) => { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; };
const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const paymentLabel = (item: LegacyTransaction) => normalize(item.paymentMethod || item.account || 'NÃO INFORMADO');
const amountOf = (item: LegacyTransaction) => Number(item.expenseAmount ?? item.amount ?? 0) || 0;

function saoPauloParts(referenceDate: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(referenceDate);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  const iso = `${part('year')}-${part('month')}-${part('day')}`;
  return { iso, hour: Number(part('hour')), date: new Date(`${iso}T12:00:00-03:00`) };
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.valueOf() - from.valueOf()) / 86_400_000);
}

function isOpenExpense(item: LegacyTransaction) {
  const type = normalize(item.type);
  const status = normalize(item.status || item.situation);
  return (type === 'EXPENSE' || type === 'DESPESA') && Boolean(item.date) && !['PAID', 'PAGO', 'PAGA'].includes(status);
}

function isCreditCard(item: LegacyTransaction) {
  const method = paymentLabel(item);
  const modality = normalize(item.modality);
  return modality === 'CREDITO' || (method.includes('CARTAO') && !method.includes('DEBITO'));
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function priority(days: number, dueDate: string, currentMonth: string): DigestItem['priority'] {
  if (monthKey(dueDate) < currentMonth) return 'MÁXIMA';
  if (days < 0) return 'CRÍTICA';
  if (days === 0) return 'URGENTE';
  if (days === 1) return 'ALTA';
  if (days <= 3) return 'ATENÇÃO';
  return 'PROGRAMADA';
}

function groupItems(transactions: LegacyTransaction[], today: Date, currentMonth: string): DigestItem[] {
  const regular: DigestItem[] = [];
  const cards = new Map<string, DigestItem>();
  for (const item of transactions) {
    if (!isOpenExpense(item) || !item.date) continue;
    const due = new Date(`${item.date}T12:00:00-03:00`);
    if (Number.isNaN(due.valueOf())) continue;
    const days = daysBetween(today, due);
    const card = isCreditCard(item);
    const payment = paymentLabel(item);
    const value = amountOf(item);
    const entry: DigestItem = {
      ...item, dueDate: item.date, value, payment, daysUntilDue: days, priority: priority(days, item.date, currentMonth), entries: 1,
      label: card ? `FATURA ${payment}` : normalize(item.description || 'CONTA SEM DESCRIÇÃO'), isCard: card
    };
    if (!card) regular.push(entry);
    else {
      // Agrupa a fatura por cartão e vencimento, sem misturar competências diferentes.
      const key = `${payment}|${item.date}`;
      const previous = cards.get(key);
      if (previous) { previous.value += value; previous.entries += 1; }
      else cards.set(key, entry);
    }
  }
  return [...regular, ...cards.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.value - a.value);
}

function selectForMode(items: DigestItem[], mode: NotificationMode, currentMonth: string) {
  const belongsToCurrentScope = (item: DigestItem) => monthKey(item.dueDate) <= currentMonth;
  const carriedOver = (item: DigestItem) => monthKey(item.dueDate) < currentMonth;
  if (mode === 'open-summary') return items.filter(belongsToCurrentScope);
  if (mode === 'due-now') return items.filter((item) => carriedOver(item) || (monthKey(item.dueDate) === currentMonth && item.daysUntilDue <= 0));
  return items.filter((item) => carriedOver(item) || (monthKey(item.dueDate) === currentMonth && item.daysUntilDue <= 3));
}

function section(lines: string[], title: string, icon: string, items: DigestItem[]) {
  if (!items.length) return;
  lines.push('', `${icon} *${title}*`);
  for (const item of items) {
    const count = item.entries > 1 ? ` · ${item.entries} compras agrupadas` : '';
    lines.push(`  • *${item.label}*`, `    📅 ${dateLabel(item.dueDate)} · 💵 ${money(item.value)} · 🏦 ${item.payment}${count}`);
  }
}

export function buildNotificationDigest(transactions: LegacyTransaction[], referenceDate = new Date(), mode: NotificationMode = 'upcoming') {
  const local = saoPauloParts(referenceDate);
  const currentMonth = monthKey(local.iso);
  const selected = selectForMode(groupItems(transactions, local.date, currentMonth), mode, currentMonth);
  const totalAmount = selected.reduce((sum, item) => sum + item.value, 0);
  const maximumPriority = selected.filter((item) => item.priority === 'MÁXIMA');
  const overdue = selected.filter((item) => item.priority === 'CRÍTICA');
  const today = selected.filter((item) => item.daysUntilDue === 0);
  const tomorrow = selected.filter((item) => item.daysUntilDue === 1);
  const next = selected.filter((item) => item.daysUntilDue >= 2);
  const headline = maximumPriority.length
    ? '🚨 PRIORIDADE MÁXIMA: existem pendências trazidas de meses anteriores.'
    : overdue.length ? '🔴 AÇÃO IMEDIATA: existem contas vencidas neste mês.'
      : today.length ? '🟠 ATENÇÃO: existem pagamentos para hoje.' : '🟢 Agenda financeira sob controle.';
  const title = mode === 'open-summary' ? 'Raio-X das Contas em Aberto' : 'Central de Vencimentos';
  const lines = [
    `🚨 *MEG Finanças — ${title}* 🚨`, '',
    `📅 *Consulta:* ${dateLabel(local.iso)} às ${String(local.hour).padStart(2, '0')}:00`,
    `🎯 *Situação:* ${headline}`,
    `💰 *Total que falta pagar:* ${money(totalAmount)}`,
    `🧾 *Obrigações:* ${selected.length} item(ns)${selected.some((item) => item.isCard) ? ' — faturas já agrupadas por cartão' : ''}`
  ];
  section(lines, 'PRIORIDADE MÁXIMA — PENDÊNCIAS DE MESES ANTERIORES', '🚨', maximumPriority);
  section(lines, 'PRIORIDADE CRÍTICA — VENCIDAS NO MÊS ATUAL', '🔴', overdue);
  section(lines, 'URGENTE — VENCE HOJE', '🟠', today);
  section(lines, 'ALTA — VENCE AMANHÃ', '🟡', tomorrow);
  section(lines, mode === 'open-summary' ? 'DEMAIS CONTAS EM ABERTO NO MÊS ATUAL' : 'PRÓXIMOS 3 DIAS DO MÊS ATUAL', '🔵', next);
  if (!selected.length) lines.push('', '✅ *Nenhuma conta exige atenção neste envio.*');
  lines.push('', '━━━━━━━━━━━━━━━━━━━━', '💡 *Dica MEG:* priorize vencidas, depois as de hoje e preserve saldo para as próximas.', '', '🤖 *MEG Finanças — Seu copiloto financeiro*');
  return { maximumPriority, overdue, today, tomorrow, upcoming: [...tomorrow, ...next], items: selected, text: lines.join('\n'), totalCount: selected.length, totalAmount, mode };
}

export async function notificationDigest(userId: string, referenceDate = new Date(), mode: NotificationMode = 'upcoming') {
  const context = await resolveWorkspaceContext(userId);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
  const state = saved?.state as { transactions?: LegacyTransaction[] } | null;
  return buildNotificationDigest(state?.transactions || [], referenceDate, mode);
}

type EmailBranding = { senderName?: string | null; replyToEmail?: string | null };

async function sendEmail(to: string, subject: string, text: string, branding: EmailBranding = {}) {
  const recipient = to.trim().replace(/[?？]+$/u, '').toLowerCase();
  const senderAddress = config.notificationEmailFrom.match(/<([^>]+)>/)?.[1] || config.notificationEmailFrom;
  const senderName = branding.senderName?.trim();
  const replyToEmail = branding.replyToEmail?.trim().replace(/[?？]+$/u, '').toLowerCase() || config.adminEmail;
  const brandedFrom = senderName ? `${senderName} <${senderAddress}>` : config.notificationEmailFrom;
  const usesResendTestDomain = senderAddress.trim().toLowerCase().endsWith('@resend.dev');
  const canUseResend = Boolean(config.resendApiKey) && (!usesResendTestDomain || recipient === config.adminEmail.trim().toLowerCase());
  if (canUseResend) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: brandedFrom, to: [recipient], reply_to: replyToEmail, subject, text })
    });
    if (!response.ok) throw new Error(`E-mail Resend recusado (${response.status}): ${await response.text()}`);
    return { status: 'sent', provider: 'resend', detail: await response.text() };
  }
  if (config.brevoApiKey && config.brevoSenderEmail) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': config.brevoApiKey, accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName || config.brevoSenderName, email: config.brevoSenderEmail },
        to: [{ email: recipient }],
        replyTo: { email: replyToEmail, name: senderName || 'Administrador MEG' },
        subject,
        textContent: text
      })
    });
    if (!response.ok) throw new Error(`E-mail Brevo recusado (${response.status}): ${await response.text()}`);
    return { status: 'sent', provider: 'brevo', detail: await response.text() };
  }
  const reason = usesResendTestDomain && recipient !== config.adminEmail.trim().toLowerCase()
    ? 'Resend em modo de teste e Brevo não configurado para outros destinatários.'
    : 'Nenhum provedor de e-mail configurado.';
  return { status: 'failed', detail: reason };
}

export async function sendSystemEmail(to: string, subject: string, text: string) {
  return sendEmail(to, subject, text);
}

async function sendWhatsApp(number: string, text: string) {
  if (!config.evolutionApiUrl || !config.evolutionApiKey || !config.evolutionInstance || !number) return { status: 'skipped', detail: 'Evolution API não configurada' };
  const response = await fetch(`${config.evolutionApiUrl.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(config.evolutionInstance)}`, {
    method: 'POST', headers: { apikey: config.evolutionApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: number.replace(/\D/g, ''), text })
  });
  if (!response.ok) throw new Error(`WhatsApp recusado (${response.status}): ${await response.text()}`);
  return { status: 'sent', detail: await response.text() };
}

export async function sendSystemWhatsApp(number: string, text: string) {
  return sendWhatsApp(number, text);
}

export function notificationIntegrationStatus() {
  const senderAddress = config.notificationEmailFrom.match(/<([^>]+)>/)?.[1] || config.notificationEmailFrom;
  const testOnly = senderAddress.trim().toLowerCase().endsWith('@resend.dev');
  const brevoReady = Boolean(config.brevoApiKey && config.brevoSenderEmail);
  const resendReadyForAll = Boolean(config.resendApiKey && config.notificationEmailFrom && !testOnly);
  return {
    email: {
      configured: Boolean(config.resendApiKey || brevoReady),
      recipient: config.adminEmail,
      sender: brevoReady ? config.brevoSenderEmail : senderAddress,
      provider: brevoReady ? 'brevo' : 'resend',
      mode: brevoReady || resendReadyForAll ? 'production' : 'test-only',
      readyForAllUsers: brevoReady || resendReadyForAll
    },
    whatsapp: { configured: Boolean(config.evolutionApiUrl && config.evolutionApiKey && config.evolutionInstance), defaultRecipient: config.whatsappRecipient ? config.whatsappRecipient.replace(/\d(?=\d{4})/g, '•') : null },
    automation: { configured: Boolean(config.notificationCronSecret), schedule: '06:00, 12:00 e 19:00 America/Sao_Paulo; resumo geral a cada 5 dias às 06:00' }
  };
}

type DeliveryOptions = {
  force?: boolean;
  recipientIds?: string[];
  emailRecipientIds?: string[];
  referenceDate?: Date;
  mode?: NotificationMode;
  slot?: string;
};

export async function deliverNotifications(userId: string, options: DeliveryOptions = {}) {
  const { force = false, recipientIds = [], emailRecipientIds = [], referenceDate = new Date(), mode = 'upcoming', slot = 'manual' } = options;
  const digest = await notificationDigest(userId, referenceDate, mode);
  if (!digest.totalCount) return { digest, deliveries: [], message: 'Nenhuma conta exige atenção neste envio.' };
  const local = saoPauloParts(referenceDate);
  const subject = `MEG Finanças: ${digest.totalCount} obrigação(ões) — ${money(digest.totalAmount)}`;
  const context = await resolveWorkspaceContext(userId);
  const notificationConfig = await prisma.workspaceNotificationConfig.findUnique({ where: { workspaceId: context.workspaceId } });
  const [phones, emails, owner] = await Promise.all([
    prisma.notificationRecipient.findMany({ where: { userId, isActive: true, ...(recipientIds.length ? { id: { in: recipientIds } } : {}) }, orderBy: { name: 'asc' } }),
    notificationConfig?.emailEnabled === false ? Promise.resolve([]) : prisma.notificationEmailRecipient.findMany({ where: { userId, isActive: true, ...(emailRecipientIds.length ? { id: { in: emailRecipientIds } } : {}) }, orderBy: { name: 'asc' } }),
    prisma.user.findUnique({ where: { id: context.workspace.ownerId }, select: { name: true, email: true, phone: true } })
  ]);
  const ownerFallbackPhone = owner?.phone || (owner?.email === config.adminEmail.trim().toLowerCase() ? config.whatsappRecipient : null);
  const whatsappTargets = phones.length ? phones : ownerFallbackPhone ? [{ id: 'workspace-owner', name: owner?.name || 'Responsável', phone: ownerFallbackPhone }] : [];
  const emailTargets = notificationConfig?.emailEnabled === false ? [] : emails.length ? emails : owner?.email ? [{ id: 'workspace-owner', name: owner.name, email: owner.email }] : [];
  const channels = [
    ...emailTargets.map((recipient) => ({ channel: `email:${recipient.id}`, label: `${recipient.name} (${recipient.email})`, send: () => sendEmail(recipient.email, subject, digest.text, notificationConfig ?? undefined) })),
    ...whatsappTargets.map((recipient) => ({ channel: `whatsapp:${recipient.id}`, label: `${recipient.name} (${recipient.phone})`, send: () => sendWhatsApp(recipient.phone, digest.text) }))
  ];
  const deliveries = [];
  const reference = `${local.iso}:${slot}:${mode}`;
  for (const item of channels) {
    const existing = await prisma.notificationDelivery.findUnique({ where: { userId_channel_reference: { userId, channel: item.channel, reference } } });
    if (existing && !force) { deliveries.push({ channel: item.channel, recipient: item.label, status: 'already-sent' }); continue; }
    try {
      const result = await item.send();
      if (result.status === 'sent') await prisma.notificationDelivery.upsert({
        where: { userId_channel_reference: { userId, channel: item.channel, reference } },
        create: { userId, channel: item.channel, reference, status: result.status, detail: result.detail },
        update: { status: result.status, detail: result.detail, deliveredAt: new Date() }
      });
      deliveries.push({ channel: item.channel, recipient: item.label, ...result });
    } catch (error) {
      deliveries.push({ channel: item.channel, recipient: item.label, status: 'failed', detail: error instanceof Error ? error.message : 'Falha desconhecida' });
    }
  }
  return { digest, deliveries };
}

export function automationSlot(referenceDate = new Date(), requestedSlot?: string) {
  const local = saoPauloParts(referenceDate);
  if (requestedSlot && ['06:00', '12:00', '19:00'].includes(requestedSlot)) {
    const hour = Number(requestedSlot.slice(0, 2));
    return { ...local, hour, slot: requestedSlot, mode: hour === 6 ? 'upcoming' as const : 'due-now' as const };
  }
  if (![6, 12, 19].includes(local.hour)) return null;
  return { ...local, slot: `${String(local.hour).padStart(2, '0')}:00`, mode: local.hour === 6 ? 'upcoming' as const : 'due-now' as const };
}

export async function shouldSendOpenSummary(userId: string, referenceDate = new Date()) {
  const threshold = new Date(referenceDate);
  threshold.setDate(threshold.getDate() - 5);
  const recent = await prisma.notificationDelivery.findFirst({
    where: { userId, reference: { contains: ':open-summary' }, status: 'sent', deliveredAt: { gt: threshold } },
    orderBy: { deliveredAt: 'desc' }
  });
  return !recent;
}
