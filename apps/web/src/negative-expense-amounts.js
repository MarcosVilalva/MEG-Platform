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
    purchaseTotal: document.querySelector('#purchaseTotalInput'),
    installmentCount: document.querySelector('#installmentCountInput'),
    recurringEnabled: document.querySelector('#recurringEnabledInput'),
    ongoingInstallmentEnabled: document.querySelector('#ongoingInstallmentEnabled'),
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

function clearOwnValidity(input) {
  if (input?.dataset.negativeExpenseValidity !== 'true') return;
  input.setCustomValidity('');
  delete input.dataset.negativeExpenseValidity;
}

function installmentCountValue(current) {
  return Math.max(Number.parseInt(current.installmentCount?.value || '1', 10) || 1, 1);
}

function activeAmountControl(current, installment) {
  return installment ? current.purchaseTotal : current.amount;
}

function syncNegativeExpenseUi() {
  const current = controls();
  if (!current.amount) return { valid: true, negative: false, control: null };

  const help = ensureHelp(current.amount);
  const recurrenceEnabled = Boolean(current.recurringEnabled?.checked);
  const ongoingInstallmentEnabled = Boolean(current.ongoingInstallmentEnabled?.checked);
  const installment = isInstallmentExpenseModality(current.modality?.value);
  const installmentCount = installmentCountValue(current);
  const singleInstallmentCredit = installment && installmentCount === 1 && !ongoingInstallmentEnabled;
  const expenseMode = current.type?.value === 'expense';
  const amountControl = activeAmountControl(current, installment) || current.amount;

  if (expenseMode && (!installment || singleInstallmentCredit)) current.amount.removeAttribute('min');
  else current.amount.setAttribute('min', '0');
  current.amount.setAttribute('inputmode', 'decimal');

  if (current.purchaseTotal) {
    if (expenseMode && singleInstallmentCredit) current.purchaseTotal.removeAttribute('min');
    else current.purchaseTotal.setAttribute('min', '0.01');
    current.purchaseTotal.setAttribute('inputmode', 'decimal');
  }

  clearOwnValidity(current.amount);
  clearOwnValidity(current.purchaseTotal);

  const validation = validateExpenseAmount({
    type: current.type?.value,
    modality: current.modality?.value,
    amount: amountControl.value,
    recurrenceEnabled,
    installmentCount,
    ongoingInstallmentEnabled,
  });

  current.amount.dataset.negativeCredit = validation.negative && validation.valid ? 'true' : 'false';
  if (current.purchaseTotal) current.purchaseTotal.dataset.negativeCredit = validation.negative && validation.valid ? 'true' : 'false';
  help?.classList.toggle('is-credit', validation.negative && validation.valid);
  help?.classList.toggle('is-error', !validation.valid);

  if (!validation.valid) {
    amountControl.setCustomValidity(validation.message);
    amountControl.dataset.negativeExpenseValidity = 'true';
    if (help) help.textContent = validation.message;
    return { ...validation, control: amountControl };
  }

  if (validation.negative) {
    if (help) {
      const label = installment ? 'Crédito/estorno' : 'Crédito/abatimento';
      help.textContent = `${label} de ${money.format(validation.creditAmount)}. Esse valor reduzirá a despesa do período.`;
    }
  } else if (help) {
    if (expenseMode && singleInstallmentCredit) {
      help.textContent = 'Aceita valor negativo para crédito ou estorno em uma única fatura.';
    } else if (expenseMode && !installment) {
      help.textContent = 'Aceita valor negativo em contas comuns. Ex.: -35,40.';
    } else {
      help.textContent = 'Informe um valor igual ou maior que zero.';
    }
  }

  return { ...validation, control: amountControl };
}

function validateBeforeSubmit(event) {
  const validation = syncNegativeExpenseUi();
  if (validation.valid) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  validation.control?.focus();
  validation.control?.reportValidity();
}

function wireEvents() {
  const current = controls();
  if (!current.form || !current.dialog) return false;

  current.form.addEventListener('input', (event) => {
    if (event.target.matches('#expenseAmountInput, #purchaseTotalInput, #installmentCountInput, #recurringCountInput')) {
      window.setTimeout(syncNegativeExpenseUi, 0);
    }
  });
  current.form.addEventListener('change', (event) => {
    if (event.target.matches('#transactionType, #modalityInput, #paymentMethodInput, #recurringEnabledInput, #ongoingInstallmentEnabled, #installmentCountInput')) {
      window.setTimeout(syncNegativeExpenseUi, 0);
    }
  });
  current.form.addEventListener('submit', validateBeforeSubmit, true);

  dialogObserver = new MutationObserver(() => {
    const latest = controls();
    if (latest.dialog?.open) window.setTimeout(syncNegativeExpenseUi, 0);
    else {
      clearOwnValidity(latest.amount);
      clearOwnValidity(latest.purchaseTotal);
    }
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
