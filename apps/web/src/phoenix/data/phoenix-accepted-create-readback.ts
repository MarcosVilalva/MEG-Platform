import type { FinancialEvent, FinancialEventPage, FinancialHistorySnapshot } from '../../app/finance-client';

/**
 * PT112/PT113: toda confirmação de criação depende de GET canônico e de
 * identidade autenticada. Nunca envia POST ou calcula saldo.
 */
export type PhoenixCreateReadback =
  | { status: 'confirmed'; eventId: string }
  | { status: 'pending'; reason: 'READ_UNAVAILABLE' | 'EVENT_NOT_IN_HISTORY' | 'HISTORY_TOO_LARGE' }
  | { status: 'blocked'; reason: 'SESSION_CHANGED' | 'ACCEPTED_EVENT_INVALID' | 'CANONICAL_EVENT_MISMATCH' };

export type PhoenixCanonicalLookup =
  | { status: 'found'; event: FinancialEvent }
  | Extract<PhoenixCreateReadback, { status: 'pending' | 'blocked' }>;

export type PhoenixCanonicalLookupInput = {
  expectedUserId: string;
  eventId: string;
  currentUserId: () => string | undefined;
  getHistory: (signal: AbortSignal) => Promise<FinancialHistorySnapshot>;
  listPage: (page: number, size: number, signal: AbortSignal) => Promise<FinancialEventPage>;
  signal: AbortSignal;
};
export type PhoenixCreateReadbackInput = Omit<PhoenixCanonicalLookupInput, 'eventId'> & {
  acceptedEvent: FinancialEvent;
};

function comparableCents(value: string | number): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}
function sameCanonicalEvent(receipt: FinancialEvent, canonical: FinancialEvent): boolean {
  const required = ['id', 'type', 'description', 'status', 'accountId', 'paymentMethodId', 'categoryId'] as const;
  if (required.some(field => (receipt[field] ?? null) !== (canonical[field] ?? null))) return false;
  if (String(receipt.date).slice(0, 10) !== String(canonical.date).slice(0, 10)) return false;
  const acceptedAmount = comparableCents(receipt.amount);
  return acceptedAmount !== null && acceptedAmount === comparableCents(canonical.amount);
}
function safeIdentity(receipt: FinancialEvent): boolean {
  return typeof receipt?.id === 'string' && receipt.id.length > 0
    && typeof receipt.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(receipt.date)
    && typeof receipt.type === 'string' && typeof receipt.description === 'string'
    && comparableCents(receipt.amount) !== null;
}

export async function findPhoenixCanonicalEvent(input: PhoenixCanonicalLookupInput): Promise<PhoenixCanonicalLookup> {
  const { expectedUserId, currentUserId, signal, eventId } = input;
  if (!expectedUserId || currentUserId() !== expectedUserId) {
    return { status: 'blocked', reason: 'SESSION_CHANGED' };
  }
  if (!eventId || typeof eventId !== 'string') {
    return { status: 'pending', reason: 'READ_UNAVAILABLE' };
  }
  let found: FinancialEvent | undefined;
  try {
    const snapshot = await input.getHistory(signal);
    if (snapshot.kind === 'complete') {
      found = snapshot.items.find(item => item.id === eventId);
    } else if (snapshot.kind === 'limit-exceeded') {
      const maxPages = Math.min(100, Math.ceil(snapshot.total / 100));
      let seen = 0;
      for (let page = 1; page <= maxPages; page += 1) {
        if (signal.aborted) return { status: 'pending', reason: 'READ_UNAVAILABLE' };
        if (currentUserId() !== expectedUserId) return { status: 'blocked', reason: 'SESSION_CHANGED' };
        const rows = await input.listPage(page, 100, signal);
        if (!Array.isArray(rows.items) || rows.page !== page || rows.pageSize > 100
          || rows.total !== snapshot.total) return { status: 'pending', reason: 'READ_UNAVAILABLE' };
        seen += rows.items.length;
        found = rows.items.find(item => item.id === eventId);
        if (found) break;
        if (seen >= snapshot.total || rows.items.length === 0) break;
      }
      if (!found && snapshot.total > 10000) {
        return { status: 'pending', reason: 'HISTORY_TOO_LARGE' };
      }
    } else {
      return { status: 'pending', reason: 'READ_UNAVAILABLE' };
    }
  } catch {
    return { status: 'pending', reason: 'READ_UNAVAILABLE' };
  }
  if (signal.aborted) return { status: 'pending', reason: 'READ_UNAVAILABLE' };
  if (currentUserId() !== expectedUserId) return { status: 'blocked', reason: 'SESSION_CHANGED' };
  if (!found) return { status: 'pending', reason: 'EVENT_NOT_IN_HISTORY' };
  return { status: 'found', event: found };
}
export async function readPhoenixAcceptedCreate(input: PhoenixCreateReadbackInput): Promise<PhoenixCreateReadback> {
  const accepted = input.acceptedEvent;
  if (!safeIdentity(accepted)) return { status: 'blocked', reason: 'ACCEPTED_EVENT_INVALID' };
  const canonical = await findPhoenixCanonicalEvent({
    expectedUserId: input.expectedUserId, currentUserId: input.currentUserId,
    eventId: accepted.id, getHistory: input.getHistory, listPage: input.listPage,
    signal: input.signal,
  });
  if (canonical.status !== 'found') return canonical;
  if (!sameCanonicalEvent(accepted, canonical.event)) {
    return { status: 'blocked', reason: 'CANONICAL_EVENT_MISMATCH' };
  }
  return { status: 'confirmed', eventId: canonical.event.id };
}
