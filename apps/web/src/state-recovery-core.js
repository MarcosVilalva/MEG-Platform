export function isFinancialState(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.transactions));
}

export function transactionCount(value) {
  return isFinancialState(value) ? value.transactions.length : 0;
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
  if (!isFinancialState(state)) return map;
  state.transactions.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return map;
}

export function mergeRecoveryStatesWithReport(remoteState, localState, baselineState) {
  const remote = isFinancialState(remoteState) ? remoteState : { transactions: [], budgets: {} };
  const local = isFinancialState(localState) ? localState : { transactions: [], budgets: {} };

  if (!isFinancialState(baselineState)) {
    return {
      state: remote,
      appliedChanges: 0,
      conflicts: 0,
      additions: 0,
      updates: 0,
      deletions: 0,
      protectedWithoutBaseline: true,
    };
  }

  const baseline = baselineState;
  const remoteById = transactionMap(remote);
  const localById = transactionMap(local);
  const baselineById = transactionMap(baseline);
  const mergedById = new Map(remoteById);
  let additions = 0;
  let updates = 0;
  let deletions = 0;
  let conflicts = 0;

  for (const [id, localItem] of localById) {
    const baselineItem = baselineById.get(id);
    const remoteItem = remoteById.get(id);

    if (!baselineItem) {
      if (!remoteItem) {
        mergedById.set(id, localItem);
        additions += 1;
      } else if (!sameValue(remoteItem, localItem)) {
        conflicts += 1;
      }
      continue;
    }

    if (sameValue(localItem, baselineItem)) continue;

    if (remoteItem && sameValue(remoteItem, baselineItem)) {
      mergedById.set(id, localItem);
      updates += 1;
    } else {
      // O mesmo lançamento mudou ou foi excluído na nuvem. A nuvem vence o conflito.
      conflicts += 1;
    }
  }

  for (const [id, baselineItem] of baselineById) {
    if (localById.has(id)) continue;
    const remoteItem = remoteById.get(id);
    if (!remoteItem) continue;
    if (sameValue(remoteItem, baselineItem)) {
      mergedById.delete(id);
      deletions += 1;
    } else {
      // Uma exclusão local não pode apagar uma alteração mais nova feita no web.
      conflicts += 1;
    }
  }

  const state = {
    ...remote,
    transactions: [...mergedById.values()],
  };

  return {
    state,
    appliedChanges: additions + updates + deletions,
    conflicts,
    additions,
    updates,
    deletions,
    protectedWithoutBaseline: false,
  };
}

export function mergeRecoveryStates(remoteState, localState, baselineState) {
  return mergeRecoveryStatesWithReport(remoteState, localState, baselineState).state;
}

export function recoveryDecision({
  dirty,
  localState,
  remoteState,
  remoteRevision,
  baselineState,
  baselineRevision,
}) {
  if (!dirty || !isFinancialState(localState)) {
    return { action: 'remote', strategy: 'remote', state: remoteState, revision: remoteRevision };
  }

  const dirtyBaseRevision = Number(dirty.baseRevision);
  const currentRemoteRevision = Number(remoteRevision);
  if (dirtyBaseRevision === currentRemoteRevision) {
    return {
      action: 'recover',
      strategy: 'local-same-revision',
      state: localState,
      revision: currentRemoteRevision,
      localCount: transactionCount(localState),
      remoteCount: transactionCount(remoteState),
      mergedCount: transactionCount(localState),
      conflicts: 0,
    };
  }

  const baselineMatches = isFinancialState(baselineState)
    && Number(baselineRevision) === dirtyBaseRevision;

  if (!baselineMatches) {
    return {
      action: 'remote',
      strategy: 'remote-protected-no-baseline',
      state: remoteState,
      revision: currentRemoteRevision,
      localCount: transactionCount(localState),
      remoteCount: transactionCount(remoteState),
      mergedCount: transactionCount(remoteState),
      protectedLocal: true,
      conflicts: 0,
    };
  }

  const report = mergeRecoveryStatesWithReport(remoteState, localState, baselineState);
  if (report.appliedChanges === 0) {
    return {
      action: 'remote',
      strategy: report.conflicts ? 'remote-wins-conflicts' : 'remote-no-local-changes',
      state: remoteState,
      revision: currentRemoteRevision,
      localCount: transactionCount(localState),
      remoteCount: transactionCount(remoteState),
      mergedCount: transactionCount(remoteState),
      conflicts: report.conflicts,
      protectedLocal: report.conflicts > 0,
    };
  }

  return {
    action: 'recover',
    strategy: 'offline-delta',
    state: report.state,
    revision: currentRemoteRevision,
    localCount: transactionCount(localState),
    remoteCount: transactionCount(remoteState),
    mergedCount: transactionCount(report.state),
    conflicts: report.conflicts,
    additions: report.additions,
    updates: report.updates,
    deletions: report.deletions,
  };
}
