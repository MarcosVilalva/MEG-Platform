import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safePhoenixAckReduce, type SafePhoenixAckState } from './phoenix-safe-ack-state';
import type { PhoenixOperationIntent } from './phoenix-readback-reconciliation';

const intent: PhoenixOperationIntent = {
  operationId: 'pt86-unchanged-operation', userId: 'owner-pt86',
  month: '2026-11', payloadFingerprint: 'same-payload', eventId: 'event-pt86',
};
const receipt = { operationId: intent.operationId,
  event: { id: intent.eventId!, date: '2026-11-21' } };
const history = { kind: 'complete' as const,
  items: [{ id: receipt.event.id, date: receipt.event.date }] };
const start = (): SafePhoenixAckState =>
  safePhoenixAckReduce({ phase: 'ready' }, { type: 'start', intent });

test('PT86 aceito fica pendente, sem confirmação prematura', () => {
  const accepted = safePhoenixAckReduce(start(), { type: 'post-accepted', receipt });
  assert.equal(accepted.phase, 'pending');
  if (accepted.phase === 'pending') {
    assert.equal(accepted.reason, 'ACCEPTED_IS_NOT_CONFIRMED');
    assert.equal(accepted.intent.operationId, intent.operationId);
  }
});
test('PT86 falha de transporte preserva operação original', () => {
  const state = safePhoenixAckReduce(start(), { type: 'response-lost' });
  assert.equal(state.phase, 'pending');
  if (state.phase === 'pending') assert.equal(state.intent.operationId, intent.operationId);
});
test('PT86 mesma intenção pendente é preservada', () => {
  const first = start();
  assert.deepEqual(safePhoenixAckReduce(first, { type: 'start', intent: { ...intent } }), first);
});
test('PT86 operação diferente não substitui pendência anterior', () => {
  const state = safePhoenixAckReduce(start(), { type: 'start',
    intent: { ...intent, operationId: 'other-id' } });
  assert.equal(state.phase, 'blocked');
  if (state.phase === 'blocked') assert.equal(state.intent?.operationId, intent.operationId);
});
test('PT86 payload diferente não contorna chave antiga', () => {
  const state = safePhoenixAckReduce(start(), { type: 'start',
    intent: { ...intent, payloadFingerprint: 'other-payload' } });
  assert.equal(state.phase, 'blocked');
});
test('PT86 resposta aceita com operação alheia bloqueia', () => {
  const state = safePhoenixAckReduce(start(), { type: 'post-accepted',
    receipt: { ...receipt, operationId: 'foreign-key' } });
  assert.equal(state.phase, 'blocked');
});
test('PT86 histórico canônico sem evento permanece pendente', () => {
  const accepted = safePhoenixAckReduce(start(), { type: 'post-accepted', receipt });
  const state = safePhoenixAckReduce(accepted, { type: 'readback',
    history: { kind: 'complete', items: [] }, authenticatedUserId: intent.userId });
  assert.equal(state.phase, 'pending');
});
test('PT86 histórico com ID exato confirma', () => {
  const accepted = safePhoenixAckReduce(start(), { type: 'post-accepted', receipt });
  const state = safePhoenixAckReduce(accepted, { type: 'readback',
    history, authenticatedUserId: intent.userId });
  assert.equal(state.phase, 'confirmed');
  if (state.phase === 'confirmed') assert.equal(state.eventId, receipt.event.id);
});
test('PT86 só leitura sem recibo não confirma, mesmo com evento no histórico', () => {
  const state = safePhoenixAckReduce(start(), { type: 'readback',
    history, authenticatedUserId: intent.userId });
  assert.equal(state.phase, 'pending');
});
test('PT86 histórico canônico de outro usuário bloqueia', () => {
  const accepted = safePhoenixAckReduce(start(), { type: 'post-accepted', receipt });
  const state = safePhoenixAckReduce(accepted, { type: 'readback',
    history, authenticatedUserId: 'other-user' });
  assert.equal(state.phase, 'blocked');
});
test('PT86 409 transitório exige reconciliação da operação existente', () => {
  const state = safePhoenixAckReduce(start(), { type: 'http-409', retryable: true });
  assert.equal(state.phase, 'pending');
  if (state.phase === 'pending') assert.equal(state.reason, '409_RECONCILE_SAME_OPERATION');
});
test('PT86 409 sem retryable permanece ambíguo', () => {
  assert.equal(safePhoenixAckReduce(start(), { type: 'http-409' }).phase, 'pending');
});
test('PT86 409 permanente bloqueia retry', () => {
  const state = safePhoenixAckReduce(start(), { type: 'http-409', retryable: false });
  assert.equal(state.phase, 'blocked');
});
test('PT86 recuperação com chave e payload idênticos é pendente', () => {
  const state = safePhoenixAckReduce({ phase: 'ready' }, { type: 'restore',
    saved: intent, currentUserId: intent.userId,
    payloadFingerprint: intent.payloadFingerprint });
  assert.equal(state.phase, 'pending');
});
test('PT86 recuperação sem chave não inventa operação', () => {
  assert.equal(safePhoenixAckReduce({ phase: 'ready' }, { type: 'restore',
    saved: null, currentUserId: intent.userId,
    payloadFingerprint: intent.payloadFingerprint }).phase, 'blocked');
});
test('PT86 restauração de outro titular é bloqueada', () => {
  assert.equal(safePhoenixAckReduce({ phase: 'ready' }, { type: 'restore',
    saved: intent, currentUserId: 'other-user',
    payloadFingerprint: intent.payloadFingerprint }).phase, 'blocked');
});
test('PT86 restauração de payload alterado é bloqueada', () => {
  assert.equal(safePhoenixAckReduce({ phase: 'ready' }, { type: 'restore',
    saved: intent, currentUserId: intent.userId,
    payloadFingerprint: 'other-payload' }).phase, 'blocked');
});
test('PT86 estado bloqueado não permite criar operação por clique', () => {
  const blocked = safePhoenixAckReduce(start(), { type: 'http-409', retryable: false });
  const afterClick = safePhoenixAckReduce(blocked, { type: 'start',
    intent: { ...intent, operationId: 'another-op' } });
  assert.deepEqual(afterClick, blocked);
});
