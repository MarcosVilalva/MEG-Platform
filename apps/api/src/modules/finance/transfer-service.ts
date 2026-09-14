import { Prisma, prisma } from '@meg/database';
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
      archivedAt: null,
      accountId: account.id,
      date: { lt: cutoff },
    },
    select: { type: true, amount: true, status: true },
  });

  return events
    .filter((event) => isPostedFinancialStatus(event.type, event.status))
    .reduce((sum, event) => {
      const amount = Number(event.amount);
      return event.type === 'INCOME' ? sum + amount : sum - amount;
    }, Number(account.openingBalance));
}

export async function createFinancialTransfer(actorId: string, input: CreateFinancialTransferInput) {
  const context = await resolveWorkspaceContext(actorId);
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new FinancialTransferError('TRANSFER_AMOUNT_MUST_BE_POSITIVE');
  if (!input.operationId?.trim()) throw new FinancialTransferError('OPERATION_ID_REQUIRED');
  if (!input.sourceAccountId || !input.destinationAccountId) throw new FinancialTransferError('TRANSFER_ACCOUNT_REQUIRED');
  if (input.sourceAccountId === input.destinationAccountId) throw new FinancialTransferError('TRANSFER_ACCOUNTS_MUST_DIFFER');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new FinancialTransferError('INVALID_TRANSFER_DATE');
  if (isFutureFinancialDay(input.date)) throw new FinancialTransferError('FUTURE_FINANCIAL_DATE');

  const requestHash = mutationRequestHash('FINANCIAL_TRANSFER_CREATE', {
    sourceAccountId: input.sourceAccountId,
    destinationAccountId: input.destinationAccountId,
    amount,
    date: input.date,
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
  });

  return serializableFinancialTransaction(async (tx) => {
    const existingReceipt = await tx.mutationReceipt.findUnique({
      where: {
        workspaceId_operationId: {
          workspaceId: context.workspaceId,
          operationId: input.operationId,
        },
      },
    });
    if (existingReceipt) {
      if (existingReceipt.requestHash !== requestHash) {
        throw new FinancialTransferError('OPERATION_ID_REUSED_WITH_DIFFERENT_PAYLOAD');
      }
      return existingReceipt.responsePayload as unknown;
    }

    const accounts = await tx.financialAccount.findMany({
      where: {
        userId: context.ownerId,
        id: { in: [input.sourceAccountId, input.destinationAccountId] },
      },
    });
    const sourceAccount = accounts.find((account) => account.id === input.sourceAccountId);
    const destinationAccount = accounts.find((account) => account.id === input.destinationAccountId);
    if (!sourceAccount || !destinationAccount) throw new FinancialTransferError('ACCOUNT_NOT_FOUND');
    if (!sourceAccount.isActive || !destinationAccount.isActive) throw new FinancialTransferError('ACCOUNT_INACTIVE');
    if (!isMonetaryAccountType(sourceAccount.type) || !isMonetaryAccountType(destinationAccount.type)) {
      throw new FinancialTransferError('TRANSFER_ACCOUNT_MUST_BE_MONETARY');
    }

    const sourceBalance = await sourceAccountBalanceAt(tx, context.ownerId, sourceAccount, input.date);
    if (sourceBalance + 0.000001 < amount) {
      throw new FinancialTransferError('INSUFFICIENT_AVAILABLE_BALANCE', { available: sourceBalance, required: amount });
    }

    const transferGroupId = crypto.randomUUID();
    const legs = buildTransferLegs({
      amount,
      sourceAccountId: sourceAccount.id,
      destinationAccountId: destinationAccount.id,
      description: input.description,
      notes: input.notes,
    });

    const eventDate = new Date(`${input.date}T12:00:00.000Z`);
    const createdEvents = [];
    for (const leg of legs) {
      const event = await tx.financialEvent.create({
        data: {
          userId: context.ownerId,
          accountId: leg.accountId,
          transferGroupId,
          type: leg.type,
          amount: new Prisma.Decimal(leg.amount),
          date: eventDate,
          description: leg.description,
          status: 'PAID',
          notes: leg.notes,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: context.ownerId,
          eventId: event.id,
          accountId: leg.accountId,
          type: event.type,
          amount: event.amount,
          date: event.date,
          description: event.description,
        },
      });
      createdEvents.push(event);
    }

    await recordFinancialAudit(tx, {
      actorId,
      ownerId: context.ownerId,
      action: 'FINANCIAL_TRANSFER_CREATED',
      entityId: transferGroupId,
      metadata: {
        workspaceId: context.workspaceId,
        transferGroupId,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,
        amount,
        date: input.date,
        eventIds: createdEvents.map((event) => event.id),
      },
    });

    const response = {
      transferGroupId,
      sourceAccount: { id: sourceAccount.id, name: sourceAccount.name },
      destinationAccount: { id: destinationAccount.id, name: destinationAccount.name },
      amount,
      date: input.date,
      eventIds: createdEvents.map((event) => event.id),
    };

    await tx.mutationReceipt.create({
      data: receiptCreateData({
        workspaceId: context.workspaceId,
        actorId,
        operationId: input.operationId,
        action: 'FINANCIAL_TRANSFER_CREATE',
        requestHash,
        responsePayload: response,
      }),
    });

    return response;
  });
}
