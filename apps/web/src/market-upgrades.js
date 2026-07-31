import * as echarts from 'echarts';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR');
const charts = new Map();
let signature = '';

const state = () => window.MEG_APP?.getState?.() || window.MEG_REAL_STATE || { transactions: [] };
const norm = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const valueOf = (item, type) => item.type === type ? Number((type === 'income' ? item.incomeAmount : item.expenseAmount) ?? item.amount ?? 0) || 0 : 0;
const paid = (item) => item.status === 'paid' || ['PAGO', 'RECEBIDO'].includes(norm(item.situation));
const pending = (item) => item.status === 'pending' || norm(item.situation) === 'PENDENTE';
const benefit = (item) => item.financialScope === 'benefit' || /VEROCARD|BENEFICIO|ALIMENTACAO/.test(norm(`${item.account || ''} ${item.paymentMethod || ''} ${item.modality || ''}`));
const isCardExpense = (item) => item.type === 'expense' && /CARTAO|CREDITO/.test(norm(`${item.paymentMethod || ''} ${item.account || ''} ${item.modality || ''}`));
const isoToday = () => new Date().toISOString().slice(0, 10);

function selectedPeriod() {
  const mode = document.querySelector('#periodMode')?.value || 'month';
  const now = new Date();
  if (mode === 'all') return { start: '', end: '' };
  if (mode === 'year') {
    const year = document.querySelector('#yearFilter')?.value || String(now.getFullYear());
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  if (mode === 'range') return { start: document.querySelector('#startDateFilter')?.value || '', end: document.querySelector('#endDateFilter')?.value || '' };
  const month = document.querySelector('#monthFilter')?.value || now.toISOString().slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  return { start: `${month}-01`, end: `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}` };
}

const inPeriod = (item, period) => item.date && (!period.start || item.date >= period.start) && (!period.end || item.date <= period.end);

function closingBefore(transactions, start) {
  if (!start) return 0;
  return transactions.filter((item) => !benefit(item) && item.date < start)
    .reduce((sum, item) => sum + valueOf(item, 'income') - (paid(item) ? valueOf(item, 'expense') : 0), 0);
}

function currentBalance(transactions) {
  const today = isoToday();
  return transactions.filter((item) => !benefit(item) && item.date <= today)
    .reduce((sum, item) => sum + valueOf(item, 'income') - (paid(item) ? valueOf(item, 'expense') : 0), 0);
}

function cardLabel(item) {
  return item.paymentMethod || item.account || item.financialAccountName || 'Cartão de crédito';
}

function incomeSource(item) {
  return item.description || item.group || item.category || item.account || 'Outras receitas';
}

function compactDescription(description) {
  return String(description || 'Despesa').replace(/\s+\d+\s*\/\s*\d+\s*$/i, '').trim();
}

function groupedPendingItems(items) {
  const grouped = new Map();
  items.forEach((item) => {
    const isCard = isCardExpense(item);
    const key = isCard ? `${item.date}|card|${norm(cardLabel(item))}` : `${item.date}|single|${item.id || item.description}`;
    const row = grouped.get(key) || { date: item.date, isCard, label: isCard ? cardLabel(item) : item.description || 'Despesa', detail: '', total: 0, count: 0, items: [] };
    row.total += valueOf(item, 'expense');
    row.count += 1;
    row.items.push(item);
    row.detail = isCard
      ? `${number.format(row.count)} lançamento(s) · ${row.items.slice(0, 3).map((entry) => compactDescription(entry.description)).join(', ')}${row.count > 3 ? '...' : ''}`
      : `${item.group || item.category || 'Sem grupo'} · ${item.paymentMethod || item.account || 'Não informado'}`;
    grouped.set(key, row);
  });
  return [...grouped.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)) || b.total - a.total);
}

function chart(id) {
  const element = document.getElementById(id);
  if (!element) return null;
  if (!charts.has(id)) charts.set(id, echarts.init(element));
  return charts.get(id);
}

function formatDate(value) {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : '—';
}

function monthLabel(value) {
  const [year, month] = String(value || '').split('-').map(Number);
  return year && month ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(year, month - 1, 1)) : '—';
}

function excelFilters() {
  // The production transaction grid is now owned by excel-filter-pro.js.
  // Keeping this legacy enhancer as a no-op prevents duplicate filter buttons
  // and corrupted header text in the web "Lançamentos" table.
}

function analyticsCarryForward(transactions) {
  const period = selectedPeriod();
  const opening = closingBefore(transactions, period.start);
  const periodItems = transactions.filter((item) => !benefit(item) && inPeriod(item, period));
  const income = periodItems.reduce((sum, item) => sum + valueOf(item, 'income'), 0);
  const paidExpense = periodItems.filter(paid).reduce((sum, item) => sum + valueOf(item, 'expense'), 0);
  const pendingExpense = periodItems.filter((item) => item.type === 'expense' && pending(item)).reduce((sum, item) => sum + valueOf(item, 'expense'), 0);
  const resources = opening + income;
  const available = resources - paidExpense;
  const free = available - pendingExpense;

  const analytics = document.querySelector('#megAnalytics2');
  if (!analytics) return;
  let card = analytics.querySelector('#megResourcesAvailable');
  if (!card) {
    const grid = analytics.querySelector('.meg-kpi-grid');
    grid?.insertAdjacentHTML('afterbegin', '<article class="meg-kpi-card carry-forward"><span>Recursos disponíveis no período</span><strong id="megResourcesAvailable">R$ 0,00</strong><small id="megResourcesFormula">Fechamento anterior + receitas atuais</small></article>');
    card = analytics.querySelector('#megResourcesAvailable');
  }
  if (card) card.textContent = money.format(resources);
  const formula = analytics.querySelector('#megResourcesFormula');
  if (formula) formula.textContent = `${money.format(opening)} de fechamento anterior + ${money.format(income)} de receitas`;
  const current = analytics.querySelector('#megCurrentBalance');
  if (current) current.textContent = money.format(available);
  const freeMetric = analytics.querySelector('#megFreeBalance');
  if (freeMetric) freeMetric.textContent = money.format(free);
  const note = analytics.querySelector('#megFreeBalanceNote');
  if (note) note.textContent = free >= 0 ? 'Recursos do período cobrem as pendências' : `Necessidade adicional de ${money.format(Math.abs(free))}`;
}

function incomeHtml() {
  return `<section class="market-module" id="marketIncome">
    <header class="market-hero income"><div><small>INTELIGÊNCIA DE RECEITAS</small><h3>Previsibilidade, crescimento e concentração da sua renda</h3><p>Entenda de onde o dinheiro vem, como evolui e quanto pode entrar nos próximos meses.</p></div><div class="market-score"><strong id="incomeStabilityScore">0</strong><span>/100</span><small>Estabilidade</small></div></header>
    <div class="income-control-strip"><label><span>Origem da receita</span><select id="incomeSourceFilter"><option value="all">Todas as origens</option></select></label><label><span>Busca rapida</span><input id="incomeSearchFilter" type="search" placeholder="Ex.: salario, rendimento, mercado livre"></label><button type="button" id="incomeClearFilters">Limpar</button></div>
    <div class="market-kpis"><article><span>Fechamento anterior</span><strong id="incomeOpening">R$ 0,00</strong><small>Saldo trazido para o período</small></article><article><span>Receitas do período</span><strong id="incomePeriod">R$ 0,00</strong><small id="incomeCount">0 recebimentos</small></article><article><span>Recursos disponíveis</span><strong id="incomeResources">R$ 0,00</strong><small>Fechamento anterior + receitas</small></article><article><span>Previsão próximo mês</span><strong id="incomeForecast">R$ 0,00</strong><small id="incomeForecastNote">Baseada no histórico</small></article></div>
    <div class="market-grid"><article class="market-card wide"><header><div><small>EVOLUÇÃO</small><h4>Receitas mensais e tendência</h4></div><span id="incomeTrendLabel"></span></header><div class="market-chart" id="incomeTrendChart"></div></article><article class="market-card"><header><div><small>ORIGEM</small><h4>Composição das receitas</h4></div></header><div class="market-chart" id="incomeSourceChart"></div></article><article class="market-card"><header><div><small>QUALIDADE DA RENDA</small><h4>Diagnóstico automático</h4></div></header><div class="market-insights" id="incomeInsights"></div></article></div>
  </section>`;
}

function renderIncome(transactions) {
  const view = document.querySelector('#income-analysis');
  if (!view) return;
  if (!view.querySelector('#marketIncome')) {
    view.querySelector('.section-heading')?.insertAdjacentHTML('afterend', incomeHtml());
    document.getElementById('incomeSourceFilter')?.addEventListener('input', () => renderIncome(state().transactions || []));
    document.getElementById('incomeSearchFilter')?.addEventListener('input', () => renderIncome(state().transactions || []));
    document.getElementById('incomeClearFilters')?.addEventListener('click', () => {
      const source = document.getElementById('incomeSourceFilter');
      const search = document.getElementById('incomeSearchFilter');
      if (source) source.value = 'all';
      if (search) search.value = '';
      renderIncome(state().transactions || []);
    });
  }
  const period = selectedPeriod();
  const opening = closingBefore(transactions, period.start);
  const allPeriodIncome = transactions.filter((item) => !benefit(item) && item.type === 'income' && inPeriod(item, period));
  const sourceOptions = [...new Set(allPeriodIncome.map(incomeSource).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const sourceFilter = document.getElementById('incomeSourceFilter');
  if (sourceFilter) {
    const current = sourceFilter.value || 'all';
    sourceFilter.innerHTML = `<option value="all">Todas as origens</option>${sourceOptions.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
    sourceFilter.value = sourceOptions.includes(current) ? current : 'all';
  }
  const selectedSource = sourceFilter?.value || 'all';
  const search = norm(document.getElementById('incomeSearchFilter')?.value || '');
  const items = allPeriodIncome.filter((item) => {
    if (selectedSource !== 'all' && norm(incomeSource(item)) !== norm(selectedSource)) return false;
    return !search || norm([item.description, item.group, item.category, item.account, item.notes].join(' ')).includes(search);
  });
  const total = items.reduce((sum, item) => sum + valueOf(item, 'income'), 0);
  const allIncome = transactions.filter((item) => !benefit(item) && item.type === 'income');
  const monthly = new Map();
  allIncome.forEach((item) => { const key = item.date?.slice(0, 7); if (key) monthly.set(key, (monthly.get(key) || 0) + valueOf(item, 'income')); });
  const rows = [...monthly].sort((a, b) => a[0].localeCompare(b[0]));
  const recent = rows.slice(-6).map(([, value]) => value);
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const volatility = avg && recent.length > 1 ? Math.sqrt(recent.reduce((sum, value) => sum + (value - avg) ** 2, 0) / recent.length) / avg : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - volatility * 100)));
  const trend = recent.length > 1 ? (recent.at(-1) - recent[0]) / Math.max(recent[0], 1) * 100 : 0;
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('incomeOpening', money.format(opening)); set('incomePeriod', money.format(total)); set('incomeResources', money.format(opening + total)); set('incomeCount', `${number.format(items.length)} recebimento(s)`); set('incomeForecast', money.format(avg)); set('incomeStabilityScore', String(score)); set('incomeTrendLabel', `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}% em 6 meses`); set('incomeForecastNote', `Média móvel dos últimos ${recent.length || 0} meses`);
  chart('incomeTrendChart')?.setOption({ animationDuration: 900, tooltip: { trigger: 'axis', valueFormatter: (value) => money.format(value) }, grid: { left: 62, right: 24, top: 30, bottom: 42 }, xAxis: { type: 'category', data: rows.map(([key]) => monthLabel(key)) }, yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf3f1' } } }, series: [{ name: 'Receitas', type: 'bar', data: rows.map(([, value]) => value), itemStyle: { color: '#20b486', borderRadius: [8, 8, 0, 0] } }, { name: 'Tendência', type: 'line', smooth: true, data: rows.map((_, index) => { const slice = rows.slice(Math.max(0, index - 2), index + 1); return slice.reduce((sum, [, value]) => sum + value, 0) / slice.length; }), lineStyle: { color: '#315efb', width: 4 }, itemStyle: { color: '#315efb' } }] }, true);
  const sources = new Map(); items.forEach((item) => { const key = incomeSource(item); sources.set(key, (sources.get(key) || 0) + valueOf(item, 'income')); });
  const sourceRows = [...sources].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  chart('incomeSourceChart')?.setOption({ tooltip: { trigger: 'item', formatter: ({ name, value, percent }) => `${esc(name)}<br><b>${money.format(value)}</b> · ${percent}%` }, series: [{ type: 'pie', radius: ['52%', '80%'], padAngle: 3, label: { show: false }, itemStyle: { borderRadius: 9, borderColor: '#fff', borderWidth: 3 }, data: sourceRows }] }, true);
  const concentration = total && sourceRows[0] ? sourceRows[0].value / total * 100 : 0;
  const insights = [
    { tone: score >= 75 ? 'good' : score >= 50 ? 'warn' : 'risk', title: score >= 75 ? 'Receita estável' : 'Receita variável', text: `Índice de estabilidade em ${score}/100 com base na oscilação mensal.` },
    { tone: concentration > 70 ? 'risk' : 'good', title: concentration > 70 ? 'Alta concentração' : 'Boa diversificação', text: sourceRows[0] ? `${sourceRows[0].name} representa ${concentration.toFixed(1)}% das receitas do período.` : 'Cadastre receitas para medir a concentração.' },
    { tone: trend >= 0 ? 'good' : 'warn', title: trend >= 0 ? 'Tendência positiva' : 'Tendência de queda', text: `A evolução recente é de ${trend >= 0 ? '+' : ''}${trend.toFixed(1)}% no horizonte analisado.` },
  ];
  const container = document.getElementById('incomeInsights'); if (container) container.innerHTML = insights.map((item) => `<article class="${item.tone}"><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></article>`).join('');
}

function cardsHtml() {
  return `<section class="market-module" id="marketCards"><header class="market-hero cards"><div><small>GESTÃO DE CARTÕES</small><h3>Limites, faturas e risco sob controle</h3><p>Visão consolidada para evitar surpresas e decidir o melhor momento de compra.</p></div><div class="market-score"><strong id="cardRiskScore">0</strong><span>%</span><small>Uso estimado</small></div></header><div class="market-kpis"><article><span>Compras no período</span><strong id="cardPeriodSpend">R$ 0,00</strong><small id="cardPurchaseCount">0 compras</small></article><article><span>Pendente em cartões</span><strong id="cardPendingSpend">R$ 0,00</strong><small>Faturas ainda não quitadas</small></article><article><span>Maior cartão</span><strong id="cardTopName">—</strong><small id="cardTopValue">R$ 0,00</small></article><article><span>Próximo vencimento</span><strong id="cardNextDue">—</strong><small id="cardNextDescription">Sem faturas pendentes</small></article></div><div class="market-grid"><article class="market-card wide"><header><div><small>EVOLUÇÃO</small><h4>Gastos mensais por cartão</h4></div></header><div class="market-chart" id="cardEvolutionChart"></div></article><article class="market-card"><header><div><small>DISTRIBUIÇÃO</small><h4>Participação por cartão</h4></div></header><div class="market-chart" id="cardShareChart"></div></article><article class="market-card"><header><div><small>ALERTAS</small><h4>O que merece atenção</h4></div></header><div class="market-insights" id="cardInsights"></div></article></div></section>`;
}

function renderCards(transactions) {
  const view = document.querySelector('#credit-cards'); if (!view) return;
  if (!view.querySelector('#marketCards')) view.querySelector('.section-heading')?.insertAdjacentHTML('afterend', cardsHtml());
  const period = selectedPeriod();
  const all = transactions.filter(isCardExpense);
  const items = all.filter((item) => inPeriod(item, period));
  const total = items.reduce((sum, item) => sum + valueOf(item, 'expense'), 0);
  const pendingTotal = all.filter(pending).reduce((sum, item) => sum + valueOf(item, 'expense'), 0);
  const byCard = new Map(); items.forEach((item) => { const key = item.paymentMethod || item.account || 'Cartão'; byCard.set(key, (byCard.get(key) || 0) + valueOf(item, 'expense')); });
  const cardRows = [...byCard].sort((a, b) => b[1] - a[1]);
  const next = all.filter(pending).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  const estimatedLimit = Math.max(total * 1.5, pendingTotal * 1.25, 1);
  const usage = Math.min(100, pendingTotal / estimatedLimit * 100);
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('cardPeriodSpend', money.format(total)); set('cardPurchaseCount', `${number.format(items.length)} compra(s)`); set('cardPendingSpend', money.format(pendingTotal)); set('cardTopName', cardRows[0]?.[0] || '—'); set('cardTopValue', money.format(cardRows[0]?.[1] || 0)); set('cardNextDue', next ? formatDate(next.date) : '—'); set('cardNextDescription', next?.description || 'Sem faturas pendentes'); set('cardRiskScore', usage.toFixed(0));
  const monthly = new Map(); all.forEach((item) => { const key = item.date?.slice(0, 7); if (!key) return; const row = monthly.get(key) || {}; const card = item.paymentMethod || item.account || 'Cartão'; row[card] = (row[card] || 0) + valueOf(item, 'expense'); monthly.set(key, row); });
  const months = [...monthly.keys()].sort(); const cards = [...new Set(all.map((item) => item.paymentMethod || item.account || 'Cartão'))];
  chart('cardEvolutionChart')?.setOption({ tooltip: { trigger: 'axis', valueFormatter: (value) => money.format(value) }, legend: { bottom: 0, type: 'scroll' }, grid: { left: 58, right: 24, top: 30, bottom: 70 }, xAxis: { type: 'category', data: months.map(monthLabel) }, yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf3f1' } } }, series: cards.map((cardName) => ({ name: cardName, type: 'line', smooth: true, showSymbol: false, stack: 'total', areaStyle: { opacity: 0.08 }, emphasis: { focus: 'series' }, data: months.map((month) => monthly.get(month)?.[cardName] || 0) })) }, true);
  chart('cardShareChart')?.setOption({ tooltip: { trigger: 'item', formatter: ({ name, value, percent }) => `${esc(name)}<br><b>${money.format(value)}</b> ? ${percent}%` }, legend: { bottom: 0, type: 'scroll' }, series: [{ type: 'pie', roseType: 'radius', radius: ['30%', '72%'], center: ['50%', '43%'], label: { show: false }, labelLine: { show: false }, itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 }, data: cardRows.map(([name, value]) => ({ name, value })) }] }, true);
  const insights = [
    { tone: usage > 80 ? 'risk' : usage > 60 ? 'warn' : 'good', title: usage > 80 ? 'Uso elevado' : 'Uso sob controle', text: `${usage.toFixed(0)}% de utilização estimada considerando compromissos pendentes.` },
    { tone: cardRows.length > 3 ? 'warn' : 'good', title: cardRows.length > 3 ? 'Muitos cartões ativos' : 'Carteira simples', text: `${cardRows.length} cartão(ões) movimentado(s) no período.` },
    { tone: next ? 'warn' : 'good', title: next ? 'Próxima fatura' : 'Sem urgências', text: next ? `${next.description || next.paymentMethod} vence em ${formatDate(next.date)} por ${money.format(valueOf(next, 'expense'))}.` : 'Nenhuma fatura pendente localizada.' },
  ];
  const container = document.getElementById('cardInsights'); if (container) container.innerHTML = insights.map((item) => `<article class="${item.tone}"><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></article>`).join('');
}

function pendingHtml() {
  return `<section class="market-module" id="marketPending"><header class="market-hero pending"><div><small>CENTRAL DE COMPROMISSOS</small><h3>O que pagar, quando pagar e qual o impacto no caixa</h3><p>Agenda dinâmica com prioridade, risco e visão por vencimento.</p></div><button type="button" id="pendingClearFilters">Limpar filtros</button></header><div class="pending-segments"><label><span>Horizonte</span><select id="pendingHorizon"><option value="all">Todos</option><option value="overdue">Vencidos</option><option value="today">Hoje</option><option value="7">Próximos 7 dias</option><option value="30">Próximos 30 dias</option></select></label><label><span>Grupo</span><select id="pendingGroup"><option value="all">Todos</option></select></label><label><span>Pagamento</span><select id="pendingPayment"><option value="all">Todos</option></select></label><label class="search"><span>Pesquisar</span><input id="pendingSearch" type="search" placeholder="Descrição, grupo ou pagamento"></label></div><div class="market-kpis"><article class="danger"><span>Vencido</span><strong id="pendingOverdue">R$ 0,00</strong><small id="pendingOverdueCount">0 contas</small></article><article class="warning"><span>Próximos 7 dias</span><strong id="pending7Days">R$ 0,00</strong><small id="pending7DaysCount">0 contas</small></article><article><span>Total pendente</span><strong id="pendingTotal">R$ 0,00</strong><small id="pendingTotalCount">0 compromissos</small></article><article class="success"><span>Saldo após pendências</span><strong id="pendingAfterBalance">R$ 0,00</strong><small>Saldo monetário atual menos pendências</small></article></div><div class="pending-layout"><article class="market-card"><header><div><small>CALENDÁRIO</small><h4>Pressão financeira por data</h4></div></header><div class="market-chart" id="pendingTimelineChart"></div></article><article class="market-card pending-list-card"><header><div><small>PRIORIDADES</small><h4>Agenda de pagamentos</h4></div><span id="pendingVisibleCount"></span></header><div class="pending-smart-list" id="pendingSmartList"></div></article></div></section>`;
}

function renderPending(transactions) {
  const view = document.querySelector('#pending'); if (!view) return;
  if (!view.querySelector('#marketPending')) {
    view.querySelector('.section-heading')?.insertAdjacentHTML('afterend', pendingHtml());
    ['pendingHorizon', 'pendingGroup', 'pendingPayment', 'pendingSearch'].forEach((id) => document.getElementById(id)?.addEventListener('input', () => renderPending(state().transactions || [])));
    document.getElementById('pendingClearFilters')?.addEventListener('click', () => { ['pendingHorizon', 'pendingGroup', 'pendingPayment'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = 'all'; }); const search = document.getElementById('pendingSearch'); if (search) search.value = ''; renderPending(state().transactions || []); });
  }
  const today = isoToday();
  const all = transactions.filter((item) => !benefit(item) && item.type === 'expense' && pending(item)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const groups = [...new Set(all.map((item) => item.group || item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const payments = [...new Set(all.map((item) => item.paymentMethod || item.account).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const fill = (id, values, allLabel) => { const el = document.getElementById(id); if (!el) return; const current = el.value; el.innerHTML = `<option value="all">${allLabel}</option>${values.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`; if (values.includes(current)) el.value = current; };
  fill('pendingGroup', groups, 'Todos'); fill('pendingPayment', payments, 'Todos');
  const horizon = document.getElementById('pendingHorizon')?.value || 'all'; const group = document.getElementById('pendingGroup')?.value || 'all'; const payment = document.getElementById('pendingPayment')?.value || 'all'; const search = norm(document.getElementById('pendingSearch')?.value || '');
  const diffDays = (date) => Math.ceil((new Date(`${date}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000);
  const filtered = all.filter((item) => {
    const days = diffDays(item.date);
    if (horizon === 'overdue' && days >= 0) return false; if (horizon === 'today' && days !== 0) return false; if (horizon === '7' && (days < 0 || days > 7)) return false; if (horizon === '30' && (days < 0 || days > 30)) return false;
    if (group !== 'all' && norm(item.group || item.category) !== norm(group)) return false; if (payment !== 'all' && norm(item.paymentMethod || item.account) !== norm(payment)) return false;
    return !search || norm([item.description, item.group, item.category, item.paymentMethod, item.account].join(' ')).includes(search);
  });
  const overdue = all.filter((item) => diffDays(item.date) < 0); const next7 = all.filter((item) => { const days = diffDays(item.date); return days >= 0 && days <= 7; });
  const sum = (items) => items.reduce((total, item) => total + valueOf(item, 'expense'), 0); const total = sum(all); const balance = currentBalance(transactions);
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('pendingOverdue', money.format(sum(overdue))); set('pendingOverdueCount', `${number.format(overdue.length)} conta(s)`); set('pending7Days', money.format(sum(next7))); set('pending7DaysCount', `${number.format(next7.length)} conta(s)`); set('pendingTotal', money.format(total)); set('pendingTotalCount', `${number.format(all.length)} compromisso(s)`); set('pendingAfterBalance', money.format(balance - total)); set('pendingVisibleCount', `${number.format(filtered.length)} visível(is)`);
  const byDate = new Map(); filtered.forEach((item) => byDate.set(item.date, (byDate.get(item.date) || 0) + valueOf(item, 'expense'))); const dates = [...byDate.keys()].sort();
  chart('pendingTimelineChart')?.setOption({ tooltip: { trigger: 'axis', valueFormatter: (value) => money.format(value) }, grid: { left: 60, right: 24, top: 28, bottom: 42 }, xAxis: { type: 'category', data: dates.map((date) => formatDate(date).slice(0, 5)) }, yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf3f1' } } }, series: [{ type: 'bar', data: dates.map((date) => ({ value: byDate.get(date), itemStyle: { color: diffDays(date) < 0 ? '#ef4444' : diffDays(date) <= 7 ? '#f59e0b' : '#315efb', borderRadius: [8, 8, 0, 0] } })), markLine: { silent: true, data: [{ xAxis: formatDate(today).slice(0, 5), name: 'Hoje' }] } }] }, true);
  const grouped = groupedPendingItems(filtered);
  const list = document.getElementById('pendingSmartList'); if (list) list.innerHTML = grouped.length ? grouped.map((item) => { const days = diffDays(item.date); const tone = days < 0 ? 'overdue' : days === 0 ? 'today' : days <= 7 ? 'soon' : 'future'; const label = days < 0 ? `${Math.abs(days)} dia(s) em atraso` : days === 0 ? 'Vence hoje' : `Vence em ${days} dia(s)`; return `<article class="${tone} ${item.isCard ? 'card-group' : ''}"><div class="pending-date"><strong>${formatDate(item.date).slice(0, 5)}</strong><span>${esc(label)}</span></div><div class="pending-main"><strong>${esc(item.label)}</strong><span>${esc(item.detail)}</span></div><strong class="pending-value">${money.format(item.total)}</strong></article>`; }).join('') : '<div class="pending-empty"><strong>Nenhum compromisso encontrado</strong><span>Ajuste os filtros ou aproveite que nao ha contas nesse recorte.</span></div>';
}

function refresh() {
  const transactions = state().transactions || [];
  const current = [transactions.length, transactions.at(-1)?.id, transactions.at(-1)?.date, document.querySelector('#monthFilter')?.value, document.querySelector('#periodMode')?.value].join('|');
  excelFilters(); analyticsCarryForward(transactions); renderIncome(transactions); renderCards(transactions); renderPending(transactions);
  signature = current;
}

export function initializeMarketUpgrades() {
  const start = () => {
    refresh();
    ['#periodMode', '#monthFilter', '#yearFilter', '#startDateFilter', '#endDateFilter'].forEach((selector) => document.querySelector(selector)?.addEventListener('change', refresh));
    window.addEventListener('resize', () => charts.forEach((instance) => instance.resize()));
    new MutationObserver(() => excelFilters()).observe(document.body, { childList: true, subtree: true });
    window.setInterval(() => { const transactions = state().transactions || []; const next = [transactions.length, transactions.at(-1)?.id, transactions.at(-1)?.date, document.querySelector('#monthFilter')?.value, document.querySelector('#periodMode')?.value].join('|'); if (next !== signature) refresh(); }, 1400);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
}
