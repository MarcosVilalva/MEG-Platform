import { findLargestFittingSize } from './adaptive-card-typography-core.js';

const CARD_SELECTOR = [
  '.metric', '.mini-metric', '.finance-panel', '.signal-card',
  '.cashflow-answer-card', '.smart-budget-card',
  '.analytics-executive-strip article', '.historical-summary-grid article',
  '.income-kpi-grid article', '.income-analysis-hero', '.income-hero-total',
  '.decision-hero', '.pending-command-center', '.transactions-filter-card',
  '.meg-kpi-card', '.meg-classification-metric', '.meg-recovery-metric',
].join(',');

const TEXT_SELECTOR = [
  'h2', 'h3', 'h4', ':scope > strong',
  '.decision-hero-value > strong', '.pending-coverage > strong',
  '.income-hero-total > strong', '.finance-panel-values strong',
  '[data-adaptive-card-text]',
].join(',');

const fittedElements = new Set();
let resizeObserver;
let mutationObserver;
let frame = 0;

function minimumFontSize(element, baseSize) {
  if (element.matches('h2, h3, h4')) return Math.min(baseSize, 13);
  return Math.min(baseSize, 11.5);
}

function fitElement(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected || element.childElementCount > 0) return;
  const text = element.textContent?.trim() || '';
  if (!text) return;

  element.classList.add('meg-autofit-text');
  element.style.removeProperty('--meg-autofit-size');
  const computed = getComputedStyle(element);
  const baseSize = Number(element.dataset.megAutofitBase) || Number.parseFloat(computed.fontSize) || 16;
  element.dataset.megAutofitBase = String(baseSize);
  const available = element.clientWidth;
  if (available <= 0) return;

  const size = findLargestFittingSize({
    min: minimumFontSize(element, baseSize),
    max: baseSize,
    fits(candidate) {
      element.style.setProperty('--meg-autofit-size', `${candidate}px`);
      return element.scrollWidth <= available + 1;
    },
  });
  element.style.setProperty('--meg-autofit-size', `${size}px`);
  element.classList.toggle('meg-autofit-reduced', size < baseSize - 0.25);
  if (size < baseSize - 0.25 && !element.hasAttribute('title')) {
    element.dataset.megAutofitTitle = 'true';
    element.title = text;
  } else if (size >= baseSize - 0.25 && element.dataset.megAutofitTitle === 'true') {
    element.removeAttribute('title');
    delete element.dataset.megAutofitTitle;
  }
}

function schedule(elements) {
  elements.forEach((element) => fittedElements.add(element));
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const pending = [...fittedElements];
    fittedElements.clear();
    pending.forEach(fitElement);
  });
}

function candidates(root = document) {
  const cards = [];
  if (root instanceof Element && root.matches(CARD_SELECTOR)) cards.push(root);
  root.querySelectorAll?.(CARD_SELECTOR).forEach((card) => cards.push(card));
  return [...new Set(cards.flatMap((card) => [...card.querySelectorAll(TEXT_SELECTOR)]))]
    .filter((element) => element.childElementCount === 0);
}

function observe(root = document) {
  const elements = candidates(root);
  elements.forEach((element) => resizeObserver.observe(element));
  schedule(elements);
}

export function initializeAdaptiveCardTypography() {
  if (resizeObserver || !document.body) return;
  resizeObserver = new ResizeObserver((entries) => schedule(entries.map((entry) => entry.target)));
  observe(document);
  mutationObserver = new MutationObserver((mutations) => {
    const roots = new Set();
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        const card = mutation.target.parentElement?.closest(CARD_SELECTOR);
        if (card) roots.add(card);
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) roots.add(node);
      });
    });
    roots.forEach(observe);
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.fonts?.ready?.then(() => observe(document)).catch(() => undefined);
}
