import { currency, escapeHtml, matchesExactNumbers, normalizeExactNumber, normalizeText, openExactValuePopover, syncFilterButton } from './exact-number-filter-core.js';

const state = { income: new Set(), expense: new Set(), page: 1, sort: '' };
let observer = null;
let scheduledFrame = 0;

function periodMatches(item) {
  const mode = document.querySelector('#periodMode')?.value || 'month';
  const date = String(item?.date || '');
  if (mode === 'all') return true;
  if (mode === 'year') return date.startsWith(document.querySelector('#yearFilter')?.value || '');
  if (mode === 'range') {
    const start = document.querySelector('#startDateFilter')?.value || '';
    const end = document.querySelector('#endDateFilter')?.value || '';
    return (!start || date >= start) && (!end || date <= end);
  }
  return date.startsWith(document.querySelector('#monthFilter')?.value || '');
}

function valueOf(item, key) {
  return key === 'income'
    ? Number(item.incomeAmount || (item.type === 'income' ? item.amount : 0) || 0)
    : Number(item.expenseAmount || (item.type === 'expense' ? item.amount : 0) || 0);
}

function numberOptions(config) {
  const transactions = window.MEG_APP?.getStateRef?.()?.transactions || [];
  const values = new Set();
  transactions.forEach((item) => {
    if (item.type !== config.type || !periodMatches(item)) return;
    const value = valueOf(item, config.key);
    if (value > 0) values.add(normalizeExactNumber(value));
  });
  return [...values].sort((a, b) => Number(a) - Number(b)).map((value) => ({ value, label: currency.format(Number(value)) }));
}

function clearLegacyMinimum(key) {
  const control = document.querySelector(`[data-column-filter="${key}"]`);
  if (!control || !control.value) return;
  control.value = '';
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

function active() {
  return state.income.size > 0 || state.expense.size > 0;
}

function selectedValues(key) {
  return new Set([...document.querySelectorAll(`[data-multi-filter="${key}"] [data-multi-filter-option]:checked`)].map((option) => normalizeText(option.value)));
}

function matches(item) {
  if (!periodMatches(item)) return false;
  const type = document.querySelector('#typeFilter')?.value || 'all';
  if (type !== 'all' && item.type !== type) return false;
  const payment = item.paymentMethod || item.account || '';
  const group = item.group || item.category || '';
  const situation = item.situation || (item.status === 'paid' ? 'PAGO' : 'PENDENTE');
  const query = normalizeText(document.querySelector('#searchInput')?.value || '');
  if (query && !normalizeText(`${item.description || ''} ${group} ${item.category || ''} ${payment} ${item.notes || ''}`).includes(query)) return false;

  const date = document.querySelector('[data-column-filter="date"]')?.value || '';
  const purchaseDate = document.querySelector('[data-column-filter="purchaseDate"]')?.value || '';
  const description = normalizeText(document.querySelector('[data-column-filter="description"]')?.value || '');
  const notes = normalizeText(document.querySelector('[data-column-filter="notes"]')?.value || '');
  if (date && item.date !== date) return false;
  if (purchaseDate && item.purchaseDate !== purchaseDate) return false;
  if (description && !normalizeText(item.description).includes(description)) return false;
  if (notes && !normalizeText(item.notes).includes(notes)) return false;

  const checks = {
    type: item.type,
    expenseClass: item.expenseClass,
    group,
    paymentMethod: payment,
    situation,
    modality: item.modality,
  };
  for (const [key, value] of Object.entries(checks)) {
    const selected = selectedValues(key);
    if (selected.size && !selected.has(normalizeText(value))) return false;
  }
  return matchesExactNumbers(valueOf(item, 'income'), state.income)
    && matchesExactNumbers(valueOf(item, 'expense'), state.expense);
}

function sortRows(items) {
  const mode = state.sort || document.querySelector('#transactionSortFilter')?.value || 'date_desc';
  return items.sort((a, b) => {
    if (mode === 'income_desc') return valueOf(b, 'income') - valueOf(a, 'income');
    if (mode === 'income_asc') return valueOf(a, 'income') - valueOf(b, 'income');
    if (mode === 'expense_desc') return valueOf(b, 'expense') - valueOf(a, 'expense');
    if (mode === 'expense_asc') return valueOf(a, 'expense') - valueOf(b, 'expense');
    if (mode === 'date_asc') return String(a.date).localeCompare(String(b.date));
    return String(b.date).localeCompare(String(a.date));
  });
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function rowHtml(item) {
  const typeLabel = item.launchType || (item.type === 'expense' ? 'DESPESA' : 'RECEITA');
  const situation = item.situation || (item.status === 'paid' ? 'PAGO' : 'PENDENTE');
  return `<tr class="transaction-row ${item.type === 'income' ? 'transaction-income-row' : 'transaction-expense-row'}">
    <td class="transaction-date-cell"><span class="transaction-date-value"><button class="transaction-edit-button" type="button" data-edit="${escapeHtml(item.id)}" aria-label="Editar ${escapeHtml(item.description)}" title="Editar lançamento"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 17.2 9.8-9.8 2.8 2.8L6.8 20H4v-2.8ZM18.8 8 16 5.2l1.4-1.4a2 2 0 0 1 2.8 2.8L18.8 8Z"/></svg></button><span>${formatDate(item.date)}</span></span></td>
    <td>${item.purchaseDate ? formatDate(item.purchaseDate) : ''}</td><td>${escapeHtml(item.weekday || '')}</td>
    <td><span class="pill ${item.type === 'expense' ? 'expense' : ''}">${escapeHtml(typeLabel)}</span></td>
    <td><strong>${escapeHtml(item.description)}</strong>${item.status === 'pending' ? '<br><small>Pendente</small>' : ''}</td>
    <td class="amount-col amount positive">${item.incomeAmount ? currency.format(item.incomeAmount) : ''}</td>
    <td>${escapeHtml(item.expenseClass || '')}</td><td>${escapeHtml(item.group || item.category || '')}</td>
    <td class="amount-col amount negative">${item.expenseAmount ? currency.format(item.expenseAmount) : ''}</td>
    <td>${escapeHtml(item.paymentMethod || item.account || '')}</td><td>${escapeHtml(situation)}</td>
    <td>${escapeHtml(item.modality || '')}</td><td>${escapeHtml(item.notes || '')}</td>
    <td class="actions-col"><span class="transaction-row-status" aria-hidden="true">${item.type === 'income' ? '↗' : '↘'}</span></td></tr>`;
}

function updateSummary(rows) {
  const incomes = rows.filter((item) => item.type === 'income');
  const expenses = rows.filter((item) => item.type === 'expense');
  const income = incomes.reduce((sum, item) => sum + valueOf(item, 'income'), 0);
  const expense = expenses.reduce((sum, item) => sum + valueOf(item, 'expense'), 0);
  const result = income - expense;
  const set = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
  set('#transactionsFilteredIncome', currency.format(income));
  set('#transactionsFilteredIncomeCount', `${incomes.length} lançamento(s)`);
  set('#transactionsFilteredExpense', currency.format(expense));
  set('#transactionsFilteredExpenseCount', `${expenses.length} lançamento(s)`);
  set('#transactionsFilteredResult', currency.format(result));
  set('#transactionsFilteredResultStatus', result > 0 ? 'Sobra no recorte selecionado' : result < 0 ? 'Déficit no recorte selecionado' : rows.length ? 'Recorte equilibrado' : 'Nenhum lançamento encontrado');
}

function render() {
  if (!active()) return;
  const tbody = document.querySelector('#transactionRows');
  const transactions = window.MEG_APP?.getStateRef?.()?.transactions;
  if (!tbody || !transactions) return;
  const rows = sortRows(transactions.filter(matches));
  updateSummary(rows);
  const pageSize = Number(document.querySelector('#transactionsPageSize')?.value || 100);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  state.page = Math.min(Math.max(state.page, 1), pages);
  const start = (state.page - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);
  observer?.disconnect();
  tbody.innerHTML = visible.length ? visible.map(rowHtml).join('') : '<tr><td colspan="14" class="empty">Nenhum lançamento encontrado.</td></tr>';
  observer?.observe(tbody, { childList: true });
  const info = document.querySelector('#transactionsPageInfo');
  if (info) info.textContent = `Exibindo ${rows.length ? start + 1 : 0}-${Math.min(start + visible.length, rows.length)} de ${rows.length} lançamento(s)`;
  const previous = document.querySelector('#transactionsPreviousPage');
  const next = document.querySelector('#transactionsNextPage');
  if (previous) previous.disabled = state.page <= 1;
  if (next) next.disabled = state.page >= pages;
  syncButtons();
}

function schedule({ resetPage = false } = {}) {
  if (!active()) return;
  if (resetPage) state.page = 1;
  cancelAnimationFrame(scheduledFrame);
  scheduledFrame = requestAnimationFrame(render);
}

function restore() {
  if (active()) return schedule({ resetPage: true });
  requestAnimationFrame(() => window.MEG_APP?.render?.());
  syncButtons();
}

function syncButtons() {
  syncFilterButton(document.querySelector('.meg-stable-filter-button[data-grid="transactions"][data-column="5"]'), state.income);
  syncFilterButton(document.querySelector('.meg-stable-filter-button[data-grid="transactions"][data-column="8"]'), state.expense);
}

export function transactionExactActive() { return active(); }
export function refreshExactTransactions(options) { schedule(options); }

export function openTransactionExactFilter(column, button) {
  const config = column === 5
    ? { key: 'income', label: 'Receita', type: 'income' }
    : { key: 'expense', label: 'Despesa', type: 'expense' };
  openExactValuePopover({
    label: config.label,
    values: numberOptions(config),
    selected: state[config.key],
    button,
    onApply() { state.page = 1; clearLegacyMinimum(config.key); schedule(); },
    onClear() { state.page = 1; clearLegacyMinimum(config.key); restore(); },
    onSort(direction) { state.sort = `${config.key}_${direction}`; schedule(); },
  });
}

export function initializeTransactionExactFilter() {
  clearLegacyMinimum('income');
  clearLegacyMinimum('expense');
  const tbody = document.querySelector('#transactionRows');
  if (tbody) {
    observer = new MutationObserver(() => schedule());
    observer.observe(tbody, { childList: true });
  }
  document.addEventListener('click', (event) => {
    if (!active()) return;
    const previous = event.target.closest?.('#transactionsPreviousPage');
    const next = event.target.closest?.('#transactionsNextPage');
    if (!previous && !next) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.page += previous ? -1 : 1;
    schedule();
  }, true);
  document.addEventListener('change', (event) => {
    if (!active()) return;
    if (event.target.matches?.('#transactionsPageSize')) event.stopImmediatePropagation();
    if (event.target.closest?.('#transactions')) schedule({ resetPage: true });
  }, true);
  document.addEventListener('input', (event) => {
    if (active() && event.target.closest?.('#transactions')) schedule({ resetPage: true });
  });
  document.querySelector('#clearColumnFiltersBtn')?.addEventListener('click', () => {
    state.income.clear(); state.expense.clear(); state.page = 1; state.sort = ''; restore();
  });
  syncButtons();
}
