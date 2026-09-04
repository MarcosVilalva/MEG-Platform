const HISTORY_VIEW_ID = 'activity-history';
const HISTORY_NAV_ID = 'activityHistoryNav';
const RECENT_SECTION_ID = 'megRecentActivity';
const STATE_KEY = 'meg-financas-state-v4-paid-fixes';
const READY_RETRY_MS = 250;
const READY_RETRY_LIMIT = 40;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function parseLocalState() {
  try {
    return JSON.parse(window.localStorage?.getItem?.(STATE_KEY) || 'null');
  } catch {
    return null;
  }
}

function validActivityState(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.transactions));
}

function activityState() {
  const candidates = [
    window.MEG_APP?.getStateRef?.(),
    parseLocalState(),
    window.MEG_REAL_STATE,
  ].filter(validActivityState);

  // Durante a abertura do Android, MEG_APP pode existir antes de receber o
  // activityLog carregado da nuvem. Não deixe esse estado transitório vazio
  // esconder um histórico já protegido no cache local.
  return candidates.find((state) => Array.isArray(state.activityLog) && state.activityLog.length > 0)
    || candidates.find((state) => Array.isArray(state.activityLog))
    || candidates[0]
    || null;
}

function logs() {
  const state = activityState();
  const items = state?.activityLog;
  if (!Array.isArray(items)) return [];
  const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
  const currentById = new Map(transactions.filter((item) => item?.id).map((item) => [String(item.id), item]));
  const seriesById = new Map();
  transactions.forEach((item) => {
    if (!item?.installmentSeriesId) return;
    const key = String(item.installmentSeriesId);
    seriesById.set(key, [...(seriesById.get(key) || []), item]);
  });
  const logicalItems = new Map();
  [...items]
    .sort((left, right) => String(right.at || '').localeCompare(String(left.at || '')))
    .forEach((item) => {
      const current = currentById.get(String(item.transactionId || ''));
      const transaction = { ...(item.transaction || {}), ...(current || {}) };
      const seriesId = String(transaction.installmentSeriesId || '');
      const logicalId = seriesId ? `series:${seriesId}` : `transaction:${item.transactionId || item.id}`;
      if (logicalItems.has(logicalId)) return;
      if (seriesId) {
        const series = seriesById.get(seriesId) || [transaction];
        const first = [...series].sort((left, right) => Number(left.installmentNumber || 0) - Number(right.installmentNumber || 0))[0] || transaction;
        const total = Number(first.purchaseTotal || 0) || series.reduce((sum, entry) => sum + Math.abs(Number(entry.amount || entry.expenseAmount || 0)), 0);
        logicalItems.set(logicalId, {
          ...item,
          transactionId: first.id || item.transactionId,
          transaction: {
            ...transaction,
            ...first,
            description: String(first.description || transaction.description || 'Compra parcelada').replace(/\s+\d+\/\d+\s*$/, ''),
            amount: total,
          },
          seriesCount: Math.max(series.length, Number(first.installmentCount || 0), 1),
        });
        return;
      }
      logicalItems.set(logicalId, { ...item, transaction });
    });
  return [...logicalItems.values()];
}

function actionLabel(action) {
  return {
    CREATED: 'lançou',
    UPDATED: 'alterou',
    DELETED: 'excluiu',
    RECOVERED: 'recuperou',
  }[action] || 'atualizou';
}

function actionBadge(action) {
  return {
    CREATED: 'Novo',
    UPDATED: 'Alterado',
    DELETED: 'Excluído',
    RECOVERED: 'Recuperado',
  }[action] || 'Atualização';
}

function typeLabel(type) {
  return type === 'income' ? 'RECEITA' : 'DESPESA';
}

function dateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function activityCard(item, { compact = false } = {}) {
  const transaction = item.transaction || {};
  const deleted = item.action === 'DELETED';
  const description = transaction.description || 'Lançamento';
  const actor = item.userName || 'Usuário MEG';
  const type = typeLabel(transaction.type);
  const seriesCount = Number(item.seriesCount || 0);
  const detail = [seriesCount > 1 ? `${seriesCount} parcelas` : '', transaction.paymentMethod, transaction.group].filter(Boolean).join(' · ');
  return `
    <article class="meg-activity-card ${transaction.type === 'income' ? 'income' : 'expense'} ${deleted ? 'deleted' : ''}">
      <div class="meg-activity-marker" aria-hidden="true">${transaction.type === 'income' ? '↗' : '↘'}</div>
      <div class="meg-activity-copy">
        <div class="meg-activity-heading">
          <strong>${escapeHtml(description)}</strong>
          <span class="meg-activity-badge">${seriesCount > 1 ? 'Parcelamento' : escapeHtml(actionBadge(item.action))}</span>
        </div>
        <p><b>${escapeHtml(actor)}</b> ${escapeHtml(actionLabel(item.action))} uma ${escapeHtml(type.toLowerCase())}</p>
        <small>${escapeHtml(dateTime(item.at))}${detail ? ` · ${escapeHtml(detail)}` : ''}</small>
      </div>
      <div class="meg-activity-value">
        <strong>${transaction.type === 'income' ? '+' : '−'} ${escapeHtml(money(Math.abs(Number(transaction.amount || 0))))}</strong>
        ${compact
          ? ''
          : deleted
            ? '<span class="meg-activity-unavailable">Lançamento excluído</span>'
            : `<button class="button ghost" type="button" data-edit="${escapeHtml(item.transactionId)}">Abrir lançamento</button>`}
      </div>
    </article>`;
}

function styleMarkup() {
  return `
    .meg-recent-activity,.meg-history-panel{margin-top:24px;border:1px solid rgba(148,163,184,.22);border-radius:20px;background:var(--panel);box-shadow:0 10px 28px rgba(15,23,42,.06);overflow:hidden}
    .meg-recent-activity-header,.meg-history-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid rgba(148,163,184,.18)}
    .meg-recent-activity-header h3,.meg-history-header h2{margin:0;font-size:1.05rem}.meg-recent-activity-header p,.meg-history-header p{margin:4px 0 0;color:var(--muted,#64748b);font-size:.84rem}
    .meg-activity-list{display:grid;gap:0}.meg-activity-card{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 20px;border-bottom:1px solid rgba(148,163,184,.12)}
    .meg-activity-card:last-child{border-bottom:0}.meg-activity-marker{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:rgba(148,163,184,.12);font-weight:800}.meg-activity-card.income .meg-activity-marker{background:rgba(16,185,129,.12)}.meg-activity-card.expense .meg-activity-marker{background:rgba(239,68,68,.10)}
    .meg-activity-copy{min-width:0}.meg-activity-heading{display:flex;align-items:center;gap:8px;min-width:0}.meg-activity-heading strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.meg-activity-badge{flex:0 0 auto;border-radius:999px;padding:3px 8px;background:rgba(148,163,184,.12);font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
    .meg-activity-copy p{margin:4px 0 2px;font-size:.84rem}.meg-activity-copy small{color:var(--muted,#64748b)}.meg-activity-value{display:grid;justify-items:end;gap:7px}.meg-activity-value strong{white-space:nowrap}.meg-activity-card.income .meg-activity-value>strong{color:var(--success,#047857)}.meg-activity-card.expense .meg-activity-value>strong{color:var(--danger,#b91c1c)}
    .meg-activity-unavailable{font-size:.72rem;color:var(--muted,#64748b)}.meg-activity-empty{padding:32px 20px;text-align:center;color:var(--muted,#64748b)}
    .meg-history-filters{display:grid;grid-template-columns:minmax(180px,1fr) repeat(2,minmax(140px,190px));gap:10px;padding:16px 20px;border-bottom:1px solid rgba(148,163,184,.14)}.meg-history-filters input,.meg-history-filters select{width:100%}
    .meg-history-more{display:flex;justify-content:center;padding:16px;border-top:1px solid rgba(148,163,184,.12)}.meg-history-more[hidden]{display:none}
    @media(max-width:760px){.meg-recent-activity,.meg-history-panel{margin-top:16px;border-radius:16px}.meg-recent-activity-header,.meg-history-header{padding:15px 16px;align-items:flex-start}.meg-activity-card{grid-template-columns:36px minmax(0,1fr);padding:14px 16px;gap:11px}.meg-activity-marker{width:34px;height:34px}.meg-activity-value{grid-column:2;display:flex;align-items:center;justify-content:space-between;width:100%;justify-items:initial}.meg-activity-heading{align-items:flex-start;flex-wrap:wrap}.meg-history-filters{grid-template-columns:1fr;padding:14px 16px}.meg-recent-activity-header .button{white-space:nowrap}}
  `;
}

function ensureShell() {
  if (!document.getElementById('megActivityHistoryStyles')) {
    const style = document.createElement('style');
    style.id = 'megActivityHistoryStyles';
    style.textContent = styleMarkup();
    document.head.appendChild(style);
  }

  const settingsNav = document.querySelector('.nav-item[data-view="settings"]');
  if (settingsNav && !document.getElementById(HISTORY_NAV_ID)) {
    const nav = document.createElement('button');
    nav.className = 'nav-item';
    nav.id = HISTORY_NAV_ID;
    nav.dataset.view = HISTORY_VIEW_ID;
    nav.type = 'button';
    nav.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 9.3 6.3l-1.9.7A8 8 0 1 1 17 5.1V9h2V2h-7v2h3.4A9.9 9.9 0 0 0 12 2Zm-1 5v6l5 3 1-1.7-4-2.3V7h-2Z"/></svg>Histórico';
    settingsNav.insertAdjacentElement('beforebegin', nav);
  }

  const content = document.querySelector('main.content');
  if (content && !document.getElementById(HISTORY_VIEW_ID)) {
    const view = document.createElement('section');
    view.className = 'view';
    view.id = HISTORY_VIEW_ID;
    view.innerHTML = `
      <div class="section-heading"><div><h2>Histórico</h2><p class="muted">Um registro por lançamento, do mais recente para o mais antigo.</p></div></div>
      <section class="meg-history-panel">
        <div class="meg-history-header"><div><h2>Lançamentos recentes</h2><p>Alterações repetidas do mesmo lançamento aparecem consolidadas.</p></div><strong id="megHistoryCount">0 lançamentos</strong></div>
        <div class="meg-history-filters">
          <input id="megHistorySearch" type="search" placeholder="Buscar descrição, usuário ou pagamento" aria-label="Buscar no histórico" />
          <select id="megHistoryAction" aria-label="Filtrar por ação"><option value="">Todas as ações</option><option value="CREATED">Criados</option><option value="UPDATED">Alterados</option><option value="DELETED">Excluídos</option><option value="RECOVERED">Recuperados</option></select>
          <select id="megHistoryUser" aria-label="Filtrar por usuário"><option value="">Todos os usuários</option></select>
        </div>
        <div class="meg-activity-list" id="megHistoryList"></div>
        <div class="meg-history-more" id="megHistoryMore" hidden><button class="button ghost" type="button">Mostrar mais</button></div>
      </section>`;
    content.appendChild(view);
  }

  const dashboard = document.querySelector('#dashboard');
  if (dashboard && !document.getElementById(RECENT_SECTION_ID)) {
    const recent = document.createElement('section');
    recent.className = 'meg-recent-activity';
    recent.id = RECENT_SECTION_ID;
    recent.innerHTML = `
      <div class="meg-recent-activity-header"><div><h3>Lançamentos recentes</h3><p>Um registro consolidado para cada movimentação.</p></div><button class="button ghost" type="button" data-view-link="${HISTORY_VIEW_ID}">Ver histórico completo</button></div>
      <div class="meg-activity-list" id="megRecentActivityList"></div>`;
    dashboard.appendChild(recent);
  }

  bindFilters();
  renderAll();
}

function activateHistoryView() {
  ensureShell();
  renderAll();
  const view = document.getElementById(HISTORY_VIEW_ID);
  const nav = document.getElementById(HISTORY_NAV_ID);
  if (!view) return false;

  document.querySelectorAll('main.content > .view').forEach((item) => item.classList.remove('active'));
  view.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  nav?.classList.add('active');
  document.getElementById('primarySidebar')?.classList.remove('open', 'mobile-open', 'is-open');
  document.getElementById('sidebarBackdrop')?.classList.remove('active', 'visible');
  requestAnimationFrame(renderAll);
  return true;
}

let filtersBound = false;
let historyVisibleLimit = 30;
function bindFilters() {
  if (filtersBound) return;
  const search = document.querySelector('#megHistorySearch');
  const action = document.querySelector('#megHistoryAction');
  const user = document.querySelector('#megHistoryUser');
  if (!search || !action || !user) return;
  filtersBound = true;
  [search, action, user].forEach((control) => {
    control.addEventListener('input', () => { historyVisibleLimit = 30; renderHistory(); });
    control.addEventListener('change', () => { historyVisibleLimit = 30; renderHistory(); });
  });
  document.querySelector('#megHistoryMore button')?.addEventListener('click', () => {
    historyVisibleLimit += 30;
    renderHistory();
  });
  document.getElementById(HISTORY_NAV_ID)?.addEventListener('click', () => requestAnimationFrame(renderAll));
}

function filteredLogs() {
  const search = String(document.querySelector('#megHistorySearch')?.value || '').trim().toLocaleUpperCase('pt-BR');
  const action = document.querySelector('#megHistoryAction')?.value || '';
  const user = document.querySelector('#megHistoryUser')?.value || '';
  return logs().filter((item) => {
    if (action && item.action !== action) return false;
    if (user && item.userId !== user) return false;
    if (!search) return true;
    const transaction = item.transaction || {};
    return [item.userName, transaction.description, transaction.paymentMethod, transaction.group, typeLabel(transaction.type)]
      .some((value) => String(value || '').toLocaleUpperCase('pt-BR').includes(search));
  });
}

function refreshUserFilter(items) {
  const select = document.querySelector('#megHistoryUser');
  if (!select) return;
  const selected = select.value;
  const users = new Map();
  items.forEach((item) => {
    if (item.userId) users.set(item.userId, item.userName || 'Usuário MEG');
  });
  select.innerHTML = '<option value="">Todos os usuários</option>' + [...users.entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'pt-BR'))
    .map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join('');
  if (users.has(selected)) select.value = selected;
}

function renderRecent() {
  const container = document.querySelector('#megRecentActivityList');
  if (!container) return;
  const recent = logs().slice(0, 3);
  container.innerHTML = recent.length
    ? recent.map((item) => activityCard(item, { compact: true })).join('')
    : '<div class="meg-activity-empty">As próximas inclusões e alterações aparecerão aqui.</div>';
}

function renderHistory() {
  const all = logs();
  refreshUserFilter(all);
  const items = filteredLogs();
  const container = document.querySelector('#megHistoryList');
  const count = document.querySelector('#megHistoryCount');
  const more = document.querySelector('#megHistoryMore');
  if (count) count.textContent = `${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'}`;
  if (!container) return;
  container.innerHTML = items.length
    ? items.slice(0, historyVisibleLimit).map((item) => activityCard(item)).join('')
    : '<div class="meg-activity-empty">Nenhum lançamento encontrado para os filtros selecionados.</div>';
  if (more) more.hidden = items.length <= historyVisibleLimit;
}

function renderAll() {
  renderRecent();
  renderHistory();
}

function renderUntilStateReady(attempt = 0) {
  ensureShell();
  renderAll();
  const state = activityState();
  if ((state && window.MEG_APP?.getStateRef?.()) || attempt >= READY_RETRY_LIMIT) return;
  window.setTimeout(() => renderUntilStateReady(attempt + 1), READY_RETRY_MS);
}

function handleHistoryNavigation(event) {
  const link = event.target?.closest?.(`[data-view-link="${HISTORY_VIEW_ID}"]`);
  if (!link) return;
  event.preventDefault();
  activateHistoryView();
}

function start() {
  ensureShell();
  renderUntilStateReady();
  document.addEventListener('click', handleHistoryNavigation);
  window.addEventListener('meg:activity-log-updated', renderAll);
  window.addEventListener('meg:cloud-save-confirmed', renderAll);
  window.addEventListener('focus', renderAll);
  window.addEventListener('pageshow', renderAll);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderAll();
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

if (typeof window !== 'undefined') window.MEG_ACTIVITY_HISTORY = {
  render: renderAll,
  open: activateHistoryView,
  logs,
};
