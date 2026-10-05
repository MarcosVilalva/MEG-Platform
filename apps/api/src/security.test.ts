import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { InMemoryRateLimiter, registerSecurityHeaders } from './security';

const limiter = new InMemoryRateLimiter();
const start = 1_000_000;

const first = limiter.hit('login:user@example.com', 2, 60_000, start);
assert.equal(first.allowed, true);
assert.equal(first.remaining, 1);

const second = limiter.hit('login:user@example.com', 2, 60_000, start + 1);
assert.equal(second.allowed, true);
assert.equal(second.remaining, 0);

const blocked = limiter.hit('login:user@example.com', 2, 60_000, start + 2);
assert.equal(blocked.allowed, false);
assert.equal(blocked.remaining, 0);

const reset = limiter.hit('login:user@example.com', 2, 60_000, start + 60_001);
assert.equal(reset.allowed, true);
assert.equal(reset.remaining, 1);

const app = Fastify();
registerSecurityHeaders(app);
app.get('/public-check', async () => ({ ok: true }));
app.get('/auth/check', async () => ({ ok: true }));

const publicResponse = await app.inject({ method: 'GET', url: '/public-check' });
assert.equal(publicResponse.headers['x-content-type-options'], 'nosniff');
assert.equal(publicResponse.headers['x-frame-options'], 'DENY');
assert.equal(publicResponse.headers['referrer-policy'], 'no-referrer');
assert.match(String(publicResponse.headers['content-security-policy']), /default-src 'none'/);

const authResponse = await app.inject({ method: 'GET', url: '/auth/check' });
assert.equal(authResponse.headers['cache-control'], 'no-store');
assert.equal(authResponse.headers.pragma, 'no-cache');

await app.close();
console.log('Security hardening: rate limit e headers defensivos validados.');
