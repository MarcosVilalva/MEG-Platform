import { prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { recordFinancialAudit } from '../finance/audit';
import { serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';
import { addMonthsClamped, moveWeekendToMonday, parseIsoDay } from './core';
import { PayableDomainError } from './service';

export type CreatePayablesInput = {
  categoryId?: string | null;
  description: string;
  totalAmount: number;
  dueDate: string;
  installmentQty: number;
  notes?: string | null;
  operationId?: string;
};

export async function createPayablesProtected(userId: string, input: CreatePayablesInput) {
  const firstDay = input.dueDate.slice(0, 10);
  const anchor = parseIsoDay(firstDay)?.day;
  if (!anchor) throw new PayableDomainError('INVALID_DUE_DATE');
  const workspace = await resolveWorkspaceContext(userId);
  const requestHash = input.operationId
    ? mutationRequestHash({ ...input, operationId: undefined })
    : null;

  return serializableFinancialTransaction(async (tx) => {
    if (input.operationId && requestHash) {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new PayableDomainError('OPERATION_ID_REUSED');
        return previous.response as unknown;
      }
    }

    if (input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true } });
      if (!category) throw new PayableDomainError('INVALID_CATEGORY');
    }

    const totalCents = Math.round(input.totalAmount * 100);
    const base = Math.floor(totalCents / input.installmentQty);
    const remainder = totalCents - base * input.installmentQty;
    const created = [];

    for (let index = 0; index < input.installmentQty; index += 1) {
      const amount = (base + (index < remainder ? 1 : 0)) / 100;
      const calendarDay = addMonthsClamped(firstDay, index, anchor);
      const dueDay = moveWeekendToMonday(calendarDay);
      const payable = await tx.payable.create({
        data: {
          userId,
          categoryId: input.categoryId,
          description: input.installmentQty > 1 ? `${input.description.trim()} ${index + 1}/${input.installmentQty}` : input.description.trim(),
          totalAmount: amount,
          openAmount: amount,
          dueDate: new Date(`${dueDay}T00:00:00.000Z`),
          installmentNo: index + 1,
          installmentQty: input.installmentQty,
          notes: input.notes?.trim() || null,
        },
      });
      created.push(payable);
      await recordFinancialAudit(tx, {
        actorId: userId,
        entity: 'Payable',
        entityId: payable.id,
        action: 'PAYABLE_CREATED',
        before: null,
        after: payable,
        context: {
          operationId: input.operationId ?? null,
          installmentNo: index + 1,
          installmentQty: input.installmentQty,
          sourceTotalAmount: input.totalAmount,
          workspaceId: workspace.workspaceId,
        },
      });
    }

    const response = {
      created: created.length,
      ids: created.map((item) => item.id),
      installments: created,
      idempotentReplay: false,
    };
    if (input.operationId && requestHash) {
      const state = await tx.appState.findUnique({ where: { workspaceId: workspace.workspaceId }, select: { revision: true } });
      await tx.cloudMutationReceipt.create({ data: receiptCreateData({
        workspaceId: workspace.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'PAYABLE_CREATE',
        revision: state?.revision || 0,
        response,
      }) });
    }
    return response;
  });
}