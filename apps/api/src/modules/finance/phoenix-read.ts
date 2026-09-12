import { prisma } from '@meg/database';
import { isBenefitFinancialEvent, isPostedFinancialStatus } from './monetary-protection';

function normalizeText(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function sourceDetails(rawData: unknown) {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null;
  const values = new Map(Object.entries(rawData as Record<string, unknown>).map(([key, value]) => [normalizeText(key).replace(/[^A-Z0-9]/g, ''), value]));
  const read = (key: string) => String(values.get(key) ?? '').trim();
  return {
    weekday: read('DIASEMANA'),
    launchType: read('TPLANCAMENTO'),
    expenseClass: read('CLASSIFICAODADESPESA'),
    group: read('GRUPO'),
    paymentMethod: read('FORMADEPAGAMENTO'),
    situation: read('SITUACAO'),
    modality: read('MODADLIDADE'),
    observations: read('OBSERVACOES')
  };
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1))
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export async function listPhoenixFinancialEventsForMonth(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const items = await prisma.financialEvent.findMany({
    where: { userId, archivedAt: null, date: { gte: start, lt: end } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      account: true,
      category: true,
      paymentMethod: true,
      importedRow: { select: { rowNumber: true, rawData: true } }
    }
  });

  const mapped = items.map((item) => ({
    ...item,
    sourceRowNumber: item.importedRow?.rowNumber ?? null,
    sourceDetails: sourceDetails(item.importedRow?.rawData),
    importedRow: undefined
  }));

  return { items: mapped, total: mapped.length, page: 1, pageSize: mapped.length };
}

export async function getPhoenixBenefitSummary(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const [accounts, allEvents, monthEvents] = await Promise.all([
    prisma.account.findMany({
      where: { userId, type: 'benefit' },
      select: { openingBalance: true }
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: end } },
      select: {
        description: true,
        type: true,
        status: true,
        signedAmount: true,
        account: { select: { type: true } },
        paymentMethod: { select: { name: true } }
      }
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      select: {
        description: true,
        type: true,
        status: true,
        signedAmount: true,
        account: { select: { type: true } },
        paymentMethod: { select: { name: true } }
      }
    })
  ]);

  const openingBalance = accounts.reduce((sum, account) => sum + Number(account.openingBalance || 0), 0);
  const realized = allEvents.filter((event) => isBenefitFinancialEvent(event) && isPostedFinancialStatus(event.status));
  const realizedMonth = monthEvents.filter((event) => isBenefitFinancialEvent(event) && isPostedFinancialStatus(event.status));
  const balance = realized.reduce((sum, event) => sum + Number(event.signedAmount), openingBalance);
  const credits = realizedMonth.reduce((sum, event) => sum + Math.max(0, Number(event.signedAmount)), 0);
  const used = realizedMonth.reduce((sum, event) => sum + Math.max(0, -Number(event.signedAmount)), 0);

  return {
    month,
    balance: round(balance),
    credits: round(credits),
    used: round(used)
  };
}
