import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRole } from '@meg/database';
import {
  authenticateUser,
  consumeRefreshSession,
  createRefreshSession,
  getUserById,
  listUsers,
  registerUser,
  resetUserPassword,
  revokeRefreshSession,
  updateUserAccess
} from './service';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(2).max(120),
  confirmPassword: z.string().min(8).max(128)
}).refine((value) => value.password === value.confirmPassword, {
  message: 'PASSWORDS_DO_NOT_MATCH',
  path: ['confirmPassword']
});

const refreshSchema = z.object({ refreshToken: z.string().min(20) });
const accessSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'BLOCK', 'ACTIVATE']),
  role: z.nativeEnum(UserRole).optional(),
  note: z.string().max(500).optional()
});

function requestContext(request: { ip: string; headers: Record<string, unknown> }) {
  return {
    ipAddress: request.ip,
    userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });
    }

    try {
      const result = await registerUser(parsed.data);
      if (result.requiresApproval) {
        return reply.status(202).send({
          status: 'PENDING_APPROVAL',
          message: 'Solicitação enviada ao administrador.',
          administratorEmail: result.administratorEmail
        });
      }

      const user = result.user;
      const accessToken = await reply.jwtSign({ sub: user.id, role: user.role, email: user.email }, { expiresIn: '15m' });
      const refresh = await createRefreshSession({ userId: user.id, ...requestContext(request) });
      return reply.status(201).send({ user, accessToken, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt });
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_REGISTERED') {
        return reply.status(409).send({ error: 'EMAIL_ALREADY_REGISTERED' });
      }
      throw error;
    }
  });

  app.post('/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });

    const result = await authenticateUser(parsed.data.email, parsed.data.password);
    if ('error' in result) return reply.status(401).send({ error: result.error });

    const user = result.user;
    const accessToken = await reply.jwtSign({ sub: user.id, role: user.role, email: user.email }, { expiresIn: '15m' });
    const refresh = await createRefreshSession({ userId: user.id, ...requestContext(request) });
    return { user, accessToken, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt };
  });

  app.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR' });
    const consumed = await consumeRefreshSession(parsed.data.refreshToken);
    if (!consumed) return reply.status(401).send({ error: 'INVALID_REFRESH_TOKEN' });

    const accessToken = await reply.jwtSign({ sub: consumed.user.id, role: consumed.user.role, email: consumed.user.email }, { expiresIn: '15m' });
    const refresh = await createRefreshSession({ userId: consumed.user.id, ...requestContext(request) });
    return { user: consumed.user, accessToken, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt };
  });

  app.post('/logout', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR' });
    await revokeRefreshSession(parsed.data.refreshToken);
    return reply.status(204).send();
  });

  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await getUserById(request.user.sub);
    if (!user || !user.isActive) return reply.status(401).send({ error: 'USER_NOT_AVAILABLE' });
    return { user };
  });

  app.get('/users', { preHandler: app.authorize(['ADMIN']) }, async () => ({ users: await listUsers() }));

  app.patch('/users/:id/access', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const parsed = accessSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });
    const { id } = request.params as { id: string };
    try {
      return { user: await updateUserAccess({ actorId: request.user.sub, userId: id, ...parsed.data }) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      if (message === 'USER_NOT_FOUND') return reply.status(404).send({ error: message });
      if (message === 'PRIMARY_ADMIN_CANNOT_BE_BLOCKED') return reply.status(409).send({ error: message });
      throw error;
    }
  });

  app.post('/users/:id/reset-password', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await resetUserPassword({ actorId: request.user.sub, userId: id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      if (message === 'USER_NOT_FOUND') return reply.status(404).send({ error: message });
      if (message === 'USER_NOT_ACTIVE') return reply.status(409).send({ error: message });
      if (message === 'EMAIL_DELIVERY_FAILED') return reply.status(502).send({ error: message });
      throw error;
    }
  });
}
