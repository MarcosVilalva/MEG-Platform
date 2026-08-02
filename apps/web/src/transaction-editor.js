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

  if (select.dataset.fastOptionsSignature !== signature) {
    const fragment = document.createDocumentFragment();
    normalizedEntries.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.value;
      option.textContent = entry.label;
      option.disabled = entry.disabled;
      fragment.append(option);
    });
    select.replaceChildren(fragment);
    select.dataset.fastOptionsSignature = signature;
  }

  const available = normalizedEntries.find((entry) => entry.value === preferred && !entry.disabled)
    || normalizedEntries.find((entry) => !entry.disabled)
    || normalizedEntries[0];
  select.value = available?.value ?? '';
  select.dispatchEvent(new CustomEvent('meg-options-updated'));
  return select.value;
}

class FastCombobox {
  constructor(select, controller) {
    this.select = select;
    this.controller = controller;
    this.entries = [];
    this.filtered = [];
    this.activeIndex = -1;
    this.isOpen = false;

    this.host = document.createElement('div');
    this.host.className = 'fast-combobox';
    this.host.dataset.fastComboboxFor = select.id;
    this.host.innerHTML = `
      <button class="fast-combobox-control" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="fast-combobox-value"></span>
        <span class="fast-combobox-arrow" aria-hidden="true">⌄</span>
      </button>
      <div class="fast-combobox-popover" hidden>
        <div class="fast-combobox-search-wrap">
          <input class="fast-combobox-search" type="search" autocomplete="off" placeholder="Pesquisar..." aria-label="Pesquisar opções" />
        </div>
        <div class="fast-combobox-options" role="listbox"></div>
        <small class="fast-combobox-limit" hidden></small>
      </div>
    `;

    this.control = this.host.querySelector('.fast-combobox-control');
    this.valueLabel = this.host.querySelector('.fast-combobox-value');
    this.popover = this.host.querySelector('.fast-combobox-popover');
    this.search = this.host.querySelector('.fast-combobox-search');
    this.options = this.host.querySelector('.fast-combobox-options');
    this.limitNote = this.host.querySelector('.fast-combobox-limit');

    select.classList.add('fast-combobox-source');
    select.insertAdjacentElement('afterend', this.host);

    this.control.addEventListener('click', () => this.toggle());
    this.control.addEventListener('keydown', (event) => this.handleControlKeydown(event));
    this.search.addEventListener('input', () => this.renderOptions());
    this.search.addEventListener('keydown', (event) => this.handleSearchKeydown(event));
    this.options.addEventListener('pointerdown', (event) => event.preventDefault());
    this.options.addEventListener('click', (event) => {
      const option = event.target.closest('[data-fast-option]');
      if (!option || option.getAttribute('aria-disabled') === 'true') return;
      this.selectValue(option.dataset.fastOption);
    });
    select.addEventListener('change', () => this.refresh());
    select.addEventListener('meg-options-updated', () => {
      this.refresh();
      if (this.isOpen) this.renderOptions();
    });

    this.observer = new MutationObserver(() => {
      this.refresh();
      if (this.isOpen) this.renderOptions();
    });
    this.observer.observe(select, { childList: true, subtree: true, attributes: true });
    this.refresh();
  }

  readEntries() {
    this.entries = Array.from(this.select.options).map((option) => ({
      value: option.value,
      label: option.textContent || option.value,
      disabled: option.disabled,
    }));
    return this.entries;
  }

  refresh() {
    const selected = this.select.selectedOptions?.[0]
      || Array.from(this.select.options).find((option) => option.value === this.select.value)
      || this.select.options[0];
    this.valueLabel.textContent = selected?.textContent || 'Selecione';
    this.control.disabled = this.select.disabled;
    this.control.setAttribute('aria-disabled', String(this.select.disabled));
    this.host.classList.toggle('is-disabled', this.select.disabled);
  }

  renderOptions() {
    const entries = this.readEntries();
    this.filtered = filterOptionEntries(entries, this.search.value, MAX_VISIBLE_OPTIONS);
    this.activeIndex = this.filtered.findIndex((entry) => entry.value === this.select.value && !entry.disabled);
    if (this.activeIndex < 0) this.activeIndex = this.filtered.findIndex((entry) => !entry.disabled);

    const fragment = document.createDocumentFragment();
    this.filtered.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fast-combobox-option';
      button.dataset.fastOption = entry.value;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(entry.value === this.select.value));
      button.setAttribute('aria-disabled', String(entry.disabled));
      button.classList.toggle('active', index === this.activeIndex);
      button.classList.toggle('selected', entry.value === this.select.value);
      button.disabled = entry.disabled;
      button.textContent = entry.label;
      fragment.append(button);
    });

    if (!this.filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'fast-combobox-empty';
      empty.textContent = 'Nenhuma opção encontrada.';
      fragment.append(empty);
    }

    this.options.replaceChildren(fragment);
    const hiddenCount = Math.max(entries.filter((entry) => {
      const query = normalizeOptionText(this.search.value);
      return !query || normalizeOptionText(`${entry.label} ${entry.value}`).includes(query);
    }).length - this.filtered.length, 0);
    this.limitNote.hidden = hiddenCount === 0;
    this.limitNote.textContent = hiddenCount ? `Refine a pesquisa para ver mais ${hiddenCount} opção(ões).` : '';
  }

  toggle() {
    if (this.select.disabled) return;
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen || this.select.disabled) return;
    this.controller.closeAll(this);
    this.isOpen = true;
    this.host.classList.add('open');
    this.control.setAttribute('aria-expanded', 'true');
    this.popover.hidden = false;
    this.search.value = '';
    this.renderOptions();
    requestAnimationFrame(() => {
      this.search.focus({ preventScroll: true });
      this.scrollActiveIntoView();
    });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.host.classList.remove('open');
    this.control.setAttribute('aria-expanded', 'false');
    this.popover.hidden = true;
    this.search.value = '';
    this.activeIndex = -1;
  }

  selectValue(value) {
    const entry = this.readEntries().find((candidate) => candidate.value === value && !candidate.disabled);
    if (!entry) return;
    this.select.value = entry.value;
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
    this.refresh();
    this.close();
    this.control.focus({ preventScroll: true });
  }

  moveActive(delta) {
    if (!this.filtered.length) return;
    let next = this.activeIndex;
    for (let attempts = 0; attempts < this.filtered.length; attempts += 1) {
      next = (next + delta + this.filtered.length) % this.filtered.length;
      if (!this.filtered[next].disabled) break;
    }
    this.activeIndex = next;
    this.options.querySelectorAll('.fast-combobox-option').forEach((option, index) => {
      option.classList.toggle('active', index === this.activeIndex);
    });
    this.scrollActiveIntoView();
  }

  scrollActiveIntoView() {
    this.options.querySelector('.fast-combobox-option.active')?.scrollIntoView({ block: 'nearest' });
  }

  handleControlKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.open();
    }
  }

  handleSearchKeydown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const entry = this.filtered[this.activeIndex];
      if (entry && !entry.disabled) this.selectValue(entry.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.control.focus({ preventScroll: true });
    }
  }
}

class SegmentedSelect {
  constructor(select) {
    this.select = select;
    this.host = document.createElement('div');
    this.host.className = 'fast-segmented-control';
    this.host.setAttribute('role', 'group');
    this.host.setAttribute('aria-label', select.closest('label')?.textContent?.trim() || select.id);
    select.classList.add('fast-segmented-source');
    select.insertAdjacentElement('afterend', this.host);
    this.host.addEventListener('click', (event) => {
      const button = event.target.closest('[data-segment-value]');
      if (!button || button.disabled) return;
      select.value = button.dataset.segmentValue;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      this.refresh();
    });
    select.addEventListener('change', () => this.refresh());
    select.addEventListener('meg-options-updated', () => this.render());
    this.render();
  }

  render() {
    const fragment = document.createDocumentFragment();
    Array.from(this.select.options).forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.segmentValue = option.value;
      button.textContent = option.textContent || option.value;
      button.disabled = option.disabled || this.select.disabled;
      fragment.append(button);
    });
    this.host.replaceChildren(fragment);
    this.refresh();
  }

  refresh() {
    this.host.querySelectorAll('[data-segment-value]').forEach((button) => {
      const selected = button.dataset.segmentValue === this.select.value;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = this.select.disabled || button.disabled;
    });
  }
}

function editorSection(title, description, nodes) {
  const section = document.createElement('section');
  section.className = 'transaction-editor-section';
  const heading = document.createElement('header');
  heading.innerHTML = `<div><strong>${title}</strong><small>${description}</small></div>`;
  const body = document.createElement('div');
  body.className = 'transaction-editor-section-grid';
  nodes.filter(Boolean).forEach((node) => body.append(node));
  section.append(heading, body);
  return section;
}

function restructureForm(dialog, form) {
  if (form.dataset.editorStructure === 'v2') return;
  form.dataset.editorStructure = 'v2';
  dialog.classList.add('transaction-editor-v2');
  form.classList.add('transaction-editor-form-v2');

  const header = form.querySelector('.modal-header');
  const intro = document.createElement('div');
  intro.className = 'transaction-editor-intro';
  intro.innerHTML = '<span>LANÇAMENTO RÁPIDO</span><p>Preencha primeiro o essencial. Classificação e pagamento ficam separados para reduzir cliques e travamentos.</p>';
  header?.insertAdjacentElement('afterend', intro);

  const grid = form.querySelector('.form-grid');
  if (!grid) return;

  const labelFor = (selector) => form.querySelector(selector)?.closest('label');
  const nodeFor = (selector) => form.querySelector(selector);
  const weekdayLabel = labelFor('#weekdayInput');
  weekdayLabel?.classList.add('transaction-editor-technical-field');

  const essentials = editorSection('Dados principais', 'Tipo, descrição, valor e data', [
    labelFor('#transactionType'),
    labelFor('#descriptionInput'),
    labelFor('#incomeAmountInput'),
    labelFor('#expenseAmountInput'),
    labelFor('#purchaseDateInput'),
    labelFor('#dateInput'),
    weekdayLabel,
  ]);
  const classification = editorSection('Classificação', 'Organize a despesa sem misturar com o pagamento', [
    labelFor('#expenseClassInput'),
    labelFor('#groupInput'),
  ]);
  const payment = editorSection('Pagamento e conta', 'Modalidade, forma de pagamento, conta e situação', [
    labelFor('#modalityInput'),
    labelFor('#paymentMethodInput'),
    labelFor('#financialAccountInput'),
    labelFor('#statusInput'),
  ]);
  const details = editorSection('Detalhes adicionais', 'Parcelamento e observações', [
    nodeFor('#installmentFields'),
    labelFor('#installmentEditScopeInput'),
    labelFor('#notesInput'),
  ]);

  grid.replaceChildren(essentials, classification, payment, details);
  grid.classList.add('transaction-editor-layout');
}

export function createTransactionEditor({ dialog, form, appShell, comboboxSelects = [], segmentedSelects = [] }) {
  if (!dialog || !form) {
    return {
      open() {},
      close() {},
      refreshAll() {},
      focusPrimary() {},
      setBusy() {},
      closeAll() {},
    };
  }

  restructureForm(dialog, form);
  const controller = {
    combos: [],
    segments: [],
    opened: false,
    closeAll(except = null) {
      controller.combos.forEach((combo) => {
        if (combo !== except) combo.close();
      });
    },
  };

  controller.combos = comboboxSelects.filter(Boolean).map((select) => new FastCombobox(select, controller));
  controller.segments = segmentedSelects.filter(Boolean).map((select) => new SegmentedSelect(select));

  const outsidePointerHandler = (event) => {
    if (!controller.opened) return;
    if (!event.target.closest?.('.fast-combobox')) controller.closeAll();
  };
  document.addEventListener('pointerdown', outsidePointerHandler, true);

  form.addEventListener('invalid', (event) => {
    const source = event.target;
    if (!(source instanceof HTMLSelectElement)) return;
    const combo = controller.combos.find((item) => item.select === source);
    if (combo) {
      event.preventDefault();
      combo.control.focus({ preventScroll: true });
      combo.open();
    }
  }, true);

  return {
    open() {
      controller.opened = true;
      controller.closeAll();
      if (appShell) {
        appShell.inert = true;
        appShell.hidden = true;
      }
      document.body.classList.add('transaction-editor-active');
      this.refreshAll();
    },
    close() {
      controller.opened = false;
      controller.closeAll();
      if (appShell) {
        appShell.hidden = false;
        appShell.inert = false;
      }
      document.body.classList.remove('transaction-editor-active');
      this.setBusy(false);
    },
    refreshAll() {
      controller.combos.forEach((combo) => combo.refresh());
      controller.segments.forEach((segment) => segment.refresh());
    },
    focusPrimary() {
      const description = form.querySelector('#descriptionInput');
      description?.focus({ preventScroll: true });
    },
    setBusy(busy) {
      form.classList.toggle('is-saving', Boolean(busy));
      const submit = form.querySelector('button[type="submit"]');
      if (submit) {
        submit.disabled = Boolean(busy);
        submit.textContent = busy ? 'Salvando...' : 'Salvar';
      }
    },
    closeAll: controller.closeAll,
  };
}
