import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runSafePhoenixWriteAttempt, type SafePhoenixWritePorts } from './phoenix-safe-write-attempt';
import type { PhoenixOperationIntent } from './phoenix-readback-reconciliation';

const intent: PhoenixOperationIntent = {
  operationId: 'pt87-stable-op', userId: 'pt87-owner', month: '2026-11',
  payloadFingerprint: 'pt87-unchanged-payload', eventId: 'pt87-financial-event',
};
const receipt = {
  status: 'accepted' as const,
  operationId: intent.operationId,
  event: { id: intent.eventId!, date: '2026-11-21' },
};
const history = {
  kind: 'complete' as const,
  items: [{ id: intent.eventId!, date: '2026-11-21' }],
};
function setup() {
  const calls = { reserve: 0, submit: 0, read: 0 };
  const ports: SafePhoenixWritePorts = {
    reserveIntent: async value => { calls.reserve++; return { ...value }; },
    submitOnce: async () => { calls.submit++; return receipt; },
    loadCanonicalHistory: async () => { calls.read++; return history; },
  };
  return { calls, ports };
}
test('PT87 reserva identidade antes do POST e confirma por histórico canônico', async () => {
  const { calls, ports } = setup();
  const result = await runSafePhoenixWriteAttempt(intent, intent.userId, ports);
  assert.equal(result.phase, 'confirmed');
  assert.deepEqual(calls, { reserve: 1, submit: 1, read: 1 });
});
test('PT87 aceite sem evento na leitura não pode confirmar', async () => {
  const { ports } = setup();
  ports.loadCanonicalHistory = async () => ({ kind: 'complete', items: [] });
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'pending');
});
test('PT87 confirmed prematuro devolvido pelo gateway não dispensa readback', async () => {
  const { ports } = setup();
  ports.submitOnce = async () => ({ ...receipt, status: 'confirmed' });
  ports.loadCanonicalHistory = async () => ({ kind: 'complete', items: [] });
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'pending');
});
test('PT87 resposta perdida após commit conserva chave e não repete POST', async () => {
  const { calls, ports } = setup();
  ports.submitOnce = async () => { calls.submit++; throw Error('NETWORK_LOST_POST_COMMIT'); };
  const result = await runSafePhoenixWriteAttempt(intent, intent.userId, ports);
  assert.equal(result.phase, 'pending');
  if (result.phase === 'pending') assert.equal(result.intent.operationId, intent.operationId);
  assert.deepEqual(calls, { reserve: 1, submit: 1, read: 0 });
});
test('PT87 falha de reserva antes do POST bloqueia escrita', async () => {
  const { calls, ports } = setup();
  ports.reserveIntent = async () => { calls.reserve++; throw Error('STORAGE_UNAVAILABLE'); };
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'blocked');
  assert.deepEqual(calls, { reserve: 1, submit: 0, read: 0 });
});
test('PT87 reserva de outra operação bloqueia escrita', async () => {
  const { calls, ports } = setup();
  ports.reserveIntent = async value => { calls.reserve++; return { ...value, operationId: 'other' }; };
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'blocked');
  assert.deepEqual(calls, { reserve: 1, submit: 0, read: 0 });
});
test('PT87 reserva de outro mês bloqueia escrita', async () => {
  const { calls, ports } = setup();
  ports.reserveIntent = async value => { calls.reserve++; return { ...value, month: '2026-10' }; };
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'blocked');
  assert.equal(calls.submit, 0);
});
test('PT87 409 permanente não repete', async () => {
  const { calls, ports } = setup();
  ports.submitOnce = async () => { calls.submit++; return {
    status: 'error', code: 'OPERATION_ID_REUSED', operationId: intent.operationId,
    httpStatus: 409, retryable: false,
  }; };
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'blocked');
  assert.equal(calls.submit, 1);
});
test('PT87 409 transitório exige reconciliação e não repete', async () => {
  const { calls, ports } = setup();
  ports.submitOnce = async () => { calls.submit++; return {
    status: 'error', code: 'STATE_CONFLICT', operationId: intent.operationId,
    httpStatus: 409, retryable: true,
  }; };
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'pending');
  assert.equal(calls.submit, 1);
});
test('PT87 409 sem retryable não reinicia operação', async () => {
  const { calls, ports } = setup();
  ports.submitOnce = async () => { calls.submit++; throw Object.assign(
    new Error('AMBIGUOUS_409'), { status: 409 }); };
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'pending');
  assert.equal(calls.submit, 1);
});
test('PT87 erro de readback conserva a intenção, sem confirmar', async () => {
  const { calls, ports } = setup();
  ports.loadCanonicalHistory = async () => { calls.read++; throw Error('READ_TIMEOUT'); };
  const result = await runSafePhoenixWriteAttempt(intent, intent.userId, ports);
  assert.equal(result.phase, 'pending');
  if (result.phase === 'pending') assert.equal(result.intent.operationId, intent.operationId);
  assert.equal(calls.submit, 1);
});
test('PT87 usuário diferente bloqueia até a reserva', async () => {
  const { calls, ports } = setup();
  assert.equal((await runSafePhoenixWriteAttempt(intent, 'different-owner', ports)).phase, 'blocked');
  assert.deepEqual(calls, { reserve: 0, submit: 0, read: 0 });
});
test('PT87 receipt de outro operationId bloqueia confirmação', async () => {
  const { ports } = setup();
  ports.submitOnce = async () => ({ ...receipt, operationId: 'foreign-operation' });
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'blocked');
});
test('PT87 resultado 409 com chave divergente é bloqueado', async () => {
  const { ports } = setup();
  ports.submitOnce = async () => ({
    status: 'error', code: 'STATE_CONFLICT', operationId: 'foreign-operation',
    httpStatus: 409, retryable: true,
  });
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'blocked');
});
test('PT87 histórico limitado mantém pendência', async () => {
  const { ports } = setup();
  ports.loadCanonicalHistory = async () => ({ kind: 'limit-exceeded', total: 7000, limit: 5000 });
  assert.equal((await runSafePhoenixWriteAttempt(intent, intent.userId, ports)).phase, 'pending');
});

test('PT87 reserva que altera eventId original é recusada antes de enviar', async () => {
  const { calls, ports } = setup();
  ports.reserveIntent = async value => { calls.reserve++; return { ...value, eventId: 'foreign-event-id' }; };
  const result = await runSafePhoenixWriteAttempt(intent, intent.userId, ports);
  assert.equal(result.phase, 'blocked');
  assert.equal(calls.submit, 0);
});
