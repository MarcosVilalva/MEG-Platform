import { Prisma, prisma } from '@meg/database';
import { classifyStage10HistoricalLink } from './stage10-historical-mapping-review';

const label = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('pt-BR');
const catalogKey = (...values: unknown[]) => JSON.stringify(values.map(label));

function indexCatalog<T>(items: T[], key: (item: T) => string) {
  const index = new Map<string, T[]>();
  for (const item of items) {
    const matches = index.get(key(item)) ?? [];
    matches.push(item);
    index.set(key(item), matches);
  }
  return index;
}

/** Produces a review manifest without descriptions, amounts, or permission to mutate. */
export async function readStage10HistoricalReview(workspaceId: string) {
  if (!workspaceId.trim()) throw new Error('STAGE10_REVIEW_WORKSPACE_REQUIRED');

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const workspace = await tx.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    const categories = await tx.category.findMany({
      where: { userId: workspace.ownerId, isActive: true },
      select: { id: true, userId: true, name: true, group: true, type: true, isActive: true },
    });
    const paymentMethods = await tx.paymentMethod.findMany({
      where: { userId: workspace.ownerId, isActive: true },
      select: { id: true, userId: true, name: true, type: true, isActive: true },
    });
    const byCategory = indexCatalog(categories, ({ name, group, type }) => catalogKey(name, group, type));
    const byPayment = indexCatalog(paymentMethods, ({ name }) => catalogKey(name));
    const events = await tx.financialEvent.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        legacyTransactionId: { not: null },
        OR: [{ categoryId: null }, { paymentMethodId: null }],
      },
      orderBy: { id: 'asc' },
      select: {
        id: true, userId: true, description: true, type: true, status: true, amount: true, signedAmount: true,
        archivedAt: true, categoryId: true, paymentMethodId: true, sourcePayload: true,
        account: { select: { id: true, userId: true, type: true, isActive: true } },
        ledgerEntries: { select: { id: true }, take: 1 },
        receipt: { select: { id: true } },
        payablePayment: { select: { id: true } },
        importedRow: { select: { id: true } },
      },
    });
    return events.map((event) => {
      const raw = event.sourcePayload;
      const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      const categoryMatches = byCategory.get(catalogKey(source.category, source.expenseClass, event.type)) ?? [];
      const paymentMatches = byPayment.get(catalogKey(source.paymentMethod)) ?? [];
      const review = classifyStage10HistoricalLink({
        event: {
          ...event,
          amount: Number(event.amount),
          signedAmount: Number(event.signedAmount),
          hasLedger: event.ledgerEntries.length > 0,
          hasReceipt: event.receipt !== null,
          hasPayablePayment: event.payablePayment !== null,
          hasImportedRow: event.importedRow !== null,
        },
        category: categoryMatches.length === 1 ? categoryMatches[0] : null,
        paymentMethod: paymentMatches.length === 1 ? paymentMatches[0] : null,
        categoryMatchCount: categoryMatches.length,
        paymentMatchCount: paymentMatches.length,
      });
      return { eventId: event.id, ...review };
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30_000 });
}
