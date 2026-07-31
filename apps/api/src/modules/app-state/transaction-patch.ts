export type AppTransaction = {
  id: string;
  [key: string]: unknown;
};

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function validTransaction(value: unknown): value is AppTransaction {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { id?: unknown }).id === 'string');
}

export function applyTransactionPatch(
  state: unknown,
  upserts: AppTransaction[],
  deletes: string[],
): Record<string, unknown> {
  const source = objectRecord(state);
  const current = Array.isArray(source.transactions)
    ? source.transactions.filter(validTransaction)
    : [];
  const deletedIds = new Set(deletes);
  const pendingUpserts = new Map(upserts.map((item) => [item.id, item]));
  const transactions: AppTransaction[] = [];

  for (const item of current) {
    if (deletedIds.has(item.id)) continue;
    const replacement = pendingUpserts.get(item.id);
    if (replacement) {
      transactions.push(replacement);
      pendingUpserts.delete(item.id);
    } else {
      transactions.push(item);
    }
  }

  for (const item of pendingUpserts.values()) transactions.push(item);

  return { ...source, transactions };
}
