import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type RateLimitRule = {
  scope: string;
  max: number;
  windowMs: number;
  key: (request: FastifyRequest) => string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweepAt = 0;

  hit(key: string, max: number, windowMs: number, now = Date.now()): RateLimitResult {
    if (now - this.lastSweepAt > 60_000) {
      this.sweep(now);
      this.lastSweepAt = now;
    }

    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: Math.max(0, max - 1), resetAt };
    }

    if (current.count >= max) {
      return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, max - current.count),
      resetAt: current.resetAt,
    };
  }

  clear() {
    this.buckets.clear();
    this.lastSweepAt = 0;
  }

  private sweep(now: number) {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

const limiter = new InMemoryRateLimiter();

function normalizeEmail(body: unknown) {
  if (!body || typeof body !== 'object') return 'unknown';
  const raw = (body as Record<string, unknown>).email;
  return typeof raw === 'string' && raw.trim()
    ? raw.trim().toLowerCase()
    : 'unknown';
}

function refreshFingerprint(body: unknown) {
  if (!body || typeof body !== 'object') return 'unknown';
  const raw = (body as Record<string, unknown>).refreshToken;
  if (typeof raw !== 'string' || !raw) return 'unknown';
  return createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

function requestIp(request: FastifyRequest) {
  return request.ip || 'unknown';
}

export function createRateLimitPreHandler(rule: RateLimitRule) {
  return async function rateLimitPreHandler(request: FastifyRequest, reply: FastifyReply) {
    const now = Date.now();
    const key = `${rule.scope}:${rule.key(request)}`;
    const result = limiter.hit(key, rule.max, rule.windowMs, now);
    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - now) / 1000));

    reply.header('X-RateLimit-Limit', String(rule.max));
    reply.header('X-RateLimit-Remaining', String(result.remaining));
    reply.header('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      reply.header('Retry-After', String(retryAfterSeconds));
      return reply.code(429).send({
        error: 'RATE_LIMITED',
        retryAfterSeconds,
      });
    }
  };
}

export const externalRateLimiters = {
  automation: createRateLimitPreHandler({
    scope: 'external-automation-ip',
    max: 120,
    windowMs: 60 * 60 * 1000,
    key: requestIp,
  }),
  voice: createRateLimitPreHandler({
    scope: 'external-voice-ip',
    max: 120,
    windowMs: 15 * 60 * 1000,
    key: requestIp,
  }),
  advisor: createRateLimitPreHandler({
    scope: 'external-advisor-ip',
    max: 60,
    windowMs: 15 * 60 * 1000,
    key: requestIp,
  }),
};

export const authRateLimiters = {
  register: createRateLimitPreHandler({
    scope: 'auth-register-ip',
    max: 10,
    windowMs: 60 * 60 * 1000,
    key: requestIp,
  }),
  loginIp: createRateLimitPreHandler({
    scope: 'auth-login-ip',
    max: 60,
    windowMs: 15 * 60 * 1000,
    key: requestIp,
  }),
  loginAccount: createRateLimitPreHandler({
    scope: 'auth-login-account',
    max: 20,
    windowMs: 15 * 60 * 1000,
    key: (request) => normalizeEmail(request.body),
  }),
  forgotPasswordIp: createRateLimitPreHandler({
    scope: 'auth-forgot-ip',
    max: 20,
    windowMs: 60 * 60 * 1000,
    key: requestIp,
  }),
  forgotPasswordAccount: createRateLimitPreHandler({
    scope: 'auth-forgot-account',
    max: 5,
    windowMs: 60 * 60 * 1000,
    key: (request) => normalizeEmail(request.body),
  }),
  refresh: createRateLimitPreHandler({
    scope: 'auth-refresh-token',
    max: 30,
    windowMs: 15 * 60 * 1000,
    key: (request) => refreshFingerprint(request.body),
  }),
};

export function registerSecurityHeaders(app: FastifyInstance) {
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    if (!request.url.startsWith('/docs')) {
      reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    }

    if (
      request.url.startsWith('/auth')
      || request.url.startsWith('/platform-admin')
      || request.url.startsWith('/integrations')
    ) {
      reply.header('Cache-Control', 'no-store');
      reply.header('Pragma', 'no-cache');
    }

    return payload;
  });
}

export function resetSecurityRateLimitersForTests() {
  limiter.clear();
}
