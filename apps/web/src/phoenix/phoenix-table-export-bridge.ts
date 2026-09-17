import {
  buildPhoenixPdf,
  buildPhoenixXlsx,
  detectPhoenixColumnKinds,
  phoenixExportFilename,
  type PhoenixExportReport
} from './table-export-core';
import './phoenix-table-export.css';

const TOOLBAR_CLASS = 'px-table-export';
const MANAGED_ATTR = 'data-meg-export-ready';
const ignoredHeader = /^(ações?|detalhes?|selecionar|opções?)$/i;

function textOf(element: Element | null | undefined) {
  return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function cleanedCellText(cell: Element) {
  const clone = cell.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button,input,select,textarea,svg,.px-grid-filter,.px-table-export').forEach((item) => item.remove());
  return textOf(clone);
}

function isVisibleRow(row: HTMLTableRowElement) {
  if (row.hidden || row.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(row);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function tableTitle(table: HTMLTableElement) {
  const screen = table.closest('.px-screen');
  const screenTitle = textOf(screen?.querySelector('header h1, .px-screen-head h1')) || 'Relatório';
  const card = table.closest('.px-card, .px-table-card, section');
  const panelTitle = textOf(card?.querySelector('.px-panel-head h2, h2'));
  if (panelTitle && panelTitle !== screenTitle) return `${screenTitle} — ${panelTitle}`;
  return screenTitle;
}

function selectedText(select: HTMLSelectElement) {
  return textOf(select.selectedOptions[0] || null);
}

function isGenericChoice(value: string) {
  const normalized = value.toLocaleLowerCase('pt-BR');
  return !value || /^tod[oa]s?\b/.test(normalized) || /^(all|tudo|qualquer|sem filtro)$/.test(normalized);
}

function collectFilters(table: HTMLTableElement) {
  const screen = table.closest('.px-screen') || document.querySelector('.px-screen');
  if (!screen) return [];
  const filters = new Set<string>();

  screen.querySelectorAll('.px-grid-filter-chip').forEach((item) => {
    const value = textOf(item).replace(/×\s*$/, '').trim();
    if (value) filters.add(value);
  });

  screen.querySelectorAll('select').forEach((node) => {
    const select = node as HTMLSelectElement;
    const value = selectedText(select);
    if (!isGenericChoice(value)) {
      const label = select.getAttribute('aria-label') || select.name || '';
      filters.add(label ? `${label}: ${value}` : value);
    }
  });

  screen.querySelectorAll('input[type="search"], .px-search-field input').forEach((node) => {
    const input = node as HTMLInputElement;
    if (input.value.trim()) filters.add(`Busca: ${input.value.trim()}`);
  });

  return [...filters].slice(0, 16);
}

function parseDateText(value: string) {
  const source = String(value || '').trim();
  let match = source.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  match = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return source;
  return '';
}

function brDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function collectPeriod(headers: string[], rows: string[][]) {
  const indexes = headers
    .map((header, index) => ({ header: header.toLocaleLowerCase('pt-BR'), index }))
    .filter(({ header }) => /^(data|vencimento)|data da compra|pagamento|competência/.test(header))
    .map(({ index }) => index);

  const dates = indexes
    .flatMap((index) => rows.map((row) => parseDateText(row[index] || '')))
    .filter(Boolean)
    .sort();

  if (dates.length) {
    const first = dates[0];
    const last = dates[dates.length - 1];
    return first === last ? brDate(first) : `${brDate(first)} a ${brDate(last)}`;
  }

  const shellPeriod = textOf(document.querySelector('.px-period-active'));
  return shellPeriod || 'Conforme a visão atual';
}

function brazilNow() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date());
}

function extractReport(table: HTMLTableElement): PhoenixExportReport | null {
  const headerRow = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!headerRow) return null;

  const rawHeaders = [...headerRow.cells].map((cell) => cleanedCellText(cell));
  const excluded = new Set<number>();
  rawHeaders.forEach((header, index) => {
    const cell = headerRow.cells[index];
    if (
      ignoredHeader.test(header) ||
      cell?.querySelector('input[type="checkbox"]') ||
      (!header && cell?.querySelector('button'))
    ) excluded.add(index);
  });

  const indexes = rawHeaders.map((_, index) => index).filter((index) => !excluded.has(index));
  const headers = indexes.map((index) => rawHeaders[index] || `Coluna ${index + 1}`);
  const bodyRows = [...table.tBodies].flatMap((body) => [...body.rows]).filter(isVisibleRow);
  const rows = bodyRows.map((row) => indexes.map((index) => {
    const cell = row.cells[index];
    return cell ? cleanedCellText(cell) : '';
  }));

  if (!headers.length) return null;
  const { kinds, sums } = detectPhoenixColumnKinds(headers, rows);
  return {
    systemName: 'MEG Finanças',
    title: tableTitle(table),
    period: collectPeriod(headers, rows),
    filters: collectFilters(table),
    generatedAt: brazilNow(),
    recordCount: rows.length,
    headers,
    rows,
    kinds,
    sums
  };
}

function download(bytes: Uint8Array, type: string, filename: string) {
  const payload = new Uint8Array(bytes.byteLength);
  payload.set(bytes);
  const blob = new Blob([payload.buffer], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function excelIcon() {
  return `<span class="px-export-icon excel" aria-hidden="true"><b>X</b><i></i></span>`;
}

function pdfIcon() {
  return `<span class="px-export-icon pdf" aria-hidden="true"><b>PDF</b></span>`;
}

function updateToolbar(table: HTMLTableElement, toolbar: HTMLElement) {
  const rows = [...table.tBodies].flatMap((body) => [...body.rows]).filter(isVisibleRow);
  const count = toolbar.querySelector<HTMLElement>('.px-export-count');
  if (count) count.textContent = `${rows.length} registro${rows.length === 1 ? '' : 's'}`;
  toolbar.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = !rows.length; });
}

function attach(table: HTMLTableElement) {
  if (table.getAttribute(MANAGED_ATTR) === 'true') {
    const existing = table.parentElement?.parentElement?.querySelector<HTMLElement>(`.${TOOLBAR_CLASS}[data-for-table="${table.dataset.megExportId || ''}"]`);
    if (existing) updateToolbar(table, existing);
    return;
  }

  if (!table.closest('.phoenix-v15')) return;
  if (!table.tHead || !table.tBodies.length) return;

  const id = table.dataset.megExportId || `meg-table-${Math.random().toString(36).slice(2, 10)}`;
  table.dataset.megExportId = id;
  table.setAttribute(MANAGED_ATTR, 'true');

  const toolbar = document.createElement('div');
  toolbar.className = TOOLBAR_CLASS;
  toolbar.dataset.forTable = id;
  toolbar.innerHTML = `
    <div class="px-export-copy">
      <strong>Exportar tabela</strong>
      <span class="px-export-count">0 registros</span>
    </div>
    <div class="px-export-actions">
      <button class="px-export-button excel" type="button" title="Exportar para Excel com filtros e totais">
        ${excelIcon()}<span>Excel</span>
      </button>
      <button class="px-export-button pdf" type="button" title="Exportar relatório em PDF">
        ${pdfIcon()}<span>PDF</span>
      </button>
    </div>
  `;

  const excel = toolbar.querySelector<HTMLButtonElement>('button.excel');
  const pdf = toolbar.querySelector<HTMLButtonElement>('button.pdf');

  excel?.addEventListener('click', () => {
    const report = extractReport(table);
    if (!report || !report.rows.length) return;
    const bytes = buildPhoenixXlsx(report);
    download(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', phoenixExportFilename(report, 'xlsx'));
  });

  pdf?.addEventListener('click', () => {
    const report = extractReport(table);
    if (!report || !report.rows.length) return;
    const bytes = buildPhoenixPdf(report);
    download(bytes, 'application/pdf', phoenixExportFilename(report, 'pdf'));
  });

  const tableContainer = table.closest('.px-table-scroll, .px-table-wrap, .px-data-table-wrap') || table.parentElement;
  if (!tableContainer?.parentElement) return;
  tableContainer.parentElement.insertBefore(toolbar, tableContainer);
  updateToolbar(table, toolbar);
}

function scan() {
  document.querySelectorAll<HTMLTableElement>('.phoenix-v15 table').forEach(attach);
}

let scheduled = false;
function scheduleScan() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    scan();
  });
}

if (typeof window !== 'undefined') {
  const start = () => {
    scan();
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
