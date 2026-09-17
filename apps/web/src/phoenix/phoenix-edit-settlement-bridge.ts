import { authenticatedRequest } from '../app/auth-client';
import { financeClient, type FinancialEvent } from '../app/finance-client';
import './phoenix-launch-editor-polish.css';

declare global {
  interface Window {
    __megPhoenixEditOriginalStatus?: 'planned' | 'paid' | null;
  }
}

type BulkUpdateInput = Parameters<typeof financeClient.bulkUpdateEvents>[0];
type BulkUpdateResult = Awaited<ReturnType<typeof financeClient.bulkUpdateEvents>>;
type SettlementResponse = { event: FinancialEvent; idempotentReplay?: boolean };

const WRAP_MARK = '__megPhoenixSettlementEditWrapped__';
const globalScope = globalThis as typeof globalThis & { [WRAP_MARK]?: boolean };

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

async function pendingWriteAvailable() {
  if (typeof window === 'undefined') return false;
  if (!window.location.hostname.startsWith('meg-phoenix-v15-ux-preview')) {
    return import.meta.env.VITE_PHOENIX_PENDING_WRITE === 'enabled';
  }
  try {
    const response = await fetch('/preview-health', { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return false;
    const payload = await response.json() as { capabilities?: { pendingWrite?: unknown } };
    return payload.capabilities?.pendingWrite === true;
  } catch {
    return false;
  }
}

async function findEventById(eventId: string) {
  for (let page = 1; page <= 8; page += 1) {
    const result = await financeClient.listEvents(page, 100, '');
    const event = result.items.find((item) => item.id === eventId);
    if (event) return event;
    if (result.items.length < 100 || page * 100 >= result.total) break;
  }
  return null;
}

function originalStatusFromUi() {
  const value = typeof window !== 'undefined' ? window.__megPhoenixEditOriginalStatus : null;
  return value === 'planned' || value === 'paid' ? value : null;
}

if (!globalScope[WRAP_MARK]) {
  globalScope[WRAP_MARK] = true;
  const originalBulkUpdate = financeClient.bulkUpdateEvents.bind(financeClient);

  financeClient.bulkUpdateEvents = async (data: BulkUpdateInput): Promise<BulkUpdateResult> => {
    const eventId = data.ids.length === 1 ? data.ids[0] : '';
    const isEditorMutation = Boolean(eventId && data.operationId.startsWith('phoenix-event-edit'));
    if (!isEditorMutation || !data.changes.status) return originalBulkUpdate(data);

    let originalStatus = originalStatusFromUi();
    let current: FinancialEvent | null = null;
    if (!originalStatus) {
      current = await findEventById(eventId);
      originalStatus = current?.status === 'planned' || current?.status === 'paid' ? current.status : null;
    }

    if (originalStatus === 'paid' && data.changes.status === 'planned') {
      throw new Error('PHOENIX_REVERSAL_NOT_IN_SIMPLE_FLOW');
    }

    if (originalStatus !== 'planned' || data.changes.status !== 'paid') {
      return originalBulkUpdate(data);
    }

    if (!(await pendingWriteAvailable())) throw new Error('PHOENIX_EDIT_WRITE_NOT_ENABLED');

    current ||= await findEventById(eventId);
    if (current && (current.type !== 'expense' || current.status !== 'planned')) {
      return originalBulkUpdate(data);
    }

    const preparationOperationId = `${data.operationId}-prepare`;
    const preparation = await originalBulkUpdate({
      ...data,
      operationId: preparationOperationId,
      changes: { ...data.changes, status: 'planned' },
    });
    const preparedEvent = preparation.events[0] || current;
    const paidAt = String(data.changes.date || preparedEvent?.date || '').slice(0, 10);
    const accountId = data.changes.accountId || preparedEvent?.accountId || '';
    const paymentMethodId = data.changes.paymentMethodId || preparedEvent?.paymentMethodId || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || !accountId || !paymentMethodId) {
      throw new Error('PHOENIX_PAYMENT_METHOD_REQUIRED');
    }

    const settlement = await authenticatedRequest<SettlementResponse>(`/finance/events/${eventId}/settle`, {
      method: 'POST',
      body: JSON.stringify({
        paidAt,
        accountId,
        paymentMethodId,
        operationId: `${data.operationId}-settle`,
      }),
    });

    return {
      ids: [eventId],
      updated: 1,
      events: [settlement.event],
      idempotentReplay: Boolean(settlement.idempotentReplay),
    };
  };
}

function labelElement(root: HTMLElement, prefix: string) {
  const target = normalize(prefix);
  return [...root.querySelectorAll<HTMLLabelElement>('label.px-field')]
    .find((label) => normalize(label.querySelector('span')?.textContent || '').startsWith(target)) || null;
}

function ensureSettlementHint(drawer: HTMLElement, active: boolean) {
  let hint = drawer.querySelector<HTMLElement>('.px-edit-settlement-hint');
  if (!active) {
    hint?.remove();
    return;
  }
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'px-edit-settlement-hint';
    const button = drawer.querySelector<HTMLElement>('.px-review-launch, .px-confirm-launch');
    button?.parentElement?.insertBefore(hint, button);
  }
  if (hint) {
    hint.innerHTML = '<strong>Baixa de pagamento</strong><span>Ao confirmar, o MEG registra o pagamento real com a data, conta e forma informadas. Alterações do lançamento são preservadas antes da baixa.</span>';
  }
}

function polishFutureTemplate(drawer: HTMLElement) {
  const switches = [...drawer.querySelectorAll<HTMLLabelElement>('label.px-switch')];
  const template = switches.find((item) => normalize(item.querySelector('strong')?.textContent || '') === 'salvar como modelo');
  if (!template) return;
  template.classList.add('is-future');
  const input = template.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (input && !input.checked) input.disabled = true;
  const small = template.querySelector<HTMLElement>('small');
  if (small) small.textContent = 'Em breve · o contrato oficial de modelos ainda não está liberado.';
}

function polishSecondaryNotices(drawer: HTMLElement) {
  for (const notice of drawer.querySelectorAll<HTMLElement>('.px-notice')) {
    const text = normalize(notice.textContent || '');
    if (text.includes('campos principais preenchidos')) notice.classList.add('px-editor-secondary-notice');
    if (text.includes('edicao vinculada ao lancamento original')) notice.classList.add('px-editor-secondary-notice');
  }
}

function syncEditor() {
  const drawer = document.querySelector<HTMLElement>('.px-launch-drawer[aria-label="Editar lançamento"]');
  if (!drawer) {
    window.__megPhoenixEditOriginalStatus = null;
    return;
  }

  const situationField = labelElement(drawer, 'Situação');
  const situation = situationField?.querySelector<HTMLSelectElement>('select');
  if (!situation) return;

  if (!drawer.dataset.megOriginalSituation) {
    const original = situation.value === 'planned' ? 'planned' : 'paid';
    drawer.dataset.megOriginalSituation = original;
    window.__megPhoenixEditOriginalStatus = original;
  }

  const original = drawer.dataset.megOriginalSituation as 'planned' | 'paid';
  window.__megPhoenixEditOriginalStatus = original;
  const settlement = original === 'planned' && situation.value === 'paid';
  drawer.classList.toggle('is-payment-settlement', settlement);

  const plannedOption = situation.querySelector<HTMLOptionElement>('option[value="planned"]');
  const situationHint = situationField?.querySelector<HTMLElement>('small');
  if (original === 'paid') {
    if (plannedOption) plannedOption.disabled = true;
    if (situationHint) situationHint.textContent = 'Pagamento já confirmado. Reabertura exige um fluxo próprio de estorno/reabertura.';
  } else if (settlement) {
    if (situationHint) situationHint.textContent = 'A confirmação fará uma baixa real, não apenas uma alteração de status.';
  }

  ensureSettlementHint(drawer, settlement);
  polishFutureTemplate(drawer);
  polishSecondaryNotices(drawer);

  const reviewButton = drawer.querySelector<HTMLButtonElement>('.px-review-launch');
  if (reviewButton && settlement && !normalize(reviewButton.textContent || '').includes('obrigatorio')) {
    if (reviewButton.textContent !== 'Revisar baixa') reviewButton.textContent = 'Revisar baixa';
  }

  const confirmButton = drawer.querySelector<HTMLButtonElement>('.px-confirm-launch');
  if (confirmButton && settlement && !normalize(confirmButton.textContent || '').includes('duplicidade')) {
    const next = confirmButton.getAttribute('aria-busy') === 'true' ? 'Baixando pagamento…' : 'Dar baixa no pagamento';
    if (confirmButton.textContent !== next) confirmButton.textContent = next;
  }
}

if (typeof document !== 'undefined') {
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      syncEditor();
    });
  };
  document.addEventListener('change', (event) => {
    if (event.target instanceof HTMLSelectElement && event.target.closest('.px-launch-drawer')) schedule();
  }, true);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  schedule();
}
