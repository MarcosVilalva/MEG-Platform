const MAX_ACTIVITY_ITEMS = 500;

function sameValue(left, right) {
  if (left === right) return true;
  if (left == null || right == null) return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function transactionMap(state) {
  const map = new Map();
  if (!Array.isArray(state?.transactions)) return map;
  state.transactions.forEach((item) => {
    if (item?.id) map.set(String(item.id), item);
  });
  return map;
}

function amountOf(item) {
  if (!item) return 0;
  if (item.type === 'income') return Number(item.incomeAmount ?? item.amount ?? 0) || 0;
  return Number(item.expenseAmount ?? item.amount ?? 0) || 0;
}

function transactionSnapshot(item) {
  if (!item) return null;
  return {
    id: String(item.id || ''),
    date: String(item.date || ''),
    purchaseDate: String(item.purchaseDate || ''),
    description: String(item.description || 'Lançamento sem descrição'),
    type: item.type === 'income' ? 'income' : 'expense',
    amount: amountOf(item),
    paymentMethod: String(item.paymentMethod || item.account || 'Não informado'),
    group: String(item.group || item.category || ''),
    status: String(item.status || ''),
    installmentSeriesId: String(item.installmentSeriesId || ''),
    installmentNumber: Number(item.installmentNumber || 0),
    installmentCount: Number(item.installmentCount || 0),
    purchaseTotal: Number(item.purchaseTotal || 0),
  };
}

function identity(user = {}) {
  const userId = String(user.id || user.sub || user.email || 'usuario-meg');
  const userName = String(user.name || user.email || 'Usuário MEG').trim() || 'Usuário MEG';
  return { userId, userName };
}

function activityId(index = 0) {
  return globalThis.crypto?.randomUUID?.() || `activity-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
}

export function transactionChanges(previousState, nextState) {
  const previous = transactionMap(previousState);
  const next = transactionMap(nextState);
  const changes = [];

  next.forEach((item, id) => {
    const before = previous.get(id);
    if (!before) {
      changes.push({ action: 'CREATED', transactionId: id, transaction: transactionSnapshot(item) });
      return;
    }
    if (!sameValue(before, item)) {
      changes.push({ action: 'UPDATED', transactionId: id, transaction: transactionSnapshot(item) });
    }
  });

  previous.forEach((item, id) => {
    if (next.has(id)) return;
    changes.push({ action: 'DELETED', transactionId: id, transaction: transactionSnapshot(item) });
  });

  return changes;
}

export function appendTransactionActivities(previousState, nextState, user = {}, now = new Date()) {
  if (!Array.isArray(nextState?.transactions)) return nextState;
  const changes = transactionChanges(previousState, nextState);
  if (!changes.length) return nextState;

  const actor = identity(user);
  const timestamp = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const existing = Array.isArray(nextState.activityLog)
    ? nextState.activityLog
    : Array.isArray(previousState?.activityLog)
      ? previousState.activityLog
      : [];

  const entries = changes.map((change, index) => ({
    id: activityId(index),
    at: timestamp,
    ...actor,
    ...change,
  }));

  return {
    ...nextState,
    activityLog: [...entries, ...existing].slice(0, MAX_ACTIVITY_ITEMS),
  };
}

export function appendRecoveryActivities(state, transactions = [], user = {}, now = new Date(), source = {}) {
  if (!Array.isArray(state?.transactions) || !Array.isArray(transactions) || !transactions.length) return state;
  const actor = identity(user);
  const timestamp = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const existing = Array.isArray(state.activityLog) ? state.activityLog : [];
  const entries = transactions.map((item, index) => ({
    id: activityId(index),
    at: timestamp,
    ...actor,
    action: 'RECOVERED',
    transactionId: String(item?.id || ''),
    transaction: transactionSnapshot(item),
    recovery: {
      snapshotId: String(source.snapshotId || ''),
      snapshotCreatedAt: String(source.snapshotCreatedAt || ''),
      snapshotReason: String(source.snapshotReason || ''),
    },
  }));

  return {
    ...state,
    activityLog: [...entries, ...existing].slice(0, MAX_ACTIVITY_ITEMS),
  };
}

export function activityLogLimit() {
  return MAX_ACTIVITY_ITEMS;
}
