let observer: MutationObserver | null = null;
let scheduled = false;

function paintCheckboxSlots() {
  const table = document.querySelector<HTMLTableElement>('.px-v15-launch-table');
  const body = table?.tBodies[0];
  if (!table || !body) return;

  [...body.rows].forEach((row) => {
    if (row.querySelector('[data-phoenix-bulk-cell]')) return;
    const cell = document.createElement('td');
    cell.className = 'px-bulk-select-col px-bulk-fast-cell';
    cell.dataset.phoenixBulkCell = 'true';
    cell.setAttribute('aria-hidden', 'true');
    cell.innerHTML = '<span class="px-bulk-checkbox-skeleton" aria-hidden="true"></span>';
    row.insertBefore(cell, row.firstChild);
  });
}

function schedulePaint() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    paintCheckboxSlots();
  });
}

function start() {
  observer = new MutationObserver(schedulePaint);
  observer.observe(document.body, { childList: true, subtree: true });
  schedulePaint();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixBulkCheckboxFastPaint() {
  observer?.disconnect();
  observer = null;
}
