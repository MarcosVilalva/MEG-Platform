import { payablesClient } from '../app/payables-client';
import { authenticatedRequest, readSession } from '../app/auth-client';
import { financeClient, type FinancialEvent } from '../app/finance-client';
import { findPhoenixCanonicalEvent } from './data/phoenix-accepted-create-readback';
import {
  reservePhoenixCreate, notePhoenixCreateReceipt, matchesPhoenixCreateReceipt,
  finishPhoenixCreate, findPhoenixCreatePending, canExplicitlyReplayPhoenixCreate,
  withPhoenixCreateJournalLock, rejectDefinitivePhoenixDuplicate,
  isDefinitivePhoenixDuplicateRejection, pendingPhoenixCreateRequestsExplicitDuplicate,
  type JournalContext,
  type PhoenixCreateJournalRecord, type PhoenixAttemptKind,
} from './data/phoenix-create-attempt-journal';
import {
  isolatedAndroidConfirmationQa,
  preparePhoenixBenefitEvent,
  preparePhoenixSimpleEvent,
  runPhoenixBenefitEventWrite,
  runPhoenixSimpleEventWrite,
  type PhoenixSimpleEventInput, type PhoenixDuplicateCandidate, type PhoenixWriteState,
} from './data/phoenix-write-gateway';
import { preparePhoenixTransfer, runPhoenixTransferWrite } from './data/phoenix-transfer-write-gateway';
import { clearPhoenixReadModelCache } from './data/load-phoenix-read-model';
import { PHOENIX_INCOME_PAYMENT_METHODS, canonicalPhoenixIncomePaymentMethod } from './income-payment-methods';

type BridgeMode = 'review' | 'save' | 'saving' | 'verifying' | 'error' | 'pending' | 'confirmed' | 'duplicate';

type DuplicateReview = {
  candidate?: PhoenixDuplicateCandidate;
  userId: string;
  workspaceId: string;
  fingerprint: string;
  verified: boolean;
  checking: boolean;
};
type BridgeState = {
  duplicateReview?: DuplicateReview;
  mode: BridgeMode;
  fingerprint: string;
  operationId?: string;
  confirmedEventId?: string;
  pendingJournal?: PhoenixCreateJournalRecord;
  pendingReceipt?: {
    operationId: string;
    event: FinancialEvent;
    userId: string;
    fingerprint: string;
  };
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

function visibleRefreshMonth(root: HTMLElement, fallbackDate: string) {
  const pinned = String(root.dataset.phoenixRefreshMonth || '').trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(pinned) ? pinned : fallbackDate.slice(0, 7);
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

function sourceAccountSelect(root: HTMLElement) {
  return root.querySelector<HTMLSelectElement>('[data-phoenix-account-select="source"]')
    || selectByLabel(root, 'Conta de origem')
    || selectByLabel(root, 'Conta financeira');
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
  return root.querySelector<HTMLSelectElement>('[data-phoenix-payment-method-select]')
    || selectByLabel(root, 'Forma de recebimento')
    || selectByLabel(root, 'Forma de pagamento');
}

function setControlledSelect(select: HTMLSelectElement | null, value: string) {
  if (!select || !value || select.value === value) return false;
  select.value = value;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function reconcileBenefitRoute(root: HTMLElement) {
  if (activeType(root) === 'transfer') return false;

  const account = sourceAccountSelect(root);
  const currentAccount = account?.selectedOptions[0];
  const modality = normalize(root.querySelector<HTMLSelectElement>('[data-phoenix-modality-select]')?.value || '');
  const accountLabel = normalize(currentAccount?.textContent || '');
  const accountType = normalize(currentAccount?.dataset.accountType || '');
  const benefitIntent = accountType === 'BENEFIT'
    || accountLabel.includes('BENEF')
    || accountLabel.includes('VEROCARD')
    || accountLabel.includes('ALIMENTA')
    || modality === 'ALIMENTACAO'
    || modality === 'VEROCARD';

  if (!benefitIntent) return false;

  let changed = false;
  const benefitAccount = account
    ? [...account.options].find((option) => option.value && normalize(option.dataset.accountType || '') === 'BENEFIT')
      || [...account.options].find((option) => {
        const label = normalize(option.textContent || '');
        return option.value && (label.includes('BENEF') || label.includes('VEROCARD') || label.includes('ALIMENTA'));
      })
    : null;
  if (benefitAccount?.value) changed = setControlledSelect(account, benefitAccount.value) || changed;

  const payment = paymentSelect(root);
  const verocard = payment
    ? [...payment.options].find((option) => option.value && normalize(option.textContent || '').includes('VEROCARD'))
    : null;
  if (verocard?.value) changed = setControlledSelect(payment, verocard.value) || changed;

  return changed;
}

function benefitSelection(root: HTMLElement) {
  const accountOption = sourceAccountSelect(root)?.selectedOptions[0];
  const paymentOption = paymentSelect(root)?.selectedOptions[0];
  const account = normalize(accountOption?.textContent || '');
  const accountType = normalize(accountOption?.dataset.accountType || '');
  const payment = normalize(paymentOption?.textContent || '');
  const modality = normalize(root.querySelector<HTMLSelectElement>('[data-phoenix-modality-select]')?.value || '');
  return {
    isBenefit: accountType === 'BENEFIT'
      || account.includes('BENEF')
      || account.includes('VEROCARD')
      || account.includes('ALIMENTA')
      || modality === 'ALIMENTACAO'
      || modality === 'VEROCARD',
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

function newRecurringOperationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  const suffix = uuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return `phoenix-recurring-${suffix}`;
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

  if (benefit.isBenefit && type !== 'transfer' && !benefit.isVerocard) {
    return 'A conta de benefício só pode ser usada com a forma de pagamento VEROCARD.';
  }

  if (type === 'income' && selectedPayment && !canonicalPhoenixIncomePaymentMethod(selectedPayment)) {
    return `Receitas estão liberadas somente para ${PHOENIX_INCOME_PAYMENT_METHODS.join(', ')}.`;
  }
  if (method.includes('CARTAO') || method.includes('CREDITO') || method.includes('CREDIARIO')) {
    return 'Compras no cartão são salvas pelo fluxo padrão do MEG com atualização automática da fatura e das parcelas.';
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

async function journalContext(userId: string): Promise<JournalContext> {
  if (!userId || readSession()?.user.id !== userId) throw new Error('PHOENIX_JOURNAL_SESSION_CHANGED');
  // GET publico de leitura autenticada que ja retorna o workspace ativo,
  // com cache desabilitado explicitamente (auth-client guarda GET por 5min).
  const revision = await authenticatedRequest<{ workspace?: { id?: string } }>('/app-state/revision', {
    cache: 'no-store',
  });
  const workspaceId = revision?.workspace?.id;
  if (!workspaceId || readSession()?.user.id !== userId) {
    throw new Error('PHOENIX_JOURNAL_WORKSPACE_UNAVAILABLE');
  }
  return { userId, apiUrl: import.meta.env.VITE_API_URL || '',
    workspaceId, storage: localStorage };
}
function outstandingPhoenixAttempt() {
  try { return findPhoenixCreatePending(localStorage); }
  catch { return true; } // Storage inválido/negado nunca autoriza novo POST.
}
function setRetryControl(root: HTMLElement) {
  const anchor = root.querySelector<HTMLButtonElement>('.px-review-launch');
  const existing = root.querySelector<HTMLButtonElement>('.px-retry-unconfirmed:not(.px-duplicate-check):not(.px-duplicate-override)');
  const shouldShow = state.mode === 'pending' && Boolean(state.pendingJournal && !state.pendingJournal.eventId);
  if (!shouldShow || !anchor) {
    if (existing) existing.remove();
    return;
  }
  if (!existing) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'px-retry-unconfirmed';
    action.textContent = 'Retomar tentativa anterior';
    action.setAttribute('aria-label', 'Reenviar o mesmo lançamento pendente, sem criar nova operação');
    anchor.insertAdjacentElement('afterend', action);
  }
}
function setDuplicateControls(root: HTMLElement) {
  const anchor = root.querySelector<HTMLButtonElement>('.px-review-launch');
  const review = state.mode === 'duplicate' ? state.duplicateReview : undefined;
  const check = root.querySelector<HTMLButtonElement>('.px-duplicate-check');
  const override = root.querySelector<HTMLButtonElement>('.px-duplicate-override');
  if (!anchor || !review?.candidate?.id) {
    check?.remove();
    override?.remove();
    return;
  }
  if (!check) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'px-retry-unconfirmed px-duplicate-check';
    action.textContent = 'Conferir lançamento no histórico';
    anchor.insertAdjacentElement('afterend', action);
  }
  if (!override) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'px-retry-unconfirmed px-duplicate-override';
    action.textContent = 'Registrar outro lançamento idêntico';
    anchor.insertAdjacentElement('afterend', action);
  }
  const checkButton = root.querySelector<HTMLButtonElement>('.px-duplicate-check');
  const overrideButton = root.querySelector<HTMLButtonElement>('.px-duplicate-override');
  if (checkButton) checkButton.disabled = review.checking;
  if (overrideButton) {
    overrideButton.disabled = !review.verified || review.checking;
    overrideButton.setAttribute('aria-label', 'Registrar uma NOVA operação idêntica com confirmação explícita');
  }
}
function setButton(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (!button) return;
  if (outstandingPhoenixAttempt()
    && !['saving', 'verifying', 'confirmed'].includes(state.mode)) {
    state.mode = 'pending';
  }
  setRetryControl(root);
  setDuplicateControls(root);
  if (state.mode === 'duplicate') {
    button.dataset.phoenixDuplicateHold = 'true';
    button.disabled = true;
    button.textContent = 'Possível duplicidade: confira o histórico';
    return;
  }
  if (button.dataset.phoenixDuplicateHold === 'true') {
    delete button.dataset.phoenixDuplicateHold;
    button.disabled = false;
  }

  if (state.mode === 'saving' || state.mode === 'verifying') {
    button.disabled = true;
    button.textContent = state.mode === 'verifying' ? 'Verificando no histórico…' : 'Gravando no servidor…';
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
  if (state.mode === 'pending') {
    button.disabled = false;
    button.textContent = 'Verificar gravação';
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
    // Fechar o drawer não significa que uma tentativa financeira ambígua
    // pode receber outro operationId nesta sessão.
    if (state.mode === 'saving' || state.mode === 'pending' || state.mode === 'verifying'
        || (state.mode === 'error' && state.operationId)) return;
    state.mode = 'review';
    state.fingerprint = '';
    state.operationId = undefined;
    state.confirmedEventId = undefined;
    state.pendingReceipt = undefined;
    state.pendingJournal = undefined;
    state.duplicateReview = undefined;
    return;
  }
  syncing = true;
  try {
    reconcileBenefitRoute(root);
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
    PHOENIX_JOURNAL_LOCK_UNAVAILABLE: 'Este navegador não oferece trava segura entre abas. Nenhum lançamento foi enviado.',
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
  const prepared = preparePhoenixTransfer({
    sourceAccountId,
    destinationAccountId,
    amount,
    date,
    description,
    notes,
  }, state.operationId);
  state.operationId = prepared.operationId;
  const result = await runPhoenixTransferWrite(prepared, visibleRefreshMonth(root, date));
  if (result.status === 'error') throw new Error(result.code);
  if (result.status !== 'confirmed') throw new Error('PHOENIX_TRANSFER_WRITE_NOT_CONFIRMED');
  window.dispatchEvent(new CustomEvent('meg:phoenix-snapshot-committed', { detail: { snapshot: result.snapshot } }));
  return result;
}

async function submitRecurring(root: HTMLElement) {
  const description = inputByLabel(root, 'Descrição')?.value.trim() || '';
  const categoryId = selectByLabel(root, 'Grupo')?.value || undefined;
  const amount = Math.abs(parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || ''));
  const nextDueDate = inputByLabel(root, 'Data do evento')?.value || '';
  const notes = textareaByLabel(root, 'Observações opcionais')?.value.trim() || undefined;
  state.operationId ||= newRecurringOperationId();
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

/**
 * PT112 candidato Android. O POST retornou 'accepted': somente GET de histórico
 * canônico pode confirmar o ID. Repetir 'Verificar gravação' não faz novo POST.
 */
async function readPendingIntent(root: HTMLElement): Promise<{
  journal: PhoenixCreateJournalRecord; kind: PhoenixAttemptKind;
  payload: ReturnType<typeof preparePhoenixSimpleEvent>['payload'];
  context: JournalContext;
} | null> {
  const payload = payloadFromDrawer(root);
  const userId = readSession()?.user.id;
  if (!payload || !userId) return null;
  const benefit = benefitSelection(root);
  const kind: PhoenixAttemptKind = benefit.isBenefit && benefit.isVerocard ? 'benefit' : 'monetary';
  const preparedPayload = kind === 'benefit' ? { ...payload, status: 'paid' as const } : payload;
  // Uma excecao explicita que recebeu resposta incerta deve ser reconstituida
  // com a MESMA chave e o MESMO corpo, jamais convertida em POST normal.
  const payloadForReplay = pendingPhoenixCreateRequestsExplicitDuplicate(localStorage)
    ? { ...preparedPayload, allowDuplicate: true } : preparedPayload;
  const prepared = kind === 'benefit'
    ? preparePhoenixBenefitEvent(payloadForReplay as Parameters<typeof preparePhoenixBenefitEvent>[0], state.operationId)
    : preparePhoenixSimpleEvent(payloadForReplay, state.operationId);
  if (!outstandingPhoenixAttempt()) return null;
  const context = await journalContext(userId);
  const candidate = await withPhoenixCreateJournalLock(() =>
    reservePhoenixCreate(context, kind, prepared.payload, prepared.operationId));
  if (candidate.status !== 'same') return null;
  state.pendingJournal = candidate.record;
  state.operationId = candidate.record.operationId;
  state.fingerprint = mutationFingerprint(root);
  return { journal: candidate.record, kind, payload: prepared.payload, context };
}

/**
 * GET estrito: a tecla Verificar gravação jamais refaz POST.
 * Recibo mínimo persistido permite localizar o ID após reinício.
 */
async function verifyPendingPhoenixCreate(root: HTMLElement) {
  if (!outstandingPhoenixAttempt()) {
    state.mode = 'pending';
    setFeedback(root, 'Nenhum comprovante durável foi encontrado. Não crie outro lançamento antes de conferir o histórico.', 'warn');
    setButton(root);
    return;
  }
  let pending: Awaited<ReturnType<typeof readPendingIntent>>;
  try { pending = await readPendingIntent(root); }
  catch {
    state.mode = 'pending';
    setFeedback(root, 'Não foi possível conferir usuário e workspace pela API. A tentativa antiga permanece bloqueada, sem reenvio.', 'warn');
    setButton(root);
    return;
  }
  if (!pending) {
    state.mode = 'pending';
    setFeedback(root, 'Há uma tentativa financeira anterior. Reponha exatamente os mesmos dados e usuário para verificá-la.', 'warn');
    setButton(root);
    return;
  }
  if (!pending.journal.eventId) {
    state.mode = 'pending';
    setFeedback(root, 'A resposta anterior não chegou. Verificação por ID indisponível. A retomada exige ação específica com a mesma chave e os mesmos dados.', 'warn');
    setButton(root);
    return;
  }
  if (drawer() !== root) return;
  state.mode = 'verifying';
  setFeedback(root, 'Conferindo o mesmo lançamento no histórico financeiro…');
  setButton(root);
  const controller = new AbortController();
  const deadline = window.setTimeout(() => controller.abort(), 15_000);
  let found: Awaited<ReturnType<typeof findPhoenixCanonicalEvent>>;
  try {
    found = await findPhoenixCanonicalEvent({
      expectedUserId: pending.context.userId,
      eventId: pending.journal.eventId,
      currentUserId: () => readSession()?.user.id,
      getHistory: signal => financeClient.getHistorySnapshot(signal),
      listPage: (page, size, signal) => financeClient.listEvents(page, size, '', signal),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(deadline);
  }
  if (drawer() !== root || state.operationId !== pending.journal.operationId
      || mutationFingerprint(root) !== state.fingerprint) {
    state.mode = 'pending';
    return;
  }
  if (found.status !== 'found'
      || !await matchesPhoenixCreateReceipt(pending.journal, found.event)) {
    state.mode = 'pending';
    setFeedback(root, found.status === 'blocked'
      ? 'Sessão alterada. A confirmação foi bloqueada.'
      : 'Ainda não foi possível confirmar exatamente o mesmo evento. Não envie outro lançamento.', 'warn');
    setButton(root);
    return;
  }
  try {
    await withPhoenixCreateJournalLock(() =>
      finishPhoenixCreate(pending.context, pending.journal, found.event));
  } catch {
    state.mode = 'pending';
    setFeedback(root, 'Não foi possível finalizar com segurança o recibo local. Não reenvie a operação.', 'warn');
    setButton(root);
    return;
  }
  state.mode = 'confirmed';
  state.confirmedEventId = found.event.id;
  state.pendingJournal = undefined;
  state.pendingReceipt = undefined;
  setFeedback(root, 'Lançamento confirmado pela leitura do histórico financeiro. Atualizando a tela…', 'ok');
  setButton(root);
  window.dispatchEvent(new CustomEvent('meg:data-invalidated', {
    detail: { path: '/finance', method: 'GET', reason: 'verified-phoenix-event' },
  }));
}

/**
 * Ação explícita SEPARADA de Verificar gravação. Reenvia somente o mesmo
 * payload/código de operação que foi salvo ANTES do primeiro POST.
 * O servidor garante idempotência pela chave e hash de requisição.
 */
function sameDuplicateCandidate(
  candidate: PhoenixDuplicateCandidate,
  event: FinancialEvent,
  payload: PhoenixSimpleEventInput,
): boolean {
  const cents = (value: unknown) => {
    const n = Number(value);
    const scaled = Math.round(n * 100);
    return Number.isFinite(n) && Number.isSafeInteger(scaled) ? scaled : null;
  };
  return candidate.entity === 'financial-event'
    && candidate.id === event.id
    && normalize(candidate.description) === normalize(event.description)
    && normalize(payload.description) === normalize(event.description)
    && candidate.date === String(event.date).slice(0, 10)
    && payload.date === String(event.date).slice(0, 10)
    && candidate.type === event.type && payload.type === event.type
    && cents(candidate.amount) !== null && cents(candidate.amount) === cents(event.amount)
    && cents(payload.amount) === cents(event.amount)
    && (payload.accountId || null) === (event.accountId || null)
    && (payload.categoryId || null) === (event.categoryId || null)
    && (payload.paymentMethodId || null) === (event.paymentMethodId || null);
}

async function handleDefinitiveDuplicate(
  root: HTMLElement,
  result: PhoenixWriteState,
  context: JournalContext,
  journal: PhoenixCreateJournalRecord,
  fingerprint: string,
): Promise<boolean> {
  if (result.status !== 'error' || !isDefinitivePhoenixDuplicateRejection(result, journal.operationId)) return false;
  // Operacao rejeitada pela API HTTP409 nao tem commit. Somente a tentativa
  // exata, no mesmo workspace, sem recibo pode ser liberada sob Web Locks.
  await withPhoenixCreateJournalLock(() => rejectDefinitivePhoenixDuplicate(context, journal));
  state.operationId = undefined;
  state.pendingJournal = undefined;
  state.pendingReceipt = undefined;
  state.duplicateReview = {
    candidate: result.details?.duplicate,
    userId: context.userId, workspaceId: context.workspaceId,
    fingerprint, verified: false, checking: false,
  };
  state.mode = 'duplicate';
  if (drawer() === root) {
    const item = result.details?.duplicate;
    setFeedback(root, item?.id
      ? 'O servidor rejeitou esta nova tentativa (409). Existe lançamento semelhante: '
        + String(item.description || 'sem descrição') + ', data ' + String(item.date || 'não informada')
        + ', valor ' + (Number.isFinite(Number(item.amount))
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.amount))
          : 'não informado')
        + '. Confira o registro canônico antes de decidir criar outro.'
      : 'O servidor rejeitou a duplicidade (409), mas não forneceu ID verificável. Confira manualmente o histórico. Nenhum novo POST foi autorizado.',
    'warn');
    setButton(root);
  }
  return true;
}

async function checkDuplicate(root: HTMLElement) {
  const review = state.duplicateReview;
  if (state.mode !== 'duplicate' || !review || !review.candidate?.id || review.checking) return;
  if (mutationFingerprint(root) !== review.fingerprint || readSession()?.user.id !== review.userId) return;
  review.checking = true;
  setButton(root);
  const controller = new AbortController();
  const deadline = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const current = await journalContext(review.userId);
    if (current.workspaceId !== review.workspaceId) throw new Error('WORKSPACE_CONTEXT_CHANGED');
    const found = await findPhoenixCanonicalEvent({
      expectedUserId: review.userId,
      eventId: review.candidate.id,
      currentUserId: () => readSession()?.user.id,
      getHistory: signal => financeClient.getHistorySnapshot(signal),
      listPage: (page, size, signal) => financeClient.listEvents(page, size, '', signal),
      signal: controller.signal,
    });
    const payload = payloadFromDrawer(root);
    if (found.status !== 'found' || !payload || !sameDuplicateCandidate(review.candidate, found.event, payload)) {
      throw new Error('DUPLICATE_CANONICAL_MISMATCH');
    }
    if (drawer() !== root || state.duplicateReview !== review || mutationFingerprint(root) !== review.fingerprint) return;
    review.verified = true;
    setFeedback(root, 'Lançamento existente localizado no histórico canônico (ID ' + found.event.id
      + '). Nenhuma nova gravação ocorreu. Só use Registrar outro lançamento idêntico se for realmente outra operação.', 'warn');
  } catch {
    review.verified = false;
    if (drawer() === root) setFeedback(root, 'Não foi possível verificar com segurança o lançamento existente. Nova gravação idêntica continua bloqueada.', 'warn');
  } finally {
    window.clearTimeout(deadline);
    review.checking = false;
    if (drawer() === root) setButton(root);
  }
}

async function requestDuplicateOverride(root: HTMLElement) {
  const review = state.duplicateReview;
  if (state.mode !== 'duplicate' || !review?.verified
    || mutationFingerprint(root) !== review.fingerprint
    || readSession()?.user.id !== review.userId) return;
  try {
    const context = await journalContext(review.userId);
    if (context.workspaceId !== review.workspaceId || outstandingPhoenixAttempt()) throw new Error('DUPLICATE_CONTEXT_CHANGED');
  } catch {
    review.verified = false;
    setFeedback(root, 'Contexto da conta alterado ou existe tentativa anterior. Novo lançamento bloqueado.', 'warn');
    setButton(root);
    return;
  }
  if (!window.confirm('O registro existente foi confirmado no histórico. Este botão cria uma SEGUNDA operação financeira com os mesmos dados, usando allowDuplicate:true e uma NOVA chave. Confirma que são duas operações reais e distintas?')) return;
  if (drawer() !== root || state.duplicateReview !== review || mutationFingerprint(root) !== review.fingerprint) return;
  await submit(root, true);
}

async function retryUnconfirmedPhoenixCreate(root: HTMLElement) {
  if (state.mode !== 'pending' || !outstandingPhoenixAttempt()) return;
  let prior: Awaited<ReturnType<typeof readPendingIntent>>;
  try { prior = await readPendingIntent(root); }
  catch {
    state.mode = 'pending';
    setFeedback(root, 'A API não confirmou o workspace. Retomada bloqueada sem novo POST.', 'warn');
    setButton(root);
    return;
  }
  if (!prior || prior.journal.eventId) {
    await verifyPendingPhoenixCreate(root);
    return;
  }
  if (!canExplicitlyReplayPhoenixCreate(prior.journal)) {
    state.mode = 'pending';
    setFeedback(root, 'O prazo conservador de retomada automática expirou. Nenhum envio foi feito; reconcilie o histórico antes de registrar outra operação.', 'warn');
    setButton(root);
    return;
  }
  if (!window.confirm('A resposta anterior pode ter se perdido após a gravação. Retomar envia EXATAMENTE a mesma tentativa com a mesma chave, sem criar outra operação. Continuar?')) return;
  let currentScope: JournalContext;
  try { currentScope = await journalContext(prior.context.userId); }
  catch {
    state.mode = 'pending';
    setFeedback(root, 'A API não confirmou o workspace antes do envio. Nenhuma gravação foi feita.', 'warn');
    setButton(root);
    return;
  }
  if (!canExplicitlyReplayPhoenixCreate(prior.journal)
    || currentScope.workspaceId !== prior.context.workspaceId
    || readSession()?.user.id !== prior.context.userId || mutationFingerprint(root) !== state.fingerprint
    || drawer() !== root) {
    state.mode = 'pending';
    setFeedback(root, 'Identidade ou formulário alterado. O reenvio foi bloqueado.', 'warn');
    setButton(root);
    return;
  }
  const prepared = prior.kind === 'benefit'
    ? preparePhoenixBenefitEvent(prior.payload as Parameters<typeof preparePhoenixBenefitEvent>[0], prior.journal.operationId)
    : preparePhoenixSimpleEvent(prior.payload, prior.journal.operationId);
  state.mode = 'saving';
  setButton(root);
  try {
    const result = prior.kind === 'benefit'
      ? await runPhoenixBenefitEventWrite(prepared as ReturnType<typeof preparePhoenixBenefitEvent>, visibleRefreshMonth(root, prepared.payload.date), undefined, undefined, prior.context.workspaceId)
      : await runPhoenixSimpleEventWrite(prepared as ReturnType<typeof preparePhoenixSimpleEvent>, visibleRefreshMonth(root, prepared.payload.date), undefined, undefined, prior.context.workspaceId);
    state.mode = 'pending';
    if (await handleDefinitiveDuplicate(root, result, prior.context, prior.journal, state.fingerprint)) return;
    if (result.status !== 'accepted' && result.status !== 'confirmed') {
      setFeedback(root, 'A operação continua sem confirmação. Nenhuma nova chave foi criada.', 'warn');
      setButton(root);
      return;
    }
    if (result.operationId !== prior.journal.operationId || !result.event?.id
        || readSession()?.user.id !== prior.context.userId) return;
    state.pendingJournal = await withPhoenixCreateJournalLock(() =>
      notePhoenixCreateReceipt(prior.context, prior.journal, result.event));
    await verifyPendingPhoenixCreate(root);
  } catch {
    state.mode = 'pending';
    setFeedback(root, 'A resposta da retomada é incerta. A tentativa original permanece protegida.', 'warn');
    setButton(root);
  }
}

async function submit(root: HTMLElement, explicitDuplicate = false) {
  if (state.mode === 'duplicate' && !explicitDuplicate) return;
  if (explicitDuplicate && (!state.duplicateReview?.verified
    || state.duplicateReview.fingerprint !== mutationFingerprint(root))) return;
  if (state.mode === 'pending') {
    await verifyPendingPhoenixCreate(root); // somente GET, nunca POST
    return;
  }
  if (state.mode === 'verifying' || state.mode === 'saving') return;
  if (root.dataset.phoenixEditingEventId) {
    state.mode = 'save';
    setFeedback(root, 'Este lançamento existente usa o fluxo de edição protegida. A criação de um novo registro foi bloqueada para evitar duplicidade.', 'warn');
    setButton(root);
    return;
  }

  reconcileBenefitRoute(root);
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
      setFeedback(root, 'Transferência confirmada, relida da base e propagada ao sistema. Origem e destino já refletem a operação atômica.', 'ok');
    } else if (recurring) {
      await submitRecurring(root);
      state.mode = 'confirmed';
      setFeedback(root, 'Recorrência confirmada. Os compromissos foram materializados conforme a periodicidade informada. Atualizando a tela…', 'ok');
    } else {
      const payload = payloadFromDrawer(root);
      if (!payload) throw new Error('PHOENIX_WRITE_NOT_READY');
      const expectedUserId = readSession()?.user.id;
      if (!expectedUserId) throw new Error('UNAUTHORIZED');
      const benefit = benefitSelection(root);
      const isBenefit = benefit.isBenefit && benefit.isVerocard;
      const intendedPayload = explicitDuplicate ? { ...payload, allowDuplicate: true } : payload;
      const prepared = isBenefit
        ? preparePhoenixBenefitEvent({ ...intendedPayload, status: 'paid' }, state.operationId)
        : preparePhoenixSimpleEvent(intendedPayload, state.operationId);
      const journal = await journalContext(expectedUserId);
      const reserved = await withPhoenixCreateJournalLock(() => reservePhoenixCreate(
        journal, isBenefit ? 'benefit' : 'monetary', prepared.payload, prepared.operationId,
      ));
      if (reserved.status === 'blocked') {
        state.mode = 'pending';
        setFeedback(root, reserved.reason === 'STALE_TAB'
          ? 'Outra aba confirmou um lançamento enquanto esta tela estava aberta. Atualize o histórico antes de iniciar outra operação.'
          : 'Existe uma tentativa anterior de outro usuário ou com dados diferentes. Nenhum lançamento novo foi enviado.', 'warn');
        setButton(root);
        return;
      }
      if (reserved.status === 'same') {
        state.mode = 'pending';
        state.operationId = reserved.record.operationId;
        state.pendingJournal = reserved.record;
        setFeedback(root, 'Tentativa anterior encontrada. Verifique o histórico ou retome a mesma operação, sem criar outra chave.', 'warn');
        setButton(root);
        return;
      }
      state.pendingJournal = reserved.record;
      prepared.operationId = reserved.record.operationId;
      state.operationId = prepared.operationId;
      const beforePostScope = await journalContext(expectedUserId);
      if (beforePostScope.workspaceId !== journal.workspaceId
        || readSession()?.user.id !== expectedUserId || mutationFingerprint(root) !== state.fingerprint
        || drawer() !== root) {
        state.mode = 'pending';
        setFeedback(root, 'Sessão ou formulário alterado antes do envio. Operação reservada, sem gravação.', 'warn');
        setButton(root);
        return;
      }
      const refreshMonth = visibleRefreshMonth(root, payload.date);
      const canAcknowledge = () => drawer() === root;
      const result = isBenefit
        ? await runPhoenixBenefitEventWrite(prepared as ReturnType<typeof preparePhoenixBenefitEvent>, refreshMonth, undefined, canAcknowledge, journal.workspaceId)
        : await runPhoenixSimpleEventWrite(prepared as ReturnType<typeof preparePhoenixSimpleEvent>, refreshMonth, undefined, canAcknowledge, journal.workspaceId);
      if (await handleDefinitiveDuplicate(root, result, journal, reserved.record, state.fingerprint)) return;
      if (drawer() !== root) {
        state.mode = 'pending';
        return;
      }
      if (result.status === 'error') {
        state.mode = 'pending';
        setFeedback(root, 'A tentativa não está confirmada. O identificador original permanece reservado: ' + result.message, 'warn');
        setButton(root);
        return;
      }
      // Nem HTTP 201 nem accepted significam confirmação visível.
      // Recebimento canônico conhecido é reconciliado por GET, com usuário/ID.
      if (result.status !== 'accepted' && result.status !== 'confirmed') {
        state.mode = 'pending';
        setFeedback(root, 'Resposta financeira ambígua. Confirme no histórico antes de tentar outra operação.', 'warn');
        setButton(root);
        return;
      }
      if (result.operationId !== prepared.operationId || !result.event?.id) {
        state.mode = 'pending';
        setFeedback(root, 'O servidor não devolveu uma identidade verificável. Não tente gravar novamente com outra chave.', 'warn');
        setButton(root);
        return;
      }
      state.duplicateReview = undefined;
      state.pendingJournal = await withPhoenixCreateJournalLock(() =>
      notePhoenixCreateReceipt(journal, reserved.record, result.event));
      state.pendingReceipt = {
        operationId: prepared.operationId,
        event: result.event,
        userId: expectedUserId,
        fingerprint: state.fingerprint,
      };
      state.mode = 'pending';
      setFeedback(root, 'Lançamento recebido, aguardando confirmação pelo histórico.', 'warn');
      setButton(root);
      await verifyPendingPhoenixCreate(root);
      return;
    }

    setButton(root);
    if (recurring) {
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click();
      }, 150);
    }
  } catch (error) {
    state.mode = outstandingPhoenixAttempt() ? 'pending' : 'error';
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
  state.pendingReceipt = undefined;
  state.pendingJournal = undefined;
  state.duplicateReview = undefined;
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const duplicateCheck = target?.closest<HTMLButtonElement>('.px-duplicate-check');
  const duplicateOverride = target?.closest<HTMLButtonElement>('.px-duplicate-override');
  if (duplicateCheck || duplicateOverride) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const root = drawer();
    if (root && duplicateCheck) void checkDuplicate(root);
    if (root && duplicateOverride) void requestDuplicateOverride(root);
    return;
  }
  const retryButton = target?.closest<HTMLButtonElement>('.px-retry-unconfirmed');
  if (retryButton) {
    const root = drawer();
    if (!root) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void retryUnconfirmedPhoenixCreate(root);
    return;
  }
  const button = target?.closest<HTMLButtonElement>('.px-review-launch');
  if (!button) return;
  const root = drawer();
  if (!root) return;

  // A Phoenix V15 já possui writer React próprio para edição e compras no cartão.
  // Este bridge legado fica restrito aos fluxos especiais que ainda dependem dele.
  const editing = root.getAttribute('aria-label') === 'Editar lançamento';
  const cardFlow = Boolean(root.querySelector('.px-card-box'));
  if (editing || cardFlow) return;

  if (state.mode === 'confirmed') {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeConfirmed(root);
    return;
  }
  if (state.mode === 'saving' || state.mode === 'verifying') {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (state.mode === 'save' || state.mode === 'error' || state.mode === 'pending' || reviewed(root)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void submit(root);
    return;
  }

  reconcileBenefitRoute(root);
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
  if (!root || state.mode === 'saving' || state.mode === 'verifying'
      || state.mode === 'confirmed') return;
  const next = mutationFingerprint(root);
  if (state.operationId && (state.mode === 'pending' || state.mode === 'error')
      && state.fingerprint !== next) {
    // Não deixar um erro pós-commit ganhar nova chave por edição do formulário.
    state.mode = 'pending';
    setFeedback(root, 'Há uma operação não reconciliada. Os dados originais devem ser preservados antes de criar outra.', 'warn');
    setButton(root);
    return;
  }
  if (state.mode === 'duplicate' && state.fingerprint !== next) {
    state.duplicateReview = undefined;
    state.mode = 'review';
  }
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
