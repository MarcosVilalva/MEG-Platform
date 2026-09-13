import type { Prisma } from '@meg/database';

type Tx = Prisma.TransactionClient;

export async function activeAccountForUser(tx: Tx, userId: string, id: string) {
  return tx.account.findFirst({
    where: { id, userId, isActive: true },
    select: { id: true, name: true, type: true, openingBalance: true },
  });
}

export async function activeCategoryForUser(tx: Tx, userId: string, id: string) {
  return tx.category.findFirst({
    where: { id, userId, isActive: true },
    select: { id: true, name: true, group: true, type: true },
  });
}

export async function activePaymentMethodForUser(tx: Tx, userId: string, id: string) {
  return tx.paymentMethod.findFirst({
    where: { id, userId, isActive: true },
    select: { id: true, name: true, type: true },
  });
}

export async function assertActiveCatalogReferences(tx: Tx, userId: string, input: {
  accountId?: string | null;
  categoryId?: string | null;
  paymentMethodId?: string | null;
}) {
  if (input.accountId && !await activeAccountForUser(tx, userId, input.accountId)) throw new Error('INVALID_ACCOUNT');
  if (input.categoryId && !await activeCategoryForUser(tx, userId, input.categoryId)) throw new Error('INVALID_CATEGORY');
  if (input.paymentMethodId && !await activePaymentMethodForUser(tx, userId, input.paymentMethodId)) throw new Error('INVALID_PAYMENT_METHOD');
}
