import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '@meg/database';
import { z } from 'zod';
import { FinancialEventMutationError } from './event-mutation';
import {
  archiveFinancialEventsBulkProtected,
  updateFinancialEventsBulkProtected,
} from './event-bulk-mutation';
import { PendingBatchSettlementError, settlePendingBatchProtected } from './pending-batch-settlement';
import { resolveWorkspaceContext } from '../workspaces/service';

const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;

const operationIdSchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const idsSchema = z.array(z.string().trim().min(1)).min(1).max(200).superRefine((ids, context) => {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'IDs duplicados não são permitidos.' });
  }
});

const legacyPatchSchema = z.object({
  launchType: z.string().trim().max(40).optional(),
  situation: z.string().trim().max(40).optional(),
  account: z.string().trim().max(160).optional(),
  paymentMethod: z.string().trim().max(160).optional(),
  group: z.string().trim().max(160).optional(),
  category: z.string().trim().max(160).optional(),
  classification: z.string().trim().max(160).optional(),
  modality: z.string().trim().max(80).optional(),
  financialAccountId: z.string().trim().max(160).optional(),
  paymentMethodId: z.string().trim().max(160).optional(),
  categoryId: z.string().trim().max(160).optional(),
  incomeAmount: z.number().finite().optional(),
  expenseAmount: z.number().finite().optional(),
  amount: z.number().finite().optional(),
}).refine((changes) => Object.values(changes).some((value) => value !== undefined), {
  message: 'Informe ao menos uma alteração legada.',
});

const eventVersionMapSchema = z.record(z.string().trim().min(1), z.string().datetime());

const updateSchema = z.object({
  ids: idsSchema,
  expectedUpdatedAtById: eventVersionMapSchema.optional(),
  changes: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    type: z.enum(['income', 'expense']).optional(),
    status: z.enum(['planned', 'paid', 'reconciled']).optional(),
    amount: z.number().finite().refine((value) => value !== 0, 'O valor não pode ser zero.').optional(),
    notes: z.string().max(4000).nullable().optional(),
    accountId: z.string().trim().min(1).nullable().optional(),
    paymentMethodId: z.string().trim().min(1).nullable().optional(),
    categoryId: z.string().trim().min(1).nullable().optional(),
    legacy: legacyPatchSchema.optional(),
  }).refine((changes) => Object.values(changes).some((value) => value !== undefined), {
    message: 'Informe ao menos uma alteração.',
  }),
  operationId: operationIdSchema,
});

const archiveSchema = z.object({
  ids: idsSchema,
  expectedUpdatedAtById: eventVersionMapSchema.optional(),
  operationId: operationIdSchema,
});

const pendingBatchItemSchema = z.object({
  source: z.enum(['payable', 'event', 'card']),
  sourceId: z.string().trim().min(1).max(160),
  statementMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
}).superRefine((item, context) => {
  if (item.source === 'card' && !item.statementMonth) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['statementMonth'], message: 'Informe a competência da fatura.' });
  }
});

const pendingBatchSchema = z.object({
  items: z.array(pendingBatchItemSchema).min(1).max(100).superRefine((items, context) => {
    const keys = items.map((item) => `${item.source}|${item.sourceId}|${item.statementMonth || ''}`);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Pendências duplicadas não são permitidas no mesmo lote.' });
    }
  }),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().trim().min(1).max(160),
  paymentMethodId: z.string().trim().min(1).max(160),
  operationId: operationIdSchema,
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function mutationError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof FinancialEventMutationError)) throw error;
  const status = error.code === 'FINANCIAL_EVENT_NOT_FOUND'
    ? 404
    : ['OPERATION_ID_REUSED', 'FINANCIAL_EVENT_STALE_VERSION'].includes(error.code)
      ? 409
      : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

function pendingBatchError(reply: FastifyReply, error: unknown) {
  if (error instanceof PendingBatchSettlementError) {
    const status = ['FINANCIAL_EVENT_NOT_FOUND', 'PAYABLE_NOT_FOUND', 'CARD_NOT_FOUND'].includes(error.code)
      ? 404
      : ['OPERATION_ID_REUSED', 'STATEMENT_CHANGED_RETRY', 'PENDING_CHANGED_RETRY'].includes(error.code)
        ? 409
        : 400;
    return reply.code(status).send({ error: error.code, ...(error.details || {}) });
  }
  const prismaCode = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';
  if (prismaCode === 'P2028') {
    return reply.code(503).send({ error: 'PENDING_BATCH_TIMEOUT' });
  }
  throw error;
}

export async function financeBulkMutationRoutes(app: FastifyInstance) {
  app.post('/events/bulk/update', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return await updateFinancialEventsBulkProtected(request.user.sub, parsed.data);
    } catch (error) {
      return mutationError(reply, error);
    }
  });

  app.post('/events/bulk/archive', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = archiveSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return await archiveFinancialEventsBulkProtected(request.user.sub, parsed.data);
    } catch (error) {
      return mutationError(reply, error);
    }
  });

  app.get('/pending/operations/:operationId', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = operationIdSchema.safeParse((request.params as { operationId?: string }).operationId);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const context = await resolveWorkspaceContext(request.user.sub);
    const receipt = await prisma.cloudMutationReceipt.findUnique({
      where: { workspaceId_operationId: { workspaceId: context.workspaceId, operationId: parsed.data } },
      select: { mutationType: true, response: true, revision: true, createdAt: true },
    });
    const allowed = new Set(['PENDING_BATCH_SETTLEMENT', 'FINANCIAL_EVENT_SETTLE', 'FINANCIAL_EVENT_SETTLE_COMPAT']);
    if (!receipt || !allowed.has(receipt.mutationType)) {
      return { confirmed: false, operationId: parsed.data };
    }
    return {
      confirmed: true,
      operationId: parsed.data,
      mutationType: receipt.mutationType,
      revision: receipt.revision,
      confirmedAt: receipt.createdAt,
      response: receipt.response,
    };
  });

  app.post('/pending/batch/settle', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = pendingBatchSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const startedAt = Date.now();
    try {
      const result = await settlePendingBatchProtected(request.user.sub, parsed.data);
      const elapsedMs = Date.now() - startedAt;
      reply.header('Server-Timing', `pending-batch;dur=${elapsedMs}`);
      request.log.info({
        operationId: parsed.data.operationId,
        itemCount: parsed.data.items.length,
        elapsedMs,
        timingsMs: result && typeof result === 'object' && 'timingsMs' in result
          ? (result as { timingsMs?: unknown }).timingsMs
          : undefined,
      }, 'Pending batch settlement confirmed');
      return result;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      request.log.warn({
        operationId: parsed.data.operationId,
        itemCount: parsed.data.items.length,
        elapsedMs,
        error,
      }, 'Pending batch settlement failed');
      return pendingBatchError(reply, error);
    }
  });
}
