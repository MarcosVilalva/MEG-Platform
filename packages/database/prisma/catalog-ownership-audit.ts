import { PrismaClient } from '@prisma/client';
import {
  assertOwnershipPlanIsDeterministic,
  ownershipPlanSummary,
  planCatalogOwnership,
  type CatalogReference,
} from './catalog-ownership-core';

const prisma = new PrismaClient();

function reference(catalogId: string | null, userId: string | null | undefined, source: string, referenceId: string): CatalogReference | null {
  if (!catalogId) return null;
  return { catalogId, userId, source, referenceId };
}

function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value !== null && value !== undefined);
}

async function accountReferences() {
  const [events, receipts, payablePayments, ledgerEntries] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { accountId: { not: null } },
      select: { id: true, accountId: true, userId: true },
    }),
    prisma.receipt.findMany({
      where: { accountId: { not: null } },
      select: { id: true, accountId: true, receivable: { select: { userId: true } } },
    }),
    prisma.payablePayment.findMany({
      where: { accountId: { not: null } },
      select: { id: true, accountId: true, payable: { select: { userId: true } } },
    }),
    prisma.ledgerEntry.findMany({
      select: { id: true, accountId: true, event: { select: { userId: true } } },
    }),
  ]);

  return compact([
    ...events.map((item) => reference(item.accountId, item.userId, 'FinancialEvent', item.id)),
    ...receipts.map((item) => reference(item.accountId, item.receivable.userId, 'Receipt', item.id)),
    ...payablePayments.map((item) => reference(item.accountId, item.payable.userId, 'PayablePayment', item.id)),
    ...ledgerEntries.map((item) => reference(item.accountId, item.event.userId, 'LedgerEntry', item.id)),
  ]);
}

async function categoryReferences() {
  const [events, purchases, payables, recurring] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { categoryId: { not: null } },
      select: { id: true, categoryId: true, userId: true },
    }),
    prisma.cardPurchase.findMany({
      where: { categoryId: { not: null } },
      select: { id: true, categoryId: true, userId: true },
    }),
    prisma.payable.findMany({
      where: { categoryId: { not: null } },
      select: { id: true, categoryId: true, userId: true },
    }),
    prisma.recurringExpense.findMany({
      where: { categoryId: { not: null } },
      select: { id: true, categoryId: true, userId: true },
    }),
  ]);

  return compact([
    ...events.map((item) => reference(item.categoryId, item.userId, 'FinancialEvent', item.id)),
    ...purchases.map((item) => reference(item.categoryId, item.userId, 'CardPurchase', item.id)),
    ...payables.map((item) => reference(item.categoryId, item.userId, 'Payable', item.id)),
    ...recurring.map((item) => reference(item.categoryId, item.userId, 'RecurringExpense', item.id)),
  ]);
}

async function paymentMethodReferences() {
  const [events, receipts, payablePayments] = await Promise.all([
    prisma.financialEvent.findMany({
      where: { paymentMethodId: { not: null } },
      select: { id: true, paymentMethodId: true, userId: true },
    }),
    prisma.receipt.findMany({
      where: { paymentMethodId: { not: null } },
      select: { id: true, paymentMethodId: true, receivable: { select: { userId: true } } },
    }),
    prisma.payablePayment.findMany({
      where: { paymentMethodId: { not: null } },
      select: { id: true, paymentMethodId: true, payable: { select: { userId: true } } },
    }),
  ]);

  return compact([
    ...events.map((item) => reference(item.paymentMethodId, item.userId, 'FinancialEvent', item.id)),
    ...receipts.map((item) => reference(item.paymentMethodId, item.receivable.userId, 'Receipt', item.id)),
    ...payablePayments.map((item) => reference(item.paymentMethodId, item.payable.userId, 'PayablePayment', item.id)),
  ]);
}

async function main() {
  const [accounts, categories, paymentMethods, accountRefs, categoryRefs, paymentRefs] = await Promise.all([
    prisma.account.findMany({ select: { id: true, name: true, userId: true } }),
    prisma.category.findMany({ select: { id: true, name: true, userId: true } }),
    prisma.paymentMethod.findMany({ select: { id: true, name: true, userId: true } }),
    accountReferences(),
    categoryReferences(),
    paymentMethodReferences(),
  ]);

  const plans = [
    planCatalogOwnership('account', accounts.map((item) => ({ id: item.id, label: item.name, currentOwnerId: item.userId })), accountRefs),
    planCatalogOwnership('category', categories.map((item) => ({ id: item.id, label: item.name, currentOwnerId: item.userId })), categoryRefs),
    planCatalogOwnership('paymentMethod', paymentMethods.map((item) => ({ id: item.id, label: item.name, currentOwnerId: item.userId })), paymentRefs),
  ];
  plans.forEach(assertOwnershipPlanIsDeterministic);

  const report = {
    mode: 'dry-run',
    generatedAt: new Date().toISOString(),
    authority: 'user',
    summary: ownershipPlanSummary(plans),
    reviewRequired: plans.flatMap((plan) => plan.items
      .filter((item) => item.requiresReview || item.cloneOwnerIds.length > 0)
      .map((item) => ({ kind: plan.kind, ...item }))),
  };

  console.log(JSON.stringify(report, null, 2));
  if (plans.some((plan) => plan.requiresReview > 0)) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
