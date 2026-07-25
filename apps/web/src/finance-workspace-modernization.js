const moneyPattern = /R\$\s?[\d.]+,\d{2}/g;
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function parseMoney(text) {
  const match = String(text || '').match(moneyPattern)?.[0];
  if (!match) return 0;
  return Number(match.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function parseMoneyValues(text) {
  return (String(text || '').match(moneyPattern) || []).map((value) => parseMoney(value));
}

function isMobile() {
  return document.body.classList.contains('native-mobile') || matchMedia('(max-width:760px)').matches;
}

function pendingCardBucket(card) {
  const content = normalize(card.textContent);
  if (content.includes('PAGO') || content.includes('PAGA')) return 'paid';
  if (content.includes('VENCID') || content.includes('ATRAS')) return 'overdue';
  if (content.includes('HOJE')) return 'today';
  if (content.includes('AMANHA') || content.includes('PRÓXIMOS 7') || content.includes('PROXIMOS 7') || /EM [2-7] DIAS/.test(content)) return 'week';
  return 'future';
}

function decoratePendingCards() {
  const list = document.querySelector('#pendingBillsList');
  if (!list) return [];
  const cards = [...list.children];
  cards.forEach((card) => {
    card.classList.add('meg-pending-card');
    card.dataset.megBucket = pendingCardBucket(card);
    card.dataset.megAmount = String(parseMoney(card.textContent));
    if (!card.querySelector('.meg-pending-priority-label')) {
      const label = document.createElement('span');
      label.className = 'meg-pending-priority-label';
      const labels = { overdue: 'Ação imediata', today: 'Vence hoje', week: 'Próximos dias', paid: 'Concluída', future: 'Programada' };
      label.textContent = labels[card.dataset.megBucket] || 'Programada';
      card.prepend(label);
    }
  });
  return cards;
}

function pendingFinancialSnapshot(cards = decoratePendingCards()) {
  const openCards = cards.filter((card) => card.dataset.megBucket !== 'paid');
  const openTotalFromCards = openCards.reduce((sum, card) => sum + Number(card.dataset.megAmount || 0), 0);
  const pendingMetric = parseMoney(document.querySelector('#pendingTotalMetric')?.textContent);
  const openTotal = pendingMetric || openTotalFromCards;
  const coverageText = document.querySelector('#pendingCoverageTrend')?.textContent || '';
  const coverageValues = parseMoneyValues(coverageText);
  const availableMetric = parseMoney(document.querySelector('#availableBalanceMetric')?.textContent);
  const available = coverageValues[0] || availableMetric;
  const projected = available - openTotal;
  const groups = {
    overdue: cards.filter((card) => card.dataset.megBucket === 'overdue'),
    today: cards.filter((card) => card.dataset.megBucket === 'today'),
    week: cards.filter((card) => ['today', 'week'].includes(card.dataset.megBucket)),
  };
  const summarize = (items) => ({ count: items.length, total: items.reduce((sum, card) => sum + Number(card.dataset.megAmount || 0), 0) });
  return { available, openTotal, projected, openCount: openCards.length, overdue: summarize(groups.overdue), today: summarize(groups.today), week: summarize(groups.week) };
}

function createPendingDecisionHero() {
  const view = document.querySelector('#pending');
  const command = view?.querySelector('#pendingCommandCenter');
  if (!view || !command || view.querySelector('#megPendingDecisionHero')) return;
  const hero = document.createElement('section');
  hero.id = 'megPendingDecisionHero';
  hero.className = 'meg-pending-decision-hero';
  hero.innerHTML = `
    <div class="meg-pending-hero-copy">
      <small>CENTRAL DE PAGAMENTOS</small>
      <h3 id="megPendingDecisionTitle">Analisando seus compromissos</h3>
      <p id="megPendingDecisionMessage">Calculando o impacto real das contas no seu saldo.</p>
      <div class="meg-pending-equation" aria-label="Memória de cálculo">
        <span>Saldo disponível<strong id="megPendingAvailable">R$ 0,00</strong></span>
        <b>−</b>
        <span>Total em aberto<strong id="megPendingOpen">R$ 0,00</strong></span>
        <b>=</b>
        <span>Sobra projetada<strong id="megPendingProjected">R$ 0,00</strong></span>
      </div>
    </div>
    <div class="meg-pending-balance-card" id="megPendingBalanceCard">
      <span>Sobra após pagar tudo</span>
      <strong id="megPendingBalance">R$ 0,00</strong>
      <small id="megPendingBalanceNote">Aguardando dados</small>
    </div>
    <div class="meg-pending-summary-grid">
      <article class="danger"><span>Vencidas</span><strong id="megPendingOverdueCount">0</strong><small id="megPendingOverdueValue">R$ 0,00</small></article>
      <article class="attention"><span>Vencem hoje</span><strong id="megPendingTodayCount">0</strong><small id="megPendingTodayValue">R$ 0,00</small></article>
      <article class="week"><span>Próximos 7 dias</span><strong id="megPendingWeekCount">0</strong><small id="megPendingWeekValue">R$ 0,00</small></article>
      <article class="total"><span>Total em aberto</span><strong id="megPendingOpenCount">0</strong><small id="megPendingOpenValue">R$ 0,00</small></article>
    </div>`;
  command.insertAdjacentElement('beforebegin', hero);
  command.classList.add('meg-legacy-pending-command');
}

function renderPendingDecisionHero() {
  createPendingDecisionHero();
  const hero = document.querySelector('#megPendingDecisionHero');
  if (!hero) return;
  const snapshot = pendingFinancialSnapshot();
  const safe = snapshot.projected >= 0;
  hero.classList.toggle('risk', !safe);
  hero.classList.toggle('healthy', safe);
  const set = (id, value) => { const element = document.querySelector(`#${id}`); if (element) element.textContent = value; };
  set('megPendingAvailable', money.format(snapshot.available));
  set('megPendingOpen', money.format(snapshot.openTotal));
  set('megPendingProjected', money.format(snapshot.projected));
  set('megPendingBalance', money.format(Math.abs(snapshot.projected)));
  set('megPendingOpenCount', String(snapshot.openCount));
  set('megPendingOpenValue', money.format(snapshot.openTotal));
  set('megPendingOverdueCount', String(snapshot.overdue.count));
  set('megPendingOverdueValue', money.format(snapshot.overdue.total));
  set('megPendingTodayCount', String(snapshot.today.count));
  set('megPendingTodayValue', money.format(snapshot.today.total));
  set('megPendingWeekCount', String(snapshot.week.count));
  set('megPendingWeekValue', money.format(snapshot.week.total));
  set('megPendingDecisionTitle', safe ? 'Você consegue pagar todas as contas' : 'O saldo não cobre todas as contas');
  set('megPendingDecisionMessage', safe
    ? `${snapshot.openCount} obrigação(ões) em aberto estão cobertas pelo saldo disponível.`
    : `Faltam ${money.format(Math.abs(snapshot.projected))} para quitar ${snapshot.openCount} obrigação(ões) em aberto.`);
  set('megPendingBalanceNote', safe ? 'Margem livre estimada depois dos pagamentos' : 'Valor que falta para quitar todos os compromissos');
  const balanceLabel = document.querySelector('#megPendingBalanceCard > span');
  if (balanceLabel) balanceLabel.textContent = safe ? 'Sobra após pagar tudo' : 'Falta para pagar tudo';
  const oldCoverage = document.querySelector('#pendingCoverageMetric');
  if (oldCoverage) oldCoverage.textContent = snapshot.openTotal <= 0 ? '100%' : `${Math.min((snapshot.available / snapshot.openTotal) * 100, 100).toFixed(0)}%`;
}

function createPendingWorkspace() {
  const view = document.querySelector('#pending');
  const command = view?.querySelector('#pendingCommandCenter');
  const list = view?.querySelector('#pendingBillsList');
  if (!view || !command || !list || view.querySelector('#megPendingWorkspace')) return;
  const workspace = document.createElement('section');
  workspace.id = 'megPendingWorkspace';
  workspace.className = 'meg-pending-workspace';
  workspace.innerHTML = `
    <div class="meg-pending-toolbar">
      <div><small>PRÓXIMOS VENCIMENTOS</small><strong>Encontre e resolva contas rapidamente</strong></div>
      <label class="meg-pending-search"><span>Pesquisar</span><input id="megPendingSearch" type="search" placeholder="Conta, cartão, grupo ou valor" autocomplete="off"></label>
      <button class="meg-filter-toggle" id="megPendingFilterToggle" type="button" aria-expanded="false">Filtros</button>
    </div>
    <div class="meg-pending-chips" role="group" aria-label="Prioridades">
      <button type="button" class="active" data-meg-pending="all">Todas</button><button type="button" data-meg-pending="overdue">Vencidas</button><button type="button" data-meg-pending="today">Hoje</button><button type="button" data-meg-pending="week">7 dias</button><button type="button" data-meg-pending="paid">Pagas</button>
    </div>
    <div class="meg-pending-insight" id="megPendingInsight" aria-live="polite"></div>`;
  command.insertAdjacentElement('afterend', workspace);
  const headingFilters = view.querySelector('.section-heading .filter-row');
  if (headingFilters) { headingFilters.classList.add('meg-advanced-pending-filters'); headingFilters.hidden = true; }
  workspace.querySelector('#megPendingFilterToggle')?.addEventListener('click', (event) => {
    if (!headingFilters) return;
    headingFilters.hidden = !headingFilters.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!headingFilters.hidden));
  });
  workspace.querySelector('#megPendingSearch')?.addEventListener('input', filterPendingCards);
  workspace.querySelectorAll('[data-meg-pending]').forEach((button) => button.addEventListener('click', () => {
    workspace.querySelectorAll('[data-meg-pending]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    workspace.dataset.filter = button.dataset.megPending;
    filterPendingCards();
  }));
}

function filterPendingCards() {
  const workspace = document.querySelector('#megPendingWorkspace');
  const search = normalize(workspace?.querySelector('#megPendingSearch')?.value);
  const filter = workspace?.dataset.filter || 'all';
  const cards = decoratePendingCards();
  let visible = 0;
  let total = 0;
  cards.forEach((card) => {
    const matchesText = !search || normalize(card.textContent).includes(search);
    const matchesFilter = filter === 'all' || card.dataset.megBucket === filter || (filter === 'week' && ['today', 'week'].includes(card.dataset.megBucket));
    const show = matchesText && matchesFilter;
    card.hidden = !show;
    if (show) { visible += 1; total += Number(card.dataset.megAmount || 0); }
  });
  const insight = document.querySelector('#megPendingInsight');
  if (insight) insight.innerHTML = `<strong>${visible} compromisso(s) no recorte</strong><span>Impacto estimado: ${money.format(total)}</span>`;
  renderPendingDecisionHero();
}

function modernizeSection(id, eyebrow, title, description) {
  const view = document.querySelector(id);
  if (!view || view.querySelector(':scope > .meg-section-intro')) return;
  const heading = view.querySelector(':scope > .section-heading');
  if (!heading) return;
  const intro = document.createElement('div');
  intro.className = 'meg-section-intro';
  intro.innerHTML = `<div><small>${eyebrow}</small><strong>${title}</strong><span>${description}</span></div><span class="meg-section-status">Atualização em tempo real</span>`;
  heading.insertAdjacentElement('afterend', intro);
}

function modernizeWorkspace() {
  createPendingDecisionHero();
  createPendingWorkspace();
  modernizeSection('#cashflow', 'VISÃO DE CAIXA', 'Decisões orientadas pelo saldo futuro', 'Veja quando o caixa aperta e quais movimentos causam maior impacto.');
  modernizeSection('#credit-cards', 'GESTÃO DE CRÉDITO', 'Faturas, limites e parcelas em uma única visão', 'Compare cartões, identifique concentração e antecipe o fechamento.');
  modernizeSection('#income-analysis', 'INTELIGÊNCIA DE RECEITAS', 'Entenda estabilidade, recorrência e concentração', 'Acompanhe a evolução das fontes de renda sem misturar benefícios com dinheiro.');
  modernizeSection('#analytics', 'ANÁLISE EXECUTIVA', 'Transforme números em decisões práticas', 'Diagnósticos, comparativos e prioridades recalculados conforme o período.');
  modernizeSection('#budgets', 'PLANEJAMENTO', 'Metas conectadas ao seu comportamento real', 'Ajuste limites por grupo e acompanhe sua margem financeira.');
  document.body.classList.add('meg-workspace-modern');
  filterPendingCards();
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; modernizeWorkspace(); });
}

function start() {
  modernizeWorkspace();
  const pending = document.querySelector('#pendingBillsList');
  if (pending) new MutationObserver(schedule).observe(pending, { childList: true, subtree: true, characterData: true });
  const metrics = ['pendingTotalMetric', 'pendingCoverageTrend', 'availableBalanceMetric', 'overduePendingMetric', 'todayPendingMetric', 'nextSevenPendingMetric'];
  metrics.forEach((id) => { const element = document.querySelector(`#${id}`); if (element) new MutationObserver(schedule).observe(element, { childList: true, subtree: true, characterData: true }); });
  ['pendingMonthFilter', 'pendingStatusFilter', 'pendingPaymentFilter'].forEach((id) => document.querySelector(`#${id}`)?.addEventListener('change', schedule));
  addEventListener('resize', () => document.body.classList.toggle('meg-compact-workspace', isMobile()), { passive: true });
  document.body.classList.toggle('meg-compact-workspace', isMobile());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();