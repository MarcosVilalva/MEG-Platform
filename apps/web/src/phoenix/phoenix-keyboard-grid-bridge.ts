import './phoenix-keyboard-grid.css';

type GridState = {
  grid: HTMLElement;
  row: HTMLElement;
  cell: HTMLElement | null;
};

const GRID_SELECTOR = 'table, [role="grid"], [role="table"]';
const ACTIVE_ROW_CLASS = 'px-kb-row-active';
const ACTIVE_CELL_CLASS = 'px-kb-cell-active';
let activeGrid: HTMLElement | null = null;

function visible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (!element.isConnected || element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function rowsFor(grid: HTMLElement) {
  const rows = grid.matches('table')
    ? [...grid.querySelectorAll<HTMLElement>('tbody tr')]
    : [...grid.querySelectorAll<HTMLElement>('[role="row"]')].filter((row) =>
        row.querySelector('[role="gridcell"], [role="cell"]'));
  return rows.filter(visible);
}

function cellsFor(row: HTMLElement) {
  const cells = row.matches('tr')
    ? [...row.querySelectorAll<HTMLElement>(':scope > td')]
    : [...row.querySelectorAll<HTMLElement>(':scope > [role="gridcell"], :scope > [role="cell"]')];
  return cells.filter(visible);
}

function gridScore(grid: HTMLElement) {
  const rows = rowsFor(grid);
  if (!rows.length) return -1;
  const rect = grid.getBoundingClientRect();
  const inMain = Boolean(grid.closest('.px-content, .px-main'));
  return rows.length * 10_000 + Math.min(rect.width * rect.height, 1_000_000) + (inMain ? 5_000_000 : 0);
}

function bestVisibleGrid() {
  if (activeGrid && visible(activeGrid) && rowsFor(activeGrid).length) return activeGrid;
  const candidates = [...document.querySelectorAll<HTMLElement>(GRID_SELECTOR)].filter(visible);
  let best: HTMLElement | null = null;
  let bestScore = -1;
  for (const candidate of candidates) {
    const score = gridScore(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  activeGrid = best;
  return best;
}

function clearKeyboardSelection() {
  document.querySelectorAll(`.${ACTIVE_ROW_CLASS}`).forEach((item) => item.classList.remove(ACTIVE_ROW_CLASS));
  document.querySelectorAll(`.${ACTIVE_CELL_CLASS}`).forEach((item) => item.classList.remove(ACTIVE_CELL_CLASS));
  document.querySelectorAll('[data-px-keyboard-grid="active"]').forEach((item) => item.removeAttribute('data-px-keyboard-grid'));
}

function currentState(grid: HTMLElement): GridState | null {
  const row = grid.querySelector<HTMLElement>(`.${ACTIVE_ROW_CLASS}`);
  if (!row || !visible(row)) return null;
  const cell = row.querySelector<HTMLElement>(`.${ACTIVE_CELL_CLASS}`);
  return { grid, row, cell: cell && visible(cell) ? cell : null };
}

function activate(grid: HTMLElement, rowIndex: number, cellIndex = 0) {
  const rows = rowsFor(grid);
  if (!rows.length) return null;
  const safeRow = Math.max(0, Math.min(rows.length - 1, rowIndex));
  const row = rows[safeRow];
  const cells = cellsFor(row);
  const safeCell = cells.length ? Math.max(0, Math.min(cells.length - 1, cellIndex)) : -1;

  clearKeyboardSelection();
  activeGrid = grid;
  grid.setAttribute('data-px-keyboard-grid', 'active');
  row.classList.add(ACTIVE_ROW_CLASS);
  const cell = safeCell >= 0 ? cells[safeCell] : null;
  cell?.classList.add(ACTIVE_CELL_CLASS);
  (cell || row).scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  return { grid, row, cell } satisfies GridState;
}

function indexOfCurrentRow(grid: HTMLElement, state: GridState | null) {
  if (!state) return -1;
  return rowsFor(grid).indexOf(state.row);
}

function indexOfCurrentCell(state: GridState | null) {
  if (!state?.cell) return 0;
  return Math.max(0, cellsFor(state.row).indexOf(state.cell));
}

function editableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, option, [contenteditable="true"], [role="textbox"], [role="combobox"], .px-grid-filter-popover, .px-period-popover'));
}

function blockingOverlayOpen() {
  const selectors = [
    'dialog[open]',
    '[role="dialog"]',
    '.px-modal',
    '.px-launch-drawer',
    '.px-detail-drawer',
    '.px-home-drawer',
    '.px-card-editor',
    '.react-datepicker',
    '[data-radix-popper-content-wrapper]'
  ];
  return selectors.some((selector) => [...document.querySelectorAll(selector)].some(visible));
}

function openSelectedRow(row: HTMLElement) {
  const explicitAction = row.querySelector<HTMLButtonElement | HTMLAnchorElement>([
    '[data-px-row-open]',
    'button[aria-label*="editar" i]',
    'button[title*="editar" i]',
    'button[aria-label*="abrir" i]',
    'button[title*="abrir" i]',
    'button[aria-label*="detalh" i]',
    'button[title*="detalh" i]'
  ].join(','));
  if (explicitAction && !('disabled' in explicitAction && explicitAction.disabled)) {
    explicitAction.click();
    return;
  }
  row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
}

function toggleSelectedRow(row: HTMLElement) {
  const checkbox = row.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:disabled)');
  if (!checkbox) return false;
  checkbox.click();
  return true;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) return;
  if (editableTarget(event.target) || editableTarget(document.activeElement) || blockingOverlayOpen()) return;

  const grid = bestVisibleGrid();
  if (!grid) return;

  const rows = rowsFor(grid);
  if (!rows.length) return;
  const state = currentState(grid);
  const rowIndex = indexOfCurrentRow(grid, state);
  const cellIndex = indexOfCurrentCell(state);

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activate(grid, rowIndex < 0 ? 0 : Math.min(rows.length - 1, rowIndex + 1), cellIndex);
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    activate(grid, rowIndex < 0 ? rows.length - 1 : Math.max(0, rowIndex - 1), cellIndex);
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    const targetRow = rowIndex < 0 ? 0 : rowIndex;
    const cells = cellsFor(rows[targetRow]);
    activate(grid, targetRow, Math.min(Math.max(0, cells.length - 1), state ? cellIndex + 1 : 0));
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    const targetRow = rowIndex < 0 ? 0 : rowIndex;
    const cells = cellsFor(rows[targetRow]);
    activate(grid, targetRow, state ? Math.max(0, cellIndex - 1) : Math.max(0, cells.length - 1));
    return;
  }

  const selected = state || activate(grid, 0, 0);
  if (!selected) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    openSelectedRow(selected.row);
    return;
  }
  if (event.key === ' ' && toggleSelectedRow(selected.row)) event.preventDefault();
}

function onPointerDown(event: PointerEvent) {
  const target = event.target instanceof Element ? event.target : null;
  const grid = target?.closest<HTMLElement>(GRID_SELECTOR) || null;
  if (grid && visible(grid)) activeGrid = grid;
}

function onRouteMutation() {
  if (activeGrid && (!activeGrid.isConnected || !visible(activeGrid))) {
    activeGrid = null;
    clearKeyboardSelection();
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  const observer = new MutationObserver(onRouteMutation);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
