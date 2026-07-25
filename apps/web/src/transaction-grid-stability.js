let scheduled = false;

function normalizeHeaderText(value) {
  return String(value || '')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stabilizeTransactionGrid() {
  const table = document.querySelector('#transactions .transactions-table');
  if (!table) return;

  table.querySelectorAll('thead .column-filter-row').forEach((row) => row.remove());
  table.querySelectorAll('.excel-filter-button,.meg-date-sort-button').forEach((button) => button.remove());

  table.querySelectorAll('thead tr:first-child th').forEach((header) => {
    const label = header.querySelector('.meg-grid-header-label');
    if (label) label.textContent = normalizeHeaderText(label.textContent);
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
