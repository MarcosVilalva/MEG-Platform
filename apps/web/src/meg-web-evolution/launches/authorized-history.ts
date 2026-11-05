import type {FinancialEvent, FinancialEventPage} from '../../app/finance-client';

export type HistoryProgress = { loaded: number; total: number; pass: 1 | 2 };
export type HistoryPageRequest = (page: number, pageSize: number, signal: AbortSignal) => Promise<FinancialEventPage>;
const PAGE_SIZE = 100;
const MAX_CONCURRENT_PAGES = 4;

/**
 * GET /finance/events ainda nao expoe uma revisao/snapshot transacional.
 * Leitura em duas passagens: nunca expor resultados parciais a filtros/exportacao.
 *
 * O primeiro GET fixa a contagem da passagem; as paginas restantes sao
 * consultadas em lotes limitados, anexadas em ordem de pagina e validadas
 * por total, tamanho e ID unico. Comparar as duas passagens e o sync-token
 * no chamador reduz o risco de alteracao concorrente, mas nao e snapshot.
 * Nao recalcula valores nem altera eventos financeiros.
 */
export async function readAuthorizedHistory(
  fetchPage: HistoryPageRequest,
  signal: AbortSignal,
  onProgress: (progress: HistoryProgress) => void = () => {},
): Promise<FinancialEvent[]> {
  async function pass(number: 1 | 2): Promise<FinancialEvent[]> {
    const ids = new Set<string>();
    const rows: FinancialEvent[] = [];
    const assertActive = () => {
      if (signal.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
    };
    const first = await fetchPage(1, PAGE_SIZE, signal);
    assertActive();
    if (!first || !Number.isSafeInteger(first.total) || first.total < 0 ||
        first.page !== 1 || first.pageSize !== PAGE_SIZE || !Array.isArray(first.items)) {
      throw new Error('A API retornou paginacao financeira invalida.');
    }
    const expected = first.total;
    const totalPages = Math.max(1, Math.ceil(expected / PAGE_SIZE));

    function append(page: number, result: FinancialEventPage) {
      assertActive();
      if (!result || !Number.isSafeInteger(result.total) || result.total !== expected ||
          result.page !== page || result.pageSize !== PAGE_SIZE || !Array.isArray(result.items)) {
        throw new Error('O numero de lancamentos mudou durante a consulta. Atualize o historico.');
      }
      const offset = (page - 1) * PAGE_SIZE;
      const requiredLength = Math.min(PAGE_SIZE, Math.max(0, expected - offset));
      if (result.items.length !== requiredLength || rows.length !== offset) {
        throw new Error('A consulta retornou uma pagina incompleta ou repetida. Atualize o historico.');
      }
      for (const item of result.items) {
        if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) {
          throw new Error('Foram encontrados registros invalidos ou repetidos. Atualize o historico.');
        }
        ids.add(item.id);
        rows.push(item);
      }
      onProgress({loaded: rows.length, total: expected, pass: number});
    }

    append(1, first);
    for (let begin = 2; begin <= totalPages; begin += MAX_CONCURRENT_PAGES) {
      assertActive();
      const pages = Array.from(
        {length: Math.min(MAX_CONCURRENT_PAGES, totalPages - begin + 1)},
        (_, index) => begin + index,
      );
      const responses = await Promise.all(pages.map(page => fetchPage(page, PAGE_SIZE, signal)));
      assertActive();
      // Respostas podem chegar fora de ordem; anexar somente na ordem canonica.
      responses.forEach((result, index) => append(pages[index]!, result));
    }
    return rows;
  }
  const first = await pass(1);
  const second = await pass(2);
  if (first.length !== second.length ||
      first.some((entry, index) => JSON.stringify(entry) !== JSON.stringify(second[index]))) {
    throw new Error('O historico mudou durante a verificacao. Atualize para evitar resultados incompletos.');
  }
  return second;
}

export function displayMoney(value: string | number): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('Valor monetario invalido na consulta.');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 100))) {
    throw new Error('Valor monetario fora dos limites de exibicao.');
  }
  return amount; // Conversao apenas para Intl.NumberFormat; sem calculos de negocio.
}
