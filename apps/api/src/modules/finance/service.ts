import { prisma } from '@meg/database';
import { createFinancialEventSchema, updateFinancialEventSchema } from './schemas';
import type { z } from 'zod';

type CreateFinancialEventInput = z.infer<typeof createFinancialEventSchema>;
type UpdateFinancialEventInput = z.infer<typeof updateFinancialEventSchema>;

function signedAmount(type: string, amount: number) {
  return type === 'income' || type === 'redemption' ? Math.abs(amount) : -Math.abs(amount);
}

function competenceFromDate(date: string) {
  return date.slice(0, 7);
}

function isPosted(status: string) {
  return status === 'paid' || status === 'reconciled' || status === 'confirmed';
}

async function syncLedger(eventId: string) {
  await prisma.$transaction(async (tx) => {
    const event = await tx.financialEvent.findUnique({ where: { id: eventId } });
    if (!event) return;

    await tx.ledgerEntry.deleteMany({ where: { eventId } });
    if (!event.accountId || !isPosted(event.status) || event.archivedAt) return;

    const value = Number(event.amount);
    await tx.ledgerEntry.create({
      data: {
        eventId: event.id,
        date: event.date,
        accountId: event.accountId,
        debit: Number(event.signedAmount) >= 0 ? value : 0,
        credit: Number(event.signedAmount) < 0 ? value : 0,
        memo: event.description
      }
    });
  });
}

export async function listFinancialEvents(userId: string, input: { page: number; pageSize: number; search?: string }) {
  const where = {
    userId,
    archivedAt: null,
    ...(input.search ? {
      OR: [
        { description: { contains: input.search, mode: 'insensitive' as const } },
        { account: { name: { contains: input.search, mode: 'insensitive' as const } } },
        { category: { name: { contains: input.search, mode: 'insensitive' as const } } },
        { paymentMethod: { name: { contains: input.search, mode: 'insensitive' as const } } }
      ]
    } : {})
  };
  const [items, total] = await prisma.$transaction([
    prisma.financialEvent.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { account: true, category: true, paymentMethod: true }
    }),
    prisma.financialEvent.count({ where })
  ]);
  return { items, total, page: input.page, pageSize: input.pageSize };
}

export async function createFinancialEvent(userId: string, input: CreateFinancialEventInput) {
  const competence = input.competence || competenceFromDate(input.date);
  const value = Math.abs(input.amount);

  const event = await prisma.financialEvent.create({
    data: {
      userId,
      description: input.description.trim(),
      type: input.type,
      status: input.status,
      date: new Date(input.date),
      competence,
      amount: value,
      signedAmount: signedAmount(input.type, value),
      accountId: input.accountId,
      categoryId: input.categoryId,
      paymentMethodId: input.paymentMethodId,
      notes: input.notes?.trim() || undefined
    },
    include: { account: true, category: true, paymentMethod: true, ledgerEntries: true }
  });

  await syncLedger(event.id);
  return prisma.financialEvent.findUnique({
    where: { id: event.id },
    include: { account: true, category: true, paymentMethod: true, ledgerEntries: true }
  });
}

export async function updateFinancialEvent(userId: string, id: string, input: UpdateFinancialEventInput) {
  const current = await prisma.financialEvent.findFirst({ where: { id, userId, archivedAt: null } });
  if (!current) throw new Error('FINANCIAL_EVENT_NOT_FOUND');

  const nextType = input.type ?? current.type;
  const nextAmount = input.amount === undefined ? Number(current.amount) : Math.abs(input.amount);

  await prisma.financialEvent.update({
    where: { id },
    data: {
      ...input,
      description: input.description?.trim(),
      date: input.date ? new Date(input.date) : undefined,
      competence: input.competence || (input.date ? competenceFromDate(input.date) : undefined),
      amount: input.amount === undefined ? undefined : nextAmount,
      signedAmount: signedAmount(nextType, nextAmount),
      notes: input.notes?.trim()
    }
  });

  await syncLedger(id);
  return prisma.financialEvent.findUnique({
    where: { id },
    include: { account: true, category: true, paymentMethod: true, ledgerEntries: true }
  });
}

export async function deleteFinancialEvent(userId: string, id: string) {
  const current = await prisma.financialEvent.findFirst({ where: { id, userId, archivedAt: null } });
  if (!current) throw new Error('FINANCIAL_EVENT_NOT_FOUND');

  await prisma.financialEvent.update({
    where: { id },
    data: { status: 'archived', archivedAt: new Date() }
  });
  await prisma.ledgerEntry.deleteMany({ where: { eventId: id } });
  return { id, archived: true };
}