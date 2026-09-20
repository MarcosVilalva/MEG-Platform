import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { writeBackNormalizedEventsToAppState } from '../app-state/normalized-primary-writeback';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { financialAmountValues, enteredAmountFromStored } from './amount-sign';
import { assertActiveCatalogReferences } from './catalog-scope';
import { serializableFinancialTransaction } from './monetary-protection';
import { FinancialEventMutationError } from './event-mutation';

type Tx = Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;

export type BulkLegacyTransactionPatch = {
  launchType?: string;
  situation?: string;
  account?: string;
  paymentMethod?: string;
  group?: string;
  category?: string;
  classification?: string;
  modality?: string;
  financialAccountId?: string;
  paymentMethodId?: string;
  categoryId?: string;
  incomeAmount?: number;
  expenseAmount?: number;
  amount?: number;
};

export type BulkEventChanges = {
  date?: string;
  description?: string;
  type?: 'income' | 'expense';
  status?: 'planned' | 'paid' | 'reconciled';
  amount?: number;
  notes?: string | null;
  accountId?: string | null;
  paymentMethodId?: string | null;
  categoryId?: string | null;
  legacy?: BulkLegacyTransactionPatch;
};

export type BulkEventUpdateInput = {
  ids: string[];
  changes: BulkEventChanges;
  expectedUpdatedAtById?: Record<string, string>;
  operationId: string;
};

export type BulkEventArchiveInput = {
  ids: string[];
  expectedUpdatedAtById?: Record<string, string>;
  operationId: string;
};

function isPosted(status: string) {
  return status === 'paid' || status === 'reconciled' || status === 'confirmed';
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

function canonicalIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function assertExpectedEventVersions(
  events: Array<{ id: string; updatedAt: Date }>,
  expectedUpdatedAtById?: Record<string, string>,
) {
  if (!expectedUpdatedAtById) return;
  for (const event of events) {
    const expected = expectedUpdatedAtById[event.id];
    if (!expected) continue;
    const current = event.updatedAt.toISOString();
    if (current !== expected) {
      throw new FinancialEventMutationError('FINANCIAL_EVENT_STALE_VERSION', {
        id: event.id,
        expectedUpdatedAt: expected,
        currentUpdatedAt: current,
      });
    }
  }
}

async function readEditableEvents(tx: Tx, userId: string, ids: string[]) {
  const events = await tx.financialEvent.findMany({
    where: { id: { in: ids }, userId, archivedAt: null },
    include: {
      account: true,
      category: true,
      paymentMethod: true,
      ledgerEntries: true,
      receipt: { select: { id: true } },
      payablePayment: { select: { id: true } },
    },
  });

  if (events.length !== ids.length) {
    const found = new Set(events.map((item) => item.id));
    throw new FinancialEventMutationError('FINANCIAL_EVENT_NOT_FOUND', {
      ids: ids.filter((id) => !found.has(id)),
    });
  }

  const linked = events.filter((event) => event.receipt || event.payablePayment).map((event) => event.id);
  if (linked.length) {
    throw new FinancialEventMutationError('FINANCIAL_EVENT_LINKED_DOMAIN', { ids: linked });
  }

  return events;
}

async function rebuildLedgers(tx: Tx, eventIds: string[]) {
  await tx.ledgerEntry.deleteMany({ where: { eventId: { in: eventIds } } });
  const events = await tx.financialEvent.findMany({
    where: { id: { in: eventIds }, archivedAt: null },
    select: {
      id: true,
      date: true,
      accountId: true,
      status: true,
      amount: true,
      signedAmount: true,
      description: true,
    },
  });

  const posted = events.filter((event) => event.accountId && isPosted(event.status));
  if (!posted.length) return;

  await tx.ledgerEntry.createMany({
    data: posted.map((event) => ({
      eventId: event.id,
      date: event.date,
      accountId: event.accountId!,
      debit: Number(event.signedAmount) >= 0 ? Number(event.amount) : 0,
      credit: Number(event.signedAmount) < 0 ? Number(event.amount) : 0,
      memo: event.description,
    })),
  });
}

async function createReceipt(tx: Tx, input: {
  workspaceId: string;
  operationId: string;
  requestHash: string;
  mutationType: string;
  response: unknown;
}) {
  const state = await tx.appState.findUnique({
    where: { workspaceId: input.workspaceId },
    select: { revision: true },
  });
  await tx.cloudMutationReceipt.create({
    data: receiptCreateData({
      workspaceId: input.workspaceId,
      operationId: input.operationId,
      requestHash: input.requestHash,
      mutationType: input.mutationType,
      revision: state?.revision || 0,
      response: input.response,
    }),
  });
}

export async function updateFinancialEventsBulkProtected(userId: string, rawInput: BulkEventUpdateInput) {
  const ids = canonicalIds(rawInput.ids);
  const input = { ...rawInput, ids };
  const workspace = await resolveWorkspaceContext(userId);
  const requestHash = mutationRequestHash({ ids, changes: input.changes, expectedUpdatedAtById: input.expectedUpdatedAtById || null });

  try {
    return await serializableFinancialTransaction(async (tx) => {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new FinancialEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }

      try {
        await assertActiveCatalogReferences(tx, userId, {
          accountId: input.changes.accountId,
          categoryId: input.changes.categoryId,
          paymentMethodId: input.changes.paymentMethodId,
        });
      } catch (error) {
        if (error instanceof Error && ['INVALID_ACCOUNT', 'INVALID_CATEGORY', 'INVALID_PAYMENT_METHOD'].includes(error.message)) {
          throw new FinancialEventMutationError(error.message);
        }
        throw error;
      }

      const before = await readEditableEvents(tx, userId, ids);
      assertExpectedEventVersions(before, input.expectedUpdatedAtById);
      const date = input.changes.date ? new Date(input.changes.date) : undefined;

      for (const event of before) {
        const nextType = input.changes.type || event.type;
        const amountChanged = input.changes.amount !== undefined || input.changes.type !== undefined;
        const enteredAmount = input.changes.amount !== undefined
          ? input.changes.amount
          : enteredAmountFromStored(event.type, Number(event.signedAmount));
        const amountValues = financialAmountValues(nextType, enteredAmount);
        const sourcePayload = input.changes.legacy
          ? { ...jsonRecord(event.sourcePayload), ...input.changes.legacy } as Prisma.InputJsonValue
          : undefined;

        await tx.financialEvent.update({
          where: { id: event.id },
          data: {
            date,
            competence: input.changes.date ? input.changes.date.slice(0, 7) : undefined,
            description: input.changes.description?.trim(),
            type: input.changes.type,
            status: input.changes.status,
            amount: amountChanged ? amountValues.amount : undefined,
            signedAmount: amountChanged ? amountValues.signedAmount : undefined,
            notes: input.changes.notes,
            accountId: input.changes.accountId,
            paymentMethodId: input.changes.paymentMethodId,
            categoryId: input.changes.categoryId,
            sourcePayload,
          },
        });
      }

      await rebuildLedgers(tx, ids);

      const afterBeforeMirror = await tx.financialEvent.findMany({
        where: { id: { in: ids } },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      await writeBackNormalizedEventsToAppState(tx, workspace.workspaceId, afterBeforeMirror);

      const after = await tx.financialEvent.findMany({
        where: { id: { in: ids } },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      const beforeById = new Map(before.map((event) => [event.id, event]));

      for (const event of after) {
        await recordFinancialAudit(tx, {
          actorId: userId,
          entity: 'FinancialEvent',
          entityId: event.id,
          action: 'FINANCIAL_EVENT_UPDATED',
          before: beforeById.get(event.id),
          after: event,
          context: {
            operationId: input.operationId,
            bulk: true,
            selectionSize: ids.length,
            changedFields: Object.keys(input.changes),
            workspaceId: workspace.workspaceId,
          },
        });
      }

      const response = {
        ids,
        updated: after.length,
        events: after,
        idempotentReplay: false,
      };
      await createReceipt(tx, {
        workspaceId: workspace.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'FINANCIAL_EVENT_BULK_UPDATE',
        response,
      });
      return response;
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      const previous = await prisma.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new FinancialEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}

export async function archiveFinancialEventsBulkProtected(userId: string, rawInput: BulkEventArchiveInput) {
  const ids = canonicalIds(rawInput.ids);
  const input = { ...rawInput, ids };
  const workspace = await resolveWorkspaceContext(userId);
  const requestHash = mutationRequestHash({ ids, archive: true, expectedUpdatedAtById: input.expectedUpdatedAtById || null });

  try {
    return await serializableFinancialTransaction(async (tx) => {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new FinancialEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }

      const before = await readEditableEvents(tx, userId, ids);
      assertExpectedEventVersions(before, input.expectedUpdatedAtById);
      const archivedAt = new Date();
      await tx.ledgerEntry.deleteMany({ where: { eventId: { in: ids } } });

      for (const event of before) {
        const after = await tx.financialEvent.update({
          where: { id: event.id },
          data: { status: 'archived', archivedAt },
        });
        await recordFinancialAudit(tx, {
          actorId: userId,
          entity: 'FinancialEvent',
          entityId: event.id,
          action: 'FINANCIAL_EVENT_ARCHIVED',
          before: event,
          after,
          context: {
            operationId: input.operationId,
            bulk: true,
            selectionSize: ids.length,
            workspaceId: workspace.workspaceId,
          },
        });
      }

      await writeBackNormalizedEventsToAppState(
        tx,
        workspace.workspaceId,
        [],
        before.map((event) => event.legacyTransactionId).filter((id): id is string => Boolean(id)),
      );

      const response = { ids, archived: ids.length, idempotentReplay: false };
      await createReceipt(tx, {
        workspaceId: workspace.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'FINANCIAL_EVENT_BULK_ARCHIVE',
        response,
      });
      return response;
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      const previous = await prisma.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new FinancialEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}
