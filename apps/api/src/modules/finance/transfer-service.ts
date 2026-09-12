import { Prisma } from '@prisma/client';
import { prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { isFutureFinancialDay, isMonetaryAccountType, isPostedFinancialStatus, serializableFinancialTransaction } from './monetary-protection';
import { buildTransferLegs } from './transfer-core';

export class FinancialTransferError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

export type CreateFinancialTransferInput = {
  operationId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  description?: string;
  notes?: string;
};

function nextDayExclusive(day: string) {
  const match = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new FinancialTransferError('INVALID_TRANSFER_DATE');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  if (Number.isNaN(date.getTime())) throw new FinancialTransferError('INVALID_TRANSFER_DATE');
  return date;
}

async function sourceAccountBalanceAt(
  tx: Prisma.TransactionClient,
  userId: string,
  account: { id: string; openingBalance: Prisma.Decimal },
  day: string,
) {
  const cutoff = nextDayExclusive(day);
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

export async function createFinancialTransfer(userId: string, input: CreateFinancialTransferInput) {
  const operationId = input.operationId.trim();
  if (operationId.length < 8 || operationId.length > 128) throw new FinancialTransferError('INVALID_OPERATION_ID');
  if (isFutureFinancialDay(input.date)) throw new FinancialTransferError('FUTURE_TRANSFER_NOT_ALLOWED');

  let legs;
  try {
    legs = buildTransferLegs({
      transferId: operationId,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amount: input.amount,
      date: input.date,
      status: 'paid',
      description: input.description,
      notes: input.notes,
    });
  } catch (error) {
    if (error instanceof Error) throw new FinancialTransferError(error.message);
    throw error;
  }

  const workspace = await resolveWorkspaceContext(userId);
  const requestHash = mutationRequestHash({ ...input, operationId: undefined });

  return serializableFinancialTransaction(async (tx) => {
    const previous = await tx.cloudMutationReceipt.findUnique({
      where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId } },
    });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new FinancialTransferError('OPERATION_ID_REUSED');
      return { ...(previous.response as Record<string, unknown>), idempotentReplay: true };
    }

    const accounts = await tx.account.findMany({
      where: {
        userId,
        isActive: true,
        id: { in: [input.sourceAccountId, input.destinationAccountId] },
      },
      select: { id: true, name: true, type: true, openingBalance: true },
    });
    const source = accounts.find((account) => account.id === input.sourceAccountId);
    const destination = accounts.find((account) => account.id === input.destinationAccountId);
    if (!source) throw new FinancialTransferError('INVALID_SOURCE_ACCOUNT');
    if (!destination) throw new FinancialTransferError('INVALID_DESTINATION_ACCOUNT');
    if (!isMonetaryAccountType(source.type)) throw new FinancialTransferError('SOURCE_ACCOUNT_NOT_MONETARY');
    if (!isMonetaryAccountType(destination.type)) throw new FinancialTransferError('DESTINATION_ACCOUNT_NOT_MONETARY');

    const sourceBalanceBefore = await sourceAccountBalanceAt(tx, userId, source, input.date);
    const requested = Math.round(Number(input.amount) * 100) / 100;
    if (requested > sourceBalanceBefore) {
      throw new FinancialTransferError('INSUFFICIENT_SOURCE_ACCOUNT_BALANCE', {
        available: sourceBalanceBefore,
        requested,
        missing: Math.round((requested - sourceBalanceBefore) * 100) / 100,
      });
    }

    const created = [];
    for (const leg of legs) {
      const event = await tx.financialEvent.create({
        data: {
          userId,
          workspaceId: workspace.workspaceId,
          description: leg.description,
          type: leg.type,
          status: leg.status,
          date: new Date(`${leg.date.slice(0, 10)}T12:00:00.000Z`),
          competence: leg.competence,
          amount: leg.amount,
          signedAmount: leg.signedAmount,
          accountId: leg.accountId,
          notes: leg.notes,
          sourcePayload: leg.sourcePayload as Prisma.InputJsonValue,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          eventId: event.id,
          date: event.date,
          accountId: leg.accountId,
          debit: leg.signedAmount >= 0 ? leg.amount : 0,
          credit: leg.signedAmount < 0 ? leg.amount : 0,
          memo: `${leg.description} · ${leg.leg}`,
        },
      });
      created.push(event);
    }

    const response = {
      transferId: operationId,
      sourceEventId: created[0].id,
      destinationEventId: created[1].id,
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: requested,
      date: input.date.slice(0, 10),
      sourceBalanceBefore,
      sourceBalanceAfter: Math.round((sourceBalanceBefore - requested) * 100) / 100,
      idempotentReplay: false,
    };

    await recordFinancialAudit(tx, {
      actorId: userId,
      entity: 'FinancialTransfer',
      entityId: operationId,
      action: 'FINANCIAL_TRANSFER_CREATED',
      after: response,
      context: {
        workspaceId: workspace.workspaceId,
        sourceAccountName: source.name,
        destinationAccountName: destination.name,
      },
    });

    const state = await tx.appState.findUnique({
      where: { workspaceId: workspace.workspaceId },
      select: { revision: true },
    });
    await tx.cloudMutationReceipt.create({
      data: receiptCreateData({
        workspaceId: workspace.workspaceId,
        operationId,
        requestHash,
        mutationType: 'FINANCIAL_TRANSFER_CREATE',
        revision: state?.revision || 0,
        response,
      }),
    });

    return response;
  });
}
