const DEFAULT_MAX_PATCH_OPERATIONS = 2000;

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function fingerprint(value) {
  const serialized = JSON.stringify(value);
  let first = 2166136261;
  let second = 2246822507;

  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489909);
    second ^= second >>> 13;
  }

  return `${serialized.length}:${first >>> 0}:${second >>> 0}`;
}

function metadataFingerprint(state) {
  const source = plainObject(state) || {};
  const { transactions: _transactions, ...metadata } = source;
  return fingerprint(metadata);
}

function transactionFingerprint(item) {
  return fingerprint(item);
}

export function createStateSyncBaseline(state) {
  const source = plainObject(state) || {};
  const transactions = Array.isArray(source.transactions) ? source.transactions : [];
  const transactionFingerprints = new Map();

  transactions.forEach((item) => {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!id) return;
    transactionFingerprints.set(id, transactionFingerprint(item));
  });

  return {
    metadata: metadataFingerprint(source),
    transactions: transactionFingerprints,
  };
}

export function createTransactionPatch(baseline, state, { maxOperations = DEFAULT_MAX_PATCH_OPERATIONS } = {}) {
  if (!baseline || !(baseline.transactions instanceof Map)) return null;
  const source = plainObject(state);
  if (!source || !Array.isArray(source.transactions)) return null;
  if (metadataFingerprint(source) !== baseline.metadata) return null;

  const currentIds = new Set();
  const upserts = [];

  for (const item of source.transactions) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!id || currentIds.has(id)) return null;
    currentIds.add(id);
    if (baseline.transactions.get(id) !== transactionFingerprint(item)) upserts.push(item);
    if (upserts.length > maxOperations) return null;
  }

  const deletes = [];
  for (const id of baseline.transactions.keys()) {
    if (!currentIds.has(id)) deletes.push(id);
    if (upserts.length + deletes.length > maxOperations) return null;
  }

  return { upserts, deletes };
}
