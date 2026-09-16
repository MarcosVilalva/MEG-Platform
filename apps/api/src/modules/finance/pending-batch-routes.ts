import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PendingBatchSettlementError, settlePendingBatchProtected } from './pending-batch-settlement';

const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const operationIdSchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const itemSchema = z.object({
  source: z.enum(['payable', 'event', 'card']),
  sourceId: z.string().trim().min(1).max(160),
  statementMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
}).superRefine((item, context) => {
  if (item.source === 'card' && !item.statementMonth) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['statementMonth'], message: 'Informe a competência da fatura.' });
  }
});
const batchSchema = z.object({
  items: z.array(itemSchema).min(1).max(100).superRefine((items, context) => {
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

function settlementError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof PendingBatchSettlementError)) throw error;
  const status = ['FINANCIAL_EVENT_NOT_FOUND', 'PAYABLE_NOT_FOUND', 'CARD_NOT_FOUND'].includes(error.code)
    ? 404
    : ['OPERATION_ID_REUSED', 'STATEMENT_CHANGED_RETRY'].includes(error.code)
      ? 409
      : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

export async function pendingBatchRoutes(app: FastifyInstance) {
  app.post('/pending/batch/settle', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = batchSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    try {
      return await settlePendingBatchProtected(request.user.sub, parsed.data);
    } catch (error) {
      return settlementError(reply, error);
    }
  });
}
