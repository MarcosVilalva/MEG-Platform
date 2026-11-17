/**
 * Política de conflitos destinada EXCLUSIVAMENTE ao novo cliente Web.
 * Não importá-la no bundle legado/Capacitor enquanto Android estiver congelado.
 *
 * Este módulo decide o destino do outbox, nunca confirma pagamento/lancamento.
 */
export type Stage10WriteConflictAction =
  | 'verify-server-receipt'
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
  attemptsAfterRefresh = 0,
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
    return { action: 'verify-server-receipt', code, preserveOutbox: true };
  }

  if (status === 409 && REVISION_RETRYABLE.has(code) && attemptsAfterRefresh < 3) {
    // Somente após releitura de revisão, até 3 tentativas no fluxo atual.
    return { action: 'refresh-and-retry-bounded', code, preserveOutbox: true };
  }

  // Tentativas de revisão esgotadas e 4xx permanentes nunca viram sucesso,
  // nunca é descartado e jamais é repetido automaticamente até o infinito.
  return { action: 'keep-protected-requires-resolution', code, preserveOutbox: true };
}
