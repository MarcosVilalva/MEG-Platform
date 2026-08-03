import { currency, matchesExactNumbers, normalizeExactNumber, normalizeText, openExactValuePopover, parseBrazilianNumber, syncFilterButton } from './exact-number-filter-core.js';

const selected = new Set();
let sortDirection = '';
let observer = null;
let scheduledFrame = 0;

function rows() {
  return [...document.querySelectorAll('#creditInvoiceRows tr')].filter((row) => row.cells.length === 8 && !row.querySelector('.empty'));
}

function options() {
  const values = new Set();
  rows().forEach((row) => {
    const value = normalizeExactNumber(row.cells[5]?.textContent);
    if (value) values.add(value);
  });
  return [...values].sort((a, b) => Number(a) - Number(b)).map((value) => ({ value, label: currency.format(Number(value)) }));
}

function clearOwnHidden() {
  rows().forEach((row) => {
    if (row.dataset.exactNumberHidden === '1') row.hidden = false;
    delete row.dataset.exactNumberHidden;
  });
}

function syncButton() {
  syncFilterButton(document.querySelector('.meg-stable-filter-button[data-grid="cards"][data-column="5"]'), selected);
}

function apply() {
  const cardRows = rows();
  cardRows.forEach((row) => {
    if (selected.size && !matchesExactNumbers(row.cells[5]?.textContent, selected)) {
      row.hidden = true;
      row.dataset.exactNumberHidden = '1';
    }
  });
  if (sortDirection) {
    const sorted = [...cardRows].sort((a, b) => {
      const result = parseBrazilianNumber(a.cells[5]?.textContent) - parseBrazilianNumber(b.cells[5]?.textContent);
      return sortDirection === 'asc' ? result : -result;
    });
    if (sorted.some((row, index) => row !== cardRows[index])) {
      observer?.disconnect();
      const fragment = document.createDocumentFragment();
      sorted.forEach((row) => fragment.append(row));
      document.querySelector('#creditInvoiceRows')?.append(fragment);
      observer?.observe(document.querySelector('#creditInvoiceRows'), { childList: true });
    }
  }
  const visible = cardRows.filter((row) => !row.hidden);
  const total = visible.reduce((sum, row) => sum + (parseBrazilianNumber(row.cells[5]?.textContent) || 0), 0);
  const open = visible.filter((row) => normalizeText(row.cells[6]?.textContent).includes('ABERTO')).reduce((sum, row) => sum + (parseBrazilianNumber(row.cells[5]?.textContent) || 0), 0);
  const summary = document.querySelector('#creditInvoiceSummary');
  if (summary) summary.textContent = `${visible.length} de ${cardRows.length} compra(s) · ${currency.format(total)} · ${currency.format(open)} em aberto`;
  syncButton();
}

function schedule({ resetStable = false } = {}) {
  cancelAnimationFrame(scheduledFrame);
  if (resetStable) {
    clearOwnHidden();
    window.MEG_STABLE_GRID_FILTERS?.refresh?.();
  }
  scheduledFrame = requestAnimationFrame(() => requestAnimationFrame(apply));
}

export function openCardExactFilter(button) {
  openExactValuePopover({
    label: 'Valor', values: options(), selected, button,
    onApply() { schedule({ resetStable: true }); },
    onClear() { schedule({ resetStable: true }); },
    onSort(direction) { sortDirection = direction; schedule({ resetStable: true }); },
  });
}

export function initializeCardExactFilter() {
  const tbody = document.querySelector('#creditInvoiceRows');
  if (tbody) {
    observer = new MutationObserver(() => schedule());
    observer.observe(tbody, { childList: true });
  }
  document.querySelector('#clearCreditCardFiltersBtn')?.addEventListener('click', () => {
    selected.clear(); sortDirection = ''; schedule({ resetStable: true });
  });
  syncButton();
}
