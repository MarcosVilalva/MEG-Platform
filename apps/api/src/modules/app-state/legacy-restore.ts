import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from './mutation-receipt';
import { isNormalizedPrimary } from './normalization-migration';
import { writeBackNormalizedEventsToAppState } from './normalized-primary-writeback';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from '../finance/audit';
import { isBenefitFinancialEvent, isMonetaryAccountType, isPostedFinancialStatus } from '../finance/financial-policy';
import { monetaryAccountBalanceAt, serializableFinancialTransaction } from '../finance/monetary-protection';
import { syncLedger } from '../finance/service';

/**
 * O endpoint de recuperacao so e registrado na API QA descartavel.
 * Nao permite ativacao produtiva por simples flag sem isolamento fisico do PG17.
 */
export function stage10RestoreQaEnabled() {
  if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
      || process.env.MEG_STAGE10_LEGACY_RESTORE_QA !== '1') return false;
  try {
    const db = new URL(process.env.DATABASE_URL || '');
    return db.hostname === '127.0.0.1'
      && db.pathname === '/meg_stage10_sandbox'
      && db.username === 'meg_stage10_ci';
  } catch {
    return false;
  }
}

export type ExplicitLegacyRestoreInput = {
  legacyId: string;
  eventId: string;
  operationId: string;
  expectedRevision: number;
  expectedArchivedAt: string;
  expectedUpdatedAt: string;
  confirmation: 'CONFIRMAR_RESTAURACAO_EXPLICITA';
};

export class LegacyRestoreError extends Error {
  constructor(public code: string) { super(code); }
}

function assertQa() {
  if (!stage10RestoreQaEnabled()) throw new LegacyRestoreError('STAGE10_RESTORE_QA_DISABLED');
}

type ArchivedEventWithRelations = NonNullable<Awaited<ReturnType<typeof findArchivedForRestore>>>;
async function findArchivedForRestore(tx: Prisma.TransactionClient, ownerId: string, workspaceId: string, legacyId: string) {
  return tx.financialEvent.findFirst({
    where: { workspaceId, userId: ownerId, legacyTransactionId: legacyId },
    include: {
      account: true, category: true, paymentMethod: true,
      ledgerEntries: { select: { id: true }, take: 1 },
      receipt: { select: { id: true } },
      payablePayment: { select: { id: true } },
      importedRow: { select: { id: true } },
    },
  });
}

function activeLegacyIds(state: unknown) {
  const source = state && typeof state === 'object' && !Array.isArray(state)
    ? state as Record<string, unknown> : {};
  return Array.isArray(source.transactions) ? source.transactions
    .map(item => item && typeof item === 'object' && !Array.isArray(item)
      ? String((item as Record<string, unknown>).id || '') : '') : [];
}

function normalize(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

/** Falha fechada: beneficios, cartoes, transfers e outros dominios nao passam por este writer. */
function restoreBlockReason(event: ArchivedEventWithRelations, state: unknown) {
  if (!event.archivedAt) return 'RESTORE_EVENT_NOT_ARCHIVED';
  if (event.status === 'archived') return 'RESTORE_PREVIOUS_STATUS_UNAVAILABLE';
  if (!['income','expense'].includes(event.type)
    || !['paid','planned','confirmed','reconciled','draft'].includes(event.status)) {
    return 'RESTORE_FINANCIAL_DOMAIN_UNSUPPORTED';
  }
  if (!event.legacyTransactionId) return 'RESTORE_LEGACY_ID_REQUIRED';
  if (activeLegacyIds(state).includes(event.legacyTransactionId)) return 'RESTORE_MIRROR_ALREADY_PRESENT';
  if (event.ledgerEntries.length || event.receipt || event.payablePayment || event.importedRow) {
    return 'RESTORE_LINKED_DOMAIN_REQUIRES_CANONICAL_WRITER';
  }
  if (!event.account || !event.account.isActive
    || event.account.userId !== event.userId || !isMonetaryAccountType(event.account.type)) {
    return 'RESTORE_MONETARY_ACCOUNT_REQUIRED';
  }
  if (isBenefitFinancialEvent(event) || normalize(event.paymentMethod?.type) === 'CREDIT') {
    return 'RESTORE_SPECIAL_FINANCIAL_DOMAIN_REQUIRED';
  }
  const source = event.sourcePayload && typeof event.sourcePayload === 'object'
    && !Array.isArray(event.sourcePayload)
    ? event.sourcePayload as Record<string, unknown> : {};
  const labels = [source.modality, source.financialScope, source.paymentMethod].map(normalize).join(' ');
  if (labels.includes('CREDITO') || labels.includes('CARTAO') || labels.includes('VEROCARD') || labels.includes('BENEFIT')) {
    return 'RESTORE_SPECIAL_FINANCIAL_DOMAIN_REQUIRED';
  }
  if (event.categoryId && (
    !event.category || !event.category.isActive || event.category.userId !== event.userId
    || (event.category.type && event.category.type !== event.type)
  )) return 'RESTORE_CATEGORY_INACTIVE_OR_MISMATCH';
  if (event.paymentMethodId && (
    !event.paymentMethod || !event.paymentMethod.isActive || event.paymentMethod.userId !== event.userId
  )) return 'RESTORE_PAYMENT_METHOD_INACTIVE_OR_MISMATCH';
  return null;
}

/** Metadata autorizada, nao expõe conteudo de lancamento ou faz mutacao. */
export async function previewLegacyRestore(actorId: string, legacyId: string) {
  assertQa();
  const context = await resolveWorkspaceContext(actorId);
  const ownerId = context.workspace.ownerId;
  return prisma.$transaction(async tx => {
    const [state, event] = await Promise.all([
      tx.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true, state: true } }),
      findArchivedForRestore(tx, ownerId, context.workspaceId, legacyId),
    ]);
    if (!event) throw new LegacyRestoreError('RESTORE_EVENT_NOT_FOUND');
    const reason = !state || !isNormalizedPrimary(state.state) ? 'RESTORE_NORMALIZED_PRIMARY_REQUIRED'
      : restoreBlockReason(event, state.state);
    return {
      protocol: 'meg-explicit-legacy-restore-qa-v1' as const,
      eligible: reason === null, reason,
      eventId: event.id, legacyTransactionId: event.legacyTransactionId,
      expectedRevision: state?.revision ?? null,
      expectedArchivedAt: event.archivedAt?.toISOString() ?? null,
      expectedUpdatedAt: event.updatedAt.toISOString(),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

/**
 * Comando NOVO autenticado, nunca aceite por PATCH legado.
 * A intencao exige ID financeiro, tombstone e revisao lidos separadamente
 * e a palavra de confirmacao; clientes offline antigos nao conseguem inventa-la.
 * Reutiliza ledger, politica de saldo, writeback e auditoria canonicos.
 */
export async function restoreLegacyFinancialEventQa(actorId: string, input: ExplicitLegacyRestoreInput) {
  assertQa();
  const context = await resolveWorkspaceContext(actorId);
  const ownerId = context.workspace.ownerId;
  const requestHash = mutationRequestHash({
    contract: 'meg-explicit-legacy-restore-qa-v1',
    actorId, legacyId: input.legacyId, eventId: input.eventId,
    expectedRevision: input.expectedRevision,
    expectedArchivedAt: input.expectedArchivedAt,
    expectedUpdatedAt: input.expectedUpdatedAt,
    confirmation: input.confirmation,
  });

  try {
    return await serializableFinancialTransaction(async tx => {
      const prior = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: context.workspaceId, operationId: input.operationId } },
      });
      if (prior) {
        if (prior.requestHash !== requestHash || prior.mutationType !== 'EXPLICIT_LEGACY_RESTORE_QA') {
          throw new LegacyRestoreError('OPERATION_ID_REUSED');
        }
        return { ...(prior.response as Record<string, unknown>), idempotentReplay: true };
      }

      const state = await tx.appState.findUnique({
        where: { workspaceId: context.workspaceId }, select: { id: true, state: true, revision: true },
      });
      if (!state || !isNormalizedPrimary(state.state)) {
        throw new LegacyRestoreError('RESTORE_NORMALIZED_PRIMARY_REQUIRED');
      }
      if (state.revision !== input.expectedRevision) {
        throw new LegacyRestoreError('RESTORE_REVISION_CONFLICT');
      }
      const event = await findArchivedForRestore(tx, ownerId, context.workspaceId, input.legacyId);
      if (!event) throw new LegacyRestoreError('RESTORE_EVENT_NOT_FOUND');
      if (event.id !== input.eventId) throw new LegacyRestoreError('RESTORE_EVENT_ID_MISMATCH');
      const reason = restoreBlockReason(event, state.state);
      if (reason) throw new LegacyRestoreError(reason);
      if (event.archivedAt?.toISOString() !== input.expectedArchivedAt
        || event.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        throw new LegacyRestoreError('RESTORE_STALE_TOMBSTONE');
      }

      // Somente a autoridade canonica verifica saldo; sem regra financeira na Web.
      if (isPostedFinancialStatus(event.status) && Number(event.signedAmount) < 0) {
        const account = event.account!;
        const balance = await monetaryAccountBalanceAt(
          tx, ownerId, { id: account.id, openingBalance: account.openingBalance },
          event.date.toISOString().slice(0, 10),
        );
        if (Math.round((balance + Number(event.signedAmount)) * 100) < 0) {
          throw new LegacyRestoreError('RESTORE_INSUFFICIENT_MONETARY_BALANCE');
        }
      }

      const updated = await tx.financialEvent.updateMany({
        where: {
          id: event.id, workspaceId: context.workspaceId, userId: ownerId,
          archivedAt: event.archivedAt, updatedAt: event.updatedAt,
        },
        data: { archivedAt: null, sourceRevision: state.revision + 1 },
      });
      if (updated.count !== 1) throw new LegacyRestoreError('RESTORE_STALE_TOMBSTONE');
      await syncLedger(tx, event.id);
      const restored = await tx.financialEvent.findUniqueOrThrow({
        where: { id: event.id },
        include: { account: true, category: true, paymentMethod: true, ledgerEntries: true },
      });
      const mirror = await writeBackNormalizedEventsToAppState(tx, context.workspaceId, [restored]);
      if (!mirror.active || !mirror.changed) throw new LegacyRestoreError('RESTORE_MIRROR_NOT_CONFIRMED');

      await recordFinancialAudit(tx, {
        actorId, entity: 'FinancialEvent', entityId: event.id,
        action: 'FINANCIAL_EVENT_RESTORED', before: event, after: restored,
        context: {
          workspaceId: context.workspaceId,
          contract: 'meg-explicit-legacy-restore-qa-v1',
          operationId: input.operationId,
          priorArchivedAt: input.expectedArchivedAt,
          beforeRevision: state.revision,
          afterRevision: mirror.revision,
        },
      });
      const result = {
        protocol: 'meg-explicit-legacy-restore-qa-v1',
        id: restored.id, legacyTransactionId: restored.legacyTransactionId,
        archived: false, revision: mirror.revision,
        operationId: input.operationId,
        idempotentReplay: false,
      };
      await tx.cloudMutationReceipt.create({
        data: receiptCreateData({
          workspaceId: context.workspaceId, operationId: input.operationId,
          requestHash, mutationType: 'EXPLICIT_LEGACY_RESTORE_QA',
          revision: mirror.revision, response: result,
        }),
      });
      return result;
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error
      && (error as { code?: string }).code === 'P2002') {
      const prior = await prisma.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: context.workspaceId, operationId: input.operationId } },
      });
      if (prior) {
        if (prior.requestHash !== requestHash || prior.mutationType !== 'EXPLICIT_LEGACY_RESTORE_QA') {
          throw new LegacyRestoreError('OPERATION_ID_REUSED');
        }
        return { ...(prior.response as Record<string, unknown>), idempotentReplay: true };
      }
    }
    throw error;
  }
}
