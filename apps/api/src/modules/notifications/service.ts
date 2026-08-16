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
  incomeAmount?: number;
  amount?: number;
  paymentMethod?: string;
  modality?: string;
  account?: string;
  financialScope?: string;
  financialAccountId?: string;
};

export type AlexaSkillIntent =
  | 'overview'
  | 'pending'
  | 'next-due'
  | 'balance'
  | 'monetary-balance'
  | 'benefit-balance'
  | 'monthly-income'
  | 'monthly-expenses'
  | 'projected-closing'
  | 'due-in-days'
  | 'due-next-days'
  | 'due-on-date'
  | 'overdue';

export type AlexaSkillQuery = {
  days?: number;
  date?: string;
};

type AlexaFinancialResponse = {
  speech: string;
  reprompt: string;
  cardTitle: string;
  cardText: string;
  data: {
    month?: string;
    monetaryOpening?: number;
    monetaryIncome?: number;
    monetaryPaidExpense?: number;
    monetaryPendingExpense?: number;
    monetaryAvailable?: number;
    projectedClosing?: number;
    benefitBalance?: number;
    overdueCount?: number;
    openCount?: number;
    nextDueDate?: string | null;
    nextDueTotal?: number;
    query?: AlexaSkillIntent;
    requestedDays?: number;
    requestedDate?: string | null;
    total?: number;
    count?: number;
    items?: Array<{ dueDate: string; label: string; value: number; entries: number; priority: DigestItem['priority'] }>;
  };
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
const incomeAmountOf = (item: LegacyTransaction) => Number(item.incomeAmount ?? item.amount ?? 0) || 0;

function isBenefitTransaction(item: LegacyTransaction) {
  if (item.financialScope === 'benefit') return true;
  if (item.financialScope === 'monetary') return false;
  if (String(item.financialAccountId || '').startsWith('account-benefit-')) return true;
  const modality = normalize(item.modality);
  if (modality.includes('ALIMENTA')) return true;
  if (normalize(item.type) === 'INCOME' || normalize(item.type) === 'RECEITA') return normalize(item.description).includes('VEROCARD');
  return normalize(item.paymentMethod || item.account).includes('VEROCARD');
}

function isPaidExpense(item: LegacyTransaction) {
  return ['PAID', 'PAGO', 'PAGA', 'RECONCILED', 'CONFIRMED'].includes(normalize(item.status || item.situation));
}

function isIncome(item: LegacyTransaction) {
  return ['INCOME', 'RECEITA', 'REDEMPTION'].includes(normalize(item.type));
}

function saoPauloParts(referenceDate: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23'
  }).formatToParts(referenceDate);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  const iso = `${part('year')}-${part('month')}-${part('day')}`;
  const weekdayName = part('weekday').toLowerCase();
  const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(weekdayName);
  return { iso, hour: Number(part('hour')), minute: Number(part('minute')), weekday, date: new Date(`${iso}T12:00:00-03:00`) };
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

function groupedSuffix(items: DigestItem[]) {
  return items.some((item) => item.isCard) ? ' — faturas já agrupadas por cartão' : '';
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
  const grouped = groupItems(transactions, local.date, currentMonth);
  const selected = selectForMode(grouped, mode, currentMonth);
  const currentScope = grouped.filter((item) => monthKey(item.dueDate) <= currentMonth);
  const futureScope = grouped.filter((item) => monthKey(item.dueDate) > currentMonth);
  const totalAmount = selected.reduce((sum, item) => sum + item.value, 0);
  const openAmount = currentScope.reduce((sum, item) => sum + item.value, 0);
  const futureAmount = futureScope.reduce((sum, item) => sum + item.value, 0);
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
    `🎯 *Situação:* ${headline}`
  ];

  if (mode === 'open-summary') {
    lines.push(
      `💰 *Total em aberto até o mês atual:* ${money(openAmount)}`,
      `🧾 *Obrigações em aberto:* ${currentScope.length} item(ns)${groupedSuffix(currentScope)}`
    );
  } else {
    lines.push(
      `⚠️ *Exigem atenção neste envio:* ${money(totalAmount)}`,
      `🧾 *Itens em atenção:* ${selected.length} item(ns)${groupedSuffix(selected)}`,
      `📌 *Total em aberto até o mês atual:* ${money(openAmount)} em ${currentScope.length} obrigação(ões)${groupedSuffix(currentScope)}`,
      `🔭 *Compromissos após este mês:* ${money(futureAmount)} em ${futureScope.length} obrigação(ões)${groupedSuffix(futureScope)}`
    );
  }

  section(lines, 'PRIORIDADE MÁXIMA — PENDÊNCIAS DE MESES ANTERIORES', '🚨', maximumPriority);
  section(lines, 'PRIORIDADE CRÍTICA — VENCIDAS NO MÊS ATUAL', '🔴', overdue);
  section(lines, 'URGENTE — VENCE HOJE', '🟠', today);
  section(lines, 'ALTA — VENCE AMANHÃ', '🟡', tomorrow);
  section(lines, mode === 'open-summary' ? 'DEMAIS CONTAS EM ABERTO NO MÊS ATUAL' : 'PRÓXIMOS 3 DIAS DO MÊS ATUAL', '🔵', next);
  if (!selected.length) lines.push('', '✅ *Nenhuma conta exige atenção neste envio.*');
  lines.push('', '━━━━━━━━━━━━━━━━━━━━', '💡 *Dica MEG:* priorize vencidas, depois as de hoje e preserve saldo para as próximas.', '', '🤖 *MEG Finanças — Seu copiloto financeiro*');
  return {
    maximumPriority,
    overdue,
    today,
    tomorrow,
    upcoming: [...tomorrow, ...next],
    items: selected,
    text: lines.join('\n'),
    totalCount: selected.length,
    totalAmount,
    openCount: currentScope.length,
    openAmount,
    futureCount: futureScope.length,
    futureAmount,
    mode
  };
}

export async function notificationDigest(userId: string, referenceDate = new Date(), mode: NotificationMode = 'upcoming') {
  const context = await resolveWorkspaceContext(userId);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
  const state = saved?.state as { transactions?: LegacyTransaction[] } | null;
  return buildNotificationDigest(state?.transactions || [], referenceDate, mode);
}

type EmailBranding = { senderName?: string | null; replyToEmail?: string | null };

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = 30_000) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

const priorityTheme: Record<DigestItem['priority'], { color: string; background: string; label: string }> = {
  'MÁXIMA': { color: '#991b1b', background: '#fee2e2', label: 'Prioridade máxima' },
  'CRÍTICA': { color: '#b91c1c', background: '#fef2f2', label: 'Vencida' },
  'URGENTE': { color: '#c2410c', background: '#fff7ed', label: 'Vence hoje' },
  'ALTA': { color: '#a16207', background: '#fefce8', label: 'Vence amanhã' },
  'ATENÇÃO': { color: '#0369a1', background: '#f0f9ff', label: 'Próximos 3 dias' },
  'PROGRAMADA': { color: '#047857', background: '#ecfdf5', label: 'Programada' }
};

export function buildNotificationEmailHtml(digest: ReturnType<typeof buildNotificationDigest>) {
  const title = digest.mode === 'open-summary' ? 'Raio-X das contas em aberto' : 'Central de vencimentos';
  const rows = digest.items.map((item) => {
    const theme = priorityTheme[item.priority];
    const grouped = item.entries > 1 ? `${item.entries} compras agrupadas` : item.payment;
    return `<tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb"><div style="font-weight:800;color:#102a26">${escapeHtml(item.label)}</div><div style="margin-top:4px;color:#64748b;font-size:13px">${escapeHtml(grouped)} &bull; ${escapeHtml(dateLabel(item.dueDate))}</div></td><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap"><div style="font-weight:800;color:#102a26">${escapeHtml(money(item.value))}</div><span style="display:inline-block;margin-top:5px;padding:4px 8px;border-radius:999px;background:${theme.background};color:${theme.color};font-size:11px;font-weight:800;text-transform:uppercase">${escapeHtml(theme.label)}</span></td></tr>`;
  }).join('');
  const urgent = digest.maximumPriority.length || digest.overdue.length;
  const statusColor = urgent ? '#b91c1c' : digest.today.length ? '#c2410c' : '#047857';
  const statusText = digest.maximumPriority.length ? 'Existem pendências de meses anteriores que exigem prioridade máxima.' : digest.overdue.length ? 'Existem contas vencidas que precisam de ação.' : digest.today.length ? 'Existem pagamentos programados para hoje.' : 'Sua agenda financeira está sob controle.';
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f2f7f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#102a26"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f7f5;padding:24px 10px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 14px 40px rgba(15,82,72,.12)"><tr><td style="padding:30px;background:#075e54;color:#fff"><div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#8ff3df">MEG Finanças</div><h1 style="margin:10px 0 6px;font-size:28px">${escapeHtml(title)}</h1><div style="font-size:15px;color:#d5fff7">Informação objetiva para decidir e pagar no prazo.</div></td></tr><tr><td style="padding:24px 28px 10px"><div style="padding:15px 17px;border-left:5px solid ${statusColor};background:#f8fafc;border-radius:12px;color:${statusColor};font-weight:750">${escapeHtml(statusText)}</div></td></tr><tr><td style="padding:12px 28px 22px"><table role="presentation" width="100%" cellspacing="8" cellpadding="0"><tr><td style="padding:16px;background:#eaf8f4;border-radius:14px"><div style="font-size:12px;color:#52716b;text-transform:uppercase;font-weight:800">Neste alerta</div><div style="font-size:24px;font-weight:900;margin-top:5px">${escapeHtml(money(digest.totalAmount))}</div><div style="font-size:13px;color:#52716b">${digest.totalCount} obrigação(ões)</div></td><td style="padding:16px;background:#f8fafc;border-radius:14px"><div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:800">Em aberto</div><div style="font-size:24px;font-weight:900;margin-top:5px">${escapeHtml(money(digest.openAmount))}</div><div style="font-size:13px;color:#64748b">até o mês atual</div></td></tr></table></td></tr><tr><td style="padding:0 28px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">${rows || '<tr><td style="padding:24px;text-align:center;color:#047857;font-weight:800">Nenhuma conta exige atenção neste envio.</td></tr>'}</table></td></tr><tr><td style="padding:20px 28px;background:#062f2a;color:#cceee7;text-align:center;font-size:13px">MEG Finanças &bull; Seu copiloto financeiro<br><span style="color:#8fc7bc">Mensagem automática. Pagamentos baixados deixam de aparecer nos próximos alertas.</span></td></tr></table></td></tr></table></body></html>`;
}

async function sendEmail(to: string, subject: string, text: string, branding: EmailBranding = {}, html?: string) {
  const recipient = to.trim().replace(/[?？]+$/u, '').toLowerCase();
  const senderAddress = config.notificationEmailFrom.match(/<([^>]+)>/)?.[1] || config.notificationEmailFrom;
  const senderName = branding.senderName?.trim();
  const replyToEmail = branding.replyToEmail?.trim().replace(/[?？]+$/u, '').toLowerCase() || config.adminEmail;
  const brandedFrom = senderName ? `${senderName} <${senderAddress}>` : config.notificationEmailFrom;
  const usesResendTestDomain = senderAddress.trim().toLowerCase().endsWith('@resend.dev');
  const canUseResend = Boolean(config.resendApiKey) && (!usesResendTestDomain || recipient === config.adminEmail.trim().toLowerCase());
  if (canUseResend) {
    const response = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: brandedFrom, to: [recipient], reply_to: replyToEmail, subject, text, html })
    });
    if (!response.ok) throw new Error(`E-mail Resend recusado (${response.status}): ${await response.text()}`);
    return { status: 'sent', provider: 'resend', detail: await response.text() };
  }
  if (config.brevoApiKey && config.brevoSenderEmail) {
    const response = await fetchWithTimeout('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': config.brevoApiKey, accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName || config.brevoSenderName, email: config.brevoSenderEmail },
        to: [{ email: recipient }],
        replyTo: { email: replyToEmail, name: senderName || 'Administrador MEG' },
        subject,
        textContent: text,
        htmlContent: html
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
  const response = await fetchWithTimeout(`${config.evolutionApiUrl.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(config.evolutionInstance)}`, {
    method: 'POST', headers: { apikey: config.evolutionApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: number.replace(/\D/g, ''), text })
  }, 45_000);
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
    alexa: {
      configured: Boolean(config.alexaAnnouncementWebhookUrl || config.alexaSkillSecret),
      announcementsConfigured: Boolean(config.alexaAnnouncementWebhookUrl),
      skillConfigured: Boolean(config.alexaSkillSecret),
      owner: config.alexaOwnerEmail,
      schedule: 'dias úteis às 06:20, 18:00 e 21:00; fins de semana às 12:00'
    },
    automation: { configured: Boolean(config.notificationCronSecret), schedule: '06:00, 12:00 e 19:00 America/Sao_Paulo; resumo geral a cada 5 dias às 06:00' }
  };
}

function monthBounds(referenceDate: Date) {
  const local = saoPauloParts(referenceDate);
  const month = monthKey(local.iso);
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  return { ...local, month, start: `${month}-01`, endExclusive: nextMonth };
}

function spokenMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function spokenMoney(value: number) {
  return money(Math.abs(value));
}

function isoDateAfter(referenceDate: Date, days: number) {
  const local = saoPauloParts(referenceDate);
  const target = new Date(`${local.iso}T12:00:00-03:00`);
  target.setDate(target.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(target);
}

function naturalLabel(value: string) {
  const known: Record<string, string> = {
    BB: 'BB', BV: 'BV', C6: 'C6', CPFL: 'CPFL', IPTU: 'IPTU', LATAM: 'Latam', ML: 'Mercado Livre', PIX: 'Pix'
  };
  return normalize(value)
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) => known[word] || `${word.charAt(0)}${word.slice(1).toLocaleLowerCase('pt-BR')}`)
    .join(' ');
}

function spokenItemLabel(item: DigestItem) {
  if (!item.isCard) return naturalLabel(item.label);
  const cardName = normalize(item.payment)
    .replace(/^FATURA\s+/u, '')
    .replace(/^CARTAO(?:\s+DE\s+CREDITO)?\s*/u, '')
    .trim();
  return `Cartão ${naturalLabel(cardName || item.payment)}`;
}

function joinSpokenItems(parts: string[]) {
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join('; ')}; e ${parts.at(-1)}`;
}

function describeAlexaItems(items: DigestItem[], limit = 6) {
  const details = items.slice(0, limit).map((item) => `${spokenItemLabel(item)}, no valor de ${spokenMoney(item.value)}`);
  if (items.length > limit) details.push(`mais ${items.length - limit} compromisso${items.length - limit === 1 ? '' : 's'}`);
  return joinSpokenItems(details);
}

function buildAlexaDetailedBills(
  transactions: LegacyTransaction[],
  referenceDate: Date,
  intent: Extract<AlexaSkillIntent, 'due-in-days' | 'due-next-days' | 'due-on-date' | 'overdue'>,
  query: AlexaSkillQuery
): AlexaFinancialResponse {
  const bounds = monthBounds(referenceDate);
  const grouped = groupItems(transactions, bounds.date, bounds.month).filter((item) => !isBenefitTransaction(item));
  const requestedDays = Math.min(365, Math.max(0, Math.trunc(Number(query.days) || 0)));
  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(query.date || ''))
    ? String(query.date)
    : isoDateAfter(referenceDate, requestedDays);

  let selected: DigestItem[];
  let subject: string;
  if (intent === 'overdue') {
    selected = grouped.filter((item) => item.daysUntilDue < 0);
    subject = 'contas vencidas';
  } else if (intent === 'due-next-days') {
    selected = grouped.filter((item) => item.daysUntilDue >= 0 && item.daysUntilDue <= requestedDays);
    subject = requestedDays === 1 ? 'próximas 24 horas' : `próximos ${requestedDays} dias`;
  } else {
    selected = grouped.filter((item) => item.dueDate === requestedDate);
    subject = intent === 'due-in-days'
      ? (requestedDays === 0 ? 'hoje' : requestedDays === 1 ? 'amanhã' : `daqui a ${requestedDays} dias`)
      : `dia ${dateLabel(requestedDate)}`;
  }

  const total = selected.reduce((sum, item) => sum + item.value, 0);
  const speech = selected.length
    ? `Para ${subject}, há ${selected.length} compromisso${selected.length === 1 ? '' : 's'}, somando ${spokenMoney(total)}. ${describeAlexaItems(selected)}.`
    : `Não encontrei contas monetárias em aberto para ${subject}.`;

  return {
    speech,
    reprompt: 'Você também pode perguntar pelas contas de uma data, pelos próximos dias ou pelas contas vencidas.',
    cardTitle: `MEG Finanças — ${subject}`,
    cardText: selected.length
      ? [`Total: ${money(total)}`, `Itens: ${selected.length}`, ...selected.map((item) => `${dateLabel(item.dueDate)} — ${item.label} — ${money(item.value)}${item.entries > 1 ? ` (${item.entries} lançamentos)` : ''}`)].join('\n')
      : `Nenhuma conta monetária em aberto para ${subject}.`,
    data: {
      query: intent,
      requestedDays,
      requestedDate: intent === 'overdue' || intent === 'due-next-days' ? null : requestedDate,
      total,
      count: selected.length,
      items: selected.map((item) => ({
        dueDate: item.dueDate, label: item.label, value: item.value, entries: item.entries, priority: item.priority
      }))
    }
  };
}

export function buildAlexaFinancialPanorama(
  transactions: LegacyTransaction[],
  referenceDate = new Date(),
  intent: AlexaSkillIntent = 'overview',
  query: AlexaSkillQuery = {}
): AlexaFinancialResponse {
  if (['due-in-days', 'due-next-days', 'due-on-date', 'overdue'].includes(intent)) {
    return buildAlexaDetailedBills(
      transactions,
      referenceDate,
      intent as Extract<AlexaSkillIntent, 'due-in-days' | 'due-next-days' | 'due-on-date' | 'overdue'>,
      query
    );
  }
  const bounds = monthBounds(referenceDate);
  let monetaryOpening = 0;
  let monetaryIncome = 0;
  let monetaryPaidExpense = 0;
  let monetaryPendingExpense = 0;
  let benefitOpening = 0;
  let benefitIncome = 0;
  let benefitExpense = 0;

  for (const item of transactions) {
    const date = String(item.date || '');
    if (!date) continue;
    const benefit = isBenefitTransaction(item);
    const income = isIncome(item) ? incomeAmountOf(item) : 0;
    const expense = isIncome(item) ? 0 : amountOf(item);
    if (date < bounds.start) {
      if (benefit) benefitOpening += income - expense;
      else monetaryOpening += income - expense;
      continue;
    }
    if (date >= bounds.endExclusive) continue;
    if (benefit) {
      benefitIncome += income;
      benefitExpense += expense;
    } else if (income) {
      monetaryIncome += income;
    } else if (isPaidExpense(item)) {
      monetaryPaidExpense += expense;
    } else {
      monetaryPendingExpense += expense;
    }
  }

  const monetaryAvailable = monetaryOpening + monetaryIncome - monetaryPaidExpense;
  const projectedClosing = monetaryAvailable - monetaryPendingExpense;
  const benefitBalance = benefitOpening + benefitIncome - benefitExpense;
  const grouped = groupItems(transactions, bounds.date, bounds.month).filter((item) => !isBenefitTransaction(item));
  const openThroughMonth = grouped.filter((item) => monthKey(item.dueDate) <= bounds.month);
  const overdue = openThroughMonth.filter((item) => item.daysUntilDue < 0);
  const nextDueDate = grouped.find((item) => item.daysUntilDue >= 0)?.dueDate || '';
  const nextDueItems = nextDueDate ? grouped.filter((item) => item.dueDate === nextDueDate) : [];
  const nextDueTotal = nextDueItems.reduce((sum, item) => sum + item.value, 0);
  const nextDueLabels = nextDueItems.slice(0, 3).map(spokenItemLabel);
  const monthLabel = spokenMonth(bounds.month);
  const projectedMessage = projectedClosing >= 0
    ? `Depois de quitar as pendências, a projeção é de sobra de ${spokenMoney(projectedClosing)}.`
    : `Atenção: faltam ${spokenMoney(projectedClosing)} para fechar o mês sem déficit.`;
  const nextDueMessage = nextDueDate
    ? `O próximo vencimento é em ${dateLabel(nextDueDate)}, no total de ${spokenMoney(nextDueTotal)}, referente a ${nextDueLabels.join(', ')}.`
    : 'Não há próximo vencimento cadastrado.';

  let speech: string;
  if (intent === 'pending') {
    speech = openThroughMonth.length
      ? `Você tem ${openThroughMonth.length} obrigações em aberto até ${monthLabel}, somando ${spokenMoney(monetaryPendingExpense)}. ${overdue.length ? `${overdue.length} estão vencidas e precisam de prioridade. ` : ''}${projectedMessage}`
      : `Ótima notícia. Não há contas monetárias em aberto até ${monthLabel}.`;
  } else if (intent === 'next-due') {
    speech = nextDueMessage;
  } else if (intent === 'balance' || intent === 'monetary-balance') {
    speech = `Seu saldo monetário disponível é ${spokenMoney(monetaryAvailable)}. Há ${spokenMoney(monetaryPendingExpense)} em contas pendentes. ${projectedMessage}`;
  } else if (intent === 'benefit-balance') {
    speech = `Seu saldo disponível em benefícios é ${spokenMoney(benefitBalance)}. Neste mês, entraram ${spokenMoney(benefitIncome)} e foram utilizados ${spokenMoney(benefitExpense)}.`;
  } else if (intent === 'monthly-income') {
    speech = `Em ${monthLabel}, suas receitas monetárias somam ${spokenMoney(monetaryIncome)}. Considerando o saldo trazido dos meses anteriores, você tem ${spokenMoney(monetaryAvailable)} disponíveis agora.`;
  } else if (intent === 'monthly-expenses') {
    speech = `Em ${monthLabel}, você já pagou ${spokenMoney(monetaryPaidExpense)} em despesas monetárias e ainda tem ${spokenMoney(monetaryPendingExpense)} em aberto. ${projectedMessage}`;
  } else if (intent === 'projected-closing') {
    speech = `Hoje você tem ${spokenMoney(monetaryAvailable)} disponíveis e ${spokenMoney(monetaryPendingExpense)} em compromissos pendentes. ${projectedMessage}`;
  } else {
    speech = `Panorama MEG de ${monthLabel}. Seu saldo monetário disponível é ${spokenMoney(monetaryAvailable)}. `
      + `Neste mês entraram ${spokenMoney(monetaryIncome)} e foram pagas despesas de ${spokenMoney(monetaryPaidExpense)}. `
      + `Ainda há ${spokenMoney(monetaryPendingExpense)} em contas monetárias pendentes. ${projectedMessage} `
      + `O saldo do benefício alimentação é ${spokenMoney(benefitBalance)}. ${nextDueMessage}`;
  }

  return {
    speech,
    reprompt: 'Você pode perguntar pelo saldo, pelas pendências ou pelo próximo vencimento.',
    cardTitle: `MEG Finanças — ${monthLabel}`,
    cardText: [
      `Saldo monetário: ${money(monetaryAvailable)}`,
      `Receitas do mês: ${money(monetaryIncome)}`,
      `Despesas pagas: ${money(monetaryPaidExpense)}`,
      `Pendências monetárias: ${money(monetaryPendingExpense)}`,
      `Projeção de fechamento: ${money(projectedClosing)}`,
      `Benefício alimentação: ${money(benefitBalance)}`,
      nextDueDate ? `Próximo vencimento: ${dateLabel(nextDueDate)} — ${money(nextDueTotal)}` : 'Próximo vencimento: nenhum'
    ].join('\n'),
    data: {
      month: bounds.month,
      monetaryOpening,
      monetaryIncome,
      monetaryPaidExpense,
      monetaryPendingExpense,
      monetaryAvailable,
      projectedClosing,
      benefitBalance,
      overdueCount: overdue.length,
      openCount: openThroughMonth.length,
      nextDueDate: nextDueDate || null,
      nextDueTotal
    }
  };
}

export async function alexaFinancialPanorama(referenceDate = new Date(), intent: AlexaSkillIntent = 'overview', query: AlexaSkillQuery = {}) {
  const owner = await prisma.user.findUnique({
    where: { email: config.alexaOwnerEmail.trim().toLowerCase() },
    select: { id: true, email: true, isActive: true, status: true }
  });
  if (!owner?.isActive || owner.status !== 'ACTIVE') throw new Error('ALEXA_OWNER_NOT_ACTIVE');
  const context = await resolveWorkspaceContext(owner.id);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
  const state = saved?.state as { transactions?: LegacyTransaction[] } | null;
  return { owner: owner.email, ...buildAlexaFinancialPanorama(state?.transactions || [], referenceDate, intent, query) };
}

export function buildAlexaAnnouncement(transactions: LegacyTransaction[], referenceDate = new Date(), includeTomorrow = true) {
  const local = saoPauloParts(referenceDate);
  const grouped = groupItems(transactions, local.date, monthKey(local.iso));
  const due = grouped.filter((item) => item.daysUntilDue === 0 || (includeTomorrow && item.daysUntilDue === 1));
  if (!due.length) return null;
  const today = due.filter((item) => item.daysUntilDue === 0);
  const tomorrow = due.filter((item) => item.daysUntilDue === 1);
  const total = due.reduce((sum, item) => sum + item.value, 0);
  const describe = (items: DigestItem[]) => items.map((item) => `${item.label}, ${money(item.value)}`).join('; ');
  const sentences = ['Atenção. Alerta MEG Finanças.'];
  if (today.length) sentences.push(`Vencem hoje: ${describe(today)}.`);
  if (tomorrow.length) sentences.push(`Vencem amanhã: ${describe(tomorrow)}.`);
  sentences.push(`O total destes compromissos é ${money(total)}. Contas já pagas foram desconsideradas.`);
  return { text: sentences.join(' '), items: due, totalAmount: total, totalCount: due.length };
}

export function alexaAutomationSlot(referenceDate = new Date(), requestedSlot?: string) {
  const local = saoPauloParts(referenceDate);
  const weekend = local.weekday === 0 || local.weekday === 6;
  const slot = requestedSlot || `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;
  const allowed = weekend ? ['12:00'] : ['06:20', '18:00', '21:00'];
  if (!allowed.includes(slot)) return null;
  return { ...local, slot, includeTomorrow: !weekend };
}

async function invokeAlexaWebhook(text: string) {
  const template = config.alexaAnnouncementWebhookUrl;
  if (!template) return { status: 'skipped', detail: 'Webhook da Alexa não configurado' };
  const usesTemplate = template.includes('{text}');
  const response = await fetchWithTimeout(usesTemplate ? template.replaceAll('{text}', encodeURIComponent(text)) : template, usesTemplate
    ? { method: 'GET' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }, 30_000);
  if (!response.ok) throw new Error(`Webhook da Alexa recusado (${response.status}): ${await response.text()}`);
  return { status: 'sent', detail: await response.text() };
}

export async function deliverAlexaAnnouncement(userId: string, referenceDate = new Date(), slot = 'manual', includeTomorrow = true, force = false) {
  const context = await resolveWorkspaceContext(userId);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
  const state = saved?.state as { transactions?: LegacyTransaction[] } | null;
  const announcement = buildAlexaAnnouncement(state?.transactions || [], referenceDate, includeTomorrow);
  if (!announcement) return { status: 'skipped', reason: 'Nenhum vencimento para anunciar.' };
  const local = saoPauloParts(referenceDate);
  const reference = `${local.iso}:${slot}:alexa`;
  const channel = 'alexa:owner';
  const existing = await prisma.notificationDelivery.findUnique({ where: { userId_channel_reference: { userId, channel, reference } } });
  if (existing && !force) return { status: 'already-sent', announcement };
  const result = await invokeAlexaWebhook(announcement.text);
  if (result.status === 'sent') await prisma.notificationDelivery.upsert({
    where: { userId_channel_reference: { userId, channel, reference } },
    create: { userId, channel, reference, status: result.status, detail: result.detail },
    update: { status: result.status, detail: result.detail, deliveredAt: new Date() }
  });
  return { ...result, announcement };
}

export async function deliverAlexaNextDuePreview(userId: string, referenceDate = new Date(), force = false) {
  const context = await resolveWorkspaceContext(userId);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
  const state = saved?.state as { transactions?: LegacyTransaction[] } | null;
  const panorama = buildAlexaFinancialPanorama(state?.transactions || [], referenceDate, 'next-due');
  if (!panorama.data.nextDueDate) {
    return { status: 'skipped', reason: 'Nenhum próximo vencimento cadastrado.' };
  }

  const local = saoPauloParts(referenceDate);
  const reference = `${local.iso}:preview-next:alexa`;
  const channel = 'alexa:owner';
  const existing = await prisma.notificationDelivery.findUnique({
    where: { userId_channel_reference: { userId, channel, reference } }
  });
  if (existing && !force) return { status: 'already-sent', panorama };

  const announcement = { text: `Prévia da próxima notificação do MEG. ${panorama.speech}` };
  const result = await invokeAlexaWebhook(announcement.text);
  if (result.status === 'sent') await prisma.notificationDelivery.upsert({
    where: { userId_channel_reference: { userId, channel, reference } },
    create: { userId, channel, reference, status: result.status, detail: result.detail },
    update: { status: result.status, detail: result.detail, deliveredAt: new Date() }
  });
  return { ...result, announcement, panorama };
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
  const emailHtml = buildNotificationEmailHtml(digest);
  const [phones, emails, owner] = await Promise.all([
    prisma.notificationRecipient.findMany({ where: { userId, isActive: true, ...(recipientIds.length ? { id: { in: recipientIds } } : {}) }, orderBy: { name: 'asc' } }),
    notificationConfig?.emailEnabled === false ? Promise.resolve([]) : prisma.notificationEmailRecipient.findMany({ where: { userId, isActive: true, ...(emailRecipientIds.length ? { id: { in: emailRecipientIds } } : {}) }, orderBy: { name: 'asc' } }),
    prisma.user.findUnique({ where: { id: context.workspace.ownerId }, select: { name: true, email: true, phone: true } })
  ]);
  const ownerFallbackPhone = owner?.phone || (owner?.email === config.adminEmail.trim().toLowerCase() ? config.whatsappRecipient : null);
  const whatsappTargets = phones.length ? phones : ownerFallbackPhone ? [{ id: 'workspace-owner', name: owner?.name || 'Responsável', phone: ownerFallbackPhone }] : [];
  const emailTargets = notificationConfig?.emailEnabled === false ? [] : emails.length ? emails : owner?.email ? [{ id: 'workspace-owner', name: owner.name, email: owner.email }] : [];
  const channels = [
    ...emailTargets.map((recipient) => ({ channel: `email:${recipient.id}`, label: `${recipient.name} (${recipient.email})`, send: () => sendEmail(recipient.email, subject, digest.text, notificationConfig ?? undefined, emailHtml) })),
    ...whatsappTargets.map((recipient) => ({ channel: `whatsapp:${recipient.id}`, label: `${recipient.name} (${recipient.phone})`, send: () => sendWhatsApp(recipient.phone, digest.text) }))
  ];
  const deliveries = [];
  const reference = `${local.iso}:${slot}:${mode}`;
  for (const item of channels) {
    const existing = await prisma.notificationDelivery.findUnique({ where: { userId_channel_reference: { userId, channel: item.channel, reference } } });
    if (existing?.status === 'sent' && !force) { deliveries.push({ channel: item.channel, recipient: item.label, status: 'already-sent' }); continue; }
    try {
      const result = await item.send();
      await prisma.notificationDelivery.upsert({
        where: { userId_channel_reference: { userId, channel: item.channel, reference } },
        create: { userId, channel: item.channel, reference, status: result.status, detail: result.detail },
        update: { status: result.status, detail: result.detail, deliveredAt: new Date() }
      });
      deliveries.push({ channel: item.channel, recipient: item.label, ...result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Falha desconhecida';
      await prisma.notificationDelivery.upsert({
        where: { userId_channel_reference: { userId, channel: item.channel, reference } },
        create: { userId, channel: item.channel, reference, status: 'failed', detail },
        update: { status: 'failed', detail, deliveredAt: new Date() }
      });
      deliveries.push({ channel: item.channel, recipient: item.label, status: 'failed', detail });
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
