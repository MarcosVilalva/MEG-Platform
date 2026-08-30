export type AppTransaction = {
  id: string;
  [key: string]: unknown;
};

export type AppActivity = {
  id: string;
  [key: string]: unknown;
};

const MAX_ACTIVITY_LOG_ITEMS = 500;

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function validTransaction(value: unknown): value is AppTransaction {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { id?: unknown }).id === 'string');
}

function validActivity(value: unknown): value is AppActivity {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { id?: unknown }).id === 'string' && (value as { id: string }).id.length > 0);
}

export function mergeActivityLog(state: unknown, incoming: unknown[] = []): AppActivity[] {
  const source = objectRecord(state);
  const current = Array.isArray(source.activityLog) ? source.activityLog.filter(validActivity) : [];
  const activities: AppActivity[] = [];
  const ids = new Set<string>();

  for (const list of [incoming, current]) {
    for (const item of list) {
      if (!validActivity(item) || ids.has(item.id)) continue;
      ids.add(item.id);
      activities.push(item);
      if (activities.length >= MAX_ACTIVITY_LOG_ITEMS) return activities;
    }
  }
  return activities;
}

export function applyTransactionPatch(
  state: unknown,
  upserts: AppTransaction[],
  deletes: string[],
  metadataPatch: Record<string, unknown> = {},
  activities: unknown[] = [],
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

  const metadata = { ...metadataPatch };
  const legacyActivities = Array.isArray(metadata.activityLog) ? metadata.activityLog : [];
  delete metadata.activityLog;
  const incomingActivities = [...activities, ...legacyActivities];
  const shouldKeepActivityLog = incomingActivities.length > 0 || Array.isArray(source.activityLog) || 'activityLog' in metadataPatch;
  const activityLog = shouldKeepActivityLog ? mergeActivityLog(source, incomingActivities) : undefined;

  return {
    ...source,
    ...metadata,
    transactions,
    ...(shouldKeepActivityLog ? { activityLog } : {}),
  };
}
