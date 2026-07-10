import fastifyJwt from '@fastify/jwt';
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
}
