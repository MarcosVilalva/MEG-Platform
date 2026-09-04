import { createHash } from 'node:crypto';
import { Prisma, prisma } from '@meg/database';
import { buildNormalizationPreview } from './normalization-migration-core';

function databaseFingerprint(items: Array<{ legacyTransactionId: string | null; date: Date; type: string; amount: unknown }>) {
  return createHash('sha256').update(JSON.stringify(items.map((item) => ({
    id: String(item.legacyTransactionId || ''),
    date: item.date.toISOString().slice(0, 10),
    type: item.type,
    amount: Number(item.amount),
  })).sort((left, right) => left.id.localeCompare(right.id)))).digest('hex');
}

async function currentNormalizedSummary(workspaceId: string) {
  const items = await prisma.financialEvent.findMany({
    where: { workspaceId, legacyTransactionId: { not: null }, archivedAt: null },
    select: { legacyTransactionId: true, date: true, type: true, amount: true },
  });
  const income = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  return { count: items.length, income, expense, net: income - expense, fingerprint: databaseFingerprint(items) };
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
    reconciled: source.summary.invalidCount === 0
      && source.summary.validCount === normalized.count
      && source.summary.fingerprint === normalized.fingerprint,
  };
}

export async function applyNormalizationShadow(workspaceId: string, userId: string, expectedRevision: number) {
  const appState = await prisma.appState.findUnique({ where: { workspaceId }, select: { state: true, revision: true } });
  const revision = appState?.revision || 0;
  if (revision !== expectedRevision) throw new Error('NORMALIZATION_REVISION_CONFLICT');
  const preview = buildNormalizationPreview(appState?.state, { workspaceId, userId, revision });
  if (preview.summary.invalidCount > 0) throw new Error('NORMALIZATION_INVALID_SOURCE');

  await prisma.$transaction(async (tx) => {
    await tx.financialEvent.updateMany({
      where: { workspaceId, legacyTransactionId: { not: null }, archivedAt: null },
      data: { archivedAt: new Date(), status: 'archived', sourceRevision: revision },
    });
    for (const event of preview.events) {
      const data = {
        ...event,
        sourcePayload: event.sourcePayload as Prisma.InputJsonValue,
        archivedAt: null,
      };
      await tx.financialEvent.upsert({
        where: { workspaceId_legacyTransactionId: { workspaceId, legacyTransactionId: event.legacyTransactionId } },
        create: data,
        update: data,
      });
    }
  }, { maxWait: 10_000, timeout: 120_000 });

  const result = await normalizationPreview(workspaceId, userId);
  if (!result.reconciled) throw new Error('NORMALIZATION_RECONCILIATION_FAILED');
  return result;
}
