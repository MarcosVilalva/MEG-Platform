function financialState(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.transactions));
}

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
  if (!financialState(state)) return map;
  state.transactions.forEach((item) => {
    const id = String(item?.id || '').trim();
    if (id && !map.has(id)) map.set(id, item);
  });
  return map;
}

export function inspectRecoveryState(snapshotState, currentState) {
  const snapshot = financialState(snapshotState) ? snapshotState : { transactions: [] };
  const current = transactionMap(currentState);
  const seen = new Set();
  const recoverable = [];
  const conflicts = [];
  let identical = 0;
  let invalid = 0;

  snapshot.transactions.forEach((item) => {
    const id = String(item?.id || '').trim();
    if (!id || seen.has(id)) {
      invalid += 1;
      return;
    }
    seen.add(id);
    const existing = current.get(id);
    if (!existing) {
      recoverable.push(item);
      return;
    }
    if (sameValue(existing, item)) {
      identical += 1;
      return;
    }
    conflicts.push({ id, snapshot: item, current: existing });
  });

  return {
    recoverable,
    conflicts,
    recoverableCount: recoverable.length,
    conflictCount: conflicts.length,
    identicalCount: identical,
    invalidCount: invalid,
    snapshotCount: snapshot.transactions.length,
    currentCount: financialState(currentState) ? currentState.transactions.length : 0,
  };
}

export function buildSelectiveRecovery(currentState, snapshotState, selectedIds = []) {
  if (!financialState(currentState)) {
    return {
      state: currentState,
      restored: [],
      restoredCount: 0,
      skippedExisting: [],
      unknownSelected: [...new Set(selectedIds.map(String))],
    };
  }

  const inspection = inspectRecoveryState(snapshotState, currentState);
  const recoverable = new Map(inspection.recoverable.map((item) => [String(item.id), item]));
  const current = transactionMap(currentState);
  const selected = [...new Set(selectedIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const restored = [];
  const skippedExisting = [];
  const unknownSelected = [];

  selected.forEach((id) => {
    if (current.has(id)) {
      skippedExisting.push(id);
      return;
    }
    const item = recoverable.get(id);
    if (!item) {
      unknownSelected.push(id);
      return;
    }
    restored.push(item);
    current.set(id, item);
  });

  if (!restored.length) {
    return {
      state: currentState,
      restored,
      restoredCount: 0,
      skippedExisting,
      unknownSelected,
    };
  }

  return {
    state: {
      ...currentState,
      transactions: [...currentState.transactions, ...restored],
    },
    restored,
    restoredCount: restored.length,
    skippedExisting,
    unknownSelected,
  };
}

export function isRecoveryFinancialState(value) {
  return financialState(value);
}
