import { Prisma, prisma } from '@meg/database';
import {
  countsTowardMonetaryBalance,
  isMonetaryAccountType,
  isPostedFinancialStatus,
} from './financial-policy';

export {
  countsTowardMonetaryBalance,
  isBenefitFinancialEvent,
  isBenefitPaymentMethod,
  isMonetaryAccountType,
  isMonetaryFinancialEvent,
  isPostedFinancialStatus,
  paymentBalanceDecision,
  summarizeMonetaryEvents,
} from './financial-policy';

type Tx = Prisma.TransactionClient;

type SerializableFinancialTransactionOptions = {
  maxWaitMs?: number;
  timeoutMs?: number;
};

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

export async function monetaryAccountBalanceAt(
  tx: Tx,
  userId: string,
  account: { id: string; openingBalance: Prisma.Decimal | number | string },
  effectiveAt: string,
) {
  const cutoff = nextDayExclusive(effectiveAt.slice(0, 10));
  const events = await tx.financialEvent.findMany({
    where: {
      userId,
      accountId: account.id,
      archivedAt: null,
      date: { lt: cutoff },
      status: { in: ['paid', 'reconciled', 'confirmed'] },
    },
    select: { signedAmount: true, status: true },
  });
  const balance = events
    .filter((event) => isPostedFinancialStatus(event.status))
    .reduce((sum, event) => sum + Number(event.signedAmount), Number(account.openingBalance));
  return Math.round(balance * 100) / 100;
}

export async function monetaryBalanceAt(tx: Tx, userId: string, effectiveAt: string) {
  const cutoff = nextDayExclusive(effectiveAt.slice(0, 10));
  const [openingBalance, events] = await Promise.all([
    monetaryOpeningBalance(tx, userId),
    tx.financialEvent.findMany({
      where: {
        userId,
        archivedAt: null,
        date: { lt: cutoff },
        status: { in: ['paid', 'reconciled', 'confirmed'] },
        type: { not: 'transfer' },
      },
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

export const SEMANTIC_DUPLICATE_WINDOW_MS = 10 * 60_000;

export type SemanticDuplicateDetails = {
  entity: 'financial-event' | 'card-purchase';
  id: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  type?: string;
  status?: string;
  accountName?: string | null;
  categoryName?: string | null;
  paymentMethodName?: string | null;
  cardName?: string | null;
  installments?: number;
};

function duplicateDescription(value: unknown) {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function duplicateDayRange(day: string) {
  const parsed = parseIsoDay(day.slice(0, 10));
  if (!parsed) throw new Error('INVALID_FINANCIAL_DATE');
  const start = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const end = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1));
  return { start, end };
}

function duplicateWindowStart(now = new Date()) {
  return new Date(now.getTime() - SEMANTIC_DUPLICATE_WINDOW_MS);
}

export async function findRecentFinancialEventDuplicate(tx: Tx, input: {
  workspaceId: string;
  userId: string;
  description: string;
  type: string;
  status: string;
  date: string;
  amount: number;
  signedAmount: number;
  accountId?: string | null;
  categoryId?: string | null;
  paymentMethodId?: string | null;
}) {
  const { start, end } = duplicateDayRange(input.date);
  const candidates = await tx.financialEvent.findMany({
    where: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      archivedAt: null,
      type: input.type,
      status: input.status,
      date: { gte: start, lt: end },
      amount: Math.abs(input.amount),
      signedAmount: input.signedAmount,
      accountId: input.accountId || null,
      categoryId: input.categoryId || null,
      paymentMethodId: input.paymentMethodId || null,
      createdAt: { gte: duplicateWindowStart() },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      account: { select: { name: true } },
      category: { select: { name: true } },
      paymentMethod: { select: { name: true } },
    },
  });
  const normalized = duplicateDescription(input.description);
  const duplicate = candidates.find((candidate) => duplicateDescription(candidate.description) === normalized);
  if (!duplicate) return null;
  return {
    entity: 'financial-event' as const,
    id: duplicate.id,
    description: duplicate.description,
    amount: Number(duplicate.amount),
    date: duplicate.date.toISOString().slice(0, 10),
    createdAt: duplicate.createdAt.toISOString(),
    type: duplicate.type,
    status: duplicate.status,
    accountName: duplicate.account?.name || null,
    categoryName: duplicate.category?.name || null,
    paymentMethodName: duplicate.paymentMethod?.name || null,
  } satisfies SemanticDuplicateDetails;
}

export async function findRecentCardPurchaseDuplicate(tx: Tx, input: {
  userId: string;
  cardId: string;
  categoryId?: string | null;
  description: string;
  totalAmount: number;
  purchaseDate: string;
  installments: number;
}) {
  const { start, end } = duplicateDayRange(input.purchaseDate);
  const candidates = await tx.cardPurchase.findMany({
    where: {
      userId: input.userId,
      cardId: input.cardId,
      categoryId: input.categoryId || null,
      status: 'active',
      totalAmount: input.totalAmount,
      purchaseDate: { gte: start, lt: end },
      installments: input.installments,
      createdAt: { gte: duplicateWindowStart() },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      card: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
  const normalized = duplicateDescription(input.description);
  const duplicate = candidates.find((candidate) => duplicateDescription(candidate.description) === normalized);
  if (!duplicate) return null;
  return {
    entity: 'card-purchase' as const,
    id: duplicate.id,
    description: duplicate.description,
    amount: Number(duplicate.totalAmount),
    date: duplicate.purchaseDate.toISOString().slice(0, 10),
    createdAt: duplicate.createdAt.toISOString(),
    categoryName: duplicate.category?.name || null,
    cardName: duplicate.card?.name || null,
    installments: duplicate.installments,
  } satisfies SemanticDuplicateDetails;
}

function retryableTransaction(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2034');
}

export async function serializableFinancialTransaction<T>(
  work: (tx: Tx) => Promise<T>,
  options: SerializableFinancialTransactionOptions = {},
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: options.maxWaitMs ?? 10_000,
        timeout: options.timeoutMs ?? 30_000,
      });
    } catch (error) {
      if (!retryableTransaction(error) || attempt === 3) throw error;
    }
  }
  throw new Error('SERIALIZABLE_TRANSACTION_RETRY_EXHAUSTED');
}
