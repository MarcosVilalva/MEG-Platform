/**
 * Política de conflitos destinada EXCLUSIVAMENTE ao novo cliente Web.
 * Não importá-la no bundle legado/Capacitor enquanto Android estiver congelado.
 *
 * Este módulo decide o destino do outbox, nunca confirma pagamento/lancamento.
 */
export type Stage10WriteConflictAction =
  | 'confirmed'
  | 'refresh-and-retry-bounded'
  | 'keep-protected-requires-resolution'
  | 'keep-protected-offline';

const REVISION_RETRYABLE = new Set([
  'STATE_CONFLICT',
  'NORMALIZATION_REVISION_CONFLICT',
  'NORMALIZATION_CONCURRENT_EVENT_CHANGE',
]);

function codeOf(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
  const code = (payload as { error?: unknown }).error;
  return typeof code === 'string' ? code : '';
}

export function decideStage10WriteConflict(
  status: number,
  payload: unknown,
): {
  action: Stage10WriteConflictAction;
  code: string;
  preserveOutbox: boolean;
} {
  const code = codeOf(payload);
  // Sem resposta, não sabemos se o servidor confirmou. Preservar operação.
  if (status === 0) return { action: 'keep-protected-offline', code, preserveOutbox: true };

  if (status >= 200 && status < 300) {
    // O HTTP bem-sucedido NÃO basta para excluir o outbox. O cliente ainda
    // deve verificar recibo/releitura canônica antes de liberar a operação.
    return { action: 'confirmed', code, preserveOutbox: true };
  }

  if (status === 409 && REVISION_RETRYABLE.has(code)) {
    // Somente com nova leitura de revisão, e limitado pelo cliente.
    return { action: 'refresh-and-retry-bounded', code, preserveOutbox: true };
  }

  // Qualquer 4xx permanente ou conflito desconhecido nunca vira sucesso,
  // nunca é descartado e jamais é repetido automaticamente até o infinito.
  return { action: 'keep-protected-requires-resolution', code, preserveOutbox: true };
}
