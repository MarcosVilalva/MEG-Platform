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

function stateRecord(value: unknown): StateRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as StateRecord : {};
}

function normalizationMetadata(state: unknown): StateRecord {
  return stateRecord(stateRecord(state)[NORMALIZATION_METADATA_KEY]);
}

export function isNormalizedPrimary(state: unknown): boolean {
  return normalizationMetadata(state).mode === NORMALIZATION_MODE;
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
    await tx.financialEvent.deleteMany({ where: { workspaceId, legacyTransactionId: { not: null } } });
    if (rows.length) await tx.financialEvent.createMany({ data: rows });
  }, { maxWait: 10_000, timeout: 120_000 });
}

export async function applyNormalizationShadow(workspaceId: string, userId: string, expectedRevision: number) {
  const appState = await prisma.appState.findUnique({ where: { workspaceId }, select: { state: true, revision: true } });
  const revision = appState?.revision || 0;
  if (revision !== expectedRevision) throw new Error('NORMALIZATION_REVISION_CONFLICT');
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
    return { ...(await normalizationPreview(workspaceId, userId)), blockedByRollback: true };
  }

  let preview = await normalizationPreview(workspaceId, userId);
  if (!preview.reconciled) preview = await applyNormalizationShadow(workspaceId, userId, appState.revision);
  if (!preview.reconciled || preview.source.invalidCount > 0) throw new Error('NORMALIZATION_RECONCILIATION_FAILED');
  if (isNormalizedPrimary(appState.state)) return { ...preview, activated: false };

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
  return { ...(await normalizationPreview(workspaceId, userId)), activated: true, revision: appState.revision, updatedAt: appState.updatedAt };
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
  return { active: false, mode: ROLLBACK_MODE, revision: appState.revision + 1 };
}

export async function synchronizeNormalizedRows(
  tx: Prisma.TransactionClient,
  state: unknown,
  context: { workspaceId: string; userId: string; revision: number },
  changedIds?: string[],
) {
  if (!isNormalizedPrimary(state)) return { active: false, reconciled: false };
  const preview = buildNormalizationPreview(state, context);
  if (preview.summary.invalidCount > 0) throw new Error('NORMALIZATION_INVALID_SOURCE');
  const changed = new Set(changedIds || []);
  const changedEvents = changed.size ? preview.events.filter((event) => changed.has(event.legacyTransactionId)) : preview.events;

  if (changed.size) {
    await tx.financialEvent.deleteMany({ where: { workspaceId: context.workspaceId, legacyTransactionId: { in: [...changed] } } });
  } else {
    await tx.financialEvent.deleteMany({ where: { workspaceId: context.workspaceId, legacyTransactionId: { not: null } } });
  }
  if (changedEvents.length) {
    await tx.financialEvent.createMany({
      data: changedEvents.map((event) => ({ ...event, sourcePayload: event.sourcePayload as Prisma.InputJsonValue, archivedAt: null })),
    });
  }
  return { active: true, reconciled: true, fingerprint: preview.summary.fingerprint, count: preview.summary.validCount };
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
  if (!isNormalizedPrimary(appState.state)) return fallback;

  const source = buildNormalizationPreview(appState.state, { workspaceId, userId, revision: appState.revision });
  const items = await normalizedItems(workspaceId);
  const normalized = databaseSummary(items);
  if (!summariesMatch(source.summary, normalized)) {
    return { ...fallback, dataSource: 'app-state-fallback', integrity: { reconciled: false, source: source.summary, normalized } };
  }

  const normalizedById = new Map(items.map((item) => [String(item.legacyTransactionId), financialEventToLegacyTransaction(item)]));
  const originalState = stateRecord(appState.state);
  const originalTransactions = Array.isArray(originalState.transactions) ? originalState.transactions as StateRecord[] : [];
  const transactions = originalTransactions.map((item) => normalizedById.get(String(item.id || ''))).filter(Boolean);
  if (transactions.length !== originalTransactions.length) {
    return {
      ...fallback,
      dataSource: 'app-state-fallback',
      integrity: { reconciled: false, reason: 'NORMALIZED_ORDER_RECONSTRUCTION_FAILED', source: source.summary, normalized },
    };
  }
  return {
    state: { ...originalState, transactions },
    revision: appState.revision,
    updatedAt: appState.updatedAt,
    dataSource: 'normalized',
    normalizedPrimary: true,
    integrity: { reconciled: true, fingerprint: normalized.fingerprint, count: normalized.count },
  };
}
