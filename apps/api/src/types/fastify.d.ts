import '@fastify/jwt';
import 'fastify';
import type { UserRole } from '@meg/database';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      role: UserRole;
      email: string;
    };
    user: {
      sub: string;
      role: UserRole;
      email: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  }
}
