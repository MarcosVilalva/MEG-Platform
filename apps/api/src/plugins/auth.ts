import fastifyJwt from '@fastify/jwt';
import type { UserRole } from '@meg/database';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config';

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
    };
  });
}
