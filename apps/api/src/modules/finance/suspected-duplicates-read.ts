import { prisma, Prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';

/**
 * Issue #699 Phase A, read-only support channel.
 *
 * AuditLog has no workspace foreign key. Therefore ALL rows are joined to
 * FinancialEvent with an explicit workspace/owner predicate BEFORE pagination.
 * Never list audit rows globally and filter them in application code.
 */
export async function listSuspectedDuplicateFinancialEvents(
  actorId: string,
  input: { page: number; pageSize: number },
) {
  const workspace = await resolveWorkspaceContext(actorId, { allowLegacyBootstrap: false });
  const offset = (input.page - 1) * input.pageSize;
  type AuditRow = {
    auditId: string;
    eventId: string;
    flaggedAt: Date;
    metadata: string | null;
    description: string;
    type: string;
    status: string;
    amount: Prisma.Decimal;
    date: Date;
    archivedAt: Date | null;
  };
  const [rows, counts] = await prisma.$transaction([
    prisma.$queryRaw`
      SELECT a.id AS "auditId", a."entityId" AS "eventId",
             a."createdAt" AS "flaggedAt", a.metadata,
             e.description, e.type, e.status, e.amount, e.date, e."archivedAt"
      FROM "AuditLog" AS a
      INNER JOIN "FinancialEvent" AS e ON e.id = a."entityId"
      WHERE a.entity = 'FinancialEvent'
        AND a.action = 'FINANCIAL_EVENT_DUPLICATE_SUSPECTED'
        AND e."workspaceId" = ${workspace.workspaceId}
        AND e."userId" = ${workspace.workspace.ownerId}
      ORDER BY a."createdAt" DESC, a.id DESC
      LIMIT ${input.pageSize} OFFSET ${offset}
    `,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT count(*)::bigint AS total
      FROM "AuditLog" AS a
      INNER JOIN "FinancialEvent" AS e ON e.id = a."entityId"
      WHERE a.entity = 'FinancialEvent'
        AND a.action = 'FINANCIAL_EVENT_DUPLICATE_SUSPECTED'
        AND e."workspaceId" = ${workspace.workspaceId}
        AND e."userId" = ${workspace.workspace.ownerId}
    `,
  ]);

  const contexts = rows.map((row) => {
    try {
      const parsed = JSON.parse(row.metadata || '{}') as {
        context?: Record<string, unknown>;
      };
      return parsed.context && typeof parsed.context === 'object'
        ? parsed.context : {};
    } catch {
      return {} as Record<string, unknown>;
    }
  });
  const peerIds = [...new Set(contexts.map((context) =>
    typeof context.peerEventId === 'string' ? context.peerEventId : '').filter(Boolean))];
  const peers = peerIds.length
    ? await prisma.financialEvent.findMany({
        where: {
          workspaceId: workspace.workspaceId,
          userId: workspace.workspace.ownerId,
          id: { in: peerIds },
        },
        select: {
          id: true, description: true, type: true, status: true,
          amount: true, date: true, archivedAt: true,
        },
      })
    : [];
  const byId = new Map(peers.map((peer) => [peer.id, peer]));
  return {
    items: rows.map((row, index) => {
      const context = contexts[index];
      const peerId = typeof context.peerEventId === 'string'
        ? context.peerEventId : '';
      const peer = byId.get(peerId);
      return {
        auditId: row.auditId,
        flaggedAt: row.flaggedAt,
        suspicionGroupId: typeof context.suspicionGroupId === 'string'
          ? context.suspicionGroupId : null,
        fingerprintVersion: typeof context.fingerprintVersion === 'string'
          ? context.fingerprintVersion : null,
        fingerprint: typeof context.fingerprint === 'string'
          ? context.fingerprint : null,
        evidence: 'CONTENT_AND_TIME_ONLY',
        reviewStatus: 'SUSPECTED',
        relation: typeof context.relation === 'string' ? context.relation : null,
        event: {
          id: row.eventId, description: row.description, type: row.type,
          status: row.status, amount: row.amount.toString(),
          date: row.date, archivedAt: row.archivedAt,
        },
        peer: peer
          ? {
              id: peer.id, description: peer.description, type: peer.type,
              status: peer.status, amount: peer.amount.toString(),
              date: peer.date, archivedAt: peer.archivedAt,
            }
          : null,
      };
    }),
    total: Number(counts[0]?.total || 0n),
    page: input.page,
    pageSize: input.pageSize,
  };
}
