import { Prisma, prisma } from '@meg/database';

type Tx = Prisma.TransactionClient;

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function parseIsoDay(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const maximum = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= maximum ? { year, month, day } : null;
}

export function saoPauloDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

export function isFutureFinancialDay(value: string, today = saoPauloDay()) {
  const day = value.slice(0, 10);
  return Boolean(parseIsoDay(day) && day > today);
}

export function isBenefitPaymentMethod(name: unknown) {
  return normalizeText(name) === 'VEROCARD';
}

export function isMonetaryAccountType(type: unknown) {
  return ['CHECKING', 'SAVINGS', 'CASH'].includes(normalizeText(type));
}

export function isBenefitFinancialEvent(event: {
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return normalizeText(event.account?.type) === 'BENEFIT'
    || isBenefitPaymentMethod(event.paymentMethod?.name)
    || normalizeText(event.description).includes('VEROCARD');
}

export function isPostedFinancialStatus(status: string) {
  return status === 'paid' || status === 'reconciled' || status === 'confirmed';
}

export function isMonetaryFinancialEvent(event: {
  type: string;
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return event.type !== 'transfer' && !isBenefitFinancialEvent(event);
}

export function countsTowardMonetaryBalance(event: {
  type: string;
  status: string;
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return isMonetaryFinancialEvent(event) && isPostedFinancialStatus(event.status);
}

export function summarizeMonetaryEvents(events: Array<{
  type: string;
  status: string;
  signedAmount: number | string | { toString(): string };
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}>) {
  let income = 0;
  let expense = 0;
  let realizedIncome = 0;
  let realizedExpense = 0;
  let eventCount = 0;

  for (const event of events) {
    if (!isMonetaryFinancialEvent(event)) continue;
    const signed = Number(event.signedAmount);
    if (!Number.isFinite(signed)) continue;
    eventCount += 1;
    const incomeLike = event.type === 'income' || event.type === 'redemption';
    if (incomeLike) income += signed;
    else expense += -signed;
    if (!isPostedFinancialStatus(event.status)) continue;
    if (incomeLike) realizedIncome += signed;
    else realizedExpense += -signed;
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    income: round(income),
    expense: round(expense),
    projectedResult: round(income - expense),
    realizedIncome: round(realizedIncome),
    realizedExpense: round(realizedExpense),
    realizedResult: round(realizedIncome - realizedExpense),
    eventCount,
  };
}

export function paymentBalanceDecision(available: number, requested: number) {
  const availableCents = Math.round(Number(available || 0) * 100);
  const requestedCents = Math.round(Number(requested || 0) * 100);
  return {
    allowed: requestedCents <= availableCents,
    available: availableCents / 100,
    requested: requestedCents / 100,
    missing: Math.max(0, requestedCents - availableCents) / 100,
  };
}

function nextDayExclusive(day: string) {
  const parsed = parseIsoDay(day);
  if (!parsed) throw new Error('INVALID_FINANCIAL_DATE');
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1));
}

export async function monetaryOpeningBalance(tx: Tx, userId: string) {
  const accounts = await tx.account.findMany({
    where: { userId },
    select: { type: true, openingBalance: true },
  });
  const balance = accounts
    .filter((account) => isMonetaryAccountType(account.type))
    .reduce((sum, account) => sum + Number(account.openingBalance), 0);
  return Math.round(balance * 100) / 100;
}

export async function monetaryBalanceAt(tx: Tx, userId: string, effectiveAt: string) {
  const cutoff = nextDayExclusive(effectiveAt.slice(0, 10));
  const [openingBalance, events] = await Promise.all([
    monetaryOpeningBalance(tx, userId),
    tx.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: cutoff } },
      select: {
        description: true,
        type: true,
        status: true,
        signedAmount: true,
        account: { select: { type: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
  ]);
  const balance = events
    .filter(countsTowardMonetaryBalance)
    .reduce((sum, event) => sum + Number(event.signedAmount), openingBalance);
  return Math.round(balance * 100) / 100;
}

function retryableTransaction(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2034');
}

export async function serializableFinancialTransaction<T>(work: (tx: Tx) => Promise<T>) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!retryableTransaction(error) || attempt === 3) throw error;
    }
  }
  throw new Error('SERIALIZABLE_TRANSACTION_RETRY_EXHAUSTED');
}
