const EMPTY_VALUE = '__MEG_EMPTY__';
const MAX_LIST_OPTIONS = 250;

const TRANSACTION_COLUMNS = [
  { key: 'date', label: 'Vencimento', kind: 'date', selector: '[data-column-filter="date"]', sort: { asc: 'date_asc', desc: 'date_desc' } },
  { key: 'purchaseDate', label: 'Compra', kind: 'date', selector: '[data-column-filter="purchaseDate"]' },
  null,
  { key: 'type', label: 'Tipo', kind: 'multi', selector: '[data-multi-filter="type"]' },
  { key: 'description', label: 'Descrição', kind: 'text', selector: '[data-column-filter="description"]' },
  { key: 'income', label: 'Receita', kind: 'number', selector: '[data-column-filter="income"]' },
  { key: 'expenseClass', label: 'Classificação', kind: 'multi', selector: '[data-multi-filter="expenseClass"]' },
  { key: 'group', label: 'Grupo', kind: 'multi', selector: '[data-multi-filter="group"]' },
  { key: 'expense', label: 'Despesa', kind: 'number', selector: '[data-column-filter="expense"]', sort: { asc: 'expense_asc', desc: 'expense_desc' } },
  { key: 'paymentMethod', label: 'Pagamento', kind: 'multi', selector: '[data-multi-filter="paymentMethod"]' },
  { key: 'situation', label: 'Situação', kind: 'multi', selector: '[data-multi-filter="situation"]' },
  { key: 'modality', label: 'Modalidade', kind: 'multi', selector: '[data-multi-filter="modality"]' },
  { key: 'notes', label: 'Observações', kind: 'text', selector: '[data-column-filter="notes"]' },
  null,
];

const CARD_COLUMNS = [
  { key: 'purchaseDate', label: 'Compra', kind: 'date' },
  { key: 'dueDate', label: 'Vencimento', kind: 'date' },
  { key: 'description', label: 'Descrição', kind: 'multi' },
  { key: 'group', label: 'Grupo', kind: 'multi' },
  { key: 'card', label: 'Cartão', kind: 'multi' },
  { key: 'value', label: 'Valor', kind: 'number' },
  { key: 'status', label: 'Situação', kind: 'multi' },
  null,
];

const cardState = { filters: new Map(), sort: null };
let activePopover = null;
let activeButton = null;
let initialized = false;
let transactionObserver = null;
let cardObserver = null;

export function normalizeGridText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function parseGridNumber(value) {
  const text = String(value ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseGridDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

export function matchesCardFilter(value, filter) {
  if (!filter) return true;
  if (filter.kind === 'number') {
    const number = parseGridNumber(value);
    if (filter.min !== null && number < filter.min) return false;
    if (filter.max !== null && number > filter.max) return false;
    return true;
  }
  if (filter.kind === 'date') {
    const date = parseGridDate(value);
    if (filter.from && date < filter.from) return false;
    if (filter.to && date > filter.to) return false;
    return true;
  }
  const normalized = normalizeGridText(value) || EMPTY_VALUE;
  return !filter.values?.size || filter.values.has(normalized);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function closePopover() {
  activePopover?.remove();
  activePopover = null;
  activeButton?.classList.remove('is-open');
  activeButton = null;
}

function positionPopover(popover, anchor) {
  const rect = anchor.getBoundingClientRect();
  const margin = 10;
  const width = Math.min(360, window.innerWidth - margin * 2);
  const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
  popover.style.width = `${width}px`;
  popover.style.left = `${left}px`;
  let top = rect.bottom + 7;
  const estimatedHeight = Math.min(500, window.innerHeight - margin * 2);
  if (top + estimatedHeight > window.innerHeight - margin) top = Math.max(margin, rect.top - estimatedHeight - 7);
  popover.style.top = `${top}px`;
}

function createPopover(title, { sortable = true } = {}) {
  closePopover();
  const popover = document.createElement('section');
  popover.className = 'meg-stable-filter-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', `Filtro de ${title}`);
  popover.innerHTML = `
    <header><div><small>FILTRO DA COLUNA</small><strong>${escapeHtml(title)}</strong></div><button type="button" data-close aria-label="Fechar">×</button></header>
    ${sortable ? '<div class="meg-stable-filter-sort"><button type="button" data-sort="asc">↑ Crescente</button><button type="button" data-sort="desc">↓ Decrescente</button></div>' : ''}
    <div class="meg-stable-filter-body"></div>
    <footer><button type="button" data-clear>Limpar</button><button type="button" data-cancel>Cancelar</button><button type="button" class="primary" data-apply>Aplicar</button></footer>`;
  document.body.append(popover);
  activePopover = popover;
  return popover;
}

function setButtonState(button, active, count = 0) {
  button.classList.toggle('is-filtered', active);
  button.dataset.count = active && count ? String(count) : '';
}

function wireHeaderButton(header, config, tableName, index) {
  if (!config || header.querySelector('.meg-stable-filter-button')) return;
  const labelText = header.textContent.trim() || config.label;
  header.replaceChildren();
  const label = document.createElement('span');
  label.className = 'meg-stable-header-label';
  label.textContent = labelText;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'meg-stable-filter-button';
  button.dataset.grid = tableName;
  button.dataset.column = String(index);
  button.title = `Filtrar ${config.label}`;
  button.setAttribute('aria-label', `Filtrar ${config.label}`);
  button.innerHTML = '<span aria-hidden="true">▾</span>';
  header.append(label, button);
}

function setupHeaders(table, columns, tableName) {
  if (!table?.tHead) return;
  table.classList.add('meg-header-filters-ready');
  [...table.tHead.rows[0].cells].forEach((header, index) => wireHeaderButton(header, columns[index], tableName, index));
}

function transactionSource(config) {
  return config?.selector ? document.querySelector(config.selector) : null;
}

function transactionFilterState(config) {
  const source = transactionSource(config);
  if (!source) return { active: false, count: 0 };
  if (config.kind === 'multi') {
    const checked = source.querySelectorAll('[data-multi-filter-option]:checked').length;
    return { active: checked > 0, count: checked };
  }
  return { active: Boolean(source.value), count: source.value ? 1 : 0 };
}

function syncTransactionButtons() {
  const table = document.querySelector('#transactions .transactions-table');
  if (!table) return;
  table.querySelectorAll('.meg-stable-filter-button').forEach((button) => {
    const config = TRANSACTION_COLUMNS[Number(button.dataset.column)];
    const state = transactionFilterState(config);
    setButtonState(button, state.active, state.count);
  });
}

function dispatchControl(control) {
  const eventName = control.type === 'date' || control.tagName === 'SELECT' ? 'change' : 'input';
  control.dispatchEvent(new Event(eventName, { bubbles: true }));
}

function transactionSort(direction, config) {
  if (!config.sort) return;
  const select = document.querySelector('#transactionSortFilter');
  if (!select) return;
  select.value = config.sort[direction];
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function applyTransactionMultiSelection(source, values, selectedValues) {
  values.forEach(({ value }) => {
    const option = [...source.querySelectorAll('[data-multi-filter-option]')].find((item) => item.value === value);
    if (!option) return;
    const next = selectedValues.has(value);
    if (option.checked === next) return;
    option.checked = next;
    option.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function openTransactionFilter(config, button) {
  const source = transactionSource(config);
  if (!source) return;
  const popover = createPopover(config.label, { sortable: Boolean(config.sort) });
  activeButton = button;
  button.classList.add('is-open');
  const body = popover.querySelector('.meg-stable-filter-body');

  if (config.kind === 'multi') {
    const values = [...source.querySelectorAll('[data-multi-filter-option]')].map((option) => ({
      value: option.value,
      label: option.closest('label')?.querySelector('span')?.textContent?.trim() || option.value,
      checked: option.checked,
    }));
    const working = new Set(values.filter((item) => item.checked).map((item) => item.value));
    body.innerHTML = `
      <input class="meg-stable-filter-search" type="search" placeholder="Pesquisar valores" autocomplete="off">
      <label class="meg-stable-select-all"><input type="checkbox" data-select-all><span>Selecionar tudo</span></label>
      <div class="meg-stable-filter-options"></div>`;
    const search = body.querySelector('.meg-stable-filter-search');
    const optionsBox = body.querySelector('.meg-stable-filter-options');
    const selectAll = body.querySelector('[data-select-all]');
    const visibleValues = () => {
      const query = normalizeGridText(search.value);
      return values.filter((item) => !query || normalizeGridText(item.label).includes(query)).slice(0, MAX_LIST_OPTIONS);
    };
    const render = () => {
      const visible = visibleValues();
      optionsBox.innerHTML = visible.length
        ? visible.map((item) => `<label><input type="checkbox" value="${escapeHtml(item.value)}" ${working.has(item.value) ? 'checked' : ''}><span title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span></label>`).join('')
        : '<p class="meg-stable-filter-empty">Nenhum valor encontrado.</p>';
      selectAll.checked = visible.length > 0 && visible.every((item) => working.has(item.value));
      selectAll.indeterminate = visible.some((item) => working.has(item.value)) && !selectAll.checked;
    };
    search.addEventListener('input', render);
    selectAll.addEventListener('change', () => {
      visibleValues().forEach((item) => selectAll.checked ? working.add(item.value) : working.delete(item.value));
      render();
    });
    optionsBox.addEventListener('change', (event) => {
      const option = event.target.closest('input[type="checkbox"]');
      if (!option) return;
      option.checked ? working.add(option.value) : working.delete(option.value);
      render();
    });
    popover.querySelector('[data-apply]').addEventListener('click', () => {
      applyTransactionMultiSelection(source, values, working);
      closePopover();
      requestAnimationFrame(syncTransactionButtons);
    });
    popover.querySelector('[data-clear]').addEventListener('click', () => {
      applyTransactionMultiSelection(source, values, new Set());
      closePopover();
      requestAnimationFrame(syncTransactionButtons);
    });
    render();
    setTimeout(() => search.focus(), 0);
  } else {
    const inputType = config.kind === 'text' ? 'search' : config.kind;
    const label = config.kind === 'number' ? 'Valor mínimo' : config.kind === 'date' ? 'Data exata' : 'Contém';
    body.innerHTML = `<label class="meg-stable-single-filter"><span>${label}</span><input type="${inputType}" step="0.01" value="${escapeHtml(source.value)}"></label>`;
    const input = body.querySelector('input');
    popover.querySelector('[data-apply]').addEventListener('click', () => {
      source.value = input.value;
      dispatchControl(source);
      closePopover();
      requestAnimationFrame(syncTransactionButtons);
    });
    popover.querySelector('[data-clear]').addEventListener('click', () => {
      source.value = '';
      dispatchControl(source);
      closePopover();
      requestAnimationFrame(syncTransactionButtons);
    });
    setTimeout(() => input.focus(), 0);
  }

  popover.querySelector('[data-cancel]').addEventListener('click', closePopover);
  popover.querySelector('[data-close]').addEventListener('click', closePopover);
  popover.querySelectorAll('[data-sort]').forEach((sortButton) => sortButton.addEventListener('click', () => {
    transactionSort(sortButton.dataset.sort, config);
    closePopover();
  }));
  positionPopover(popover, button);
}

function cardRows() {
  return [...document.querySelectorAll('#creditInvoiceRows tr')].filter((row) => row.cells.length === CARD_COLUMNS.length && !row.querySelector('.empty'));
}

function cardCellValue(row, index) {
  return row.cells[index]?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function cardUniqueValues(index) {
  const values = new Map();
  cardRows().forEach((row) => {
    const raw = cardCellValue(row, index);
    const normalized = normalizeGridText(raw) || EMPTY_VALUE;
    if (!values.has(normalized)) values.set(normalized, raw || '(Vazio)');
  });
  return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR', { numeric: true, sensitivity: 'base' }));
}

function compareCardValues(a, b, config) {
  if (config.kind === 'number') return parseGridNumber(a) - parseGridNumber(b);
  if (config.kind === 'date') return parseGridDate(a).localeCompare(parseGridDate(b));
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function applyCardFilters() {
  const tbody = document.querySelector('#creditInvoiceRows');
  if (!tbody) return;
  const rows = cardRows();
  rows.forEach((row) => {
    row.hidden = [...cardState.filters.entries()].some(([index, filter]) => !matchesCardFilter(cardCellValue(row, index), filter));
  });
  if (cardState.sort) {
    const { index, direction } = cardState.sort;
    const config = CARD_COLUMNS[index];
    const sortedRows = [...rows].sort((a, b) => {
      const result = compareCardValues(cardCellValue(a, index), cardCellValue(b, index), config);
      return direction === 'asc' ? result : -result;
    });
    if (sortedRows.some((row, position) => row !== rows[position])) {
      const fragment = document.createDocumentFragment();
      sortedRows.forEach((row) => fragment.append(row));
      tbody.append(fragment);
    }
  }
  const visibleRows = rows.filter((row) => !row.hidden);
  const total = visibleRows.reduce((sum, row) => sum + parseGridNumber(cardCellValue(row, 5)), 0);
  const open = visibleRows
    .filter((row) => normalizeGridText(cardCellValue(row, 6)).includes('ABERTO'))
    .reduce((sum, row) => sum + parseGridNumber(cardCellValue(row, 5)), 0);
  const summary = document.querySelector('#creditInvoiceSummary');
  if (summary) {
    summary.textContent = `${visibleRows.length} de ${rows.length} compra(s) · ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${open.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em aberto`;
  }
  const table = document.querySelector('#credit-cards .credit-invoice-table');
  table?.querySelectorAll('.meg-stable-filter-button').forEach((button) => {
    const index = Number(button.dataset.column);
    const filter = cardState.filters.get(index);
    const count = filter?.values?.size || (filter ? 1 : 0);
    setButtonState(button, Boolean(filter), count);
    button.classList.toggle('is-sorted', cardState.sort?.index === index);
    button.dataset.sortDirection = cardState.sort?.index === index ? cardState.sort.direction : '';
  });
}

function openCardFilter(config, index, button) {
  const popover = createPopover(config.label);
  activeButton = button;
  button.classList.add('is-open');
  const body = popover.querySelector('.meg-stable-filter-body');
  const current = cardState.filters.get(index);

  if (config.kind === 'number') {
    body.innerHTML = `<div class="meg-stable-range"><label><span>Valor mínimo</span><input type="number" step="0.01" data-min value="${current?.min ?? ''}"></label><label><span>Valor máximo</span><input type="number" step="0.01" data-max value="${current?.max ?? ''}"></label></div>`;
    popover.querySelector('[data-apply]').addEventListener('click', () => {
      const minText = body.querySelector('[data-min]').value;
      const maxText = body.querySelector('[data-max]').value;
      const min = minText === '' ? null : Number(minText);
      const max = maxText === '' ? null : Number(maxText);
      if (min === null && max === null) cardState.filters.delete(index);
      else cardState.filters.set(index, { kind: 'number', min, max });
      applyCardFilters();
      closePopover();
    });
  } else if (config.kind === 'date') {
    body.innerHTML = `<div class="meg-stable-range"><label><span>De</span><input type="date" data-from value="${current?.from || ''}"></label><label><span>Até</span><input type="date" data-to value="${current?.to || ''}"></label></div>`;
    popover.querySelector('[data-apply]').addEventListener('click', () => {
      const from = body.querySelector('[data-from]').value;
      const to = body.querySelector('[data-to]').value;
      if (!from && !to) cardState.filters.delete(index);
      else cardState.filters.set(index, { kind: 'date', from, to });
      applyCardFilters();
      closePopover();
    });
  } else {
    const values = cardUniqueValues(index);
    const working = new Set(current?.values || []);
    body.innerHTML = `<input class="meg-stable-filter-search" type="search" placeholder="Pesquisar valores" autocomplete="off"><label class="meg-stable-select-all"><input type="checkbox" data-select-all><span>Selecionar tudo</span></label><div class="meg-stable-filter-options"></div>`;
    const search = body.querySelector('.meg-stable-filter-search');
    const optionsBox = body.querySelector('.meg-stable-filter-options');
    const selectAll = body.querySelector('[data-select-all]');
    const visibleValues = () => {
      const query = normalizeGridText(search.value);
      return values.filter(([, label]) => !query || normalizeGridText(label).includes(query)).slice(0, MAX_LIST_OPTIONS);
    };
    const render = () => {
      const visible = visibleValues();
      optionsBox.innerHTML = visible.length
        ? visible.map(([value, label]) => `<label><input type="checkbox" value="${escapeHtml(value)}" ${working.has(value) ? 'checked' : ''}><span title="${escapeHtml(label)}">${escapeHtml(label)}</span></label>`).join('')
        : '<p class="meg-stable-filter-empty">Nenhum valor encontrado.</p>';
      selectAll.checked = visible.length > 0 && visible.every(([value]) => working.has(value));
      selectAll.indeterminate = visible.some(([value]) => working.has(value)) && !selectAll.checked;
    };
    search.addEventListener('input', render);
    selectAll.addEventListener('change', () => {
      visibleValues().forEach(([value]) => selectAll.checked ? working.add(value) : working.delete(value));
      render();
    });
    optionsBox.addEventListener('change', (event) => {
      const option = event.target.closest('input[type="checkbox"]');
      if (!option) return;
      option.checked ? working.add(option.value) : working.delete(option.value);
      render();
    });
    popover.querySelector('[data-apply]').addEventListener('click', () => {
      if (!working.size || working.size === values.length) cardState.filters.delete(index);
      else cardState.filters.set(index, { kind: 'multi', values: new Set(working) });
      applyCardFilters();
      closePopover();
    });
    render();
    setTimeout(() => search.focus(), 0);
  }

  popover.querySelector('[data-clear]').addEventListener('click', () => {
    cardState.filters.delete(index);
    applyCardFilters();
    closePopover();
  });
  popover.querySelector('[data-cancel]').addEventListener('click', closePopover);
  popover.querySelector('[data-close]').addEventListener('click', closePopover);
  popover.querySelectorAll('[data-sort]').forEach((sortButton) => sortButton.addEventListener('click', () => {
    cardState.sort = { index, direction: sortButton.dataset.sort };
    applyCardFilters();
    closePopover();
  }));
  positionPopover(popover, button);
}

function setupObservers() {
  const transactionBody = document.querySelector('#transactionRows');
  if (transactionBody && !transactionObserver) {
    transactionObserver = new MutationObserver(() => requestAnimationFrame(syncTransactionButtons));
    transactionObserver.observe(transactionBody, { childList: true });
  }
  const creditBody = document.querySelector('#creditInvoiceRows');
  if (creditBody && !cardObserver) {
    cardObserver = new MutationObserver(() => requestAnimationFrame(applyCardFilters));
    cardObserver.observe(creditBody, { childList: true });
  }
}

function setupTables() {
  const transactionTable = document.querySelector('#transactions .transactions-table');
  const cardTable = document.querySelector('#credit-cards .credit-invoice-table');
  setupHeaders(transactionTable, TRANSACTION_COLUMNS, 'transactions');
  setupHeaders(cardTable, CARD_COLUMNS, 'cards');
  setupObservers();
  syncTransactionButtons();
  applyCardFilters();
}

function handleHeaderClick(event) {
  const button = event.target.closest('.meg-stable-filter-button');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const index = Number(button.dataset.column);
  if (button.dataset.grid === 'transactions') openTransactionFilter(TRANSACTION_COLUMNS[index], button);
  else openCardFilter(CARD_COLUMNS[index], index, button);
}

export function initializeStableGridFilters() {
  if (initialized) return;
  initialized = true;
  setupTables();
  document.addEventListener('click', handleHeaderClick);
  document.addEventListener('pointerdown', (event) => {
    if (!activePopover) return;
    if (event.target.closest('.meg-stable-filter-popover') || event.target.closest('.meg-stable-filter-button')) return;
    closePopover();
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopover();
  });
  window.addEventListener('resize', () => {
    if (activePopover && activeButton) positionPopover(activePopover, activeButton);
  }, { passive: true });
  window.MEG_STABLE_GRID_FILTERS = {
    refresh: setupTables,
    clearCardFilters() {
      cardState.filters.clear();
      cardState.sort = null;
      applyCardFilters();
    },
  };
}
