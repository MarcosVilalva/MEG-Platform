import { transactionIconKind, transactionIconMarkup } from './transaction-visual-core.js';

const selectedIds = new Set();
let installed = false;
let syncing = false;
let scheduled = false;

const byId = (id) => document.querySelector(`#${id}`);
const state = () => window.MEG_APP?.getStateRef?.();
const visibleRows = () => [...document.querySelectorAll('#transactionRows .transaction-row[data-transaction-id]')]
  .filter((row) => !row.hidden && row.style.display !== 'none');

function dispatchSelection() {
  window.dispatchEvent(new CustomEvent('meg:transaction-selection-change', { detail: { ids: [...selectedIds] } }));
}

function setStatus(message, tone = '') {
  const element = byId('transactionBatchStatus');
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
}

function populatePaymentMethods() {
  const select = byId('transactionBatchPayment');
  if (!select || select.options.length > 1) return;
  const methods = state()?.catalogs?.paymentMethods || [];
  methods.filter((item) => item?.description).sort((a, b) => a.description.localeCompare(b.description, 'pt-BR')).forEach((item) => {
    const option = document.createElement('option');
    option.value = item.description;
    option.textContent = item.description;
    select.append(option);
  });
}

function syncControls() {
  const count = selectedIds.size;
  const date = byId('transactionBatchDate');
  const payment = byId('transactionBatchPayment');
  const clear = byId('transactionBatchClear');
  const apply = byId('transactionBatchApply');
  const heading = byId('transactionSelectVisible');
  const rows = visibleRows();
  const selectedVisible = rows.filter((row) => selectedIds.has(row.dataset.transactionId)).length;
  const hasChange = Boolean(date?.value || payment?.value);
  if (byId('transactionBatchCount')) byId('transactionBatchCount').textContent = `${count} selecionado${count === 1 ? '' : 's'}`;
  if (date) date.disabled = syncing || !count;
  if (payment) payment.disabled = syncing || !count;
  if (clear) clear.disabled = syncing || !count;
  if (apply) {
    apply.disabled = syncing || !count || !hasChange;
    const label = apply.querySelector('span');
    if (label) label.textContent = syncing ? 'Sincronizando...' : 'Salvar alterações';
  }
  if (heading) {
    heading.disabled = syncing || !rows.length;
    heading.checked = Boolean(rows.length && selectedVisible === rows.length);
    heading.indeterminate = selectedVisible > 0 && selectedVisible < rows.length;
  }
  document.querySelectorAll('.transaction-select-checkbox').forEach((checkbox) => { checkbox.disabled = syncing; });
  byId('transactionBatchEditor')?.classList.toggle('is-active', count > 0);
  byId('transactionBatchEditor')?.classList.toggle('is-syncing', syncing);
  const currentTone = byId('transactionBatchStatus')?.dataset.tone || '';
  if (!syncing && !count && !['success', 'error'].includes(currentTone)) setStatus('Selecione os lançamentos que deseja alterar.');
  else if (!syncing && !hasChange) setStatus('Escolha somente os campos que deseja alterar.');
}

function transactionForRow(row) {
  const id = row.dataset.transactionId;
  return state()?.transactions?.find((item) => String(item.id) === id) || {};
}

function enhanceRow(row) {
  const edit = row.querySelector('[data-edit]');
  const id = String(edit?.dataset.edit || row.dataset.transactionId || '');
  if (!id) return;
  row.dataset.transactionId = id;
  const dateCell = row.cells[0];
  if (dateCell && !dateCell.querySelector('.transaction-select-checkbox')) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'transaction-select-checkbox';
    checkbox.setAttribute('aria-label', `Selecionar lançamento ${transactionForRow(row).description || id}`);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('change', () => setSelected(id, checkbox.checked));
    dateCell.prepend(checkbox);
  }
  const item = transactionForRow(row);
  const descriptionCell = row.cells[4];
  if (descriptionCell && !descriptionCell.querySelector('.meg-transaction-description')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'meg-transaction-description';
    const icon = document.createElement('span');
    icon.className = `meg-transaction-description-icon kind-${transactionIconKind(item)}`;
    icon.innerHTML = transactionIconMarkup(transactionIconKind(item));
    const copy = document.createElement('span');
    copy.className = 'meg-transaction-description-copy';
    while (descriptionCell.firstChild) copy.append(descriptionCell.firstChild);
    wrapper.append(icon, copy);
    descriptionCell.append(wrapper);
  }
  const checked = selectedIds.has(id);
  const checkbox = row.querySelector('.transaction-select-checkbox');
  if (checkbox) checkbox.checked = checked;
  row.classList.toggle('is-batch-selected', checked);
}

function enhanceRows() {
  document.querySelectorAll('#transactionRows .transaction-row').forEach(enhanceRow);
  syncControls();
}

function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; enhanceRows(); });
}

function setSelected(id, selected) {
  const key = String(id || '');
  if (!key || syncing) return;
  if (selected) selectedIds.add(key); else selectedIds.delete(key);
  document.querySelectorAll('[data-transaction-id]').forEach((element) => {
    if (element.dataset.transactionId === key) element.classList.toggle('is-batch-selected', selected);
  });
  document.querySelectorAll('[data-transaction-select]').forEach((checkbox) => {
    if (checkbox.dataset.transactionSelect === key) checkbox.checked = selected;
  });
  const desktopRow = [...document.querySelectorAll('.transaction-row[data-transaction-id]')].find((row) => row.dataset.transactionId === key);
  const desktop = desktopRow?.querySelector('.transaction-select-checkbox');
  if (desktop) desktop.checked = selected;
  syncControls();
  dispatchSelection();
}

function clearSelection() {
  if (syncing) return;
  selectedIds.clear();
  byId('transactionBatchDate').value = '';
  byId('transactionBatchPayment').value = '';
  setStatus('Selecione os lançamentos que deseja alterar.');
  enhanceRows();
  dispatchSelection();
}

async function applyChanges() {
  if (syncing || !selectedIds.size) return;
  const date = byId('transactionBatchDate')?.value || '';
  const paymentMethod = byId('transactionBatchPayment')?.value || '';
  if (!date && !paymentMethod) return;
  const summary = [date ? `vencimento: ${date.split('-').reverse().join('/')}` : '', paymentMethod ? `pagamento: ${paymentMethod}` : ''].filter(Boolean).join('\n');
  if (!window.confirm(`Alterar ${selectedIds.size} lançamento${selectedIds.size === 1 ? '' : 's'}?\n\n${summary}\n\nOs demais campos serão preservados.`)) return;
  syncing = true;
  setStatus('Alterações enviadas. Aguardando o recibo definitivo da nuvem...', 'pending');
  syncControls();
  try {
    const result = await window.MEG_APP?.applyTransactionBatch?.({ ids: [...selectedIds], date, paymentMethod });
    const changed = Number(result?.changed || 0);
    selectedIds.clear();
    byId('transactionBatchDate').value = '';
    byId('transactionBatchPayment').value = '';
    setStatus(`${changed} lançamento${changed === 1 ? '' : 's'} confirmado${changed === 1 ? '' : 's'} na nuvem.`, 'success');
    dispatchSelection();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'A alteração continua protegida neste aparelho e será reenviada.', 'error');
  } finally {
    syncing = false;
    enhanceRows();
  }
}

export function initializeTransactionBatchEditor() {
  if (installed) return;
  installed = true;
  populatePaymentMethods();
  byId('transactionSelectVisible')?.addEventListener('change', (event) => {
    visibleRows().forEach((row) => setSelected(row.dataset.transactionId, event.target.checked));
  });
  byId('transactionBatchClear')?.addEventListener('click', clearSelection);
  byId('transactionBatchApply')?.addEventListener('click', applyChanges);
  byId('transactionBatchDate')?.addEventListener('change', syncControls);
  byId('transactionBatchPayment')?.addEventListener('change', syncControls);
  const body = byId('transactionRows');
  if (body) new MutationObserver(scheduleEnhance).observe(body, { childList: true });
  window.addEventListener('meg:cloud-action-started', syncControls);
  enhanceRows();
  window.MEG_TRANSACTION_SELECTION = {
    has: (id) => selectedIds.has(String(id)),
    set: setSelected,
    clear: clearSelection,
    ids: () => [...selectedIds],
  };
}
