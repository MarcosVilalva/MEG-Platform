import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserApprovalStatus, UserRole } from '@meg/database';
import {
  authenticateUser,
  consumeRefreshSession,
  createRefreshSession,
  getUserById,
  listUsers,
  registerUser,
  revokeRefreshSession,
  updateUserAccess
} from './service';

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
const registerSchema = credentialsSchema.extend({
  name: z.string().min(2).max(120),
  confirmPassword: z.string().min(8).max(128)
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'PASSWORDS_DO_NOT_MATCH' });
const refreshSchema = z.object({ refreshToken: z.string().min(20) });
const accessSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  approvalStatus: z.nativeEnum(UserApprovalStatus).optional(),
  isActive: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, { message: 'EMPTY_UPDATE' });

function requestContext(request: { ip: string; headers: Record<string, unknown> }) {
  return { ipAddress: request.ip, userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });
    try {
      const result = await registerUser(parsed.data);
      if (result.requiresApproval) {
        app.log.info({ email: result.user.email, administratorEmail: result.administratorEmail }, 'New access request pending administrator approval');
        return reply.status(202).send({ status: 'PENDING_APPROVAL', administratorEmail: result.administratorEmail });
      }
      const accessToken = await reply.jwtSign({ sub: result.user.id, role: result.user.role, email: result.user.email }, { expiresIn: '15m' });
      const refresh = await createRefreshSession({ userId: result.user.id, ...requestContext(request) });
      return reply.status(201).send({ user: result.user, accessToken, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt });
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_REGISTERED') return reply.status(409).send({ error: 'EMAIL_ALREADY_REGISTERED' });
      throw error;
    }
  });

  app.post('/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors });
    const result = await authenticateUser(parsed.data.email, parsed.data.password);
    if (result.status === 'PENDING') return reply.status(403).send({ error: 'PENDING_APPROVAL' });
    if (result.status === 'REJECTED') return reply.status(403).send({ error: 'ACCESS_REJECTED' });
    if (result.status === 'INACTIVE') return reply.status(403).send({ error: 'USER_INACTIVE' });
    if (result.status !== 'OK') return reply.status(401).send({ error: 'INVALID_CREDENTIALS' });
    const accessToken = await reply.jwtSign({ sub: result.user.id, role: result.user.role, email: result.user.email }, { expiresIn: '15m' });
    const refresh = await createRefreshSession({ userId: result.user.id, ...requestContext(request) });
    return { user: result.user, accessToken, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt };
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
    if (!user || !user.isActive || user.approvalStatus !== UserApprovalStatus.APPROVED) return reply.status(401).send({ error: 'USER_NOT_AVAILABLE' });
    return { user };
  });

  app.get('/users', { preHandler: app.authorize(['ADMIN']) }, async () => ({ users: await listUsers() }));

  app.patch('/users/:id/access', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const parsed = accessSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    const { id } = request.params as { id: string };
    try {
      return { user: await updateUserAccess({ actorId: request.user.sub, userId: id, ...parsed.data }) };
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') return reply.status(404).send({ error: 'USER_NOT_FOUND' });
      throw error;
    }
  });
}