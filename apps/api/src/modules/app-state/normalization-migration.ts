import { Prisma, prisma } from '@meg/database';
import {
  buildNormalizationPreview,
  financialEventToLegacyTransaction,
  normalizationFingerprint,
} from './normalization-migration-core';

const NORMALIZATION_METADATA_KEY = '__megNormalization';
const NORMALIZATION_MODE = 'normalized-primary';
const ROLLBACK_MODE = 'app-state-rollback';

type StateRecord = Record<string, unknown>;
type NormalizationRuntimeStatus = {
  status: 'pending' | 'completed' | 'fallback' | 'rollback-protected';
  primary: boolean;
  reconciled: boolean;
  count: number;
  lastCheckedAt: string | null;
  lastFallbackAt: string | null;
  fallbackCount: number;
  reason: string | null;
};

let runtimeStatus: NormalizationRuntimeStatus = {
  status: 'pending', primary: false, reconciled: false, count: 0,
  lastCheckedAt: null, lastFallbackAt: null, fallbackCount: 0, reason: null,
};

export function recordNormalizationRuntimeStatus(update: Partial<NormalizationRuntimeStatus>) {
  const now = new Date().toISOString();
  const enteringFallback = update.status === 'fallback' && runtimeStatus.status !== 'fallback';
  runtimeStatus = {
    ...runtimeStatus,
    ...update,
    lastCheckedAt: now,
    lastFallbackAt: enteringFallback ? now : runtimeStatus.lastFallbackAt,
    fallbackCount: runtimeStatus.fallbackCount + (enteringFallback ? 1 : 0),
  };
  return { ...runtimeStatus };
}

export function getNormalizationRuntimeStatus() {
  return { ...runtimeStatus };
}

function stateRecord(value: unknown): StateRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as StateRecord : {};
}

function normalizationMetadata(state: unknown): StateRecord {
  return stateRecord(stateRecord(state)[NORMALIZATION_METADATA_KEY]);
}

export function isNormalizedPrimary(state: unknown): boolean {
  return normalizationMetadata(state).mode === NORMALIZATION_MODE;
}

export function shouldApplyNormalizationShadow(state: unknown, reconciled: boolean): boolean {
  // Depois que a base normalizada vira primária, FinancialEvent pode possuir
  // ledger/auditoria. Nunca apague e recrie essa projeção para corrigir drift.
  return !reconciled && !isNormalizedPrimary(state);
}

function normalizedItems(workspaceId: string) {
  return prisma.financialEvent.findMany({
    where: { workspaceId, legacyTransactionId: { not: null }, archivedAt: null },
    select: {
      legacyTransactionId: true,
      date: true,
      description: true,
      type: true,
      status: true,
      amount: true,
      signedAmount: true,
      notes: true,
      sourcePayload: true,
      amountBehavior: true,
      necessity: true,
      frequency: true,
      classificationConfidence: true,
      classificationSource: true,
    },
  });
}

function databaseSummary(items: Awaited<ReturnType<typeof normalizedItems>>) {
  const income = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.signedAmount), 0);
  const expense = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum - Number(item.signedAmount), 0);
  return {
    count: items.length,
    income,
    expense,
    net: income - expense,
    fingerprint: normalizationFingerprint(items),
  };
}

function summariesMatch(source: { validCount: number; invalidCount: number; fingerprint: string }, normalized: { count: number; fingerprint: string }) {
  return source.invalidCount === 0
    && source.validCount === normalized.count
    && source.fingerprint === normalized.fingerprint;
}

async function currentNormalizedSummary(workspaceId: string) {
  return databaseSummary(await normalizedItems(workspaceId));
}

export async function normalizationPreview(workspaceId: string, userId: string) {
  const appState = await prisma.appState.findUnique({ where: { workspaceId }, select: { state: true, revision: true, updatedAt: true } });
  const source = buildNormalizationPreview(appState?.state, { workspaceId, userId, revision: appState?.revision || 0 });
  const normalized = await currentNormalizedSummary(workspaceId);
  return {
    revision: appState?.revision || 0,
    updatedAt: appState?.updatedAt || null,
    source: source.summary,
    classificationSuggestions: source.suggestions,
    normalized,
    primary: isNormalizedPrimary(appState?.state),
    mode: String(normalizationMetadata(appState?.state).mode || 'shadow'),
    reconciled: summariesMatch(source.summary, normalized),
  };
}

async function replaceNormalizedProjection(workspaceId: string, preview: ReturnType<typeof buildNormalizationPreview>) {
  const rows = preview.events.map((event) => ({
    ...event,
    sourcePayload: event.sourcePayload as Prisma.InputJsonValue,
    archivedAt: null,
  }));
  await prisma.$transaction(async (tx) => {
    // A migracao sombra pode SEMEAR um espelho ainda vazio, nunca substituir
    // eventos preexistentes. Eles podem ter FKs e identidade usadas por
    // ledger/recibos/baixas/importacao. Divergencias exigem plano de migracao
    // com mapeamento por ID, nao deleteMany/createMany.
    const existing = await tx.financialEvent.findFirst({
      where: { workspaceId, legacyTransactionId: { not: null } },
      select: { id: true },
    });
    if (existing) throw new Error('NORMALIZATION_SHADOW_REBUILD_REQUIRES_CANONICAL_MIGRATION');
    if (rows.length) await tx.financialEvent.createMany({ data: rows });
  }, { maxWait: 10_000, timeout: 120_000 });
}

export async function applyNormalizationShadow(workspaceId: string, userId: string, expectedRevision: number) {
  const appState = await prisma.appState.findUnique({ where: { workspaceId }, select: { state: true, revision: true } });
  const revision = appState?.revision || 0;
  if (revision !== expectedRevision) throw new Error('NORMALIZATION_REVISION_CONFLICT');
  if (isNormalizedPrimary(appState?.state)) throw new Error('NORMALIZATION_PRIMARY_REBUILD_BLOCKED');
  const preview = buildNormalizationPreview(appState?.state, { workspaceId, userId, revision });
  if (preview.summary.invalidCount > 0) throw new Error('NORMALIZATION_INVALID_SOURCE');

  await replaceNormalizedProjection(workspaceId, preview);

  const result = await normalizationPreview(workspaceId, userId);
  if (!result.reconciled) throw new Error('NORMALIZATION_RECONCILIATION_FAILED');
  return result;
}

export async function activateNormalizationPrimary(workspaceId: string, userId: string, options: { automatic?: boolean } = {}) {
  let appState = await prisma.appState.findUnique({ where: { workspaceId }, select: { id: true, state: true, revision: true, updatedAt: true } });
  if (!appState) throw new Error('NORMALIZATION_SOURCE_NOT_FOUND');
  const metadata = normalizationMetadata(appState.state);
  if (options.automatic && metadata.mode === ROLLBACK_MODE) {
    const preview = await normalizationPreview(workspaceId, userId);
    recordNormalizationRuntimeStatus({ status: 'rollback-protected', primary: false, reconciled: preview.reconciled, count: preview.normalized.count, reason: 'ADMIN_ROLLBACK' });
    return { ...preview, blockedByRollback: true };
  }

  let preview = await normalizationPreview(workspaceId, userId);
  if (!preview.reconciled && isNormalizedPrimary(appState.state)) {
    throw new Error('NORMALIZATION_PRIMARY_DIVERGENCE');
  }
  if (shouldApplyNormalizationShadow(appState.state, preview.reconciled)) {
    preview = await applyNormalizationShadow(workspaceId, userId, appState.revision);
  }
  if (!preview.reconciled || preview.source.invalidCount > 0) throw new Error('NORMALIZATION_RECONCILIATION_FAILED');
  if (isNormalizedPrimary(appState.state)) {
    recordNormalizationRuntimeStatus({ status: 'completed', primary: true, reconciled: true, count: preview.normalized.count, reason: null });
    return { ...preview, activated: false };
  }

  const nextState = {
    ...stateRecord(appState.state),
    [NORMALIZATION_METADATA_KEY]: {
      mode: NORMALIZATION_MODE,
      activatedAt: new Date().toISOString(),
      reconciledRevision: appState.revision,
      fingerprint: preview.source.fingerprint,
      fallback: 'app-state',
    },
  };
  const updated = await prisma.appState.updateMany({
    where: { id: appState.id, revision: appState.revision },
    data: { state: nextState as Prisma.InputJsonValue, revision: { increment: 1 } },
  });
  if (updated.count !== 1) throw new Error('NORMALIZATION_REVISION_CONFLICT');
  appState = await prisma.appState.findUniqueOrThrow({ where: { id: appState.id }, select: { id: true, state: true, revision: true, updatedAt: true } });
  const activated = await normalizationPreview(workspaceId, userId);
  recordNormalizationRuntimeStatus({ status: 'completed', primary: true, reconciled: activated.reconciled, count: activated.normalized.count, reason: null });
  return { ...activated, activated: true, revision: appState.revision, updatedAt: appState.updatedAt };
}

export async function rollbackNormalizationPrimary(workspaceId: string) {
  const appState = await prisma.appState.findUnique({ where: { workspaceId }, select: { id: true, state: true, revision: true } });
  if (!appState) throw new Error('NORMALIZATION_SOURCE_NOT_FOUND');
  const nextState = {
    ...stateRecord(appState.state),
    [NORMALIZATION_METADATA_KEY]: {
      ...normalizationMetadata(appState.state),
      mode: ROLLBACK_MODE,
      rolledBackAt: new Date().toISOString(),
      fallback: 'app-state',
    },
  };
  const updated = await prisma.appState.updateMany({
    where: { id: appState.id, revision: appState.revision },
    data: { state: nextState as Prisma.InputJsonValue, revision: { increment: 1 } },
  });
  if (updated.count !== 1) throw new Error('NORMALIZATION_REVISION_CONFLICT');
  recordNormalizationRuntimeStatus({ status: 'rollback-protected', primary: false, reconciled: false, reason: 'ADMIN_ROLLBACK' });
  return { active: false, mode: ROLLBACK_MODE, revision: appState.revision + 1 };
}

/**
 * Sincroniza o espelho legado SEM substituir a identidade de um FinancialEvent.
 *
 * A versao anterior fazia deleteMany/createMany e descartava categoryId,
 * paymentMethodId e referencias externas. O AppState nao e autoridade sobre
 * esses vinculos canonicos. Em caso de evento ligado a ledger/baixa/importacao,
 * mudancas devem passar pelo escritor financeiro de origem: falhar fechado.
 *
 * Recebe a mesma transacao da gravacao do AppState. Qualquer erro provoca
 * rollback de ambos, evitando espelho divergente ou gravacao parcial.
 */
export async function synchronizeNormalizedRows(
  tx: Prisma.TransactionClient,
  state: unknown,
  context: { workspaceId: string; userId: string; revision: number },
  changedIds?: string[],
) {
  if (!isNormalizedPrimary(state)) return { active: false, reconciled: false };
  const preview = buildNormalizationPreview(state, context);
  if (preview.summary.invalidCount > 0) throw new Error('NORMALIZATION_INVALID_SOURCE');

  const desired = new Map<string, (typeof preview.events)[number]>();
  for (const event of preview.events) {
    if (!event.legacyTransactionId || desired.has(event.legacyTransactionId)) {
      throw new Error('NORMALIZATION_DUPLICATE_LEGACY_ID');
    }
    desired.set(event.legacyTransactionId, event);
  }

  // undefined = PUT integral. Array preenchido = PATCH somente das IDs alteradas.
  const changed = changedIds === undefined ? null : new Set(changedIds);
  if (changed && changed.size === 0) {
    return { active: true, reconciled: true, fingerprint: preview.summary.fingerprint, count: preview.summary.validCount };
  }
  const existingRows = await tx.financialEvent.findMany({
    where: {
      workspaceId: context.workspaceId,
      legacyTransactionId: changed
        ? { in: [...changed] }
        : { not: null },
    },
    include: {
      ledgerEntries: { select: { id: true }, take: 1 },
      receipt: { select: { id: true } },
      payablePayment: { select: { id: true } },
      importedRow: { select: { id: true } },
    },
  });
  const existingByLegacyId = new Map(existingRows.map(row => [row.legacyTransactionId!, row]));
  const updates = changed
    ? [...changed].flatMap(id => desired.has(id) ? [desired.get(id)!] : [])
    : [...desired.values()];
  let updated = 0;
  let created = 0;
  let archived = 0;

  for (const proposed of updates) {
    const legacyId = proposed.legacyTransactionId!;
    const old = existingByLegacyId.get(legacyId);
    if (old && old.userId !== context.userId) {
      throw new Error('NORMALIZATION_EVENT_OWNER_MISMATCH');
    }
    if (old?.archivedAt) {
      // Restauracao precisa de contrato explicito, nao reativacao implicita.
      throw new Error('NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE');
    }
    const accountChanged = old?.accountId !== proposed.accountId;
    if (proposed.accountId && (!old || accountChanged)) {
      const account = await tx.account.findFirst({
        where: { id: proposed.accountId, userId: context.userId, isActive: true },
        select: { id: true },
      });
      if (!account) throw new Error('NORMALIZATION_INVALID_ACCOUNT_SCOPE');
    }

    if (!old) {
      await tx.financialEvent.create({
        data: {
          ...proposed,
          sourcePayload: proposed.sourcePayload as Prisma.InputJsonValue,
          archivedAt: null,
        },
      });
      created += 1;
      continue;
    }

    const identical = old.accountId === proposed.accountId
      && normalizationFingerprint([old]) === normalizationFingerprint([proposed]);
    if (identical) continue;

    // sourcePayload e rotulo legado, nao autoriza trocar uma FK canonica ja
    // atribuida. Evita categoria A com label B ou metodo PIX com label cartao.
    const legacyText = (raw: unknown, key: string) => {
      const record = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw as Record<string, unknown> : {};
      return String(record[key] ?? '').trim();
    };
    const changedLegacyFields = (fields: readonly string[]) => fields.some(field =>
      legacyText(old.sourcePayload, field) !== legacyText(proposed.sourcePayload, field));
    if (old.categoryId && (
      old.type !== proposed.type
      || changedLegacyFields(['category', 'group', 'expenseClass'])
    )) {
      throw new Error('NORMALIZATION_CANONICAL_CATEGORY_CONFLICT');
    }
    if (old.paymentMethodId && (
      old.type !== proposed.type
      || changedLegacyFields(['paymentMethod', 'modality', 'financialScope'])
    )) {
      throw new Error('NORMALIZATION_CANONICAL_PAYMENT_METHOD_CONFLICT');
    }
    if (accountChanged) {
      throw new Error('NORMALIZATION_ACCOUNT_CHANGE_REQUIRES_CANONICAL_WRITER');
    }

    const hasLinkedDomain = old.ledgerEntries.length > 0
      || old.receipt !== null || old.payablePayment !== null || old.importedRow !== null;
    if (hasLinkedDomain) {
      // Qualquer mudanca de fonte, classificacao ou valor exige o writer do dominio.
      throw new Error('NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER');
    }

    // Atualizacao em lugar. O AppState NAO pode zerar IDs canonicos, substituir
    // userId/workspaceId ou redefinir a identidade legada ja persistida.
    const changedRow = await tx.financialEvent.updateMany({
      where: {
        id: old.id,
        workspaceId: context.workspaceId,
        userId: context.userId,
        updatedAt: old.updatedAt,
        archivedAt: null,
      },
      data: {
        description: proposed.description,
        type: proposed.type,
        status: proposed.status,
        date: proposed.date,
        competence: proposed.competence,
        amount: proposed.amount,
        signedAmount: proposed.signedAmount,
        accountId: proposed.accountId,
        notes: proposed.notes,
        sourceRevision: proposed.sourceRevision,
        sourcePayload: proposed.sourcePayload as Prisma.InputJsonValue,
        amountBehavior: proposed.amountBehavior,
        necessity: proposed.necessity,
        frequency: proposed.frequency,
        classificationConfidence: proposed.classificationConfidence,
        classificationSource: proposed.classificationSource,
      },
    });
    if (changedRow.count !== 1) throw new Error('NORMALIZATION_CONCURRENT_EVENT_CHANGE');
    updated += 1;
  }

  // Remocao do espelho deve manter o registro historico e nunca destruir suas
  // referencias. A exclusao de dominio vinculado exige operacao canonica.
  const remaining = changed
    ? [...changed].filter(id => !desired.has(id))
    : existingRows
      .filter(row => !row.archivedAt && !desired.has(row.legacyTransactionId!))
      .map(row => row.legacyTransactionId!);
  for (const legacyId of remaining) {
    const old = existingByLegacyId.get(legacyId);
    if (!old || old.archivedAt) continue;
    if (old.userId !== context.userId) throw new Error('NORMALIZATION_EVENT_OWNER_MISMATCH');
    if (old.ledgerEntries.length || old.receipt || old.payablePayment || old.importedRow) {
      throw new Error('NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER');
    }
    const result = await tx.financialEvent.updateMany({
      where: {
        id: old.id, workspaceId: context.workspaceId, userId: context.userId,
        updatedAt: old.updatedAt, archivedAt: null,
      },
      data: { archivedAt: new Date(), sourceRevision: context.revision },
    });
    if (result.count !== 1) throw new Error('NORMALIZATION_CONCURRENT_EVENT_CHANGE');
    archived += 1;
  }
  return {
    active: true, reconciled: true, fingerprint: preview.summary.fingerprint,
    count: preview.summary.validCount, updated, created, archived,
  };
}

export async function normalizedStateForRead(workspaceId: string, userId: string) {
  const appState = await prisma.appState.findUnique({ where: { workspaceId } });
  if (!appState) return null;
  const fallback = {
    state: appState.state,
    revision: appState.revision,
    updatedAt: appState.updatedAt,
    dataSource: 'app-state',
    normalizedPrimary: false,
  };
  if (!isNormalizedPrimary(appState.state)) {
    const rollback = normalizationMetadata(appState.state).mode === ROLLBACK_MODE;
    recordNormalizationRuntimeStatus({ status: rollback ? 'rollback-protected' : 'fallback', primary: false, reconciled: false, count: 0, reason: rollback ? 'ADMIN_ROLLBACK' : 'NORMALIZED_PRIMARY_INACTIVE' });
    return fallback;
  }

  const source = buildNormalizationPreview(appState.state, { workspaceId, userId, revision: appState.revision });
  const items = await normalizedItems(workspaceId);
  const normalized = databaseSummary(items);
  if (!summariesMatch(source.summary, normalized)) {
    recordNormalizationRuntimeStatus({ status: 'fallback', primary: false, reconciled: false, count: normalized.count, reason: 'NORMALIZATION_RECONCILIATION_FAILED' });
    return { ...fallback, dataSource: 'app-state-fallback', integrity: { reconciled: false, source: source.summary, normalized } };
  }

  const normalizedById = new Map(items.map((item) => [String(item.legacyTransactionId), financialEventToLegacyTransaction(item)]));
  const originalState = stateRecord(appState.state);
  const originalTransactions = Array.isArray(originalState.transactions) ? originalState.transactions as StateRecord[] : [];
  const transactions = originalTransactions.map((item) => normalizedById.get(String(item.id || ''))).filter(Boolean);
  if (transactions.length !== originalTransactions.length) {
    recordNormalizationRuntimeStatus({ status: 'fallback', primary: false, reconciled: false, count: normalized.count, reason: 'NORMALIZED_ORDER_RECONSTRUCTION_FAILED' });
    return {
      ...fallback,
      dataSource: 'app-state-fallback',
      integrity: { reconciled: false, reason: 'NORMALIZED_ORDER_RECONSTRUCTION_FAILED', source: source.summary, normalized },
    };
  }
  recordNormalizationRuntimeStatus({ status: 'completed', primary: true, reconciled: true, count: normalized.count, reason: null });
  return {
    state: { ...originalState, transactions },
    revision: appState.revision,
    updatedAt: appState.updatedAt,
    dataSource: 'normalized',
    normalizedPrimary: true,
    integrity: { reconciled: true, fingerprint: normalized.fingerprint, count: normalized.count },
  };
}
