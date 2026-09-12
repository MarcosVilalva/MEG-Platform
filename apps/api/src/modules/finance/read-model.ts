import { prisma } from '@meg/database';
import {
  countsTowardMonetaryBalance,
  isMonetaryFinancialEvent,
  summarizeMonetaryEvents,
} from './monetary-protection';

function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export async function getCanonicalFinancialSummary(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const now = new Date();
  const [monthEvents, historicalEvents, futureCandidates] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      select: {
        id: true,
        description: true,
        type: true,
        status: true,
        date: true,
        amount: true,
        signedAmount: true,
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: start } },
      select: {
        description: true,
        type: true,
        status: true,
        signedAmount: true,
        paymentMethod: { select: { name: true } },
      },
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, status: 'planned', date: { gte: now } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      take: 100,
      select: {
        id: true,
        description: true,
        type: true,
        status: true,
        date: true,
        amount: true,
        signedAmount: true,
        paymentMethod: { select: { name: true } },
      },
    }),
  ]);

  const summary = summarizeMonetaryEvents(monthEvents);
  const availableBalance = round(historicalEvents
    .filter(countsTowardMonetaryBalance)
    .reduce((sum, event) => sum + Number(event.signedAmount), 0));
  const pendingEvents = monthEvents.filter((event) =>
    event.status === 'planned'
    && isMonetaryFinancialEvent(event)
    && event.type !== 'income'
    && event.type !== 'redemption');
  const nextDue = futureCandidates.find((event) =>
    isMonetaryFinancialEvent(event)
    && event.type !== 'income'
    && event.type !== 'redemption') || null;

  const categoryTotals = new Map<string, number>();
  for (const event of monthEvents) {
    if (!isMonetaryFinancialEvent(event) || event.type === 'income' || event.type === 'redemption') continue;
    const category = event.category?.name || 'Sem categoria';
    categoryTotals.set(category, (categoryTotals.get(category) || 0) - Number(event.signedAmount));
  }
  const topCategories = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount: round(amount) }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5);

  return {
    month,
    availableBalance,
    income: summary.income,
    expense: summary.expense,
    projectedResult: summary.projectedResult,
    realizedIncome: summary.realizedIncome,
    realizedExpense: summary.realizedExpense,
    realizedResult: summary.realizedResult,
    eventCount: summary.eventCount,
    pendingCount: pendingEvents.length,
    pendingAmount: round(pendingEvents.reduce((sum, event) => sum - Number(event.signedAmount), 0)),
    nextDue: nextDue ? {
      id: nextDue.id,
      description: nextDue.description,
      date: nextDue.date,
      amount: nextDue.amount,
      type: nextDue.type,
    } : null,
    topCategories,
  };
}

export async function getCanonicalFinancialCashflow(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const [openingEvents, rawEvents] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: start } },
      select: {
        description: true,
        type: true,
        status: true,
        signedAmount: true,
        paymentMethod: { select: { name: true } },
      },
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
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
  ]);

  const events = rawEvents.filter(isMonetaryFinancialEvent);
  const openingBalance = round(openingEvents
    .filter(countsTowardMonetaryBalance)
    .reduce((sum, event) => sum + Number(event.signedAmount), 0));
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
    const incomeLike = event.type === 'income' || event.type === 'redemption';
    projectedBalance += signed;
    if (countsTowardMonetaryBalance(event)) realizedBalance += signed;
    const day = days.get(date) || {
      date,
      income: 0,
      expense: 0,
      net: 0,
      projectedBalance: 0,
      realizedBalance: 0,
      eventCount: 0,
    };
    if (incomeLike) day.income += signed;
    else day.expense += -signed;
    day.net += signed;
    day.projectedBalance = projectedBalance;
    day.realizedBalance = realizedBalance;
    day.eventCount += 1;
    days.set(date, day);
  }

  const normalizedDays = [...days.values()].map((day) => ({
    ...day,
    income: round(day.income),
    expense: round(day.expense),
    net: round(day.net),
    projectedBalance: round(day.projectedBalance),
    realizedBalance: round(day.realizedBalance),
  }));

  return {
    month,
    openingBalance,
    projectedClosing: round(projectedBalance),
    realizedClosing: round(realizedBalance),
    totalIncome: round(normalizedDays.reduce((sum, day) => sum + day.income, 0)),
    totalExpense: round(normalizedDays.reduce((sum, day) => sum + day.expense, 0)),
    days: normalizedDays,
  };
}
