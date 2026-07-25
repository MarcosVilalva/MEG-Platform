import * as echarts from 'echarts';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR');
const STORAGE_KEY = 'meg-financas-state-v4-paid-fixes';

const state = {
  initialized: false,
  charts: new Map(),
  filter: {
    type: 'all',
    status: 'all',
    account: 'all',
    group: 'all',
    payment: 'all',
    search: '',
    pivot: 'group',
  },
};

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function parseMoney(text) {
  const normalized = String(text ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function transactionValue(item, type) {
  if (item.type !== type) return 0;
  const explicit = type === 'income' ? item.incomeAmount : item.expenseAmount;
  return Number(explicit ?? item.amount ?? 0) || 0;
}

function isPaid(item) {
  return item.status === 'paid' || normalize(item.situation) === 'PAGO';
}

function isPending(item) {
  return item.status === 'pending' || normalize(item.situation) === 'PENDENTE';
}

function isBenefit(item) {
  if (item.financialScope === 'benefit') return true;
  const text = normalize(`${item.account || ''} ${item.paymentMethod || ''} ${item.modality || ''}`);
  return text.includes('VEROCARD') || text.includes('ALIMENTACAO') || text.includes('BENEFICIO');
}

function getAppState() {
  const direct = window.MEG_APP?.getState?.();
  if (direct?.transactions) return direct;
  const environment = document.body.dataset.appEnvironment || 'production';
  const suffix = environment === 'production' ? '' : `-${environment}`;
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_KEY}${suffix}`) || 'null') || { transactions: [] };
  } catch {
    return { transactions: [] };
  }
}

function selectedPeriod() {
  const mode = document.querySelector('#periodMode')?.value || 'month';
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  if (mode === 'all') return { start: '', end: '', label: 'Todo o histórico' };
  if (mode === 'year') {
    const year = document.querySelector('#yearFilter')?.value || String(today.getFullYear());
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: year };
  }
  if (mode === 'range') {
    const start = document.querySelector('#startDateFilter')?.value || '';
    const end = document.querySelector('#endDateFilter')?.value || '';
    return { start, end, label: start && end ? `${formatDate(start)} a ${formatDate(end)}` : 'Intervalo selecionado' };
  }
  const month = document.querySelector('#monthFilter')?.value || currentMonth;
  const [year, monthNumber] = month.split('-').map(Number);
  const endDay = new Date(year, monthNumber, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(endDay).padStart(2, '0')}`, label: formatMonth(month) };
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatMonth(value) {
  if (!value) return '—';
  const [year, month] = String(value).slice(0, 7).split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function inPeriod(item, period) {
  const date = String(item.date || '');
  return date && (!period.start || date >= period.start) && (!period.end || date <= period.end);
}

function uniqueValues(items, resolver) {
  return [...new Set(items.map(resolver).map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function applyFilters(items) {
  const search = normalize(state.filter.search);
  return items.filter((item) => {
    if (state.filter.type !== 'all' && item.type !== state.filter.type) return false;
    if (state.filter.status === 'paid' && !isPaid(item)) return false;
    if (state.filter.status === 'pending' && !isPending(item)) return false;
    if (state.filter.account !== 'all' && normalize(item.financialAccountName || item.account) !== normalize(state.filter.account)) return false;
    if (state.filter.group !== 'all' && normalize(item.group || item.category) !== normalize(state.filter.group)) return false;
    if (state.filter.payment !== 'all' && normalize(item.paymentMethod || item.account) !== normalize(state.filter.payment)) return false;
    if (search) {
      const haystack = normalize([item.description, item.group, item.category, item.account, item.paymentMethod, item.notes].join(' '));
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function ensureSortButton() {
  const table = document.querySelector('#transactions .transactions-table');
  if (!table) return;
  table.classList.add('meg-premium-table');
  const header = table.querySelector('thead tr:first-child th:first-child');
  const filterCell = table.querySelector('thead .column-filter-row th:first-child');
  const select = filterCell?.querySelector('select[data-date-sort], select');
  const generalSort = document.querySelector('#transactionSortFilter');
  if (!header || !filterCell || !generalSort) return;

  if (!header.querySelector('.meg-date-sort-button')) {
    const label = document.createElement('span');
    label.className = 'meg-column-heading';
    label.innerHTML = '<span>Vencimento</span>';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'meg-date-sort-button';
    button.setAttribute('aria-label', 'Alternar ordem das datas');
    button.setAttribute('title', 'Ordenar datas: mais recentes ou mais antigas');
    label.append(button);
    header.textContent = '';
    header.append(label);
    button.addEventListener('click', () => {
      const next = generalSort.value === 'date_asc' ? 'date_desc' : 'date_asc';
      generalSort.value = next;
      generalSort.dispatchEvent(new Event('change', { bubbles: true }));
      updateSortButton();
    });
  }

  if (select) select.classList.add('meg-hidden-date-sort');
  updateSortButton();
}

function updateSortButton() {
  const button = document.querySelector('.meg-date-sort-button');
  const generalSort = document.querySelector('#transactionSortFilter');
  if (!button || !generalSort) return;
  const ascending = generalSort.value === 'date_asc';
  button.dataset.direction = ascending ? 'asc' : 'desc';
  button.innerHTML = ascending
    ? '<span class="sort-letters">A<small>Z</small></span><span class="sort-arrow">↓</span>'
    : '<span class="sort-letters">Z<small>A</small></span><span class="sort-arrow">↓</span>';
  button.title = ascending ? 'Datas mais antigas primeiro' : 'Datas mais recentes primeiro';
}

function upgradeTransactionTable() {
  const table = document.querySelector('#transactions .transactions-table');
  if (!table) return;
  ensureSortButton();
  const headers = table.querySelectorAll('thead tr:first-child th');
  const names = ['Vencimento', 'Compra', 'Dia', 'Tipo', 'Descrição', 'Receita', 'Categoria', 'Grupo', 'Despesa', 'Pagamento', 'Situação', 'Modalidade', 'Observações', ''];
  headers.forEach((header, index) => {
    if (index === 0) return;
    if (names[index] !== undefined) header.textContent = names[index];
  });

  table.querySelectorAll('tbody tr').forEach((row) => {
    row.classList.add('meg-data-row');
    const cells = row.children;
    if (cells[3]) cells[3].classList.add('meg-type-cell');
    if (cells[4]) cells[4].classList.add('meg-description-cell');
    if (cells[9]) cells[9].classList.add('meg-payment-cell');
    if (cells[10]) cells[10].classList.add('meg-status-cell');
    if (cells[11]) cells[11].classList.add('meg-modality-cell');
    [9, 10, 11].forEach((index) => {
      const cell = cells[index];
      if (!cell || cell.querySelector('.meg-chip')) return;
      const text = cell.textContent.trim();
      if (!text) return;
      cell.textContent = '';
      const chip = document.createElement('span');
      chip.className = `meg-chip meg-chip-${index}`;
      chip.textContent = text;
      cell.append(chip);
    });
  });

  ensureTableToolbar();
}

function ensureTableToolbar() {
  const panel = document.querySelector('#transactions .table-panel');
  if (!panel || panel.querySelector('.meg-table-toolbar')) return;
  const toolbar = document.createElement('div');
  toolbar.className = 'meg-table-toolbar';
  toolbar.innerHTML = `
    <div>
      <strong>Movimentações financeiras</strong>
      <span>Ordene, filtre e analise seus lançamentos</span>
    </div>
    <div class="meg-table-actions">
      <button type="button" data-density="comfortable" class="is-active">Confortável</button>
      <button type="button" data-density="compact">Compacta</button>
      <button type="button" id="megToggleColumns">Colunas</button>
    </div>`;
  panel.prepend(toolbar);
  toolbar.addEventListener('click', (event) => {
    const density = event.target.closest('[data-density]');
    if (density) {
      panel.dataset.density = density.dataset.density;
      toolbar.querySelectorAll('[data-density]').forEach((button) => button.classList.toggle('is-active', button === density));
    }
    if (event.target.closest('#megToggleColumns')) toggleColumnMenu(toolbar, panel);
  });
}

function toggleColumnMenu(toolbar, panel) {
  let menu = toolbar.querySelector('.meg-column-menu');
  if (menu) {
    menu.remove();
    return;
  }
  const table = panel.querySelector('table');
  const labels = [...table.querySelectorAll('thead tr:first-child th')].map((th) => th.textContent.trim() || 'Detalhes');
  menu = document.createElement('div');
  menu.className = 'meg-column-menu';
  menu.innerHTML = labels.map((label, index) => `<label><input type="checkbox" data-column-index="${index}" checked><span>${escapeHtml(label)}</span></label>`).join('');
  toolbar.append(menu);
  menu.addEventListener('change', (event) => {
    const index = Number(event.target.dataset.columnIndex);
    table.querySelectorAll('tr').forEach((row) => row.children[index]?.classList.toggle('meg-column-hidden', !event.target.checked));
  });
}

function analyticsMarkup() {
  return `
    <section class="meg-analytics-2" id="megAnalytics2">
      <header class="meg-analytics-hero">
        <div>
          <small>MEG ANALYTICS 2.0</small>
          <h3>Seu dinheiro, explicado com clareza</h3>
          <p>Saldo atual, compromissos, tendências e oportunidades em uma única visão interativa.</p>
        </div>
        <div class="meg-live-badge"><i></i> Dados em tempo real</div>
      </header>

      <section class="meg-segment-bar" aria-label="Segmentações da análise">
        <label><span>Tipo</span><select data-meg-filter="type"><option value="all">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></label>
        <label><span>Situação</span><select data-meg-filter="status"><option value="all">Todas</option><option value="paid">Pagas</option><option value="pending">Pendentes</option></select></label>
        <label><span>Conta</span><select data-meg-filter="account"><option value="all">Todas</option></select></label>
        <label><span>Grupo</span><select data-meg-filter="group"><option value="all">Todos</option></select></label>
        <label><span>Pagamento</span><select data-meg-filter="payment"><option value="all">Todos</option></select></label>
        <label class="meg-search-segment"><span>Pesquisar</span><input data-meg-filter="search" type="search" placeholder="Descrição, grupo ou observação"></label>
        <button type="button" id="megClearAnalyticsFilters">Limpar filtros</button>
      </section>

      <section class="meg-kpi-grid">
        <article class="meg-kpi-card primary"><span>Saldo monetário atual</span><strong id="megCurrentBalance">R$ 0,00</strong><small>Fonte única: painel monetário</small></article>
        <article class="meg-kpi-card warning"><span>Despesas pendentes</span><strong id="megPendingExpenses">R$ 0,00</strong><small id="megPendingCount">0 compromissos</small></article>
        <article class="meg-kpi-card success"><span>Saldo livre após compromissos</span><strong id="megFreeBalance">R$ 0,00</strong><small id="megFreeBalanceNote">Saldo atual menos pendências</small></article>
        <article class="meg-kpi-card"><span>Taxa de economia</span><strong id="megSavingsRate">0%</strong><small>Resultado sobre receitas monetárias</small></article>
      </section>

      <section class="meg-chart-grid">
        <article class="meg-chart-card meg-chart-wide"><header><div><small>EVOLUÇÃO FINANCEIRA</small><h4>Saldo e movimentações por mês</h4></div><span id="megTrendSummary">Período selecionado</span></header><div class="meg-chart" id="megBalanceTrendChart"></div></article>
        <article class="meg-chart-card"><header><div><small>COMPOSIÇÃO</small><h4>Para onde o dinheiro foi</h4></div><span>Clique para filtrar</span></header><div class="meg-chart" id="megExpenseDonutChart"></div></article>
        <article class="meg-chart-card"><header><div><small>CONCENTRAÇÃO</small><h4>Pareto dos gastos</h4></div><span>Impacto acumulado</span></header><div class="meg-chart" id="megParetoChart"></div></article>
        <article class="meg-chart-card meg-chart-wide"><header><div><small>AGENDA FINANCEIRA</small><h4>Fluxo diário e risco de saldo</h4></div><span id="megCashflowSummary">Entradas e saídas</span></header><div class="meg-chart" id="megDailyCashflowChart"></div></article>
      </section>

      <section class="meg-pivot-card">
        <header>
          <div><small>TABELA DINÂMICA</small><h4>Detalhamento gerencial</h4></div>
          <label>Agrupar por <select id="megPivotDimension"><option value="group">Grupo</option><option value="payment">Pagamento</option><option value="account">Conta</option><option value="status">Situação</option><option value="month">Mês</option></select></label>
        </header>
        <div class="meg-pivot-scroll"><table><thead><tr><th>Dimensão</th><th>Lançamentos</th><th>Receitas</th><th>Despesas</th><th>Resultado</th><th>% das despesas</th></tr></thead><tbody id="megPivotRows"></tbody><tfoot id="megPivotFoot"></tfoot></table></div>
      </section>
    </section>`;
}

function ensureAnalyticsPanel() {
  const analytics = document.querySelector('#analytics');
  if (!analytics || analytics.querySelector('#megAnalytics2')) return;
  const heading = analytics.querySelector('.section-heading');
  heading?.insertAdjacentHTML('afterend', analyticsMarkup());
  wireAnalyticsControls();
}

function wireAnalyticsControls() {
  document.querySelectorAll('[data-meg-filter]').forEach((control) => {
    control.addEventListener('input', () => {
      state.filter[control.dataset.megFilter] = control.value;
      renderAnalytics2();
    });
  });
  document.querySelector('#megClearAnalyticsFilters')?.addEventListener('click', () => {
    state.filter = { type: 'all', status: 'all', account: 'all', group: 'all', payment: 'all', search: '', pivot: state.filter.pivot };
    document.querySelectorAll('[data-meg-filter]').forEach((control) => { control.value = state.filter[control.dataset.megFilter]; });
    renderAnalytics2();
  });
  document.querySelector('#megPivotDimension')?.addEventListener('change', (event) => {
    state.filter.pivot = event.target.value;
    renderPivotTable(filteredAnalyticsTransactions());
  });
}

function populateSegments(items) {
  const mappings = {
    account: uniqueValues(items, (item) => item.financialAccountName || item.account),
    group: uniqueValues(items, (item) => item.group || item.category),
    payment: uniqueValues(items, (item) => item.paymentMethod || item.account),
  };
  Object.entries(mappings).forEach(([key, values]) => {
    const select = document.querySelector(`[data-meg-filter="${key}"]`);
    if (!select) return;
    const label = key === 'group' ? 'Todos' : 'Todas';
    const current = state.filter[key];
    select.innerHTML = `<option value="all">${label}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
    if (values.includes(current)) select.value = current;
    else state.filter[key] = 'all';
  });
}

function filteredAnalyticsTransactions() {
  const period = selectedPeriod();
  const appState = getAppState();
  const monetary = (appState.transactions || []).filter((item) => !isBenefit(item) && inPeriod(item, period));
  return applyFilters(monetary);
}

function currentMonetaryBalance(allTransactions) {
  const displayed = parseMoney(document.querySelector('#monetarySituationMetric')?.textContent);
  if (displayed || document.querySelector('#monetarySituationMetric')) return displayed;
  const today = new Date().toISOString().slice(0, 10);
  return allTransactions
    .filter((item) => !isBenefit(item) && String(item.date || '') <= today && (item.type === 'income' || isPaid(item)))
    .reduce((sum, item) => sum + transactionValue(item, 'income') - transactionValue(item, 'expense'), 0);
}

function updateCorrectedHealth(allTransactions) {
  const period = selectedPeriod();
  const balance = currentMonetaryBalance(allTransactions);
  const pendingItems = allTransactions.filter((item) => !isBenefit(item) && item.type === 'expense' && isPending(item) && inPeriod(item, period));
  const pending = pendingItems.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const free = balance - pending;

  const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
  setText('#megCurrentBalance', money.format(balance));
  setText('#megPendingExpenses', money.format(pending));
  setText('#megPendingCount', `${number.format(pendingItems.length)} compromisso(s) no recorte`);
  setText('#megFreeBalance', money.format(free));
  setText('#megFreeBalanceNote', free >= 0 ? 'Compromissos cobertos pelo saldo atual' : `Faltam ${money.format(Math.abs(free))}`);

  setText('#currentHealthAvailableMetric', money.format(balance));
  setText('#currentHealthPendingMetric', money.format(pending));
  setText('#currentHealthClosingMetric', money.format(free));
  setText('#analyticsSavingsMetric', money.format(free));
  setText('#analyticsSavingsLabel', free >= 0 ? 'Saldo livre após compromissos' : 'Necessidade para cobrir compromissos');
  setText('#analyticsSavingsTrend', 'Saldo monetário atual menos despesas pendentes');
  setText('#analyticsHealthTitle', free >= 0 ? `Você preserva ${money.format(free)} após os compromissos` : `Atenção: faltam ${money.format(Math.abs(free))}`);
  setText('#analyticsHealthMessage', `${money.format(balance)} de saldo monetário atual − ${money.format(pending)} de despesas pendentes = ${money.format(free)}.`);

  const hero = document.querySelector('#analyticsDecisionHero');
  hero?.classList.toggle('risk', free < 0);
  hero?.classList.toggle('healthy', free >= 0);
  return { balance, pending, free, pendingItems };
}

function aggregateByMonth(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = String(item.date || '').slice(0, 7);
    if (!key) return;
    const current = map.get(key) || { month: key, income: 0, expense: 0, paid: 0, pending: 0 };
    current.income += transactionValue(item, 'income');
    current.expense += transactionValue(item, 'expense');
    if (item.type === 'expense' && isPaid(item)) current.paid += transactionValue(item, 'expense');
    if (item.type === 'expense' && isPending(item)) current.pending += transactionValue(item, 'expense');
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function aggregateExpenses(items, limit = 12) {
  const map = new Map();
  items.filter((item) => item.type === 'expense').forEach((item) => {
    const key = item.group || item.category || 'Sem grupo';
    map.set(key, (map.get(key) || 0) + transactionValue(item, 'expense'));
  });
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

function chart(id) {
  const element = document.getElementById(id);
  if (!element) return null;
  if (!state.charts.has(id)) state.charts.set(id, echarts.init(element, null, { renderer: 'canvas' }));
  return state.charts.get(id);
}

function renderCharts(items, health) {
  const monthly = aggregateByMonth(items);
  let running = 0;
  const months = monthly.map((item) => formatMonth(item.month).replace(/ de /g, '/'));
  const balances = monthly.map((item) => (running += item.income - item.expense));
  chart('megBalanceTrendChart')?.setOption({
    animationDuration: 900,
    tooltip: { trigger: 'axis', valueFormatter: (value) => money.format(value) },
    legend: { data: ['Receitas', 'Despesas', 'Resultado acumulado'], bottom: 0 },
    grid: { left: 55, right: 24, top: 36, bottom: 58 },
    xAxis: { type: 'category', data: months, axisLine: { lineStyle: { color: '#d8e5e1' } } },
    yAxis: { type: 'value', axisLabel: { formatter: (value) => `R$ ${Math.round(value / 1000)}k` }, splitLine: { lineStyle: { color: '#edf3f1' } } },
    series: [
      { name: 'Receitas', type: 'bar', data: monthly.map((item) => item.income), itemStyle: { color: '#20b486', borderRadius: [7, 7, 0, 0] }, barMaxWidth: 26 },
      { name: 'Despesas', type: 'bar', data: monthly.map((item) => item.expense), itemStyle: { color: '#f56f6f', borderRadius: [7, 7, 0, 0] }, barMaxWidth: 26 },
      { name: 'Resultado acumulado', type: 'line', data: balances, smooth: true, symbolSize: 8, lineStyle: { width: 4, color: '#0a5c50' }, itemStyle: { color: '#0a5c50' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(10,92,80,.28)' }, { offset: 1, color: 'rgba(10,92,80,.02)' }]) } },
    ],
  }, true);

  const expenses = aggregateExpenses(items);
  chart('megExpenseDonutChart')?.setOption({
    animationDuration: 1000,
    tooltip: { trigger: 'item', formatter: ({ name, value, percent }) => `${escapeHtml(name)}<br><b>${money.format(value)}</b> · ${percent}%` },
    series: [{
      type: 'pie', radius: ['56%', '82%'], center: ['50%', '48%'], padAngle: 3,
      itemStyle: { borderRadius: 9, borderColor: '#fff', borderWidth: 3 },
      label: { show: false }, data: expenses,
    }],
    graphic: [{ type: 'text', left: 'center', top: '42%', style: { text: money.format(expenses.reduce((sum, item) => sum + item.value, 0)), font: '800 18px Inter', fill: '#173c35', textAlign: 'center' } }, { type: 'text', left: 'center', top: '52%', style: { text: 'em despesas', font: '12px Inter', fill: '#6c7e79', textAlign: 'center' } }],
  }, true);
  const donut = chart('megExpenseDonutChart');
  donut?.off('click');
  donut?.on('click', ({ name }) => {
    state.filter.group = name;
    const select = document.querySelector('[data-meg-filter="group"]');
    if (select) select.value = name;
    renderAnalytics2();
  });

  const totalExpense = expenses.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;
  chart('megParetoChart')?.setOption({
    animationDuration: 850,
    tooltip: { trigger: 'axis' },
    grid: { left: 90, right: 45, top: 24, bottom: 35 },
    xAxis: [{ type: 'value', axisLabel: { formatter: (value) => `${Math.round(value / 1000)}k` }, splitLine: { show: false } }, { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { show: false } }],
    yAxis: { type: 'category', inverse: true, data: expenses.map((item) => item.name), axisLabel: { width: 110, overflow: 'truncate' } },
    series: [
      { type: 'bar', data: expenses.map((item) => item.value), barWidth: 16, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#0a5c50' }, { offset: 1, color: '#26c3a4' }]), borderRadius: [0, 8, 8, 0] } },
      { type: 'line', xAxisIndex: 1, data: expenses.map((item) => totalExpense ? ((cumulative += item.value) / totalExpense) * 100 : 0), smooth: true, symbolSize: 7, lineStyle: { color: '#ff9f43', width: 3 }, itemStyle: { color: '#ff9f43' } },
    ],
  }, true);

  const byDay = new Map();
  items.forEach((item) => {
    const key = item.date;
    if (!key) return;
    const current = byDay.get(key) || { income: 0, expense: 0 };
    current.income += transactionValue(item, 'income');
    current.expense += transactionValue(item, 'expense');
    byDay.set(key, current);
  });
  const days = [...byDay.keys()].sort();
  let dailyRunning = health.balance - items.filter((item) => item.type === 'income').reduce((sum, item) => sum + transactionValue(item, 'income'), 0)
    + items.filter((item) => item.type === 'expense' && isPaid(item)).reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const dailyBalance = days.map((day) => {
    const entry = byDay.get(day);
    dailyRunning += entry.income - entry.expense;
    return dailyRunning;
  });
  chart('megDailyCashflowChart')?.setOption({
    animationDuration: 1000,
    tooltip: { trigger: 'axis', valueFormatter: (value) => money.format(value) },
    legend: { data: ['Entradas', 'Saídas', 'Saldo projetado'], bottom: 0 },
    grid: { left: 58, right: 24, top: 34, bottom: 55 },
    xAxis: { type: 'category', data: days.map((day) => formatDate(day).slice(0, 5)), boundaryGap: false },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf3f1' } } },
    series: [
      { name: 'Entradas', type: 'bar', data: days.map((day) => byDay.get(day).income), itemStyle: { color: '#33c79b' }, barMaxWidth: 18 },
      { name: 'Saídas', type: 'bar', data: days.map((day) => -byDay.get(day).expense), itemStyle: { color: '#ff7878' }, barMaxWidth: 18 },
      { name: 'Saldo projetado', type: 'line', smooth: true, data: dailyBalance, symbol: 'circle', symbolSize: 7, lineStyle: { width: 4, color: '#315efb' }, itemStyle: { color: '#315efb' }, markLine: { silent: true, data: [{ yAxis: 0 }], lineStyle: { color: '#ef4444', type: 'dashed' } } },
    ],
  }, true);

  document.querySelector('#megTrendSummary').textContent = `${monthly.length} mês(es) analisado(s)`;
  document.querySelector('#megCashflowSummary').textContent = `${days.length} dia(s) com movimentação`;
}

function pivotKey(item, dimension) {
  if (dimension === 'payment') return item.paymentMethod || item.account || 'Não informado';
  if (dimension === 'account') return item.financialAccountName || item.account || 'Não informada';
  if (dimension === 'status') return isPaid(item) ? 'Pago' : isPending(item) ? 'Pendente' : 'Outro';
  if (dimension === 'month') return formatMonth(String(item.date || '').slice(0, 7));
  return item.group || item.category || 'Sem grupo';
}

function renderPivotTable(items) {
  const dimension = state.filter.pivot;
  const map = new Map();
  items.forEach((item) => {
    const key = pivotKey(item, dimension);
    const current = map.get(key) || { label: key, count: 0, income: 0, expense: 0 };
    current.count += 1;
    current.income += transactionValue(item, 'income');
    current.expense += transactionValue(item, 'expense');
    map.set(key, current);
  });
  const rows = [...map.values()].sort((a, b) => b.expense - a.expense || b.income - a.income);
  const totals = rows.reduce((acc, row) => ({ count: acc.count + row.count, income: acc.income + row.income, expense: acc.expense + row.expense }), { count: 0, income: 0, expense: 0 });
  const body = document.querySelector('#megPivotRows');
  const foot = document.querySelector('#megPivotFoot');
  if (!body || !foot) return;
  body.innerHTML = rows.length ? rows.map((row) => {
    const result = row.income - row.expense;
    const share = totals.expense ? (row.expense / totals.expense) * 100 : 0;
    return `<tr><td><strong>${escapeHtml(row.label)}</strong><span class="meg-mini-bar"><i style="width:${Math.min(share, 100)}%"></i></span></td><td>${number.format(row.count)}</td><td class="positive">${money.format(row.income)}</td><td class="negative">${money.format(row.expense)}</td><td class="${result >= 0 ? 'positive' : 'negative'}">${money.format(result)}</td><td>${share.toFixed(1)}%</td></tr>`;
  }).join('') : '<tr><td colspan="6" class="meg-empty">Nenhum dado para os filtros selecionados.</td></tr>';
  foot.innerHTML = `<tr><th>Total</th><th>${number.format(totals.count)}</th><th>${money.format(totals.income)}</th><th>${money.format(totals.expense)}</th><th>${money.format(totals.income - totals.expense)}</th><th>100%</th></tr>`;
}

function renderAnalytics2() {
  ensureAnalyticsPanel();
  const appState = getAppState();
  const allTransactions = appState.transactions || [];
  const period = selectedPeriod();
  const periodMonetary = allTransactions.filter((item) => !isBenefit(item) && inPeriod(item, period));
  populateSegments(periodMonetary);
  const items = applyFilters(periodMonetary);
  const health = updateCorrectedHealth(allTransactions);
  const income = items.reduce((sum, item) => sum + transactionValue(item, 'income'), 0);
  const expense = items.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const savingsElement = document.querySelector('#megSavingsRate');
  if (savingsElement) savingsElement.textContent = `${savingsRate.toFixed(1)}%`;
  renderCharts(items, health);
  renderPivotTable(items);
}

function bindGlobalRefresh() {
  ['#periodMode', '#monthFilter', '#yearFilter', '#startDateFilter', '#endDateFilter'].forEach((selector) => {
    document.querySelector(selector)?.addEventListener('change', () => setTimeout(renderAnalytics2, 40));
  });
  document.querySelector('#transactionSortFilter')?.addEventListener('change', updateSortButton);
  window.addEventListener('resize', () => state.charts.forEach((instance) => instance.resize()));
}

function observeApplication() {
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      upgradeTransactionTable();
      if (document.querySelector('#analytics.active')) renderAnalytics2();
    });
  });
  const content = document.querySelector('.content') || document.body;
  observer.observe(content, { childList: true, subtree: true, characterData: true });
}

export function initializeUxEnhancements() {
  if (state.initialized) return;
  state.initialized = true;
  const boot = () => {
    ensureAnalyticsPanel();
    upgradeTransactionTable();
    bindGlobalRefresh();
    observeApplication();
    renderAnalytics2();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else setTimeout(boot, 0);
}
