function itemsById(value: unknown) {
  const map = new Map<string, unknown>();
  for (const item of Array.isArray(value) ? value : []) {
    const id = typeof item === 'object' && item && typeof (item as { id?: unknown }).id === 'string'
      ? (item as { id: string }).id
      : '';
    if (id) map.set(id, item);
  }
  return map;
}

export function buildMutationConfirmation(
  state: unknown,
  operationId: string,
  revision: number,
  upsertIds: string[],
  deleteIds: string[],
  activityIds: string[],
) {
  const source = state && typeof state === 'object' ? state as Record<string, unknown> : {};
  const transactions = itemsById(source.transactions);
  const activities = itemsById(source.activityLog);
  return {
    operationId,
    revision,
    committed: true,
    upserts: upsertIds.map((id) => transactions.get(id)).filter(Boolean),
    deletes: deleteIds.filter((id) => !transactions.has(id)),
    activities: activityIds.map((id) => activities.get(id)).filter(Boolean),
  };
}
