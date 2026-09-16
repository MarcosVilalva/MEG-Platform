import { Prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { writeBackNormalizedEventsToAppState } from '../app-state/normalized-primary-writeback';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import {
  isBenefitFinancialEvent,
  isFutureFinancialDay,
  isMonetaryAccountType,
  monetaryBalanceAt,
  paymentBalanceDecision,
  serializableFinancialTransaction,
} from './monetary-protection';

type Tx = Prisma.TransactionClient;

export type PendingBatchSource = 'payable' | 'event' | 'card';
export type PendingBatchItemInput = {
  source: PendingBatchSource;
  sourceId: string;
  statementMonth?: string;
};
export type SettlePendingBatchInput = {
  items: PendingBatchItemInput[];
  paidAt: string;
  accountId: string;
  paymentMethodId: string;
  operationId: string;
};

type LoadedBatchItem =
  | { source: 'event'; sourceId: string; amount: number; current: Awaited<ReturnType<typeof loadEvent>> }
  | { source: 'payable'; sourceId: string; amount: number; current: Awaited<ReturnType<typeof loadPayable>> }
  | { source: 'card'; sourceId: string; statementMonth: string; amount: number; card: Awaited<ReturnType<typeof loadCard>>; entries: Awaited<ReturnType<typeof loadCardEntries>> };

export class PendingBatchSettlementError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

async function loadEvent(tx: Tx, ownerId: string, eventId: string) {
  const current = await tx.financialEvent.findFirst({
    where: { id: eventId, userId: ownerId, archivedAt: null },
    include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
  });
  if (!current) throw new PendingBatchSettlementError('FINANCIAL_EVENT_NOT_FOUND', { eventId });
  if (current.type !== 'expense' || current.status !== 'planned' || Number(current.signedAmount) >= 0) {
    throw new PendingBatchSettlementError('FINANCIAL_EVENT_NOT_PENDING', { eventId });
  }
  if (!current.legacyTransactionId && !current.sourcePayload) {
    throw new PendingBatchSettlementError('FINANCIAL_EVENT_NOT_LEGACY_COMPAT', { eventId });
  }
  if (isBenefitFinancialEvent(current)) {
    throw new PendingBatchSettlementError('BENEFIT_SETTLEMENT_NOT_SUPPORTED', { eventId });
  }
  return current;
}

async function loadPayable(tx: Tx, ownerId: string, payableId: string) {
  const payable = await tx.payable.findFirst({
    where: { id: payableId, userId: ownerId, status: { notIn: ['paid', 'cancelled'] } },
  });
  if (!payable || Number(payable.openAmount) <= 0) {
    throw new PendingBatchSettlementError('PAYABLE_NOT_FOUND', { payableId });
  }
  return payable;
}

async function loadCard(tx: Tx, ownerId: string, cardId: string) {
  const card = await tx.creditCard.findFirst({ where: { id: cardId, userId: ownerId, isActive: true } });
  if (!card) throw new PendingBatchSettlementError('CARD_NOT_FOUND', { cardId });
  return card;
}

async function loadCardEntries(tx: Tx, ownerId: string, cardId: string, month: string) {
  const entries = await tx.cardInstallment.findMany({
    where: { purchase: { cardId, userId: ownerId, status: 'active' }, statementMonth: month, status: 'open' },
    orderBy: { number: 'asc' },
  });
  if (!entries.length) throw new PendingBatchSettlementError('CARD_STATEMENT_NOT_PAYABLE', { cardId, statementMonth: month });
  return entries;
}

async function loadBatchItems(tx: Tx, ownerId: string, items: PendingBatchItemInput[]): Promise<LoadedBatchItem[]> {
  const loaded: LoadedBatchItem[] = [];
  for (const item of items) {
    if (item.source === 'event') {
      const current = await loadEvent(tx, ownerId, item.sourceId);
      const amount = Math.abs(Number(current.amount));
      if (!Number.isFinite(amount) || amount <= 0) throw new PendingBatchSettlementError('INVALID_PENDING_AMOUNT', { sourceId: item.sourceId });
      loaded.push({ source: 'event', sourceId: item.sourceId, amount, current });
      continue;
    }
    if (item.source === 'payable') {
      const current = await loadPayable(tx, ownerId, item.sourceId);
      const amount = Math.abs(Number(current.openAmount));
      if (!Number.isFinite(amount) || amount <= 0) throw new PendingBatchSettlementError('INVALID_PENDING_AMOUNT', { sourceId: item.sourceId });
      loaded.push({ source: 'payable', sourceId: item.sourceId, amount, current });
      continue;
    }
    const statementMonth = String(item.statementMonth || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(statementMonth)) {
      throw new PendingBatchSettlementError('PHOENIX_PENDING_STATEMENT_REQUIRED', { cardId: item.sourceId });
    }
    const card = await loadCard(tx, ownerId, item.sourceId);
    const entries = await loadCardEntries(tx, ownerId, item.sourceId, statementMonth);
    const amount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new PendingBatchSettlementError('CARD_STATEMENT_NOT_PAYABLE', { cardId: item.sourceId, statementMonth });
    loaded.push({ source: 'card', sourceId: item.sourceId, statementMonth, amount, card, entries });
  }
  return loaded;
}

export async function settlePendingBatchProtected(actorId: string, input: SettlePendingBatchInput) {
  if (isFutureFinancialDay(input.paidAt)) {
    throw new PendingBatchSettlementError('FUTURE_PAYMENT_NOT_ALLOWED', { paidAt: input.paidAt.slice(0, 10) });
  }
  const context = await resolveWorkspaceContext(actorId);
  const ownerId = context.workspace.ownerId;
  const requestHash = mutationRequestHash({ ...input, operationId: undefined });

  return serializableFinancialTransaction(async (tx) => {
    const previous = await tx.cloudMutationReceipt.findUnique({
      where: { workspaceId_operationId: { workspaceId: context.workspaceId, operationId: input.operationId } },
    });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new PendingBatchSettlementError('OPERATION_ID_REUSED');
      return { ...(previous.response as Record<string, unknown>), idempotentReplay: true };
    }

    const account = await tx.account.findFirst({
      where: { id: input.accountId, userId: ownerId, isActive: true },
      select: { id: true, name: true, type: true, institution: true },
    });
    if (!account) throw new PendingBatchSettlementError('INVALID_ACCOUNT');
    if (!isMonetaryAccountType(account.type)) {
      throw new PendingBatchSettlementError('ACCOUNT_NOT_MONETARY', { accountId: account.id, accountType: account.type });
    }

    const paymentMethod = await tx.paymentMethod.findFirst({
      where: { id: input.paymentMethodId, userId: ownerId, isActive: true },
      select: { id: true, name: true, type: true },
    });
    if (!paymentMethod) throw new PendingBatchSettlementError('INVALID_PAYMENT_METHOD');
    if (normalize(paymentMethod.type) === 'CREDIT') {
      throw new PendingBatchSettlementError('INVALID_PAYMENT_METHOD', { paymentMethodId: paymentMethod.id, reason: 'CREDIT_METHOD_NOT_ALLOWED_FOR_SETTLEMENT' });
    }

    const loaded = await loadBatchItems(tx, ownerId, input.items);
    const total = Math.round(loaded.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    const available = await monetaryBalanceAt(tx, ownerId, input.paidAt);
    const protection = paymentBalanceDecision(available, total);
    if (!protection.allowed) {
      throw new PendingBatchSettlementError('INSUFFICIENT_MONETARY_BALANCE', { ...protection, at: input.paidAt.slice(0, 10) });
    }

    const paidAt = new Date(`${input.paidAt.slice(0, 10)}T12:00:00.000Z`);
    const results: Array<Record<string, unknown>> = [];
    const legacyBefore = new Map<string, (typeof loaded)[number] & { source: 'event' }>();
    const legacyUpdatedIds: string[] = [];

    for (const item of loaded) {
      if (item.source === 'event') {
        legacyBefore.set(item.sourceId, item);
        await tx.ledgerEntry.deleteMany({ where: { eventId: item.sourceId } });
        await tx.financialEvent.update({
          where: { id: item.sourceId },
          data: {
            status: 'paid',
            date: paidAt,
            accountId: account.id,
            paymentMethodId: paymentMethod.id,
            workspaceId: context.workspaceId,
          },
        });
        await tx.ledgerEntry.create({
          data: { eventId: item.sourceId, date: paidAt, accountId: account.id, debit: 0, credit: item.amount, memo: item.current.description },
        });
        legacyUpdatedIds.push(item.sourceId);
        results.push({ source: 'event', sourceId: item.sourceId, amount: item.amount });
        continue;
      }

      if (item.source === 'payable') {
        const event = await tx.financialEvent.create({
          data: {
            userId: ownerId,
            workspaceId: context.workspaceId,
            description: `Pagamento: ${item.current.description}`,
            type: 'expense',
            status: 'paid',
            date: paidAt,
            competence: input.paidAt.slice(0, 7),
            amount: item.amount,
            signedAmount: -item.amount,
            accountId: account.id,
            categoryId: item.current.categoryId,
            paymentMethodId: paymentMethod.id,
            notes: `Baixa em lote ${input.operationId}`,
          },
        });
        await tx.ledgerEntry.create({
          data: { eventId: event.id, date: paidAt, accountId: account.id, debit: 0, credit: item.amount, memo: event.description },
        });
        const payment = await tx.payablePayment.create({
          data: {
            payableId: item.sourceId,
            amount: item.amount,
            paidAt,
            interestAmount: 0,
            fineAmount: 0,
            accountId: account.id,
            paymentMethodId: paymentMethod.id,
            financialEventId: event.id,
            notes: `Baixa em lote ${input.operationId}`,
          },
        });
        const updatedPayable = await tx.payable.update({
          where: { id: item.sourceId },
          data: { openAmount: 0, status: 'paid' },
        });
        await recordFinancialAudit(tx, {
          actorId,
          entity: 'Payable',
          entityId: item.sourceId,
          action: 'PAYABLE_PAYMENT_CREATED',
          before: item.current,
          after: { payment, payable: updatedPayable },
          context: { operationId: input.operationId, batch: true, workspaceId: context.workspaceId },
        });
        results.push({ source: 'payable', sourceId: item.sourceId, amount: item.amount, financialEventId: event.id });
        continue;
      }

      const updated = await tx.cardInstallment.updateMany({
        where: { id: { in: item.entries.map((entry) => entry.id) }, status: 'open' },
        data: { status: 'paid', paidAt },
      });
      if (updated.count !== item.entries.length) {
        throw new PendingBatchSettlementError('STATEMENT_CHANGED_RETRY', {
          cardId: item.sourceId,
          statementMonth: item.statementMonth,
          expectedInstallments: item.entries.length,
          updatedInstallments: updated.count,
        });
      }
      const event = await tx.financialEvent.create({
        data: {
          userId: ownerId,
          workspaceId: context.workspaceId,
          description: `Fatura ${item.card.name} ${item.statementMonth}`,
          type: 'expense',
          status: 'paid',
          date: paidAt,
          competence: input.paidAt.slice(0, 7),
          amount: item.amount,
          signedAmount: -item.amount,
          accountId: account.id,
          paymentMethodId: paymentMethod.id,
        },
      });
      await tx.ledgerEntry.create({
        data: { eventId: event.id, date: paidAt, accountId: account.id, debit: 0, credit: item.amount, memo: event.description },
      });
      await recordFinancialAudit(tx, {
        actorId,
        entity: 'CreditCard',
        entityId: item.sourceId,
        action: 'CARD_STATEMENT_PAID',
        before: { card: item.card, statementMonth: item.statementMonth, openEntries: item.entries },
        after: { statementMonth: item.statementMonth, paidEntryIds: item.entries.map((entry) => entry.id), paidAt: input.paidAt, amount: item.amount, financialEventId: event.id, account, paymentMethod },
        context: { operationId: input.operationId, batch: true, workspaceId: context.workspaceId },
      });
      results.push({ source: 'card', sourceId: item.sourceId, statementMonth: item.statementMonth, amount: item.amount, financialEventId: event.id });
    }

    if (legacyUpdatedIds.length) {
      const beforeMirror = await tx.financialEvent.findMany({
        where: { id: { in: legacyUpdatedIds } },
        include: { paymentMethod: { select: { name: true } } },
      });
      await writeBackNormalizedEventsToAppState(tx, context.workspaceId, beforeMirror);
      const afterMirror = await tx.financialEvent.findMany({
        where: { id: { in: legacyUpdatedIds } },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      const afterById = new Map(afterMirror.map((event) => [event.id, event]));
      for (const eventId of legacyUpdatedIds) {
        const before = legacyBefore.get(eventId)?.current;
        const after = afterById.get(eventId);
        if (!before || !after) throw new PendingBatchSettlementError('FINANCIAL_EVENT_NOT_FOUND', { eventId });
        await recordFinancialAudit(tx, {
          actorId,
          entity: 'FinancialEvent',
          entityId: eventId,
          action: 'FINANCIAL_EVENT_SETTLED_COMPAT',
          before,
          after,
          context: { operationId: input.operationId, batch: true, paidAt: input.paidAt, workspaceId: context.workspaceId },
        });
      }
    }

    const response = {
      settled: true,
      count: results.length,
      total,
      paidAt: input.paidAt,
      account: { id: account.id, name: account.name },
      paymentMethod: { id: paymentMethod.id, name: paymentMethod.name },
      protection: { monetary: true, ...protection, at: input.paidAt.slice(0, 10) },
      items: results,
      idempotentReplay: false,
    };

    const state = await tx.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true } });
    await tx.cloudMutationReceipt.create({
      data: receiptCreateData({
        workspaceId: context.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'PENDING_BATCH_SETTLEMENT',
        revision: state?.revision || 0,
        response,
      }),
    });
    return response;
  }, { timeoutMs: 60_000 });
}
