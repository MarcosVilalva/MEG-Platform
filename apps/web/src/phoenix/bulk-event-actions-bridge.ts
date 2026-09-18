import type { FinancialEvent } from '../app/finance-client';
import { financeClient } from '../app/finance-client';
import { readSession } from '../app/auth-client';
import { loadPhoenixAllEvents } from './data/load-phoenix-read-model';
import {
  PHOENIX_BULK_EVENT_WRITE_ENABLED,
  archivePhoenixEventsBulk,
  newPhoenixBulkOperationId,
  updatePhoenixEventsBulk,
  type PhoenixBulkEventChanges,
} from './data/phoenix-bulk-event-gateway';
import './phoenix-bulk-actions.css';

const selected = new Set<string>();
let observer: MutationObserver | null = null;
let syncing = false;
let scheduled = false;
let eventPoolPromise: Promise<FinancialEvent[]> | null = null;
let pendingOperation: { fingerprint: string; operationId: string } | null = null;

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ');
}

function isoFromBrazilianDate(value: string) {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function centsFromMoney(value: string) {
  const normalized = String(value || '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(Math.abs(number) * 100) : 0;
}

function visualType(event: FinancialEvent) {
  if (event.type === 'income' || event.type === 'redemption') return 'income';
  if (event.type === 'transfer') return 'transfer';
  return 'expense';
}

function signatureFromEvent(event: FinancialEvent) {
  return [
    String(event.date || '').slice(0, 10),
    visualType(event),
    normalize(event.description),
    Math.round(Math.abs(Number(event.amount || 0)) * 100),
    normalize(event.sourceDetails?.expenseClass || event.category?.group || '—'),
    normalize(event.sourceDetails?.group || event.category?.name || '—'),
    normalize(event.sourceDetails?.paymentMethod || event.paymentMethod?.name || '—'),
  ].join('|');
}

function rowCell(row: HTMLTableRowElement, label: string) {
  return row.querySelector<HTMLTableCellElement>(`td[data-label="${label}"]`);
}

function signatureFromRow(row: HTMLTableRowElement) {
  const typeLabel = normalize(rowCell(row, 'Tipo')?.textContent || '');
  const type = typeLabel.includes('receita') ? 'income' : typeLabel.includes('transfer') ? 'transfer' : 'expense';
  const income = rowCell(row, 'Receita')?.textContent || '';
  const expense = rowCell(row, 'Despesa')?.textContent || '';
  return [
    isoFromBrazilianDate((rowCell(row, 'Vencimento')?.textContent || '').trim()),
    type,
    normalize(rowCell(row, 'Descrição')?.textContent || ''),
    centsFromMoney(income.includes('R$') ? income : expense),
    normalize(rowCell(row, 'Classificação')?.textContent || '—'),
    normalize(rowCell(row, 'Grupo')?.textContent || '—'),
    normalize(rowCell(row, 'Forma de pagamento')?.textContent || '—'),
  ].join('|');
}

async function eventPool() {
  if (!eventPoolPromise) eventPoolPromise = loadPhoenixAllEvents().then((page) => page.items);
  return eventPoolPromise;
}

function canArchive() {
  const role = readSession()?.user.role || '';
  return role === 'ADMIN' || role === 'MANAGER';
}

function bulkBar() {
  return document.querySelector<HTMLElement>('[data-phoenix-bulk-bar]');
}

function setBarStatus(text = '') {
  const node = bulkBar()?.querySelector<HTMLElement>('[data-phoenix-bulk-status]');
  if (!node) return;
  node.textContent = text;
  node.hidden = !text;
}

function updateHeaderState() {
  const header = document.querySelector<HTMLInputElement>('[data-phoenix-bulk-select-all]');
  if (!header) return;
  const rowBoxes = [...document.querySelectorAll<HTMLInputElement>('tbody .px-bulk-checkbox:not(:disabled)')];
  const checked = rowBoxes.filter((item) => item.checked).length;
  header.checked = Boolean(rowBoxes.length && checked === rowBoxes.length);
  header.indeterminate = checked > 0 && checked < rowBoxes.length;
  header.disabled = !rowBoxes.length;
}

function updateBar() {
  const root = bulkBar();
  if (!root) return;
  const count = selected.size;
  root.hidden = count === 0;
  const counter = root.querySelector<HTMLElement>('[data-phoenix-bulk-count]');
  if (counter) counter.textContent = `${count} lançamento${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}`;
  const gate = root.querySelector<HTMLElement>('[data-phoenix-bulk-gate]');
  if (gate) gate.textContent = PHOENIX_BULK_EVENT_WRITE_ENABLED ? 'Ações protegidas ativas' : 'Seleção pronta · gravação aguardando homologação';

  root.querySelectorAll<HTMLButtonElement>('[data-requires-bulk-write]').forEach((button) => {
    button.disabled = !PHOENIX_BULK_EVENT_WRITE_ENABLED;
    button.title = PHOENIX_BULK_EVENT_WRITE_ENABLED ? '' : 'Aguardando liberação do backend protegido.';
  });
  const deleteButton = root.querySelector<HTMLButtonElement>('[data-bulk-delete]');
  if (deleteButton && !canArchive()) {
    deleteButton.disabled = true;
    deleteButton.title = 'Exclusão disponível apenas para ADMIN ou MANAGER.';
  }
  updateHeaderState();
}

function clearSelection() {
  selected.clear();
  pendingOperation = null;
  document.querySelectorAll<HTMLInputElement>('.px-bulk-checkbox').forEach((checkbox) => { checkbox.checked = false; });
  document.querySelectorAll<HTMLTableRowElement>('.px-bulk-row-selected').forEach((row) => row.classList.remove('px-bulk-row-selected'));
  updateBar();
}

function ensureBar(table: HTMLTableElement) {
  const card = table.closest<HTMLElement>('.px-table-card');
  const slot = card?.querySelector<HTMLElement>('[data-phoenix-table-context]');
  if (!card || !slot || card.querySelector('[data-phoenix-bulk-bar]')) return;

  const root = document.createElement('div');
  root.className = 'px-bulk-action-bar';
  root.dataset.phoenixBulkBar = 'true';
  root.hidden = true;
  root.innerHTML = `
    <div class="px-bulk-selection-copy">
      <strong data-phoenix-bulk-count>0 lançamentos selecionados</strong>
      <small data-phoenix-bulk-gate>Seleção pronta</small>
    </div>
    <button type="button" data-bulk-edit data-requires-bulk-write>Alterar selecionados</button>
    <button type="button" class="px-bulk-delete" data-bulk-delete data-requires-bulk-write>Excluir selecionados</button>
    <button type="button" data-bulk-clear>Limpar seleção</button>
    <small class="px-bulk-modal-status" data-phoenix-bulk-status hidden></small>
  `;
  slot.appendChild(root);
  root.querySelector<HTMLButtonElement>('[data-bulk-clear]')?.addEventListener('click', clearSelection);
  root.querySelector<HTMLButtonElement>('[data-bulk-edit]')?.addEventListener('click', () => void openBulkEditModal());
  root.querySelector<HTMLButtonElement>('[data-bulk-delete]')?.addEventListener('click', () => void confirmArchive([...selected]));
  updateBar();
}

function ensureHeader(table: HTMLTableElement) {
  const row = table.tHead?.rows[0];
  if (!row || row.querySelector('[data-phoenix-bulk-head]')) return;
  const th = document.createElement('th');
  th.className = 'px-bulk-select-col';
  th.dataset.phoenixBulkHead = 'true';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'px-bulk-checkbox';
  checkbox.dataset.phoenixBulkSelectAll = 'true';
  checkbox.setAttribute('aria-label', 'Selecionar todos os lançamentos visíveis');
  checkbox.addEventListener('change', () => {
    document.querySelectorAll<HTMLInputElement>('tbody .px-bulk-checkbox:not(:disabled)').forEach((item) => {
      item.checked = checkbox.checked;
      const id = item.dataset.eventId || '';
      if (id) checkbox.checked ? selected.add(id) : selected.delete(id);
      item.closest('tr')?.classList.toggle('px-bulk-row-selected', item.checked);
    });
    pendingOperation = null;
    updateBar();
  });
  th.appendChild(checkbox);
  row.insertBefore(th, row.firstChild);
}

function rowCheckbox(row: HTMLTableRowElement, eventId: string | null) {
  let cell = row.querySelector<HTMLTableCellElement>('[data-phoenix-bulk-cell]');
  if (!cell) {
    cell = document.createElement('td');
    cell.className = 'px-bulk-select-col';
    cell.dataset.phoenixBulkCell = 'true';
    row.insertBefore(cell, row.firstChild);
  }

  let checkbox = cell.querySelector<HTMLInputElement>('.px-bulk-checkbox');
  if (!checkbox) {
    const created = document.createElement('input');
    created.type = 'checkbox';
    created.className = 'px-bulk-checkbox';
    created.setAttribute('aria-label', 'Selecionar lançamento');
    created.addEventListener('change', () => {
      const id = created.dataset.eventId || '';
      if (!id) return;
      created.checked ? selected.add(id) : selected.delete(id);
      row.classList.toggle('px-bulk-row-selected', created.checked);
      pendingOperation = null;
      updateBar();
    });
    cell.appendChild(created);
    checkbox = created;
  }

  checkbox.dataset.eventId = eventId || '';
  checkbox.disabled = !eventId;
  checkbox.checked = Boolean(eventId && selected.has(eventId));
  checkbox.title = eventId ? '' : 'Não foi possível vincular esta linha com segurança ao registro da base.';
  row.classList.toggle('px-bulk-row-selected', checkbox.checked);
}

function ensureDeleteButton(row: HTMLTableRowElement, eventId: string | null) {
  const cell = rowCell(row, 'Detalhes');
  const detail = cell?.querySelector<HTMLButtonElement>('.px-detail-btn');
  if (!cell || !detail) return;
  let wrapper = cell.querySelector<HTMLElement>('.px-row-action-wrap');
  if (!wrapper) {
    wrapper = document.createElement('span');
    wrapper.className = 'px-row-action-wrap';
    detail.replaceWith(wrapper);
    wrapper.appendChild(detail);
  }
  let deleteButton = wrapper.querySelector<HTMLButtonElement>('.px-row-delete');
  if (!deleteButton) {
    const created = document.createElement('button');
    created.type = 'button';
    created.className = 'px-row-delete';
    created.textContent = '×';
    created.setAttribute('aria-label', 'Excluir lançamento');
    created.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = created.dataset.eventId || '';
      if (id) void confirmArchive([id]);
    });
    wrapper.appendChild(created);
    deleteButton = created;
  }

  deleteButton.dataset.eventId = eventId || '';
  deleteButton.disabled = !eventId || !PHOENIX_BULK_EVENT_WRITE_ENABLED || !canArchive();
  deleteButton.title = !eventId
    ? 'Registro não identificado.'
    : !canArchive()
      ? 'Exclusão disponível apenas para ADMIN ou MANAGER.'
      : PHOENIX_BULK_EVENT_WRITE_ENABLED
        ? 'Excluir lançamento'
        : 'Botão preparado; aguardando liberação do backend protegido.';
}

function operationIdFor(fingerprint: string, kind: 'update' | 'archive') {
  if (pendingOperation?.fingerprint === fingerprint) return pendingOperation.operationId;
  const operationId = newPhoenixBulkOperationId(kind);
  pendingOperation = { fingerprint, operationId };
  return operationId;
}

function refreshAfterMutation(path: string) {
  eventPoolPromise = null;
  clearSelection();
  window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path, method: 'POST' } }));
  window.setTimeout(() => document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click(), 120);
}

function confirmArchiveDialog(count: number) {
  return new Promise<boolean>((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'px-confirm-modal-backdrop';
    const modal = document.createElement('section');
    modal.className = 'px-confirm-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Excluir lançamento');
    modal.innerHTML = `
      <div class="px-confirm-modal-icon" aria-hidden="true">!</div>
      <div class="px-confirm-modal-copy">
        <span class="px-kicker">Confirmar exclusão</span>
        <h3>Excluir ${count} lançamento${count === 1 ? '' : 's'}?</h3>
        <p>O efeito será retirado dos saldos após a confirmação do servidor. A auditoria do arquivamento será preservada.</p>
      </div>
      <div class="px-confirm-modal-actions">
        <button type="button" data-cancel>Cancelar</button>
        <button type="button" class="is-danger" data-confirm>Excluir ${count === 1 ? 'lançamento' : 'lançamentos'}</button>
      </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    let settled = false;
    const finish = (accepted: boolean) => {
      if (settled) return;
      settled = true;
      backdrop.remove();
      resolve(accepted);
    };
    modal.querySelector<HTMLButtonElement>('[data-cancel]')?.addEventListener('click', () => finish(false));
    modal.querySelector<HTMLButtonElement>('[data-confirm]')?.addEventListener('click', () => finish(true));
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) finish(false); });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      document.removeEventListener('keydown', onKey);
      finish(false);
    };
    document.addEventListener('keydown', onKey);
    modal.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
  });
}

async function confirmArchive(ids: string[]) {
  if (!ids.length) return;
  if (!PHOENIX_BULK_EVENT_WRITE_ENABLED) {
    setBarStatus('A exclusão já está desenhada, mas o gate de gravação continua bloqueado até a homologação do backend.');
    return;
  }
  if (!canArchive()) {
    setBarStatus('Seu perfil não possui permissão para excluir lançamentos.');
    return;
  }
  const count = ids.length;
  if (!(await confirmArchiveDialog(count))) return;
  const ordered = [...ids].sort();
  const operationId = operationIdFor(`archive:${ordered.join(',')}`, 'archive');
  try {
    setBarStatus('Excluindo e aguardando confirmação do servidor…');
    await archivePhoenixEventsBulk({ ids: ordered, operationId });
    pendingOperation = null;
    refreshAfterMutation('/finance/events/bulk/archive');
  } catch (error) {
    setBarStatus(error instanceof Error ? error.message : 'Não foi possível excluir os lançamentos.');
  }
}

async function openBulkEditModal() {
  const ids = [...selected].sort();
  if (!ids.length) return;
  if (!PHOENIX_BULK_EVENT_WRITE_ENABLED) {
    setBarStatus('A alteração em massa já está preparada, mas o gate de gravação continua bloqueado até a homologação do backend.');
    return;
  }

  const [accounts, methods] = await Promise.all([financeClient.listAccounts(), financeClient.listPaymentMethods()]);
  const backdrop = document.createElement('div');
  backdrop.className = 'px-bulk-modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'px-bulk-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Alteração em massa');
  backdrop.appendChild(modal);
  const accountOptions = accounts.filter((item) => item.isActive).map((item) => `<option value="${item.id}">${item.name}</option>`).join('');
  const methodOptions = methods.filter((item) => item.isActive).map((item) => `<option value="${item.id}">${item.name}</option>`).join('');
  modal.innerHTML = `
    <div class="px-bulk-modal-head">
      <div><span class="px-kicker">Alteração em massa</span><h3>${ids.length} lançamento${ids.length === 1 ? '' : 's'} selecionado${ids.length === 1 ? '' : 's'}</h3><p>Marque somente os campos que devem substituir os valores atuais de todos os selecionados.</p></div>
      <button type="button" class="px-bulk-modal-close" aria-label="Fechar">×</button>
    </div>
    <label class="px-bulk-field"><input type="checkbox" data-use-date><strong>Alterar vencimento/data do evento</strong><input type="date" data-value-date disabled></label>
    <label class="px-bulk-field"><input type="checkbox" data-use-account><strong>Alterar conta financeira</strong><select data-value-account disabled><option value="">Selecione</option>${accountOptions}</select></label>
    <label class="px-bulk-field"><input type="checkbox" data-use-payment><strong>Alterar forma de pagamento/recebimento</strong><select data-value-payment disabled><option value="">Selecione</option>${methodOptions}</select></label>
    <div class="px-bulk-modal-status" data-modal-status>Marque os campos que deseja alterar.</div>
    <div class="px-bulk-modal-actions"><button type="button" data-cancel>Cancelar</button><button type="button" data-confirm>Aplicar alterações</button></div>
  `;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  modal.querySelector<HTMLButtonElement>('.px-bulk-modal-close')?.addEventListener('click', close);
  modal.querySelector<HTMLButtonElement>('[data-cancel]')?.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });

  const connectToggle = (checkSelector: string, valueSelector: string) => {
    const check = modal.querySelector<HTMLInputElement>(checkSelector);
    const value = modal.querySelector<HTMLInputElement | HTMLSelectElement>(valueSelector);
    if (!check || !value) return;
    check.addEventListener('change', () => { value.disabled = !check.checked; });
  };
  connectToggle('[data-use-date]', '[data-value-date]');
  connectToggle('[data-use-account]', '[data-value-account]');
  connectToggle('[data-use-payment]', '[data-value-payment]');

  const confirmButton = modal.querySelector<HTMLButtonElement>('[data-confirm]');
  confirmButton?.addEventListener('click', async () => {
    const useDate = Boolean(modal.querySelector<HTMLInputElement>('[data-use-date]')?.checked);
    const useAccount = Boolean(modal.querySelector<HTMLInputElement>('[data-use-account]')?.checked);
    const usePayment = Boolean(modal.querySelector<HTMLInputElement>('[data-use-payment]')?.checked);
    const date = modal.querySelector<HTMLInputElement>('[data-value-date]')?.value || '';
    const accountId = modal.querySelector<HTMLSelectElement>('[data-value-account]')?.value || '';
    const paymentMethodId = modal.querySelector<HTMLSelectElement>('[data-value-payment]')?.value || '';
    const changes: PhoenixBulkEventChanges = {};
    if (useDate && date) changes.date = date;
    if (useAccount && accountId) changes.accountId = accountId;
    if (usePayment && paymentMethodId) changes.paymentMethodId = paymentMethodId;

    const status = modal.querySelector<HTMLElement>('[data-modal-status]');
    if (!Object.keys(changes).length) {
      if (status) status.textContent = 'Marque ao menos um campo e informe o novo valor.';
      return;
    }

    const operationId = operationIdFor(`update:${ids.join(',')}:${JSON.stringify(changes)}`, 'update');
    try {
      if (confirmButton) confirmButton.disabled = true;
      if (status) status.textContent = 'Aplicando alterações e aguardando confirmação do servidor…';
      await updatePhoenixEventsBulk({ ids, changes, operationId });
      pendingOperation = null;
      close();
      refreshAfterMutation('/finance/events/bulk/update');
    } catch (error) {
      if (confirmButton) confirmButton.disabled = false;
      if (status) status.textContent = error instanceof Error ? error.message : 'Não foi possível aplicar a alteração em massa.';
    }
  });
}

async function syncTable() {
  if (syncing) return;
  const table = document.querySelector<HTMLTableElement>('.px-v15-launch-table');
  if (!table || !table.tBodies[0]) return;
  syncing = true;
  try {
    ensureHeader(table);
    ensureBar(table);
    const events = await eventPool();
    const buckets = new Map<string, FinancialEvent[]>();
    events.forEach((event) => {
      const key = signatureFromEvent(event);
      const list = buckets.get(key) || [];
      list.push(event);
      buckets.set(key, list);
    });

    [...table.tBodies[0].rows].forEach((row) => {
      const match = buckets.get(signatureFromRow(row))?.shift() || null;
      rowCheckbox(row, match?.id || null);
      ensureDeleteButton(row, match?.id || null);
    });
    updateBar();
  } catch {
    // Falha de enriquecimento nunca desmonta a tabela original.
  } finally {
    syncing = false;
  }
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    void syncTable();
  }, 0);
}

function onDataInvalidated() {
  eventPoolPromise = null;
  window.setTimeout(scheduleSync, 250);
}

function start() {
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('meg:data-invalidated', onDataInvalidated);
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixBulkEventActionsBridge() {
  observer?.disconnect();
  observer = null;
  window.removeEventListener('meg:data-invalidated', onDataInvalidated);
}
