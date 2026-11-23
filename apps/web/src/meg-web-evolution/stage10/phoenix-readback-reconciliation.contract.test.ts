/**
 * PT84: contratos puros e offline. Sem PostgreSQL, rede, Android ou mutação financeira.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  reconcilePhoenixReadback,
  reconcilePhoenixCanonicalHistory,
  classifyPhoenixConflict,
  verifyPhoenixRecoveredIntent,
  type PhoenixOperationIntent,
} from './phoenix-readback-reconciliation';

const intent: PhoenixOperationIntent = {
  operationId: 'pt84-operation-stable-001',
  userId: 'synthetic-owner-01',
  month: '2026-11',
  payloadFingerprint: 'synthetic-payload-hash-immutable',
  eventId: 'synthetic-canonical-event-01',
};
const accepted = {
  operationId: intent.operationId,
  event: { id: intent.eventId!, date: '2026-11-21' },
};
const confirmedSnapshot = {
  month: intent.month,
  user: { id: intent.userId },
  events: { items: [{ id: accepted.event.id, date: '2026-11-21' }] },
};
const pending = (reason: string, received: unknown) =>
  assert.deepEqual(received, { status: 'pending', reason });
const blocked = (reason: string, received: unknown) =>
  assert.deepEqual(received, { status: 'blocked', reason });

test('PT84 só confirma quando receipt e snapshot contêm o ID exato', () => {
  assert.deepEqual(reconcilePhoenixReadback(intent, accepted, confirmedSnapshot), {
    status: 'confirmed', eventId: accepted.event.id, operationId: intent.operationId,
  });
});

test('PT84 perda da resposta após commit permanece pendente, nunca confirmado', () => {
  pending('RECEIPT_NOT_RETURNED', reconcilePhoenixReadback(intent, null, confirmedSnapshot));
});

test('PT84 aceite sem readback permanece pendente', () => {
  pending('SNAPSHOT_UNAVAILABLE', reconcilePhoenixReadback(intent, accepted, null));
});

test('PT84 snapshot sem o evento original bloqueia falso confirmado', () => {
  pending('EVENT_NOT_IN_READBACK', reconcilePhoenixReadback(intent, accepted, {
    ...confirmedSnapshot, events: { items: [{ id: 'other-event', date: '2026-11-21' }] },
  }));
});

test('PT84 o mesmo valor e data de outro evento não confirmam a operação', () => {
  pending('EVENT_NOT_IN_READBACK', reconcilePhoenixReadback(intent, accepted, {
    ...confirmedSnapshot, events: { items: [{ id: 'another-event', date: accepted.event.date }] },
  }));
});

test('PT84 snapshot de outro titular nunca confirma', () => {
  blocked('USER_MISMATCH', reconcilePhoenixReadback(intent, accepted, {
    ...confirmedSnapshot, user: { id: 'foreign-owner' },
  }));
});

test('PT84 snapshot sem titular explícito nunca confirma', () => {
  blocked('USER_MISMATCH', reconcilePhoenixReadback(intent, accepted, {
    ...confirmedSnapshot, user: undefined,
  }));
});

test('PT84 snapshot de outro mês não confirma', () => {
  pending('SNAPSHOT_WRONG_MONTH', reconcilePhoenixReadback(intent, accepted, {
    ...confirmedSnapshot, month: '2026-10',
  }));
});

test('PT84 operationId recebido diferente bloqueia', () => {
  blocked('OPERATION_ID_MISMATCH', reconcilePhoenixReadback(intent, {
    ...accepted, operationId: 'other-operation',
  }, confirmedSnapshot));
});

test('PT84 evento retornado para outra operação bloqueia troca de ID', () => {
  blocked('EVENT_ID_MISMATCH', reconcilePhoenixReadback(intent, {
    ...accepted, event: { ...accepted.event, id: 'other-event' },
  }, confirmedSnapshot));
});

test('PT84 data da resposta não correspondente ao mês bloqueia', () => {
  blocked('EVENT_DATE_MISMATCH', reconcilePhoenixReadback(intent, {
    ...accepted, event: { ...accepted.event, date: '2026-10-31' },
  }, confirmedSnapshot));
});

test('PT84 data da releitura inconsistente bloqueia', () => {
  blocked('SNAPSHOT_EVENT_DATE_MISMATCH', reconcilePhoenixReadback(intent, accepted, {
    ...confirmedSnapshot,
    events: { items: [{ id: accepted.event.id, date: '2026-10-31' }] },
  }));
});

test('PT84 409 permanente interrompe sem repetir', () => {
  assert.deepEqual(classifyPhoenixConflict(409, false), {
    action: 'stop', reason: 'PERMANENT_409',
  });
});

test('PT84 409 transitório exige reconciliação mesma chave, não nova operação', () => {
  assert.deepEqual(classifyPhoenixConflict(409, true), {
    action: 'reconcile-same-operation', reason: 'RETRYABLE_409',
  });
});

test('PT84 409 sem retryable é ambíguo e falha fechado', () => {
  assert.deepEqual(classifyPhoenixConflict(409), {
    action: 'reconcile-same-operation', reason: 'UNKNOWN_409',
  });
});

test('PT84 HTTP não 409 não ganha regra inventada', () => {
  assert.deepEqual(classifyPhoenixConflict(503), { action: 'not-a-conflict' });
});

test('PT84 reinício com operação e payload idênticos preserva operação', () => {
  assert.deepEqual(verifyPhoenixRecoveredIntent({ ...intent }, intent.userId, intent.payloadFingerprint), {
    valid: true, intent,
  });
});

test('PT84 reinício sem registro durável não inventa operationId', () => {
  assert.deepEqual(verifyPhoenixRecoveredIntent(null, intent.userId, intent.payloadFingerprint), {
    valid: false, reason: 'NO_SAVED_INTENT',
  });
});

test('PT84 reinício de outro titular recusa intenção antiga', () => {
  assert.deepEqual(verifyPhoenixRecoveredIntent(intent, 'other-owner', intent.payloadFingerprint), {
    valid: false, reason: 'IDENTITY_CHANGED',
  });
});

test('PT84 alteração de payload impede replay de operação antiga', () => {
  assert.deepEqual(verifyPhoenixRecoveredIntent(intent, intent.userId, 'new-payload-fingerprint'), {
    valid: false, reason: 'PAYLOAD_CHANGED',
  });
});

test('PT84 operação sem identidade é rejeitada', () => {
  blocked('INTENT_INVALID', reconcilePhoenixReadback({
    ...intent, operationId: '',
  }, accepted, confirmedSnapshot));
});

test('PT84 histórico canônico completo confirma apenas evento original', () => {
  assert.deepEqual(reconcilePhoenixCanonicalHistory(intent, accepted, {
    kind: 'complete', items: [{ id: accepted.event.id, date: accepted.event.date }],
  }, intent.userId), {
    status: 'confirmed', eventId: accepted.event.id, operationId: intent.operationId,
  });
});

test('PT84 histórico canônico completo sem ID não confirma mesmo que haja outros eventos', () => {
  pending('EVENT_NOT_IN_READBACK', reconcilePhoenixCanonicalHistory(intent, accepted, {
    kind: 'complete', items: [{ id: 'unrelated-event', date: accepted.event.date }],
  }, intent.userId));
});

test('PT84 histórico limitado não é considerado prova de ausência ou confirmação', () => {
  pending('SNAPSHOT_UNAVAILABLE', reconcilePhoenixCanonicalHistory(intent, accepted, {
    kind: 'limit-exceeded', total: 20000, limit: 10000,
  }, intent.userId));
});

test('PT84 leitura canônica de outro usuário é bloqueada', () => {
  blocked('USER_MISMATCH', reconcilePhoenixCanonicalHistory(intent, accepted, {
    kind: 'complete', items: [{ id: accepted.event.id, date: accepted.event.date }],
  }, 'another-owner'));
});

test('PT84 história ausente é pendência, não falha definitiva', () => {
  pending('SNAPSHOT_UNAVAILABLE', reconcilePhoenixCanonicalHistory(intent, accepted, null, intent.userId));
});
