import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { financialAmountValues } from './amount-sign';
import { activeAccountForUser, activeCategoryForUser, activePaymentMethodForUser } from './catalog-scope';
import {
  isBenefitFinancialEvent,
  isBenefitPaymentMethod,
  isPostedFinancialStatus,
  serializableFinancialTransaction,
} from './monetary-protection';

type Tx = Prisma.TransactionClient;

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
};

export class BenefitEventMutationError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

function normalizeText(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function replayResponse(response: unknown) {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return { ...(response as Record<string, unknown>), idempotentReplay: true };
  }
  return response;
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

async function benefitBalanceAt(tx: Tx, userId: string, effectiveAt: string) {
  const cutoff = nextDayExclusive(effectiveAt);
  const [accounts, events] = await Promise.all([
    tx.account.findMany({
      where: { userId, type: 'benefit' },
      select: { openingBalance: true },
    }),
    tx.financialEvent.findMany({
      where: { userId, archivedAt: null, date: { lt: cutoff } },
      select: {
        description: true,
        status: true,
        signedAmount: true,
        account: { select: { type: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
  ]);
  const openingBalance = accounts.reduce((sum, account) => sum + Number(account.openingBalance || 0), 0);
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

export async function createBenefitEventProtected(userId: string, input: BenefitEventMutationInput) {
  assertBaseInput(input);
  const workspace = await resolveWorkspaceContext(userId);
  const requestHash = mutationRequestHash({ contract: 'benefit', ...input, operationId: undefined });

  try {
    return await serializableFinancialTransaction(async (tx) => {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new BenefitEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }

      const [account, paymentMethod, category] = await Promise.all([
        activeAccountForUser(tx, userId, input.accountId),
        activePaymentMethodForUser(tx, userId, input.paymentMethodId),
        input.categoryId ? activeCategoryForUser(tx, userId, input.categoryId) : Promise.resolve(null),
      ]);

      if (!account || normalizeText(account.type) !== 'BENEFIT') {
        throw new BenefitEventMutationError('INVALID_BENEFIT_ACCOUNT');
      }
      if (!paymentMethod || !isBenefitPaymentMethod(paymentMethod.name)) {
        throw new BenefitEventMutationError('INVALID_BENEFIT_PAYMENT_METHOD');
      }
      if (input.categoryId && !category) throw new BenefitEventMutationError('INVALID_CATEGORY');
      if (category?.type && category.type !== input.type) throw new BenefitEventMutationError('BENEFIT_CATEGORY_TYPE_MISMATCH');

      let balanceBefore: number | null = null;
      if (input.type === 'expense') {
        balanceBefore = await benefitBalanceAt(tx, userId, input.date);
        const availableCents = Math.round(balanceBefore * 100);
        const requestedCents = Math.round(input.amount * 100);
        if (requestedCents > availableCents) {
          throw new BenefitEventMutationError('INSUFFICIENT_BENEFIT_BALANCE', {
            available: availableCents / 100,
            requested: requestedCents / 100,
            missing: (requestedCents - availableCents) / 100,
          });
        }
      }

      const values = financialAmountValues(input.type, input.amount);
      const event = await tx.financialEvent.create({
        data: {
          userId,
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
        },
      });

      const response = { ...result, idempotentReplay: false };
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
