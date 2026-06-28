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

export async function listFinancialEvents() {
  return prisma.financialEvent.findMany({
    orderBy: { date: 'desc' },
    include: {
      account: true,
      category: true,
      paymentMethod: true,
      ledgerEntries: true
    }
  });
}

export async function createFinancialEvent(input: CreateFinancialEventInput) {
  const competence = input.competence || competenceFromDate(input.date);
  const value = Math.abs(input.amount);
  const signed = signedAmount(input.type, value);

  return prisma.$transaction(async (tx) => {
    const event = await tx.financialEvent.create({
      data: {
        description: input.description,
        type: input.type,
        status: input.status,
        date: new Date(input.date),
        competence,
        amount: value,
        signedAmount: signed,
        accountId: input.accountId,
        categoryId: input.categoryId,
        paymentMethodId: input.paymentMethodId,
        notes: input.notes
      }
    });

    if (input.accountId) {
      const debitAccountId = signed >= 0 ? input.accountId : input.categoryId;
      const creditAccountId = signed >= 0 ? input.categoryId : input.accountId;

      if (debitAccountId && creditAccountId) {
        await tx.ledgerEntry.createMany({
          data: [
            {
              eventId: event.id,
              date: event.date,
              accountId: debitAccountId,
              debit: value,
              credit: 0,
              memo: event.description
            },
            {
              eventId: event.id,
              date: event.date,
              accountId: creditAccountId,
              debit: 0,
              credit: value,
              memo: event.description
            }
          ]
        });
      }
    }

    return event;
  });
}

export async function updateFinancialEvent(id: string, input: UpdateFinancialEventInput) {
  return prisma.financialEvent.update({
    where: { id },
    data: {
      ...input,
      date: input.date ? new Date(input.date) : undefined,
      competence: input.competence || (input.date ? competenceFromDate(input.date) : undefined),
      amount: input.amount ? Math.abs(input.amount) : undefined,
      signedAmount: input.amount && input.type ? signedAmount(input.type, input.amount) : undefined
    }
  });
}

export async function deleteFinancialEvent(id: string) {
  return prisma.financialEvent.update({
    where: { id },
    data: {
      status: 'archived',
      archivedAt: new Date()
    }
  });
}
