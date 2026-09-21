import type { FinancialEvent } from '../app/finance-client';
import { authenticatedRequest, readSession } from '../app/auth-client';
import { loadPhoenixAllEvents } from './data/load-phoenix-read-model';
import {
  archivePhoenixEventsBulk,
  newPhoenixBulkOperationId,
} from './data/phoenix-bulk-event-gateway';
import './phoenix-launch-business-rules.css';

// A UI da edição fica pronta no preview antes do backend dedicado entrar em produção.
// Mudar para true somente depois da PR protegida correspondente ser mesclada e o smoke passar.
export const PHOENIX_PROTECTED_EVENT_EDIT_ENABLED = false;

type LaunchType = 'expense' | 'income' | 'transfer';
type EventWithPayload = FinancialEvent & { sourcePayload?: unknown };
type RemovedRow = { row: HTMLTableRowElement; parent: HTMLElement; next: ChildNode | null; wasChecked: boolean };

type EditPayload = {
  description: string;
  date: string;
  amount: number;
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  notes?: string;
  modality?: string;
  operationId: string;
};

const expenseModalities = ['À VISTA', 'CRÉDITO', 'CREDIÁRIO', 'ALIMENTAÇÃO'] as const;
const incomeModalities = ['PIX', 'DINHEIRO', 'TRANSFERÊNCIA BANCÁRIA', 'VEROCARD'] as const;

let observer: MutationObserver | null = null;
let scheduled = false;
let syncing = false;
let detailEventPromise: Promise<FinancialEvent | null> | null = null;
let editingEvent: FinancialEvent | null = null;
let openingEdit = false;
let currentDrawer: HTMLElement | null = null;
let editOperation: { fingerprint: string; operationId: string } | null = null;
let duplicateTimer: number | null = null;

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function activeType(root: ParentNode): LaunchType {
  const label = normalize(root.querySelector('.px-segment button.active')?.textContent || 'DESPESA');
  if (label === 'RECEITA') return 'income';
  if (label.includes('TRANSFER')) return 'transfer';
  return 'expense';
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

function paymentSelect(root: ParentNode) {
  return root.querySelector<HTMLSelectElement>('[data-phoenix-payment-method-select]')
    || selectByLabel(root, 'Forma de recebimento')
    || selectByLabel(root, 'Forma de pagamento');
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

function brazilianDateToIso(value: string) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function cell(row: HTMLTableRowElement, label: string) {
  return row.querySelector<HTMLTableCellElement>(`td[data-label="${label}"]`);
}

function rowSignature(row: HTMLTableRowElement) {
  const typeText = normalize(cell(row, 'Tipo')?.textContent || '');
  const visualType = typeText.includes('RECEITA') ? 'income' : typeText.includes('TRANSFER') ? 'transfer' : 'expense';
  const moneyText = (cell(row, 'Receita')?.textContent || '').includes('R$')
    ? cell(row, 'Receita')?.textContent || ''
    : cell(row, 'Despesa')?.textContent || '';
  return [
    brazilianDateToIso(cell(row, 'Vencimento')?.textContent || ''),
    visualType,
    normalize(cell(row, 'Descrição')?.textContent || ''),
    Math.round(Math.abs(parseMoney(moneyText)) * 100),
    normalize(cell(row, 'Classificação')?.textContent || '—'),
    normalize(cell(row, 'Grupo')?.textContent || '—'),
    normalize(cell(row, 'Forma de pagamento')?.textContent || '—'),
  ].join('|');
}

function eventSignature(event: FinancialEvent) {
  const visualType = event.type === 'income' || event.type === 'redemption'
    ? 'income'
    : event.type === 'transfer'
      ? 'transfer'
      : 'expense';
  return [
    String(event.date || '').slice(0, 10),
    visualType,
    normalize(event.description),
    Math.round(Math.abs(Number(event.amount || 0)) * 100),
    normalize(event.sourceDetails?.expenseClass || event.category?.group || '—'),
    normalize(event.sourceDetails?.group || event.category?.name || '—'),
    normalize(event.sourceDetails?.paymentMethod || event.paymentMethod?.name || '—'),
  ].join('|');
}

async function resolveRowEvent(row: HTMLTableRowElement) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = row.querySelector<HTMLInputElement>('.px-bulk-checkbox')?.dataset.eventId || '';
    if (id) {
      const page = await loadPhoenixAllEvents();
      return page.items.find((event) => event.id === id) || null;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }

  const signature = rowSignature(row);
  const page = await loadPhoenixAllEvents();
  const matches = page.items.filter((event) => eventSignature(event) === signature);
  return matches.length === 1 ? matches[0] : null;
}

function sourcePayloadModality(event: EventWithPayload) {
  const raw = event.sourcePayload;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  return String((raw as Record<string, unknown>).modality || '').trim();
}

function inferModality(event: FinancialEvent | null, type: LaunchType) {
  if (!event) return type === 'income' ? 'PIX' : type === 'expense' ? 'À VISTA' : '';
  const explicit = sourcePayloadModality(event as EventWithPayload) || event.sourceDetails?.modality || '';
  if (explicit) return explicit;
  const payment = normalize(`${event.sourceDetails?.paymentMethod || ''} ${event.paymentMethod?.name || ''}`);
  const account = normalize(event.account?.name || '');
  const benefit = payment.includes('VEROCARD') || account.includes('VEROCARD') || account.includes('ALIMENTA') || account.includes('BENEF');
  if (type === 'income') {
    if (benefit) return 'VEROCARD';
    if (payment.includes('DINHEIRO')) return 'DINHEIRO';
    if (payment.includes('TRANSFERENCIA') || payment.includes('DEPOSITO')) return 'TRANSFERÊNCIA BANCÁRIA';
    return 'PIX';
  }
  if (benefit) return 'ALIMENTAÇÃO';
  if (payment.includes('CREDIARIO')) return 'CREDIÁRIO';
  if (payment.includes('CREDITO') || payment.includes('CARTAO')) return 'CRÉDITO';
  return 'À VISTA';
}

function setNativeSelect(select: HTMLSelectElement | null, value: string) {
  if (!select || !value || select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function optionValue(select: HTMLSelectElement | null, predicates: ((label: string) => boolean)[]) {
  if (!select) return '';
  for (const predicate of predicates) {
    const option = [...select.options].find((item) => item.value && predicate(normalize(item.textContent)));
    if (option) return option.value;
  }
  return '';
}

function mainAccountValue(root: HTMLElement) {
  const select = selectByLabel(root, 'Conta financeira');
  return optionValue(select, [(label) => label === 'CONTA MONETARIA PRINCIPAL']);
}

function benefitAccountValue(root: HTMLElement) {
  const select = selectByLabel(root, 'Conta financeira');
  if (!select) return '';
  const canonical = [...select.options].find((option) =>
    option.value && normalize(option.dataset.accountType || '') === 'BENEFIT'
  );
  if (canonical) return canonical.value;
  return optionValue(select, [
    (label) => label.includes('VEROCARD') && label.includes('ALIMENTA'),
    (label) => label.includes('VEROCARD'),
    (label) => label.includes('BENEF') || label.includes('ALIMENTA'),
  ]);
}

function paymentValue(root: HTMLElement, mode: string) {
  const select = paymentSelect(root);
  const normalized = normalize(mode);
  if (normalized === 'PIX') return optionValue(select, [(label) => label === 'PIX']);
  if (normalized === 'DINHEIRO') return optionValue(select, [(label) => label === 'DINHEIRO']);
  if (normalized === 'TRANSFERENCIA BANCARIA') {
    return optionValue(select, [
      (label) => label === 'TRANSFERENCIA BANCARIA',
      (label) => label === 'DEPOSITO BANCARIO',
      (label) => label.includes('TRANSFERENCIA'),
      (label) => label.includes('DEPOSITO'),
    ]);
  }
  if (normalized === 'VEROCARD' || normalized === 'ALIMENTACAO') {
    return optionValue(select, [(label) => label.includes('VEROCARD')]);
  }
  if (normalized === 'CREDIARIO') {
    return optionValue(select, [(label) => label.includes('CREDIARIO')]);
  }
  if (normalized === 'CREDITO') {
    return optionValue(select, [
      (label) => (label.includes('CREDITO') || label.includes('CARTAO')) && !label.includes('VEROCARD'),
    ]);
  }
  return '';
}

function setAccountLock(root: HTMLElement, targetValue: string, locked: boolean) {
  const account = selectByLabel(root, 'Conta financeira');
  if (!account) return;
  if (targetValue) setNativeSelect(account, targetValue);
  account.disabled = locked;
  account.setAttribute('aria-readonly', locked ? 'true' : 'false');
  account.closest('label')?.classList.toggle('px-route-locked', locked);
}

function setPaymentLock(root: HTMLElement, targetValue: string, locked: boolean) {
  const payment = paymentSelect(root);
  if (!payment) return;
  if (targetValue) setNativeSelect(payment, targetValue);
  payment.disabled = locked;
  payment.setAttribute('aria-readonly', locked ? 'true' : 'false');
  payment.closest('label')?.classList.toggle('px-route-locked', locked);
}

function unlockBenefitRoute(root: HTMLElement) {
  const account = selectByLabel(root, 'Conta financeira');
  const currentAccountType = normalize(account?.selectedOptions[0]?.dataset.accountType || '');
  if (currentAccountType === 'BENEFIT') {
    const monetary = mainAccountValue(root);
    if (monetary) setNativeSelect(account, monetary);
  }
  setAccountLock(root, '', false);
  setPaymentLock(root, '', false);
}

function clearNativePaymentVisibility(root: HTMLElement) {
  const field = paymentSelect(root)?.closest<HTMLLabelElement>('label.px-field');
  if (field) field.classList.remove('px-native-payment-routed');
  root.querySelector('.px-card-box')?.classList.remove('px-native-card-routed');
}

function visiblePaymentOptions(select: HTMLSelectElement, modality: string) {
  const normalized = normalize(modality);
  return [...select.options].filter((option) => {
    if (!option.value) return false;
    const label = normalize(option.textContent);
    if (normalized === 'ALIMENTACAO') return label.includes('VEROCARD');
    if (normalized === 'CREDIARIO') return label.includes('CREDIARIO');
    if (normalized === 'CREDITO') return (label.includes('CREDITO') || label.includes('CARTAO')) && !label.includes('VEROCARD');
    return !label.includes('CREDITO') && !label.includes('CARTAO') && !label.includes('CREDIARIO') && !label.includes('VEROCARD');
  });
}

function routeKey(root: HTMLElement, modality: string) {
  const type = activeType(root);
  const native = paymentSelect(root);
  const nativeOptions = native ? [...native.options].map((option) => `${option.value}:${option.textContent || ''}`).join('|') : '';
  const card = root.querySelector<HTMLSelectElement>('.px-card-box select');
  const cardOptions = card ? [...card.options].map((option) => `${option.value}:${option.textContent || ''}`).join('|') : 'pending';
  return `${type}:${normalize(modality)}:${nativeOptions}:${normalize(modality) === 'CREDITO' ? cardOptions : ''}`;
}

function rebuildNextChoice(root: HTMLElement, modalityField: HTMLElement, modality: string) {
  clearNativePaymentVisibility(root);
  const type = activeType(root);
  const existing = root.querySelector<HTMLElement>('[data-phoenix-modality-next]');
  if (type !== 'expense') {
    existing?.remove();
    return;
  }

  const nextKey = routeKey(root, modality);
  if (existing?.dataset.routeKey === nextKey) {
    const select = existing.querySelector<HTMLSelectElement>('select');
    if (normalize(modality) === 'CREDITO') {
      const nativeCard = root.querySelector<HTMLSelectElement>('.px-card-box select');
      if (select && nativeCard && select.value !== nativeCard.value) select.value = nativeCard.value;
      root.querySelector('.px-card-box')?.classList.add('px-native-card-routed');
      paymentSelect(root)?.closest('label')?.classList.add('px-native-payment-routed');
    } else {
      const native = paymentSelect(root);
      if (select && native && !select.disabled && select.value !== native.value) select.value = native.value;
      native?.closest('label')?.classList.add('px-native-payment-routed');
    }
    return;
  }

  existing?.remove();
  const label = document.createElement('label');
  label.className = 'px-field px-modality-next';
  label.dataset.phoenixModalityNext = 'true';
  label.dataset.routeKey = nextKey;
  const caption = document.createElement('span');
  const select = document.createElement('select');
  label.append(caption, select);
  modalityField.insertAdjacentElement('afterend', label);

  if (normalize(modality) === 'CREDITO') {
    caption.textContent = 'Cartão de crédito *';
    const payment = paymentSelect(root);
    const creditValue = paymentValue(root, 'CRÉDITO');
    if (creditValue) setNativeSelect(payment, creditValue);
    const cardSelect = root.querySelector<HTMLSelectElement>('.px-card-box select');
    if (!cardSelect) {
      select.disabled = true;
      select.innerHTML = '<option>Carregando cartões cadastrados…</option>';
      return;
    }
    select.innerHTML = [...cardSelect.options].map((option) => `<option value="${option.value}">${option.textContent || ''}</option>`).join('');
    select.value = cardSelect.value;
    select.addEventListener('change', () => setNativeSelect(cardSelect, select.value));
    root.querySelector('.px-card-box')?.classList.add('px-native-card-routed');
    payment?.closest('label')?.classList.add('px-native-payment-routed');
    return;
  }

  caption.textContent = 'Forma de pagamento *';
  const native = paymentSelect(root);
  if (!native) {
    select.disabled = true;
    select.innerHTML = '<option>Carregando formas de pagamento…</option>';
    return;
  }
  const options = visiblePaymentOptions(native, modality);
  select.innerHTML = '<option value="">Selecione</option>' + options
    .map((option) => `<option value="${option.value}">${option.textContent || ''}</option>`)
    .join('');

  const forced = normalize(modality) === 'ALIMENTACAO' || normalize(modality) === 'CREDIARIO';
  const forcedValue = paymentValue(root, modality);
  if (forcedValue) setNativeSelect(native, forcedValue);
  select.value = native.value;
  if (forced && select.value) {
    select.disabled = true;
    select.setAttribute('aria-readonly', 'true');
    if (normalize(modality) === 'ALIMENTACAO') caption.textContent = 'Forma de pagamento automática';
  }
  select.addEventListener('change', () => setNativeSelect(native, select.value));
  native.closest('label')?.classList.add('px-native-payment-routed');
}

function applyModalityRoute(root: HTMLElement, modality: string, modalityField: HTMLElement) {
  const type = activeType(root);
  const normalized = normalize(modality);
  const account = selectByLabel(root, 'Conta financeira');
  const payment = paymentSelect(root);

  if (type === 'income') {
    if (normalized === 'VEROCARD') {
      const benefitAccount = benefitAccountValue(root);
      const verocard = paymentValue(root, 'VEROCARD');
      setAccountLock(root, benefitAccount, true);
      setPaymentLock(root, verocard, true);
      root.dataset.phoenixBenefitRoute = 'locked';
    } else {
      setPaymentLock(root, '', false);
      setAccountLock(root, mainAccountValue(root), true);
      setNativeSelect(payment, paymentValue(root, modality));
      delete root.dataset.phoenixBenefitRoute;
    }
    rebuildNextChoice(root, modalityField, modality);
    return;
  }

  if (type === 'expense' && normalized === 'ALIMENTACAO') {
    const benefitAccount = benefitAccountValue(root);
    const verocard = paymentValue(root, 'ALIMENTAÇÃO');
    setAccountLock(root, benefitAccount, true);
    setPaymentLock(root, verocard, true);
    root.dataset.phoenixBenefitRoute = 'locked';
  } else {
    unlockBenefitRoute(root);
    delete root.dataset.phoenixBenefitRoute;
    if (normalized === 'CREDITO') setNativeSelect(payment, paymentValue(root, 'CRÉDITO'));
    if (normalized === 'CREDIARIO') setNativeSelect(payment, paymentValue(root, 'CREDIÁRIO'));
  }
  rebuildNextChoice(root, modalityField, modality);
}

function ensureModalityField(root: HTMLElement) {
  const type = activeType(root);
  let field = root.querySelector<HTMLElement>('[data-phoenix-modality-field]');
  if (type === 'transfer') {
    field?.remove();
    root.querySelector('[data-phoenix-modality-next]')?.remove();
    return;
  }

  const description = fieldByLabel(root, 'Descrição');
  if (!description) return;
  if (!field) {
    const label = document.createElement('label');
    label.className = 'px-field px-modality-field';
    label.dataset.phoenixModalityField = 'true';
    label.innerHTML = '<span>Modalidade *</span><select data-phoenix-modality-select></select><small data-phoenix-modality-help></small>';
    description.insertAdjacentElement('afterend', label);
    field = label;
    const select = label.querySelector<HTMLSelectElement>('select')!;
    select.addEventListener('change', () => {
      root.dataset.phoenixModality = select.value;
      applyModalityRoute(root, select.value, label);
      scheduleDuplicateCheck(root);
    });
  }

  const select = field.querySelector<HTMLSelectElement>('[data-phoenix-modality-select]');
  const help = field.querySelector<HTMLElement>('[data-phoenix-modality-help]');
  if (!select || !help) return;
  const options = type === 'income' ? incomeModalities : expenseModalities;
  if (root.dataset.phoenixModalityType !== type || !select.options.length) {
    root.dataset.phoenixModalityType = type;
    const saved = root.dataset.phoenixModality || '';
    const inferred = saved || inferModality(editingEvent, type);
    select.innerHTML = options.map((item) => `<option value="${item}">${item}</option>`).join('');
    select.value = options.includes(inferred as never) ? inferred : options[0];
    root.dataset.phoenixModality = select.value;
  }
  const helpText = type === 'income'
    ? 'A modalidade define automaticamente a conta de recebimento: monetária ou benefício.'
    : 'A modalidade filtra a próxima escolha e aplica as regras de pagamento do MEG.';
  if (help.textContent !== helpText) help.textContent = helpText;
  applyModalityRoute(root, select.value, field);
}

function currentDuplicateFields(root: HTMLElement) {
  return {
    description: inputByLabel(root, 'Descrição')?.value.trim() || '',
    amount: Math.abs(parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || '')),
    accountId: selectByLabel(root, 'Conta financeira')?.value || '',
    date: inputByLabel(root, 'Data do evento')?.value || '',
  };
}

async function fixDuplicateRule(root: HTMLElement) {
  const editId = root.dataset.phoenixEditingEventId || '';
  if (!editId) return;
  const rule = [...root.querySelectorAll<HTMLElement>('.px-rule-box')]
    .find((node) => normalize(node.textContent).includes('DUPLIC'));
  if (!rule) return;
  const current = currentDuplicateFields(root);
  if (!current.description || !current.amount || !current.accountId || !current.date) return;
  const page = await loadPhoenixAllEvents();
  const duplicate = page.items.find((event) => event.id !== editId
    && normalize(event.description) === normalize(current.description)
    && Math.round(Math.abs(Number(event.amount || 0)) * 100) === Math.round(current.amount * 100)
    && event.accountId === current.accountId
    && String(event.date || '').slice(0, 10) === current.date);
  const text = duplicate
    ? `Possível duplicidade encontrada em outro lançamento: ${duplicate.description}. Revise antes de salvar a alteração.`
    : 'Edição segura: o próprio lançamento foi excluído da verificação de duplicidade e nenhum outro registro igual foi encontrado.';
  rule.classList.toggle('duplicate', Boolean(duplicate));
  if (rule.textContent !== text) rule.textContent = text;
}

function scheduleDuplicateCheck(root: HTMLElement) {
  if (!root.dataset.phoenixEditingEventId) return;
  if (duplicateTimer !== null) window.clearTimeout(duplicateTimer);
  duplicateTimer = window.setTimeout(() => {
    duplicateTimer = null;
    void fixDuplicateRule(root);
  }, 80);
}

function writerFeedback(root: HTMLElement, text: string, kind: 'warn' | 'ok' = 'warn') {
  let node = root.querySelector<HTMLElement>('[data-phoenix-edit-feedback]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.phoenixEditFeedback = 'true';
    node.className = 'px-notice';
    root.querySelector('.px-review-launch')?.insertAdjacentElement('beforebegin', node);
  }
  node.className = `px-notice ${kind}`;
  if (node.textContent !== text) node.textContent = text;
}

function editPayload(root: HTMLElement, eventId: string): EditPayload | null {
  const description = inputByLabel(root, 'Descrição')?.value.trim() || '';
  const date = inputByLabel(root, 'Data do evento')?.value || '';
  const amountRaw = parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || '');
  const accountId = selectByLabel(root, 'Conta financeira')?.value || undefined;
  const categoryId = activeType(root) === 'expense'
    ? selectByLabel(root, 'Grupo')?.value || undefined
    : selectByLabel(root, 'Classificação da receita')?.value || undefined;
  const paymentMethodId = paymentSelect(root)?.value || undefined;
  const notes = textareaByLabel(root, 'Observações opcionais')?.value || '';
  const modality = root.querySelector<HTMLSelectElement>('[data-phoenix-modality-select]')?.value || undefined;
  if (!description || !date || !amountRaw || !accountId || !paymentMethodId) return null;
  const fingerprint = JSON.stringify({ eventId, description, date, amountRaw, accountId, categoryId, paymentMethodId, notes, modality });
  if (editOperation?.fingerprint !== fingerprint) {
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    editOperation = { fingerprint, operationId: `phoenix-edit:${random}` };
  }
  return {
    description,
    date,
    amount: amountRaw,
    accountId,
    categoryId,
    paymentMethodId,
    notes,
    modality,
    operationId: editOperation.operationId,
  };
}

function closeDrawerWithoutPrompt(root: HTMLElement) {
  const close = root.querySelector<HTMLButtonElement>('.px-drawer-head .px-icon-btn');
  if (!close) return;
  const original = window.confirm;
  window.confirm = () => true;
  try {
    close.click();
  } finally {
    window.setTimeout(() => { window.confirm = original; }, 0);
  }
}

async function submitProtectedEdit(root: HTMLElement) {
  const eventId = root.dataset.phoenixEditingEventId || '';
  if (!eventId) return;
  if (!PHOENIX_PROTECTED_EVENT_EDIT_ENABLED) {
    writerFeedback(root, 'A edição foi separada da criação para evitar duplicidades. O writer protegido está pronto para homologação, mas ainda não foi liberado em produção.');
    return;
  }
  const modality = normalize(root.querySelector<HTMLSelectElement>('[data-phoenix-modality-select]')?.value || '');
  if (modality === 'CREDITO' || modality === 'CREDIARIO') {
    writerFeedback(root, 'Compras no cartão são editadas pelo formulário padrão do MEG e atualizam automaticamente fatura e parcelas.');
    return;
  }
  const payload = editPayload(root, eventId);
  if (!payload) {
    writerFeedback(root, 'Preencha os campos obrigatórios antes de salvar a alteração.');
    return;
  }
  const duplicate = root.querySelector('.px-rule-box.duplicate');
  if (duplicate && !window.confirm(`${duplicate.textContent || 'Possível duplicidade encontrada.'}\n\nDeseja salvar a alteração mesmo assim?`)) return;

  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  try {
    if (button) {
      button.disabled = true;
      button.textContent = 'Salvando alterações…';
    }
    writerFeedback(root, 'Salvando a alteração protegida e aguardando confirmação do servidor.', 'ok');
    await authenticatedRequest(`/finance/events/${encodeURIComponent(eventId)}/update-protected`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    editOperation = null;
    writerFeedback(root, 'Alteração confirmada. Atualizando a tela.', 'ok');
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: `/finance/events/${eventId}/update-protected`, method: 'POST' } }));
    closeDrawerWithoutPrompt(root);
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click(), 80);
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = 'Tentar salvar alterações';
    }
    writerFeedback(root, error instanceof Error ? error.message : 'Não foi possível salvar a alteração.');
  }
}

function canArchive() {
  const role = readSession()?.user.role || '';
  return role === 'ADMIN' || role === 'MANAGER';
}

function rowsForIds(ids: string[]) {
  const idSet = new Set(ids);
  return [...document.querySelectorAll<HTMLInputElement>('.px-v15-launch-table tbody .px-bulk-checkbox')]
    .filter((box) => idSet.has(box.dataset.eventId || ''))
    .map((box) => box.closest<HTMLTableRowElement>('tr'))
    .filter((row): row is HTMLTableRowElement => Boolean(row));
}

function removeRowsImmediately(ids: string[]) {
  const removed: RemovedRow[] = [];
  rowsForIds(ids).forEach((row) => {
    const checkbox = row.querySelector<HTMLInputElement>('.px-bulk-checkbox');
    const wasChecked = Boolean(checkbox?.checked);
    if (checkbox?.checked) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const parent = row.parentElement;
    if (!parent) return;
    removed.push({ row, parent, next: row.nextSibling, wasChecked });
    row.classList.add('px-optimistic-archive');
    row.remove();
  });
  return removed;
}

function restoreRows(removed: RemovedRow[]) {
  removed.forEach(({ row, parent, next, wasChecked }) => {
    row.classList.remove('px-optimistic-archive');
    parent.insertBefore(row, next && next.parentNode === parent ? next : null);
    const checkbox = row.querySelector<HTMLInputElement>('.px-bulk-checkbox');
    if (checkbox && wasChecked) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

async function optimisticArchive(ids: string[], closeRoot?: HTMLElement) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length || !canArchive()) return;
  const count = unique.length;
  if (!window.confirm(`Excluir ${count} lançamento${count === 1 ? '' : 's'}?\n\nA linha sairá da tela imediatamente. A confirmação do servidor manterá auditoria e retirará o efeito dos saldos/ledger.`)) return;
  const removed = removeRowsImmediately(unique);
  if (closeRoot) closeDrawerWithoutPrompt(closeRoot);
  const operationId = newPhoenixBulkOperationId('archive');
  try {
    await archivePhoenixEventsBulk({ ids: unique.sort(), operationId });
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: '/finance/events/bulk/archive', method: 'POST' } }));
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click(), 60);
  } catch (error) {
    restoreRows(removed);
    window.alert(error instanceof Error ? `A exclusão não foi confirmada: ${error.message}` : 'A exclusão não foi confirmada. A linha foi restaurada.');
  }
}

function ensureEditDelete(root: HTMLElement) {
  let button = root.querySelector<HTMLButtonElement>('[data-phoenix-launch-delete]');
  const editId = root.dataset.phoenixEditingEventId || '';
  if (!editId || !canArchive()) {
    button?.remove();
    return;
  }
  if (button) return;
  const primary = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (!primary?.parentElement) return;
  button = document.createElement('button');
  button.type = 'button';
  button.className = 'px-secondary-action px-launch-delete-action';
  button.dataset.phoenixLaunchDelete = 'true';
  button.textContent = 'Excluir lançamento';
  button.addEventListener('click', () => void optimisticArchive([editId], root));
  primary.insertAdjacentElement('beforebegin', button);
}

function setText(node: HTMLElement | null, text: string) {
  if (node && node.textContent !== text) node.textContent = text;
}

function updateDrawerCopy(root: HTMLElement) {
  const editId = root.dataset.phoenixEditingEventId || '';
  if (editId) {
    setText(root.querySelector<HTMLElement>('.px-drawer-head .px-kicker'), 'Editar evento');
    setText(root.querySelector<HTMLElement>('.px-drawer-head h2'), 'Editar lançamento');
    root.querySelectorAll<HTMLButtonElement>('.px-segment button').forEach((button) => { button.disabled = true; });
  }
  const preview = root.querySelector<HTMLElement>('.px-preview-box');
  if (preview) {
    [...preview.querySelectorAll('div')].forEach((item) => {
      if (normalize(item.querySelector('span')?.textContent || '') !== 'SITUACAO INICIAL') return;
      setText(item.querySelector<HTMLElement>('strong'), editId ? 'Alteração protegida' : 'Pronto para gravação');
    });
  }
}

async function attachEditingEvent(root: HTMLElement) {
  if (!openingEdit) return;
  const event = editingEvent || await detailEventPromise;
  if (!event) {
    openingEdit = false;
    return;
  }
  editingEvent = event;
  root.dataset.phoenixEditingEventId = event.id;
  openingEdit = false;
  root.dataset.phoenixModalityType = '';
  ensureModalityField(root);
  scheduleDuplicateCheck(root);
}

function syncDrawer() {
  const root = document.querySelector<HTMLElement>('.px-launch-drawer');
  if (!root) {
    currentDrawer = null;
    return;
  }
  if (root !== currentDrawer) {
    currentDrawer = root;
    if (!openingEdit) {
      editingEvent = null;
      editOperation = null;
      delete root.dataset.phoenixEditingEventId;
      delete root.dataset.phoenixModality;
      delete root.dataset.phoenixModalityType;
    }
  }
  if (openingEdit && !root.dataset.phoenixEditingEventId) void attachEditingEvent(root);
  ensureModalityField(root);
  updateDrawerCopy(root);
  ensureEditDelete(root);

  if (root.dataset.phoenixEditingEventId) {
    const primary = root.querySelector<HTMLButtonElement>('.px-review-launch');
    if (primary && normalize(primary.textContent).includes('SALVAR LANCAMENTO')) primary.textContent = 'Salvar alterações';
  }
}

function updateTableDerivedModalities() {
  document.querySelectorAll<HTMLTableRowElement>('.px-v15-launch-table tbody tr').forEach((row) => {
    const modality = cell(row, 'Modalidade');
    if (!modality || normalize(modality.textContent) !== '—') return;
    const payment = normalize(cell(row, 'Forma de pagamento')?.textContent || '');
    if (payment.includes('VEROCARD')) modality.textContent = 'ALIMENTAÇÃO';
    else if (payment.includes('CREDIARIO')) modality.textContent = 'CREDIÁRIO';
    else if (payment.includes('CREDITO') || payment.includes('CARTAO')) modality.textContent = 'CRÉDITO';
    else if (payment && payment !== '—') modality.textContent = 'À VISTA';
  });
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    if (syncing) return;
    syncing = true;
    try {
      syncDrawer();
      updateTableDerivedModalities();
    } finally {
      syncing = false;
    }
  }, 0);
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const detail = target.closest<HTMLButtonElement>('.px-detail-btn');
  if (detail) {
    const row = detail.closest<HTMLTableRowElement>('tr');
    if (row) {
      detailEventPromise = resolveRowEvent(row);
      editingEvent = null;
    }
    return;
  }

  const prepareEdit = target.closest<HTMLButtonElement>('.px-detail-drawer .px-primary-action');
  if (prepareEdit && normalize(prepareEdit.textContent).includes('PREPARAR EDICAO')) {
    openingEdit = true;
    void detailEventPromise?.then((event) => {
      editingEvent = event;
      scheduleSync();
    });
    return;
  }

  const rowDelete = target.closest<HTMLButtonElement>('.px-row-delete');
  const bulkDelete = target.closest<HTMLButtonElement>('.px-bulk-action-bar [data-bulk-delete]');
  if (rowDelete || bulkDelete) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const ids = rowDelete
      ? [rowDelete.dataset.eventId || '']
      : [...document.querySelectorAll<HTMLInputElement>('.px-v15-launch-table tbody .px-bulk-checkbox:checked')]
          .map((box) => box.dataset.eventId || '')
          .filter(Boolean);
    void optimisticArchive(ids);
    return;
  }

  const root = target.closest<HTMLElement>('.px-launch-drawer');
  if (root?.getAttribute('aria-label') === 'Editar lançamento') return;
  const primary = target.closest<HTMLButtonElement>('.px-review-launch');
  if (root && primary && root.dataset.phoenixEditingEventId) {
    const reviewed = [...root.querySelectorAll<HTMLElement>('.px-notice.ok')]
      .some((node) => normalize(node.textContent).includes('PARIDADE DO FORMULARIO VALIDADA'));
    const savePhase = reviewed || normalize(primary.textContent).includes('SALVAR') || normalize(primary.textContent).includes('TENTAR');
    if (savePhase) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void submitProtectedEdit(root);
    }
  }
}

function onDocumentInput(event: Event) {
  const target = event.target as HTMLElement | null;
  const root = target?.closest<HTMLElement>('.px-launch-drawer');
  if (!root) return;
  if (!target?.matches('[data-phoenix-modality-select]')) scheduleDuplicateCheck(root);
  window.setTimeout(scheduleSync, 0);
}

function start() {
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('input', onDocumentInput, true);
  document.addEventListener('change', onDocumentInput, true);
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixLaunchBusinessRulesBridge() {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('click', onDocumentClick, true);
  document.removeEventListener('input', onDocumentInput, true);
  document.removeEventListener('change', onDocumentInput, true);
}
