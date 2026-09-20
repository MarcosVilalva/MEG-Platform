import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { BenefitEventMutationError, createBenefitEventProtected, updateBenefitEventProtected } from './benefit-event-mutation';

const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;

const benefitEventSchema = z.object({
  description: z.string().trim().min(2).max(160),
  type: z.enum(['income', 'expense']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().positive().finite(),
  accountId: z.string().trim().min(1),
  categoryId: z.string().trim().min(1).optional(),
  paymentMethodId: z.string().trim().min(1),
  notes: z.string().trim().max(1000).optional(),
  operationId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
});

const benefitEventUpdateSchema = benefitEventSchema.extend({
  expectedUpdatedAt: z.string().datetime().optional(),
});

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function benefitError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof BenefitEventMutationError)) throw error;
  const status = ['OPERATION_ID_REUSED', 'INSUFFICIENT_BENEFIT_BALANCE', 'FINANCIAL_EVENT_STALE_VERSION'].includes(error.code) ? 409
    : error.code === 'BENEFIT_EVENT_NOT_FOUND' ? 404
      : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

export async function financeBenefitEventRoutes(app: FastifyInstance) {
  app.post('/benefit-events', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = benefitEventSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await createBenefitEventProtected(request.user.sub, parsed.data));
    } catch (error) {
      return benefitError(reply, error);
    }
  });

  app.patch('/benefit-events/:eventId', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const params = z.object({ eventId: z.string().trim().min(1) }).safeParse(request.params);
    const parsed = benefitEventUpdateSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      return validationError(reply, {
        params: params.success ? undefined : params.error.flatten(),
        body: parsed.success ? undefined : parsed.error.flatten(),
      });
    }
    try {
      return await updateBenefitEventProtected(request.user.sub, params.data.eventId, parsed.data);
    } catch (error) {
      return benefitError(reply, error);
    }
  });
}
