const TARGET_IDS = ['incomeAmountInput', 'expenseAmountInput', 'purchaseTotalInput'];
const PURCHASE_TOTAL_ID = 'purchaseTotalInput';
const INSTALLMENT_COUNT_ID = 'installmentCountInput';
const DERIVED_EXPENSE_ID = 'expenseAmountInput';

function normalizeDigits(digits) {
  return String(digits || '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export function digitsToCurrency(digits) {
  const onlyDigits = normalizeDigits(digits);
  if (!onlyDigits) return '';
  const cents = Number(onlyDigits);
  if (!Number.isFinite(cents)) return '';
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function currencyToCanonical(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const cents = Number(digits);
  if (!Number.isFinite(cents)) return '';
  return (cents / 100).toFixed(2);
}

export function canonicalToCurrency(value) {
  const numeric = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric === 0 && String(value ?? '').trim() === '') return '';
  const cents = Math.round(Math.abs(numeric) * 100);
  return digitsToCurrency(String(cents));
}

function canonicalFromDigits(digits) {
  const normalized = normalizeDigits(digits);
  if (!normalized) return '';
  const cents = Number(normalized);
  return Number.isFinite(cents) ? (cents / 100).toFixed(2) : '';
}

function digitsFromInput(input) {
  if (input.dataset.megCurrencyDigits !== undefined) return input.dataset.megCurrencyDigits;
  const canonical = currencyToCanonical(input.value);
  return canonical ? canonical.replace(/\D/g, '') : '';
}

function moveCaretToEnd(input) {
  try {
    const end = input.value.length;
    input.setSelectionRange(end, end);
  } catch {}
}

function setDigits(input, digits) {
  const normalized = normalizeDigits(digits);
  input.dataset.megCurrencyDigits = normalized;
  input.value = digitsToCurrency(normalized);
  moveCaretToEnd(input);
}

function formatProgrammaticValue(input) {
  if (!input || document.activeElement === input) return;
  const raw = String(input.value || '').trim();
  if (!raw) {
    input.dataset.megCurrencyDigits = '';
    return;
  }
  const canonical = raw.includes(',')
    ? currencyToCanonical(raw)
    : Number.isFinite(Number(raw)) ? Number(raw).toFixed(2) : currencyToCanonical(raw);
  const digits = canonical ? canonical.replace(/\D/g, '') : '';
  setDigits(input, digits);
}

function refreshDerivedInstallmentAmount() {
  const expenseInput = document.getElementById(DERIVED_EXPENSE_ID);
  if (!expenseInput) return;
  delete expenseInput.dataset.megCurrencyDigits;
  formatProgrammaticValue(expenseInput);
}

function restorePurchaseTotalVisual(input, digits) {
  setDigits(input, digits);
  refreshDerivedInstallmentAmount();
}

function dispatchPurchaseTotalInput(input, digits) {
  const normalized = normalizeDigits(digits);
  input.dataset.megCurrencyDigits = normalized;
  input.dataset.megCurrencyCanonicalDispatch = 'true';
  input.value = canonicalFromDigits(normalized);
  try {
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } finally {
    delete input.dataset.megCurrencyCanonicalDispatch;
    restorePurchaseTotalVisual(input, normalized);
  }
}

function bindCurrencyInput(input) {
  if (!input || input.dataset.megCurrencyMaskBound === 'true') return;
  input.dataset.megCurrencyMaskBound = 'true';
  input.type = 'text';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', input.getAttribute('aria-label') || 'Valor em reais');
  const isPurchaseTotal = input.id === PURCHASE_TOTAL_ID;

  input.addEventListener('focus', () => {
    const raw = String(input.value || '').trim();
    if (!input.dataset.megCurrencyDigits && raw) formatProgrammaticValue(input);
    requestAnimationFrame(() => moveCaretToEnd(input));
  });

  input.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      const digits = `${digitsFromInput(input)}${event.key}`;
      if (isPurchaseTotal) dispatchPurchaseTotalInput(input, digits);
      else {
        setDigits(input, digits);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const digits = digitsFromInput(input).slice(0, -1);
      if (isPurchaseTotal) dispatchPurchaseTotalInput(input, digits);
      else {
        setDigits(input, digits);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    if (['Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
  });

  const handleInput = () => {
    if (isPurchaseTotal && input.dataset.megCurrencyCanonicalDispatch === 'true') return;
    const digits = String(input.value || '').replace(/\D/g, '');
    if (!isPurchaseTotal) {
      setDigits(input, digits);
      return;
    }

    const normalized = normalizeDigits(digits);
    input.dataset.megCurrencyDigits = normalized;
    input.value = canonicalFromDigits(normalized);
    queueMicrotask(() => restorePurchaseTotalVisual(input, normalized));
  };
  input.addEventListener('input', handleInput, isPurchaseTotal ? { capture: true } : undefined);

  input.addEventListener('paste', (event) => {
    const pasted = event.clipboardData?.getData('text') || '';
    if (!pasted) return;
    event.preventDefault();
    const canonical = pasted.includes(',')
      ? currencyToCanonical(pasted)
      : Number.isFinite(Number(pasted.replace(/\s/g, '')))
        ? Number(pasted.replace(/\s/g, '')).toFixed(2)
        : currencyToCanonical(pasted);
    const digits = canonical.replace(/\D/g, '');
    if (isPurchaseTotal) dispatchPurchaseTotalInput(input, digits);
    else setDigits(input, digits);
  });
}

function bindFormSubmit(form, inputs) {
  if (!form || form.dataset.megCurrencySubmitBound === 'true') return;
  form.dataset.megCurrencySubmitBound = 'true';
  form.addEventListener('submit', () => {
    inputs.forEach((input) => {
      if (!input) return;
      input.value = currencyToCanonical(input.value);
      delete input.dataset.megCurrencyDigits;
    });
    requestAnimationFrame(() => inputs.forEach(formatProgrammaticValue));
  }, { capture: true });
}

function startCurrencyMask() {
  const inputs = TARGET_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  if (!inputs.length) return;
  inputs.forEach(bindCurrencyInput);
  bindFormSubmit(document.getElementById('transactionForm'), inputs);

  const installmentCount = document.getElementById(INSTALLMENT_COUNT_ID);
  installmentCount?.addEventListener('input', () => queueMicrotask(refreshDerivedInstallmentAmount));

  const dialog = document.getElementById('transactionDialog');
  if (dialog) {
    new MutationObserver(() => {
      if (!dialog.open) return;
      inputs.forEach((input) => {
        delete input.dataset.megCurrencyDigits;
        formatProgrammaticValue(input);
      });
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startCurrencyMask, { once: true });
  else startCurrencyMask();
}
