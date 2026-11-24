import { prisma } from '@meg/database';
import { stage10QaWebWriteEnabled, stage10UnificationSyntheticMirrorEnabled } from '../app-state/stage10-qa-write-gate';
import { mirrorNewMonetaryExpenseToLegacyQa } from '../app-state/stage10-qa-web-mirror';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { financialAmountValues } from './amount-sign';
import { activeAccountForUser, activeCategoryForUser, activePaymentMethodForUser } from './catalog-scope';
import { isBenefitPaymentMethod, isMonetaryAccountType, isPostedFinancialStatus, resolveCanonicalFinancialStatus } from './financial-policy';
import { findRecentFinancialEventDuplicate, financialEventSuspicionFingerprint, monetaryAccountDebitWindow, serializableFinancialTransaction } from './monetary-protection';

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
  allowDuplicate?: boolean;
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

export async function createFinancialEventProtected(userId: string, input: CreateFinancialEventMutationInput, expectedWorkspaceId?: string) {
  if (input.type === 'transfer') {
    throw new FinancialEventMutationError('TRANSFER_CONTRACT_NOT_READY');
  }
  // Cliente com contexto fixo nao pode disparar bootstrap legado.
  const workspace = await resolveWorkspaceContext(userId,
    expectedWorkspaceId ? {allowLegacyBootstrap:false} : {});
  // PT114: o recibo de idempotencia e unico POR workspace, nao por usuario.
  // O header e opcional para preservar a APK708 anterior; clientes novos
  // devem fixar o workspace antes de POST/replay.
  if (expectedWorkspaceId && workspace.workspaceId !== expectedWorkspaceId) {
    throw new FinancialEventMutationError('WORKSPACE_CONTEXT_CHANGED');
  }
  const dataOwnerId = workspace.workspace.ownerId;
  const requestHash = input.operationId
    ? mutationRequestHash({ ...input, operationId: undefined, allowDuplicate: undefined })
    : null;

  try {
    return await serializableFinancialTransaction(async (tx) => {
      if (input.operationId && requestHash) {
        const previous = await tx.cloudMutationReceipt.findUnique({
          where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
        });
        if (previous) {
          if (previous.requestHash !== requestHash) throw new FinancialEventMutationError('OPERATION_ID_REUSED');
          return replayResponse(previous.response);
        }
      }

      const [account, category, paymentMethod] = await Promise.all([
        input.accountId ? activeAccountForUser(tx, dataOwnerId, input.accountId) : Promise.resolve(null),
        input.categoryId ? activeCategoryForUser(tx, dataOwnerId, input.categoryId) : Promise.resolve(null),
        input.paymentMethodId ? activePaymentMethodForUser(tx, dataOwnerId, input.paymentMethodId) : Promise.resolve(null),
      ]);
      if (input.accountId && !account) throw new FinancialEventMutationError('INVALID_ACCOUNT');
      if (input.categoryId && !category) throw new FinancialEventMutationError('INVALID_CATEGORY');
      if (input.paymentMethodId && !paymentMethod) throw new FinancialEventMutationError('INVALID_PAYMENT_METHOD');
      if ((account && String(account.type || '').trim().toLowerCase() === 'benefit')
        || (paymentMethod && isBenefitPaymentMethod(paymentMethod.name))) {
        throw new FinancialEventMutationError('BENEFIT_CONTRACT_REQUIRED');
      }

      const resolvedStatus = resolveCanonicalFinancialStatus({
        type: input.type,
        requestedStatus: input.status,
        category,
        paymentMethod,
      });
      const values = financialAmountValues(input.type, input.amount);
      // #699 Phase A: similarity is NON-BLOCKING. Every new operationId
      // represents a potentially distinct, legitimate expense. Never return
      // predecessor success or POSSIBLE_DUPLICATE/409 based on content/time.
      const duplicate = input.type === 'expense'
        ? await findRecentFinancialEventDuplicate(tx, {
            workspaceId: workspace.workspaceId,
            userId: dataOwnerId,
            description: input.description,
            type: input.type,
            status: resolvedStatus,
            date: input.date,
            competence: input.competence,
            notes: input.notes,
            amount: values.amount,
            signedAmount: values.signedAmount,
            accountId: input.accountId,
            categoryId: input.categoryId,
            paymentMethodId: input.paymentMethodId,
          })
        : null;

      // Both clients use the same financial authority. A new posted monetary
      // debit cannot overdraw this account on the transaction day or any
      // subsequent posted-event day. Retroactive creation is protected too.
      if (input.type === 'expense' && account && isMonetaryAccountType(account.type)
          && isPostedFinancialStatus(resolvedStatus) && Number(values.signedAmount) < 0) {
        let timeline: Awaited<ReturnType<typeof monetaryAccountDebitWindow>>;
        try {
          timeline = await monetaryAccountDebitWindow(
            tx, dataOwnerId, account, input.date, Math.round(-Number(values.signedAmount) * 100));
        } catch (error) {
          if (error instanceof Error && error.message === 'ACCOUNT_BALANCE_WINDOW_TOO_LARGE') {
            throw new FinancialEventMutationError('ACCOUNT_BALANCE_WINDOW_TOO_LARGE');
          }
          throw error;
        }
        if (!timeline.allowed) {
          throw new FinancialEventMutationError('INSUFFICIENT_ACCOUNT_BALANCE', {
            insufficientDay: timeline.insufficientDay,
          });
        }
      }

      // The second path is only for a freshly initialized synthetic database.
      // This does not enable a mirror on production or a persisted QA database.
      const qaMirror = stage10QaWebWriteEnabled() || stage10UnificationSyntheticMirrorEnabled();
      if (qaMirror && input.type !== 'expense') {
        throw new FinancialEventMutationError('STAGE10_QA_ONLY_MONETARY_EXPENSE_SUPPORTED');
      }
      const event = await tx.financialEvent.create({
        data: {
          userId: dataOwnerId,
          workspaceId: workspace.workspaceId,
          description: input.description.trim(),
          type: input.type,
          status: resolvedStatus,
          date: new Date(input.date),
          competence: input.competence || input.date.slice(0, 7),
          amount: values.amount,
          signedAmount: values.signedAmount,
          accountId: input.accountId,
          categoryId: input.categoryId,
          paymentMethodId: input.paymentMethodId,
          notes: input.notes?.trim() || undefined,
        },
        include: { account: true, category: true, paymentMethod: true },
      });

      let ledgerEntry = null;
      if (event.accountId && isPostedFinancialStatus(event.status)) {
        const value = Number(event.amount);
        ledgerEntry = await tx.ledgerEntry.create({
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

      const qaMirrorResult = qaMirror
        ? await mirrorNewMonetaryExpenseToLegacyQa(
            tx, workspace.workspaceId, dataOwnerId, event.id, input.amount,
          )
        : null;

      // A resposta já pode ser montada com o retorno do INSERT. Antes havia um
      // SELECT adicional apenas para reler o evento recém-criado.
      const result = { ...event, ledgerEntries: ledgerEntry ? [ledgerEntry] : [] };

      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'FinancialEvent',
        entityId: result.id,
        action: 'FINANCIAL_EVENT_CREATED',
        before: null,
        after: result,
        context: {
          operationId: input.operationId ?? null,
          competence: result.competence,
          workspaceId: workspace.workspaceId,
          duplicateOverride: Boolean(input.allowDuplicate),
          requestedStatus: input.status,
          resolvedStatus,
        },
      });

      if (duplicate) {
        const fingerprint = financialEventSuspicionFingerprint({
          workspaceId: workspace.workspaceId,
          userId: dataOwnerId,
          description: input.description,
          type: input.type,
          status: resolvedStatus,
          date: input.date,
          competence: input.competence,
          notes: input.notes,
          amount: values.amount,
          signedAmount: values.signedAmount,
          accountId: input.accountId,
          categoryId: input.categoryId,
          paymentMethodId: input.paymentMethodId,
        });
        const suspicionGroupId = 'financial-event-suspected-v1:' + duplicate.id + ':' + result.id;
        const context = {
          workspaceId: workspace.workspaceId,
          fingerprintVersion: 'finance-event-create-v1',
          fingerprint,
          suspicionGroupId,
          evidence: 'CONTENT_AND_TIME_ONLY',
          reviewStatus: 'SUSPECTED',
          createdEventId: result.id,
          incomingOperationId: input.operationId ?? null,
        };
        // Bilateral append-only markers in the SAME serializable transaction
        // as the new FinancialEvent, ledger, creation audit and receipt.
        await recordFinancialAudit(tx, {
          actorId: userId,
          entity: 'FinancialEvent',
          entityId: duplicate.id,
          action: 'FINANCIAL_EVENT_DUPLICATE_SUSPECTED',
          context: { ...context, peerEventId: result.id, relation: 'PREVIOUS_CANDIDATE' },
        });
        await recordFinancialAudit(tx, {
          actorId: userId,
          entity: 'FinancialEvent',
          entityId: result.id,
          action: 'FINANCIAL_EVENT_DUPLICATE_SUSPECTED',
          context: { ...context, peerEventId: duplicate.id, relation: 'NEW_DISTINCT_ID' },
        });
      }

      const response = {
        ...result,
        ...(qaMirrorResult ? {legacyTransactionId:qaMirrorResult.legacyTransactionId, appStateRevision:qaMirrorResult.revision} : {}),
        idempotentReplay: false,
      };
      if (input.operationId && requestHash) {
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
    }, { maxAttempts: 12, retryDelayMs: 35 });
  } catch (error) {
    // Duas requisições iguais podem atravessar simultaneamente a consulta inicial do recibo.
    // A unicidade workspaceId+operationId faz uma delas reverter inteira; após o rollback,
    // relê-se o recibo vencedor para transformar o conflito em replay do mesmo comando.
    if (input.operationId && requestHash && isUniqueConflict(error)) {
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
