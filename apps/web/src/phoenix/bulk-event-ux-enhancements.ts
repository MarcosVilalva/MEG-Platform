import { authenticatedRequest } from '../app/auth-client';
import { PHOENIX_BULK_EVENT_WRITE_ENABLED } from './data/phoenix-bulk-event-gateway';
import './phoenix-bulk-ux-enhancements.css';

type AuditItem = {
  id: string;
  at: string;
  before?: unknown;
  after?: unknown;
};

type AuditPage = {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
};

let observer: MutationObserver | null = null;
let scheduled = false;
let activeUtilityPopover: HTMLElement | null = null;

const COLUMN_STORAGE_KEY = 'meg:phoenix:movements:columns:v1';
const MOVEMENT_COLUMNS = [
  ['dueDate', 'Vencimento'],
  ['purchaseDate', 'Data da compra'],
  ['weekday', 'Dia'],
  ['type', 'Tipo'],
  ['description', 'Descrição'],
  ['income', 'Receita'],
  ['classification', 'Classificação'],
  ['group', 'Grupo'],
  ['expense', 'Despesa'],
  ['paymentMethod', 'Forma de pagamento'],
  ['status', 'Situação'],
  ['modality', 'Modalidade'],
  ['details', 'Detalhes'],
] as const;

function actionIcon(name: 'select' | 'preview' | 'edit' | 'delete' | 'trash' | 'clear' | 'help' | 'columns' | 'eye' | 'eyeOff') {
  const paths = {
    select: '<path d="M5 12l4 4L19 6"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
    preview: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>',
    edit: '<path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m14.5 7.5 2 2"/>',
    delete: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    trash: '<path d="M4 7h16M8 7V4h8v3M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
    clear: '<path d="m6 6 12 12M18 6 6 18"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 4.2 1.8c-.9.7-2 1.1-2 2.7M12 17h.01"/>',
    columns: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14M15 5v14"/>',
    eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>',
    eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.4 3.1M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.7-.3 3.8-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'
  } as const;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function readHiddenColumns() {
  try {
    const raw = window.localStorage.getItem(COLUMN_STORAGE_KEY);
    const values = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(values) ? values.filter((value) => typeof value === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeHiddenColumns(hidden: Set<string>) {
  try {
    window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify([...hidden]));
  } catch {
    // Preferência visual é opcional; a grade continua funcional sem storage.
  }
}

function applyColumnVisibility(table = launchTable()) {
  if (!table) return;
  const hidden = readHiddenColumns();
  table.querySelectorAll<HTMLElement>('[data-col]').forEach((cell) => {
    cell.classList.toggle('px-column-hidden', hidden.has(cell.dataset.col || ''));
  });
  const button = document.querySelector<HTMLButtonElement>('[data-column-visibility]');
  if (button) {
    const count = hidden.size;
    button.title = count ? `Colunas · ${count} oculta${count === 1 ? '' : 's'}` : 'Colunas';
    button.setAttribute('aria-label', button.title);
    button.classList.toggle('active', count > 0);
  }
}

function closeUtilityPopover() {
  activeUtilityPopover?.remove();
  activeUtilityPopover = null;
}

function positionUtilityPopover(popover: HTMLElement, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(330, window.innerWidth - 20);
  const left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.right - width));
  popover.style.width = `${width}px`;
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.min(window.innerHeight - 80, rect.bottom + 8)}px`;
}

function openHelpPopover(anchor: HTMLElement) {
  closeUtilityPopover();
  const popover = document.createElement('section');
  popover.className = 'px-grid-utility-popover px-grid-help-popover';
  popover.innerHTML = `
    <header><div><strong>Ajuda rápida</strong><span>Lançamentos</span></div><button type="button" data-close aria-label="Fechar">×</button></header>
    <div class="px-grid-help-list">
      <span>Receitas entram como recebidas.</span>
      <span>Benefício Alimentação fica separado do saldo monetário.</span>
      <span>Estornos preservam o efeito reverso.</span>
      <span>Duplo clique em uma linha abre a edição.</span>
    </div>
  `;
  document.body.appendChild(popover);
  activeUtilityPopover = popover;
  positionUtilityPopover(popover, anchor);
  popover.querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click', closeUtilityPopover);
}

function renderColumnRows(popover: HTMLElement, query = '') {
  const list = popover.querySelector<HTMLElement>('[data-column-list]');
  if (!list) return;
  const hidden = readHiddenColumns();
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  const columns = MOVEMENT_COLUMNS.filter(([, label]) => !normalized || label.toLocaleLowerCase('pt-BR').includes(normalized));
  list.innerHTML = columns.length ? columns.map(([key, label]) => {
    const visible = !hidden.has(key);
    return `
      <button type="button" class="px-column-eye-row ${visible ? 'is-visible' : 'is-hidden'}" data-column-key="${key}" aria-pressed="${visible}" title="${visible ? 'Ocultar' : 'Mostrar'} ${label}">
        <span>${label}</span>
        <i aria-hidden="true">${actionIcon(visible ? 'eye' : 'eyeOff')}</i>
      </button>
    `;
  }).join('') : '<div class="px-column-empty">Nenhuma coluna encontrada.</div>';
  list.querySelectorAll<HTMLButtonElement>('[data-column-key]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.columnKey;
      if (!key) return;
      const current = readHiddenColumns();
      if (current.has(key)) current.delete(key);
      else current.add(key);
      writeHiddenColumns(current);
      applyColumnVisibility();
      renderColumnRows(popover, popover.querySelector<HTMLInputElement>('[data-column-search]')?.value || '');
    });
  });
}

function openColumnPopover(_anchor: HTMLElement) {
  closeUtilityPopover();
  const backdrop = document.createElement('div');
  backdrop.className = 'px-grid-utility-backdrop';
  const popover = document.createElement('section');
  popover.className = 'px-grid-utility-popover px-column-selector-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'true');
  popover.setAttribute('aria-label', 'Colunas da tabela');
  popover.innerHTML = `
    <header><div><strong>Colunas da tabela</strong><span>Clique no olho para mostrar ou ocultar.</span></div><button type="button" data-close aria-label="Fechar">×</button></header>
    <label class="px-column-search"><span aria-hidden="true">⌕</span><input type="search" data-column-search placeholder="Pesquisar coluna"></label>
    <div class="px-column-eye-list" data-column-list></div>
    <footer><button type="button" data-restore>Restaurar padrão</button></footer>
  `;
  backdrop.appendChild(popover);
  document.body.appendChild(backdrop);
  activeUtilityPopover = backdrop;
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeUtilityPopover();
  });
  const search = popover.querySelector<HTMLInputElement>('[data-column-search]');
  search?.addEventListener('input', () => renderColumnRows(popover, search.value));
  popover.querySelector<HTMLButtonElement>('[data-restore]')?.addEventListener('click', () => {
    writeHiddenColumns(new Set());
    applyColumnVisibility();
    renderColumnRows(popover, search?.value || '');
  });
  popover.querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click', closeUtilityPopover);
  renderColumnRows(popover);
  window.requestAnimationFrame(() => search?.focus());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, fallback = '—') {
  const result = String(value ?? '').trim();
  return result || fallback;
}

function formatDate(value: unknown) {
  const raw = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '—';
  const [year, month, day] = raw.split('-');
  return `${day}/${month}/${year}`;
}

function formatMoney(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(amount));
}

function launchTable() {
  return document.querySelector<HTMLTableElement>('.px-v15-launch-table');
}

function filteredBoxes() {
  return [...document.querySelectorAll<HTMLInputElement>('.px-v15-launch-table tbody .px-bulk-checkbox:not(:disabled)')];
}

function selectedBoxes() {
  return filteredBoxes().filter((item) => item.checked);
}

function selectFiltered() {
  filteredBoxes().forEach((checkbox) => {
    if (!checkbox.checked) checkbox.click();
  });
  scheduleSync();
}

function clearFilteredSelection() {
  filteredBoxes().forEach((checkbox) => {
    if (checkbox.checked) checkbox.click();
  });
  scheduleSync();
}

function closeModal(backdrop: HTMLElement) {
  backdrop.remove();
}

function modalShell(title: string, subtitle: string) {
  const backdrop = document.createElement('div');
  backdrop.className = 'px-bulk-ux-backdrop';
  const modal = document.createElement('section');
  modal.className = 'px-bulk-ux-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', title);
  modal.innerHTML = `
    <header class="px-bulk-ux-modal-head">
      <div><span class="px-kicker">Lançamentos</span><h3>${title}</h3><p>${subtitle}</p></div>
      <button type="button" data-close aria-label="Fechar">×</button>
    </header>
    <div data-body></div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  modal.querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click', () => closeModal(backdrop));
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeModal(backdrop);
  });
  return { backdrop, modal, body: modal.querySelector<HTMLElement>('[data-body]')! };
}

function triggerProtectedAction(kind: 'edit' | 'delete') {
  if (!PHOENIX_BULK_EVENT_WRITE_ENABLED) return;
  const selector = kind === 'edit' ? '[data-bulk-edit]' : '[data-bulk-delete]';
  document.querySelector<HTMLButtonElement>(`.px-bulk-action-bar ${selector}:not(:disabled)`)?.click();
}

async function openTrash() {
  const { body } = modalShell(
    'Lixeira de lançamentos',
    'Itens excluídos permanecem auditáveis. A restauração só será liberada com um writer próprio e protegido.',
  );
  body.innerHTML = '<div class="px-bulk-ux-loading">Buscando arquivamentos registrados…</div>';

  try {
    const page = await authenticatedRequest<AuditPage>('/finance/audit?page=1&pageSize=50&action=FINANCIAL_EVENT_ARCHIVED&entity=FinancialEvent');
    if (!page.items.length) {
      body.innerHTML = `
        <div class="px-bulk-ux-empty">
          <strong>Nenhum arquivamento auditado encontrado.</strong>
          <span>Os próximos lançamentos excluídos pelo fluxo protegido aparecerão aqui.</span>
        </div>
        <small class="px-bulk-ux-esc-hint">Esc fecha esta janela.</small>
      `;
      return;
    }

    body.innerHTML = `
      <div class="px-bulk-ux-trash-list">
        ${page.items.map((item) => {
          const before = asRecord(item.before) || {};
          const after = asRecord(item.after) || {};
          const description = text(before.description ?? after.description, 'Lançamento');
          const date = formatDate(before.date ?? after.date);
          const amount = formatMoney(before.amount ?? after.amount);
          const archivedAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.at));
          return `
            <article>
              <div><strong>${description}</strong><span>${date} · ${amount}</span><small>Arquivado em ${archivedAt}</small></div>
              <button type="button" disabled title="Restauração ainda não possui writer protegido.">Restaurar</button>
            </article>
          `;
        }).join('')}
      </div>
      <div class="px-bulk-ux-note">Exibição limitada aos 50 arquivamentos auditados mais recentes. Restaurar continuará bloqueado até existir contrato transacional específico.</div>
      <small class="px-bulk-ux-esc-hint">Esc fecha esta janela.</small>
    `;
  } catch {
    body.innerHTML = '<div class="px-bulk-ux-error">Não foi possível consultar a lixeira agora.</div>';
  }
}

function ensureCommandStrip() {
  const table = launchTable();
  const card = table?.closest<HTMLElement>('.px-table-card');
  const slot = card?.querySelector<HTMLElement>('[data-phoenix-table-context]');
  if (!table || !card || !slot) return;

  let strip = card.querySelector<HTMLElement>('[data-bulk-ux-strip]');
  if (!strip) {
    strip = document.createElement('div');
    strip.className = 'px-bulk-ux-strip';
    strip.dataset.bulkUxStrip = 'true';
    strip.innerHTML = `
      <div class="px-bulk-ux-copy">
        <strong data-bulk-ux-selected>0 selecionados</strong>
        <small data-bulk-ux-count>0 resultados nesta página</small>
      </div>
      <div class="px-bulk-ux-buttons" role="group" aria-label="Ações da seleção">
        <button type="button" class="px-bulk-icon-button" data-select-filtered title="Selecionar página" aria-label="Selecionar página">${actionIcon('select')}</button>
        <button type="button" class="px-bulk-icon-button px-bulk-ux-primary" data-do-edit title="Alterar selecionados" aria-label="Alterar selecionados" ${PHOENIX_BULK_EVENT_WRITE_ENABLED ? '' : 'disabled'}>${actionIcon('edit')}</button>
        <button type="button" class="px-bulk-icon-button px-bulk-ux-danger" data-do-delete title="Excluir selecionados" aria-label="Excluir selecionados" ${PHOENIX_BULK_EVENT_WRITE_ENABLED ? '' : 'disabled'}>${actionIcon('delete')}</button>
        <button type="button" class="px-bulk-icon-button" data-trash title="Lixeira" aria-label="Lixeira">${actionIcon('trash')}</button>
        <button type="button" class="px-bulk-icon-button" data-clear-filtered title="Limpar seleção" aria-label="Limpar seleção">${actionIcon('clear')}</button>
      </div>
    `;
    slot.appendChild(strip);
    strip.querySelector<HTMLButtonElement>('[data-select-filtered]')?.addEventListener('click', selectFiltered);
    strip.querySelector<HTMLButtonElement>('[data-clear-filtered]')?.addEventListener('click', clearFilteredSelection);
    strip.querySelector<HTMLButtonElement>('[data-trash]')?.addEventListener('click', () => void openTrash());
    strip.querySelector<HTMLButtonElement>('[data-do-edit]')?.addEventListener('click', () => triggerProtectedAction('edit'));
    strip.querySelector<HTMLButtonElement>('[data-do-delete]')?.addEventListener('click', () => triggerProtectedAction('delete'));
  }

  const exportToolbar = card.querySelector<HTMLElement>('.px-table-export');
  const copyAnchor = strip.querySelector<HTMLElement>('.px-bulk-ux-copy');
  if (exportToolbar && copyAnchor && exportToolbar.parentElement !== strip) {
    copyAnchor.insertAdjacentElement('afterend', exportToolbar);
  }

  let utilities = strip.querySelector<HTMLElement>('[data-grid-utilities]');
  if (!utilities) {
    utilities = document.createElement('div');
    utilities.className = 'px-grid-utilities';
    utilities.dataset.gridUtilities = 'true';
    utilities.innerHTML = `
      <button type="button" class="px-bulk-icon-button" data-grid-help title="Ajuda" aria-label="Ajuda">${actionIcon('help')}</button>
      <button type="button" class="px-bulk-icon-button" data-column-visibility title="Colunas" aria-label="Colunas">${actionIcon('columns')}</button>
    `;
    strip.querySelector<HTMLElement>('.px-bulk-ux-buttons')?.insertAdjacentElement('beforebegin', utilities);
    utilities.querySelector<HTMLButtonElement>('[data-grid-help]')?.addEventListener('click', (event) => openHelpPopover(event.currentTarget as HTMLButtonElement));
    utilities.querySelector<HTMLButtonElement>('[data-column-visibility]')?.addEventListener('click', (event) => openColumnPopover(event.currentTarget as HTMLButtonElement));
  }
  if (exportToolbar && utilities.previousElementSibling !== exportToolbar) {
    exportToolbar.insertAdjacentElement('afterend', utilities);
  }
  applyColumnVisibility(table);

  const total = filteredBoxes().length;
  const selected = selectedBoxes().length;
  const selectedCopy = strip.querySelector<HTMLElement>('[data-bulk-ux-selected]');
  if (selectedCopy) selectedCopy.textContent = `${selected} selecionado${selected === 1 ? '' : 's'}`;
  const count = strip.querySelector<HTMLElement>('[data-bulk-ux-count]');
  if (count) count.textContent = `${total} resultado${total === 1 ? '' : 's'} nesta página`;

  const selectButton = strip.querySelector<HTMLButtonElement>('[data-select-filtered]');
  if (selectButton) {
    selectButton.disabled = total === 0 || (selected === total && total > 0);
    selectButton.title = total ? `Selecionar página (${total})` : 'Selecionar página';
    selectButton.setAttribute('aria-label', selectButton.title);
  }
  const clearButton = strip.querySelector<HTMLButtonElement>('[data-clear-filtered]');
  if (clearButton) clearButton.disabled = selected === 0;
  const editButton = strip.querySelector<HTMLButtonElement>('[data-do-edit]');
  if (editButton) editButton.disabled = selected === 0 || !PHOENIX_BULK_EVENT_WRITE_ENABLED;
  const deleteButton = strip.querySelector<HTMLButtonElement>('[data-do-delete]');
  if (deleteButton) deleteButton.disabled = selected === 0 || !PHOENIX_BULK_EVENT_WRITE_ENABLED;
}

function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (activeUtilityPopover) {
    event.preventDefault();
    closeUtilityPopover();
    return;
  }
  const uxBackdrops = [...document.querySelectorAll<HTMLElement>('.px-bulk-ux-backdrop')];
  const topUx = uxBackdrops.at(-1);
  if (topUx) {
    event.preventDefault();
    closeModal(topUx);
    return;
  }
  const legacyBackdrop = document.querySelector<HTMLElement>('.px-bulk-modal-backdrop');
  if (legacyBackdrop) {
    event.preventDefault();
    legacyBackdrop.querySelector<HTMLButtonElement>('.px-bulk-modal-close')?.click();
  }
}

function sync() {
  ensureCommandStrip();
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    sync();
  }, 24);
}

function start() {
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked', 'disabled'] });
  document.addEventListener('change', scheduleSync, true);
  document.addEventListener('pointerdown', (event) => {
    if (!activeUtilityPopover) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (activeUtilityPopover.contains(target)) return;
    if ((target instanceof Element) && target.closest('[data-grid-help], [data-column-visibility]')) return;
    closeUtilityPopover();
  }, true);
  window.addEventListener('meg:data-invalidated', scheduleSync as EventListener);
  window.addEventListener('resize', closeUtilityPopover);
  window.addEventListener('keydown', onEscape);
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixBulkEventUxEnhancements() {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('change', scheduleSync, true);
  window.removeEventListener('meg:data-invalidated', scheduleSync as EventListener);
  window.removeEventListener('resize', closeUtilityPopover);
  window.removeEventListener('keydown', onEscape);
  closeUtilityPopover();
}
