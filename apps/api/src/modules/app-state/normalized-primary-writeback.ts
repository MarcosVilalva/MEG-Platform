import { Prisma, prisma } from '@meg/database';
import { canonical } from './normalization-migration-core';

const NORMALIZATION_METADATA_KEY = '__megNormalization';
const NORMALIZATION_MODE = 'normalized-primary';

type Tx = Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;

export type NormalizedLegacyMirrorEvent = {
  id: string;
  legacyTransactionId: string | null;
  date: Date;
  description: string;
  type: string;
  status: string;
  amount: unknown;
  notes: string | null;
  sourcePayload: unknown;
  accountId?: string | null;
  paymentMethod?: { name?: string | null } | null;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function isNormalizedPrimaryState(state: unknown) {
  return record(record(state)[NORMALIZATION_METADATA_KEY]).mode === NORMALIZATION_MODE;
}

function stableJson(value: unknown) {
  return JSON.stringify(canonical(value));
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function legacyStatus(status: string, type: string) {
  switch (status) {
    case 'paid': return { status: 'paid', situation: type === 'income' ? 'RECEBIDO' : 'PAGO' };
    case 'reconciled': return { status: 'reconciled', situation: 'CONCILIADO' };
    case 'archived': return { status: 'archived', situation: 'ARQUIVADO' };
    default: return { status: 'pending', situation: 'PENDENTE' };
  }
}

export function mirrorFinancialEventToLegacyTransaction(event: NormalizedLegacyMirrorEvent): JsonRecord {
  const payload = { ...record(event.sourcePayload) };
  if (!event.legacyTransactionId) return payload;

  const amount = Math.abs(Number(event.amount || 0));
  const status = legacyStatus(event.status, event.type);
  payload.id = event.legacyTransactionId;
  payload.date = isoDay(event.date);
  payload.description = event.description;
  payload.type = event.type === 'income' ? 'income' : 'expense';
  payload.status = status.status;
  if (Object.prototype.hasOwnProperty.call(payload, 'situation')) payload.situation = status.situation;

  if (event.type === 'income') {
    if (Object.prototype.hasOwnProperty.call(payload, 'incomeAmount')) payload.incomeAmount = amount;
    else if (Object.prototype.hasOwnProperty.call(payload, 'amount')) payload.amount = amount;
  } else {
    if (Object.prototype.hasOwnProperty.call(payload, 'expenseAmount')) payload.expenseAmount = amount;
    else if (Object.prototype.hasOwnProperty.call(payload, 'amount')) payload.amount = amount;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'notes') || event.notes) payload.notes = event.notes || '';
  if (event.accountId && Object.prototype.hasOwnProperty.call(payload, 'financialAccountId')) {
    payload.financialAccountId = event.accountId;
  }
  const paymentName = String(event.paymentMethod?.name || '').trim();
  if (paymentName && Object.prototype.hasOwnProperty.call(payload, 'paymentMethod')) {
    payload.paymentMethod = paymentName;
  }
  return payload;
}

export function normalizedMirrorNeedsSourceRefresh(event: NormalizedLegacyMirrorEvent, payload: JsonRecord) {
  return stableJson(event.sourcePayload) !== stableJson(payload);
}

function legacyId(item: unknown) {
  return String(record(item).id || '').trim();
}

export async function writeBackNormalizedEventsToAppState(
  tx: Tx,
  workspaceId: string,
  events: NormalizedLegacyMirrorEvent[],
  removedLegacyIds: string[] = [],
) {
  const current = await tx.appState.findUnique({
    where: { workspaceId },
    select: { id: true, state: true, revision: true },
  });
  if (!current || !isNormalizedPrimaryState(current.state)) return { active: false, changed: false, revision: current?.revision || 0 };

  const mirrored = new Map(
    events
      .filter((event) => Boolean(event.legacyTransactionId))
      .map((event) => [String(event.legacyTransactionId), { event, payload: mirrorFinancialEventToLegacyTransaction(event) }]),
  );
  const removed = new Set(removedLegacyIds.filter(Boolean));
  if (!mirrored.size && !removed.size) return { active: true, changed: false, revision: current.revision };

  const state = record(current.state);
  const transactions = Array.isArray(state.transactions) ? state.transactions : [];
  const seen = new Set<string>();
  const nextTransactions: unknown[] = [];
  let transactionsChanged = false;

  for (const item of transactions) {
    const id = legacyId(item);
    if (id && removed.has(id)) {
      transactionsChanged = true;
      continue;
    }
    const replacement = id ? mirrored.get(id) : undefined;
    if (replacement) {
      nextTransactions.push(replacement.payload);
      seen.add(id);
      if (!transactionsChanged && stableJson(item) !== stableJson(replacement.payload)) {
        transactionsChanged = true;
      }
    } else {
      nextTransactions.push(item);
    }
  }
  for (const [id, replacement] of mirrored) {
    if (!seen.has(id) && !removed.has(id)) {
      nextTransactions.push(replacement.payload);
      transactionsChanged = true;
    }
  }

  const sourceRefresh = [...mirrored.values()].filter(({ event, payload }) => normalizedMirrorNeedsSourceRefresh(event, payload));
  if (!transactionsChanged && sourceRefresh.length === 0) {
    return { active: true, changed: false, revision: current.revision };
  }

  const nextRevision = current.revision + 1;
  const updated = await tx.appState.updateMany({
    where: { id: current.id, revision: current.revision },
    data: {
      state: { ...state, transactions: nextTransactions } as Prisma.InputJsonValue,
      revision: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new Error('NORMALIZED_PRIMARY_MIRROR_CONFLICT');

  if (sourceRefresh.length) {
    const values = sourceRefresh.map(({ event, payload }) => Prisma.sql`(
      CAST(${event.id} AS text),
      CAST(${JSON.stringify(payload)} AS jsonb),
      ${nextRevision}
    )`);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "FinancialEvent" AS event
      SET "sourcePayload" = incoming.payload,
          "sourceRevision" = incoming.revision,
          "updatedAt" = NOW()
      FROM (VALUES ${Prisma.join(values)}) AS incoming(id, payload, revision)
      WHERE event.id = incoming.id
    `);
  }

  return { active: true, changed: true, revision: nextRevision, refreshedEvents: sourceRefresh.length };
}

export async function reconcilePrimaryAppStateFromNormalized(workspaceId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.appState.findUnique({
      where: { workspaceId },
      select: { id: true, state: true, revision: true },
    });
    if (!current || !isNormalizedPrimaryState(current.state)) {
      return { active: false, changed: false, revision: current?.revision || 0 };
    }

    const events = await tx.financialEvent.findMany({
      where: { workspaceId, legacyTransactionId: { not: null }, archivedAt: null },
      include: { paymentMethod: { select: { name: true } } },
    });
    if (!events.length) return { active: true, changed: false, revision: current.revision };

    return writeBackNormalizedEventsToAppState(tx, workspaceId, events);
  }, { maxWait: 10_000, timeout: 120_000 });
}
