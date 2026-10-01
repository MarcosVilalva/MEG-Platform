import { prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { writeBackNormalizedEventsToAppState } from '../app-state/normalized-primary-writeback';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { assertActiveCatalogReferences } from './catalog-scope';
import { isFutureFinancialDay, isMonetaryAccountType, monetaryAccountBalanceAt, paymentBalanceDecision, serializableFinancialTransaction } from './monetary-protection';

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
  if (isFutureFinancialDay(input.paidAt)) {
    throw new FinancialEventSettlementError('FUTURE_PAYMENT_NOT_ALLOWED', { paidAt: input.paidAt.slice(0, 10) });
  }
  const workspace = await resolveWorkspaceContext(userId);
  const dataOwnerId = workspace.workspace.ownerId;
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
        await assertActiveCatalogReferences(tx, dataOwnerId, {
          accountId: input.accountId,
          paymentMethodId: input.paymentMethodId,
        });
      } catch (error) {
        if (error instanceof Error && ['INVALID_ACCOUNT', 'INVALID_PAYMENT_METHOD'].includes(error.message)) {
          throw new FinancialEventSettlementError(error.message);
        }
        throw error;
      }

      const settlementAccount = await tx.account.findFirst({
        where: { id: input.accountId, userId: dataOwnerId, isActive: true },
        select: { id: true, name: true, type: true, openingBalance: true },
      });
      if (!settlementAccount) throw new FinancialEventSettlementError('INVALID_ACCOUNT');
      if (!isMonetaryAccountType(settlementAccount.type)) {
        throw new FinancialEventSettlementError('ACCOUNT_NOT_MONETARY', {
          accountId: settlementAccount.id,
          accountType: settlementAccount.type,
        });
      }

      const settlementMethod = await tx.paymentMethod.findFirst({
        where: { id: input.paymentMethodId, userId: dataOwnerId, isActive: true },
        select: { id: true, name: true, type: true },
      });
      if (!settlementMethod) throw new FinancialEventSettlementError('INVALID_PAYMENT_METHOD');
      if (normalize(settlementMethod.type) === 'CREDIT' || normalize(settlementMethod.name) === 'VEROCARD') {
        throw new FinancialEventSettlementError('INVALID_PAYMENT_METHOD', {
          paymentMethodId: settlementMethod.id,
          reason: 'NON_MONETARY_METHOD_NOT_ALLOWED_FOR_SETTLEMENT',
        });
      }

      const current = await tx.financialEvent.findFirst({
        where: { id: input.eventId, userId: dataOwnerId, archivedAt: null },
        include: { account: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!current) throw new FinancialEventSettlementError('FINANCIAL_EVENT_NOT_FOUND');
      if (current.type !== 'expense' || current.status !== 'planned' || Number(current.signedAmount) >= 0) {
        throw new FinancialEventSettlementError('FINANCIAL_EVENT_NOT_PENDING');
      }
      if (current.account?.type === 'benefit' || normalize(current.description).includes('VEROCARD') || normalize(current.paymentMethod?.name).includes('VEROCARD')) {
        throw new FinancialEventSettlementError('BENEFIT_SETTLEMENT_NOT_SUPPORTED');
      }

      const originalDueDate = current.date.toISOString().slice(0, 10);
      const paidAt = new Date(input.paidAt);
      if (Number.isNaN(paidAt.getTime())) throw new FinancialEventSettlementError('INVALID_PAID_AT');

      const value = Math.abs(Number(current.amount));
      const accountBalanceBefore = await monetaryAccountBalanceAt(tx, dataOwnerId, settlementAccount, input.paidAt);
      const protection = paymentBalanceDecision(accountBalanceBefore, value);
      if (!protection.allowed) {
        throw new FinancialEventSettlementError('INSUFFICIENT_MONETARY_BALANCE', {
          ...protection,
          accountId: settlementAccount.id,
          accountName: settlementAccount.name,
          at: input.paidAt.slice(0, 10),
        });
      }

      await tx.ledgerEntry.deleteMany({ where: { eventId: current.id } });
      await tx.financialEvent.update({
        where: { id: current.id },
        data: {
          status: 'paid',
          date: paidAt,
          accountId: input.accountId,
          paymentMethodId: input.paymentMethodId,
          workspaceId: workspace.workspaceId,
          accountBalanceBefore,
          accountBalanceAfter: Math.round((accountBalanceBefore - value) * 100) / 100,
          protection,
        },
      });

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

      const settledBeforeMirror = await tx.financialEvent.findUnique({
        where: { id: current.id },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!settledBeforeMirror) throw new FinancialEventSettlementError('FINANCIAL_EVENT_NOT_FOUND');

      // Eventos importados continuam refletidos no AppState legado. Eventos nativos
      // simplesmente não possuem legacyTransactionId e o writeback vira no-op.
      await writeBackNormalizedEventsToAppState(tx, workspace.workspaceId, [settledBeforeMirror]);

      const settled = await tx.financialEvent.findUnique({
        where: { id: current.id },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!settled) throw new FinancialEventSettlementError('FINANCIAL_EVENT_NOT_FOUND');

      const compatibility = Boolean(current.legacyTransactionId || current.sourcePayload);
      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'FinancialEvent',
        entityId: settled.id,
        action: compatibility ? 'FINANCIAL_EVENT_SETTLED_COMPAT' : 'FINANCIAL_EVENT_SETTLED',
        before: current,
        after: settled,
        context: {
          operationId: input.operationId,
          originalDueDate,
          paidAt: input.paidAt,
          legacyTransactionId: current.legacyTransactionId,
          compatibility,
          workspaceId: workspace.workspaceId,
        },
      });

      const response = {
        event: settled,
        originalDueDate,
        paidAt: input.paidAt,
        accountBalanceBefore,
        accountBalanceAfter: Math.round((accountBalanceBefore - value) * 100) / 100,
        protection,
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
          mutationType: compatibility ? 'FINANCIAL_EVENT_SETTLE_COMPAT' : 'FINANCIAL_EVENT_SETTLE',
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
