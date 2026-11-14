/**
 * INSTRUMENTACAO DE TESTE EXCLUSIVA PARA GITHUB ACTIONS PG17 EFEMERO.
 * Preload do processo filho, SEM mudar server.ts e SEM reduzir tempos reais.
 * Dispara callback registrado sob IPC somente quando o teste solicita.
 */
import assert from 'node:assert/strict';

const exactDb = 'postgresql://stage09:stage09@127.0.0.1:65431/meg_stage09_ephemeral?schema=public';
assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.DATABASE_URL, exactDb);
assert.equal(process.env.ADMIN_EMAIL, 'stage09-synthetic-admin@example.invalid');
assert.equal(process.env.STAGE09_TIMER_PROBE_ONLY, 'true');
assert.ok(['65432', '65433'].includes(process.env.PORT), 'porta permitida somente loopback');
assert.equal(process.env.HOST, '127.0.0.1');
assert.equal(process.env.RUN_LEGACY_REPAIR, 'false');
assert.equal(typeof process.send, 'function', 'IPC obrigatorio');
for (const key of ['RESEND_API_KEY', 'BREVO_API_KEY', 'EVOLUTION_API_KEY',
  'EVOLUTION_API_URL', 'NOTIFICATION_CRON_SECRET', 'NOTIFICATION_WATCHDOG_SECRET',
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  assert.ok(!process.env[key], 'integracao externa deve estar ausente');
}

const intervals = new Map();
const nativeSetInterval = globalThis.setInterval;
globalThis.setInterval = function(fn, ms, ...args) {
  const handle = nativeSetInterval(fn, ms, ...args);
  if (ms === 900000 || ms === 21600000) {
    assert.equal(typeof fn, 'function');
    assert.equal(intervals.has(ms), false, 'timer de manutencao duplicado');
    intervals.set(ms, () => fn(...args));
    process.send?.({ stage09: 'registered', ms });
  }
  return handle;
};

process.on('message', (message) => {
  if (!message || message.stage09 !== 'fire' || ![900000, 21600000].includes(message.ms)) return;
  const callback = intervals.get(message.ms);
  if (!callback) {
    process.send?.({ stage09: 'missing', ms: message.ms });
    return;
  }
  try {
    callback();
    process.send?.({ stage09: 'dispatched', ms: message.ms, seq: message.seq });
  } catch {
    process.send?.({ stage09: 'callback_sync_failure', ms: message.ms, seq: message.seq });
  }
});
