import '@fastify/jwt';
import 'fastify';
import type { UserRole } from '@meg/database';

interface AuthenticatedUser {
  sub: string;
  role: UserRole;
  email: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    authorize: (
      roles: UserRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  }
}
