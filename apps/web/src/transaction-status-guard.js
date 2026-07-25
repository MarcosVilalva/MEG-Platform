const form = document.querySelector('#transactionForm');
const dialog = document.querySelector('#transactionDialog');
const transactionId = document.querySelector('#transactionId');
const transactionType = document.querySelector('#transactionType');
const statusInput = document.querySelector('#statusInput');

function isEditing() {
  return Boolean(String(transactionId?.value || '').trim());
}

function isExpense() {
  return String(transactionType?.value || '').toLowerCase() === 'expense';
}

function ensureNewExpenseDefaultsToPending() {
  if (!statusInput || !isExpense() || isEditing()) return;
  statusInput.value = 'pending';
  statusInput.dispatchEvent(new Event('change', { bubbles: true }));
}

function preserveExplicitStatus() {
  if (!form || !statusInput) return;
  const selectedStatus = statusInput.value;
  queueMicrotask(() => {
    if (isEditing() && selectedStatus) statusInput.value = selectedStatus;
  });
}

function initialize() {
  if (!form || !statusInput || !transactionType) return;

  transactionType.addEventListener('change', ensureNewExpenseDefaultsToPending);
  form.addEventListener('reset', () => setTimeout(ensureNewExpenseDefaultsToPending, 0));
  form.addEventListener('submit', preserveExplicitStatus, { capture: true });

  if (dialog) {
    new MutationObserver(() => {
      if (dialog.open) setTimeout(ensureNewExpenseDefaultsToPending, 0);
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }

  document.querySelector('#quickAddBtn')?.addEventListener('click', () => setTimeout(ensureNewExpenseDefaultsToPending, 0));
  document.querySelectorAll('[data-new-transaction],#newCardTransactionBtn').forEach((button) => {
    button.addEventListener('click', () => setTimeout(ensureNewExpenseDefaultsToPending, 0));
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
