const DIACRITIC_PATTERN = /[\u0300-\u036f]/g;
const MAX_VISIBLE_OPTIONS = 60;

export function normalizeOptionText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(DIACRITIC_PATTERN, '')
    .trim()
    .toUpperCase();
}

function normalizeEntry(entry) {
  if (typeof entry === 'string' || typeof entry === 'number') {
    const value = String(entry);
    return { value, label: value, disabled: false };
  }
  return {
    value: String(entry?.value ?? ''),
    label: String(entry?.label ?? entry?.value ?? ''),
    disabled: Boolean(entry?.disabled),
  };
}

export function optionSignature(entries) {
  return entries
    .map(normalizeEntry)
    .map((entry) => `${entry.value}\u0001${entry.label}\u0001${entry.disabled ? '1' : '0'}`)
    .join('\u0002');
}

export function filterOptionEntries(entries, query = '', limit = MAX_VISIBLE_OPTIONS) {
  const normalizedQuery = normalizeOptionText(query);
  const result = [];
  for (const rawEntry of entries) {
    const entry = normalizeEntry(rawEntry);
    if (!normalizedQuery || normalizeOptionText(`${entry.label} ${entry.value}`).includes(normalizedQuery)) {
      result.push(entry);
      if (result.length >= limit) break;
    }
  }
  return result;
}

export function replaceSelectOptions(select, entries, preferredValue = '') {
  if (!select) return '';
  const normalizedEntries = entries.map(normalizeEntry);
  const signature = optionSignature(normalizedEntries);
  const preferred = String(preferredValue ?? select.value ?? '');

  if (select.dataset.nativeOptionsSignature !== signature) {
    const fragment = document.createDocumentFragment();
    for (const entry of normalizedEntries) {
      const option = document.createElement('option');
      option.value = entry.value;
      option.textContent = entry.label;
      option.disabled = entry.disabled;
      fragment.append(option);
    }
    select.replaceChildren(fragment);
    select.dataset.nativeOptionsSignature = signature;
  }

  const selected = normalizedEntries.find((entry) => entry.value === preferred)
    || normalizedEntries.find((entry) => !entry.disabled)
    || normalizedEntries[0];
  select.value = selected?.value ?? '';
  return select.value;
}

export function createTransactionEditor({ dialog, form } = {}) {
  if (dialog) dialog.dataset.transactionEditor = 'native';
  if (form) form.dataset.transactionEditor = 'native';

  return {
    open() {
      dialog?.setAttribute('data-editor-open', 'true');
    },
    close() {
      dialog?.removeAttribute('data-editor-open');
    },
    refreshAll() {
      // Os selects nativos leem as opções diretamente; não há cópia visual para sincronizar.
    },
    focusPrimary() {
      const primary = form?.querySelector('#descriptionInput')
        || form?.querySelector('input:not([type="hidden"]):not(:disabled)')
        || form?.querySelector('select:not(:disabled)');
      primary?.focus?.({ preventScroll: true });
    },
    setBusy(busy) {
      const submit = form?.querySelector('button[type="submit"]');
      if (submit) submit.disabled = Boolean(busy);
      form?.setAttribute('aria-busy', String(Boolean(busy)));
    },
    closeAll() {
      // Não existem popovers personalizados para fechar.
    },
  };
}
