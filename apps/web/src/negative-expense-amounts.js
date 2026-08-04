import {
  isInstallmentExpenseModality,
  validateExpenseAmount,
} from './negative-expense-core.js';

let initialized = false;
let dialogObserver = null;

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function controls() {
  return {
    dialog: document.querySelector('#transactionDialog'),
    form: document.querySelector('#transactionForm'),
    type: document.querySelector('#transactionType'),
    modality: document.querySelector('#modalityInput'),
    amount: document.querySelector('#expenseAmountInput'),
    recurringEnabled: document.querySelector('#recurringEnabledInput'),
  };
}

function ensureHelp(amountInput) {
  if (!amountInput) return null;
  const existing = document.querySelector('#negativeExpenseAmountHelp');
  if (existing) return existing;
  const help = document.createElement('small');
  help.id = 'negativeExpenseAmountHelp';
  help.className = 'meg-negative-expense-help';
  help.textContent = 'Aceita valor negativo em contas comuns. Ex.: -35,40.';
  amountInput.insertAdjacentElement('afterend', help);
  const describedBy = new Set(String(amountInput.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  describedBy.add(help.id);
  amountInput.setAttribute('aria-describedby', [...describedBy].join(' '));
  return help;
}

function clearOwnValidity(amountInput) {
  if (amountInput?.dataset.negativeExpenseValidity !== 'true') return;
  amountInput.setCustomValidity('');
  delete amountInput.dataset.negativeExpenseValidity;
}

function syncNegativeExpenseUi() {
  const current = controls();
  if (!current.amount) return { valid: true, negative: false };
  const help = ensureHelp(current.amount);
  const recurrenceEnabled = Boolean(current.recurringEnabled?.checked);
  const installment = isInstallmentExpenseModality(current.modality?.value);
  const expenseMode = current.type?.value === 'expense';

  if (expenseMode && !installment) current.amount.removeAttribute('min');
  else current.amount.setAttribute('min', '0');
  current.amount.setAttribute('inputmode', 'decimal');

  clearOwnValidity(current.amount);
  const validation = validateExpenseAmount({
    type: current.type?.value,
    modality: current.modality?.value,
    amount: current.amount.value,
    recurrenceEnabled,
  });

  current.amount.dataset.negativeCredit = validation.negative && validation.valid ? 'true' : 'false';
  help?.classList.toggle('is-credit', validation.negative && validation.valid);
  help?.classList.toggle('is-error', !validation.valid);

  if (!validation.valid) {
    current.amount.setCustomValidity(validation.message);
    current.amount.dataset.negativeExpenseValidity = 'true';
    if (help) help.textContent = validation.message;
    return validation;
  }

  if (validation.negative) {
    if (help) {
      help.textContent = `Crédito/abatimento de ${money.format(validation.creditAmount)}. Esse valor reduzirá a despesa do período.`;
    }
  } else if (help) {
    help.textContent = expenseMode && !installment
      ? 'Aceita valor negativo em contas comuns. Ex.: -35,40.'
      : 'Informe um valor igual ou maior que zero.';
  }
  return validation;
}

function validateBeforeSubmit(event) {
  const current = controls();
  const validation = syncNegativeExpenseUi();
  if (validation.valid) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  current.amount?.focus();
  current.amount?.reportValidity();
}

function wireEvents() {
  const current = controls();
  if (!current.form || !current.dialog) return false;

  current.form.addEventListener('input', (event) => {
    if (event.target.matches('#expenseAmountInput, #recurringCountInput')) syncNegativeExpenseUi();
  });
  current.form.addEventListener('change', (event) => {
    if (event.target.matches('#transactionType, #modalityInput, #paymentMethodInput, #recurringEnabledInput')) {
      window.setTimeout(syncNegativeExpenseUi, 0);
    }
  });
  current.form.addEventListener('submit', validateBeforeSubmit, true);

  dialogObserver = new MutationObserver(() => {
    if (current.dialog.open) window.setTimeout(syncNegativeExpenseUi, 0);
    else clearOwnValidity(current.amount);
  });
  dialogObserver.observe(current.dialog, { attributes: true, attributeFilter: ['open'] });
  return true;
}

export function initializeNegativeExpenseAmounts() {
  if (initialized) return;
  if (!wireEvents()) return;
  initialized = true;
  syncNegativeExpenseUi();
  window.MEG_NEGATIVE_EXPENSES = {
    refresh: syncNegativeExpenseUi,
    validateExpenseAmount,
  };
}
