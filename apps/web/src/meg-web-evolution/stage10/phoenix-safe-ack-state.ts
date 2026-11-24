/**
 * PT86: estado de confirmação isolado da Web Evolution.
 * Não persiste, não reenvia e não altera a ponte Phoenix compartilhada.
 */
import {
  classifyPhoenixConflict,
  reconcilePhoenixCanonicalHistory,
  verifyPhoenixRecoveredIntent,
  type PhoenixAcceptedReceipt,
  type PhoenixCanonicalHistory,
  type PhoenixOperationIntent,
} from './phoenix-readback-reconciliation';

export type SafePhoenixAckState =
  | { phase: 'ready' }
  | { phase: 'pending'; intent: PhoenixOperationIntent;
      receipt?: PhoenixAcceptedReceipt; reason: string }
  | { phase: 'confirmed'; intent: PhoenixOperationIntent;
      receipt: PhoenixAcceptedReceipt; eventId: string }
  | { phase: 'blocked'; intent?: PhoenixOperationIntent;
      receipt?: PhoenixAcceptedReceipt; reason: string };

export type SafePhoenixAckAction =
  | { type: 'start'; intent: PhoenixOperationIntent }
  | { type: 'response-lost' }
  | { type: 'post-accepted'; receipt: PhoenixAcceptedReceipt }
  | { type: 'readback'; history: PhoenixCanonicalHistory | null;
      authenticatedUserId: string }
  | { type: 'http-409'; retryable?: boolean }
  | { type: 'restore'; saved: PhoenixOperationIntent | null;
      currentUserId: string; payloadFingerprint: string };

export function safePhoenixAckReduce(
  state: SafePhoenixAckState, action: SafePhoenixAckAction
): SafePhoenixAckState {
  if (action.type === 'restore') {
    if (state.phase !== 'ready') return state;
    const restored = verifyPhoenixRecoveredIntent(
      action.saved, action.currentUserId, action.payloadFingerprint
    );
    if (!restored.valid) return { phase: 'blocked', reason: restored.reason };
    return { phase: 'pending', intent: restored.intent, reason: 'RESTORED_NEEDS_READBACK' };
  }
  if (action.type === 'start') {
    if (state.phase === 'pending') {
      // Mesmo formulário não pode descartar uma tentativa ambígua.
      if (state.intent.operationId !== action.intent.operationId
        || state.intent.payloadFingerprint !== action.intent.payloadFingerprint) {
        return { phase: 'blocked', intent: state.intent,
          receipt: state.receipt, reason: 'PENDING_INTENT_MUST_BE_RECONCILED' };
      }
      return state;
    }
    if (state.phase === 'blocked') return state;
    return { phase: 'pending', intent: action.intent, reason: 'AWAITING_POST_RESPONSE' };
  }
  if (state.phase === 'ready' || state.phase === 'confirmed') return state;
  if (action.type === 'response-lost') {
    if (state.phase === 'blocked') return state;
    return { ...state, phase: 'pending', reason: 'RESPONSE_AMBIGUOUS_PRESERVE_OPERATION_ID' };
  }
  if (action.type === 'http-409') {
    const policy = classifyPhoenixConflict(409, action.retryable);
    if (policy.action === 'stop') {
      return { ...state, phase: 'blocked', reason: 'PERMANENT_409_NO_AUTOMATIC_RETRY' };
    }
    if (state.phase === 'blocked') return state;
    return { ...state, phase: 'pending', reason: '409_RECONCILE_SAME_OPERATION' };
  }
  if (state.phase === 'blocked') return state;
  if (action.type === 'post-accepted') {
    if (action.receipt.operationId !== state.intent.operationId) {
      return { phase: 'blocked', intent: state.intent, receipt: action.receipt,
        reason: 'OPERATION_ID_MISMATCH' };
    }
    return { phase: 'pending', intent: state.intent, receipt: action.receipt,
      reason: 'ACCEPTED_IS_NOT_CONFIRMED' };
  }
  if (action.type === 'readback') {
    const checked = reconcilePhoenixCanonicalHistory(
      state.intent, state.receipt || null, action.history, action.authenticatedUserId
    );
    if (checked.status === 'confirmed') {
      if (!state.receipt) return { ...state, phase: 'pending', reason: 'RECEIPT_NOT_RETURNED' };
      return { phase: 'confirmed', intent: state.intent, receipt: state.receipt,
        eventId: checked.eventId };
    }
    if (checked.status === 'blocked') {
      return { phase: 'blocked', intent: state.intent, receipt: state.receipt,
        reason: checked.reason };
    }
    return { ...state, phase: 'pending', reason: checked.reason };
  }
  return state;
}
