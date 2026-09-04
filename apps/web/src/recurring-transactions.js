import {
  addMonthsClamped,
  buildMonthlyTransactionBatch,
  buildMonthlySchedule,
  isInstallmentModality,
  normalizeRecurrenceCount,
  parseIsoDate,
  weekdayShortPt,
} from './recurring-transactions-core.js';

let initialized = false;
let dialogObserver = null;

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

function formatDate(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) return 'data não informada';
  return dateFormatter.format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)));
}

function dispatchValueEvent(control, type = 'change') {
  control?.dispatchEvent(new Event(type, { bubbles: true }));
}

function setConfirmation(title, message, tone = 'success') {
  const toast = document.querySelector('#appToast');
  if (toast) {
    toast.className = `app-toast visible ${tone}`;
    toast.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = message;
    toast.append(strong, span);
    window.setTimeout(() => toast.classList.remove('visible'), 5200);
  }

  const popup = document.querySelector('#actionConfirmationPopup');
  if (popup) {
    const popupTitle = popup.querySelector('[data-action-popup-title]');
    const popupMessage = popup.querySelector('[data-action-popup-message]');
    if (popupTitle) popupTitle.textContent = title;
    if (popupMessage) popupMessage.textContent = message;
  }
}

function controls() {
  return {
    dialog: document.querySelector('#transactionDialog'),
    form: document.querySelector('#transactionForm'),
    formGrid: document.querySelector('#transactionForm .form-grid'),
    actions: document.querySelector('#transactionForm .modal-actions'),
    title: document.querySelector('#dialogTitle'),
    transactionId: document.querySelector('#transactionId'),
    transactionType: document.querySelector('#transactionType'),
    modality: document.querySelector('#modalityInput'),
    paymentMethod: document.querySelector('#paymentMethodInput'),
    date: document.querySelector('#dateInput'),
    weekday: document.querySelector('#weekdayInput'),
    purchaseDate: document.querySelector('#purchaseDateInput'),
    description: document.querySelector('#descriptionInput'),
    expenseAmount: document.querySelector('#expenseAmountInput'),
    status: document.querySelector('#statusInput'),
    deleteButton: document.querySelector('#deleteTransactionBtn'),
    duplicateButton: document.querySelector('#duplicateTransactionBtn'),
    recurringPanel: document.querySelector('#recurringTransactionPanel'),
    recurringEnabled: document.querySelector('#recurringEnabledInput'),
    recurringFields: document.querySelector('#recurringTransactionFields'),
    recurringCount: document.querySelector('#recurringCountInput'),
    recurringPreview: document.querySelector('#recurringPreview'),
    duplicateNotice: document.querySelector('#duplicateTransactionNotice'),
  };
}

function eligibleForMonthlyTools(current) {
  return current.transactionType?.value === 'expense'
    && !isInstallmentModality(current.modality?.value);
}

function updatePreview(current = controls()) {
  if (!current.recurringPreview || !current.recurringCount || !current.date) return;
  const count = normalizeRecurrenceCount(current.recurringCount.value);
  current.recurringCount.value = String(count);
  const schedule = buildMonthlySchedule(current.date.value, count);
  const amount = Number(current.expenseAmount?.value || 0);
  if (!schedule.length) {
    current.recurringPreview.textContent = 'Informe a primeira data de vencimento.';
    return;
  }
  const amountText = amount > 0 ? ` de ${money.format(amount)} cada` : '';
  current.recurringPreview.textContent = `${count} lançamentos pendentes${amountText}, de ${formatDate(schedule[0])} até ${formatDate(schedule.at(-1))}. A quantidade inclui o lançamento atual.`;
}

function syncUi({ reset = false } = {}) {
  const current = controls();
  if (!current.dialog || !current.recurringPanel || !current.duplicateButton) return;
  const editing = Boolean(current.transactionId?.value);
  const eligible = eligibleForMonthlyTools(current);

  if (reset) {
    current.recurringEnabled.checked = false;
    current.recurringCount.value = '12';
    current.recurringFields.hidden = true;
    current.duplicateNotice.hidden = true;
    current.dialog.dataset.duplicateMode = '';
  }

  const showRecurring = current.dialog.open && !editing && eligible;
  const showDuplicate = current.dialog.open && editing && eligible;
  current.recurringPanel.hidden = !showRecurring;
  current.duplicateButton.hidden = !showDuplicate;
  current.recurringFields.hidden = !current.recurringEnabled.checked;
  updatePreview(current);
}

function injectUi() {
  const current = controls();
  if (!current.formGrid || !current.actions) return false;

  if (!current.recurringPanel) {
    const panel = document.createElement('section');
    panel.id = 'recurringTransactionPanel';
    panel.className = 'meg-recurring-panel full';
    panel.hidden = true;
    panel.innerHTML = `
      <label class="meg-recurring-toggle">
        <input id="recurringEnabledInput" type="checkbox" />
        <span><strong>REPETIR MENSALMENTE</strong><small>Use para mensalidades e contas de valor fixo.</small></span>
      </label>
      <div class="meg-recurring-fields" id="recurringTransactionFields" hidden>
        <label>QUANTIDADE DE MESES
          <input id="recurringCountInput" type="number" min="2" max="24" step="1" value="12" />
        </label>
        <small id="recurringPreview"></small>
        <p>Para água, luz e outras contas com valor variável, use “Duplicar para o próximo mês” e ajuste o valor antes de salvar.</p>
      </div>
      <div class="meg-duplicate-notice" id="duplicateTransactionNotice" hidden>
        Cópia preparada para o próximo mês. Confira a data e informe o novo valor antes de salvar.
      </div>`;
    current.formGrid.append(panel);
  }

  if (!current.duplicateButton) {
    const button = document.createElement('button');
    button.className = 'button meg-duplicate-transaction-button';
    button.id = 'duplicateTransactionBtn';
    button.type = 'button';
    button.textContent = 'Duplicar para o próximo mês';
    button.hidden = true;
    const rightActions = current.actions.querySelector(':scope > div');
    current.actions.insertBefore(button, rightActions || null);
  }

  return true;
}

function prepareDuplicate() {
  const current = controls();
  if (!eligibleForMonthlyTools(current) || !current.transactionId?.value) return;
  const nextDate = addMonthsClamped(current.date.value, 1);
  if (!nextDate) {
    setConfirmation('Data inválida', 'Informe uma data válida antes de duplicar.', 'danger');
    return;
  }

  current.transactionId.value = '';
  current.date.value = nextDate;
  current.weekday.value = weekdayShortPt(nextDate);
  if (current.purchaseDate && !current.purchaseDate.disabled && current.purchaseDate.value) {
    current.purchaseDate.value = addMonthsClamped(current.purchaseDate.value, 1);
    dispatchValueEvent(current.purchaseDate);
  }
  current.status.value = 'pending';
  dispatchValueEvent(current.date);
  dispatchValueEvent(current.status);
  current.title.textContent = 'Duplicar lançamento';
  current.deleteButton.style.visibility = 'hidden';
  current.dialog.dataset.duplicateMode = 'true';
  current.recurringEnabled.checked = false;
  current.recurringFields.hidden = true;
  current.duplicateNotice.hidden = false;
  syncUi();

  window.setTimeout(() => {
    current.expenseAmount?.focus();
    current.expenseAmount?.select();
  }, 0);
  setConfirmation('Cópia preparada', `Novo vencimento em ${formatDate(nextDate)}. Ajuste o valor e salve.`);
}

function buildRecurringBatch(payload) {
  const current = controls();
  const enabled = current.recurringEnabled?.checked;
  if (!enabled || current.transactionId?.value || !eligibleForMonthlyTools(current)) return null;

  const count = normalizeRecurrenceCount(current.recurringCount.value);
  const transactions = buildMonthlyTransactionBatch(payload, count);
  if (!transactions.length) return null;
  return {
    transactions,
    count: transactions.length,
    lastDate: transactions.at(-1).date,
  };
}

function wireEvents() {
  const current = controls();
  current.duplicateButton.addEventListener('click', prepareDuplicate);
  current.recurringEnabled.addEventListener('change', () => {
    current.recurringFields.hidden = !current.recurringEnabled.checked;
    updatePreview(current);
  });
  current.recurringCount.addEventListener('input', () => updatePreview(current));
  current.date.addEventListener('change', () => updatePreview(current));
  current.expenseAmount.addEventListener('input', () => updatePreview(current));
  current.description.addEventListener('input', () => updatePreview(current));
  current.transactionType.addEventListener('change', () => syncUi());
  current.modality.addEventListener('change', () => syncUi());
  current.paymentMethod.addEventListener('change', () => syncUi());

  dialogObserver = new MutationObserver(() => {
    if (current.dialog.open) window.setTimeout(() => syncUi({ reset: true }), 0);
    else syncUi({ reset: true });
  });
  dialogObserver.observe(current.dialog, { attributes: true, attributeFilter: ['open'] });
}

export function initializeRecurringTransactions() {
  if (initialized) return;
  if (!injectUi()) return;
  initialized = true;
  wireEvents();
  syncUi({ reset: true });
  window.MEG_RECURRING_TRANSACTIONS = {
    refresh: syncUi,
    addMonthsClamped,
    buildMonthlySchedule,
    buildBatch: buildRecurringBatch,
  };
}
