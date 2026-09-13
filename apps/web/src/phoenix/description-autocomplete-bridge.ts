import type { FinancialEvent } from '../app/finance-client';
import { loadPhoenixAllEvents } from './data/load-phoenix-read-model';
import { canonicalPhoenixIncomePaymentMethod } from './income-payment-methods';
import './phoenix-description-autocomplete.css';

type LaunchType = 'income' | 'expense' | 'transfer';
type SmartSuggestion = {
  key: string;
  type: Exclude<LaunchType, 'transfer'>;
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
type SmartIndex = { income: SmartSuggestion[]; expense: SmartSuggestion[] };

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout: number }
  ) => number;
};

const MAX_SUGGESTIONS = 7;
const INPUT_DEBOUNCE_MS = 55;
const dateLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
let historyIndex: SmartIndex | null = null;
let historyPromise: Promise<SmartIndex> | null = null;
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

function eventLaunchType(event: FinancialEvent): Exclude<LaunchType, 'transfer'> | null {
  if (event.status === 'archived' || isBenefitEvent(event)) return null;
  if (event.type === 'income') return 'income';
  if (event.type === 'expense') return 'expense';
  return null;
}

function newer(left: string, right: string) {
  return String(left || '').slice(0, 10) > String(right || '').slice(0, 10);
}

function buildIndex(events: FinancialEvent[]): SmartIndex {
  const maps = {
    income: new Map<string, SmartSuggestion>(),
    expense: new Map<string, SmartSuggestion>()
  };

  for (const event of events) {
    const type = eventLaunchType(event);
    if (!type) continue;
    const label = String(event.description || '').trim();
    const normalized = normalize(label);
    if (!normalized) continue;

    const current = maps[type].get(normalized);
    const eventDate = String(event.date || '').slice(0, 10);
    const suggestion: SmartSuggestion = {
      key: `${type}:${normalized}`,
      type,
      label,
      normalized,
      occurrences: (current?.occurrences || 0) + 1,
      lastDate: current && !newer(eventDate, current.lastDate) ? current.lastDate : eventDate,
      accountId: event.accountId,
      accountName: event.account?.name,
      categoryId: event.categoryId,
      classification: event.sourceDetails?.expenseClass || event.category?.group || null,
      group: event.sourceDetails?.group || event.category?.name || null,
      paymentMethodId: event.paymentMethodId,
      paymentMethodName: event.sourceDetails?.paymentMethod || event.paymentMethod?.name || null
    };

    if (current && !newer(eventDate, current.lastDate)) {
      current.occurrences += 1;
      maps[type].set(normalized, current);
    } else {
      maps[type].set(normalized, suggestion);
    }
  }

  const sortDefault = (left: SmartSuggestion, right: SmartSuggestion) =>
    right.lastDate.localeCompare(left.lastDate)
    || right.occurrences - left.occurrences
    || left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' });

  return {
    income: [...maps.income.values()].sort(sortDefault),
    expense: [...maps.expense.values()].sort(sortDefault)
  };
}

function buildWhenIdle(events: FinancialEvent[]) {
  return new Promise<SmartIndex>((resolve) => {
    const idle = (window as IdleWindow).requestIdleCallback;
    if (idle) {
      idle(() => resolve(buildIndex(events)), { timeout: 180 });
      return;
    }
    window.setTimeout(() => resolve(buildIndex(events)), 0);
  });
}

function ensureHistoryIndex() {
  if (historyIndex) return Promise.resolve(historyIndex);
  if (historyPromise) return historyPromise;
  historyPromise = loadPhoenixAllEvents()
    .then((page) => buildWhenIdle(page.items))
    .then((index) => {
      historyIndex = index;
      return index;
    })
    .finally(() => {
      historyPromise = null;
    });
  return historyPromise;
}

function matchScore(item: SmartSuggestion, query: string) {
  if (!query) return 1;
  if (item.normalized === query) return 10_000;
  if (item.normalized.startsWith(query)) return 7_000;
  if (item.normalized.split(' ').some((word) => word.startsWith(query))) return 4_500;
  if (item.normalized.includes(query)) return 2_000;
  return 0;
}

function suggestionsFor(index: SmartIndex, type: LaunchType, rawQuery: string) {
  if (type === 'transfer') return [];
  const query = normalize(rawQuery);
  const bucket = index[type];
  return bucket
    .map((item) => ({ item, score: matchScore(item, query) }))
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

function inputByLabel(root: ParentNode, startsWith: string) {
  return fieldByLabel(root, startsWith)?.querySelector<HTMLInputElement>('input') || null;
}

function setReactInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setReactSelect(select: HTMLSelectElement, value: string) {
  const option = [...select.options].find((item) => item.value === value && !item.disabled && !item.hidden);
  if (!option) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setSelectByValueOrText(select: HTMLSelectElement | null, value?: string | null, text?: string | null) {
  if (!select) return false;
  if (value && setReactSelect(select, value)) return true;
  const target = normalize(text);
  if (!target) return false;
  const option = [...select.options].find((item) => !item.disabled && !item.hidden && normalize(item.textContent) === target);
  return option ? setReactSelect(select, option.value) : false;
}

function activeIncomeMethodAllowed(suggestion: SmartSuggestion) {
  return !suggestion.paymentMethodName || Boolean(canonicalPhoenixIncomePaymentMethod(suggestion.paymentMethodName));
}

function fillFromSuggestion(root: HTMLElement, input: HTMLInputElement, suggestion: SmartSuggestion, status: HTMLElement) {
  const type = launchType(root);
  if (type === 'transfer' || type !== suggestion.type) return;
  setReactInput(input, suggestion.label);

  const filled: string[] = [];
  if (setSelectByValueOrText(selectByLabel(root, 'Conta financeira'), suggestion.accountId, suggestion.accountName)) filled.push('conta');

  if (type === 'income') {
    if (setSelectByValueOrText(selectByLabel(root, 'Classificação da receita'), suggestion.categoryId, suggestion.group)) filled.push('classificação');
    if (activeIncomeMethodAllowed(suggestion)
      && setSelectByValueOrText(selectByLabel(root, 'Forma de recebimento'), suggestion.paymentMethodId, suggestion.paymentMethodName)) {
      filled.push('forma de recebimento');
    }
  } else {
    const classification = selectByLabel(root, 'Classificação');
    if (classification && suggestion.classification) {
      const option = [...classification.options].find((item) => normalize(item.textContent) === normalize(suggestion.classification));
      if (option && setReactSelect(classification, option.value)) filled.push('classificação');
    }
    window.requestAnimationFrame(() => {
      if (setSelectByValueOrText(selectByLabel(root, 'Grupo'), suggestion.categoryId, suggestion.group)) {
        if (!filled.includes('grupo')) filled.push('grupo');
      }
      if (setSelectByValueOrText(selectByLabel(root, 'Forma de pagamento'), suggestion.paymentMethodId, suggestion.paymentMethodName)) {
        if (!filled.includes('forma de pagamento')) filled.push('forma de pagamento');
      }
      status.textContent = filled.length
        ? `Preenchido pelo histórico: ${filled.join(' · ')}. Revise antes de salvar.`
        : 'Descrição reutilizada do histórico. Revise os demais campos antes de salvar.';
      status.hidden = false;
    });
  }

  if (type === 'income') {
    status.textContent = filled.length
      ? `Preenchido pelo histórico: ${filled.join(' · ')}. Revise antes de salvar.`
      : 'Descrição reutilizada do histórico. Revise os demais campos antes de salvar.';
    status.hidden = false;
  }
}

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return dateLabel.format(new Date(`${value}T12:00:00Z`));
}

function metaText(item: SmartSuggestion) {
  const details = [
    item.occurrences > 1 ? `Usado ${item.occurrences}x` : 'Usado 1x',
    item.lastDate ? `último ${formatDate(item.lastDate)}` : '',
    item.group || item.classification || '',
    item.paymentMethodName || ''
  ].filter(Boolean);
  return details.join(' · ');
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

function attachAutocomplete() {
  const root = document.querySelector<HTMLElement>('.px-launch-drawer');
  if (!root) return;
  const label = fieldByLabel(root, 'Descrição');
  const input = label?.querySelector<HTMLInputElement>('input');
  if (!label || !input || input.dataset.megSmartDescription === 'true') return;

  input.dataset.megSmartDescription = 'true';
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  const { panel, status } = createPanel(label);
  let current: SmartSuggestion[] = [];
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

  function paint(items: SmartSuggestion[]) {
    current = items;
    activeIndex = -1;
    panel.replaceChildren();
    if (!items.length) {
      close();
      return;
    }
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
      const meta = document.createElement('small');
      meta.textContent = metaText(item);
      copy.append(title, meta);
      button.append(icon, copy);
      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        fillFromSuggestion(root, input, item, status);
        close();
        input.focus();
      });
      panel.appendChild(button);
    });
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function paintLoading() {
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
    if (type === 'transfer') {
      close();
      return;
    }
    if (!historyIndex) paintLoading();
    void ensureHistoryIndex()
      .then((index) => {
        if (version !== renderVersion || !root.isConnected || document.activeElement !== input) return;
        paint(suggestionsFor(index, type, input.value));
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
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (panel.hidden) render(); else setActive(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0 && current[activeIndex]) {
      event.preventDefault();
      fillFromSuggestion(root, input, current[activeIndex], status);
      close();
    } else if (event.key === 'Escape') {
      close();
    }
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
