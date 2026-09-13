import type { FinancialEvent } from '../app/finance-client';
import { loadPhoenixAllEvents } from './data/load-phoenix-read-model';
import { canonicalPhoenixIncomePaymentMethod } from './income-payment-methods';
import './phoenix-description-autocomplete.css';

type LaunchType = 'income' | 'expense' | 'transfer';
type Suggestion = {
  key: string;
  type: 'income' | 'expense';
  label: string;
  normalized: string;
  occurrences: number;
  lastDate: string;
  accountId?: string | null;
  accountName?: string | null;
  categoryId?: string | null;
  classification?: string | null;
  group?: string | null;
  paymentMethodId?: string | null;
  paymentMethodName?: string | null;
};
type Index = { income: Suggestion[]; expense: Suggestion[] };
type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout: number }
  ) => number;
};

const MAX_SUGGESTIONS = 7;
const INPUT_DEBOUNCE_MS = 55;
const dateLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
let cachedIndex: Index | null = null;
let indexPromise: Promise<Index> | null = null;
let observer: MutationObserver | null = null;

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ');
}

function launchType(root: ParentNode): LaunchType {
  const active = normalize(root.querySelector('.px-segment button.active')?.textContent || 'despesa');
  if (active.includes('receita')) return 'income';
  if (active.includes('transfer')) return 'transfer';
  return 'expense';
}

function isBenefitEvent(event: FinancialEvent) {
  const accountType = normalize(event.account?.type);
  const payment = normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`);
  const description = normalize(event.description);
  return accountType === 'benefit' || payment.includes('verocard') || description.includes('verocard');
}

function suggestionType(event: FinancialEvent): 'income' | 'expense' | null {
  if (event.status === 'archived' || isBenefitEvent(event)) return null;
  if (event.type === 'income') return 'income';
  if (event.type === 'expense') return 'expense';
  return null;
}

function buildIndex(events: FinancialEvent[]): Index {
  const maps = {
    income: new Map<string, Suggestion>(),
    expense: new Map<string, Suggestion>()
  };

  for (const event of events) {
    const type = suggestionType(event);
    if (!type) continue;
    const label = String(event.description || '').trim();
    const normalized = normalize(label);
    if (!normalized) continue;

    const current = maps[type].get(normalized);
    const eventDate = String(event.date || '').slice(0, 10);
    const isNewer = !current || eventDate > current.lastDate;
    if (current && !isNewer) {
      current.occurrences += 1;
      continue;
    }

    maps[type].set(normalized, {
      key: `${type}:${normalized}`,
      type,
      label,
      normalized,
      occurrences: (current?.occurrences || 0) + 1,
      lastDate: eventDate,
      accountId: event.accountId,
      accountName: event.account?.name,
      categoryId: event.categoryId,
      classification: event.sourceDetails?.expenseClass || event.category?.group || null,
      group: event.sourceDetails?.group || event.category?.name || null,
      paymentMethodId: event.paymentMethodId,
      paymentMethodName: event.sourceDetails?.paymentMethod || event.paymentMethod?.name || null
    });
  }

  const sortDefault = (left: Suggestion, right: Suggestion) =>
    right.lastDate.localeCompare(left.lastDate)
    || right.occurrences - left.occurrences
    || left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' });

  return {
    income: [...maps.income.values()].sort(sortDefault),
    expense: [...maps.expense.values()].sort(sortDefault)
  };
}

function buildWhenIdle(events: FinancialEvent[]) {
  return new Promise<Index>((resolve) => {
    const idle = (window as IdleWindow).requestIdleCallback;
    if (idle) {
      idle(() => resolve(buildIndex(events)), { timeout: 180 });
      return;
    }
    window.setTimeout(() => resolve(buildIndex(events)), 0);
  });
}

function ensureIndex() {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  if (indexPromise) return indexPromise;
  indexPromise = loadPhoenixAllEvents()
    .then((page) => buildWhenIdle(page.items))
    .then((index) => {
      cachedIndex = index;
      return index;
    })
    .finally(() => {
      indexPromise = null;
    });
  return indexPromise;
}

function score(item: Suggestion, query: string) {
  if (!query) return 1;
  if (item.normalized === query) return 10_000;
  if (item.normalized.startsWith(query)) return 7_000;
  if (item.normalized.split(' ').some((word) => word.startsWith(query))) return 4_500;
  if (item.normalized.includes(query)) return 2_000;
  return 0;
}

function suggestions(index: Index, type: LaunchType, rawQuery: string) {
  if (type === 'transfer') return [];
  const query = normalize(rawQuery);
  return index[type]
    .map((item) => ({ item, score: score(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || right.item.occurrences - left.item.occurrences
      || right.item.lastDate.localeCompare(left.item.lastDate)
      || left.item.label.localeCompare(right.item.label, 'pt-BR', { sensitivity: 'base' })
    )
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.item);
}

function fieldByLabel(root: ParentNode, startsWith: string) {
  const target = normalize(startsWith);
  return [...root.querySelectorAll<HTMLLabelElement>('label.px-field')]
    .find((label) => normalize(label.querySelector('span')?.textContent || '').startsWith(target)) || null;
}

function selectByLabel(root: ParentNode, startsWith: string) {
  return fieldByLabel(root, startsWith)?.querySelector<HTMLSelectElement>('select') || null;
}

function setInput(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setSelect(select: HTMLSelectElement, value: string) {
  const option = [...select.options].find((item) => item.value === value && !item.disabled && !item.hidden);
  if (!option) return false;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setSelectByValueOrText(select: HTMLSelectElement | null, value?: string | null, text?: string | null) {
  if (!select) return false;
  if (value && setSelect(select, value)) return true;
  const target = normalize(text);
  if (!target) return false;
  const option = [...select.options].find((item) => !item.disabled && !item.hidden && normalize(item.textContent) === target);
  return option ? setSelect(select, option.value) : false;
}

function fillFromHistory(root: HTMLElement, input: HTMLInputElement, item: Suggestion, status: HTMLElement) {
  const type = launchType(root);
  if (type === 'transfer' || type !== item.type) return;
  setInput(input, item.label);

  const filled: string[] = [];
  if (setSelectByValueOrText(selectByLabel(root, 'Conta financeira'), item.accountId, item.accountName)) filled.push('conta');

  if (type === 'income') {
    if (setSelectByValueOrText(selectByLabel(root, 'Classificação da receita'), item.categoryId, item.group)) filled.push('classificação');
    if ((!item.paymentMethodName || canonicalPhoenixIncomePaymentMethod(item.paymentMethodName))
      && setSelectByValueOrText(selectByLabel(root, 'Forma de recebimento'), item.paymentMethodId, item.paymentMethodName)) {
      filled.push('forma de recebimento');
    }
    status.textContent = filled.length
      ? `Preenchido pelo histórico: ${filled.join(' · ')}. Revise antes de salvar.`
      : 'Descrição reutilizada do histórico. Revise os demais campos antes de salvar.';
    status.hidden = false;
    return;
  }

  const classification = selectByLabel(root, 'Classificação');
  if (classification && item.classification) {
    const option = [...classification.options].find((candidate) => normalize(candidate.textContent) === normalize(item.classification));
    if (option && setSelect(classification, option.value)) filled.push('classificação');
  }

  window.requestAnimationFrame(() => {
    if (setSelectByValueOrText(selectByLabel(root, 'Grupo'), item.categoryId, item.group)) filled.push('grupo');
    if (setSelectByValueOrText(selectByLabel(root, 'Forma de pagamento'), item.paymentMethodId, item.paymentMethodName)) filled.push('forma de pagamento');
    status.textContent = filled.length
      ? `Preenchido pelo histórico: ${filled.join(' · ')}. Revise antes de salvar.`
      : 'Descrição reutilizada do histórico. Revise os demais campos antes de salvar.';
    status.hidden = false;
  });
}

function formatDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? dateLabel.format(new Date(`${value}T12:00:00Z`)) : '';
}

function meta(item: Suggestion) {
  return [
    item.occurrences > 1 ? `Usado ${item.occurrences}x` : 'Usado 1x',
    item.lastDate ? `último ${formatDate(item.lastDate)}` : '',
    item.group || item.classification || '',
    item.paymentMethodName || ''
  ].filter(Boolean).join(' · ');
}

function createPanel(label: HTMLLabelElement) {
  label.classList.add('px-smart-description-field');
  const panel = document.createElement('div');
  panel.className = 'px-description-suggestions';
  panel.hidden = true;
  panel.setAttribute('role', 'listbox');
  label.appendChild(panel);

  const status = document.createElement('small');
  status.className = 'px-description-smart-status';
  status.hidden = true;
  label.appendChild(status);
  return { panel, status };
}

function wireAutocomplete(root: HTMLElement, label: HTMLLabelElement, input: HTMLInputElement) {
  input.dataset.megSmartDescription = 'true';
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  const { panel, status } = createPanel(label);
  let current: Suggestion[] = [];
  let activeIndex = -1;
  let debounce = 0;
  let renderVersion = 0;

  function close() {
    panel.hidden = true;
    panel.replaceChildren();
    current = [];
    activeIndex = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function paint(items: Suggestion[]) {
    current = items;
    activeIndex = -1;
    panel.replaceChildren();
    if (!items.length) return close();

    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'px-description-suggestion';
      button.id = `px-description-option-${index}`;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', 'false');

      const icon = document.createElement('span');
      icon.className = 'px-description-suggestion-icon';
      icon.textContent = '↺';
      const copy = document.createElement('span');
      copy.className = 'px-description-suggestion-copy';
      const title = document.createElement('strong');
      title.textContent = item.label;
      const details = document.createElement('small');
      details.textContent = meta(item);
      copy.append(title, details);
      button.append(icon, copy);

      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        fillFromHistory(root, input, item, status);
        close();
        input.focus();
      });
      panel.appendChild(button);
    });

    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function loading() {
    panel.replaceChildren();
    const node = document.createElement('div');
    node.className = 'px-description-suggestion-loading';
    node.textContent = 'Buscando seu histórico…';
    panel.appendChild(node);
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function render() {
    const version = ++renderVersion;
    const type = launchType(root);
    if (type === 'transfer') return close();
    if (!cachedIndex) loading();

    void ensureIndex()
      .then((index) => {
        if (version !== renderVersion || !root.isConnected || document.activeElement !== input) return;
        paint(suggestions(index, type, input.value));
      })
      .catch(() => {
        if (version !== renderVersion) return;
        close();
        status.textContent = 'Não foi possível consultar o histórico agora. O lançamento manual continua disponível.';
        status.hidden = false;
      });
  }

  function scheduleRender() {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(render, INPUT_DEBOUNCE_MS);
  }

  function setActive(next: number) {
    if (!current.length) return;
    activeIndex = (next + current.length) % current.length;
    [...panel.querySelectorAll<HTMLButtonElement>('.px-description-suggestion')].forEach((button, index) => {
      const active = index === activeIndex;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) {
        input.setAttribute('aria-activedescendant', button.id);
        button.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  input.addEventListener('focus', render);
  input.addEventListener('input', () => {
    status.hidden = true;
    scheduleRender();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (panel.hidden) render(); else setActive(activeIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (panel.hidden) render(); else setActive(activeIndex - 1);
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0 && current[activeIndex]) {
      event.preventDefault();
      fillFromHistory(root, input, current[activeIndex], status);
      close();
      return;
    }
    if (event.key === 'Escape') close();
  });
  input.addEventListener('blur', () => window.setTimeout(close, 120));

  root.querySelectorAll<HTMLButtonElement>('.px-segment button').forEach((button) => {
    button.addEventListener('click', () => {
      close();
      status.hidden = true;
      if (document.activeElement === input) window.setTimeout(render, 0);
    });
  });
}

function attachAutocomplete() {
  const root = document.querySelector<HTMLElement>('.px-launch-drawer');
  if (!root) return;
  const label = fieldByLabel(root, 'Descrição');
  if (!label) return;
  const input = label.querySelector<HTMLInputElement>('input');
  if (!input || input.dataset.megSmartDescription === 'true') return;
  wireAutocomplete(root, label, input);
}

function start() {
  observer = new MutationObserver(() => attachAutocomplete());
  observer.observe(document.body, { childList: true, subtree: true });
  attachAutocomplete();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixDescriptionAutocomplete() {
  observer?.disconnect();
  observer = null;
}
