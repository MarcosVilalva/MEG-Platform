import { prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { recordFinancialAudit } from '../finance/audit';
import { isFutureFinancialDay, serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';

export class ReceivableDomainError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

export type ReceiveReceivableInput = {
  amount: number;
  receivedAt: string;
  interestAmount: number;
  fineAmount: number;
  accountId?: string | null;
  paymentMethodId?: string | null;
  notes?: string | null;
  operationId?: string;
};

export async function receiveReceivableProtected(userId: string, receivableId: string, input: ReceiveReceivableInput) {
  if (isFutureFinancialDay(input.receivedAt)) {
    throw new ReceivableDomainError('FUTURE_RECEIPT_NOT_ALLOWED', { receivedAt: input.receivedAt.slice(0, 10) });
  }
  const workspace = input.operationId ? await resolveWorkspaceContext(userId) : null;
  const requestHash = input.operationId
    ? mutationRequestHash({ receivableId, ...input, operationId: undefined })
    : null;

  return serializableFinancialTransaction(async (tx) => {
    if (input.operationId && workspace && requestHash) {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new ReceivableDomainError('OPERATION_ID_REUSED');
        return previous.response as unknown;
      }
    }

    const receivable = await tx.receivable.findFirst({
      where: { id: receivableId, userId, status: { not: 'paid' } },
      include: { customer: true },
    });
    if (!receivable) throw new ReceivableDomainError('RECEIVABLE_NOT_FOUND');

    const principal = Math.abs(input.amount);
    const open = Number(receivable.openAmount);
    if (principal > open) {
      throw new ReceivableDomainError('AMOUNT_EXCEEDS_OPEN_BALANCE', { requested: principal, open });
    }

    const account = input.accountId
      ? await tx.account.findFirst({ where: { id: input.accountId, isActive: true }, select: { id: true, name: true } })
      : null;
    if (input.accountId && !account) throw new ReceivableDomainError('INVALID_ACCOUNT');
    const paymentMethod = input.paymentMethodId
      ? await tx.paymentMethod.findFirst({ where: { id: input.paymentMethodId, isActive: true }, select: { id: true, name: true } })
      : null;
    if (input.paymentMethodId && !paymentMethod) throw new ReceivableDomainError('INVALID_PAYMENT_METHOD');

    const receivedTotal = principal + input.interestAmount + input.fineAmount;
    const event = input.accountId ? await tx.financialEvent.create({
      data: {
        userId,
        description: `Recebimento: ${receivable.description}`,
        type: 'income',
        status: 'paid',
        date: new Date(input.receivedAt),
        competence: input.receivedAt.slice(0, 7),
        amount: receivedTotal,
        signedAmount: receivedTotal,
        accountId: input.accountId,
        paymentMethodId: input.paymentMethodId,
        notes: input.notes,
      },
    }) : null;

    const receipt = await tx.receipt.create({
      data: {
        receivableId,
        amount: principal,
        receivedAt: new Date(input.receivedAt),
        interestAmount: input.interestAmount,
        fineAmount: input.fineAmount,
        accountId: input.accountId,
        paymentMethodId: input.paymentMethodId,
        financialEventId: event?.id,
        notes: input.notes,
      },
    });

    const remaining = Math.max(0, open - principal);
    const receivableStatus = remaining === 0 ? 'paid' : 'partial';
    const updated = await tx.receivable.update({
      where: { id: receivableId },
      data: { openAmount: remaining, status: receivableStatus },
      include: { customer: true },
    });

    const response = {
      ...receipt,
      financialEventId: event?.id ?? null,
      remaining,
      receivableStatus,
      idempotentReplay: false,
    };

    await recordFinancialAudit(tx, {
      actorId: userId,
      entity: 'Receivable',
      entityId: receivableId,
      action: 'RECEIVABLE_RECEIVED',
      before: receivable,
      after: updated,
      context: {
        receiptId: receipt.id,
        principal,
        interestAmount: input.interestAmount,
        fineAmount: input.fineAmount,
        receivedTotal,
        receivedAt: input.receivedAt,
        account: account?.name ?? null,
        paymentMethod: paymentMethod?.name ?? null,
        financialEventId: event?.id ?? null,
        operationId: input.operationId ?? null,
      },
    });

    if (input.operationId && workspace && requestHash) {
      const state = await tx.appState.findUnique({ where: { workspaceId: workspace.workspaceId }, select: { revision: true } });
      await tx.cloudMutationReceipt.create({ data: receiptCreateData({
        workspaceId: workspace.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'RECEIVABLE_RECEIPT',
        revision: state?.revision || 0,
        response,
      }) });
    }
    return response;
  });
}
