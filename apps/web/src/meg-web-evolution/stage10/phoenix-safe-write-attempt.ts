/**
 * PT87: orquestração por portas injetadas. Não integra UI/Android/API reais.
 * Não executa retry automático e exige reserva prévia de identidade da operação.
 */
import {
  verifyPhoenixRecoveredIntent,
  type PhoenixAcceptedReceipt,
  type PhoenixCanonicalHistory,
  type PhoenixOperationIntent,
} from './phoenix-readback-reconciliation';
import {
  safePhoenixAckReduce,
  type SafePhoenixAckState,
} from './phoenix-safe-ack-state';

export type SafePhoenixGatewayReply =
  | ({ status: 'accepted' | 'confirmed' } & PhoenixAcceptedReceipt)
  | { status: 'error'; code: string; operationId: string;
      httpStatus?: number; retryable?: boolean };

export type SafePhoenixWritePorts = {
  /** Deve armazenar antes de transmitir; devolve a mesma identidade salva. */
  reserveIntent: (intent: PhoenixOperationIntent) => Promise<PhoenixOperationIntent>;
  /** Chama writer apenas uma vez; nunca recebe instrução de gerar outra chave. */
  submitOnce: (intent: PhoenixOperationIntent) => Promise<SafePhoenixGatewayReply>;
  /** Leitura canônica autenticada, sem cache de escrita. */
  loadCanonicalHistory: () => Promise<PhoenixCanonicalHistory>;
};

function extractConflict(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  const source = error as { httpStatus?: number; status?: number; retryable?: boolean };
  if (source.httpStatus !== 409 && source.status !== 409) return null;
  return { type: 'http-409' as const, retryable: source.retryable };
}

/** Retorna pending em qualquer resposta ambígua; bloqueia antes de enviar se não reservar. */
export async function runSafePhoenixWriteAttempt(
  intent: PhoenixOperationIntent,
  authenticatedUserId: string,
  ports: SafePhoenixWritePorts
): Promise<SafePhoenixAckState> {
  const check = verifyPhoenixRecoveredIntent(intent, authenticatedUserId, intent.payloadFingerprint);
  if (!check.valid) return { phase: 'blocked', intent, reason: check.reason };

  let reserved: PhoenixOperationIntent;
  try {
    reserved = await ports.reserveIntent(intent);
  } catch {
    return { phase: 'blocked', intent, reason: 'INTENT_PERSISTENCE_FAILED_NO_WRITE' };
  }
  const storedCheck = verifyPhoenixRecoveredIntent(
    reserved, intent.userId, intent.payloadFingerprint
  );
  if (!storedCheck.valid || reserved.operationId !== intent.operationId
    || reserved.month !== intent.month || reserved.eventId !== intent.eventId) {
    return { phase: 'blocked', intent, reason: 'INTENT_PERSISTENCE_MISMATCH_NO_WRITE' };
  }

  let state = safePhoenixAckReduce(
    { phase: 'ready' }, { type: 'start', intent: reserved }
  );
  let result: SafePhoenixGatewayReply;
  try {
    result = await ports.submitOnce(reserved);
  } catch (error) {
    const conflict = extractConflict(error);
    return safePhoenixAckReduce(state, conflict || { type: 'response-lost' });
  }
  if (result.status === 'error') {
    if (result.operationId !== reserved.operationId) {
      return { phase: 'blocked', intent: reserved, reason: 'ERROR_OPERATION_ID_MISMATCH' };
    }
    if (result.httpStatus === 409) {
      return safePhoenixAckReduce(state, {
        type: 'http-409', retryable: result.retryable,
      });
    }
    return safePhoenixAckReduce(state, { type: 'response-lost' });
  }

  // Até mesmo um "confirmed" devolvido pelo gateway é provisório sem readback.
  state = safePhoenixAckReduce(state, {
    type: 'post-accepted', receipt: {
      operationId: result.operationId, event: result.event,
    },
  });
  if (state.phase !== 'pending') return state;

  let history: PhoenixCanonicalHistory;
  try {
    history = await ports.loadCanonicalHistory();
  } catch {
    return { ...state, reason: 'READBACK_UNAVAILABLE_PRESERVE_OPERATION_ID' };
  }
  return safePhoenixAckReduce(state, {
    type: 'readback', history, authenticatedUserId,
  });
}
