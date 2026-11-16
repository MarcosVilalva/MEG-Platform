/** Etapa 10: adaptação somente leitura do histórico canônico para sugestões.
 * Nunca cria lançamentos, calcula valores ou substitui o catálogo autorizado.
 */
export type HistoricalAutocompleteRow = {
  id: string;
  description: string;
  date?: unknown;
  amount?: unknown;
  categoryId?: string | null;
  accountId?: string | null;
  paymentMethodId?: string | null;
  category?: { id: string; name?: string } | null;
  account?: { id: string; name?: string } | null;
  paymentMethod?: { id: string; name?: string } | null;
};

export type HistorySnapshot =
  | { kind: 'complete'; protocol: 'financial-history-v1'; items: HistoricalAutocompleteRow[] }
  | { kind: 'limit-exceeded'; protocol: 'financial-history-v1'; total: number; limit: number };

export type AutocompleteSuggestion = {
  sourceEventId: string;
  description: string;
  categoryId: string | null;
  accountId: string | null;
  paymentMethodId: string | null;
  categoryName: string | null;
  accountName: string | null;
  paymentMethodName: string | null;
};

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

/**
 * A sugestão devolve somente os vínculos históricos; não copia valor, data,
 * competência ou status. Resposta incompleta exige tratamento próprio,
 * não fallback para números inventados ou cache legado.
 */
export function suggestionsFromCanonicalHistory(
  snapshot: HistorySnapshot,
  query: string,
  limit = 8,
): AutocompleteSuggestion[] {
  if (snapshot.protocol !== 'financial-history-v1' || snapshot.kind !== 'complete') return [];
  const term = fold(query);
  if (term.length < 2) return [];
  const cappedLimit = Number.isInteger(limit) ? Math.max(0, Math.min(limit, 20)) : 8;
  const distinct = new Set<string>();
  const results: AutocompleteSuggestion[] = [];
  for (const row of snapshot.items) {
    if (!row || typeof row.description !== 'string' || !fold(row.description).includes(term)) continue;
    const description = row.description.trim();
    if (!description) continue;
    const categoryId = row.categoryId ?? row.category?.id ?? null;
    const accountId = row.accountId ?? row.account?.id ?? null;
    const paymentMethodId = row.paymentMethodId ?? row.paymentMethod?.id ?? null;
    const signature = JSON.stringify([fold(description), categoryId, accountId, paymentMethodId]);
    if (distinct.has(signature)) continue;
    distinct.add(signature);
    results.push({
      sourceEventId: row.id,
      description,
      categoryId,
      accountId,
      paymentMethodId,
      categoryName: row.category?.name ?? null,
      accountName: row.account?.name ?? null,
      paymentMethodName: row.paymentMethod?.name ?? null,
    });
    if (results.length >= cappedLimit) break;
  }
  return results.slice(0, cappedLimit);
}

export type SuggestionSelection = Pick<AutocompleteSuggestion,
  'description' | 'categoryId' | 'accountId' | 'paymentMethodId'>;

/** Chamador deve conferir os IDs nos catálogos ativos antes de salvar. */
export function selectionFromSuggestion(suggestion: AutocompleteSuggestion): SuggestionSelection {
  return {
    description: suggestion.description,
    categoryId: suggestion.categoryId,
    accountId: suggestion.accountId,
    paymentMethodId: suggestion.paymentMethodId,
  };
}
