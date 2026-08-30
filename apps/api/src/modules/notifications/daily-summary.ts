import { prisma } from '@meg/database';
import { config } from '../../config';
import { resolveWorkspaceContext } from '../workspaces/service';
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

export function buildDailyFinancialSummaryText(digest: Awaited<ReturnType<typeof notificationDigest>>, referenceDate = new Date()) {
  const local = localParts(referenceDate);
  const attention = digest.totalCount > 0
    ? `Há ${digest.totalCount} obrigação(ões) exigindo atenção, somando ${money(digest.totalAmount)}.`
    : 'Nenhuma conta exige pagamento imediato neste momento.';
  const lines = [
    'MEG FINANÇAS | RESUMO DIÁRIO',
    `Consulta: ${local.iso.split('-').reverse().join('/')} às ${local.time}`,
    '',
    attention,
    `Em aberto até o mês atual: ${money(digest.openAmount)} em ${digest.openCount} obrigação(ões).`,
    `Compromissos após este mês: ${money(digest.futureAmount)} em ${digest.futureCount} obrigação(ões).`,
  ];

  if (digest.items.length) {
    lines.push('', 'Prioridades de agora:');
    digest.items.slice(0, 6).forEach((item) => {
      lines.push(`${item.label}: ${money(item.value)} em ${item.dueDate.split('-').reverse().join('/')}.`);
    });
    if (digest.items.length > 6) lines.push(`Mais ${digest.items.length - 6} item(ns) no painel MEG.`);
  } else {
    lines.push('', 'Agenda financeira imediata sob controle. O MEG continuará acompanhando os próximos vencimentos.');
  }

  lines.push('', 'MEG Finanças, seu copiloto financeiro.');
  return lines.join('\n');
}

function buildDailyWhatsappText(digest: Awaited<ReturnType<typeof notificationDigest>>, referenceDate: Date) {
  const local = localParts(referenceDate);
  const lines = [
    '*MEG FINANÇAS | RESUMO DIÁRIO*',
    `📅 ${local.iso.split('-').reverse().join('/')} às ${local.time}`,
    '',
    digest.totalCount
      ? `⚠️ *Em atenção agora:* ${money(digest.totalAmount)} em ${digest.totalCount} obrigação(ões)`
      : '✅ *Nenhuma conta exige pagamento imediato agora*',
    `📌 *Em aberto até o mês atual:* ${money(digest.openAmount)}`,
    `🔭 *Compromissos futuros:* ${money(digest.futureAmount)} em ${digest.futureCount} obrigação(ões)`,
  ];
  if (digest.items.length) {
    lines.push('', '*Prioridades:*');
    digest.items.slice(0, 6).forEach((item) => lines.push(`• ${item.label} · ${money(item.value)} · ${item.dueDate.split('-').reverse().join('/')}`));
  }
  lines.push('', '_MEG Finanças, seu copiloto financeiro_');
  return lines.join('\n');
}

type DailySummaryOptions = {
  force?: boolean;
  referenceDate?: Date;
  slot?: string;
};

export async function deliverDailyFinancialSummary(userId: string, options: DailySummaryOptions = {}) {
  const referenceDate = options.referenceDate || new Date();
  const digest = await notificationDigest(userId, referenceDate, 'upcoming');
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

  const text = buildDailyFinancialSummaryText(digest, referenceDate);
  const whatsappText = buildDailyWhatsappText(digest, referenceDate);
  const subject = digest.totalCount
    ? `MEG Finanças: resumo diário, ${digest.totalCount} obrigação(ões) em atenção`
    : `MEG Finanças: resumo diário, agenda imediata sob controle`;
  const local = localParts(referenceDate);
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
