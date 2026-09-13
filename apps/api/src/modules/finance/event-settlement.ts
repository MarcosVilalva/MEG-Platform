import { prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { assertActiveCatalogReferences } from './catalog-scope';
import { serializableFinancialTransaction } from './monetary-protection';

export class FinancialEventSettlementError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

export type SettleLegacyFinancialEventInput = {
  eventId: string;
  paidAt: string;
  accountId: string;
  paymentMethodId: string;
  operationId: string;
};

function replayResponse(response: unknown) {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return { ...(response as Record<string, unknown>), idempotentReplay: true };
  }
  return response;
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

export async function settleLegacyFinancialEventProtected(userId: string, input: SettleLegacyFinancialEventInput) {
  const workspace = await resolveWorkspaceContext(userId);
  const requestHash = mutationRequestHash({ ...input, operationId: undefined });

  try {
    return await serializableFinancialTransaction(async (tx) => {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new FinancialEventSettlementError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }

      try {
        await assertActiveCatalogReferences(tx, userId, {
          accountId: input.accountId,
          paymentMethodId: input.paymentMethodId,
        });
      } catch (error) {
        if (error instanceof Error && ['INVALID_ACCOUNT', 'INVALID_PAYMENT_METHOD'].includes(error.message)) {
          throw new FinancialEventSettlementError(error.message);
        }
        throw error;
      }

      const current = await tx.financialEvent.findFirst({
        where: { id: input.eventId, userId, archivedAt: null },
        include: { account: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!current) throw new FinancialEventSettlementError('FINANCIAL_EVENT_NOT_FOUND');
      if (current.type !== 'expense' || current.status !== 'planned' || Number(current.signedAmount) >= 0) {
        throw new FinancialEventSettlementError('FINANCIAL_EVENT_NOT_PENDING');
      }
      if (!current.legacyTransactionId && !current.sourcePayload) {
        throw new FinancialEventSettlementError('FINANCIAL_EVENT_NOT_LEGACY_COMPAT');
      }
      if (current.account?.type === 'benefit' || normalize(current.description).includes('VEROCARD') || normalize(current.paymentMethod?.name).includes('VEROCARD')) {
        throw new FinancialEventSettlementError('BENEFIT_SETTLEMENT_NOT_SUPPORTED');
      }

      const originalDueDate = current.date.toISOString().slice(0, 10);
      const paidAt = new Date(input.paidAt);
      if (Number.isNaN(paidAt.getTime())) throw new FinancialEventSettlementError('INVALID_PAID_AT');

      await tx.ledgerEntry.deleteMany({ where: { eventId: current.id } });
      await tx.financialEvent.update({
        where: { id: current.id },
        data: {
          status: 'paid',
          date: paidAt,
          accountId: input.accountId,
          paymentMethodId: input.paymentMethodId,
          workspaceId: workspace.workspaceId,
        },
      });

      const value = Number(current.amount);
      await tx.ledgerEntry.create({
        data: {
          eventId: current.id,
          date: paidAt,
          accountId: input.accountId,
          debit: 0,
          credit: value,
          memo: current.description,
        },
      });

      const settled = await tx.financialEvent.findUnique({
        where: { id: current.id },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!settled) throw new FinancialEventSettlementError('FINANCIAL_EVENT_NOT_FOUND');

      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'FinancialEvent',
        entityId: settled.id,
        action: 'FINANCIAL_EVENT_SETTLED_COMPAT',
        before: current,
        after: settled,
        context: {
          operationId: input.operationId,
          originalDueDate,
          paidAt: input.paidAt,
          legacyTransactionId: current.legacyTransactionId,
          workspaceId: workspace.workspaceId,
        },
      });

      const response = {
        event: settled,
        originalDueDate,
        paidAt: input.paidAt,
        idempotentReplay: false,
      };
      const state = await tx.appState.findUnique({
        where: { workspaceId: workspace.workspaceId },
        select: { revision: true },
      });
      await tx.cloudMutationReceipt.create({
        data: receiptCreateData({
          workspaceId: workspace.workspaceId,
          operationId: input.operationId,
          requestHash,
          mutationType: 'FINANCIAL_EVENT_SETTLE_COMPAT',
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
        if (previous.requestHash !== requestHash) throw new FinancialEventSettlementError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}
