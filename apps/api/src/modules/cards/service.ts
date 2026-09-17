import { prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { recordFinancialAudit } from '../finance/audit';
import { buildCanonicalCardStatement, legacyCardStatementEffect } from '../finance/card-statement-canonical';
import {
  isFutureFinancialDay,
  isMonetaryAccountType,
  monetaryBalanceAt,
  paymentBalanceDecision,
  serializableFinancialTransaction,
} from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';

type LegacyCard = {
  paymentMethod?: unknown;
  issuer?: unknown;
  productName?: unknown;
  brand?: unknown;
  lastFour?: unknown;
  theme?: unknown;
  closingDay?: unknown;
  dueDay?: unknown;
  limit?: unknown;
  isActive?: unknown;
};
type LegacyTransaction = Record<string, unknown>;

export class CardDomainError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function key(value: unknown) { return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
function legacyState(value: unknown) {
  const state = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const catalogs = state.catalogs && typeof state.catalogs === 'object' ? state.catalogs as Record<string, unknown> : {};
  return {
    cards: Array.isArray(catalogs.cards) ? catalogs.cards as LegacyCard[] : [],
    transactions: Array.isArray(state.transactions) ? state.transactions as LegacyTransaction[] : [],
  };
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

export async function sharedCardContext(userId: string) {
  const context = await resolveWorkspaceContext(userId);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { state: true } });
  return {
    workspaceId: context.workspaceId,
    ownerId: context.workspace.ownerId,
    legacy: legacyState(saved?.state),
  };
}

async function migrateLegacyCards(ownerId: string, cards: LegacyCard[]) {
  const current = await prisma.creditCard.findMany({ where: { userId: ownerId }, select: { name: true } });
  const existing = new Set(current.map((card) => key(card.name)));
  const valid = cards.filter((card) => card.isActive !== false && text(card.paymentMethod) && number(card.closingDay) >= 1 && number(card.dueDay) >= 1);
  let created = 0;
  for (const card of valid) {
    const name = text(card.productName) || text(card.paymentMethod);
    if (existing.has(key(name)) || existing.has(key(card.paymentMethod))) continue;
    await prisma.creditCard.create({ data: {
      userId: ownerId,
      name,
      issuer: text(card.issuer) || null,
      brand: text(card.brand) || null,
      lastFour: text(card.lastFour).replace(/\D/g, '').slice(-4) || null,
      creditLimit: Math.max(0, number(card.limit)),
      closingDay: Math.min(31, number(card.closingDay)),
      dueDay: Math.min(31, number(card.dueDay)),
      color: '#88796c',
    } });
    existing.add(key(name));
    created += 1;
  }
  return created;
}

export async function migrateLegacyCardsForAllWorkspaces() {
  const workspaces = await prisma.workspace.findMany({
    where: { isActive: true },
    select: { ownerId: true, appState: { select: { state: true } } },
  });
  let created = 0;
  for (const workspace of workspaces) {
    created += await migrateLegacyCards(workspace.ownerId, legacyState(workspace.appState?.state).cards);
  }
  return { scanned: workspaces.length, created };
}

function legacyPurchasesForCard(card: { name: string }, legacy: ReturnType<typeof legacyState>) {
  const aliases = new Set([
    key(card.name),
    ...legacy.cards
      .filter((item) => key(item.productName) === key(card.name) || key(item.paymentMethod) === key(card.name))
      .map((item) => key(item.paymentMethod)),
  ]);
  return legacy.transactions.filter((item) => {
    const method = key(item.paymentMethod || item.account);
    const modality = key(item.modality);
    return aliases.has(method) && key(item.type) === 'EXPENSE' && (!modality || modality === 'CREDITO');
  }).map((item) => {
    const amount = legacyCardStatementEffect(item);
    const purchaseDate = text(item.purchaseDate || item.date);
    const statementDate = text(item.date || item.purchaseDate);
    const status = key(item.status || item.situation);
    return {
      id: `legacy-${text(item.id)}`,
      description: text(item.description) || 'Compra no cartão',
      totalAmount: amount,
      purchaseDate,
      statementDate,
      installments: number(item.installments || item.installmentQty) || 1,
      status: 'legacy',
      category: null,
      entries: [] as Array<never>,
      legacyOpen: !['PAID', 'PAGO', 'RECEIVED', 'RECEBIDO', 'RECONCILED', 'CONCILIADO'].includes(status),
    };
  });
}

export async function listCards(userId: string, month: string) {
  const shared = await sharedCardContext(userId);
  const [year, monthNumber] = month.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 1));
  const [cards, events] = await Promise.all([
    prisma.creditCard.findMany({
      where: { userId: shared.ownerId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        purchases: {
          where: { status: 'active' },
          include: { entries: true, category: true },
          orderBy: { purchaseDate: 'desc' },
        },
      },
    }),
    prisma.financialEvent.findMany({
      where: {
        userId: shared.ownerId,
        archivedAt: null,
        date: { gte: monthStart, lt: monthEnd },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: { paymentMethod: true },
    }),
  ]);

  return cards.map((card) => {
    const aliases = new Set([
      key(card.name),
      ...shared.legacy.cards
        .filter((item) => key(item.productName) === key(card.name) || key(item.paymentMethod) === key(card.name))
        .flatMap((item) => [key(item.paymentMethod), key(item.productName)])
        .filter(Boolean),
    ]);
    const statement = buildCanonicalCardStatement({
      month,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      aliases,
      events,
      purchases: card.purchases,
    });

    const entries = card.purchases.flatMap((purchase) => purchase.entries);
    const legacyPurchases = legacyPurchasesForCard(card, shared.legacy);
    const legacyOpen = legacyPurchases.filter((item) => item.legacyOpen);
    const officialOpen = entries
      .filter((entry) => entry.status === 'open')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const officialStatementOpen = entries
      .filter((entry) => entry.status === 'open' && entry.statementMonth === month)
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const legacyOpenEffect = legacyOpen.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    const usedLimit = Math.max(0, officialOpen + legacyOpenEffect);
    const periodLegacy = legacyPurchases.filter((item) => item.statementDate.startsWith(month));

    return {
      ...card,
      purchases: [...card.purchases, ...periodLegacy].sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate))),
      usedLimit,
      availableLimit: Math.min(Number(card.creditLimit), Number(card.creditLimit) - usedLimit),
      statementAmount: statement.netAmount,
      payableStatementAmount: Math.max(0, officialStatementOpen),
      statementCreditBalance: statement.creditBalance,
      statement,
    };
  });
}

export async function createCardPurchaseProtected(userId: string, input: {
  cardId: string;
  categoryId?: string | null;
  description: string;
  totalAmount: number;
  purchaseDate: string;
  installments: number;
  operationId?: string;
}) {
  const shared = await sharedCardContext(userId);
  const requestHash = input.operationId ? mutationRequestHash({ ...input, operationId: undefined }) : null;

  return serializableFinancialTransaction(async (tx) => {
    if (input.operationId && requestHash) {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: shared.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new CardDomainError('OPERATION_ID_REUSED');
        return previous.response as unknown;
      }
    }

    const card = await tx.creditCard.findFirst({ where: { id: input.cardId, userId: shared.ownerId, isActive: true } });
    if (!card) throw new CardDomainError('INVALID_CARD');
    if (input.categoryId) {
      const category = await tx.category.findFirst({
        where: { id: input.categoryId, isActive: true, OR: [{ userId: shared.ownerId }, { userId: null }] },
      });
      if (!category) throw new CardDomainError('INVALID_CATEGORY');
    }

    const purchaseDate = new Date(input.purchaseDate);
    if (Number.isNaN(purchaseDate.getTime())) throw new CardDomainError('INVALID_PURCHASE_DATE');
    const purchaseMonth = input.purchaseDate.slice(0, 7);
    const firstMonth = addMonths(purchaseMonth, purchaseDate.getUTCDate() > card.closingDay ? 1 : 0);
    const totalCents = Math.round(input.totalAmount * 100);
    const baseCents = Math.floor(totalCents / input.installments);
    const remainder = totalCents - baseCents * input.installments;

    const purchase = await tx.cardPurchase.create({
      data: {
        userId: shared.ownerId,
        cardId: card.id,
        categoryId: input.categoryId,
        description: input.description.trim(),
        totalAmount: input.totalAmount,
        purchaseDate,
        installments: input.installments,
        entries: {
          create: Array.from({ length: input.installments }, (_, index) => ({
            number: index + 1,
            amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
            statementMonth: addMonths(firstMonth, index),
          })),
        },
      },
      include: { entries: true, category: true },
    });

    await recordFinancialAudit(tx, {
      actorId: userId,
      entity: 'CardPurchase',
      entityId: purchase.id,
      action: 'CARD_PURCHASE_CREATED',
      before: null,
      after: purchase,
      context: {
        operationId: input.operationId ?? null,
        ownerId: shared.ownerId,
        workspaceId: shared.workspaceId,
        firstStatementMonth: firstMonth,
      },
    });

    const response = { ...purchase, idempotentReplay: false };
    if (input.operationId && requestHash) {
      const state = await tx.appState.findUnique({ where: { workspaceId: shared.workspaceId }, select: { revision: true } });
      await tx.cloudMutationReceipt.create({ data: receiptCreateData({
        workspaceId: shared.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'CARD_PURCHASE_CREATE',
        revision: state?.revision || 0,
        response,
      }) });
    }
    return response;
  });
}

export async function payCardStatementProtected(userId: string, cardId: string, month: string, input: {
  accountId?: string | null;
  paymentMethodId?: string | null;
  paidAt: string;
  operationId?: string;
}) {
  if (isFutureFinancialDay(input.paidAt)) throw new CardDomainError('FUTURE_PAYMENT_NOT_ALLOWED', { paidAt: input.paidAt.slice(0, 10) });
  const shared = await sharedCardContext(userId);
  const requestHash = input.operationId ? mutationRequestHash({ cardId, month, ...input, operationId: undefined }) : null;

  return serializableFinancialTransaction(async (tx) => {
    if (input.operationId && requestHash) {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: shared.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new CardDomainError('OPERATION_ID_REUSED');
        return previous.response as unknown;
      }
    }

    const card = await tx.creditCard.findFirst({ where: { id: cardId, userId: shared.ownerId, isActive: true } });
    if (!card) throw new CardDomainError('CARD_NOT_FOUND');
    const account = input.accountId
      ? await tx.account.findFirst({
        where: { id: input.accountId, userId: shared.ownerId, isActive: true },
        select: { id: true, name: true, type: true, institution: true },
      })
      : null;
    if (!account) throw new CardDomainError('INVALID_ACCOUNT');
    if (!isMonetaryAccountType(account.type)) {
      throw new CardDomainError('ACCOUNT_NOT_MONETARY', { accountId: account.id, accountType: account.type });
    }
    const paymentMethod = input.paymentMethodId
      ? await tx.paymentMethod.findFirst({
        where: { id: input.paymentMethodId, userId: shared.ownerId, isActive: true },
        select: { id: true, name: true, type: true },
      })
      : null;
    if (input.paymentMethodId && !paymentMethod) throw new CardDomainError('INVALID_PAYMENT_METHOD');
    if (paymentMethod && key(paymentMethod.type) === 'CREDIT') {
      throw new CardDomainError('INVALID_PAYMENT_METHOD', {
        paymentMethodId: paymentMethod.id,
        reason: 'CREDIT_METHOD_NOT_ALLOWED_FOR_STATEMENT_PAYMENT',
      });
    }

    const entries = await tx.cardInstallment.findMany({
      where: { purchase: { cardId: card.id, userId: shared.ownerId, status: 'active' }, statementMonth: month, status: 'open' },
      orderBy: { number: 'asc' },
    });
    if (!entries.length) throw new CardDomainError('EMPTY_STATEMENT');
    const amount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const available = await monetaryBalanceAt(tx, shared.ownerId, input.paidAt);
    const protection = paymentBalanceDecision(available, amount);
    if (!protection.allowed) throw new CardDomainError('INSUFFICIENT_MONETARY_BALANCE', { ...protection, at: input.paidAt.slice(0, 10) });

    const paidAt = new Date(`${input.paidAt.slice(0, 10)}T12:00:00.000Z`);
    const updated = await tx.cardInstallment.updateMany({
      where: { id: { in: entries.map((entry) => entry.id) }, status: 'open' },
      data: { status: 'paid', paidAt },
    });
    if (updated.count !== entries.length) {
      throw new CardDomainError('STATEMENT_CHANGED_RETRY', {
        expectedInstallments: entries.length,
        updatedInstallments: updated.count,
      });
    }

    const event = await tx.financialEvent.create({ data: {
      userId: shared.ownerId,
      workspaceId: shared.workspaceId,
      description: `Fatura ${card.name} ${month}`,
      type: 'expense',
      status: 'paid',
      date: paidAt,
      competence: input.paidAt.slice(0, 7),
      amount,
      signedAmount: -amount,
      accountId: account.id,
      paymentMethodId: paymentMethod?.id,
    } });

    await tx.ledgerEntry.create({
      data: {
        eventId: event.id,
        date: paidAt,
        accountId: account.id,
        debit: 0,
        credit: amount,
        memo: event.description,
      },
    });

    const response = { paid: true, amount, eventId: event.id, protection: { monetary: true, ...protection, at: input.paidAt.slice(0, 10) }, idempotentReplay: false };

    await recordFinancialAudit(tx, {
      actorId: userId,
      entity: 'CreditCard',
      entityId: card.id,
      action: 'CARD_STATEMENT_PAID',
      before: { card, statementMonth: month, openEntries: entries },
      after: {
        statementMonth: month,
        paidEntryIds: entries.map((entry) => entry.id),
        paidAt: input.paidAt,
        amount,
        financialEventId: event.id,
        account,
        paymentMethod,
      },
      context: {
        protection: response.protection,
        operationId: input.operationId ?? null,
        ownerId: shared.ownerId,
        workspaceId: shared.workspaceId,
      }
    });

    if (input.operationId && requestHash) {
      const state = await tx.appState.findUnique({ where: { workspaceId: shared.workspaceId }, select: { revision: true } });
      await tx.cloudMutationReceipt.create({ data: receiptCreateData({
        workspaceId: shared.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'CARD_STATEMENT_PAYMENT',
        revision: state?.revision || 0,
        response,
      }) });
    }
    return response;
  });
}
