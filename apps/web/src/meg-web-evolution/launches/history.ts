import type { FinancialEvent, FinancialEventPage } from '../../app/finance-client';

export type EventsPageLoader = (page: number, pageSize: number, search: string, signal: AbortSignal) => Promise<FinancialEventPage>;

export type LoadProgress = { loaded: number; total: number };

/**
 * O DataGrid existente filtra e exporta no cliente. Só publicamos os dados
 * quando TODAS as páginas autorizadas forem obtidas e verificadas.
 * Nunca apresentar página parcial como se fosse o histórico inteiro.
 */
export async function loadAuthorizedEventHistory(
  loadPage: EventsPageLoader,
  signal: AbortSignal,
  onProgress: (progress: LoadProgress) => void = () => {},
): Promise<FinancialEvent[]> {
  const pageSize = 100; // máximo permitido no contrato GET /finance/events
  const rows: FinancialEvent[] = [];
  const ids = new Set<string>();
  let expectedTotal: number | null = null;
  let revision: string | null = null;

  for (let page = 1; ; page += 1) {
    if (signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
    const response = await loadPage(page, pageSize, '', signal);
    if (signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');

    if (!response || !Number.isSafeInteger(response.total) || response.total < 0
      || typeof response.revision !== 'string' || !response.revision
      || response.page !== page || response.pageSize !== pageSize
      || !Array.isArray(response.items)) {
      throw new Error('Resposta inválida da consulta financeira.');
    }
    if (expectedTotal === null) {
      expectedTotal = response.total;
      revision = response.revision;
    }
    if (response.revision !== revision) {
      throw new Error('Os lançamentos mudaram durante a leitura. Atualize o histórico completo.');
    }
    if (response.total !== expectedTotal) {
      throw new Error('O histórico mudou durante a consulta. Atualize para conferir todos os registros.');
    }
    const remaining = expectedTotal - rows.length;
    if (remaining < 0 || response.items.length !== Math.min(pageSize, remaining)) {
      throw new Error('A paginação retornou dados incompletos. Atualize antes de filtrar ou exportar.');
    }
    for (const item of response.items) {
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) {
        throw new Error('A paginação retornou lançamentos repetidos ou inválidos. Atualize.');
      }
      ids.add(item.id);
      rows.push(item);
    }
    onProgress({ loaded: rows.length, total: expectedTotal });
    if (rows.length === expectedTotal) {
      // Revalidar depois da última página, inclusive no histórico vazio.
      const confirm = await loadPage(1, pageSize, '', signal);
      if (signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
      if (!confirm || confirm.revision !== revision || confirm.total !== expectedTotal
        || confirm.page !== 1 || confirm.pageSize !== pageSize) {
        throw new Error('O histórico mudou antes da confirmação. Atualize a consulta.');
      }
      return rows;
    }
  }
}

/** Conversão estritamente de exibição; nenhuma regra de saldo é calculada na tela. */
export function displayEventAmount(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 100))) {
    throw new Error('Um lançamento possui valor fora dos limites de exibição.');
  }
  return amount;
}

export type EventGridRow = Record<string, unknown> & {
  id: string;
  date: string;
  competence: string;
  description: string;
  type: string;
  status: string;
  account: string;
  category: string;
  paymentMethod: string;
  amount: number;
  signedAmount: number;
};

export function toEventGridRows(items: FinancialEvent[]): EventGridRow[] {
  return items.map(item => ({
    id: item.id,
    date: item.date.slice(0, 10),
    competence: item.competence,
    description: item.description,
    type: item.type,
    status: item.status,
    account: item.account?.name || 'Sem conta',
    category: item.category?.name || 'Sem categoria',
    paymentMethod: item.paymentMethod?.name || 'Não informado',
    amount: displayEventAmount(item.amount),
    signedAmount: displayEventAmount(item.signedAmount),
  }));
}
