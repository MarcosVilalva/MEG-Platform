import { calculateBestPurchaseDay } from './card-cycle-core.js';

const CATALOG_STORAGE_KEY = 'meg-catalog-workspace-v1';

function readCatalogPreference() {
  try { return JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || '{}'); } catch { return {}; }
}

function writeCatalogPreference(value) {
  try { localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(value)); } catch {}
}

function panelLabel(panel) {
  return panel.querySelector(':scope > .panel-title h3')?.textContent?.trim() || 'Cadastro';
}

function initializeStickyHeadings() {
  document.querySelectorAll('main.content > .view').forEach((view) => {
    const heading = view.querySelector(':scope > .meg-page-heading');
    if (!heading || heading.parentElement?.classList.contains('meg-page-sticky-header')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'meg-page-sticky-header';
    view.insertBefore(wrapper, heading);
    wrapper.append(heading);
  });
}

function initializeUserAvatar() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.getElementById('megUserAvatar')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'megUserAvatar';
  button.className = 'meg-user-avatar';
  button.title = 'Usuário conectado';
  button.setAttribute('aria-label', 'Usuário conectado');
  button.innerHTML = '<span aria-hidden="true">U</span>';
  actions.append(button);

  const synchronize = () => {
    const name = document.getElementById('cloudUserName')?.textContent?.trim() || 'Usuário';
    const initial = name.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() || 'U';
    button.querySelector('span').textContent = initial;
    button.title = name;
    button.setAttribute('aria-label', `Usuário conectado: ${name}`);
  };
  synchronize();
  const source = document.getElementById('cloudUserName');
  if (source) new MutationObserver(synchronize).observe(source, { childList: true, subtree: true });
}

function initializeCatalogWorkspace() {
  const view = document.getElementById('catalogs');
  const grid = view?.querySelector(':scope > .catalogs-grid');
  const stickyHeader = view?.querySelector(':scope > .meg-page-sticky-header');
  if (!view || !grid || !stickyHeader || view.dataset.megCatalogWorkspace === 'true') return;
  view.dataset.megCatalogWorkspace = 'true';

  const panels = [...grid.querySelectorAll(':scope > .catalog-panel')];
  if (!panels.length) return;
  const preference = readCatalogPreference();
  const toolbar = document.createElement('div');
  toolbar.className = 'meg-catalog-toolbar';
  const tabs = document.createElement('div');
  tabs.className = 'meg-catalog-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Tipos de cadastro');
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'meg-catalog-search';
  search.placeholder = 'Filtrar cadastro';
  search.setAttribute('aria-label', 'Filtrar itens do cadastro selecionado');
  toolbar.append(tabs, search);
  stickyHeader.append(toolbar);

  const protectHistoricalItems = () => {
    grid.querySelectorAll('[data-remove-financial-account], [data-remove-group], [data-remove-expense-class], [data-remove-modality], [data-remove-payment], [data-remove-card]').forEach((button) => button.remove());
  };
  const filterActivePanel = () => {
    const query = search.value.trim().toLocaleLowerCase('pt-BR');
    const activePanel = panels.find((panel) => !panel.hidden);
    activePanel?.querySelectorAll('.catalog-row').forEach((row) => {
      row.hidden = Boolean(query) && !row.textContent.toLocaleLowerCase('pt-BR').includes(query);
    });
  };

  const setEditorOpen = (panel, open, focus = true) => {
    const form = panel.querySelector(':scope > .catalog-form');
    const toggle = panel.querySelector(':scope > .panel-title .meg-catalog-add');
    if (!form || !toggle) return;
    panel.classList.toggle('meg-catalog-editor-open', open);
    form.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${open ? 'Fechar' : 'Abrir'} formulário de ${panelLabel(panel)}`);
    toggle.title = open ? 'Fechar cadastro' : 'Novo cadastro';
    toggle.textContent = open ? '−' : '+';
    if (open && focus) window.setTimeout(() => form.querySelector('input:not([type="hidden"]), select, textarea')?.focus(), 180);
  };

  const activate = (index, persist = true) => {
    const safeIndex = Math.max(0, Math.min(index, panels.length - 1));
    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === safeIndex;
      panel.hidden = !active;
      panel.classList.remove('meg-collapsed');
    });
    [...tabs.children].forEach((tab, tabIndex) => {
      const active = tabIndex === safeIndex;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    if (persist) writeCatalogPreference({ active: safeIndex });
    filterActivePanel();
  };

  panels.forEach((panel, index) => {
    panel.dataset.megCatalogIndex = String(index);
    const title = panelLabel(panel);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'meg-catalog-tab';
    tab.textContent = title;
    tab.setAttribute('role', 'tab');
    tab.addEventListener('click', () => activate(index));
    tabs.append(tab);

    const header = panel.querySelector(':scope > .panel-title');
    const form = panel.querySelector(':scope > .catalog-form');
    if (!header || !form) return;
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'meg-catalog-add';
    add.textContent = '+';
    add.addEventListener('click', () => setEditorOpen(panel, form.hidden));
    header.append(add);
    setEditorOpen(panel, false, false);
    form.addEventListener('submit', () => window.setTimeout(() => setEditorOpen(panel, false, false), 0));
  });

  view.addEventListener('click', (event) => {
    const edit = event.target.closest('[class*="catalog-edit"], [data-edit-card], [data-edit-financial-account], [data-edit-group], [data-edit-expense-class], [data-edit-payment]');
    if (!edit) return;
    const panel = edit.closest('.catalog-panel');
    if (!panel) return;
    activate(Number(panel.dataset.megCatalogIndex));
    setEditorOpen(panel, true);
  });

  tabs.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = [...tabs.children].findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + panels.length) % panels.length;
    activate(next);
    tabs.children[next].focus();
  });

  search.addEventListener('input', filterActivePanel);
  const catalogObserver = new MutationObserver(() => {
    protectHistoricalItems();
    filterActivePanel();
  });
  catalogObserver.observe(grid, { childList: true, subtree: true });
  protectHistoricalItems();

  activate(Number.isInteger(preference.active) ? preference.active : 0, false);
}

function initializeInvalidFieldFocus() {
  document.addEventListener('invalid', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
    control.classList.add('meg-field-attention');
    control.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => control.focus({ preventScroll: true }), 220);
  }, true);
  document.addEventListener('input', (event) => event.target?.classList?.remove('meg-field-attention'), true);
  document.addEventListener('change', (event) => event.target?.classList?.remove('meg-field-attention'), true);
}

function initializeCardCycleFields() {
  const closing = document.getElementById('newCardClosingDayInput');
  const due = document.getElementById('newCardDueDayInput');
  const best = document.getElementById('newCardBestDayInput');
  if (!closing || !due || !best) return;
  best.readOnly = true;
  const update = () => {
    const calculated = calculateBestPurchaseDay(closing.value);
    best.value = calculated ? String(calculated) : '';
    const sameDay = calculated && Number(closing.value) === Number(due.value);
    due.setCustomValidity(sameDay ? 'O vencimento precisa ser diferente do fechamento.' : '');
    best.title = calculated ? `Calculado automaticamente: primeiro dia após o fechamento ${closing.value}.` : 'Informe o fechamento para calcular.';
  };
  closing.addEventListener('input', update);
  due.addEventListener('input', update);
  closing.addEventListener('change', update);
  due.addEventListener('change', update);
  update();
}

export function initializeAdaptiveWorkspace() {
  document.body.classList.add('meg-adaptive-workspace');
  initializeStickyHeadings();
  initializeUserAvatar();
  initializeCatalogWorkspace();
  initializeInvalidFieldFocus();
  initializeCardCycleFields();
}
