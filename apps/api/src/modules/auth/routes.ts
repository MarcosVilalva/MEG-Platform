import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  authenticateUser,
  consumeRefreshSession,
  createRefreshSession,
  getUserById,
  registerUser,
  revokeRefreshSession
} from './service';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(2).max(120)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

function requestContext(request: { ip: string; headers: Record<string, unknown> }) {
  return {
    ipAddress: request.ip,
    userAgent: typeof request.headers['user-agent'] === 'string'
      ? request.headers['user-agent']
      : undefined
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors
      });
    }

    try {
      const user = await registerUser(parsed.data);
      const accessToken = await reply.jwtSign(
        { sub: user.id, role: user.role, email: user.email },
        { expiresIn: '15m' }
      );
      const refresh = await createRefreshSession({
        userId: user.id,
        ...requestContext(request)
      });

      return reply.status(201).send({
        user,
        accessToken,
        refreshToken: refresh.token,
        refreshExpiresAt: refresh.expiresAt
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_REGISTERED') {
        return reply.status(409).send({ error: 'EMAIL_ALREADY_REGISTERED' });
      }
      throw error;
    }
  });

  app.post('/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS' });
    }

    const accessToken = await reply.jwtSign(
      { sub: user.id, role: user.role, email: user.email },
      { expiresIn: '15m' }
    );
    const refresh = await createRefreshSession({
      userId: user.id,
      ...requestContext(request)
    });

    return {
      user,
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt
    };
  });

  app.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR' });
    }

    const consumed = await consumeRefreshSession(parsed.data.refreshToken);
    if (!consumed) {
      return reply.status(401).send({ error: 'INVALID_REFRESH_TOKEN' });
    }

    const accessToken = await reply.jwtSign(
      {
        sub: consumed.user.id,
        role: consumed.user.role,
        email: consumed.user.email
      },
      { expiresIn: '15m' }
    );
    const refresh = await createRefreshSession({
      userId: consumed.user.id,
      ...requestContext(request)
    });

    return {
      user: consumed.user,
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt
    };
  });

  app.post('/logout', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR' });
    }

    await revokeRefreshSession(parsed.data.refreshToken);
    return reply.status(204).send();
  });

  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.sub;
    const user = await getUserById(userId);

    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'USER_NOT_AVAILABLE' });
    }

    return { user };
  });
}
