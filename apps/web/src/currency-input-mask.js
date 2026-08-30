import {
  brlToCanonical,
  digitsToBRL,
  formatBRLInput,
  formatBRLValue,
  formatPastedBRL,
  normalizeMoneyDigits,
} from '../../../packages/shared/src/money.js';

const STATIC_TARGETS = [
  { id: 'incomeAmountInput' },
  { id: 'expenseAmountInput' },
  { id: 'purchaseTotalInput' },
  { id: 'newCardLimitInput' },
  { id: 'newFinancialAccountOpeningBalanceInput', allowNegative: true },
  { id: 'reconciliationActualInput', allowNegative: true },
];

const DYNAMIC_SELECTOR = [
  '[data-budget]',
  '[data-invoice-amount]',
  '[data-column-filter="income"]',
  '[data-column-filter="expense"]',
  '[data-meg-currency-legacy]',
].join(',');

const NEGATIVE_IDS = new Set(
  STATIC_TARGETS.filter((item) => item.allowNegative).map((item) => item.id),
);

const inputValueDescriptor = typeof HTMLInputElement !== 'undefined'
  ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  : null;

export function digitsToCurrency(digits) {
  return digitsToBRL(digits);
}

export function currencyToCanonical(value) {
  return brlToCanonical(value);
}

export function canonicalToCurrency(value) {
  return formatBRLValue(value);
}

function visualValue(input) {
  return inputValueDescriptor?.get?.call(input) ?? '';
}

function setVisualValue(input, value) {
  inputValueDescriptor?.set?.call(input, value);
}

function allowsNegative(input) {
  return NEGATIVE_IDS.has(input.id) || input.dataset.megCurrencyAllowNegative === 'true';
}

function programmaticToVisual(value, allowNegative) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const formatted = formatBRLValue(raw);
  if (!formatted) return '';
  return allowNegative ? formatted : formatted.replace(/^-/, '');
}

function installCanonicalValueProxy(input, allowNegative) {
  if (!inputValueDescriptor || input.dataset.megCurrencyValueProxy === 'true') return;
  input.dataset.megCurrencyValueProxy = 'true';
  Object.defineProperty(input, 'value', {
    configurable: true,
    enumerable: true,
    get() {
      return brlToCanonical(visualValue(input));
    },
    set(next) {
      setVisualValue(input, programmaticToVisual(next, allowNegative));
    },
  });
}

function moveCaretToEnd(input) {
  try {
    const end = visualValue(input).length;
    input.setSelectionRange(end, end);
  } catch {}
}

function setDigits(input, digits, negative = false) {
  const normalized = normalizeMoneyDigits(digits);
  const formatted = normalized ? digitsToBRL(normalized, { negative }) : negative ? '-' : '';
  setVisualValue(input, formatted);
  moveCaretToEnd(input);
}

function dispatchInput(input) {
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function bindCurrencyInput(input) {
  if (!input || input.dataset.megCurrencyMaskBound === 'true') return;
  input.dataset.megCurrencyMaskBound = 'true';
  const allowNegative = allowsNegative(input);
  const initial = visualValue(input);

  input.type = 'text';
  input.inputMode = allowNegative ? 'decimal' : 'numeric';
  input.autocomplete = 'off';
  input.dataset.megCurrency = 'true';
  input.setAttribute('aria-label', input.getAttribute('aria-label') || 'Valor em reais');

  if (initial) setVisualValue(input, programmaticToVisual(initial, allowNegative));
  installCanonicalValueProxy(input, allowNegative);

  input.addEventListener('focus', () => requestAnimationFrame(() => moveCaretToEnd(input)));

  input.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const visual = visualValue(input);
    const negative = allowNegative && visual.startsWith('-');

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      setDigits(input, `${normalizeMoneyDigits(visual)}${event.key}`, negative);
      dispatchInput(input);
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const digits = normalizeMoneyDigits(visual).slice(0, -1);
      setDigits(input, digits, negative && Boolean(digits));
      dispatchInput(input);
      return;
    }

    if (allowNegative && event.key === '-') {
      event.preventDefault();
      const digits = normalizeMoneyDigits(visual);
      setDigits(input, digits, !negative);
      dispatchInput(input);
      return;
    }

    if (['Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
  });

  input.addEventListener('input', () => {
    const formatted = formatBRLInput(visualValue(input), { allowNegative });
    setVisualValue(input, formatted);
    requestAnimationFrame(() => moveCaretToEnd(input));
  });

  input.addEventListener('paste', (event) => {
    const pasted = event.clipboardData?.getData('text') || '';
    if (!pasted) return;
    event.preventDefault();
    setVisualValue(input, formatPastedBRL(pasted, { allowNegative }));
    dispatchInput(input);
  });

  input.addEventListener('blur', () => {
    if (visualValue(input) === '-') setVisualValue(input, '');
  });
}

function bindWithin(root = document) {
  STATIC_TARGETS.forEach(({ id }) => {
    const input = document.getElementById(id);
    if (input) bindCurrencyInput(input);
  });

  if (root.matches?.(DYNAMIC_SELECTOR)) bindCurrencyInput(root);
  root.querySelectorAll?.(DYNAMIC_SELECTOR).forEach(bindCurrencyInput);
}

function startCurrencyMask() {
  bindWithin(document);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node instanceof Element) bindWithin(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startCurrencyMask, { once: true });
  else startCurrencyMask();
}
