/**
 * Ordenação e paginação puras da leitura de compromissos da Home.
 * Não altera status, valores, saldo, parcelas nem qualquer writer financeiro.
 */
export type CommitmentOrigin = 'financialEvent' | 'payable';
export type DueState = 'overdue' | 'due_today' | 'upcoming';
export type CommitmentCursor = { dueAt: string; source: CommitmentOrigin; sourceId: string };
export type HomeCommitment = CommitmentCursor & {
  id: string;
  dueDate: string;
  description: string;
  amount: string;
  status: string;
  dueState: DueState;
};
export type CommitmentCandidate = CommitmentCursor & {
  description: string;
  amount: string;
  status: string;
  eligible: boolean;
};

const origins: CommitmentOrigin[] = ['financialEvent', 'payable'];

export function saoPauloDay(referenceDate: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(referenceDate);
  const value = (key: string) => parts.find((p) => p.type === key)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function dueStateForDay(dueAt: string, referenceDay: string): DueState {
  const dueDay = dueAt.slice(0, 10);
  return dueDay < referenceDay ? 'overdue' : dueDay === referenceDay ? 'due_today' : 'upcoming';
}

export function compareCommitmentKeys(a: CommitmentCursor, b: CommitmentCursor): number {
  return a.dueAt.localeCompare(b.dueAt)
    || origins.indexOf(a.source) - origins.indexOf(b.source)
    || a.sourceId.localeCompare(b.sourceId);
}

export function encodeCommitmentCursor(value: CommitmentCursor): string {
  return Buffer.from(JSON.stringify([value.dueAt, value.source, value.sourceId]), 'utf8').toString('base64url');
}

export function decodeCommitmentCursor(raw: string): CommitmentCursor | null {
  if (!raw || raw.length > 512 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!Array.isArray(decoded) || decoded.length !== 3) return null;
    const [dueAt, source, sourceId] = decoded;
    if (typeof dueAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dueAt)
      || Number.isNaN(new Date(dueAt).getTime())
      || !origins.includes(source as CommitmentOrigin)
      || typeof sourceId !== 'string' || sourceId.length < 1 || sourceId.length > 128) return null;
    return { dueAt, source, sourceId };
  } catch { return null; }
}

/**
 * Filtro de cursor por fonte, preservando desempate estável entre origens.
 * Ambos os conjuntos já são filtrados pelo proprietário do workspace na query.
 */
export function afterCommitmentCursor(source: CommitmentOrigin, cursor: CommitmentCursor | null) {
  if (!cursor) return {};
  const date = new Date(cursor.dueAt);
  if (source === cursor.source) {
    return { OR: [{ date: { gt: date } }, { date, id: { gt: cursor.sourceId } }] };
  }
  if (origins.indexOf(source) > origins.indexOf(cursor.source)) {
    return { date: { gte: date } };
  }
  return { date: { gt: date } };
}

/** Mescla as primeiras N+1 linhas de cada origem, sem varredura ilimitada. */
export function mergeCommitmentPage(
  candidates: CommitmentCandidate[], referenceDay: string, limit: number,
) {
  const sorted = [...candidates].sort(compareCommitmentKeys);
  const consumed = sorted.slice(0, limit);
  const hasMore = sorted.length > limit;
  return {
    asOf: referenceDay,
    items: consumed.filter((entry) => entry.eligible).map((entry): HomeCommitment => ({
      id: `${entry.source}:${entry.sourceId}`,
      source: entry.source,
      sourceId: entry.sourceId,
      dueAt: entry.dueAt,
      dueDate: entry.dueAt.slice(0, 10),
      description: entry.description,
      amount: entry.amount,
      status: entry.status,
      dueState: dueStateForDay(entry.dueAt, referenceDay),
    })),
    hasMore,
    nextCursor: hasMore && consumed.length
      ? encodeCommitmentCursor(consumed[consumed.length - 1])
      : null,
  };
}
