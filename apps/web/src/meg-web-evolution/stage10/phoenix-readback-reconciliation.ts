/**
 * PT84: contrato puro de reconciliação, exclusivo da Web Evolution.
 * Não grava, não faz retry, não calcula saldo e não altera Phoenix/Android.
 */
export type PhoenixOperationIntent = {
  operationId: string;
  userId: string;
  month: string;
  payloadFingerprint: string;
  eventId?: string;
};

export type PhoenixAcceptedReceipt = {
  operationId: string;
  event: { id: string; date: string };
};

export type PhoenixConfirmationSnapshot = {
  month: string;
  user?: { id?: string } | null;
  events?: { items?: Array<{ id: string; date: string }> } | null;
};

export type PhoenixConfirmationDecision =
  | { status: 'confirmed'; eventId: string; operationId: string }
  | { status: 'pending'; reason:
      'RECEIPT_NOT_RETURNED' | 'SNAPSHOT_UNAVAILABLE' |
      'SNAPSHOT_WRONG_MONTH' | 'EVENT_NOT_IN_READBACK' }
  | { status: 'blocked'; reason:
      'INTENT_INVALID' | 'OPERATION_ID_MISMATCH' | 'EVENT_ID_MISMATCH' |
      'USER_MISMATCH' | 'EVENT_DATE_MISMATCH' | 'SNAPSHOT_EVENT_DATE_MISMATCH' };

function validMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function validIntent(intent: PhoenixOperationIntent) {
  return typeof intent.operationId === 'string' && intent.operationId.trim().length > 0
    && typeof intent.userId === 'string' && intent.userId.trim().length > 0
    && typeof intent.payloadFingerprint === 'string' && intent.payloadFingerprint.trim().length > 0
    && validMonth(intent.month);
}

/** Não presume que operação aceita equivale a operação confirmada. */
export function reconcilePhoenixReadback(
  intent: PhoenixOperationIntent,
  accepted: PhoenixAcceptedReceipt | null,
  snapshot: PhoenixConfirmationSnapshot | null
): PhoenixConfirmationDecision {
  if (!validIntent(intent)) return { status: 'blocked', reason: 'INTENT_INVALID' };
  if (!accepted?.event?.id) return { status: 'pending', reason: 'RECEIPT_NOT_RETURNED' };
  if (accepted.operationId !== intent.operationId) {
    return { status: 'blocked', reason: 'OPERATION_ID_MISMATCH' };
  }
  if (intent.eventId && accepted.event.id !== intent.eventId) {
    return { status: 'blocked', reason: 'EVENT_ID_MISMATCH' };
  }
  if (String(accepted.event.date).slice(0, 7) !== intent.month) {
    return { status: 'blocked', reason: 'EVENT_DATE_MISMATCH' };
  }
  if (!snapshot) return { status: 'pending', reason: 'SNAPSHOT_UNAVAILABLE' };
  if (snapshot.user?.id !== intent.userId) {
    return { status: 'blocked', reason: 'USER_MISMATCH' };
  }
  if (snapshot.month !== intent.month) {
    return { status: 'pending', reason: 'SNAPSHOT_WRONG_MONTH' };
  }
  const found = snapshot.events?.items?.find(event => event.id === accepted.event.id);
  if (!found) return { status: 'pending', reason: 'EVENT_NOT_IN_READBACK' };
  if (String(found.date).slice(0, 7) !== intent.month) {
    return { status: 'blocked', reason: 'SNAPSHOT_EVENT_DATE_MISMATCH' };
  }
  return { status: 'confirmed', eventId: found.id, operationId: intent.operationId };
}

export type PhoenixConflictDecision =
  | { action: 'stop'; reason: 'PERMANENT_409' }
  | { action: 'reconcile-same-operation'; reason: 'RETRYABLE_409' | 'UNKNOWN_409' }
  | { action: 'not-a-conflict' };

/** 409 desconhecido não autoriza nova chave nem retry automático. */
export function classifyPhoenixConflict(
  status: number, retryable?: boolean
): PhoenixConflictDecision {
  if (status !== 409) return { action: 'not-a-conflict' };
  if (retryable === false) return { action: 'stop', reason: 'PERMANENT_409' };
  return {
    action: 'reconcile-same-operation',
    reason: retryable === true ? 'RETRYABLE_409' : 'UNKNOWN_409',
  };
}

/** Estado restaurado é confiável somente com mesma identidade e payload. */
export function verifyPhoenixRecoveredIntent(
  saved: PhoenixOperationIntent | null, currentUserId: string,
  payloadFingerprint: string
): { valid: true; intent: PhoenixOperationIntent } |
   { valid: false; reason: 'NO_SAVED_INTENT' | 'IDENTITY_CHANGED' | 'PAYLOAD_CHANGED' | 'INTENT_INVALID' } {
  if (!saved) return { valid: false, reason: 'NO_SAVED_INTENT' };
  if (!validIntent(saved)) return { valid: false, reason: 'INTENT_INVALID' };
  if (saved.userId !== currentUserId) return { valid: false, reason: 'IDENTITY_CHANGED' };
  if (saved.payloadFingerprint !== payloadFingerprint) return { valid: false, reason: 'PAYLOAD_CHANGED' };
  return { valid: true, intent: saved };
}

/** A história completa é leitura canônica; limite excedido nunca confirma por ausência. */
export type PhoenixCanonicalHistory =
  | { kind: 'complete'; items: Array<{ id: string; date: string }> }
  | { kind: 'limit-exceeded'; total: number; limit: number };

export function reconcilePhoenixCanonicalHistory(
  intent: PhoenixOperationIntent,
  accepted: PhoenixAcceptedReceipt | null,
  history: PhoenixCanonicalHistory | null,
  authenticatedUserId: string
): PhoenixConfirmationDecision {
  if (!history || history.kind !== 'complete') {
    return { status: 'pending', reason: 'SNAPSHOT_UNAVAILABLE' };
  }
  return reconcilePhoenixReadback(intent, accepted, {
    month: intent.month,
    user: { id: authenticatedUserId },
    events: { items: history.items },
  });
}
