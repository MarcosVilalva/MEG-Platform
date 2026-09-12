import { prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { financialAmountValues } from './amount-sign';
import { serializableFinancialTransaction } from './monetary-protection';

export class FinancialEventMutationError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

export type CreateFinancialEventMutationInput = {
  description: string;
  type: 'income' | 'expense' | 'transfer' | 'investment' | 'redemption' | 'adjustment';
  status: 'draft' | 'planned' | 'confirmed' | 'paid' | 'reconciled' | 'archived';
  date: string;
  competence?: string;
  amount: number;
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  notes?: string;
  operationId?: string;
};

function isPosted(status: string) {
  return status === 'paid' || status === 'reconciled' || status === 'confirmed';
}

export async function createFinancialEventProtected(userId: string, input: CreateFinancialEventMutationInput) {
  if (input.type === 'transfer') {
    throw new FinancialEventMutationError('TRANSFER_CONTRACT_NOT_READY');
  }
  const workspace = input.operationId ? await resolveWorkspaceContext(userId) : null;
  const requestHash = input.operationId
    ? mutationRequestHash({ ...input, operationId: undefined })
    : null;

  return serializableFinancialTransaction(async (tx) => {
    if (input.operationId && workspace && requestHash) {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new FinancialEventMutationError('OPERATION_ID_REUSED');
        return previous.response as unknown;
      }
    }

    if (input.accountId) {
      const account = await tx.account.findFirst({ where: { id: input.accountId, isActive: true }, select: { id: true } });
      if (!account) throw new FinancialEventMutationError('INVALID_ACCOUNT');
    }
    if (input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true } });
      if (!category) throw new FinancialEventMutationError('INVALID_CATEGORY');
    }
    if (input.paymentMethodId) {
      const method = await tx.paymentMethod.findFirst({ where: { id: input.paymentMethodId, isActive: true }, select: { id: true } });
      if (!method) throw new FinancialEventMutationError('INVALID_PAYMENT_METHOD');
    }

    const values = financialAmountValues(input.type, input.amount);
    const event = await tx.financialEvent.create({
      data: {
        userId,
        description: input.description.trim(),
        type: input.type,
        status: input.status,
        date: new Date(input.date),
        competence: input.competence || input.date.slice(0, 7),
        amount: values.amount,
        signedAmount: values.signedAmount,
        accountId: input.accountId,
        categoryId: input.categoryId,
        paymentMethodId: input.paymentMethodId,
        notes: input.notes?.trim() || undefined,
      },
    });

    if (event.accountId && isPosted(event.status)) {
      const value = Number(event.amount);
      await tx.ledgerEntry.create({
        data: {
          eventId: event.id,
          date: event.date,
          accountId: event.accountId,
          debit: Number(event.signedAmount) >= 0 ? value : 0,
          credit: Number(event.signedAmount) < 0 ? value : 0,
          memo: event.description,
        },
      });
    }

    const result = await tx.financialEvent.findUnique({
      where: { id: event.id },
      include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
    });
    if (!result) throw new FinancialEventMutationError('FINANCIAL_EVENT_NOT_FOUND');

    await recordFinancialAudit(tx, {
      actorId: userId,
      entity: 'FinancialEvent',
      entityId: result.id,
      action: 'FINANCIAL_EVENT_CREATED',
      before: null,
      after: result,
      context: { operationId: input.operationId ?? null, competence: result.competence },
    });

    const response = { ...result, idempotentReplay: false };
    if (input.operationId && workspace && requestHash) {
      const state = await tx.appState.findUnique({ where: { workspaceId: workspace.workspaceId }, select: { revision: true } });
      await tx.cloudMutationReceipt.create({ data: receiptCreateData({
        workspaceId: workspace.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'FINANCIAL_EVENT_CREATE',
        revision: state?.revision || 0,
        response,
      }) });
    }
    return response;
  });
}
