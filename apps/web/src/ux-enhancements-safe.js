import * as echarts from 'echarts';

const MEG_CHART_PALETTE = ['#56ebc9', '#4db8ff', '#30d59a', '#ffc166', '#b58cff', '#ff6f7b', '#39c8d2'];
echarts.registerTheme('meg-finance-system', {
  color: MEG_CHART_PALETTE,
  backgroundColor: 'transparent',
  textStyle: { color: '#b8ced7', fontFamily: 'Inter, Segoe UI, sans-serif' },
  title: { textStyle: { color: '#f0fbff' }, subtextStyle: { color: '#91a9ba' } },
  legend: { textStyle: { color: '#91a9ba' }, pageTextStyle: { color: '#91a9ba' } },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#28495a' } },
    axisTick: { lineStyle: { color: '#28495a' } },
    axisLabel: { color: '#91a9ba' },
    splitLine: { lineStyle: { color: 'rgba(116, 175, 190, .14)' } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: '#28495a' } },
    axisTick: { lineStyle: { color: '#28495a' } },
    axisLabel: { color: '#91a9ba' },
    splitLine: { lineStyle: { color: 'rgba(116, 175, 190, .14)' } },
  },
  tooltip: {
    backgroundColor: 'rgba(7, 23, 37, .96)',
    borderColor: 'rgba(86, 235, 201, .32)',
    textStyle: { color: '#effbff' },
    extraCssText: 'box-shadow:0 18px 40px rgba(0,6,16,.38);border-radius:12px;backdrop-filter:blur(12px)',
  },
});

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const integer = new Intl.NumberFormat('pt-BR');
const runtime = {
  ready: false,
  signature: '',
  tableSignature: '',
  charts: new Map(),
  filters: { type: 'all', status: 'all', account: 'all', group: 'all', payment: 'all', search: '', pivot: 'group' },
};

const norm = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const html = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const valueOf = (item, type) => item.type === type ? Number((type === 'income' ? item.incomeAmount : item.expenseAmount) ?? item.amount ?? 0) || 0 : 0;
const paid = (item) => item.status === 'paid' || norm(item.situation) === 'PAGO';
const pending = (item) => item.status === 'pending' || norm(item.situation) === 'PENDENTE';
const benefit = (item) => item.financialScope === 'benefit' || /VEROCARD|BENEFICIO|ALIMENTACAO/.test(norm(`${item.account || ''} ${item.paymentMethod || ''} ${item.modality || ''}`));

function appState() {
  return window.MEG_APP?.getState?.() || window.MEG_REAL_STATE || { transactions: [] };
}

function formatDate(iso) {
  const [year, month, day] = String(iso || '').slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '—';
}

function formatMonth(month) {
  if (!month) return '—';
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(year, number - 1, 1));
}

function period() {
  const mode = document.querySelector('#periodMode')?.value || 'month';
  const now = new Date();
  if (mode === 'all') return { start: '', end: '' };
  if (mode === 'year') {
    const year = document.querySelector('#yearFilter')?.value || String(now.getFullYear());
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  if (mode === 'range') return { start: document.querySelector('#startDateFilter')?.value || '', end: document.querySelector('#endDateFilter')?.value || '' };
  const month = document.querySelector('#monthFilter')?.value || now.toISOString().slice(0, 7);
  const [year, number] = month.split('-').map(Number);
  return { start: `${month}-01`, end: `${month}-${String(new Date(year, number, 0).getDate()).padStart(2, '0')}` };
}

function inPeriod(item, selected) {
  const date = String(item.date || '');
  return date && (!selected.start || date >= selected.start) && (!selected.end || date <= selected.end);
}

function parseCurrency(text) {
  const parsed = Number(String(text || '').replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function monetaryBalance(transactions) {
  const metric = document.querySelector('#monetarySituationMetric');
  if (metric && !/CARREGANDO/i.test(metric.textContent || '')) return parseCurrency(metric.textContent);
  const today = new Date().toISOString().slice(0, 10);
  return transactions.filter((item) => !benefit(item) && String(item.date || '') <= today)
    .reduce((sum, item) => sum + valueOf(item, 'income') - (paid(item) ? valueOf(item, 'expense') : 0), 0);
}

function signature(transactions) {
  const selected = period();
  const last = transactions.at(-1);
  return [transactions.length, last?.id, last?.date, last?.amount, selected.start, selected.end, ...Object.values(runtime.filters)].join('|');
}

function filteredTransactions(transactions) {
  const selected = period();
  const search = norm(runtime.filters.search);
  return transactions.filter((item) => !benefit(item) && inPeriod(item, selected)).filter((item) => {
    if (runtime.filters.type !== 'all' && item.type !== runtime.filters.type) return false;
    if (runtime.filters.status === 'paid' && !paid(item)) return false;
    if (runtime.filters.status === 'pending' && !pending(item)) return false;
    if (runtime.filters.account !== 'all' && norm(item.financialAccountName || item.account) !== norm(runtime.filters.account)) return false;
    if (runtime.filters.group !== 'all' && norm(item.group || item.category) !== norm(runtime.filters.group)) return false;
    if (runtime.filters.payment !== 'all' && norm(item.paymentMethod || item.account) !== norm(runtime.filters.payment)) return false;
    if (search && !norm([item.description, item.group, item.category, item.account, item.paymentMethod, item.notes].join(' ')).includes(search)) return false;
    return true;
  });
}

function ensureSortButton() {
  const table = document.querySelector('#transactions .transactions-table');
  const firstHeader = table?.querySelector('thead tr:first-child th:first-child');
  const sort = document.querySelector('#transactionSortFilter');
  if (!table || !firstHeader || !sort) return;
  table.classList.add('meg-premium-table');
  if (!firstHeader.querySelector('.meg-date-sort-button')) {
    firstHeader.innerHTML = '<span class="meg-column-heading"><span>Vencimento</span><button class="meg-date-sort-button" type="button" aria-label="Alternar ordem das datas"></button></span>';
    firstHeader.querySelector('button').addEventListener('click', () => {
      sort.value = sort.value === 'date_asc' ? 'date_desc' : 'date_asc';
      sort.dispatchEvent(new Event('change', { bubbles: true }));
      paintSortButton();
    });
  }
  const dateSelect = table.querySelector('thead .column-filter-row th:first-child select');
  dateSelect?.classList.add('meg-hidden-date-sort');
  paintSortButton();
}

function paintSortButton() {
  const button = document.querySelector('.meg-date-sort-button');
  const ascending = document.querySelector('#transactionSortFilter')?.value === 'date_asc';
  if (!button) return;
  button.innerHTML = ascending ? '<span class="sort-letters">A<small>Z</small></span><span class="sort-arrow">↓</span>' : '<span class="sort-letters">Z<small>A</small></span><span class="sort-arrow">↓</span>';
  button.title = ascending ? 'Datas mais antigas primeiro' : 'Datas mais recentes primeiro';
}

function tableToolbar(panel) {
  if (panel.querySelector('.meg-table-toolbar')) return;
  panel.insertAdjacentHTML('afterbegin', '<div class="meg-table-toolbar"><div><strong>Movimentações financeiras</strong><span>Ordene, filtre e analise seus lançamentos</span></div><div class="meg-table-actions"><button type="button" data-density="comfortable" class="is-active">Confortável</button><button type="button" data-density="compact">Compacta</button><button type="button" id="megToggleColumns">Colunas</button></div></div>');
  panel.querySelector('.meg-table-toolbar').addEventListener('click', (event) => {
    const density = event.target.closest('[data-density]');
    if (density) {
      panel.dataset.density = density.dataset.density;
      panel.querySelectorAll('[data-density]').forEach((button) => button.classList.toggle('is-active', button === density));
    }
    if (event.target.closest('#megToggleColumns')) columnMenu(panel);
  });
}

function columnMenu(panel) {
  const toolbar = panel.querySelector('.meg-table-toolbar');
  const existing = toolbar.querySelector('.meg-column-menu');
  if (existing) return existing.remove();
  const table = panel.querySelector('table');
  const labels = [...table.querySelectorAll('thead tr:first-child th')].map((cell) => cell.textContent.trim() || 'Detalhes');
  toolbar.insertAdjacentHTML('beforeend', `<div class="meg-column-menu">${labels.map((label, index) => `<label><input type="checkbox" data-column-index="${index}" checked><span>${html(label)}</span></label>`).join('')}</div>`);
  toolbar.querySelector('.meg-column-menu').addEventListener('change', (event) => {
    const index = Number(event.target.dataset.columnIndex);
    table.querySelectorAll('tr').forEach((row) => row.children[index]?.classList.toggle('meg-column-hidden', !event.target.checked));
  });
}

function enhanceTable() {
  const table = document.querySelector('#transactions .transactions-table');
  const panel = document.querySelector('#transactions .table-panel');
  if (!table || !panel) return;
  const rows = table.querySelectorAll('tbody tr');
  const currentSignature = `${rows.length}|${rows[0]?.textContent}|${rows[rows.length - 1]?.textContent}`;
  if (runtime.tableSignature === currentSignature && table.classList.contains('meg-enhanced-table')) return;
  runtime.tableSignature = currentSignature;
  tableToolbar(panel);
  table.classList.add('meg-enhanced-table');
  const headers = ['Vencimento', 'Compra', 'Dia', 'Tipo', 'Descrição', 'Receita', 'Categoria', 'Grupo', 'Despesa', 'Pagamento', 'Situação', 'Modalidade', 'Observações', ''];
  table.querySelectorAll('thead tr:first-child th').forEach((cell, index) => {
    if (!index || headers[index] === undefined || cell.querySelector('.meg-grid-filter-button')) return;
    const label = cell.querySelector('.meg-grid-header-label');
    if (label) label.textContent = headers[index];
    else cell.textContent = headers[index];
  });
  rows.forEach((row) => {
    row.classList.add('meg-data-row');
    const cells = row.children;
    cells[4]?.classList.add('meg-description-cell');
    cells[9]?.classList.add('meg-payment-cell');
    cells[10]?.classList.add('meg-status-cell');
    cells[11]?.classList.add('meg-modality-cell');
    [9, 10, 11].forEach((index) => {
      const cell = cells[index];
      if (!cell || cell.querySelector('.meg-chip') || !cell.textContent.trim()) return;
      const text = cell.textContent.trim();
      cell.innerHTML = `<span class="meg-chip meg-chip-${index}">${html(text)}</span>`;
    });
  });
}

function analyticsHtml() {
  return `<section class="meg-analytics-2" id="megAnalytics2">
    <header class="meg-analytics-hero"><div><small>MEG ANALYTICS 2.0</small><h3>Seu dinheiro, explicado com clareza</h3><p>Saldo atual, compromissos, tendências e oportunidades em uma única visão interativa.</p></div><div class="meg-live-badge"><i></i> Dados em tempo real</div></header>
    <section class="meg-segment-bar"><label><span>Tipo</span><select data-meg-filter="type"><option value="all">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></label><label><span>Situação</span><select data-meg-filter="status"><option value="all">Todas</option><option value="paid">Pagas</option><option value="pending">Pendentes</option></select></label><label><span>Conta</span><select data-meg-filter="account"><option value="all">Todas</option></select></label><label><span>Grupo</span><select data-meg-filter="group"><option value="all">Todos</option></select></label><label><span>Pagamento</span><select data-meg-filter="payment"><option value="all">Todos</option></select></label><label class="meg-search-segment"><span>Pesquisar</span><input data-meg-filter="search" type="search" placeholder="Descrição, grupo ou observação"></label><button type="button" id="megClearAnalyticsFilters">Limpar filtros</button></section>
    <section class="meg-kpi-grid"><article class="meg-kpi-card primary"><span>Saldo monetário atual</span><strong id="megCurrentBalance">R$ 0,00</strong><small>Fonte única: painel monetário</small></article><article class="meg-kpi-card warning"><span>Despesas pendentes</span><strong id="megPendingExpenses">R$ 0,00</strong><small id="megPendingCount">0 compromissos</small></article><article class="meg-kpi-card success"><span>Saldo livre após compromissos</span><strong id="megFreeBalance">R$ 0,00</strong><small id="megFreeBalanceNote">Saldo atual menos pendências</small></article><article class="meg-kpi-card"><span>Taxa de economia</span><strong id="megSavingsRate">0%</strong><small>Resultado sobre receitas monetárias</small></article></section>
    <section class="meg-chart-grid"><article class="meg-chart-card meg-chart-wide"><header><div><small>EVOLUÇÃO FINANCEIRA</small><h4>Saldo e movimentações por mês</h4></div><span id="megTrendSummary"></span></header><div class="meg-chart" id="megBalanceTrendChart"></div></article><article class="meg-chart-card"><header><div><small>COMPOSIÇÃO</small><h4>Para onde o dinheiro foi</h4></div><span>Clique para filtrar</span></header><div class="meg-chart" id="megExpenseDonutChart"></div></article><article class="meg-chart-card"><header><div><small>CONCENTRAÇÃO</small><h4>Pareto dos gastos</h4></div><span>Impacto acumulado</span></header><div class="meg-chart" id="megParetoChart"></div></article><article class="meg-chart-card meg-chart-wide"><header><div><small>AGENDA FINANCEIRA</small><h4>Fluxo diário e risco de saldo</h4></div><span id="megCashflowSummary"></span></header><div class="meg-chart" id="megDailyCashflowChart"></div></article></section>
    <section class="meg-pivot-card"><header><div><small>TABELA DINÂMICA</small><h4>Detalhamento gerencial</h4></div><label>Agrupar por <select id="megPivotDimension"><option value="group">Grupo</option><option value="payment">Pagamento</option><option value="account">Conta</option><option value="status">Situação</option><option value="month">Mês</option></select></label></header><div class="meg-pivot-scroll"><table><thead><tr><th>Dimensão</th><th>Lançamentos</th><th>Receitas</th><th>Despesas</th><th>Resultado</th><th>% das despesas</th></tr></thead><tbody id="megPivotRows"></tbody><tfoot id="megPivotFoot"></tfoot></table></div></section>
  </section>`;
}

function ensureAnalytics() {
  const view = document.querySelector('#analytics');
  if (!view || view.querySelector('#megAnalytics2')) return;
  view.querySelector('.section-heading')?.insertAdjacentHTML('afterend', analyticsHtml());
  view.querySelectorAll('[data-meg-filter]').forEach((control) => control.addEventListener('input', () => { runtime.filters[control.dataset.megFilter] = control.value; runtime.signature = ''; renderAnalytics(); }));
  view.querySelector('#megClearAnalyticsFilters')?.addEventListener('click', () => {
    runtime.filters = { type: 'all', status: 'all', account: 'all', group: 'all', payment: 'all', search: '', pivot: runtime.filters.pivot };
    view.querySelectorAll('[data-meg-filter]').forEach((control) => { control.value = runtime.filters[control.dataset.megFilter]; });
    runtime.signature = '';
    renderAnalytics();
  });
  view.querySelector('#megPivotDimension')?.addEventListener('change', (event) => { runtime.filters.pivot = event.target.value; renderPivot(filteredTransactions(appState().transactions || [])); });
}

function fillSegments(items) {
  const values = {
    account: [...new Set(items.map((item) => item.financialAccountName || item.account).filter(Boolean))],
    group: [...new Set(items.map((item) => item.group || item.category).filter(Boolean))],
    payment: [...new Set(items.map((item) => item.paymentMethod || item.account).filter(Boolean))],
  };
  Object.entries(values).forEach(([key, list]) => {
    const select = document.querySelector(`[data-meg-filter="${key}"]`);
    if (!select) return;
    const sorted = list.sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
    select.innerHTML = `<option value="all">${key === 'group' ? 'Todos' : 'Todas'}</option>${sorted.map((value) => `<option value="${html(value)}">${html(value)}</option>`).join('')}`;
    if (sorted.includes(runtime.filters[key])) select.value = runtime.filters[key]; else runtime.filters[key] = 'all';
  });
}

function correctHealth(transactions) {
  const selected = period();
  const balance = monetaryBalance(transactions);
  const pendingItems = transactions.filter((item) => !benefit(item) && item.type === 'expense' && pending(item) && inPeriod(item, selected));
  const pendingTotal = pendingItems.reduce((sum, item) => sum + valueOf(item, 'expense'), 0);
  const free = balance - pendingTotal;
  const set = (selector, text) => { const element = document.querySelector(selector); if (element) element.textContent = text; };
  set('#megCurrentBalance', currency.format(balance));
  set('#megPendingExpenses', currency.format(pendingTotal));
  set('#megPendingCount', `${integer.format(pendingItems.length)} compromisso(s) no recorte`);
  set('#megFreeBalance', currency.format(free));
  set('#megFreeBalanceNote', free >= 0 ? 'Compromissos cobertos pelo saldo atual' : `Faltam ${currency.format(Math.abs(free))}`);
  set('#currentHealthAvailableMetric', currency.format(balance));
  set('#currentHealthPendingMetric', currency.format(pendingTotal));
  set('#currentHealthClosingMetric', currency.format(free));
  set('#analyticsSavingsMetric', currency.format(free));
  set('#analyticsSavingsLabel', free >= 0 ? 'Saldo livre após compromissos' : 'Necessidade para cobrir compromissos');
  set('#analyticsSavingsTrend', 'Saldo monetário atual menos despesas pendentes');
  set('#analyticsHealthTitle', free >= 0 ? `Você preserva ${currency.format(free)} após os compromissos` : `Atenção: faltam ${currency.format(Math.abs(free))}`);
  set('#analyticsHealthMessage', `${currency.format(balance)} de saldo monetário atual − ${currency.format(pendingTotal)} de despesas pendentes = ${currency.format(free)}.`);
  const hero = document.querySelector('#analyticsDecisionHero');
  hero?.classList.toggle('healthy', free >= 0);
  hero?.classList.toggle('risk', free < 0);
  return { balance, pendingTotal, free };
}

function chart(id) {
  const element = document.getElementById(id);
  if (!element) return null;
  if (!runtime.charts.has(id)) runtime.charts.set(id, echarts.init(element, 'meg-finance-system'));
  return runtime.charts.get(id);
}

function monthly(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = String(item.date || '').slice(0, 7);
    if (!key) return;
    const row = map.get(key) || { month: key, income: 0, expense: 0 };
    row.income += valueOf(item, 'income'); row.expense += valueOf(item, 'expense'); map.set(key, row);
  });
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function expenses(items) {
  const map = new Map();
  items.filter((item) => item.type === 'expense').forEach((item) => { const key = item.group || item.category || 'Sem grupo'; map.set(key, (map.get(key) || 0) + valueOf(item, 'expense')); });
  return [...map].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 12);
}

function renderCharts(items, health) {
  const months = monthly(items); let running = 0;
  chart('megBalanceTrendChart')?.setOption({ animationDuration: 800, tooltip: { trigger: 'axis', valueFormatter: (value) => currency.format(value) }, legend: { bottom: 0 }, grid: { left: 58, right: 24, top: 35, bottom: 58 }, xAxis: { type: 'category', data: months.map((row) => formatMonth(row.month)) }, yAxis: { type: 'value' }, series: [{ name: 'Receitas', type: 'bar', data: months.map((row) => row.income), itemStyle: { color: '#30d59a', borderRadius: [7,7,0,0] } }, { name: 'Despesas', type: 'bar', data: months.map((row) => row.expense), itemStyle: { color: '#ff6f7b', borderRadius: [7,7,0,0] } }, { name: 'Resultado acumulado', type: 'line', smooth: true, data: months.map((row) => running += row.income - row.expense), lineStyle: { width: 4, color: '#4db8ff', shadowColor: 'rgba(77,184,255,.35)', shadowBlur: 12 }, itemStyle: { color: '#56ebc9' }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(77,184,255,.28)'},{offset:1,color:'rgba(77,184,255,.01)'}]) } }] }, true);
  const grouped = expenses(items);
  chart('megExpenseDonutChart')?.setOption({ tooltip: { trigger: 'item', formatter: ({name,value,percent}) => `${html(name)}<br><b>${currency.format(value)}</b> · ${percent}%` }, series: [{ type: 'pie', radius: ['56%','82%'], padAngle: 3, label: { show: false }, itemStyle: { borderRadius: 9, borderColor: '#0a1d2b', borderWidth: 3, shadowColor: 'rgba(0,0,0,.28)', shadowBlur: 8 }, data: grouped }] }, true);
  const donut = chart('megExpenseDonutChart'); donut?.off('click'); donut?.on('click', ({name}) => { runtime.filters.group = name; const select = document.querySelector('[data-meg-filter="group"]'); if (select) select.value = name; runtime.signature = ''; renderAnalytics(); });
  const total = grouped.reduce((sum,row) => sum + row.value,0); let cumulative = 0;
  chart('megParetoChart')?.setOption({ tooltip: { trigger:'axis' }, grid:{left:100,right:45,top:22,bottom:32}, xAxis:[{type:'value',splitLine:{show:false}},{type:'value',min:0,max:100,axisLabel:{formatter:'{value}%'}}], yAxis:{type:'category',inverse:true,data:grouped.map((row)=>row.name),axisLabel:{width:115,overflow:'truncate'}}, series:[{type:'bar',data:grouped.map((row)=>row.value),barWidth:16,itemStyle:{color:new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#328ed0'},{offset:1,color:'#56ebc9'}]),borderRadius:[0,8,8,0]}},{type:'line',xAxisIndex:1,smooth:true,data:grouped.map((row)=>total?((cumulative+=row.value)/total)*100:0),lineStyle:{color:'#ffc166',width:3,shadowColor:'rgba(255,193,102,.25)',shadowBlur:8},itemStyle:{color:'#ffc166'}}] }, true);
  const byDay = new Map(); items.forEach((item) => { if (!item.date) return; const row = byDay.get(item.date) || { income:0, expense:0 }; row.income += valueOf(item,'income'); row.expense += valueOf(item,'expense'); byDay.set(item.date,row); });
  const days = [...byDay.keys()].sort(); let projected = health.balance;
  chart('megDailyCashflowChart')?.setOption({ tooltip:{trigger:'axis',valueFormatter:(value)=>currency.format(value)},legend:{bottom:0},grid:{left:58,right:24,top:35,bottom:58},xAxis:{type:'category',data:days.map((day)=>formatDate(day).slice(0,5))},yAxis:{type:'value'},series:[{name:'Entradas',type:'bar',data:days.map((day)=>byDay.get(day).income),itemStyle:{color:'#30d59a'}},{name:'Saídas',type:'bar',data:days.map((day)=>-byDay.get(day).expense),itemStyle:{color:'#ff6f7b'}},{name:'Saldo projetado',type:'line',smooth:true,data:days.map((day)=>projected+=byDay.get(day).income-byDay.get(day).expense),lineStyle:{width:4,color:'#4db8ff',shadowColor:'rgba(77,184,255,.32)',shadowBlur:10},itemStyle:{color:'#56ebc9'},markLine:{silent:true,data:[{yAxis:0}],lineStyle:{color:'#ff6f7b',type:'dashed'}}}] }, true);
  document.querySelector('#megTrendSummary').textContent = `${months.length} mês(es) analisado(s)`;
  document.querySelector('#megCashflowSummary').textContent = `${days.length} dia(s) com movimentação`;
}

function pivotLabel(item) {
  const dimension = runtime.filters.pivot;
  if (dimension === 'payment') return item.paymentMethod || item.account || 'Não informado';
  if (dimension === 'account') return item.financialAccountName || item.account || 'Não informada';
  if (dimension === 'status') return paid(item) ? 'Pago' : pending(item) ? 'Pendente' : 'Outro';
  if (dimension === 'month') return formatMonth(String(item.date || '').slice(0,7));
  return item.group || item.category || 'Sem grupo';
}

function renderPivot(items) {
  const map = new Map();
  items.forEach((item) => { const key = pivotLabel(item); const row = map.get(key) || { label:key,count:0,income:0,expense:0 }; row.count++; row.income += valueOf(item,'income'); row.expense += valueOf(item,'expense'); map.set(key,row); });
  const rows = [...map.values()].sort((a,b)=>b.expense-a.expense||b.income-a.income);
  const totals = rows.reduce((sum,row)=>({count:sum.count+row.count,income:sum.income+row.income,expense:sum.expense+row.expense}),{count:0,income:0,expense:0});
  const body = document.querySelector('#megPivotRows'); const foot = document.querySelector('#megPivotFoot'); if (!body || !foot) return;
  body.innerHTML = rows.length ? rows.map((row)=>{ const result=row.income-row.expense; const share=totals.expense?row.expense/totals.expense*100:0; return `<tr><td><strong>${html(row.label)}</strong><span class="meg-mini-bar"><i style="width:${Math.min(share,100)}%"></i></span></td><td>${integer.format(row.count)}</td><td class="positive">${currency.format(row.income)}</td><td class="negative">${currency.format(row.expense)}</td><td class="${result>=0?'positive':'negative'}">${currency.format(result)}</td><td>${share.toFixed(1)}%</td></tr>`; }).join('') : '<tr><td colspan="6" class="meg-empty">Nenhum dado para os filtros selecionados.</td></tr>';
  foot.innerHTML = `<tr><th>Total</th><th>${integer.format(totals.count)}</th><th>${currency.format(totals.income)}</th><th>${currency.format(totals.expense)}</th><th>${currency.format(totals.income-totals.expense)}</th><th>100%</th></tr>`;
}

function renderAnalytics() {
  ensureAnalytics();
  const transactions = appState().transactions || [];
  const selected = period();
  const monetary = transactions.filter((item)=>!benefit(item)&&inPeriod(item,selected));
  fillSegments(monetary);
  const items = filteredTransactions(transactions);
  const health = correctHealth(transactions);
  const income = items.reduce((sum,item)=>sum+valueOf(item,'income'),0);
  const expense = items.reduce((sum,item)=>sum+valueOf(item,'expense'),0);
  const rate = income ? (income-expense)/income*100 : 0;
  const rateElement = document.querySelector('#megSavingsRate'); if (rateElement) rateElement.textContent = `${rate.toFixed(1)}%`;
  renderCharts(items, health); renderPivot(items);
}

function refresh(force = false) {
  const transactions = appState().transactions || [];
  const next = signature(transactions);
  enhanceTable();
  if (force || next !== runtime.signature) { runtime.signature = next; renderAnalytics(); }
}

export function initializeUxEnhancements() {
  if (runtime.ready) return;
  runtime.ready = true;
  const start = () => {
    ensureAnalytics(); enhanceTable();
    document.querySelector('#transactionSortFilter')?.addEventListener('change', paintSortButton);
    ['#periodMode','#monthFilter','#yearFilter','#startDateFilter','#endDateFilter'].forEach((selector)=>document.querySelector(selector)?.addEventListener('change',()=>{runtime.signature='';refresh(true);}));
    window.addEventListener('resize',()=>runtime.charts.forEach((instance)=>instance.resize()));
    refresh(true);
    window.setInterval(()=>refresh(false),1200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
}
