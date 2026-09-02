const MAX_ACTIVITY_ITEMS = 500;

function financialTransactions(state) {
  return Array.isArray(state?.transactions) ? state.transactions : [];
}

function activityItems(state) {
  return Array.isArray(state?.activityLog) ? state.activityLog : [];
}

function byId(state) {
  const map = new Map();
  for (const item of financialTransactions(state)) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (id) map.set(id, item);
  }
  return map;
}

function activitiesById(state) {
  const map = new Map();
  for (const item of activityItems(state)) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (id) map.set(id, item);
  }
  return map;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
  );
}

export function samePersistedValue(left, right) {
  if (left === right) return true;
  try {
    return JSON.stringify(canonicalValue(left)) === JSON.stringify(canonicalValue(right));
  } catch {
    return false;
  }
}

export function buildTransactionOperations(previousState, nextState) {
  const previous = byId(previousState);
  const next = byId(nextState);
  const previousActivities = activitiesById(previousState);
  const upserts = [];
  const deletes = [];
  const activities = [];

  for (const [id, item] of next.entries()) {
    if (!previous.has(id) || !samePersistedValue(previous.get(id), item)) upserts.push(item);
  }
  for (const id of previous.keys()) {
    if (!next.has(id)) deletes.push(id);
  }
  for (const item of activityItems(nextState)) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!id) continue;
    if (!previousActivities.has(id) || !samePersistedValue(previousActivities.get(id), item)) activities.push(item);
  }
  return { upserts, deletes, activities };
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

  const activities = [];
  const activityIds = new Set();
  for (const source of [incoming?.activities, current?.activities]) {
    for (const item of Array.isArray(source) ? source : []) {
      const id = typeof item?.id === 'string' ? item.id : '';
      if (!id || activityIds.has(id)) continue;
      activityIds.add(id);
      activities.push(item);
      if (activities.length >= MAX_ACTIVITY_ITEMS) break;
    }
    if (activities.length >= MAX_ACTIVITY_ITEMS) break;
  }

  return { upserts: [...upserts.values()], deletes: [...deletes], activities };
}

export function hasTransactionOperations(value) {
  return Boolean(
    (Array.isArray(value?.upserts) && value.upserts.length)
    || (Array.isArray(value?.deletes) && value.deletes.length)
    || (Array.isArray(value?.activities) && value.activities.length)
  );
}

export function verifyTransactionOperations(remoteState, operations) {
  const remote = byId(remoteState);
  const remoteActivities = activitiesById(remoteState);
  for (const item of Array.isArray(operations?.upserts) ? operations.upserts : []) {
    if (!item?.id || !remote.has(item.id) || !samePersistedValue(remote.get(item.id), item)) return false;
  }
  for (const id of Array.isArray(operations?.deletes) ? operations.deletes : []) {
    if (remote.has(id)) return false;
  }
  for (const item of Array.isArray(operations?.activities) ? operations.activities : []) {
    if (!item?.id || !remoteActivities.has(item.id) || !samePersistedValue(remoteActivities.get(item.id), item)) return false;
  }
  return true;
}

export function verifyMutationConfirmation(confirmation, operations) {
  if (!confirmation?.committed || confirmation.operationId !== operations?.operationId) return false;
  const confirmedDeletes = new Set(Array.isArray(confirmation.deletes) ? confirmation.deletes : []);
  if ((operations?.deletes || []).some((id) => !confirmedDeletes.has(id))) return false;
  return verifyTransactionOperations({
    transactions: Array.isArray(confirmation.upserts) ? confirmation.upserts : [],
    activityLog: Array.isArray(confirmation.activities) ? confirmation.activities : [],
  }, operations);
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

  const activities = [];
  const activityIds = new Set();
  for (const list of [operations?.activities, source.activityLog]) {
    for (const item of Array.isArray(list) ? list : []) {
      const id = typeof item?.id === 'string' ? item.id : '';
      if (!id || activityIds.has(id)) continue;
      activityIds.add(id);
      activities.push(item);
      if (activities.length >= MAX_ACTIVITY_ITEMS) break;
    }
    if (activities.length >= MAX_ACTIVITY_ITEMS) break;
  }

  return {
    ...source,
    transactions: [...map.values()],
    ...(activities.length || Array.isArray(source.activityLog) ? { activityLog: activities } : {}),
  };
}
