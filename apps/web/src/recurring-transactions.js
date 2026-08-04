import {
  addMonthsClamped,
  buildMonthlySchedule,
  isInstallmentModality,
  normalizeRecurrenceCount,
  parseIsoDate,
  weekdayShortPt,
} from './recurring-transactions-core.js';

let initialized = false;
let replayingSubmission = false;
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

function beginCloudBatch() {
  const cloud = window.MEG_CLOUD;
  const originalSave = cloud?.saveState;
  let latestState = null;
  let installed = false;

  if (cloud && typeof originalSave === 'function') {
    const deferredSave = (nextState) => {
      latestState = nextState;
      return Promise.resolve({ deferred: true });
    };
    try {
      cloud.saveState = deferredSave;
      installed = cloud.saveState === deferredSave;
    } catch {
      installed = false;
    }
  }

  return {
    get latestState() {
      return latestState;
    },
    finish() {
      if (!installed) return;
      try {
        cloud.saveState = originalSave;
      } catch {
        return;
      }
      if (latestState) {
        Promise.resolve(originalSave.call(cloud, latestState)).catch((cause) => {
          console.error('MEG recurring transaction cloud sync failed', cause);
        });
      }
    },
  };
}

function createSubmitEvent(form) {
  const submitter = form.querySelector('button[type="submit"]');
  if (typeof SubmitEvent === 'function') {
    return new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter });
  }
  return new Event('submit', { bubbles: true, cancelable: true });
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

function markRecurringMetadata(snapshot, metadata) {
  const transactions = snapshot?.transactions;
  if (!Array.isArray(transactions) || !transactions.length) return;
  const candidate = transactions.at(-1);
  if (!candidate || candidate.date !== metadata.date) return;
  Object.assign(candidate, {
    recurrenceKind: 'monthly',
    recurrenceSeriesId: metadata.seriesId,
    recurrenceNumber: metadata.number,
    recurrenceCount: metadata.count,
    recurrenceDay: metadata.day,
    recurrenceCreatedAt: metadata.createdAt,
  });
}

function createRecurringTransactions(event) {
  if (replayingSubmission) return;
  const current = controls();
  const enabled = current.recurringEnabled?.checked;
  if (!enabled || current.transactionId?.value || !eligibleForMonthlyTools(current)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (!current.form.reportValidity()) return;

  const count = normalizeRecurrenceCount(current.recurringCount.value);
  const schedule = buildMonthlySchedule(current.date.value, count);
  const parsedFirstDate = parseIsoDate(current.date.value);
  if (!schedule.length || !parsedFirstDate) {
    setConfirmation('Recorrência não criada', 'Informe uma data de vencimento válida.', 'danger');
    return;
  }

  const seriesId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const batch = beginCloudBatch();
  const originalDate = current.date.value;
  const originalWeekday = current.weekday.value;
  const originalStatus = current.status.value;

  try {
    replayingSubmission = true;
    current.status.value = 'pending';
    schedule.forEach((date, index) => {
      current.transactionId.value = '';
      current.date.value = date;
      current.weekday.value = weekdayShortPt(date);
      current.status.value = 'pending';
      current.form.dispatchEvent(createSubmitEvent(current.form));
      markRecurringMetadata(batch.latestState, {
        seriesId,
        number: index + 1,
        count,
        day: parsedFirstDate.day,
        date,
        createdAt,
      });
    });
  } finally {
    replayingSubmission = false;
    current.date.value = originalDate;
    current.weekday.value = originalWeekday;
    current.status.value = originalStatus;
    batch.finish();
  }

  window.setTimeout(() => {
    setConfirmation(
      'Recorrência criada',
      `${count} lançamentos pendentes gerados até ${formatDate(schedule.at(-1))}.`,
    );
  }, 0);
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
  current.form.addEventListener('submit', createRecurringTransactions, true);

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
  };
}
