/**
 * Contrato de falha fechada da sincronização normalizada.
 *
 * Compatibilidade: campos adicionais são aditivos; clientes antigos ignoram
 * retryable e continuam com sua política legada. Não libera deploy para Android.
 */
export const NORMALIZATION_WRITE_CONFLICTS = new Set([
  'NORMALIZATION_INVALID_SOURCE',
  'NORMALIZATION_DUPLICATE_LEGACY_ID',
  'NORMALIZATION_EVENT_OWNER_MISMATCH',
  'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE',
  'NORMALIZATION_INVALID_ACCOUNT_SCOPE',
  'NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER',
  'NORMALIZATION_CANONICAL_CATEGORY_CONFLICT',
  'NORMALIZATION_CANONICAL_PAYMENT_METHOD_CONFLICT',
  'NORMALIZATION_ACCOUNT_CHANGE_REQUIRES_CANONICAL_WRITER',
  'NORMALIZATION_CONCURRENT_EVENT_CHANGE',
]);

export function normalizationWriteConflictCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  return NORMALIZATION_WRITE_CONFLICTS.has(error.message) ? error.message : null;
}

export function normalizationWriteConflictPayload(code: string, revision: number) {
  if (!NORMALIZATION_WRITE_CONFLICTS.has(code)) {
    throw new Error('NORMALIZATION_UNKNOWN_CONFLICT_CODE');
  }
  // Apenas concorrência pode ser repetida, depois de buscar a revisão atual.
  const retryable = code === 'NORMALIZATION_CONCURRENT_EVENT_CHANGE';
  return {
    error: code,
    revision,
    retryable,
  };
}
