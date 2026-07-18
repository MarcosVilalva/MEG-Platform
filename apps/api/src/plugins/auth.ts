import fastifyJwt from '@fastify/jwt';
import type { UserRole } from '@meg/database';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config';
import { resolveWorkspaceContext } from '../modules/workspaces/service';
import { assertWorkspaceWriteAccess } from '../modules/platform-admin/service';

export async function registerAuth(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: config.jwtSecret
  });

  app.decorate('authenticate', async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'UNAUTHORIZED' });
    }
  });

  app.decorate('authorize', function authorize(roles: UserRole[]) {
    return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'UNAUTHORIZED' });
      }

      if (!roles.includes(request.user.role)) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          requiredRoles: roles,
          currentRole: request.user.role
        });
      }

      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        try {
          const context = await resolveWorkspaceContext(request.user.sub);
          await assertWorkspaceWriteAccess(context.workspaceId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'LICENSE_REQUIRED';
          if (message.startsWith('LICENSE_')) return reply.status(402).send({ error: message, readOnly: true });
          throw error;
        }
      }
    };
  });
}
