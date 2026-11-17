/**
 * Contrato de compatibilidade do outbox Android/WebView.
 * Rejeicao financeira permanente nao e confirmacao e nao pode gerar replay sem fim.
 * Nao altera a semantica de qualquer evento, conta, cartao ou beneficio.
 */
const PERMANENT = new Set([
  'NORMALIZATION_INVALID_SOURCE',
  'NORMALIZATION_DUPLICATE_LEGACY_ID',
  'NORMALIZATION_EVENT_OWNER_MISMATCH',
  'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE',
  'NORMALIZATION_INVALID_ACCOUNT_SCOPE',
  'NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER',
  'NORMALIZATION_CANONICAL_CATEGORY_CONFLICT',
  'NORMALIZATION_CANONICAL_PAYMENT_METHOD_CONFLICT',
  'NORMALIZATION_ACCOUNT_CHANGE_REQUIRES_CANONICAL_WRITER',
  'OPERATION_ID_REUSED',
]);
const REVISION = new Set([
  'STATE_CONFLICT', 'NORMALIZATION_REVISION_CONFLICT',
  'NORMALIZATION_CONCURRENT_EVENT_CHANGE',
]);

export function decideLegacyOutboxRejection(status, payload) {
  const code = payload && typeof payload === 'object' && !Array.isArray(payload)
    && typeof payload.error === 'string' ? payload.error : '';
  if (status === 409) {
    // Codigo de revisao reconhecido prevalece mesmo diante de flags ausentes.
    if (REVISION.has(code)) return { action: 'retry-after-refresh', code };
    if (PERMANENT.has(code) || (code && payload?.retryable === false)) {
      return { action: 'manual-resolution-required', code };
    }
    return { action: 'retry-after-refresh', code };
  }
  // Mutacoes invalidas ou recusadas nao devem sofrer retry automatico.
  if ([400, 403, 404, 422].includes(status)) {
    return { action: 'manual-resolution-required', code: code || 'HTTP_' + status };
  }
  // Nao estacionar por uma falha potencialmente transitória de sessao/rede.
  return { action: 'retry-later', code };
}

export function protectedOutboxConflict(pending, marker) {
  return Boolean(marker && typeof marker === 'object'
    && typeof marker.code === 'string' && marker.code
    && pending && (
      (Array.isArray(pending.upserts) && pending.upserts.length > 0)
      || (Array.isArray(pending.deletes) && pending.deletes.length > 0)
      || (Array.isArray(pending.activities) && pending.activities.length > 0)
    ));
}
