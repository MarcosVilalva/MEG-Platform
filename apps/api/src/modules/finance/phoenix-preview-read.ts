import { prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';

function normalizeText(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

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

function isPosted(status: string) {
  return status === 'paid' || status === 'reconciled' || status === 'confirmed';
}

function isMonetaryAccountType(type: unknown) {
  return ['CHECKING', 'SAVINGS', 'CASH'].includes(normalizeText(type));
}

function isBenefitEvent(event: {
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return normalizeText(event.account?.type) === 'BENEFIT'
    || normalizeText(event.paymentMethod?.name) === 'VEROCARD'
    || normalizeText(event.description).includes('VEROCARD');
}

function isMonetaryEvent(event: {
  type: string;
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return event.type !== 'transfer' && !isBenefitEvent(event);
}

function countsTowardBalance(event: {
  type: string;
  status: string;
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return isMonetaryEvent(event) && isPosted(event.status);
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
    observations: read('OBSERVACOES'),
  };
}

async function openingMonetaryBalance(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { type: true, openingBalance: true },
  });
  return round(accounts
    .filter((account) => isMonetaryAccountType(account.type))
    .reduce((sum, account) => sum + Number(account.openingBalance), 0));
}

async function canonicalSummary(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const now = new Date();
  const [monthEvents, historicalEvents, futureCandidates, openingBalance] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      select: {
        id: true, description: true, type: true, status: true, date: true, amount: true, signedAmount: true,
        account: { select: { type: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: start } },
      select: { description: true, type: true, status: true, signedAmount: true, account: { select: { type: true } }, paymentMethod: { select: { name: true } } },
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, status: 'planned', date: { gte: now } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      take: 100,
      select: { id: true, description: true, type: true, status: true, date: true, amount: true, signedAmount: true, account: { select: { type: true } }, paymentMethod: { select: { name: true } } },
    }),
    openingMonetaryBalance(userId),
  ]);

  let income = 0;
  let expense = 0;
  let realizedIncome = 0;
  let realizedExpense = 0;
  let eventCount = 0;
  const categoryTotals = new Map<string, number>();

  for (const event of monthEvents) {
    if (!isMonetaryEvent(event)) continue;
    const signed = Number(event.signedAmount);
    if (!Number.isFinite(signed)) continue;
    eventCount += 1;
    const incomeLike = event.type === 'income' || event.type === 'redemption';
    if (incomeLike) income += signed;
    else {
      expense += -signed;
      const category = event.category?.name || 'Sem categoria';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) - signed);
    }
    if (!isPosted(event.status)) continue;
    if (incomeLike) realizedIncome += signed;
    else realizedExpense += -signed;
  }

  const availableBalance = round(historicalEvents
    .filter(countsTowardBalance)
    .reduce((sum, event) => sum + Number(event.signedAmount), openingBalance));
  const pendingEvents = monthEvents.filter((event) => event.status === 'planned' && isMonetaryEvent(event) && event.type !== 'income' && event.type !== 'redemption');
  const nextDue = futureCandidates.find((event) => isMonetaryEvent(event) && event.type !== 'income' && event.type !== 'redemption') || null;
  const topCategories = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount: round(amount) }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5);

  income = round(income);
  expense = round(expense);
  realizedIncome = round(realizedIncome);
  realizedExpense = round(realizedExpense);
  return {
    month,
    availableBalance,
    income,
    expense,
    projectedResult: round(income - expense),
    realizedIncome,
    realizedExpense,
    realizedResult: round(realizedIncome - realizedExpense),
    eventCount,
    pendingCount: pendingEvents.length,
    pendingAmount: round(pendingEvents.reduce((sum, event) => sum - Number(event.signedAmount), 0)),
    nextDue: nextDue ? { id: nextDue.id, description: nextDue.description, date: nextDue.date, amount: nextDue.amount, type: nextDue.type } : null,
    topCategories,
  };
}

async function canonicalCashflow(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const [openingEvents, rawEvents, accountOpeningBalance] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: start } },
      select: { description: true, type: true, status: true, signedAmount: true, account: { select: { type: true } }, paymentMethod: { select: { name: true } } },
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, date: true, description: true, status: true, type: true, amount: true, signedAmount: true, account: { select: { type: true } }, category: { select: { name: true } }, paymentMethod: { select: { name: true } } },
    }),
    openingMonetaryBalance(userId),
  ]);

  const events = rawEvents.filter(isMonetaryEvent);
  const openingBalance = round(openingEvents.filter(countsTowardBalance).reduce((sum, event) => sum + Number(event.signedAmount), accountOpeningBalance));
  let projectedBalance = openingBalance;
  let realizedBalance = openingBalance;
  const days = new Map<string, { date: string; income: number; expense: number; net: number; projectedBalance: number; realizedBalance: number; eventCount: number }>();

  for (const event of events) {
    const date = event.date.toISOString().slice(0, 10);
    const signed = Number(event.signedAmount);
    const incomeLike = event.type === 'income' || event.type === 'redemption';
    projectedBalance += signed;
    if (countsTowardBalance(event)) realizedBalance += signed;
    const day = days.get(date) || { date, income: 0, expense: 0, net: 0, projectedBalance: 0, realizedBalance: 0, eventCount: 0 };
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
    income: round(day.income), expense: round(day.expense), net: round(day.net),
    projectedBalance: round(day.projectedBalance), realizedBalance: round(day.realizedBalance),
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

async function canonicalAnalytics(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const previousDate = new Date(Date.UTC(year, monthNumber - 2, 1));
  const previousMonth = previousDate.toISOString().slice(0, 7);
  const trendStart = new Date(Date.UTC(year, monthNumber - 12, 1));
  const [current, previous, rawEvents, rawTrendEvents] = await Promise.all([
    canonicalSummary(userId, month),
    canonicalSummary(userId, previousMonth),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      select: { description: true, type: true, status: true, signedAmount: true, date: true, account: { select: { type: true } }, category: { select: { name: true, group: true } }, paymentMethod: { select: { name: true } } },
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: trendStart, lt: end } },
      select: { description: true, date: true, type: true, status: true, signedAmount: true, account: { select: { type: true } }, paymentMethod: { select: { name: true } } },
    }),
  ]);

  const events = rawEvents.filter(isMonetaryEvent);
  const trendEvents = rawTrendEvents.filter(isMonetaryEvent);
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
  const categories = [...categoryTotals.entries()].map(([name, amount]) => ({ name, amount: round(amount) })).sort((left, right) => right.amount - left.amount);
  const totalCategoryExpense = categories.reduce((sum, item) => sum + item.amount, 0);
  return {
    month,
    summary: current,
    previous: { month: previousMonth, income: previous.income, expense: previous.expense, result: previous.projectedResult },
    delta: { income: round(current.income - previous.income), expense: round(current.expense - previous.expense), result: round(current.projectedResult - previous.projectedResult) },
    dailyAverageExpense: expenseDays.size ? round(current.expense / expenseDays.size) : 0,
    concentrationTop3: totalCategoryExpense > 0 ? round(categories.slice(0, 3).reduce((sum, item) => sum + item.amount, 0) / totalCategoryExpense * 100) : 0,
    categories: categories.slice(0, 10),
    monthlyTrend: [...trend.values()],
    paymentMethods: [...paymentTotals.entries()].map(([name, amount]) => ({ name, amount: round(amount) })).sort((left, right) => right.amount - left.amount).slice(0, 6),
  };
}

async function benefitSummary(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const [accounts, allEvents, monthEvents] = await Promise.all([
    prisma.account.findMany({ where: { userId, type: 'benefit' }, select: { openingBalance: true } }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: end } },
      select: { description: true, type: true, status: true, signedAmount: true, account: { select: { type: true } }, paymentMethod: { select: { name: true } } },
    }),
    prisma.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { gte: start, lt: end } },
      select: { description: true, type: true, status: true, signedAmount: true, account: { select: { type: true } }, paymentMethod: { select: { name: true } } },
    }),
  ]);
  const openingBalance = accounts.reduce((sum, account) => sum + Number(account.openingBalance || 0), 0);
  const realized = allEvents.filter((event) => isBenefitEvent(event) && isPosted(event.status));
  const realizedMonth = monthEvents.filter((event) => isBenefitEvent(event) && isPosted(event.status));
  return {
    month,
    balance: round(realized.reduce((sum, event) => sum + Number(event.signedAmount), openingBalance)),
    credits: round(realizedMonth.reduce((sum, event) => sum + Math.max(0, Number(event.signedAmount)), 0)),
    used: round(realizedMonth.reduce((sum, event) => sum + Math.max(0, -Number(event.signedAmount)), 0)),
  };
}

async function monthlyEvents(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const items = await prisma.financialEvent.findMany({
    where: { userId, archivedAt: null, date: { gte: start, lt: end } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { account: true, category: true, paymentMethod: true, importedRow: { select: { rowNumber: true, rawData: true } } },
  });
  const mapped = items.map((item) => ({
    ...item,
    sourceRowNumber: item.importedRow?.rowNumber ?? null,
    sourceDetails: sourceDetails(item.importedRow?.rawData),
    importedRow: undefined,
  }));
  return { items: mapped, total: mapped.length, page: 1, pageSize: mapped.length };
}

type LegacyCard = {
  paymentMethod?: unknown; issuer?: unknown; productName?: unknown; brand?: unknown; lastFour?: unknown;
  theme?: unknown; closingDay?: unknown; dueDay?: unknown; limit?: unknown; isActive?: unknown;
};
type LegacyTransaction = Record<string, unknown>;
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function numberValue(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function key(value: unknown) { return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
function legacyState(value: unknown) {
  const state = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const catalogs = state.catalogs && typeof state.catalogs === 'object' ? state.catalogs as Record<string, unknown> : {};
  return {
    cards: Array.isArray(catalogs.cards) ? catalogs.cards as LegacyCard[] : [],
    transactions: Array.isArray(state.transactions) ? state.transactions as LegacyTransaction[] : [],
  };
}

async function cardsReadOnly(userId: string, month: string) {
  const context = await resolveWorkspaceContext(userId);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { state: true } });
  const legacy = legacyState(saved?.state);
  const cards = await prisma.creditCard.findMany({
    where: { userId: context.workspace.ownerId, isActive: true },
    orderBy: { createdAt: 'asc' },
    include: { purchases: { where: { status: 'active' }, include: { entries: true, category: true }, orderBy: { purchaseDate: 'desc' } } },
  });
  return cards.map((card) => {
    const entries = card.purchases.flatMap((purchase) => purchase.entries);
    const aliases = new Set([key(card.name), ...legacy.cards.filter((item) => key(item.productName) === key(card.name) || key(item.paymentMethod) === key(card.name)).map((item) => key(item.paymentMethod))]);
    const legacyPurchases = legacy.transactions.filter((item) => {
      const method = key(item.paymentMethod || item.account);
      const modality = key(item.modality);
      return aliases.has(method) && key(item.type) === 'EXPENSE' && (!modality || modality === 'CREDITO');
    }).map((item) => {
      const amount = Math.abs(numberValue(item.expenseAmount || item.amount || item.signedAmount));
      const purchaseDate = text(item.purchaseDate || item.date);
      const status = key(item.status || item.situation);
      return {
        id: `legacy-${text(item.id)}`,
        description: text(item.description) || 'Compra no cartão',
        totalAmount: amount,
        purchaseDate,
        installments: numberValue(item.installments || item.installmentQty) || 1,
        status: 'legacy',
        category: null,
        entries: [] as Array<never>,
        legacyOpen: !['PAID', 'PAGO', 'RECEIVED', 'RECEBIDO', 'RECONCILED', 'CONCILIADO'].includes(status),
      };
    });
    const legacyOpen = legacyPurchases.filter((item) => item.legacyOpen);
    const usedLimit = entries.filter((entry) => entry.status === 'open').reduce((sum, entry) => sum + Number(entry.amount), 0) + legacyOpen.reduce((sum, item) => sum + item.totalAmount, 0);
    const payableStatementAmount = entries.filter((entry) => entry.statementMonth === month && entry.status === 'open').reduce((sum, entry) => sum + Number(entry.amount), 0);
    const statementAmount = payableStatementAmount + legacyOpen.filter((item) => item.purchaseDate.startsWith(month)).reduce((sum, item) => sum + item.totalAmount, 0);
    const periodLegacy = legacyPurchases.filter((item) => item.purchaseDate.startsWith(month));
    return {
      ...card,
      purchases: [...card.purchases, ...periodLegacy].sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate))),
      usedLimit,
      availableLimit: Number(card.creditLimit) - usedLimit,
      statementAmount,
      payableStatementAmount,
    };
  });
}

async function payablesReadOnly(userId: string, month: string) {
  const { start, end } = monthRange(month);
  return prisma.payable.findMany({
    where: { userId, dueDate: { gte: start, lt: end }, status: { not: 'cancelled' } },
    orderBy: { dueDate: 'asc' },
    include: { category: true, payments: { orderBy: { paidAt: 'desc' } } },
  });
}

const FINANCIAL_ENTITIES = ['FinancialEvent', 'FinancialTransfer', 'Payable', 'RecurringExpense', 'CreditCard', 'CardPurchase', 'Receivable', 'Receipt'];
function parseAuditMetadata(value: string | null) {
  if (!value) return { schemaVersion: 1, before: null, after: null, context: {} };
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      schemaVersion: Number(parsed.schemaVersion || 1), before: parsed.before ?? null, after: parsed.after ?? null,
      context: parsed.context && typeof parsed.context === 'object' ? parsed.context : {},
    };
  } catch {
    return { schemaVersion: 0, before: null, after: null, context: { legacyMetadata: value } };
  }
}

async function financialAuditReadOnly(userId: string) {
  const workspace = await resolveWorkspaceContext(userId);
  const members = await prisma.workspaceMember.findMany({ where: { workspaceId: workspace.workspaceId }, select: { userId: true } });
  const memberIds = members.map((item) => item.userId);
  const where = { userId: { in: memberIds }, entity: { in: FINANCIAL_ENTITIES } };
  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, take: 100, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    items: items.map((item) => ({ id: item.id, at: item.createdAt, actor: item.user, entity: item.entity, entityId: item.entityId, action: item.action, ...parseAuditMetadata(item.metadata) })),
    total,
    page: 1,
    pageSize: 100,
  };
}

export async function getPhoenixPreviewReadModel(userId: string, month: string) {
  const [summaryBase, benefit, analytics, cashflow, accounts, categories, paymentMethods, events, cards, payables, financialAudit] = await Promise.all([
    canonicalSummary(userId, month),
    benefitSummary(userId, month),
    canonicalAnalytics(userId, month),
    canonicalCashflow(userId, month),
    prisma.account.findMany({ where: { userId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }),
    prisma.category.findMany({ where: { userId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }),
    prisma.paymentMethod.findMany({ where: { userId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }),
    monthlyEvents(userId, month),
    cardsReadOnly(userId, month),
    payablesReadOnly(userId, month),
    financialAuditReadOnly(userId),
  ]);
  return {
    month,
    summary: { ...summaryBase, benefitBalance: benefit.balance, benefitCredits: benefit.credits, benefitUsed: benefit.used },
    analytics,
    cashflow,
    accounts,
    categories,
    paymentMethods,
    events,
    cards,
    payables,
    financialAudit,
    sourcePolicy: {
      mode: 'read-only',
      mutationFree: true,
      events: 'financial-event-month',
      cards: 'cards-read-with-legacy-compatibility-no-migration',
      payables: 'payables-read-no-materialization',
      catalogs: 'user-scoped',
    },
  };
}
