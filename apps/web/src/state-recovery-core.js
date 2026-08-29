import './instant-persistence.js';

const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const REVISION_KEY = 'meg-cloud-revision-v1';
const CANONICAL_CACHE_KEY = 'meg-cloud-canonical-cache-v2';

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

export function persistCanonicalRemoteState(remoteState, remoteRevision) {
  if (!isFinancialState(remoteState)) return false;
  const storage = globalThis.window?.localStorage;
  if (!storage?.setItem) return false;

  // Uma resposta remota vazia não pode apagar silenciosamente uma base local
  // que contém lançamentos. Em aparelhos Android isso já aconteceu durante a
  // retomada da API/Activity: o GET era tecnicamente válido, mas apontava para
  // um estado vazio transitório e substituía o cache antes da UI ser montada.
  // A remoção deliberada de todos os dados deve passar pelo fluxo explícito de
  // restauração/reset, nunca por uma leitura de inicialização.
  let cachedState = null;
  try {
    cachedState = JSON.parse(storage.getItem?.(STATE_KEY) || 'null');
  } catch {}
  if (transactionCount(remoteState) === 0 && transactionCount(cachedState) > 0) {
    return false;
  }

  const revision = Number(remoteRevision || 0);
  const rawState = JSON.stringify(remoteState);
  try {
    storage.setItem(CANONICAL_CACHE_KEY, JSON.stringify({
      revision,
      confirmedAt: new Date().toISOString(),
      state: remoteState,
    }));
    storage.setItem(STATE_KEY, rawState);
    storage.setItem(REVISION_KEY, String(revision));
    return true;
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
  const currentRemoteRevision = Number(remoteRevision || 0);

  if (!dirty || !isFinancialState(localState)) {
    persistCanonicalRemoteState(remoteState, currentRemoteRevision);
    return {
      action: 'remote',
      strategy: 'remote-canonical',
      state: remoteState,
      revision: currentRemoteRevision,
    };
  }

  const localDiffers = !sameValue(localState, remoteState);
  const dirtyBaseRevision = Number(dirty.baseRevision);
  const common = {
    state: remoteState,
    revision: currentRemoteRevision,
    localCount: transactionCount(localState),
    remoteCount: transactionCount(remoteState),
    mergedCount: transactionCount(remoteState),
    protectedLocal: localDiffers,
  };

  if (!localDiffers) {
    persistCanonicalRemoteState(remoteState, currentRemoteRevision);
    return {
      ...common,
      action: 'remote',
      strategy: 'remote-canonical-no-change',
      protectedLocal: false,
      conflicts: 0,
    };
  }

  // Se a nuvem ainda está exatamente na revisão a partir da qual o usuário
  // fez a alteração local, não existe concorrência. A cópia local pendente é a
  // continuação legítima daquela revisão e deve ser reenviada antes da abertura
  // do app, em vez de ser substituída pelo snapshot remoto antigo.
  if (dirtyBaseRevision === currentRemoteRevision) {
    return {
      ...common,
      action: 'recover',
      strategy: 'recover-local-same-revision',
      state: localState,
      mergedCount: transactionCount(localState),
      conflicts: 0,
      additions: 0,
      updates: 0,
      deletions: 0,
    };
  }

  const baselineMatches = isFinancialState(baselineState)
    && Number(baselineRevision) === dirtyBaseRevision;

  if (!baselineMatches) {
    return {
      ...common,
      action: 'remote',
      strategy: 'remote-protected-no-baseline',
      conflicts: 0,
    };
  }

  const report = mergeRecoveryStatesWithReport(remoteState, localState, baselineState);

  // Quando outro aparelho avançou a revisão, reaplicamos somente alterações
  // locais que podem ser provadas como independentes daquelas alterações.
  // Havendo conflito no mesmo lançamento, a nuvem continua prevalecendo e a
  // cópia local permanece protegida pelos snapshots de recuperação.
  if (report.conflicts === 0 && report.appliedChanges > 0) {
    return {
      ...common,
      action: 'recover',
      strategy: 'recover-merged-offline-changes',
      state: report.state,
      mergedCount: transactionCount(report.state),
      conflicts: 0,
      additions: report.additions,
      updates: report.updates,
      deletions: report.deletions,
    };
  }

  if (report.conflicts === 0 && report.appliedChanges === 0) {
    persistCanonicalRemoteState(remoteState, currentRemoteRevision);
  }

  return {
    ...common,
    action: 'remote',
    strategy: report.appliedChanges || report.conflicts
      ? 'remote-canonical-offline-changes'
      : 'remote-canonical-no-change',
    protectedLocal: localDiffers || report.appliedChanges > 0 || report.conflicts > 0,
    conflicts: report.conflicts,
    additions: report.additions,
    updates: report.updates,
    deletions: report.deletions,
  };
}
