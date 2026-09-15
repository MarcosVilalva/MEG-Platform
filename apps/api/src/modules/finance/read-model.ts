import { prisma } from '@meg/database';
import {
  countsTowardMonetaryBalance,
  isMonetaryFinancialEvent,
  monetaryOpeningBalance,
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
  const [monthEvents, historicalEvents, futureCandidates, openingBalance] = await Promise.all([
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
        account: { select: { type: true } },
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
        account: { select: { type: true } },
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
        account: { select: { type: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
    monetaryOpeningBalance(prisma, userId),
  ]);

  const summary = summarizeMonetaryEvents(monthEvents);
  const availableBalance = round(historicalEvents
    .filter(countsTowardMonetaryBalance)
    .reduce((sum, event) => sum + Number(event.signedAmount), openingBalance));
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
  const [openingEvents, rawEvents, accountOpeningBalance] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: start } },
      select: {
        description: true,
        type: true,
        status: true,
        signedAmount: true,
        account: { select: { type: true } },
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
        account: { select: { type: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
    monetaryOpeningBalance(prisma, userId),
  ]);

  const events = rawEvents.filter(isMonetaryFinancialEvent);
  const openingBalance = round(openingEvents
    .filter(countsTowardMonetaryBalance)
    .reduce((sum, event) => sum + Number(event.signedAmount), accountOpeningBalance));
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

export async function getCanonicalFinancialAnalytics(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const previousDate = new Date(Date.UTC(year, monthNumber - 2, 1));
  const previousMonth = previousDate.toISOString().slice(0, 7);
  const trendStart = new Date(Date.UTC(year, monthNumber - 12, 1));

  const [current, previous, rawEvents, rawTrendEvents] = await Promise.all([
    getCanonicalFinancialSummary(userId, month),
    getCanonicalFinancialSummary(userId, previousMonth),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      select: {
        description: true,
        type: true,
        status: true,
        signedAmount: true,
        date: true,
        account: { select: { type: true } },
        category: { select: { name: true, group: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: trendStart, lt: end } },
      select: {
        description: true,
        date: true,
        type: true,
        status: true,
        signedAmount: true,
        account: { select: { type: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
  ]);

  const events = rawEvents.filter(isMonetaryFinancialEvent);
  const trendEvents = rawTrendEvents.filter(isMonetaryFinancialEvent);
  const paymentTotals = new Map<string, number>();
  const categoryTotals = new Map<string, number>();
  const expenseDays = new Set<string>();

  for (const event of events) {
    if (event.type === 'income' || event.type === 'redemption') continue;
    const amount = -Number(event.signedAmount);
    const method = event.paymentMethod?.name || 'Não informada';
    paymentTotals.set(method, (paymentTotals.get(method) || 0) + amount);
    const category = event.category?.group || event.category?.name || 'Sem categoria';
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    expenseDays.add(event.date.toISOString().slice(0, 10));
  }

  const trend = new Map<string, { month: string; income: number; expense: number; result: number }>();
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, monthNumber - 1 - offset, 1));
    const key = date.toISOString().slice(0, 7);
    trend.set(key, { month: key, income: 0, expense: 0, result: 0 });
  }
  for (const event of trendEvents) {
    const point = trend.get(event.date.toISOString().slice(0, 7));
    if (!point) continue;
    if (event.type === 'income' || event.type === 'redemption') point.income += Number(event.signedAmount);
    else point.expense -= Number(event.signedAmount);
    point.income = round(point.income);
    point.expense = round(point.expense);
    point.result = round(point.income - point.expense);
  }

  const categories = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount: round(amount) }))
    .sort((left, right) => right.amount - left.amount);
  const totalCategoryExpense = categories.reduce((sum, item) => sum + item.amount, 0);

  return {
    month,
    summary: current,
    previous: {
      month: previousMonth,
      income: previous.income,
      expense: previous.expense,
      result: previous.projectedResult,
    },
    delta: {
      income: round(current.income - previous.income),
      expense: round(current.expense - previous.expense),
      result: round(current.projectedResult - previous.projectedResult),
    },
    dailyAverageExpense: expenseDays.size ? round(current.expense / expenseDays.size) : 0,
    concentrationTop3: totalCategoryExpense > 0
      ? round(categories.slice(0, 3).reduce((sum, item) => sum + item.amount, 0) / totalCategoryExpense * 100)
      : 0,
    categories: categories.slice(0, 10),
    monthlyTrend: [...trend.values()],
    paymentMethods: [...paymentTotals.entries()]
      .map(([name, amount]) => ({ name, amount: round(amount) }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 6),
  };
}
