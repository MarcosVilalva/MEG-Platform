import { prisma } from '@meg/database';
import { config } from '../../config';
import { resolveWorkspaceContext } from '../workspaces/service';
import { getPhoenixPreviewSnapshot } from '../finance/phoenix-preview-snapshot';
import { alexaFinancialPanorama, notificationDigest, sendSystemEmail, sendSystemWhatsApp } from './service';

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function localParts(referenceDate: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(referenceDate);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return {
    iso: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function compactDateTag(iso: string) {
  const [, month, day] = iso.split('-').map(Number);
  return `${String(day).padStart(2, '0')} ${MONTHS_SHORT[Math.max(0, Math.min(11, month - 1))]}`;
}

function shortDueDate(iso: string) {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function commitmentLabel(count: number) {
  return count === 1 ? '1 compromisso' : `${count} compromissos`;
}

function whatsappStatus(digest: Awaited<ReturnType<typeof notificationDigest>>) {
  if (digest.maximumPriority.length || digest.overdue.length) {
    return {
      headline: '🔴 *AÇÃO NECESSÁRIA*',
      detail: `${money(digest.totalAmount)} em ${commitmentLabel(digest.totalCount)} exigem atenção agora.`
    };
  }
  if (digest.totalCount) {
    return {
      headline: '🟡 *MÊS EM ATENÇÃO*',
      detail: `${money(digest.totalAmount)} em ${commitmentLabel(digest.totalCount)} estão no radar imediato.`
    };
  }
  return {
    headline: '🟢 *MÊS SOB CONTROLE*',
    detail: 'Nenhum pagamento exige ação imediata neste momento.'
  };
}

type DailyDigest = Awaited<ReturnType<typeof notificationDigest>>;
type DailyFinancialStatus = {
  currentMonetaryBalance: number | null;
  benefitBalance: number | null;
};

function statusMoney(value: number | null) {
  return value === null ? '_Indisponível nesta leitura_' : `*${money(value)}*`;
}

function nextDueLine(digest: DailyDigest) {
  if (!digest.nextDueDate) return '_Nenhum vencimento futuro cadastrado._';
  const items = digest.nextDueItems || [];
  const label = items.length === 1
    ? items[0].label
    : items.length > 1
      ? `${items.length} compromissos`
      : 'Compromisso financeiro';
  return `*${shortDueDate(digest.nextDueDate)}* · ${label} · *${money(digest.nextDueTotal)}*`;
}

function summarizeNextMonth(digest: DailyDigest) {
  const cardMap = new Map<string, { payment: string; value: number; entries: number; dueDates: string[] }>();
  const others = digest.nextMonthItems.filter((item) => !item.isCard);

  digest.nextMonthItems.filter((item) => item.isCard).forEach((item) => {
    const current = cardMap.get(item.payment);
    if (current) {
      current.value += item.value;
      current.entries += item.entries;
      if (!current.dueDates.includes(item.dueDate)) current.dueDates.push(item.dueDate);
      current.dueDates.sort();
    } else {
      cardMap.set(item.payment, {
        payment: item.payment,
        value: item.value,
        entries: item.entries,
        dueDates: [item.dueDate],
      });
    }
  });

  const cards = [...cardMap.values()].sort((a, b) => a.dueDates[0].localeCompare(b.dueDates[0]) || b.value - a.value);
  const cardsTotal = cards.reduce((sum, item) => sum + item.value, 0);
  const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
  return { cards, others, count: cards.length + others.length, cardsTotal, othersTotal };
}

function dueDatesLabel(values: string[]) {
  return values.map(shortDueDate).join(values.length === 2 ? ' e ' : ', ');
}

function nextMonthWhatsappLines(digest: DailyDigest) {
  const summary = summarizeNextMonth(digest);
  const monthName = digest.nextMonthLabel.replace(/\s+\d{4}$/u, '');
  const lines = [
    '═════════════',
    `*PRÓXIMO MÊS · ${digest.nextMonthLabel}*`,
    '',
    '💰 *Previsão total*',
    `*${money(digest.nextMonthAmount)}*`
  ];
  if (!summary.count) {
    lines.push('', '_Nenhum compromisso previsto até o momento._');
    return lines;
  }

  const cards = summary.cards;
  const others = summary.others;
  if (cards.length) {
    lines.push('', '💳 *FATURAS DE CARTÃO*', `\`Subtotal • ${money(summary.cardsTotal)}\``, '');
    cards.forEach((item) => {
      lines.push(`• ${item.payment} — *${money(item.value)}* — *${dueDatesLabel(item.dueDates)}*`);
    });
  }
  if (others.length) {
    lines.push('', '📋 *CONTAS E COMPROMISSOS*', `\`Subtotal • ${money(summary.othersTotal)}\``, '');
    others.forEach((item) => lines.push(`*${shortDueDate(item.dueDate)}* · ${item.label} — *${money(item.value)}*`));
  }
  lines.push('', '═════════════', `💰 *TOTAL PREVISTO PARA ${monthName}*`, `*${money(digest.nextMonthAmount)}*`);
  return lines;
}

export function buildDailyFinancialSummaryText(
  digest: Awaited<ReturnType<typeof notificationDigest>>,
  referenceDate = new Date(),
  financialStatus: DailyFinancialStatus = { currentMonetaryBalance: null, benefitBalance: null }
) {
  const local = localParts(referenceDate);
  const attention = digest.totalCount > 0
    ? `Há ${commitmentLabel(digest.totalCount)} exigindo atenção, somando ${money(digest.totalAmount)}.`
    : 'Nenhuma conta exige pagamento imediato neste momento.';
  const nextMonth = summarizeNextMonth(digest);
  const lines = [
    'MEG FINANÇAS | RESUMO DIÁRIO',
    `Consulta: ${local.iso.split('-').reverse().join('/')} às ${local.time}`,
    '',
    attention,
    `Saldo monetário atual: ${financialStatus.currentMonetaryBalance === null ? 'indisponível nesta leitura' : money(financialStatus.currentMonetaryBalance)}.`,
    `Saldo do Benefício Alimentação: ${financialStatus.benefitBalance === null ? 'indisponível nesta leitura' : money(financialStatus.benefitBalance)}.`,
    `Em aberto até o mês atual: ${money(digest.openAmount)} em ${commitmentLabel(digest.openCount)}.`,
    digest.nextDueDate
      ? `Próximo vencimento: ${shortDueDate(digest.nextDueDate)} — ${digest.nextDueItems.length === 1 ? digest.nextDueItems[0].label : `${digest.nextDueItems.length} compromissos`} — ${money(digest.nextDueTotal)}.`
      : 'Próximo vencimento: nenhum.',
    '',
    `${digest.nextMonthLabel} | PRÓXIMO MÊS`,
    nextMonth.count
      ? `Previsto: ${money(digest.nextMonthAmount)} em ${commitmentLabel(nextMonth.count)}.`
      : 'Nenhum compromisso previsto até o momento.'
  ];

  if (digest.items.length) {
    lines.push('', 'Prioridades de agora:');
    digest.items.slice(0, 6).forEach((item) => {
      lines.push(`${item.label}: ${money(item.value)} em ${item.dueDate.split('-').reverse().join('/')}.`);
    });
  }

  if (nextMonth.count) {
    lines.push('', 'Próximo mês — cartões e compromissos:');
    lines.push(`Cartões: ${money(nextMonth.cardsTotal)}.`);
    nextMonth.cards.forEach((item) => {
      lines.push(`FATURA ${item.payment}: ${money(item.value)} em ${dueDatesLabel(item.dueDates)}.`);
    });
    lines.push(`Demais débitos: ${money(nextMonth.othersTotal)}.`);
    nextMonth.others.forEach((item) => {
      lines.push(`${item.label}: ${money(item.value)} em ${shortDueDate(item.dueDate)}.`);
    });
    lines.push(`TOTAL DO MÊS: ${money(digest.nextMonthAmount)}.`);
  }

  lines.push('', 'MEG Finanças, seu copiloto financeiro.');
  return lines.join('\n');
}

export function buildDailyWhatsappText(
  digest: Awaited<ReturnType<typeof notificationDigest>>,
  referenceDate: Date,
  financialStatus: DailyFinancialStatus = { currentMonetaryBalance: null, benefitBalance: null }
) {
  const local = localParts(referenceDate);
  const status = whatsappStatus(digest);
  const lines = [
    '*✦ MEG FINANÇAS*',
    `\`VISÃO FINANCEIRA • ${compactDateTag(local.iso)} • ${local.time}\``,
    '',
    status.headline,
    status.detail,
    '',
    '💵 *Saldo monetário atual*',
    statusMoney(financialStatus.currentMonetaryBalance),
    '',
    '🍽️ *Benefício Alimentação*',
    statusMoney(financialStatus.benefitBalance),
    '',
    '📌 *Em aberto*',
    `*${money(digest.openAmount)}*`,
    '',
    '⏳ *Próximo vencimento*',
    nextDueLine(digest)
  ];

  if (digest.items.length) {
    lines.push('', '⚡ *PRIORIDADES DE AGORA*');
    digest.items.slice(0, 4).forEach((item) => {
      lines.push(`• *${shortDueDate(item.dueDate)}* · ${item.label} — *${money(item.value)}*`);
    });
    if (digest.items.length > 4) lines.push(`↳ + ${commitmentLabel(digest.items.length - 4)} no MEG`);
  }

  lines.push('', ...nextMonthWhatsappLines(digest), '', '_MEG • inteligência para cuidar das suas finanças_');
  return lines.join('\n');
}

type DailySummaryOptions = {
  force?: boolean;
  referenceDate?: Date;
  slot?: string;
};

export async function deliverDailyFinancialSummary(userId: string, options: DailySummaryOptions = {}) {
  const referenceDate = options.referenceDate || new Date();
  const local = localParts(referenceDate);
  const currentMonth = local.iso.slice(0, 7);
  const [digest, snapshot] = await Promise.all([
    notificationDigest(userId, referenceDate, 'upcoming'),
    getPhoenixPreviewSnapshot(userId, currentMonth).catch(() => null),
  ]);
  const financialStatus: DailyFinancialStatus = snapshot
    ? {
        currentMonetaryBalance: Number(snapshot.summary.availableBalance || 0) + Number(snapshot.summary.realizedResult || 0),
        benefitBalance: Number(snapshot.summary.benefitBalance || 0),
      }
    : { currentMonetaryBalance: null, benefitBalance: null };
  const context = await resolveWorkspaceContext(userId);
  const notificationConfig = await prisma.workspaceNotificationConfig.findUnique({ where: { workspaceId: context.workspaceId } });
  const [phones, emails, owner] = await Promise.all([
    prisma.notificationRecipient.findMany({ where: { userId, isActive: true }, orderBy: { name: 'asc' } }),
    notificationConfig?.emailEnabled === false
      ? Promise.resolve([])
      : prisma.notificationEmailRecipient.findMany({ where: { userId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.user.findUnique({ where: { id: context.workspace.ownerId }, select: { name: true, email: true, phone: true } }),
  ]);

  const ownerFallbackPhone = owner?.phone || (owner?.email === config.adminEmail.trim().toLowerCase() ? config.whatsappRecipient : null);
  const whatsappTargets = phones.length
    ? phones
    : ownerFallbackPhone ? [{ id: 'workspace-owner', name: owner?.name || 'Responsável', phone: ownerFallbackPhone }] : [];
  const emailTargets = notificationConfig?.emailEnabled === false
    ? []
    : emails.length ? emails : owner?.email ? [{ id: 'workspace-owner', name: owner.name || 'Responsável', email: owner.email }] : [];

  const text = buildDailyFinancialSummaryText(digest, referenceDate, financialStatus);
  const whatsappText = buildDailyWhatsappText(digest, referenceDate, financialStatus);
  const subject = digest.totalCount
    ? `MEG Finanças · ${commitmentLabel(digest.totalCount)} em atenção`
    : 'MEG Finanças · resumo diário · tudo sob controle';
  const reference = `${local.iso}:${options.slot || '06:00'}:daily-summary`;
  const channels = [
    ...emailTargets.map((recipient) => ({
      channel: `email:${recipient.id}`,
      recipient: `${recipient.name} (${recipient.email})`,
      send: () => sendSystemEmail(recipient.email, subject, text),
    })),
    ...whatsappTargets.map((recipient) => ({
      channel: `whatsapp:${recipient.id}`,
      recipient: `${recipient.name} (${recipient.phone})`,
      send: () => sendSystemWhatsApp(recipient.phone, whatsappText),
    })),
  ];

  const deliveries = [];
  for (const item of channels) {
    const existing = await prisma.notificationDelivery.findUnique({
      where: { userId_channel_reference: { userId, channel: item.channel, reference } },
    });
    if (existing?.status === 'sent' && !options.force) {
      deliveries.push({ channel: item.channel, recipient: item.recipient, status: 'already-sent' });
      continue;
    }
    try {
      const result = await item.send();
      await prisma.notificationDelivery.upsert({
        where: { userId_channel_reference: { userId, channel: item.channel, reference } },
        create: { userId, channel: item.channel, reference, status: result.status, detail: result.detail },
        update: { status: result.status, detail: result.detail, deliveredAt: new Date() },
      });
      deliveries.push({ channel: item.channel, recipient: item.recipient, ...result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Falha desconhecida';
      await prisma.notificationDelivery.upsert({
        where: { userId_channel_reference: { userId, channel: item.channel, reference } },
        create: { userId, channel: item.channel, reference, status: 'failed', detail },
        update: { status: 'failed', detail, deliveredAt: new Date() },
      });
      deliveries.push({ channel: item.channel, recipient: item.recipient, status: 'failed', detail });
    }
  }

  return { digest, deliveries, message: 'Resumo financeiro diário processado.' };
}

async function invokeAlexaWebhook(text: string) {
  const template = config.alexaAnnouncementWebhookUrl;
  if (!template) return { status: 'skipped', detail: 'Webhook da Alexa não configurado' };
  const usesTemplate = template.includes('{text}');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(usesTemplate ? template.replaceAll('{text}', encodeURIComponent(text)) : template, usesTemplate
      ? { method: 'GET', signal: controller.signal }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: controller.signal });
    if (!response.ok) throw new Error(`Webhook da Alexa recusado (${response.status}): ${await response.text()}`);
    return { status: 'sent', detail: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

export async function deliverAlexaDailyBriefing(referenceDate = new Date(), slot = '06:20', force = false) {
  const panorama = await alexaFinancialPanorama(referenceDate, 'overview');
  const owner = await prisma.user.findUnique({
    where: { email: config.alexaOwnerEmail.trim().toLowerCase() },
    select: { id: true, email: true },
  });
  if (!owner) return { status: 'skipped', reason: 'Proprietário da Alexa não encontrado.' };
  const local = localParts(referenceDate);
  const reference = `${local.iso}:${slot}:alexa-daily-briefing`;
  const channel = 'alexa:owner';
  const existing = await prisma.notificationDelivery.findUnique({
    where: { userId_channel_reference: { userId: owner.id, channel, reference } },
  });
  if (existing?.status === 'sent' && !force) return { status: 'already-sent', panorama };

  const text = `Bom dia. Este é o resumo diário do MEG Finanças. ${panorama.speech} Você pode abrir meu controle financeiro e perguntar pelos detalhes.`;
  const result = await invokeAlexaWebhook(text);
  if (result.status === 'sent') {
    await prisma.notificationDelivery.upsert({
      where: { userId_channel_reference: { userId: owner.id, channel, reference } },
      create: { userId: owner.id, channel, reference, status: result.status, detail: result.detail },
      update: { status: result.status, detail: result.detail, deliveredAt: new Date() },
    });
  }
  return { ...result, panorama, announcement: { text } };
}
