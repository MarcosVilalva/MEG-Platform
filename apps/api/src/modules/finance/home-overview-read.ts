import { prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';
import { monetaryBalanceAt } from './monetary-protection';
import { listPayables } from '../payables/service';
import { listCards } from '../cards/service';

/**
 * Read-only view for Home.
 *
 * Monetary balance: existing authoritative monetaryBalanceAt.
 * Payables and card statements: existing domain services. We ONLY aggregate
 * their already computed open amounts using integer cents for presentation.
 * This module does not alter business rules, statuses, settlements or balances.
 */
const moneyCents = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error('INVALID_HOME_FINANCIAL_VALUE');
  return Math.round(num * 100);
};
const totalFrom = (values: unknown[]) => values.reduce<number>((sum, value) => sum + moneyCents(value), 0) / 100;

export function projectHomeMetrics(
  payables: Array<{status: string; openAmount: unknown}>,
  cards: Array<{payableStatementAmount: unknown}>,
) {
  const unpaid = payables.filter(item => item.status !== 'paid' && item.status !== 'cancelled' && moneyCents(item.openAmount) > 0);
  const paid = payables.filter(item => item.status === 'paid');
  const outstandingCards = cards.filter(item => moneyCents(item.payableStatementAmount) > 0);

  return {
    payables: { openAmount: totalFrom(unpaid.map(item => item.openAmount)), count: unpaid.length },
    cards: { openAmount: totalFrom(outstandingCards.map(item => item.payableStatementAmount)), count: outstandingCards.length },
    paid: { count: paid.length }, // Do not invent a monetary total from nominal amount.
  };
}

export async function getCanonicalHomeOverview(userId: string, month: string, effectiveAt: string) {
  const context = await resolveWorkspaceContext(userId);
  const [available, payables, cards] = await Promise.all([
    monetaryBalanceAt(prisma, context.workspace.ownerId, effectiveAt),
    listPayables(userId, month),
    listCards(userId, month),
  ]);
  return {
    month,
    effectiveAt,
    available,
    ...projectHomeMetrics(payables, cards),
  };
}
