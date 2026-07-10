import { prisma } from '@meg/database';
import { createFinancialEventSchema, updateFinancialEventSchema } from './schemas';
import type { z } from 'zod';

type CreateFinancialEventInput = z.infer<typeof createFinancialEventSchema>;
type UpdateFinancialEventInput = z.infer<typeof updateFinancialEventSchema>;

function signedAmount(type: string, amount: number) {
  return type === 'income' || type === 'redemption' ? Math.abs(amount) : -Math.abs(amount);
}

function competenceFromDate(date: string) {
  return date.slice(0, 7);
}

function isPosted(status: string) {
  return status === 'paid' || status === 'reconciled' || status === 'confirmed';
}

async function syncLedger(eventId: string) {
  await prisma.$transaction(async (tx) => {
    const event = await tx.financialEvent.findUnique({ where: { id: eventId } });
    if (!event) return;

    await tx.ledgerEntry.deleteMany({ where: { eventId } });
    if (!event.accountId || !isPosted(event.status) || event.archivedAt) return;

    const value = Number(event.amount);
    await tx.ledgerEntry.create({
      data: {
        eventId: event.id,
        date: event.date,
        accountId: event.accountId,
        debit: Number(event.signedAmount) >= 0 ? value : 0,
        credit: Number(event.signedAmount) < 0 ? value : 0,
        memo: event.description
      }
    });
  });
}

export async function listFinancialEvents(userId: string, input: { page: number; pageSize: number; search?: string }) {
  const where = {
    userId,
    archivedAt: null,
    ...(input.search ? {
      OR: [
        { description: { contains: input.search, mode: 'insensitive' as const } },
        { account: { name: { contains: input.search, mode: 'insensitive' as const } } },
        { category: { name: { contains: input.search, mode: 'insensitive' as const } } },
        { paymentMethod: { name: { contains: input.search, mode: 'insensitive' as const } } }
      ]
    } : {})
  };
  const [items, total] = await prisma.$transaction([
    prisma.financialEvent.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { account: true, category: true, paymentMethod: true }
    }),
    prisma.financialEvent.count({ where })
  ]);
  return { items, total, page: input.page, pageSize: input.pageSize };
}

export async function createFinancialEvent(userId: string, input: CreateFinancialEventInput) {
  const competence = input.competence || competenceFromDate(input.date);
  const value = Math.abs(input.amount);

  const event = await prisma.financialEvent.create({
    data: {
      userId,
      description: input.description.trim(),
      type: input.type,
      status: input.status,
      date: new Date(input.date),
      competence,
      amount: value,
      signedAmount: signedAmount(input.type, value),
      accountId: input.accountId,
      categoryId: input.categoryId,
      paymentMethodId: input.paymentMethodId,
      notes: input.notes?.trim() || undefined
    },
    include: { account: true, category: true, paymentMethod: true, ledgerEntries: true }
  });

  await syncLedger(event.id);
  return prisma.financialEvent.findUnique({
    where: { id: event.id },
    include: { account: true, category: true, paymentMethod: true, ledgerEntries: true }
  });
}

export async function updateFinancialEvent(userId: string, id: string, input: UpdateFinancialEventInput) {
  const current = await prisma.financialEvent.findFirst({ where: { id, userId, archivedAt: null } });
  if (!current) throw new Error('FINANCIAL_EVENT_NOT_FOUND');

  const nextType = input.type ?? current.type;
  const nextAmount = input.amount === undefined ? Number(current.amount) : Math.abs(input.amount);

  await prisma.financialEvent.update({
    where: { id },
    data: {
      ...input,
      description: input.description?.trim(),
      date: input.date ? new Date(input.date) : undefined,
      competence: input.competence || (input.date ? competenceFromDate(input.date) : undefined),
      amount: input.amount === undefined ? undefined : nextAmount,
      signedAmount: signedAmount(nextType, nextAmount),
      notes: input.notes?.trim()
    }
  });

  await syncLedger(id);
  return prisma.financialEvent.findUnique({
    where: { id },
    include: { account: true, category: true, paymentMethod: true, ledgerEntries: true }
  });
}

export async function deleteFinancialEvent(userId: string, id: string) {
  const current = await prisma.financialEvent.findFirst({ where: { id, userId, archivedAt: null } });
  if (!current) throw new Error('FINANCIAL_EVENT_NOT_FOUND');

  await prisma.financialEvent.update({
    where: { id },
    data: { status: 'archived', archivedAt: new Date() }
  });
  await prisma.ledgerEntry.deleteMany({ where: { eventId: id } });
  return { id, archived: true };
}
export async function getFinancialSummary(userId: string, month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const now = new Date();
  const postedStatuses = ['paid', 'reconciled', 'confirmed'];

  const [monthEvents, postedEvents, nextDue, pendingTotals] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      select: { type: true, status: true, amount: true, signedAmount: true, category: { select: { name: true } } }
    }),
    prisma.financialEvent.aggregate({
      where: { userId, archivedAt: null, status: { in: postedStatuses } },
      _sum: { signedAmount: true }
    }),
    prisma.financialEvent.findFirst({
      where: { userId, archivedAt: null, status: 'planned', date: { gte: now } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, description: true, date: true, amount: true, type: true }
    }),
    prisma.financialEvent.aggregate({
      where: { userId, archivedAt: null, status: 'planned' },
      _count: { _all: true },
      _sum: { amount: true }
    })
  ]);

  let income = 0;
  let expense = 0;
  let realizedIncome = 0;
  let realizedExpense = 0;
  const categoryTotals = new Map<string, number>();

  for (const event of monthEvents) {
    const amount = Number(event.amount);
    const posted = postedStatuses.includes(event.status);
    if (event.type === 'income' || event.type === 'redemption') {
      income += amount;
      if (posted) realizedIncome += amount;
    } else {
      expense += amount;
      if (posted) realizedExpense += amount;
      const category = event.category?.name || 'Sem categoria';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    }
  }

  const topCategories = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    month,
    availableBalance: Number(postedEvents._sum.signedAmount || 0),
    income,
    expense,
    projectedResult: income - expense,
    realizedIncome,
    realizedExpense,
    realizedResult: realizedIncome - realizedExpense,
    eventCount: monthEvents.length,
    pendingCount: pendingTotals._count._all,
    pendingAmount: Number(pendingTotals._sum.amount || 0),
    nextDue,
    topCategories
  };
}

export async function getFinancialCashflow(userId: string, month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const postedStatuses = ['paid', 'reconciled', 'confirmed'];

  const [opening, events] = await Promise.all([
    prisma.financialEvent.aggregate({
      where: { userId, archivedAt: null, date: { lt: start }, status: { in: postedStatuses } },
      _sum: { signedAmount: true }
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        date: true,
        description: true,
        status: true,
        type: true,
        amount: true,
        signedAmount: true,
        category: { select: { name: true } }
      }
    })
  ]);

  const openingBalance = Number(opening._sum.signedAmount || 0);
  let projectedBalance = openingBalance;
  let realizedBalance = openingBalance;
  const days = new Map<string, {
    date: string;
    income: number;
    expense: number;
    net: number;
    projectedBalance: number;
    realizedBalance: number;
    eventCount: number;
  }>();

  for (const event of events) {
    const date = event.date.toISOString().slice(0, 10);
    const signed = Number(event.signedAmount);
    const amount = Number(event.amount);
    projectedBalance += signed;
    if (postedStatuses.includes(event.status)) realizedBalance += signed;
    const day = days.get(date) || {
      date,
      income: 0,
      expense: 0,
      net: 0,
      projectedBalance,
      realizedBalance,
      eventCount: 0
    };
    if (signed >= 0) day.income += amount;
    else day.expense += amount;
    day.net += signed;
    day.projectedBalance = projectedBalance;
    day.realizedBalance = realizedBalance;
    day.eventCount += 1;
    days.set(date, day);
  }

  return {
    month,
    openingBalance,
    projectedClosing: projectedBalance,
    realizedClosing: realizedBalance,
    totalIncome: [...days.values()].reduce((sum, day) => sum + day.income, 0),
    totalExpense: [...days.values()].reduce((sum, day) => sum + day.expense, 0),
    days: [...days.values()]
  };
}
