import type {FinancialEvent, FinancialEventPage} from '../../app/finance-client';

export type HistoryProgress = { loaded: number; total: number; pass: 1 | 2 };
export type HistoryPageRequest = (page: number, pageSize: number, signal: AbortSignal) => Promise<FinancialEventPage>;
const PAGE_SIZE = 100;

/**
 * GET /finance/events não publica revision/snapshot no contrato atual.
 * A UI não pode aplicar filtros/exportação ao primeiro lote como se fosse tudo.
 *
 * Faz duas leituras integrais independentes com cache desativado e confere
 * a ordem e o conteúdo serializado dos registros. Detecta alterações entre
 * as duas varreduras; NÃO substitui snapshot transacional de banco. Não
 * altera, combina ou recalcula lançamentos.
 */
export async function readAuthorizedHistory(
  fetchPage: HistoryPageRequest,
  signal: AbortSignal,
  onProgress: (progress: HistoryProgress) => void = () => {},
): Promise<FinancialEvent[]> {
  async function pass(number: 1 | 2): Promise<FinancialEvent[]> {
    const ids = new Set<string>();
    const rows: FinancialEvent[] = [];
    let expected: number | undefined;
    for (let page = 1; ; page += 1) {
      if (signal.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
      const result = await fetchPage(page, PAGE_SIZE, signal);
      if (signal.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
      if (!result || !Number.isSafeInteger(result.total) || result.total < 0 ||
          result.page !== page || result.pageSize !== PAGE_SIZE || !Array.isArray(result.items)) {
        throw new Error('A API retornou paginação financeira inválida.');
      }
      if (expected === undefined) expected = result.total;
      if (expected !== result.total) {
        throw new Error('O número de lançamentos mudou durante a consulta. Atualize o histórico.');
      }
      const remaining = expected - rows.length;
      if (remaining < 0 || result.items.length !== Math.min(PAGE_SIZE, remaining)) {
        throw new Error('A consulta retornou uma página incompleta ou repetida. Atualize o histórico.');
      }
      for (const item of result.items) {
        if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) {
          throw new Error('Foram encontrados registros inválidos ou repetidos. Atualize o histórico.');
        }
        ids.add(item.id);
        rows.push(item);
      }
      onProgress({loaded: rows.length, total: expected, pass: number});
      if (rows.length === expected) return rows;
    }
  }
  const first = await pass(1);
  const second = await pass(2);
  if (first.length !== second.length ||
      first.some((entry, index) => JSON.stringify(entry) !== JSON.stringify(second[index]))) {
    throw new Error('O histórico mudou durante a verificação. Atualize para evitar resultados incompletos.');
  }
  return second;
}

export function displayMoney(value: string | number): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('Valor monetário inválido na consulta.');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 100))) {
    throw new Error('Valor monetário fora dos limites de exibição.');
  }
  return amount; // Conversão apenas para Intl.NumberFormat; sem cálculos de negócio.
}
