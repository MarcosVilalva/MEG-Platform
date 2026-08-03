import { installPopoverDismissal } from './exact-number-filter-core.js';
import { initializeCardExactFilter, openCardExactFilter } from './exact-number-card-filter.js';
import { initializeTransactionExactFilter, openTransactionExactFilter, refreshExactTransactions, transactionExactActive } from './exact-number-transaction-filter.js';

let initialized = false;

function handleHeaderCapture(event) {
  const button = event.target.closest?.('.meg-stable-filter-button');
  if (!button) return;
  const grid = button.dataset.grid;
  const column = Number(button.dataset.column);
  const numericTransaction = grid === 'transactions' && (column === 5 || column === 8);
  const numericCard = grid === 'cards' && column === 5;
  if (!numericTransaction && !numericCard) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (numericTransaction) openTransactionExactFilter(column, button);
  else openCardExactFilter(button);
}

export function initializeExactNumberGridFilters() {
  if (initialized || document.body.classList.contains('native-mobile')) return;
  initialized = true;
  initializeTransactionExactFilter();
  initializeCardExactFilter();
  installPopoverDismissal();
  document.addEventListener('click', handleHeaderCapture, true);
  document.addEventListener('change', (event) => {
    if (transactionExactActive() && !event.target.closest?.('#transactions')) refreshExactTransactions({ resetPage: true });
  });
}
