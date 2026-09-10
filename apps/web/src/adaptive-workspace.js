import { calculateBestPurchaseDay } from './card-cycle-core.js';

const CATALOG_STORAGE_KEY = 'meg-catalog-workspace-v1';

const PRIMARY_NAV_ORDER = [
  'dashboard',
  'transactions',
  'activity-history',
  'pending',
  'credit-cards',
  'catalogs',
  'users',
  'analytics',
  'income-analysis',
  'cashflow',
  'budgets',
  'settings',
  'platform-admin',
];

const TOPBAR_COPY = {
  dashboard: ['Início', 'Visão geral da vida financeira'],
  transactions: ['Lançamentos', 'Inclua e controle seus eventos financeiros'],
  'activity-history': ['Histórico', 'Auditoria completa dos lançamentos'],
  pending: ['Pendentes', 'Vencimentos organizados por prioridade'],
  'credit-cards': ['Cartões', 'Faturas, limites e compras'],
  catalogs: ['Cadastros', 'Organize a base operacional'],
  users: ['Usuários e permissões', 'Controle de acesso ao MEG'],
  analytics: ['Análises', 'Indicadores para decisões financeiras'],
  'income-analysis': ['Receitas', 'Origem e evolução das entradas'],
  cashflow: ['Fluxo', 'Projeção das movimentações financeiras'],
  budgets: ['Orçamentos', 'Metas e limites financeiros'],
  settings: ['Configurações', 'Personalize o MEG do seu jeito'],
  'platform-admin': ['Gestão comercial', 'Administração da plataforma'],
};

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

function initializeAdaptiveNavigation() {
  const nav = document.querySelector('.nav-list');
  const context = document.querySelector('.meg-command-context');
  const quickAdd = document.getElementById('quickAddBtn');
  if (!nav || nav.dataset.megAdaptiveNavigation === 'true') return;
  nav.dataset.megAdaptiveNavigation = 'true';

  const reorder = () => {
    const items = new Map([...nav.querySelectorAll(':scope > [data-view]')].map((item) => [item.dataset.view, item]));
    const ordered = PRIMARY_NAV_ORDER.map((view) => items.get(view)).filter(Boolean);
    const current = [...nav.querySelectorAll(':scope > [data-view]')];
    if (ordered.some((item, index) => item !== current[index])) ordered.forEach((item) => nav.append(item));
    const dashboard = items.get('dashboard');
    if (dashboard) dashboard.lastChild.textContent = ' Início';
  };

  const synchronizeContext = () => {
    const activeView = document.querySelector('main.content > .view.active')?.id || 'dashboard';
    const [title, subtitle] = TOPBAR_COPY[activeView] || ['MEG', 'Meu Equilíbrio Gerencial'];
    context.innerHTML = `<strong>${title}</strong><small>${subtitle}</small>`;
    document.body.dataset.activeView = activeView;
  };

  if (quickAdd) {
    quickAdd.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>';
    quickAdd.classList.add('meg-quick-add-icon');
    quickAdd.setAttribute('aria-label', 'Novo lançamento');
    quickAdd.title = 'Novo lançamento';
  }

  reorder();
  synchronizeContext();
  new MutationObserver(reorder).observe(nav, { childList: true });
  new MutationObserver(() => {
    reorder();
    synchronizeContext();
  }).observe(document.querySelector('main.content'), { childList: true, subtree: false });
  document.querySelectorAll('main.content > .view').forEach((view) => {
    new MutationObserver(synchronizeContext).observe(view, { attributes: true, attributeFilter: ['class'] });
  });
}

function initializeValidatedDashboard() {
  const dashboard = document.getElementById('dashboard');
  const payables = dashboard?.querySelector('.payable-panel');
  if (!dashboard || !payables || dashboard.dataset.megValidatedDashboard === 'true') return;
  dashboard.dataset.megValidatedDashboard = 'true';
  payables.classList.add('meg-grouped-due-panel');
  const title = payables.querySelector('.panel-title h3');
  if (title) title.textContent = 'Vencimentos agrupados';
  const eyebrow = payables.querySelector('.decision-eyebrow');
  if (eyebrow) eyebrow.textContent = 'AGENDA FINANCEIRA';
}

function initializeTransactionColumns() {
  const view = document.getElementById('transactions');
  const header = view?.querySelector(':scope > .meg-page-sticky-header .meg-page-heading');
  const table = view?.querySelector('.transactions-table');
  if (!view || !header || !table || view.dataset.megColumnsReady === 'true') return;
  view.dataset.megColumnsReady = 'true';

  const definitions = [
    [3, 'Dia'], [7, 'Classificação'], [8, 'Grupo'], [10, 'Forma de pagamento'], [12, 'Modalidade'], [13, 'Observações'],
  ];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('meg-transaction-columns-v1') || '{}'); } catch {}
  const actions = header.querySelector(':scope > .meg-page-actions') || header;
  const chooser = document.createElement('details');
  chooser.className = 'meg-column-chooser';
  chooser.innerHTML = `<summary>Colunas</summary><div class="meg-column-menu"><strong>Colunas visíveis</strong>${definitions.map(([column, label]) => `<label><input type="checkbox" data-meg-column="${column}"${saved[column] === false ? '' : ' checked'}>${label}</label>`).join('')}</div>`;
  actions.prepend(chooser);

  const apply = () => {
    const state = {};
    chooser.querySelectorAll('[data-meg-column]').forEach((control) => {
      const column = Number(control.dataset.megColumn);
      state[column] = control.checked;
      table.querySelectorAll(`tr > :nth-child(${column})`).forEach((cell) => { cell.hidden = !control.checked; });
    });
    try { localStorage.setItem('meg-transaction-columns-v1', JSON.stringify(state)); } catch {}
  };
  chooser.addEventListener('change', apply);
  new MutationObserver(apply).observe(table.tBodies[0], { childList: true });
  document.addEventListener('click', (event) => {
    if (!chooser.contains(event.target)) chooser.open = false;
  });
  apply();
}

function initializePendingWorkspace() {
  const view = document.getElementById('pending');
  const heading = view?.querySelector(':scope > .meg-page-sticky-header');
  const list = document.getElementById('pendingBillsList');
  if (!view || !heading || !list || view.dataset.megPendingWorkspace === 'true') return;
  view.dataset.megPendingWorkspace = 'true';

  const toolbar = document.createElement('div');
  toolbar.className = 'meg-pending-toolbar';
  toolbar.innerHTML = `<div class="meg-pending-priorities" role="group" aria-label="Prioridade"><button class="active" type="button" data-priority="all">Todos</button><button type="button" data-priority="overdue">Vencidos</button><button type="button" data-priority="today">Hoje</button><button type="button" data-priority="soon">Próximos</button><button type="button" data-priority="card">Faturas</button></div><input type="search" data-pending-search placeholder="Buscar conta, cartão ou grupo" aria-label="Buscar pendência">`;
  heading.append(toolbar);
  let priority = 'all';
  const filter = () => {
    const query = toolbar.querySelector('[data-pending-search]').value.trim().toLocaleLowerCase('pt-BR');
    list.querySelectorAll('.bill-item').forEach((row) => {
      const priorityMatch = priority === 'all'
        || (priority === 'card' ? row.classList.contains('grouped-card-bill') : row.classList.contains(`priority-${priority}`));
      const textMatch = !query || row.textContent.toLocaleLowerCase('pt-BR').includes(query);
      row.hidden = !(priorityMatch && textMatch);
    });
  };
  toolbar.querySelectorAll('[data-priority]').forEach((button) => button.addEventListener('click', () => {
    priority = button.dataset.priority;
    toolbar.querySelectorAll('[data-priority]').forEach((item) => item.classList.toggle('active', item === button));
    filter();
  }));
  toolbar.querySelector('[data-pending-search]').addEventListener('input', filter);
  new MutationObserver(filter).observe(list, { childList: true });
  filter();
}

function initializeSettingsStatus() {
  const view = document.getElementById('settings');
  const heading = view?.querySelector(':scope > .meg-page-sticky-header');
  if (!view || !heading || view.dataset.megSettingsStatus === 'true') return;
  view.dataset.megSettingsStatus = 'true';
  const banner = document.createElement('div');
  banner.className = 'meg-system-status';
  banner.innerHTML = '<span aria-hidden="true">✓</span><div><strong>Sistema funcionando normalmente</strong><small>Banco de dados, sincronização e backup disponíveis.</small></div>';
  heading.append(banner);
  const source = document.getElementById('cloudSyncStatus');
  const synchronize = () => {
    const status = source?.textContent?.trim() || '';
    const ok = /sincron|conect|navegador/i.test(status) && !/erro|falha|pendente/i.test(status);
    banner.classList.toggle('attention', !ok);
    banner.querySelector('span').textContent = ok ? '✓' : '!';
    banner.querySelector('strong').textContent = ok ? 'Sistema funcionando normalmente' : 'Sincronização exige atenção';
    banner.querySelector('small').textContent = status || 'Verificando a conexão com a base.';
  };
  if (source) new MutationObserver(synchronize).observe(source, { childList: true, subtree: true });
  synchronize();
}

function initializeCatalogWorkspace() {
  const view = document.getElementById('catalogs');
  const grid = view?.querySelector(':scope > .catalogs-grid');
  const stickyHeader = view?.querySelector(':scope > .meg-page-sticky-header');
  if (!view || !grid || !stickyHeader || view.dataset.megCatalogWorkspace === 'true') return;
  view.dataset.megCatalogWorkspace = 'true';

  const allPanels = [...grid.querySelectorAll(':scope > .catalog-panel')];
  const modalityPanel = allPanels.find((panel) => panel.querySelector(':scope > .panel-title h3')?.textContent?.trim() === 'Modalidades');
  if (modalityPanel) modalityPanel.hidden = true;
  const panels = allPanels.filter((panel) => panel !== modalityPanel);
  const preferredOrder = ['Contas e benefícios', 'Classificações', 'Grupos', 'Formas e modalidades', 'Regras das faturas'];
  panels.sort((left, right) => preferredOrder.indexOf(panelLabel(left)) - preferredOrder.indexOf(panelLabel(right)));
  panels.forEach((panel) => grid.append(panel));
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
  initializeAdaptiveNavigation();
  initializeStickyHeadings();
  initializeUserAvatar();
  initializeValidatedDashboard();
  initializeCatalogWorkspace();
  initializeTransactionColumns();
  initializePendingWorkspace();
  initializeSettingsStatus();
  initializeInvalidFieldFocus();
  initializeCardCycleFields();
}
