import { Prisma, prisma, UserRole, UserStatus } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { writeBackNormalizedEventsToAppState } from '../app-state/normalized-primary-writeback';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { financialAmountValues } from './amount-sign';
import { legacyOpeningBalanceFallbackTotal } from './opening-balance';
import { activeAccountForUser, activeCategoryForUser, activePaymentMethodForUser } from './catalog-scope';
import {
  SEMANTIC_DUPLICATE_WINDOW_MS,
  findRecentFinancialEventDuplicate,
  isBenefitFinancialEvent,
  isBenefitPaymentMethod,
  isPostedFinancialStatus,
  serializableFinancialTransaction,
} from './monetary-protection';

type Tx = Prisma.TransactionClient;

type BenefitLedgerValue = Prisma.Decimal | number | string;

export type BenefitEventMutationResult = {
  id: string;
  status: string;
  signedAmount: BenefitLedgerValue;
  ledgerEntries: Array<{ debit: BenefitLedgerValue; credit: BenefitLedgerValue }>;
  idempotentReplay: boolean;
  [key: string]: unknown;
};

export type BenefitEventMutationInput = {
  description: string;
  type: 'income' | 'expense';
  date: string;
  amount: number;
  accountId: string;
  categoryId?: string;
  paymentMethodId: string;
  notes?: string;
  operationId: string;
  allowDuplicate?: boolean;
};

export type BenefitEventUpdateInput = BenefitEventMutationInput & {
  expectedUpdatedAt?: string;
};

export class BenefitEventMutationError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

function normalizeText(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function replayResponse(response: unknown): BenefitEventMutationResult {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return { ...(response as Record<string, unknown>), idempotentReplay: true } as BenefitEventMutationResult;
  }
  throw new BenefitEventMutationError('BENEFIT_EVENT_NOT_FOUND');
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}

function nextDayExclusive(day: string) {
  const parsed = new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new BenefitEventMutationError('INVALID_BENEFIT_DATE');
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed;
}

export async function benefitBalanceAt(tx: Tx, userId: string, effectiveAt: string, excludeEventId?: string) {
  const cutoff = nextDayExclusive(effectiveAt);
  const [openingBalance, events] = await Promise.all([
    legacyOpeningBalanceFallbackTotal(tx, userId, ['benefit']),
    tx.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: cutoff }, ...(excludeEventId ? { id: { not: excludeEventId } } : {}) },
      select: {
        description: true,
        status: true,
        signedAmount: true,
        account: { select: { type: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
  ]);
  const balance = events
    .filter((event) => isBenefitFinancialEvent(event) && isPostedFinancialStatus(event.status))
    .reduce((sum, event) => sum + Number(event.signedAmount), openingBalance);
  return Math.round(balance * 100) / 100;
}

function assertBaseInput(input: BenefitEventMutationInput) {
  if (!input.description.trim()) throw new BenefitEventMutationError('BENEFIT_DESCRIPTION_REQUIRED');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new BenefitEventMutationError('BENEFIT_POSITIVE_AMOUNT_REQUIRED');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new BenefitEventMutationError('INVALID_BENEFIT_DATE');
  if (!input.accountId) throw new BenefitEventMutationError('INVALID_BENEFIT_ACCOUNT');
  if (!input.paymentMethodId) throw new BenefitEventMutationError('INVALID_BENEFIT_PAYMENT_METHOD');
  if (input.type === 'expense' && !input.categoryId) throw new BenefitEventMutationError('BENEFIT_EXPENSE_CATEGORY_REQUIRED');
}

/**
 * The benefit balance is aggregated by the existing benefit authority, NOT
 * by monetaryAccountDebitWindow. A retroactive benefit expense must remain
 * affordable on every later posted benefit-event day.
 */
async function benefitExpenseDebitWindow(
  tx: Tx,
  ownerId: string,
  date: string,
  amount: number,
  excludeEventId?: string,
): Promise<{ allowed: boolean; insufficientDay?: string; availableCents?: number }> {
  const requestedCents = Math.round(amount * 100);
  if (!Number.isSafeInteger(requestedCents) || requestedCents <= 0) {
    throw new BenefitEventMutationError('BENEFIT_POSITIVE_AMOUNT_REQUIRED');
  }
  const future = await tx.financialEvent.findMany({
    where: {
      userId: ownerId, archivedAt: null,
      status: { in: ['paid', 'confirmed', 'reconciled'] },
      date: { gte: new Date(date + 'T00:00:00.000Z') },
    },
    select: {
      date: true, description: true, status: true,
      account: { select: { type: true } },
      paymentMethod: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });
  const relevantDays = [...new Set([
    date,
    ...future.filter((item) => isBenefitFinancialEvent(item)
      && isPostedFinancialStatus(item.status))
      .map((item) => item.date.toISOString().slice(0, 10)),
  ])];
  if (relevantDays.length > 250) {
    throw new BenefitEventMutationError('BENEFIT_BALANCE_WINDOW_TOO_LARGE');
  }
  for (const day of relevantDays) {
    const available = await benefitBalanceAt(tx, ownerId, day, excludeEventId);
    const availableCents = Math.round(available * 100);
    if (!Number.isSafeInteger(availableCents)) {
      throw new BenefitEventMutationError('INVALID_BENEFIT_BALANCE');
    }
    if (requestedCents > availableCents) {
      return { allowed: false, insufficientDay: day, availableCents };
    }
  }
  return { allowed: true };
}

/**
 * PT81: check the complete posted benefit timeline AFTER an edited credit
 * has been replaced, inside the same serializable transaction. Reducing,
 * moving or changing the type of an old top-up must not leave a later
 * Verocard purchase with a negative available benefit balance.
 * Any failure rolls back event, ledger, AppState, audit and receipt together.
 */
async function assertBenefitCreditEditTimeline(
  tx: Tx, ownerId: string, earliestAffectedDay: string,
) {
  const events = await tx.financialEvent.findMany({
    where: {
      userId: ownerId, archivedAt: null,
      status: { in: ['paid', 'confirmed', 'reconciled'] },
      date: { gte: new Date(earliestAffectedDay + 'T00:00:00.000Z') },
    },
    select: {
      date: true, description: true, status: true,
      account: { select: { type: true } },
      paymentMethod: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });
  const affectedDays = [...new Set([
    earliestAffectedDay,
    ...events.filter((event) => isPostedFinancialStatus(event.status)
      && isBenefitFinancialEvent(event))
      .map((event) => event.date.toISOString().slice(0, 10)),
  ])];
  if (affectedDays.length > 250) {
    throw new BenefitEventMutationError('BENEFIT_BALANCE_WINDOW_TOO_LARGE');
  }
  for (const day of affectedDays) {
    const currentCents = Math.round(
      (await benefitBalanceAt(tx, ownerId, day)) * 100);
    if (!Number.isSafeInteger(currentCents)) {
      throw new BenefitEventMutationError('INVALID_BENEFIT_BALANCE');
    }
    if (currentCents < 0) {
      throw new BenefitEventMutationError('INSUFFICIENT_BENEFIT_BALANCE', {
        insufficientDay: day,
        available: currentCents / 100,
        missing: -currentCents / 100,
        contract: 'benefit-credit-edit',
      });
    }
  }
}

async function assertBenefitWorkspaceWriteRole(tx: Tx, workspaceId: string, userId: string) {
  const member = await tx.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, status: true, isActive: true },
  });
  if (!member?.isActive || member.status !== UserStatus.ACTIVE ||
      (member.role !== UserRole.ADMIN && member.role !== UserRole.MANAGER &&
       member.role !== UserRole.OPERATOR)) {
    throw new BenefitEventMutationError('BENEFIT_WORKSPACE_WRITE_REQUIRED');
  }
}

export async function updateBenefitEventProtected(
  userId: string,
  eventId: string,
  input: BenefitEventUpdateInput,
): Promise<BenefitEventMutationResult> {
  assertBaseInput(input);
  const workspace = await resolveWorkspaceContext(userId);
  const dataOwnerId = workspace.workspace.ownerId;
  const requestHash = mutationRequestHash({
    contract: 'benefit-update',
    eventId,
    ...input,
    expectedUpdatedAt: input.expectedUpdatedAt || null,
    operationId: undefined,
  });

  try {
    return await serializableFinancialTransaction(async (tx) => {
      await assertBenefitWorkspaceWriteRole(tx, workspace.workspaceId, userId);
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new BenefitEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }

      const before = await tx.financialEvent.findFirst({
        where: { id: eventId, userId: dataOwnerId, archivedAt: null },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!before) throw new BenefitEventMutationError('BENEFIT_EVENT_NOT_FOUND');
      if (!isBenefitFinancialEvent(before)) throw new BenefitEventMutationError('BENEFIT_EVENT_DOMAIN_MISMATCH');
      if (input.expectedUpdatedAt && before.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        throw new BenefitEventMutationError('FINANCIAL_EVENT_STALE_VERSION', {
          id: eventId,
          expectedUpdatedAt: input.expectedUpdatedAt,
          currentUpdatedAt: before.updatedAt.toISOString(),
        });
      }

      const [account, paymentMethod, category] = await Promise.all([
        activeAccountForUser(tx, dataOwnerId, input.accountId),
        activePaymentMethodForUser(tx, dataOwnerId, input.paymentMethodId),
        input.categoryId ? activeCategoryForUser(tx, dataOwnerId, input.categoryId) : Promise.resolve(null),
      ]);
      if (!account || normalizeText(account.type) !== 'BENEFIT') throw new BenefitEventMutationError('INVALID_BENEFIT_ACCOUNT');
      if (!paymentMethod || !isBenefitPaymentMethod(paymentMethod.name)) throw new BenefitEventMutationError('INVALID_BENEFIT_PAYMENT_METHOD');
      if (input.categoryId && !category) throw new BenefitEventMutationError('INVALID_CATEGORY');
      if (category?.type && category.type !== input.type) throw new BenefitEventMutationError('BENEFIT_CATEGORY_TYPE_MISMATCH');

      let balanceBefore: number | null = null;
      if (input.type === 'expense') {
        balanceBefore = await benefitBalanceAt(tx, dataOwnerId, input.date, eventId);
        const timeline = await benefitExpenseDebitWindow(
          tx, dataOwnerId, input.date, input.amount, eventId);
        if (!timeline.allowed) {
          const availableCents = timeline.availableCents ?? 0;
          const requestedCents = Math.round(input.amount * 100);
          throw new BenefitEventMutationError('INSUFFICIENT_BENEFIT_BALANCE', {
            available: availableCents / 100,
            requested: requestedCents / 100,
            missing: Math.max(0, requestedCents - availableCents) / 100,
            ...(timeline.insufficientDay ? { insufficientDay: timeline.insufficientDay } : {}),
          });
        }
      }

      const values = financialAmountValues(input.type, input.amount);
      await tx.ledgerEntry.deleteMany({ where: { eventId } });
      await tx.financialEvent.update({
        where: { id: eventId },
        data: {
          description: input.description.trim(),
          type: input.type,
          status: 'paid',
          date: new Date(`${input.date}T12:00:00.000Z`),
          competence: input.date.slice(0, 7),
          amount: values.amount,
          signedAmount: values.signedAmount,
          accountId: account.id,
          categoryId: category?.id || null,
          paymentMethodId: paymentMethod.id,
          notes: input.notes?.trim() || null,
        },
      });
      const updated = await tx.financialEvent.findUnique({ where: { id: eventId } });
      if (!updated) throw new BenefitEventMutationError('BENEFIT_EVENT_NOT_FOUND');
      await tx.ledgerEntry.create({
        data: {
          eventId,
          date: updated.date,
          accountId: account.id,
          debit: Number(updated.signedAmount) >= 0 ? Number(updated.amount) : 0,
          credit: Number(updated.signedAmount) < 0 ? Number(updated.amount) : 0,
          memo: updated.description,
        },
      });

      // A credit edit may remove an old source of available benefit funds.
      // Recalculate after the replacement so earlier expenses and future
      // purchases are verified against the final, atomic event sequence.
      if (before.type === 'income' || input.type === 'income') {
        const beforeDay = before.date.toISOString().slice(0, 10);
        const firstAffectedDay = beforeDay < input.date ? beforeDay : input.date;
        await assertBenefitCreditEditTimeline(
          tx, dataOwnerId, firstAffectedDay);
      }

      const result = await tx.financialEvent.findUnique({
        where: { id: eventId },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!result) throw new BenefitEventMutationError('BENEFIT_EVENT_NOT_FOUND');

      await writeBackNormalizedEventsToAppState(tx, workspace.workspaceId, [result]);
      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'FinancialEvent',
        entityId: result.id,
        action: 'BENEFIT_EVENT_UPDATED',
        before,
        after: result,
        context: {
          operationId: input.operationId,
          contract: 'benefit',
          benefitDirection: input.type === 'income' ? 'credit' : 'debit',
          balanceBefore,
          workspaceId: workspace.workspaceId,
        },
      });

      const response = { ...result, idempotentReplay: false } as BenefitEventMutationResult;
      const state = await tx.appState.findUnique({ where: { workspaceId: workspace.workspaceId }, select: { revision: true } });
      await tx.cloudMutationReceipt.create({
        data: receiptCreateData({
          workspaceId: workspace.workspaceId,
          operationId: input.operationId,
          requestHash,
          mutationType: 'BENEFIT_EVENT_UPDATE',
          revision: state?.revision || 0,
          response,
        }),
      });
      return response;
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      const previous = await prisma.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new BenefitEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}

export async function createBenefitEventProtected(
  userId: string,
  input: BenefitEventMutationInput,
  expectedWorkspaceId?: string,
): Promise<BenefitEventMutationResult> {
  assertBaseInput(input);
  const workspace = await resolveWorkspaceContext(userId,
    expectedWorkspaceId ? {allowLegacyBootstrap:false} : {});
  if (expectedWorkspaceId && workspace.workspaceId !== expectedWorkspaceId) {
    throw new BenefitEventMutationError('WORKSPACE_CONTEXT_CHANGED');
  }
  const dataOwnerId = workspace.workspace.ownerId;
  const requestHash = mutationRequestHash({ contract: 'benefit', ...input, operationId: undefined, allowDuplicate: undefined });

  try {
    return await serializableFinancialTransaction(async (tx) => {
      await assertBenefitWorkspaceWriteRole(tx, workspace.workspaceId, userId);
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new BenefitEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }

      const [account, paymentMethod, category] = await Promise.all([
        activeAccountForUser(tx, dataOwnerId, input.accountId),
        activePaymentMethodForUser(tx, dataOwnerId, input.paymentMethodId),
        input.categoryId ? activeCategoryForUser(tx, dataOwnerId, input.categoryId) : Promise.resolve(null),
      ]);

      if (!account || normalizeText(account.type) !== 'BENEFIT') {
        throw new BenefitEventMutationError('INVALID_BENEFIT_ACCOUNT');
      }
      if (!paymentMethod || !isBenefitPaymentMethod(paymentMethod.name)) {
        throw new BenefitEventMutationError('INVALID_BENEFIT_PAYMENT_METHOD');
      }
      if (input.categoryId && !category) throw new BenefitEventMutationError('INVALID_CATEGORY');
      if (category?.type && category.type !== input.type) throw new BenefitEventMutationError('BENEFIT_CATEGORY_TYPE_MISMATCH');

      const values = financialAmountValues(input.type, input.amount);
      if (!input.allowDuplicate) {
        const duplicate = await findRecentFinancialEventDuplicate(tx, {
          workspaceId: workspace.workspaceId,
          userId: dataOwnerId,
          description: input.description,
          type: input.type,
          status: 'paid',
          date: input.date,
          amount: values.amount,
          signedAmount: values.signedAmount,
          accountId: account.id,
          categoryId: category?.id || null,
          paymentMethodId: paymentMethod.id,
        });
        if (duplicate) {
          throw new BenefitEventMutationError('POSSIBLE_DUPLICATE', {
            duplicate,
            duplicateWindowSeconds: Math.round(SEMANTIC_DUPLICATE_WINDOW_MS / 1000),
          });
        }
      }

      let balanceBefore: number | null = null;
      if (input.type === 'expense') {
        balanceBefore = await benefitBalanceAt(tx, dataOwnerId, input.date);
        const timeline = await benefitExpenseDebitWindow(
          tx, dataOwnerId, input.date, input.amount);
        if (!timeline.allowed) {
          const availableCents = timeline.availableCents ?? 0;
          const requestedCents = Math.round(input.amount * 100);
          throw new BenefitEventMutationError('INSUFFICIENT_BENEFIT_BALANCE', {
            available: availableCents / 100,
            requested: requestedCents / 100,
            missing: Math.max(0, requestedCents - availableCents) / 100,
            ...(timeline.insufficientDay ? { insufficientDay: timeline.insufficientDay } : {}),
          });
        }
      }

      const event = await tx.financialEvent.create({
        data: {
          userId: dataOwnerId,
          workspaceId: workspace.workspaceId,
          description: input.description.trim(),
          type: input.type,
          status: 'paid',
          date: new Date(`${input.date}T12:00:00.000Z`),
          competence: input.date.slice(0, 7),
          amount: values.amount,
          signedAmount: values.signedAmount,
          accountId: account.id,
          categoryId: category?.id,
          paymentMethodId: paymentMethod.id,
          notes: input.notes?.trim() || undefined,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          eventId: event.id,
          date: event.date,
          accountId: account.id,
          debit: Number(event.signedAmount) >= 0 ? Number(event.amount) : 0,
          credit: Number(event.signedAmount) < 0 ? Number(event.amount) : 0,
          memo: event.description,
        },
      });

      const result = await tx.financialEvent.findUnique({
        where: { id: event.id },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!result) throw new BenefitEventMutationError('BENEFIT_EVENT_NOT_FOUND');

      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'FinancialEvent',
        entityId: result.id,
        action: 'BENEFIT_EVENT_CREATED',
        before: null,
        after: result,
        context: {
          operationId: input.operationId,
          contract: 'benefit',
          benefitDirection: input.type === 'income' ? 'credit' : 'debit',
          balanceBefore,
          workspaceId: workspace.workspaceId,
          duplicateOverride: Boolean(input.allowDuplicate),
        },
      });

      const response = { ...result, idempotentReplay: false } as BenefitEventMutationResult;
      const state = await tx.appState.findUnique({ where: { workspaceId: workspace.workspaceId }, select: { revision: true } });
      await tx.cloudMutationReceipt.create({
        data: receiptCreateData({
          workspaceId: workspace.workspaceId,
          operationId: input.operationId,
          requestHash,
          mutationType: 'BENEFIT_EVENT_CREATE',
          revision: state?.revision || 0,
          response,
        }),
      });
      return response;
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      const previous = await prisma.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new BenefitEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}
