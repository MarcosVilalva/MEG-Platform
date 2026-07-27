const DEFAULT_CLASSIFICATION = 'SEM CLASSIFICAÇÃO';

function normalize(value) {
  return String(value || '').trim();
}

function ensureClassificationOption() {
  const input = document.querySelector('#expenseClassInput');
  if (!input) return;
  if (!normalize(input.value)) input.value = DEFAULT_CLASSIFICATION;
}

function migrateExistingTransactions() {
  const app = window.MEG_APP;
  const state = app?.getState?.();
  if (!state?.transactions?.length) return;

  let changed = false;
  const nextState = structuredClone(state);
  nextState.transactions = nextState.transactions.map((item) => {
    if (normalize(item.expenseClass)) return item;
    changed = true;
    return { ...item, expenseClass: DEFAULT_CLASSIFICATION };
  });

  if (!changed) return;
  if (!nextState.catalogs) nextState.catalogs = {};
  if (!Array.isArray(nextState.catalogs.expenseClasses)) nextState.catalogs.expenseClasses = [];
  if (!nextState.catalogs.expenseClasses.some((item) => normalize(item).toUpperCase() === DEFAULT_CLASSIFICATION)) {
    nextState.catalogs.expenseClasses.push(DEFAULT_CLASSIFICATION);
  }

  app.replaceState(nextState);
  window.MEG_CLOUD?.saveState?.(nextState);
}

function start() {
  migrateExistingTransactions();
  ensureClassificationOption();

  document.querySelector('#quickAddBtn')?.addEventListener('click', () => requestAnimationFrame(ensureClassificationOption));
  document.querySelector('#newCardTransactionBtn')?.addEventListener('click', () => requestAnimationFrame(ensureClassificationOption));
  document.querySelector('#transactionDialog')?.addEventListener('close', () => {
    const input = document.querySelector('#expenseClassInput');
    if (input) input.value = DEFAULT_CLASSIFICATION;
  });

  new MutationObserver(() => requestAnimationFrame(ensureClassificationOption))
    .observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();