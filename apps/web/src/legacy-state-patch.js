const DEFAULT_MAX_PATCH_OPERATIONS = 2000;

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function metadataSnapshot(state) {
  const source = plainObject(state) || {};
  const { transactions: _transactions, ...metadata } = source;
  return JSON.stringify(metadata);
}

function transactionSnapshot(item) {
  return JSON.stringify(item);
}

export function createStateSyncBaseline(state) {
  const source = plainObject(state) || {};
  const transactions = Array.isArray(source.transactions) ? source.transactions : [];
  const transactionSnapshots = new Map();

  transactions.forEach((item) => {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!id) return;
    transactionSnapshots.set(id, transactionSnapshot(item));
  });

  return {
    metadata: metadataSnapshot(source),
    transactions: transactionSnapshots,
  };
}

export function createTransactionPatch(baseline, state, { maxOperations = DEFAULT_MAX_PATCH_OPERATIONS } = {}) {
  if (!baseline || !(baseline.transactions instanceof Map)) return null;
  const source = plainObject(state);
  if (!source || !Array.isArray(source.transactions)) return null;
  if (metadataSnapshot(source) !== baseline.metadata) return null;

  const currentIds = new Set();
  const upserts = [];

  for (const item of source.transactions) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!id || currentIds.has(id)) return null;
    currentIds.add(id);
    if (baseline.transactions.get(id) !== transactionSnapshot(item)) upserts.push(item);
    if (upserts.length > maxOperations) return null;
  }

  const deletes = [];
  for (const id of baseline.transactions.keys()) {
    if (!currentIds.has(id)) deletes.push(id);
    if (upserts.length + deletes.length > maxOperations) return null;
  }

  return { upserts, deletes };
}
