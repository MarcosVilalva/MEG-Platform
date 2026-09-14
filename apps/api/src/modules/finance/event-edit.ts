import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { writeBackNormalizedEventsToAppState } from '../app-state/normalized-primary-writeback';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { enteredAmountFromStored, financialAmountValues } from './amount-sign';
import { assertActiveCatalogReferences } from './catalog-scope';
import { FinancialEventMutationError } from './event-mutation';
import { serializableFinancialTransaction } from './monetary-protection';

export type ProtectedFinancialEventEditInput = {
  description?: string;
  date?: string;
  amount?: number;
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  notes?: string;
  modality?: string;
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

function mergeSourcePayload(raw: Prisma.JsonValue | null, modality: string | undefined): Prisma.InputJsonValue | undefined {
  if (modality === undefined) return undefined;
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
    : {};
  source.modality = modality.trim();
  return source as Prisma.InputJsonObject;
}

export async function editFinancialEventProtected(
  userId: string,
  eventId: string,
  input: ProtectedFinancialEventEditInput,
) {
  const workspace = await resolveWorkspaceContext(userId);
  const requestHash = mutationRequestHash({ eventId, ...input, operationId: undefined });

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
        await assertActiveCatalogReferences(tx, userId, input);
      } catch (error) {
        if (error instanceof Error && ['INVALID_ACCOUNT', 'INVALID_CATEGORY', 'INVALID_PAYMENT_METHOD'].includes(error.message)) {
          throw new FinancialEventMutationError(error.message);
        }
        throw error;
      }

      const before = await tx.financialEvent.findFirst({
        where: { id: eventId, userId, archivedAt: null },
        include: {
          account: true,
          category: true,
          paymentMethod: true,
          ledgerEntries: true,
          receipt: { select: { id: true } },
          payablePayment: { select: { id: true } },
        },
      });
      if (!before) throw new FinancialEventMutationError('FINANCIAL_EVENT_NOT_FOUND');
      if (before.receipt || before.payablePayment) {
        throw new FinancialEventMutationError('FINANCIAL_EVENT_LINKED_DOMAIN', { ids: [eventId] });
      }
      if (before.type === 'transfer') {
        throw new FinancialEventMutationError('TRANSFER_EDIT_NOT_SUPPORTED');
      }

      const enteredAmount = input.amount === undefined
        ? enteredAmountFromStored(before.type, Number(before.signedAmount))
        : input.amount;
      const values = financialAmountValues(before.type, enteredAmount);
      const date = input.date ? new Date(input.date) : undefined;

      await tx.financialEvent.update({
        where: { id: eventId },
        data: {
          description: input.description === undefined ? undefined : input.description.trim(),
          date,
          competence: input.date ? input.date.slice(0, 7) : undefined,
          amount: input.amount === undefined ? undefined : values.amount,
          signedAmount: input.amount === undefined ? undefined : values.signedAmount,
          accountId: input.accountId,
          categoryId: input.categoryId,
          paymentMethodId: input.paymentMethodId,
          notes: input.notes === undefined ? undefined : input.notes.trim() || null,
          sourcePayload: mergeSourcePayload(before.sourcePayload, input.modality),
        },
      });

      await tx.ledgerEntry.deleteMany({ where: { eventId } });
      const mirrored = await tx.financialEvent.findUnique({
        where: { id: eventId },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!mirrored) throw new FinancialEventMutationError('FINANCIAL_EVENT_NOT_FOUND');

      if (mirrored.accountId && isPosted(mirrored.status)) {
        await tx.ledgerEntry.create({
          data: {
            eventId: mirrored.id,
            date: mirrored.date,
            accountId: mirrored.accountId,
            debit: Number(mirrored.signedAmount) >= 0 ? Number(mirrored.amount) : 0,
            credit: Number(mirrored.signedAmount) < 0 ? Number(mirrored.amount) : 0,
            memo: mirrored.description,
          },
        });
      }

      const beforeMirror = await tx.financialEvent.findUnique({
        where: { id: eventId },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!beforeMirror) throw new FinancialEventMutationError('FINANCIAL_EVENT_NOT_FOUND');
      await writeBackNormalizedEventsToAppState(tx, workspace.workspaceId, [beforeMirror]);

      const after = await tx.financialEvent.findUnique({
        where: { id: eventId },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      if (!after) throw new FinancialEventMutationError('FINANCIAL_EVENT_NOT_FOUND');

      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'FinancialEvent',
        entityId: eventId,
        action: 'FINANCIAL_EVENT_UPDATED',
        before,
        after,
        context: {
          operationId: input.operationId,
          protectedEdit: true,
          changedFields: Object.keys(input).filter((key) => key !== 'operationId'),
          workspaceId: workspace.workspaceId,
        },
      });

      const response = { event: after, idempotentReplay: false };
      const state = await tx.appState.findUnique({
        where: { workspaceId: workspace.workspaceId },
        select: { revision: true },
      });
      await tx.cloudMutationReceipt.create({
        data: receiptCreateData({
          workspaceId: workspace.workspaceId,
          operationId: input.operationId,
          requestHash,
          mutationType: 'FINANCIAL_EVENT_UPDATE_PROTECTED',
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
        if (previous.requestHash !== requestHash) throw new FinancialEventMutationError('OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}
