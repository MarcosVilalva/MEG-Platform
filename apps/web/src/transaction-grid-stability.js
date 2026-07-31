let scheduled = false;
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

function normalizeHeaderText(value) {
  return String(value || '')
    .replace(/\*+/g, '')
    .replace(/[▾▼⌄]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stabilizeTransactionGrid() {
  const table = document.querySelector('#transactions .transactions-table');
  if (!table) return;

  table.querySelectorAll('thead .column-filter-row').forEach((row) => row.remove());
  table.querySelectorAll('.excel-filter-button,.meg-date-sort-button').forEach((button) => button.remove());

  table.classList.add('meg-professional-grid');

  table.querySelectorAll('thead tr:first-child th').forEach((header, index) => {
    const filterButton = header.querySelector('.meg-grid-filter-button');
    const labelText = HEADER_LABELS[index] || normalizeHeaderText(header.textContent) || `Coluna ${index + 1}`;
    const label = document.createElement('span');
    label.className = 'meg-grid-header-label';
    label.textContent = labelText;
    header.replaceChildren(label);
    if (filterButton) header.append(filterButton);
  });

  table.querySelectorAll('tbody tr').forEach((row) => {
    row.querySelectorAll('td').forEach((cell, index) => {
      cell.dataset.label = HEADER_LABELS[index] || 'Detalhe';
    });
  });

  table.classList.add('meg-grid-ready');
}

function scheduleStabilization() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    stabilizeTransactionGrid();
  });
}

const observer = new MutationObserver((mutations) => {
  if (!mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) return;
  scheduleStabilization();
});

const start = () => {
  stabilizeTransactionGrid();
  const transactions = document.querySelector('#transactions');
  if (transactions) observer.observe(transactions, { childList: true, subtree: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
