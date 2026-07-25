const MOBILE_BREAKPOINT = 760;

const text = (cell) => String(cell?.textContent || '').replace(/\s+/g, ' ').trim();
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function isMobileExperience() {
  return document.body.classList.contains('native-mobile') || window.matchMedia(`(max-width:${MOBILE_BREAKPOINT}px)`).matches;
}

function toneFor(row) {
  const type = normalize(text(row.cells[3]));
  const situation = normalize(text(row.cells[10]));
  if (situation.includes('ATRAS') || row.classList.contains('overdue')) return 'overdue';
  if (situation.includes('PENDENTE')) return 'pending';
  if (type.includes('RECEITA')) return 'income';
  return 'expense';
}

function amountFor(row) {
  const type = normalize(text(row.cells[3]));
  return {
    type: type.includes('RECEITA') ? 'income' : 'expense',
    value: type.includes('RECEITA') ? text(row.cells[5]) : text(row.cells[8]),
  };
}

function createCard(row) {
  const cells = row.cells;
  const amount = amountFor(row);
  const card = document.createElement('article');
  card.className = `meg-mobile-transaction ${toneFor(row)}`;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-expanded', 'false');

  const description = text(cells[4]) || 'Lançamento sem descrição';
  const due = text(cells[0]) || 'Sem vencimento';
  const purchase = text(cells[1]);
  const group = text(cells[7]) || text(cells[6]) || 'Sem grupo';
  const payment = text(cells[9]) || 'Não informado';
  const situation = text(cells[10]) || 'Não informado';
  const modality = text(cells[11]);
  const notes = text(cells[12]);

  card.innerHTML = `
    <div class="meg-mobile-transaction-main">
      <span class="meg-mobile-transaction-icon" aria-hidden="true">${amount.type === 'income' ? '↗' : '↘'}</span>
      <div class="meg-mobile-transaction-copy">
        <strong>${escapeHtml(description)}</strong>
        <span>${escapeHtml(group)} · ${escapeHtml(payment)}</span>
      </div>
      <div class="meg-mobile-transaction-value ${amount.type}">
        <strong>${amount.type === 'income' ? '+' : '−'} ${escapeHtml(amount.value)}</strong>
        <span>${escapeHtml(due)}</span>
      </div>
    </div>
    <div class="meg-mobile-transaction-status-row">
      <span class="meg-mobile-status">${escapeHtml(situation)}</span>
      <span>Toque para ver detalhes</span>
    </div>
    <div class="meg-mobile-transaction-details" hidden>
      <dl>
        <div><dt>Vencimento</dt><dd>${escapeHtml(due)}</dd></div>
        ${purchase ? `<div><dt>Compra</dt><dd>${escapeHtml(purchase)}</dd></div>` : ''}
        <div><dt>Grupo</dt><dd>${escapeHtml(group)}</dd></div>
        <div><dt>Pagamento</dt><dd>${escapeHtml(payment)}</dd></div>
        ${modality ? `<div><dt>Modalidade</dt><dd>${escapeHtml(modality)}</dd></div>` : ''}
        ${notes ? `<div class="wide"><dt>Observações</dt><dd>${escapeHtml(notes)}</dd></div>` : ''}
      </dl>
      <button class="button primary meg-mobile-edit" type="button">Abrir lançamento</button>
    </div>`;

  const toggle = () => {
    const details = card.querySelector('.meg-mobile-transaction-details');
    const expanded = card.getAttribute('aria-expanded') === 'true';
    card.setAttribute('aria-expanded', String(!expanded));
    details.hidden = expanded;
    card.classList.toggle('expanded', !expanded);
  };

  card.addEventListener('click', (event) => {
    if (!event.target.closest('.meg-mobile-edit')) toggle();
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  });
  card.querySelector('.meg-mobile-edit')?.addEventListener('click', () => {
    const action = row.querySelector('[data-edit], button, a');
    if (action) action.click();
    else row.click();
  });
  return card;
}

function ensureMobileShell() {
  const view = document.querySelector('#transactions');
  const tablePanel = view?.querySelector('.table-panel');
  if (!view || !tablePanel) return null;

  let shell = view.querySelector('#megMobileTransactions');
  if (shell) return shell;
  shell = document.createElement('section');
  shell.id = 'megMobileTransactions';
  shell.className = 'meg-mobile-transactions';
  shell.innerHTML = `
    <div class="meg-mobile-transaction-toolbar" role="group" aria-label="Filtros rápidos">
      <button type="button" class="active" data-mobile-type="all">Todos</button>
      <button type="button" data-mobile-type="expense">Despesas</button>
      <button type="button" data-mobile-type="income">Receitas</button>
      <button type="button" data-mobile-status="pending">Pendentes</button>
    </div>
    <div class="meg-mobile-transaction-list" aria-live="polite"></div>
    <p class="meg-mobile-transaction-empty" hidden>Nenhum lançamento encontrado para os filtros atuais.</p>`;
  tablePanel.insertAdjacentElement('beforebegin', shell);

  shell.querySelectorAll('[data-mobile-type]').forEach((button) => {
    button.addEventListener('click', () => {
      shell.dataset.statusFilter = '';
      shell.querySelectorAll('.meg-mobile-transaction-toolbar button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const select = document.querySelector('#typeFilter');
      if (select) {
        select.value = button.dataset.mobileType;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  shell.querySelector('[data-mobile-status="pending"]')?.addEventListener('click', () => {
    const button = shell.querySelector('[data-mobile-status="pending"]');
    const activating = shell.dataset.statusFilter !== 'pending';
    shell.dataset.statusFilter = activating ? 'pending' : '';
    shell.querySelectorAll('.meg-mobile-transaction-toolbar button').forEach((item) => item.classList.remove('active'));
    (activating ? button : shell.querySelector('[data-mobile-type="all"]'))?.classList.add('active');
    if (!activating) {
      const select = document.querySelector('#typeFilter');
      if (select) {
        select.value = 'all';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else renderMobileCards();
  });
  return shell;
}

function renderMobileCards() {
  if (!isMobileExperience()) return;
  const shell = ensureMobileShell();
  const body = document.querySelector('#transactionRows');
  const list = shell?.querySelector('.meg-mobile-transaction-list');
  if (!shell || !body || !list) return;

  const rows = [...body.querySelectorAll('tr')].filter((row) => row.cells.length >= 13 && !row.hidden && row.style.display !== 'none');
  const filtered = shell.dataset.statusFilter === 'pending'
    ? rows.filter((row) => normalize(text(row.cells[10])).includes('PENDENTE'))
    : rows;

  list.replaceChildren(...filtered.map(createCard));
  shell.querySelector('.meg-mobile-transaction-empty').hidden = filtered.length > 0;
  shell.dataset.count = String(filtered.length);
}

let scheduled = false;
function scheduleRender() {
  if (scheduled || !isMobileExperience()) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    renderMobileCards();
  });
}

function start() {
  if (!isMobileExperience()) return;
  ensureMobileShell();
  scheduleRender();
  const body = document.querySelector('#transactionRows');
  if (body) new MutationObserver(scheduleRender).observe(body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'hidden'] });
  ['searchInput', 'typeFilter', 'transactionSortFilter'].forEach((id) => {
    document.querySelector(`#${id}`)?.addEventListener('input', scheduleRender);
    document.querySelector(`#${id}`)?.addEventListener('change', scheduleRender);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
