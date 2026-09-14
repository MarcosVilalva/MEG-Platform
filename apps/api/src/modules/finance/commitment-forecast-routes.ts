import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '@meg/database';
import { z } from 'zod';
import { resolveWorkspaceContext } from '../workspaces/service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const querySchema = z.object({
  from: monthSchema.optional(),
  months: z.coerce.number().int().min(3).max(18).default(12),
});

const postedStatuses = new Set(['paid', 'reconciled', 'confirmed']);
const closedReceivableStatuses = new Set(['paid', 'cancelled']);
const closedPayableStatuses = new Set(['paid', 'cancelled']);

type LegacyRecord = Record<string, unknown>;
type ForecastRisk = 'normal' | 'attention' | 'high';
type CardBreakdown = { cardId: string; name: string; amount: number; installments: number };
type ForecastMonth = {
  month: string;
  cardCommitments: number;
  payables: number;
  recurringProjected: number;
  plannedExpenses: number;
  receivables: number;
  plannedIncome: number;
  totalExpenses: number;
  totalIncome: number;
  net: number;
  projectedBalance: number;
  commitmentPercent: number | null;
  risk: ForecastRisk;
  cardInstallments: number;
  payableCount: number;
  recurringCount: number;
  plannedExpenseCount: number;
  receivableCount: number;
  plannedIncomeCount: number;
  cards: CardBreakdown[];
};

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function monthStart(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

function monthDay(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return new Date(Date.UTC(year, monthNumber - 1, safeDay, 12));
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function addRecurringPeriod(date: Date, frequency: string) {
  const next = new Date(date);
  if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
  else if (frequency === 'yearly') next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function eventIsNonMonetary(event: {
  description: string;
  account?: { type: string } | null;
  paymentMethod?: { name: string; type: string | null } | null;
}) {
  const accountType = normalize(event.account?.type);
  const methodType = normalize(event.paymentMethod?.type);
  const methodName = normalize(event.paymentMethod?.name);
  const description = normalize(event.description);
  return accountType === 'BENEFIT'
    || methodName === 'VEROCARD'
    || description.includes('VEROCARD')
    || methodType === 'CREDIT';
}

function legacyState(value: unknown) {
  const state = value && typeof value === 'object' && !Array.isArray(value) ? value as LegacyRecord : {};
  const catalogs = state.catalogs && typeof state.catalogs === 'object' && !Array.isArray(state.catalogs)
    ? state.catalogs as LegacyRecord
    : {};
  return {
    cards: Array.isArray(catalogs.cards) ? catalogs.cards as LegacyRecord[] : [],
    transactions: Array.isArray(state.transactions) ? state.transactions as LegacyRecord[] : [],
  };
}

function legacyCardReserve(input: {
  state: unknown;
  cards: Array<{ id: string; name: string }>;
}) {
  const legacy = legacyState(input.state);
  const aliasesByCard = new Map<string, Set<string>>();
  for (const card of input.cards) aliasesByCard.set(card.id, new Set([normalize(card.name)]));

  for (const legacyCard of legacy.cards) {
    const product = normalize(legacyCard.productName);
    const method = normalize(legacyCard.paymentMethod);
    if (!product && !method) continue;
    const match = input.cards.find((card) => {
      const name = normalize(card.name);
      return name === product || name === method;
    });
    if (!match) continue;
    const aliases = aliasesByCard.get(match.id) || new Set<string>();
    if (product) aliases.add(product);
    if (method) aliases.add(method);
    aliasesByCard.set(match.id, aliases);
  }

  let amount = 0;
  let count = 0;
  const seen = new Set<string>();
  for (const transaction of legacy.transactions) {
    const id = text(transaction.id) || JSON.stringify(transaction);
    if (seen.has(id)) continue;
    if (normalize(transaction.type) !== 'EXPENSE') continue;
    const modality = normalize(transaction.modality);
    if (modality && modality !== 'CREDITO' && modality !== 'CREDIT') continue;
    const status = normalize(transaction.status || transaction.situation);
    if (['PAID', 'PAGO', 'RECEIVED', 'RECEBIDO', 'RECONCILED', 'CONCILIADO'].includes(status)) continue;
    const method = normalize(transaction.paymentMethod || transaction.account);
    const belongsToCard = [...aliasesByCard.values()].some((aliases) => aliases.has(method));
    if (!belongsToCard) continue;
    const value = Math.abs(number(transaction.expenseAmount || transaction.amount || transaction.signedAmount));
    if (value <= 0) continue;
    seen.add(id);
    amount += value;
    count += 1;
  }
  return { amount: round(amount), count };
}

function riskFor(totalExpenses: number, totalIncome: number, projectedBalance: number): ForecastRisk {
  if (projectedBalance < 0) return 'high';
  if (totalIncome > 0 && totalExpenses / totalIncome >= 1) return 'high';
  if (totalIncome > 0 && totalExpenses / totalIncome >= 0.8) return 'attention';
  if (totalExpenses > totalIncome && totalExpenses > 0) return 'attention';
  return 'normal';
}

export async function financeCommitmentForecastRoutes(app: FastifyInstance) {
  app.get('/commitment-forecast', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());

    const from = parsed.data.from || currentMonth();
    const months = parsed.data.months;
    const monthList = Array.from({ length: months }, (_, index) => addMonths(from, index));
    const monthSet = new Set(monthList);
    const start = monthStart(from);
    const horizonEnd = monthStart(addMonths(from, months));
    const now = new Date();

    const workspace = await resolveWorkspaceContext(request.user.sub);
    const ownerId = workspace.workspace.ownerId;
    const ownerWhere = {
      OR: [
        { workspaceId: workspace.workspaceId },
        { userId: ownerId },
      ],
    };

    const [cards, payables, recurringExpenses, receivables, financialEvents, realizedEvents, appState] = await Promise.all([
      prisma.creditCard.findMany({
        where: { userId: ownerId, isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          purchases: {
            where: { status: 'active' },
            include: { entries: { where: { status: 'open' } } },
          },
        },
      }),
      prisma.payable.findMany({
        where: {
          userId: ownerId,
          openAmount: { gt: 0 },
          dueDate: { lt: horizonEnd },
          status: { notIn: [...closedPayableStatuses] },
        },
        select: { id: true, description: true, openAmount: true, dueDate: true, status: true },
      }),
      prisma.recurringExpense.findMany({
        where: { userId: ownerId, isActive: true, nextDueDate: { lt: horizonEnd } },
        select: { id: true, description: true, amount: true, frequency: true, nextDueDate: true, endDate: true },
      }),
      prisma.receivable.findMany({
        where: {
          userId: ownerId,
          openAmount: { gt: 0 },
          dueDate: { lt: horizonEnd },
          status: { notIn: [...closedReceivableStatuses] },
        },
        select: { id: true, description: true, openAmount: true, dueDate: true, status: true },
      }),
      prisma.financialEvent.findMany({
        where: {
          ...ownerWhere,
          archivedAt: null,
          date: { lt: horizonEnd },
          type: { in: ['income', 'expense'] },
          status: { notIn: ['paid', 'reconciled', 'archived'] },
        },
        select: {
          id: true,
          description: true,
          type: true,
          status: true,
          date: true,
          amount: true,
          signedAmount: true,
          account: { select: { type: true } },
          paymentMethod: { select: { name: true, type: true } },
        },
      }),
      prisma.financialEvent.findMany({
        where: { ...ownerWhere, archivedAt: null, date: { lte: now } },
        select: {
          description: true,
          type: true,
          status: true,
          date: true,
          signedAmount: true,
          account: { select: { type: true } },
          paymentMethod: { select: { name: true, type: true } },
        },
      }),
      prisma.appState.findUnique({
        where: { workspaceId: workspace.workspaceId },
        select: { state: true },
      }),
    ]);

    const currentBalance = round(realizedEvents
      .filter((event) => !eventIsNonMonetary(event))
      .filter((event) => postedStatuses.has(event.status) || event.type === 'income' || event.type === 'redemption')
      .reduce((sum, event) => sum + Number(event.signedAmount), 0));

    const items = monthList.map<ForecastMonth>((month) => ({
      month,
      cardCommitments: 0,
      payables: 0,
      recurringProjected: 0,
      plannedExpenses: 0,
      receivables: 0,
      plannedIncome: 0,
      totalExpenses: 0,
      totalIncome: 0,
      net: 0,
      projectedBalance: currentBalance,
      commitmentPercent: null,
      risk: 'normal',
      cardInstallments: 0,
      payableCount: 0,
      recurringCount: 0,
      plannedExpenseCount: 0,
      receivableCount: 0,
      plannedIncomeCount: 0,
      cards: [],
    }));
    const byMonth = new Map(items.map((item) => [item.month, item]));
    const cardTotals = new Map<string, { cardId: string; name: string; amount: number; installments: number }>();
    let overdueOutflow = 0;
    let overdueIncome = 0;

    function targetMonth(date: Date) {
      const candidate = date < start ? from : monthKey(date);
      return monthSet.has(candidate) ? candidate : '';
    }

    for (const card of cards) {
      for (const purchase of card.purchases) {
        for (const entry of purchase.entries) {
          const dueMonth = card.dueDay <= card.closingDay ? addMonths(entry.statementMonth, 1) : entry.statementMonth;
          const dueDate = monthDay(dueMonth, card.dueDay);
          const month = targetMonth(dueDate);
          if (!month) continue;
          const bucket = byMonth.get(month);
          if (!bucket) continue;
          const amount = Number(entry.amount);
          bucket.cardCommitments = round(bucket.cardCommitments + amount);
          bucket.cardInstallments += 1;
          if (dueDate < start) overdueOutflow = round(overdueOutflow + amount);
          const current = bucket.cards.find((item) => item.cardId === card.id);
          if (current) {
            current.amount = round(current.amount + amount);
            current.installments += 1;
          } else {
            bucket.cards.push({ cardId: card.id, name: card.name, amount: round(amount), installments: 1 });
          }
          const total = cardTotals.get(card.id) || { cardId: card.id, name: card.name, amount: 0, installments: 0 };
          total.amount = round(total.amount + amount);
          total.installments += 1;
          cardTotals.set(card.id, total);
        }
      }
    }

    for (const payable of payables) {
      const month = targetMonth(payable.dueDate);
      if (!month) continue;
      const bucket = byMonth.get(month);
      if (!bucket) continue;
      const amount = Number(payable.openAmount);
      bucket.payables = round(bucket.payables + amount);
      bucket.payableCount += 1;
      if (payable.dueDate < start) overdueOutflow = round(overdueOutflow + amount);
    }

    for (const recurring of recurringExpenses) {
      let due = recurring.nextDueDate;
      let guard = 0;
      while (due < horizonEnd && (!recurring.endDate || due <= recurring.endDate) && guard < 200) {
        const month = targetMonth(due);
        if (month) {
          const bucket = byMonth.get(month);
          if (bucket) {
            const amount = Number(recurring.amount);
            bucket.recurringProjected = round(bucket.recurringProjected + amount);
            bucket.recurringCount += 1;
            if (due < start) overdueOutflow = round(overdueOutflow + amount);
          }
        }
        due = addRecurringPeriod(due, recurring.frequency);
        guard += 1;
      }
    }

    for (const receivable of receivables) {
      const month = targetMonth(receivable.dueDate);
      if (!month) continue;
      const bucket = byMonth.get(month);
      if (!bucket) continue;
      const amount = Number(receivable.openAmount);
      bucket.receivables = round(bucket.receivables + amount);
      bucket.receivableCount += 1;
      if (receivable.dueDate < start) overdueIncome = round(overdueIncome + amount);
    }

    for (const event of financialEvents) {
      if (eventIsNonMonetary(event)) continue;
      const month = targetMonth(event.date);
      if (!month) continue;
      const bucket = byMonth.get(month);
      if (!bucket) continue;
      const amount = Math.abs(Number(event.signedAmount)) || Number(event.amount);
      if (event.type === 'income') {
        bucket.plannedIncome = round(bucket.plannedIncome + amount);
        bucket.plannedIncomeCount += 1;
        if (event.date < start) overdueIncome = round(overdueIncome + amount);
      } else {
        bucket.plannedExpenses = round(bucket.plannedExpenses + amount);
        bucket.plannedExpenseCount += 1;
        if (event.date < start) overdueOutflow = round(overdueOutflow + amount);
      }
    }

    let projectedBalance = currentBalance;
    let minimumProjectedBalance = currentBalance;
    let minimumProjectedMonth: string | null = null;
    let firstNegativeMonth: string | null = null;
    for (const item of items) {
      item.cards.sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name, 'pt-BR'));
      item.totalExpenses = round(item.cardCommitments + item.payables + item.recurringProjected + item.plannedExpenses);
      item.totalIncome = round(item.receivables + item.plannedIncome);
      item.net = round(item.totalIncome - item.totalExpenses);
      projectedBalance = round(projectedBalance + item.net);
      item.projectedBalance = projectedBalance;
      item.commitmentPercent = item.totalIncome > 0 ? round((item.totalExpenses / item.totalIncome) * 100) : null;
      item.risk = riskFor(item.totalExpenses, item.totalIncome, projectedBalance);
      if (projectedBalance < minimumProjectedBalance) {
        minimumProjectedBalance = projectedBalance;
        minimumProjectedMonth = item.month;
      }
      if (!firstNegativeMonth && projectedBalance < 0) firstNegativeMonth = item.month;
    }

    const legacyReserve = legacyCardReserve({
      state: appState?.state,
      cards: cards.map((card) => ({ id: card.id, name: card.name })),
    });
    const totalExpenses = round(items.reduce((sum, item) => sum + item.totalExpenses, 0));
    const totalIncome = round(items.reduce((sum, item) => sum + item.totalIncome, 0));
    const topCards = [...cardTotals.values()]
      .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name, 'pt-BR'))
      .slice(0, 5);

    return {
      from,
      through: monthList[monthList.length - 1],
      months,
      generatedAt: new Date().toISOString(),
      currentBalance,
      items,
      summary: {
        totalExpenses,
        totalIncome,
        netForecast: round(totalIncome - totalExpenses),
        projectedClosing: projectedBalance,
        minimumProjectedBalance,
        minimumProjectedMonth,
        firstNegativeMonth,
        monthsAtRisk: items.filter((item) => item.risk !== 'normal').length,
        overdueOutflow,
        overdueIncome,
        cardCommitments: round(items.reduce((sum, item) => sum + item.cardCommitments, 0)),
        payables: round(items.reduce((sum, item) => sum + item.payables, 0)),
        recurringProjected: round(items.reduce((sum, item) => sum + item.recurringProjected, 0)),
        plannedExpenses: round(items.reduce((sum, item) => sum + item.plannedExpenses, 0)),
        receivables: round(items.reduce((sum, item) => sum + item.receivables, 0)),
        plannedIncome: round(items.reduce((sum, item) => sum + item.plannedIncome, 0)),
        unallocatedLegacyCardCommitment: legacyReserve.amount,
        unallocatedLegacyCardCount: legacyReserve.count,
        topCards,
      },
      methodology: {
        cards: 'Somente parcelas abertas normalizadas; o desembolso é posicionado no mês real de vencimento da fatura.',
        payables: 'Saldo aberto de contas a pagar, incluindo recorrências ainda não materializadas na base.',
        income: 'Contas a receber abertas e lançamentos de receita ainda previstos.',
        plannedExpenses: 'Lançamentos monetários de despesa ainda não pagos; crédito e benefício são excluídos para evitar dupla contagem.',
        overdue: 'Valores vencidos antes do início do horizonte são carregados para o primeiro mês e destacados separadamente.',
        legacyCards: 'Compras legadas sem calendário confiável ficam fora da distribuição mensal e aparecem como reserva não alocada.',
      },
    };
  });
}
