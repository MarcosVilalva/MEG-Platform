import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { FinancialEventMutationError } from './event-mutation';
import { editFinancialEventProtected } from './event-edit';
import {
  archiveFinancialEventsBulkProtected,
  updateFinancialEventsBulkProtected,
} from './event-bulk-mutation';

const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;

const operationIdSchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const idsSchema = z.array(z.string().trim().min(1)).min(1).max(200).superRefine((ids, context) => {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'IDs duplicados não são permitidos.' });
  }
});

const updateSchema = z.object({
  ids: idsSchema,
  changes: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    accountId: z.string().trim().min(1).optional(),
    paymentMethodId: z.string().trim().min(1).optional(),
    categoryId: z.string().trim().min(1).optional(),
  }).refine((changes) => Object.values(changes).some((value) => value !== undefined), {
    message: 'Informe ao menos uma alteração.',
  }),
  operationId: operationIdSchema,
});

const editSchema = z.object({
  description: z.string().trim().min(1).max(120).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().finite().refine((value) => value !== 0, 'O valor não pode ser zero.').optional(),
  accountId: z.string().trim().min(1).optional(),
  paymentMethodId: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  notes: z.string().max(500).optional(),
  modality: z.enum(['À VISTA', 'CRÉDITO', 'CREDIÁRIO', 'ALIMENTAÇÃO', 'DINHEIRO', 'PIX', 'TRANSFERÊNCIA BANCÁRIA', 'VEROCARD']).optional(),
  operationId: operationIdSchema,
}).refine((input) => Object.entries(input).some(([key, value]) => key !== 'operationId' && value !== undefined), {
  message: 'Informe ao menos uma alteração.',
});

const archiveSchema = z.object({
  ids: idsSchema,
  operationId: operationIdSchema,
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function mutationError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof FinancialEventMutationError)) throw error;
  const status = error.code === 'FINANCIAL_EVENT_NOT_FOUND'
    ? 404
    : error.code === 'OPERATION_ID_REUSED'
      ? 409
      : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
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

  app.post('/events/:id/update-protected', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const params = z.object({ id: z.string().trim().min(1) }).safeParse(request.params);
    const parsed = editSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      return validationError(reply, {
        params: params.success ? undefined : params.error.flatten(),
        body: parsed.success ? undefined : parsed.error.flatten(),
      });
    }
    try {
      return await editFinancialEventProtected(request.user.sub, params.data.id, parsed.data);
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
}