import { preparePhoenixSimpleEvent, runPhoenixSimpleEventWrite, type PhoenixSimpleEventInput } from './data/phoenix-write-gateway';
import { PHOENIX_INCOME_PAYMENT_METHODS, canonicalPhoenixIncomePaymentMethod } from './income-payment-methods';

type BridgeMode = 'review' | 'save' | 'saving' | 'error' | 'confirmed';

type BridgeState = {
  mode: BridgeMode;
  fingerprint: string;
  operationId?: string;
  confirmedEventId?: string;
};

const state: BridgeState = { mode: 'review', fingerprint: '' };
let observer: MutationObserver | null = null;
let syncing = false;

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function drawer() {
  return document.querySelector<HTMLElement>('.px-launch-drawer');
}

function fieldByLabel(root: ParentNode, startsWith: string) {
  const target = normalize(startsWith);
  return [...root.querySelectorAll<HTMLLabelElement>('label.px-field')]
    .find((label) => normalize(label.querySelector('span')?.textContent || '').startsWith(target)) || null;
}

function selectByLabel(root: ParentNode, startsWith: string) {
  return fieldByLabel(root, startsWith)?.querySelector<HTMLSelectElement>('select') || null;
}

function inputByLabel(root: ParentNode, startsWith: string) {
  return fieldByLabel(root, startsWith)?.querySelector<HTMLInputElement>('input') || null;
}

function textareaByLabel(root: ParentNode, startsWith: string) {
  return fieldByLabel(root, startsWith)?.querySelector<HTMLTextAreaElement>('textarea') || null;
}

function activeType(root: ParentNode): 'income' | 'expense' | 'transfer' {
  const label = normalize(root.querySelector('.px-segment button.active')?.textContent || 'DESPESA');
  if (label === 'RECEITA') return 'income';
  if (label.includes('TRANSFER')) return 'transfer';
  return 'expense';
}

function parseMoney(value: string) {
  const normalized = String(value || '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function toggleChecked(root: ParentNode, title: string) {
  const target = normalize(title);
  const label = [...root.querySelectorAll<HTMLLabelElement>('label.px-switch')]
    .find((item) => normalize(item.querySelector('strong')?.textContent || '') === target);
  return Boolean(label?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked);
}

function feedback(root: HTMLElement) {
  let node = root.querySelector<HTMLElement>('[data-phoenix-writer-feedback]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.phoenixWriterFeedback = 'true';
    node.className = 'px-notice';
    const button = root.querySelector('.px-review-launch');
    button?.parentElement?.insertBefore(node, button);
  }
  return node;
}

function setFeedback(root: HTMLElement, text: string, kind: 'ok' | 'warn' | 'plain' = 'plain') {
  const node = feedback(root);
  node.textContent = text;
  node.className = `px-notice${kind === 'plain' ? '' : ` ${kind}`}`;
}

function clearFeedback(root: HTMLElement) {
  root.querySelector('[data-phoenix-writer-feedback]')?.remove();
}

function paymentSelect(root: HTMLElement) {
  return selectByLabel(root, 'Forma de recebimento') || selectByLabel(root, 'Forma de pagamento');
}

function restrictIncomePaymentMethods(root: HTMLElement) {
  const select = paymentSelect(root);
  if (!select) return;
  const income = activeType(root) === 'income';
  [...select.options].forEach((option) => {
    if (!option.value) return;
    const allowed = Boolean(canonicalPhoenixIncomePaymentMethod(option.textContent));
    option.hidden = income && !allowed;
    option.disabled = income && !allowed;
  });
  if (income && select.value) {
    const selected = select.selectedOptions[0];
    if (selected && !canonicalPhoenixIncomePaymentMethod(selected.textContent)) {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

function payloadFromDrawer(root: HTMLElement): PhoenixSimpleEventInput | null {
  const type = activeType(root);
  if (type === 'transfer') return null;
  const description = inputByLabel(root, 'Descrição')?.value.trim() || '';
  const account = selectByLabel(root, 'Conta financeira');
  const date = inputByLabel(root, 'Data do evento')?.value || '';
  const amount = Math.abs(parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || ''));
  const category = type === 'expense' ? selectByLabel(root, 'Grupo') : selectByLabel(root, 'Classificação da receita');
  const payment = paymentSelect(root);
  const notes = textareaByLabel(root, 'Observações opcionais')?.value.trim() || undefined;

  return {
    description,
    type,
    status: type === 'income' ? 'paid' : 'planned',
    date,
    amount,
    accountId: account?.value || undefined,
    categoryId: category?.value || undefined,
    paymentMethodId: payment?.value || undefined,
    notes,
  };
}

function unsupportedReason(root: HTMLElement) {
  const type = activeType(root);
  if (type === 'transfer') return 'Transferências continuam bloqueadas até a liberação do writer atômico de duas pernas.';
  const moneyInput = root.querySelector<HTMLInputElement>('.px-money-mask');
  if (String(moneyInput?.value || '').includes('-')) return 'Estornos e valores negativos continuam bloqueados neste primeiro writer.';
  if (toggleChecked(root, 'Lançamento recorrente')) return 'Recorrência continua em simulação e ainda não pode ser gravada por este fluxo.';
  if (toggleChecked(root, 'Salvar como modelo')) return 'Modelos ainda não possuem contrato oficial de gravação.';

  const selectedAccount = selectByLabel(root, 'Conta financeira')?.selectedOptions[0]?.textContent || '';
  const accountName = normalize(selectedAccount);
  if (accountName.includes('BENEF') || accountName.includes('VEROCARD') || accountName.includes('ALIMENTA')) {
    return 'Movimentações de benefício continuam fora do primeiro writer monetário.';
  }

  const selectedPayment = paymentSelect(root)?.selectedOptions[0]?.textContent || '';
  const method = normalize(selectedPayment);
  if (type === 'income' && selectedPayment && !canonicalPhoenixIncomePaymentMethod(selectedPayment)) {
    return `Receitas estão liberadas somente para ${PHOENIX_INCOME_PAYMENT_METHODS.join(', ')}.`;
  }
  if (method.includes('CARTAO') || method.includes('CREDITO') || method.includes('CREDIARIO')) {
    return 'Cartão e crediário continuam bloqueados até a liberação do writer específico desse domínio.';
  }
  return '';
}

function fingerprint(payload: PhoenixSimpleEventInput) {
  return JSON.stringify({
    description: payload.description,
    type: payload.type,
    status: payload.status,
    date: payload.date,
    amount: payload.amount,
    accountId: payload.accountId || '',
    categoryId: payload.categoryId || '',
    paymentMethodId: payload.paymentMethodId || '',
    notes: payload.notes || '',
  });
}

function reviewed(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>('.px-notice.ok')]
    .some((node) => normalize(node.textContent).includes('PARIDADE DO FORMULARIO VALIDADA'));
}

function setButton(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (!button) return;

  if (button.disabled) {
    state.mode = 'review';
    state.fingerprint = '';
    return;
  }

  if (state.mode === 'saving') {
    button.disabled = true;
    button.textContent = 'Gravando no servidor…';
    return;
  }
  if (state.mode === 'confirmed') {
    button.disabled = false;
    button.textContent = 'Fechar lançamento';
    return;
  }
  if (state.mode === 'error') {
    button.disabled = false;
    button.textContent = 'Tentar gravar novamente';
    return;
  }
  if (reviewed(root)) {
    state.mode = 'save';
    button.textContent = 'Salvar lançamento';
    return;
  }
  state.mode = 'review';
  button.textContent = 'Revisar lançamento';
}

function syncDrawer() {
  if (syncing) return;
  const root = drawer();
  if (!root) {
    state.mode = 'review';
    state.fingerprint = '';
    state.operationId = undefined;
    state.confirmedEventId = undefined;
    return;
  }
  syncing = true;
  try {
    restrictIncomePaymentMethods(root);
    setButton(root);
  } finally {
    syncing = false;
  }
}

async function submit(root: HTMLElement) {
  const reason = unsupportedReason(root);
  if (reason) {
    state.mode = 'save';
    setFeedback(root, reason, 'warn');
    setButton(root);
    return;
  }

  const payload = payloadFromDrawer(root);
  if (!payload) {
    setFeedback(root, 'Este tipo de lançamento ainda não está liberado.', 'warn');
    return;
  }

  const nextFingerprint = fingerprint(payload);
  if (state.fingerprint !== nextFingerprint) {
    state.fingerprint = nextFingerprint;
    state.operationId = undefined;
  }

  const duplicate = root.querySelector('.px-rule-box.duplicate');
  if (duplicate && !window.confirm(`${duplicate.textContent || 'Possível duplicidade encontrada.'}\n\nDeseja gravar mesmo assim?`)) return;

  try {
    const prepared = preparePhoenixSimpleEvent(payload, state.operationId);
    state.operationId = prepared.operationId;
    state.mode = 'saving';
    setFeedback(root, 'Gravando e aguardando confirmação do servidor…');
    setButton(root);

    const result = await runPhoenixSimpleEventWrite(prepared, payload.date.slice(0, 7));
    if (result.status === 'error') {
      state.mode = 'error';
      setFeedback(root, result.message, 'warn');
      setButton(root);
      return;
    }
    if (result.status !== 'confirmed') throw new Error('PHOENIX_WRITE_NOT_CONFIRMED');

    state.mode = 'confirmed';
    state.confirmedEventId = result.event.id;
    setFeedback(
      root,
      `Lançamento confirmado no servidor. ${payload.type === 'income' ? 'Receita recebida' : 'Despesa pendente'} registrada com rastreabilidade e operationId. Atualizando a tela…`,
      'ok'
    );
    setButton(root);

    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: '/finance/events', method: 'POST' } }));
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click();
    }, 150);
  } catch (error) {
    state.mode = 'error';
    setFeedback(root, error instanceof Error ? error.message : 'Não foi possível confirmar o lançamento.', 'warn');
    setButton(root);
  }
}

function closeConfirmed(root: HTMLElement) {
  const close = root.querySelector<HTMLButtonElement>('.px-drawer-head .px-icon-btn');
  if (!close) return;
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    close.click();
  } finally {
    window.setTimeout(() => { window.confirm = originalConfirm; }, 0);
  }
  state.mode = 'review';
  state.fingerprint = '';
  state.operationId = undefined;
  state.confirmedEventId = undefined;
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('.px-review-launch');
  if (!button) return;
  const root = drawer();
  if (!root) return;

  if (state.mode === 'confirmed') {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeConfirmed(root);
    return;
  }
  if (state.mode === 'saving') {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (state.mode === 'save' || state.mode === 'error' || reviewed(root)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void submit(root);
    return;
  }

  const reason = unsupportedReason(root);
  if (reason) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setFeedback(root, reason, 'warn');
    return;
  }
  clearFeedback(root);
  window.setTimeout(syncDrawer, 0);
}

function onInput() {
  const root = drawer();
  if (!root || state.mode === 'saving' || state.mode === 'confirmed') return;
  const payload = payloadFromDrawer(root);
  if (payload) {
    const next = fingerprint(payload);
    if (state.fingerprint && state.fingerprint !== next) {
      state.operationId = undefined;
      state.fingerprint = next;
      state.mode = 'review';
      clearFeedback(root);
    }
  }
  window.setTimeout(syncDrawer, 0);
}

function start() {
  document.addEventListener('click', onClick, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('change', onInput, true);
  observer = new MutationObserver(() => window.setTimeout(syncDrawer, 0));
  observer.observe(document.body, { childList: true, subtree: true });
  syncDrawer();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixSimpleEventFormBridge() {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('input', onInput, true);
  document.removeEventListener('change', onInput, true);
}
