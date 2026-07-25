const moneyPattern = /R\$\s?[\d.]+,\d{2}/g;

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function parseMoney(text) {
  const match = String(text || '').match(moneyPattern)?.[0];
  if (!match) return 0;
  return Number(match.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function isMobile() {
  return document.body.classList.contains('native-mobile') || matchMedia('(max-width:760px)').matches;
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
      <div>
        <small>CENTRAL OPERACIONAL</small>
        <strong>Priorize, encontre e resolva contas rapidamente</strong>
      </div>
      <label class="meg-pending-search"><span>Pesquisar</span><input id="megPendingSearch" type="search" placeholder="Conta, cartão, grupo ou valor" autocomplete="off"></label>
      <button class="meg-filter-toggle" id="megPendingFilterToggle" type="button" aria-expanded="false">Filtros</button>
    </div>
    <div class="meg-pending-chips" role="group" aria-label="Prioridades">
      <button type="button" class="active" data-meg-pending="all">Todas</button>
      <button type="button" data-meg-pending="overdue">Vencidas</button>
      <button type="button" data-meg-pending="today">Hoje</button>
      <button type="button" data-meg-pending="week">7 dias</button>
      <button type="button" data-meg-pending="paid">Pagas</button>
    </div>
    <div class="meg-pending-insight" id="megPendingInsight" aria-live="polite"></div>`;
  command.insertAdjacentElement('afterend', workspace);

  const headingFilters = view.querySelector('.section-heading .filter-row');
  if (headingFilters) {
    headingFilters.classList.add('meg-advanced-pending-filters');
    headingFilters.hidden = true;
  }

  workspace.querySelector('#megPendingFilterToggle')?.addEventListener('click', (event) => {
    if (!headingFilters) return;
    headingFilters.hidden = !headingFilters.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!headingFilters.hidden));
  });

  workspace.querySelector('#megPendingSearch')?.addEventListener('input', filterPendingCards);
  workspace.querySelectorAll('[data-meg-pending]').forEach((button) => {
    button.addEventListener('click', () => {
      workspace.querySelectorAll('[data-meg-pending]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      workspace.dataset.filter = button.dataset.megPending;
      filterPendingCards();
    });
  });
}

function pendingCardBucket(card) {
  const content = normalize(card.textContent);
  if (content.includes('PAGO') || content.includes('PAGA')) return 'paid';
  if (content.includes('VENCID') || content.includes('ATRAS')) return 'overdue';
  if (content.includes('HOJE')) return 'today';
  if (content.includes('AMANHA') || content.includes('PRÓXIMOS 7') || content.includes('PROXIMOS 7') || content.includes('EM 2 DIAS') || content.includes('EM 3 DIAS') || content.includes('EM 4 DIAS') || content.includes('EM 5 DIAS') || content.includes('EM 6 DIAS') || content.includes('EM 7 DIAS')) return 'week';
  return 'future';
}

function decoratePendingCards() {
  const list = document.querySelector('#pendingBillsList');
  if (!list) return [];
  const cards = [...list.children];
  cards.forEach((card) => {
    card.classList.add('meg-pending-card');
    card.dataset.megBucket = pendingCardBucket(card);
    const amount = parseMoney(card.textContent);
    card.dataset.megAmount = String(amount);
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
    if (show) {
      visible += 1;
      total += Number(card.dataset.megAmount || 0);
    }
  });
  const insight = document.querySelector('#megPendingInsight');
  if (insight) {
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
    insight.innerHTML = `<strong>${visible} compromisso(s) no recorte</strong><span>Impacto estimado: ${formatted}</span>`;
  }
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
  requestAnimationFrame(() => {
    scheduled = false;
    modernizeWorkspace();
  });
}

function start() {
  modernizeWorkspace();
  const pending = document.querySelector('#pendingBillsList');
  if (pending) new MutationObserver(schedule).observe(pending, { childList: true, subtree: true, characterData: true });
  ['pendingMonthFilter', 'pendingStatusFilter', 'pendingPaymentFilter'].forEach((id) => {
    document.querySelector(`#${id}`)?.addEventListener('change', schedule);
  });
  addEventListener('resize', () => document.body.classList.toggle('meg-compact-workspace', isMobile()), { passive: true });
  document.body.classList.toggle('meg-compact-workspace', isMobile());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
