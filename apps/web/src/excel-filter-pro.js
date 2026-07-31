const TABLE_SELECTOR = '#transactions .transactions-table, #transactions table';
const runtime = { table: null, activeColumn: null, selections: new Map(), popover: null, signature: '' };

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const EMPTY_VALUE = '__MEG_EMPTY__';
const HEADER_LABELS = [
  'Vencimento',
  'Compra',
  'Dia',
  'Tipo',
  'Descrição',
  'Receita',
  'Classificação',
  'Grupo',
  'Despesa',
  'Pagamento',
  'Situação',
  'Modalidade',
  'Observações',
  'Ações',
];

function tableHeaders(table) {
  return [...table.querySelectorAll('thead tr:first-child th')].map((cell, index) => {
    const label = cell.querySelector('.meg-grid-header-label')?.textContent || cell.textContent;
    return normalize(label.replace(/[▾▼⌄]/g, '')) || HEADER_LABELS[index] || `Coluna ${index + 1}`;
  });
}

function dataRows(table) {
  return [...table.querySelectorAll('tbody tr')].filter((row) => !row.classList.contains('meg-filter-empty-row'));
}

function rawCellValue(row, index) {
  return normalize(row.children[index]?.textContent || '');
}

function cellValue(row, index) {
  return rawCellValue(row, index) || EMPTY_VALUE;
}

function displayValue(value) {
  return value === EMPTY_VALUE ? '(Sem classificação)' : value;
}

function uniqueValues(table, index) {
  return [...new Set(dataRows(table).map((row) => cellValue(row, index)))]
    .sort((a, b) => displayValue(a).localeCompare(displayValue(b), 'pt-BR', { numeric: true, sensitivity: 'base' }));
}

function closePopover() {
  runtime.popover?.remove();
  runtime.popover = null;
  runtime.activeColumn = null;
  document.querySelectorAll('.meg-grid-filter-button.is-open').forEach((button) => button.classList.remove('is-open'));
}

function positionPopover(popover, anchor) {
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const margin = 12;
  const width = Math.min(380, window.innerWidth - margin * 2);
  const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
  let top = rect.bottom + 8;
  const height = Math.min(540, window.innerHeight - margin * 2);
  if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - 8);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function applyFilters(table) {
  let visible = 0;
  dataRows(table).forEach((row) => {
    const matches = [...runtime.selections.entries()].every(([index, selected]) => !selected.size || selected.has(cellValue(row, Number(index))));
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  table.classList.toggle('meg-grid-filtered', runtime.selections.size > 0);
  table.querySelectorAll('.meg-grid-filter-button').forEach((button) => {
    const selected = runtime.selections.get(Number(button.dataset.columnIndex));
    button.classList.toggle('is-filtered', Boolean(selected?.size));
    button.dataset.count = selected?.size ? String(selected.size) : '';
  });
  const panel = table.closest('.table-panel') || table.parentElement;
  let summary = panel?.querySelector('.meg-grid-result-summary');
  if (!summary && panel) {
    summary = document.createElement('div');
    summary.className = 'meg-grid-result-summary';
    panel.querySelector('.meg-table-toolbar')?.append(summary) || panel.prepend(summary);
  }
  if (summary) summary.textContent = `${visible} de ${dataRows(table).length} lançamento(s)`;
}

function clearColumnFilter(table, index) {
  runtime.selections.delete(index);
  applyFilters(table);
}

function sortRows(table, index, direction) {
  const tbody = table.tBodies[0];
  if (!tbody) return;
  const rows = dataRows(table);
  const parse = (text) => {
    const dateMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dateMatch) return Number(`${dateMatch[3]}${dateMatch[2]}${dateMatch[1]}`);
    const money = Number(text.replace(/R\$/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(money) && /\d/.test(text) ? money : text.toLocaleLowerCase('pt-BR');
  };
  rows.sort((a, b) => {
    const av = parse(rawCellValue(a, index));
    const bv = parse(rawCellValue(b, index));
    const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
    return direction === 'asc' ? result : -result;
  }).forEach((row) => tbody.append(row));
}

function openFilter(table, index, button) {
  closePopover();
  runtime.activeColumn = index;
  button.classList.add('is-open');
  const headers = tableHeaders(table);
  const values = uniqueValues(table, index);
  const applied = runtime.selections.get(index);
  const working = new Set(applied ? [...applied] : []);
  const popover = document.createElement('section');
  popover.className = 'meg-excel-filter-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', `Filtro de ${headers[index]}`);
  popover.innerHTML = `
    <header class="meg-excel-filter-head"><div><small>FILTRO DA COLUNA</small><strong>${escapeHtml(headers[index])}</strong></div><button type="button" class="meg-filter-close" aria-label="Fechar">×</button></header>
    <div class="meg-filter-sort-actions"><button type="button" data-sort="asc">A → Z</button><button type="button" data-sort="desc">Z → A</button></div>
    <div class="meg-excel-filter-search-wrap"><input type="search" placeholder="Pesquisar em ${escapeHtml(headers[index])}" autocomplete="off"></div>
    <label class="meg-excel-filter-option is-all"><input type="checkbox" data-select-all><span>Selecionar tudo</span><small>${values.length}</small></label>
    <div class="meg-excel-filter-options"></div>
    <footer class="meg-excel-filter-actions"><button type="button" data-action="clear">Limpar</button><button type="button" data-action="cancel">Cancelar</button><button type="button" class="meg-excel-apply" data-action="apply">Aplicar</button></footer>`;
  document.body.append(popover);
  runtime.popover = popover;
  positionPopover(popover, button);
  const search = popover.querySelector('input[type=search]');
  const list = popover.querySelector('.meg-excel-filter-options');
  const selectAll = popover.querySelector('[data-select-all]');

  const visibleValues = () => {
    const query = normalize(search.value).toLocaleLowerCase('pt-BR');
    return values.filter((value) => displayValue(value).toLocaleLowerCase('pt-BR').includes(query));
  };

  const syncSelectAll = () => {
    const visible = visibleValues();
    selectAll.checked = visible.length > 0 && visible.every((value) => working.has(value));
    selectAll.indeterminate = visible.some((value) => working.has(value)) && !selectAll.checked;
  };

  const render = () => {
    const visible = visibleValues();
    list.innerHTML = visible.length
      ? visible.map((value) => `<label class="meg-excel-filter-option"><input type="checkbox" value="${escapeHtml(value)}" ${working.has(value) ? 'checked' : ''}><span title="${escapeHtml(displayValue(value))}">${escapeHtml(displayValue(value))}</span></label>`).join('')
      : '<div class="meg-excel-filter-empty">Nenhum valor encontrado.</div>';
    syncSelectAll();
  };

  search.addEventListener('input', render);
  selectAll.addEventListener('change', () => {
    visibleValues().forEach((value) => selectAll.checked ? working.add(value) : working.delete(value));
    render();
  });
  list.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type=checkbox]');
    if (!checkbox) return;
    checkbox.checked ? working.add(checkbox.value) : working.delete(checkbox.value);
    syncSelectAll();
  });
  popover.addEventListener('click', (event) => {
    if (event.target.closest('.meg-filter-close')) return closePopover();
    const sort = event.target.closest('[data-sort]')?.dataset.sort;
    if (sort) { sortRows(table, index, sort); closePopover(); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'cancel') return closePopover();
    if (action === 'clear') { clearColumnFilter(table, index); closePopover(); return; }
    if (action === 'apply') {
      if (!working.size || working.size === values.length) runtime.selections.delete(index);
      else runtime.selections.set(index, new Set(working));
      applyFilters(table);
      closePopover();
    }
  });
  render();
  window.setTimeout(() => search.focus(), 0);
}

function wireFilterButton(button, table, index, title) {
  button.type = 'button';
  button.className = 'meg-grid-filter-button';
  button.dataset.columnIndex = String(index);
  button.setAttribute('aria-label', `Filtrar ${title}`);
  button.setAttribute('title', `Filtrar ${title}`);
  button.innerHTML = '<span aria-hidden="true">▾</span>';
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openFilter(table, index, button);
  };
}

function ensureFilterButtons(table) {
  table.classList.add('meg-professional-grid');
  const headers = table.querySelectorAll('thead tr:first-child th');
  headers.forEach((header, index) => {
    if (index === headers.length - 1) return;

    const title = HEADER_LABELS[index] || normalize(header.textContent);
    const currentLabel = header.querySelector('.meg-grid-header-label');
    const existingButton = header.querySelector('.meg-grid-filter-button');

    if (currentLabel && existingButton && existingButton.dataset.columnIndex === String(index)) {
      currentLabel.textContent = title;
      wireFilterButton(existingButton, table, index, title);
      return;
    }

    header.replaceChildren();

    const label = document.createElement('span');
    label.className = 'meg-grid-header-label';
    label.textContent = title;

    const button = existingButton || document.createElement('button');
    wireFilterButton(button, table, index, title);

    header.append(label, button);
  });
}

function prepareMobileCards(table) {
  const headers = tableHeaders(table);
  dataRows(table).forEach((row) => {
    row.classList.add('meg-mobile-transaction-card');
    [...row.children].forEach((cell, index) => {
      cell.dataset.label = headers[index] || '';
      if (/descri/i.test(headers[index])) cell.classList.add('meg-mobile-description');
      if (/receita|despesa|valor/i.test(headers[index])) cell.classList.add('meg-mobile-value');
      if (/situa/i.test(headers[index])) cell.classList.add('meg-mobile-status');
      if (/classifica/i.test(headers[index]) && !normalize(cell.textContent)) cell.textContent = 'SEM CLASSIFICAÇÃO';
      if (/observ/i.test(headers[index])) cell.classList.add('meg-mobile-notes');
      if (index === headers.length - 1) cell.classList.add('meg-mobile-actions');
    });
  });
}

function enhanceTable() {
  const table = document.querySelector(TABLE_SELECTOR);
  if (!table?.tHead || !table.tBodies.length) return;
  ensureFilterButtons(table);
  const rows = dataRows(table);
  const signature = `${rows.length}|${tableHeaders(table).join('|')}|${rows[0]?.textContent || ''}|${rows.at(-1)?.textContent || ''}`;
  if (runtime.table === table && runtime.signature === signature) return;
  runtime.table = table;
  runtime.signature = signature;
  prepareMobileCards(table);
  applyFilters(table);
}

function openFilterFromEvent(event) {
  const button = event.target.closest?.('.meg-grid-filter-button');
  if (!button) return false;

  const table = button.closest('table');
  if (!table?.matches?.(TABLE_SELECTOR)) return false;

  const index = Number(button.dataset.columnIndex);
  if (!Number.isFinite(index)) return false;

  event.preventDefault();
  event.stopPropagation();
  openFilter(table, index, button);
  return true;
}

document.addEventListener('pointerdown', (event) => {
  if (openFilterFromEvent(event)) return;
  if (!runtime.popover) return;
  if (event.target.closest('.meg-excel-filter-popover') || event.target.closest('.meg-grid-filter-button')) return;
  closePopover();
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePopover();
    return;
  }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.closest?.('.meg-grid-filter-button')) {
    openFilterFromEvent(event);
  }
});
window.addEventListener('resize', () => runtime.popover && positionPopover(runtime.popover, document.querySelector('.meg-grid-filter-button.is-open')));
const observer = new MutationObserver(() => window.requestAnimationFrame(enhanceTable));
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceTable, { once: true }); else enhanceTable();
