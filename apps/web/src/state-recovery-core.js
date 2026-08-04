export function isFinancialState(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.transactions));
}

export function transactionCount(value) {
  return isFinancialState(value) ? value.transactions.length : 0;
}

export function mergeRecoveryStates(remoteState, localState) {
  const remote = isFinancialState(remoteState) ? remoteState : { transactions: [], budgets: {} };
  const local = isFinancialState(localState) ? localState : { transactions: [], budgets: {} };
  const transactions = new Map();

  remote.transactions.forEach((item) => {
    if (item?.id) transactions.set(item.id, item);
  });
  local.transactions.forEach((item) => {
    if (item?.id) transactions.set(item.id, item);
  });

  return {
    ...remote,
    ...local,
    transactions: [...transactions.values()],
    budgets: {
      ...(remote.budgets || {}),
      ...(local.budgets || {}),
    },
    catalogs: local.catalogs || remote.catalogs,
    migrations: {
      ...(remote.migrations || {}),
      ...(local.migrations || {}),
    },
  };
}

export function recoveryDecision({ dirty, localState, remoteState, remoteRevision }) {
  if (!dirty || !isFinancialState(localState)) {
    return { action: 'remote', state: remoteState, revision: remoteRevision };
  }

  const sameBaseRevision = Number(dirty.baseRevision) === Number(remoteRevision);
  const recovered = sameBaseRevision ? localState : mergeRecoveryStates(remoteState, localState);
  return {
    action: 'recover',
    strategy: sameBaseRevision ? 'local' : 'merge',
    state: recovered,
    revision: remoteRevision,
    localCount: transactionCount(localState),
    remoteCount: transactionCount(remoteState),
    mergedCount: transactionCount(recovered),
  };
}
