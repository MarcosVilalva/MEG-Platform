import { prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from '../finance/audit';
import { assertActiveCatalogReferences } from '../finance/catalog-scope';
import { serializableFinancialTransaction } from '../finance/monetary-protection';

export class PayablePaymentMutationError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

export type CreatePayablePaymentMutationInput = {
  payableId: string;
  amount: number;
  paidAt: string;
  interestAmount: number;
  fineAmount: number;
  accountId?: string | null;
  paymentMethodId?: string | null;
  notes?: string | null;
  operationId?: string;
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

export async function createPayablePaymentProtected(userId: string, input: CreatePayablePaymentMutationInput) {
  const workspace = await resolveWorkspaceContext(userId);
  const requestHash = input.operationId
    ? mutationRequestHash({ ...input, operationId: undefined })
    : null;

  try {
    return await serializableFinancialTransaction(async (tx) => {
      if (input.operationId && requestHash) {
        const previous = await tx.cloudMutationReceipt.findUnique({
          where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
        });
        if (previous) {
          if (previous.requestHash !== requestHash) throw new PayablePaymentMutationError('OPERATION_ID_REUSED');
          return replayResponse(previous.response);
        }
      }

      try {
        await assertActiveCatalogReferences(tx, userId, {
          accountId: input.accountId || undefined,
          paymentMethodId: input.paymentMethodId || undefined,
        });
      } catch (error) {
        if (error instanceof Error && ['INVALID_ACCOUNT', 'INVALID_PAYMENT_METHOD'].includes(error.message)) {
          throw new PayablePaymentMutationError(error.message);
        }
        throw error;
      }

      const payable = await tx.payable.findFirst({
        where: { id: input.payableId, userId, status: { notIn: ['paid', 'cancelled'] } },
      });
      if (!payable) throw new PayablePaymentMutationError('PAYABLE_NOT_FOUND');

      const principal = Math.abs(input.amount);
      const open = Number(payable.openAmount);
      if (principal > open) throw new PayablePaymentMutationError('AMOUNT_EXCEEDS_OPEN_BALANCE', { openAmount: open });

      const paidTotal = principal + input.interestAmount + input.fineAmount;
      const event = await tx.financialEvent.create({
        data: {
          userId,
          workspaceId: workspace.workspaceId,
          description: `Pagamento: ${payable.description}`,
          type: 'expense',
          status: 'paid',
          date: new Date(input.paidAt),
          competence: input.paidAt.slice(0, 7),
          amount: paidTotal,
          signedAmount: -paidTotal,
          accountId: input.accountId || undefined,
          categoryId: payable.categoryId,
          paymentMethodId: input.paymentMethodId || undefined,
          notes: input.notes?.trim() || undefined,
        },
      });

      if (event.accountId) {
        await tx.ledgerEntry.create({
          data: {
            eventId: event.id,
            date: event.date,
            accountId: event.accountId,
            debit: 0,
            credit: paidTotal,
            memo: event.description,
          },
        });
      }

      const payment = await tx.payablePayment.create({
        data: {
          payableId: input.payableId,
          amount: principal,
          paidAt: new Date(input.paidAt),
          interestAmount: input.interestAmount,
          fineAmount: input.fineAmount,
          accountId: input.accountId || undefined,
          paymentMethodId: input.paymentMethodId || undefined,
          financialEventId: event.id,
          notes: input.notes?.trim() || undefined,
        },
      });

      const remaining = Math.max(0, open - principal);
      const updatedPayable = await tx.payable.update({
        where: { id: input.payableId },
        data: { openAmount: remaining, status: remaining === 0 ? 'paid' : 'partial' },
      });

      const eventSnapshot = await tx.financialEvent.findUnique({
        where: { id: event.id },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!eventSnapshot) throw new PayablePaymentMutationError('FINANCIAL_EVENT_NOT_FOUND');

      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'FinancialEvent',
        entityId: event.id,
        action: 'FINANCIAL_EVENT_CREATED',
        before: null,
        after: eventSnapshot,
        context: {
          operationId: input.operationId ?? null,
          payableId: input.payableId,
          workspaceId: workspace.workspaceId,
        },
      });

      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'PayablePayment',
        entityId: payment.id,
        action: 'PAYABLE_PAYMENT_CREATED',
        before: { payableId: payable.id, openAmount: payable.openAmount, status: payable.status },
        after: { payment, payable: updatedPayable },
        context: {
          operationId: input.operationId ?? null,
          financialEventId: event.id,
          workspaceId: workspace.workspaceId,
        },
      });

      const response = {
        payment,
        payable: updatedPayable,
        event: eventSnapshot,
        idempotentReplay: false,
      };

      if (input.operationId && requestHash) {
        const state = await tx.appState.findUnique({
          where: { workspaceId: workspace.workspaceId },
          select: { revision: true },
        });
        await tx.cloudMutationReceipt.create({
          data: receiptCreateData({
            workspaceId: workspace.workspaceId,
            operationId: input.operationId,
            requestHash,
            mutationType: 'PAYABLE_PAYMENT_CREATE',
            revision: state?.revision || 0,
            response,
          }),
        });
      }

      return response;
    });
  } catch (error) {
    if (input.operationId && requestHash && isUniqueConflict(error)) {
      const previous = await prisma.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new PayablePaymentMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}
