function financialTransactions(state) {
  return Array.isArray(state?.transactions) ? state.transactions : [];
}

function byId(state) {
  const map = new Map();
  for (const item of financialTransactions(state)) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (id) map.set(id, item);
  }
  return map;
}

function sameValue(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

export function buildTransactionOperations(previousState, nextState) {
  const previous = byId(previousState);
  const next = byId(nextState);
  const upserts = [];
  const deletes = [];

  for (const [id, item] of next.entries()) {
    if (!previous.has(id) || !sameValue(previous.get(id), item)) upserts.push(item);
  }
  for (const id of previous.keys()) {
    if (!next.has(id)) deletes.push(id);
  }
  return { upserts, deletes };
}

export function mergeTransactionOutbox(current, incoming) {
  const upserts = new Map();
  const deletes = new Set();

  for (const item of Array.isArray(current?.upserts) ? current.upserts : []) {
    if (typeof item?.id === 'string' && item.id) upserts.set(item.id, item);
  }
  for (const id of Array.isArray(current?.deletes) ? current.deletes : []) {
    if (typeof id === 'string' && id) deletes.add(id);
  }

  for (const item of Array.isArray(incoming?.upserts) ? incoming.upserts : []) {
    if (typeof item?.id !== 'string' || !item.id) continue;
    upserts.set(item.id, item);
    deletes.delete(item.id);
  }
  for (const id of Array.isArray(incoming?.deletes) ? incoming.deletes : []) {
    if (typeof id !== 'string' || !id) continue;
    upserts.delete(id);
    deletes.add(id);
  }

  return { upserts: [...upserts.values()], deletes: [...deletes] };
}

export function hasTransactionOperations(value) {
  return Boolean((Array.isArray(value?.upserts) && value.upserts.length) || (Array.isArray(value?.deletes) && value.deletes.length));
}

export function verifyTransactionOperations(remoteState, operations) {
  const remote = byId(remoteState);
  for (const item of Array.isArray(operations?.upserts) ? operations.upserts : []) {
    if (!item?.id || !remote.has(item.id) || !sameValue(remote.get(item.id), item)) return false;
  }
  for (const id of Array.isArray(operations?.deletes) ? operations.deletes : []) {
    if (remote.has(id)) return false;
  }
  return true;
}

export function applyTransactionOperations(remoteState, operations) {
  const source = remoteState && typeof remoteState === 'object'
    ? remoteState
    : { transactions: [], budgets: {} };
  const map = byId(source);
  for (const item of Array.isArray(operations?.upserts) ? operations.upserts : []) {
    if (item?.id) map.set(item.id, item);
  }
  for (const id of Array.isArray(operations?.deletes) ? operations.deletes : []) map.delete(id);
  return { ...source, transactions: [...map.values()] };
}
