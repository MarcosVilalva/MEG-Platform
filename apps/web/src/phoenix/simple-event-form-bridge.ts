import { authenticatedRequest } from '../app/auth-client';
import { payablesClient } from '../app/payables-client';
import { preparePhoenixSimpleEvent, runPhoenixSimpleEventWrite, type PhoenixSimpleEventInput } from './data/phoenix-write-gateway';
import { clearPhoenixReadModelCache } from './data/load-phoenix-read-model';
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

function modalityValue(root: ParentNode) {
  return normalize(root.querySelector<HTMLSelectElement>('[data-phoenix-modality-select]')?.value || '');
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

function sourceAccountSelect(root: HTMLElement) {
  return selectByLabel(root, 'Conta de origem') || selectByLabel(root, 'Conta financeira');
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

function benefitSelection(root: HTMLElement) {
  const accountText = sourceAccountSelect(root)?.selectedOptions[0]?.textContent || '';
  const paymentText = paymentSelect(root)?.selectedOptions[0]?.textContent || '';
  const account = normalize(accountText);
  const payment = normalize(paymentText);
  return {
    isBenefit: account.includes('BENEF') || account.includes('VEROCARD') || account.includes('ALIMENTA'),
    isVerocard: payment.includes('VEROCARD'),
  };
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
  const account = sourceAccountSelect(root);
  const date = inputByLabel(root, 'Data do evento')?.value || '';
  const amount = parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || '');
  const category = type === 'expense' ? selectByLabel(root, 'Grupo') : selectByLabel(root, 'Classificação da receita');
  const payment = paymentSelect(root);
  const notes = textareaByLabel(root, 'Observações opcionais')?.value.trim() || undefined;
  const benefit = benefitSelection(root);

  return {
    description,
    type,
    status: type === 'income' || (benefit.isBenefit && benefit.isVerocard) ? 'paid' : 'planned',
    date,
    amount,
    accountId: account?.value || undefined,
    categoryId: category?.value || undefined,
    paymentMethodId: payment?.value || undefined,
    notes,
  };
}

function recurrenceFrequency(root: HTMLElement): 'weekly' | 'monthly' | 'yearly' {
  const value = normalize(selectByLabel(root, 'Periodicidade')?.value || 'MENSAL');
  if (value.startsWith('SEMAN')) return 'weekly';
  if (value.startsWith('ANU')) return 'yearly';
  return 'monthly';
}

function recurrenceCount(root: HTMLElement) {
  const value = Number(inputByLabel(root, 'Quantidade')?.value || 0);
  return Number.isFinite(value) ? Math.max(2, Math.min(120, Math.trunc(value))) : 2;
}

function newOperationId(kind: 'transfer' | 'recurring') {
  const uuid = globalThis.crypto?.randomUUID?.();
  const suffix = uuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return `phoenix-${kind}-${suffix}`;
}

function mutationFingerprint(root: HTMLElement) {
  return JSON.stringify({
    type: activeType(root),
    description: inputByLabel(root, 'Descrição')?.value.trim() || '',
    accountId: sourceAccountSelect(root)?.value || '',
    destinationId: selectByLabel(root, 'Conta de destino')?.value || '',
    date: inputByLabel(root, 'Data do evento')?.value || '',
    amount: parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || ''),
    categoryId: selectByLabel(root, 'Grupo')?.value || selectByLabel(root, 'Classificação da receita')?.value || '',
    paymentMethodId: paymentSelect(root)?.value || '',
    recurring: toggleChecked(root, 'Lançamento recorrente'),
    frequency: recurrenceFrequency(root),
    count: recurrenceCount(root),
    notes: textareaByLabel(root, 'Observações opcionais')?.value.trim() || '',
  });
}

function unsupportedReason(root: HTMLElement) {
  const type = activeType(root);
  const amount = parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || '');
  const recurring = toggleChecked(root, 'Lançamento recorrente');
  if (type === 'transfer' && amount < 0) return 'Transferências usam valor positivo entre as contas. Para estorno, registre a operação inversa.';
  if (recurring && type !== 'expense') return 'Recorrência automática está liberada somente para despesas.';
  if (recurring && amount < 0) return 'Recorrência não aceita valor negativo. Registre o estorno como lançamento financeiro separado.';
  if (toggleChecked(root, 'Salvar como modelo')) return 'Modelos ainda não possuem contrato oficial de gravação.';

  const selectedPayment = paymentSelect(root)?.selectedOptions[0]?.textContent || '';
  const method = normalize(selectedPayment);
  const benefit = benefitSelection(root);
  const modality = modalityValue(root);

  if (benefit.isBenefit && type !== 'transfer') {
    const validBenefitFlow = benefit.isVerocard
      && (type === 'income' || modality === 'ALIMENTACAO' || modality === 'VEROCARD');
    if (!validBenefitFlow) {
      return 'A conta de benefício só pode ser usada pelo fluxo VEROCARD/ALIMENTAÇÃO.';
    }
  }

  if (type === 'income' && selectedPayment && !canonicalPhoenixIncomePaymentMethod(selectedPayment)) {
    return `Receitas estão liberadas somente para ${PHOENIX_INCOME_PAYMENT_METHODS.join(', ')}.`;
  }
  if (method.includes('CARTAO') || method.includes('CREDITO') || method.includes('CREDIARIO')) {
    return 'Cartão e crediário usam o writer específico do domínio de faturas.';
  }
  return '';
}

function hideUnsupportedTemplate(root: HTMLElement) {
  const label = [...root.querySelectorAll<HTMLLabelElement>('label.px-switch')]
    .find((item) => normalize(item.querySelector('strong')?.textContent || '') === 'SALVAR COMO MODELO');
  if (!label) return;
  const checkbox = label.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (checkbox?.checked) checkbox.click();
  label.hidden = true;
  const templateField = fieldByLabel(root, 'Nome do modelo');
  if (templateField) templateField.hidden = true;
}

function refreshWriterCopy(root: HTMLElement) {
  const summaryRows = [...root.querySelectorAll<HTMLElement>('.px-preview-box > div')];
  const statusRow = summaryRows.find((row) => normalize(row.querySelector('span')?.textContent || '') === 'SITUACAO INICIAL');
  const statusText = statusRow?.querySelector('strong');
  if (statusText && normalize(statusText.textContent).includes('GRAVACAO')) statusText.textContent = 'Pronto para gravar após revisão';

  const reviewedNotice = [...root.querySelectorAll<HTMLElement>('.px-notice.ok')]
    .find((node) => normalize(node.textContent).includes('PARIDADE DO FORMULARIO VALIDADA'));
  if (reviewedNotice) reviewedNotice.textContent = 'Paridade do formulário validada. Clique novamente em Salvar lançamento para confirmar no servidor.';

  const recurringSwitch = [...root.querySelectorAll<HTMLLabelElement>('label.px-switch')]
    .find((item) => normalize(item.querySelector('strong')?.textContent || '') === 'LANCAMENTO RECORRENTE');
  const recurringHelp = recurringSwitch?.querySelector('small');
  if (recurringHelp) recurringHelp.textContent = 'Crie automaticamente os próximos compromissos conforme a periodicidade.';

  const negativeNotice = [...root.querySelectorAll<HTMLElement>('.px-notice.warn')]
    .find((node) => normalize(node.textContent).includes('VALOR NEGATIVO IDENTIFICADO'));
  if (negativeNotice) negativeNotice.textContent = 'Valor negativo identificado. O lançamento será gravado preservando o sinal como estorno/reversão.';
}

function reviewed(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>('.px-notice.ok')]
    .some((node) => normalize(node.textContent).includes('PARIDADE DO FORMULARIO VALIDADA'));
}

function setButton(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (!button) return;

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
  if (button.disabled) {
    state.mode = 'review';
    state.fingerprint = '';
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
    hideUnsupportedTemplate(root);
    refreshWriterCopy(root);
    setButton(root);
  } finally {
    syncing = false;
  }
}

function domainErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    INVALID_SOURCE_ACCOUNT: 'A conta de origem não está mais disponível.',
    INVALID_DESTINATION_ACCOUNT: 'A conta de destino não está mais disponível.',
    SAME_TRANSFER_ACCOUNT: 'Escolha contas diferentes para origem e destino.',
    SOURCE_ACCOUNT_NOT_MONETARY: 'A conta de origem não aceita transferência monetária.',
    DESTINATION_ACCOUNT_NOT_MONETARY: 'A conta de destino não aceita transferência monetária.',
    INSUFFICIENT_SOURCE_ACCOUNT_BALANCE: 'O saldo disponível na conta de origem é insuficiente para esta transferência.',
    FUTURE_TRANSFER_NOT_ALLOWED: 'A transferência não pode ser registrada em data futura.',
    INVALID_TRANSFER_DATE: 'Informe uma data válida para a transferência.',
    INVALID_CATEGORY: 'O grupo selecionado não está mais disponível.',
    INVALID_RECURRENCE_START: 'Informe uma data inicial válida para a recorrência.',
    INVALID_RECURRENCE_END: 'A configuração de término da recorrência é inválida.',
    OPERATION_ID_REUSED: 'A tentativa atual não corresponde à operação original. Revise os dados antes de tentar novamente.',
  };
  return messages[code] || code || 'Não foi possível confirmar a operação no servidor.';
}

async function submitTransfer(root: HTMLElement) {
  const sourceAccountId = sourceAccountSelect(root)?.value || '';
  const destinationAccountId = selectByLabel(root, 'Conta de destino')?.value || '';
  const date = inputByLabel(root, 'Data do evento')?.value || '';
  const amount = Math.abs(parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || ''));
  const description = inputByLabel(root, 'Descrição')?.value.trim() || '';
  const notes = textareaByLabel(root, 'Observações opcionais')?.value.trim() || undefined;
  state.operationId ||= newOperationId('transfer');
  await authenticatedRequest('/finance/transfers', {
    method: 'POST',
    body: JSON.stringify({
      operationId: state.operationId,
      sourceAccountId,
      destinationAccountId,
      amount,
      date,
      description,
      notes,
    }),
  });
  clearPhoenixReadModelCache();
  window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: '/finance/transfers', method: 'POST' } }));
}

async function submitRecurring(root: HTMLElement) {
  const description = inputByLabel(root, 'Descrição')?.value.trim() || '';
  const categoryId = selectByLabel(root, 'Grupo')?.value || undefined;
  const amount = Math.abs(parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || ''));
  const nextDueDate = inputByLabel(root, 'Data do evento')?.value || '';
  const notes = textareaByLabel(root, 'Observações opcionais')?.value.trim() || undefined;
  state.operationId ||= newOperationId('recurring');
  await payablesClient.createRecurring({
    categoryId,
    description,
    amount,
    frequency: recurrenceFrequency(root),
    nextDueDate,
    occurrenceCount: recurrenceCount(root),
    notes,
    operationId: state.operationId,
  });
  clearPhoenixReadModelCache();
  window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: '/payables/recurring', method: 'POST' } }));
}

async function submit(root: HTMLElement) {
  if (root.dataset.phoenixEditingEventId) {
    state.mode = 'save';
    setFeedback(root, 'Este lançamento existente usa o fluxo de edição protegida. A criação de um novo registro foi bloqueada para evitar duplicidade.', 'warn');
    setButton(root);
    return;
  }

  const reason = unsupportedReason(root);
  if (reason) {
    state.mode = 'save';
    setFeedback(root, reason, 'warn');
    setButton(root);
    return;
  }

  const nextFingerprint = mutationFingerprint(root);
  if (state.fingerprint !== nextFingerprint) {
    state.fingerprint = nextFingerprint;
    state.operationId = undefined;
  }

  const duplicate = root.querySelector('.px-rule-box.duplicate');
  if (duplicate && !window.confirm(`${duplicate.textContent || 'Possível duplicidade encontrada.'}\n\nDeseja gravar mesmo assim?`)) return;

  const type = activeType(root);
  const recurring = toggleChecked(root, 'Lançamento recorrente');

  try {
    state.mode = 'saving';
    setFeedback(root, 'Gravando e aguardando confirmação do servidor…');
    setButton(root);

    if (type === 'transfer') {
      await submitTransfer(root);
      state.mode = 'confirmed';
      setFeedback(root, 'Transferência confirmada no servidor com duas pernas contábeis e rastreabilidade. Atualizando a tela…', 'ok');
    } else if (recurring) {
      await submitRecurring(root);
      state.mode = 'confirmed';
      setFeedback(root, 'Recorrência confirmada. Os compromissos foram materializados conforme a periodicidade informada. Atualizando a tela…', 'ok');
    } else {
      const payload = payloadFromDrawer(root);
      if (!payload) throw new Error('PHOENIX_WRITE_NOT_READY');
      const prepared = preparePhoenixSimpleEvent(payload, state.operationId);
      state.operationId = prepared.operationId;
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
      const adjustment = payload.amount < 0 ? 'Estorno/reversão' : payload.type === 'income' ? 'Receita recebida' : payload.status === 'paid' ? 'Despesa realizada' : 'Despesa pendente';
      setFeedback(root, `Lançamento confirmado no servidor. ${adjustment} registrada com rastreabilidade e operationId. Atualizando a tela…`, 'ok');
      window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: '/finance/events', method: 'POST' } }));
    }

    setButton(root);
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click();
    }, 150);
  } catch (error) {
    state.mode = 'error';
    setFeedback(root, domainErrorMessage(error), 'warn');
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
  const next = mutationFingerprint(root);
  if (state.fingerprint && state.fingerprint !== next) {
    state.operationId = undefined;
    state.fingerprint = next;
    state.mode = 'review';
    clearFeedback(root);
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
