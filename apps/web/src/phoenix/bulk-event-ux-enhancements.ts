import { authenticatedRequest } from '../app/auth-client';
import { financeClient } from '../app/finance-client';
import { PHOENIX_BULK_EVENT_WRITE_ENABLED } from './data/phoenix-bulk-event-gateway';
import './phoenix-bulk-ux-enhancements.css';

type AuditItem = {
  id: string;
  at: string;
  before?: unknown;
  after?: unknown;
};

type AuditPage = {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
};

let observer: MutationObserver | null = null;
let scheduled = false;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, fallback = '—') {
  const result = String(value ?? '').trim();
  return result || fallback;
}

function formatDate(value: unknown) {
  const raw = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '—';
  const [year, month, day] = raw.split('-');
  return `${day}/${month}/${year}`;
}

function formatMoney(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(amount));
}

function launchTable() {
  return document.querySelector<HTMLTableElement>('.px-v15-launch-table');
}

function filteredBoxes() {
  return [...document.querySelectorAll<HTMLInputElement>('.px-v15-launch-table tbody .px-bulk-checkbox:not(:disabled)')];
}

function selectedBoxes() {
  return filteredBoxes().filter((item) => item.checked);
}

function selectFiltered() {
  filteredBoxes().forEach((checkbox) => {
    if (!checkbox.checked) checkbox.click();
  });
  scheduleSync();
}

function clearFilteredSelection() {
  filteredBoxes().forEach((checkbox) => {
    if (checkbox.checked) checkbox.click();
  });
  scheduleSync();
}

function closeModal(backdrop: HTMLElement) {
  backdrop.remove();
}

function modalShell(title: string, subtitle: string) {
  const backdrop = document.createElement('div');
  backdrop.className = 'px-bulk-ux-backdrop';
  const modal = document.createElement('section');
  modal.className = 'px-bulk-ux-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', title);
  modal.innerHTML = `
    <header class="px-bulk-ux-modal-head">
      <div><span class="px-kicker">Seleção em massa</span><h3>${title}</h3><p>${subtitle}</p></div>
      <button type="button" data-close aria-label="Fechar">×</button>
    </header>
    <div data-body></div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  modal.querySelector<HTMLButtonElement>('[data-close]')?.addEventListener('click', () => closeModal(backdrop));
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeModal(backdrop);
  });
  return { backdrop, modal, body: modal.querySelector<HTMLElement>('[data-body]')! };
}

function triggerProtectedAction(kind: 'edit' | 'delete') {
  if (!PHOENIX_BULK_EVENT_WRITE_ENABLED) return;
  const selector = kind === 'edit' ? '[data-bulk-edit]' : '[data-bulk-delete]';
  document.querySelector<HTMLButtonElement>(`.px-bulk-action-bar ${selector}:not(:disabled)`)?.click();
}

async function openEditPreview() {
  const count = selectedBoxes().length;
  if (!count) return;

  const { backdrop, body } = modalShell(
    `Alterar ${count} lançamento${count === 1 ? '' : 's'}`,
    'Somente os campos marcados serão substituídos. Os demais permanecem exatamente como estão.',
  );
  body.innerHTML = '<div class="px-bulk-ux-loading">Carregando cadastros da base…</div>';

  try {
    const [accounts, methods] = await Promise.all([financeClient.listAccounts(), financeClient.listPaymentMethods()]);
    const accountOptions = accounts
      .filter((item) => item.isActive)
      .map((item) => `<option>${text(item.name)}</option>`)
      .join('');
    const methodOptions = methods
      .filter((item) => item.isActive)
      .map((item) => `<option>${text(item.name)}</option>`)
      .join('');

    body.innerHTML = `
      <div class="px-bulk-ux-summary">
        <strong>${count} selecionado${count === 1 ? '' : 's'}</strong>
        <span>Operação em lote prevista como atômica: ou todos são alterados, ou nenhum.</span>
      </div>
      <label class="px-bulk-ux-field"><input type="checkbox" data-toggle="date"><span><strong>Vencimento / data</strong><small>Aplicar a mesma data aos selecionados.</small></span><input type="date" data-value="date" disabled></label>
      <label class="px-bulk-ux-field"><input type="checkbox" data-toggle="account"><span><strong>Conta financeira</strong><small>Trocar somente a conta dos selecionados.</small></span><select data-value="account" disabled><option value="">Selecione</option>${accountOptions}</select></label>
      <label class="px-bulk-ux-field"><input type="checkbox" data-toggle="payment"><span><strong>Forma de pagamento / recebimento</strong><small>Trocar somente a forma dos selecionados.</small></span><select data-value="payment" disabled><option value="">Selecione</option>${methodOptions}</select></label>
      <div class="px-bulk-ux-review" data-review>Nenhum campo marcado. Esta prévia não altera seus dados.</div>
      <div class="px-bulk-ux-actions">
        <button type="button" data-preview-review>Revisar alteração</button>
        <button type="button" class="primary" data-apply ${PHOENIX_BULK_EVENT_WRITE_ENABLED ? '' : 'disabled'}>${PHOENIX_BULK_EVENT_WRITE_ENABLED ? 'Aplicar alterações' : 'Aguardando liberação'}</button>
      </div>
      <small class="px-bulk-ux-esc-hint">Esc fecha esta janela.</small>
    `;

    const connect = (name: string) => {
      const toggle = body.querySelector<HTMLInputElement>(`[data-toggle="${name}"]`);
      const value = body.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-value="${name}"]`);
      if (!toggle || !value) return;
      toggle.addEventListener('change', () => { value.disabled = !toggle.checked; });
    };
    connect('date');
    connect('account');
    connect('payment');

    body.querySelector<HTMLButtonElement>('[data-preview-review]')?.addEventListener('click', () => {
      const changes: string[] = [];
      const dateToggle = body.querySelector<HTMLInputElement>('[data-toggle="date"]');
      const accountToggle = body.querySelector<HTMLInputElement>('[data-toggle="account"]');
      const paymentToggle = body.querySelector<HTMLInputElement>('[data-toggle="payment"]');
      const dateValue = body.querySelector<HTMLInputElement>('[data-value="date"]')?.value || '';
      const accountValue = body.querySelector<HTMLSelectElement>('[data-value="account"]')?.selectedOptions[0]?.textContent || '';
      const paymentValue = body.querySelector<HTMLSelectElement>('[data-value="payment"]')?.selectedOptions[0]?.textContent || '';
      if (dateToggle?.checked && dateValue) changes.push(`Vencimento/data → ${formatDate(dateValue)}`);
      if (accountToggle?.checked && accountValue && accountValue !== 'Selecione') changes.push(`Conta → ${accountValue}`);
      if (paymentToggle?.checked && paymentValue && paymentValue !== 'Selecione') changes.push(`Forma → ${paymentValue}`);
      const review = body.querySelector<HTMLElement>('[data-review]');
      if (review) review.textContent = changes.length
        ? `${count} lançamento${count === 1 ? '' : 's'} · ${changes.join(' · ')} · demais campos preservados.`
        : 'Marque ao menos um campo e escolha o novo valor para visualizar o resumo.';
    });

    body.querySelector<HTMLButtonElement>('[data-apply]')?.addEventListener('click', () => {
      closeModal(backdrop);
      triggerProtectedAction('edit');
    });
  } catch {
    body.innerHTML = '<div class="px-bulk-ux-error">Não foi possível carregar os cadastros para esta prévia.</div>';
  }
}

async function openTrash() {
  const { body } = modalShell(
    'Lixeira de lançamentos',
    'Itens excluídos permanecem auditáveis. A restauração só será liberada com um writer próprio e protegido.',
  );
  body.innerHTML = '<div class="px-bulk-ux-loading">Buscando arquivamentos registrados…</div>';

  try {
    const page = await authenticatedRequest<AuditPage>('/finance/audit?page=1&pageSize=50&action=FINANCIAL_EVENT_ARCHIVED&entity=FinancialEvent');
    if (!page.items.length) {
      body.innerHTML = `
        <div class="px-bulk-ux-empty">
          <strong>Nenhum arquivamento auditado encontrado.</strong>
          <span>Os próximos lançamentos excluídos pelo fluxo protegido aparecerão aqui.</span>
        </div>
        <small class="px-bulk-ux-esc-hint">Esc fecha esta janela.</small>
      `;
      return;
    }

    body.innerHTML = `
      <div class="px-bulk-ux-trash-list">
        ${page.items.map((item) => {
          const before = asRecord(item.before) || {};
          const after = asRecord(item.after) || {};
          const description = text(before.description ?? after.description, 'Lançamento');
          const date = formatDate(before.date ?? after.date);
          const amount = formatMoney(before.amount ?? after.amount);
          const archivedAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.at));
          return `
            <article>
              <div><strong>${description}</strong><span>${date} · ${amount}</span><small>Arquivado em ${archivedAt}</small></div>
              <button type="button" disabled title="Restauração ainda não possui writer protegido.">Restaurar</button>
            </article>
          `;
        }).join('')}
      </div>
      <div class="px-bulk-ux-note">Exibição limitada aos 50 arquivamentos auditados mais recentes. Restaurar continuará bloqueado até existir contrato transacional específico.</div>
      <small class="px-bulk-ux-esc-hint">Esc fecha esta janela.</small>
    `;
  } catch {
    body.innerHTML = '<div class="px-bulk-ux-error">Não foi possível consultar a lixeira agora.</div>';
  }
}

function ensureCommandStrip() {
  const table = launchTable();
  const card = table?.closest<HTMLElement>('.px-table-card');
  const toolbar = card?.querySelector<HTMLElement>('.px-toolbar');
  if (!table || !card || !toolbar) return;

  let strip = card.querySelector<HTMLElement>('[data-bulk-ux-strip]');
  if (!strip) {
    strip = document.createElement('div');
    strip.className = 'px-bulk-ux-strip';
    strip.dataset.bulkUxStrip = 'true';
    strip.innerHTML = `
      <div class="px-bulk-ux-copy">
        <strong>Seleção em massa</strong>
        <small data-bulk-ux-count>Use os checkboxes para selecionar lançamentos.</small>
      </div>
      <div class="px-bulk-ux-buttons">
        <button type="button" data-select-filtered>Selecionar filtrados</button>
        <button type="button" data-preview-edit>Prévia</button>
        <button type="button" class="px-bulk-ux-primary" data-do-edit ${PHOENIX_BULK_EVENT_WRITE_ENABLED ? '' : 'disabled'}>Alterar</button>
        <button type="button" class="px-bulk-ux-danger" data-do-delete ${PHOENIX_BULK_EVENT_WRITE_ENABLED ? '' : 'disabled'}>Excluir</button>
        <button type="button" data-trash>Lixeira</button>
        <button type="button" data-clear-filtered>Limpar</button>
      </div>
      <span class="px-bulk-ux-gate">${PHOENIX_BULK_EVENT_WRITE_ENABLED ? 'Writer em massa ativo' : 'Alterar/excluir ainda bloqueados'}</span>
    `;
    toolbar.insertAdjacentElement('afterend', strip);
    strip.querySelector<HTMLButtonElement>('[data-select-filtered]')?.addEventListener('click', selectFiltered);
    strip.querySelector<HTMLButtonElement>('[data-clear-filtered]')?.addEventListener('click', clearFilteredSelection);
    strip.querySelector<HTMLButtonElement>('[data-preview-edit]')?.addEventListener('click', () => void openEditPreview());
    strip.querySelector<HTMLButtonElement>('[data-trash]')?.addEventListener('click', () => void openTrash());
    strip.querySelector<HTMLButtonElement>('[data-do-edit]')?.addEventListener('click', () => triggerProtectedAction('edit'));
    strip.querySelector<HTMLButtonElement>('[data-do-delete]')?.addEventListener('click', () => triggerProtectedAction('delete'));
  }

  const total = filteredBoxes().length;
  const selected = selectedBoxes().length;
  const count = strip.querySelector<HTMLElement>('[data-bulk-ux-count]');
  if (count) count.textContent = selected
    ? `${selected} de ${total} resultado${total === 1 ? '' : 's'} filtrado${total === 1 ? '' : 's'} selecionado${selected === 1 ? '' : 's'}.`
    : `${total} resultado${total === 1 ? '' : 's'} no filtro atual.`;

  const selectButton = strip.querySelector<HTMLButtonElement>('[data-select-filtered]');
  if (selectButton) {
    selectButton.disabled = total === 0 || (selected === total && total > 0);
    selectButton.textContent = total ? `Selecionar filtrados (${total})` : 'Selecionar filtrados';
  }
  const previewButton = strip.querySelector<HTMLButtonElement>('[data-preview-edit]');
  if (previewButton) previewButton.disabled = selected === 0;
  const clearButton = strip.querySelector<HTMLButtonElement>('[data-clear-filtered]');
  if (clearButton) clearButton.disabled = selected === 0;
  const editButton = strip.querySelector<HTMLButtonElement>('[data-do-edit]');
  if (editButton) editButton.disabled = selected === 0 || !PHOENIX_BULK_EVENT_WRITE_ENABLED;
  const deleteButton = strip.querySelector<HTMLButtonElement>('[data-do-delete]');
  if (deleteButton) deleteButton.disabled = selected === 0 || !PHOENIX_BULK_EVENT_WRITE_ENABLED;
}

function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  const uxBackdrops = [...document.querySelectorAll<HTMLElement>('.px-bulk-ux-backdrop')];
  const topUx = uxBackdrops.at(-1);
  if (topUx) {
    event.preventDefault();
    closeModal(topUx);
    return;
  }
  const legacyBackdrop = document.querySelector<HTMLElement>('.px-bulk-modal-backdrop');
  if (legacyBackdrop) {
    event.preventDefault();
    legacyBackdrop.querySelector<HTMLButtonElement>('.px-bulk-modal-close')?.click();
  }
}

function sync() {
  ensureCommandStrip();
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    sync();
  }, 24);
}

function start() {
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked', 'disabled'] });
  document.addEventListener('change', scheduleSync, true);
  window.addEventListener('meg:data-invalidated', scheduleSync as EventListener);
  window.addEventListener('keydown', onEscape);
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixBulkEventUxEnhancements() {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('change', scheduleSync, true);
  window.removeEventListener('meg:data-invalidated', scheduleSync as EventListener);
  window.removeEventListener('keydown', onEscape);
}
