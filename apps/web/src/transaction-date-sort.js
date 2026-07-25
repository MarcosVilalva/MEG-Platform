function installTransactionDateSortFilter() {
  const mainSort = document.querySelector('#transactionSortFilter');
  const dueDateFilter = document.querySelector('[data-column-filter="date"]');
  const filterCell = dueDateFilter?.closest('th');

  if (!mainSort || !filterCell || document.querySelector('#transactionDateSortFilter')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'transaction-date-filter-stack';

  const dateSort = document.createElement('select');
  dateSort.id = 'transactionDateSortFilter';
  dateSort.className = 'transaction-date-sort-filter';
  dateSort.setAttribute('aria-label', 'Ordenar lançamentos pela data de vencimento');
  dateSort.innerHTML = `
    <option value="date_desc">Data decrescente</option>
    <option value="date_asc">Data crescente</option>
  `;

  dateSort.value = mainSort.value === 'date_asc' ? 'date_asc' : 'date_desc';
  dueDateFilter.replaceWith(wrapper);
  wrapper.append(dueDateFilter, dateSort);

  dateSort.addEventListener('change', () => {
    mainSort.value = dateSort.value;
    mainSort.dispatchEvent(new Event('change', { bubbles: true }));
  });

  mainSort.addEventListener('change', () => {
    if (mainSort.value === 'date_asc' || mainSort.value === 'date_desc') {
      dateSort.value = mainSort.value;
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    .transaction-date-filter-stack {
      display: grid;
      gap: 6px;
      min-width: 142px;
    }
    .transaction-date-filter-stack > input,
    .transaction-date-sort-filter {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .transaction-date-sort-filter {
      min-height: 34px;
      padding: 6px 28px 6px 8px;
      border: 1px solid rgba(100, 112, 107, 0.28);
      border-radius: 8px;
      background: #fff;
      color: #26332f;
      font: inherit;
      font-size: 12px;
    }
    @media (max-width: 680px) {
      .transaction-date-filter-stack { min-width: 132px; }
    }
  `;
  document.head.append(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installTransactionDateSortFilter, { once: true });
} else {
  installTransactionDateSortFilter();
}
