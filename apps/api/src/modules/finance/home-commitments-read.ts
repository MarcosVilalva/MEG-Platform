import { prisma } from '@meg/database';
import { isMonetaryFinancialEvent } from './financial-policy';
import { resolveWorkspaceContext } from '../workspaces/service';
import {
  afterCommitmentCursor,
  decodeCommitmentCursor,
  mergeCommitmentPage,
  saoPauloDay,
  type CommitmentCandidate,
} from './home-commitments-core';

/**
 * Leitura canônica read-only para compromissos. Seleção e valores pertencem
 * ao domínio financeiro; a Home não recalcula status, saldos ou urgência.
 *
 * Uma página consulta no máximo limit+1 linhas POR origem; o cursor avança
 * também sobre eventos excluídos (cartão / benefício) para evitar loop.
 */
export async function listCanonicalHomeCommitments(
  userId: string,
  options: { limit: number; cursor?: string },
  referenceDate = new Date(),
) {
  const cursor = options.cursor ? decodeCommitmentCursor(options.cursor) : null;
  if (options.cursor && !cursor) throw new Error('INVALID_HOME_COMMITMENTS_CURSOR');
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 50) {
    throw new Error('INVALID_HOME_COMMITMENTS_LIMIT');
  }
  const workspace = await resolveWorkspaceContext(userId);
  const ownerId = workspace.workspace.ownerId;
  const [events, payables] = await Promise.all([
    prisma.financialEvent.findMany({
      where: {
        userId: ownerId,
        archivedAt: null,
        status: 'planned',
        type: 'expense',
        signedAmount: { lt: 0 },
        ...afterCommitmentCursor('financialEvent', cursor),
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      take: options.limit + 1,
      select: {
        id: true, date: true, description: true, type: true, status: true,
        signedAmount: true,
        payablePayment: { select: { id: true } },
        account: { select: { type: true } },
        paymentMethod: { select: { name: true, type: true } },
      },
    }),
    prisma.payable.findMany({
      where: {
        userId: ownerId,
        status: { notIn: ['paid', 'cancelled'] },
        openAmount: { gt: 0 },
        ...(() => {
          // Payable usa dueDate em vez de date. O cursor deve conservar
          // o mesmo desempate cronológico da origem FinancialEvent.
          if (!cursor) return {};
          const date = new Date(cursor.dueAt);
          if (cursor.source === 'payable') return {
            OR: [{ dueDate: { gt: date } }, { dueDate: date, id: { gt: cursor.sourceId } }],
          };
          return { dueDate: { gte: date } };
        })(),
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      take: options.limit + 1,
      select: {
        id: true, dueDate: true, description: true, status: true,
        openAmount: true,
      },
    }),
  ]);

  const candidates: CommitmentCandidate[] = [
    ...events.map((event) => ({
      source: 'financialEvent' as const,
      sourceId: event.id,
      dueAt: event.date.toISOString(),
      description: event.description,
      amount: event.signedAmount.abs().toFixed(2),
      status: event.status,
      eligible: !event.payablePayment
        && isMonetaryFinancialEvent(event)
        && event.paymentMethod?.type?.toLowerCase() !== 'credit',
    })),
    ...payables.map((payable) => ({
      source: 'payable' as const,
      sourceId: payable.id,
      dueAt: payable.dueDate.toISOString(),
      description: payable.description,
      amount: payable.openAmount.toFixed(2),
      status: payable.status,
      eligible: true,
    })),
  ];

  return mergeCommitmentPage(candidates, saoPauloDay(referenceDate), options.limit);
}
