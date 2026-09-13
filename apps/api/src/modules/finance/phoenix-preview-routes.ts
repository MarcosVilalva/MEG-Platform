import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getPhoenixPreviewSnapshot } from './phoenix-preview-snapshot';
import { listPhoenixPreviewEvents } from './phoenix-preview-events';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

/**
 * Contrato isolado, estritamente de leitura, usado para validar a Phoenix V15
 * contra a base real sem alterar os endpoints atuais da produção.
 */
export function registerPhoenixPreviewReads(app: FastifyInstance) {
  app.get('/phoenix-preview', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return getPhoenixPreviewSnapshot(request.user.sub, parsed.data.month);
  });

  app.get('/phoenix-preview/events', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      from: daySchema.optional(),
      to: daySchema.optional(),
    }).refine((value) => !value.from || !value.to || value.from <= value.to, {
      message: 'INVALID_DATE_RANGE',
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listPhoenixPreviewEvents(request.user.sub, parsed.data);
  });
}
