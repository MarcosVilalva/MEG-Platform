import { readSession } from '../app/auth-client';
import { cardsClient, type CardPurchase, type CreditCard } from '../app/cards-client';
import { financeClient, type Category } from '../app/finance-client';
import './phoenix-card-purchase-editor.css';

type ResolvedPurchase = {
  card: CreditCard;
  purchase: CardPurchase;
  installmentNumber: number;
  statementMonth: string;
};

type EditorDraft = {
  description: string;
  cardId: string;
  categoryId: string;
  purchaseDate: string;
  totalAmount: number;
  installments: number;
};

type HiddenRow = { row: HTMLTableRowElement; display: string };

type MutationState = {
  fingerprint: string;
  operationId: string;
};

let observer: MutationObserver | null = null;
let scheduled = false;
let resolving = false;
let currentDetail: HTMLElement | null = null;
let resolved: ResolvedPurchase | null = null;
let categories: Category[] = [];
let cards: CreditCard[] = [];
let mutation: MutationState | null = null;
let cancelOperationId = '';

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function detailDrawer() {
  return document.querySelector<HTMLElement>('.px-detail-drawer.open');
}

function detailValue(root: HTMLElement, label: string) {
  const target = normalize(label);
  const item = [...root.querySelectorAll<HTMLElement>('.px-detail-grid > div')]
    .find((node) => normalize(node.querySelector('span')?.textContent || '') === target);
  return item?.querySelector('strong')?.textContent?.trim() || '';
}

function isProjectedCardMovement(root: HTMLElement) {
  const modality = normalize(detailValue(root, 'Modalidade'));
  const notices = normalize([...root.querySelectorAll<HTMLElement>('.px-notice')].map((node) => node.textContent || '').join(' '));
  return modality === 'CREDITO' && notices.includes('DOMINIO DE CARTOES/FATURAS');
}

function brazilianDateToIso(value: string) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function parseBrazilianMoney(value: string) {
  const normalized = String(value || '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function statementMonth(root: HTMLElement) {
  const text = `${detailValue(root, 'Forma')} ${[...root.querySelectorAll<HTMLElement>('.px-notice')].map((node) => node.textContent || '').join(' ')}`;
  const match = text.match(/Fatura\s+(0[1-9]|1[0-2])\/(\d{4})/i);
  if (match) return `${match[2]}-${match[1]}`;
  const due = brazilianDateToIso(detailValue(root, 'Vencimento'));
  return due.slice(0, 7);
}

function descriptionParts(root: HTMLElement) {
  const raw = root.querySelector<HTMLElement>('.px-detail-description')?.textContent?.trim() || '';
  const match = raw.match(/^(.*?)(?:\s*·\s*(\d+)\s*\/\s*(\d+))?$/);
  return {
    description: (match?.[1] || raw).trim(),
    installmentNumber: Number(match?.[2] || 1),
    installmentCount: Number(match?.[3] || 1),
  };
}

function cardName(root: HTMLElement) {
  return detailValue(root, 'Conta') || detailValue(root, 'Forma').split('·')[0]?.trim() || '';
}

function operationId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${uuid}`;
}

function purchaseFingerprint(draft: EditorDraft) {
  return JSON.stringify({
    description: normalize(draft.description),
    cardId: draft.cardId,
    categoryId: draft.categoryId,
    purchaseDate: draft.purchaseDate,
    totalCents: Math.round(draft.totalAmount * 100),
    installments: draft.installments,
  });
}

function paidPurchase(purchase: CardPurchase) {
  return purchase.entries.some((entry) => normalize(entry.status) === 'PAID');
}

function resolveFromCards(root: HTMLElement, availableCards: CreditCard[]) {
  const expectedCard = normalize(cardName(root));
  const expectedDate = brazilianDateToIso(detailValue(root, 'Data da compra'));
  const expectedAmount = Math.round(parseBrazilianMoney(detailValue(root, 'Valor')) * 100);
  const expectedStatementMonth = statementMonth(root);
  const parts = descriptionParts(root);
  const candidates: ResolvedPurchase[] = [];

  for (const card of availableCards) {
    if (expectedCard && normalize(card.name) !== expectedCard) continue;
    for (const purchase of card.purchases || []) {
      if (String(purchase.id || '').startsWith('legacy-')) continue;
      if (normalize(purchase.status) === 'CANCELLED') continue;
      if (normalize(purchase.description) !== normalize(parts.description)) continue;
      if (String(purchase.purchaseDate || '').slice(0, 10) !== expectedDate) continue;
      if (parts.installmentCount > 1 && Number(purchase.installments || 1) !== parts.installmentCount) continue;
      const entry = purchase.entries.find((item) => {
        const cents = Math.round(Math.abs(Number(item.amount || 0)) * 100);
        return Number(item.number || 1) === parts.installmentNumber
          && (!expectedStatementMonth || item.statementMonth === expectedStatementMonth)
          && (!expectedAmount || cents === expectedAmount);
      });
      if (!entry) continue;
      candidates.push({ card, purchase, installmentNumber: Number(entry.number || 1), statementMonth: entry.statementMonth });
    }
  }
  return candidates.length === 1 ? candidates[0] : null;
}

function actionContainer(root: HTMLElement) {
  return root.querySelector<HTMLElement>('.px-detail-actions');
}

function statusNotice(root: HTMLElement) {
  let node = root.querySelector<HTMLElement>('[data-phoenix-card-editor-status]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.phoenixCardEditorStatus = 'true';
    node.className = 'px-notice';
    actionContainer(root)?.insertAdjacentElement('beforebegin', node);
  }
  return node;
}

function setStatus(root: HTMLElement, text: string, kind: 'ok' | 'warn' | 'plain' = 'plain') {
  const node = statusNotice(root);
  node.textContent = text;
  node.className = `px-notice${kind === 'plain' ? '' : ` ${kind}`}`;
}

function ensureActions(root: HTMLElement) {
  const actions = actionContainer(root);
  if (!actions) return;
  const role = readSession()?.user.role || 'VIEWER';
  let edit = actions.querySelector<HTMLButtonElement>('[data-phoenix-card-purchase-edit]');
  if (!edit) {
    edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'px-primary-action';
    edit.dataset.phoenixCardPurchaseEdit = 'true';
    edit.textContent = 'Editar compra no cartão';
    actions.prepend(edit);
  }
  edit.disabled = !resolved || paidPurchase(resolved.purchase);

  if (role === 'ADMIN' || role === 'MANAGER') {
    let cancel = actions.querySelector<HTMLButtonElement>('[data-phoenix-card-purchase-cancel]');
    if (!cancel) {
      cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'px-secondary-action px-card-danger-action';
      cancel.dataset.phoenixCardPurchaseCancel = 'true';
      cancel.textContent = 'Cancelar compra';
      actions.append(cancel);
    }
    cancel.disabled = !resolved || paidPurchase(resolved.purchase);
  }
}

async function resolvePurchase(root: HTMLElement) {
  if (resolving) return;
  resolving = true;
  try {
    const month = statementMonth(root);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      resolved = null;
      setStatus(root, 'Não foi possível identificar a fatura desta parcela. A edição foi bloqueada para preservar a integridade do cartão.', 'warn');
      ensureActions(root);
      return;
    }
    const [availableCards, availableCategories] = await Promise.all([
      cardsClient.list(month),
      categories.length ? Promise.resolve(categories) : financeClient.listCategories(),
    ]);
    cards = availableCards.filter((card) => card.isActive);
    categories = availableCategories.filter((category) => category.isActive && (!category.type || category.type === 'expense'));
    resolved = resolveFromCards(root, cards);
    if (!resolved) {
      setStatus(root, 'A compra de origem não pôde ser identificada de forma única. Nenhuma alteração será liberada.', 'warn');
    } else if (paidPurchase(resolved.purchase)) {
      setStatus(root, 'Esta compra já possui parcela paga. Edição e cancelamento ficam bloqueados para preservar a fatura e o histórico financeiro.', 'warn');
    } else {
      setStatus(root, 'Compra identificada no domínio de cartões. Alterações recalculam as parcelas e faturas sem movimentar o caixa monetário.', 'ok');
    }
    ensureActions(root);
  } catch (error) {
    resolved = null;
    setStatus(root, error instanceof Error ? `Não foi possível preparar a edição: ${error.message}` : 'Não foi possível preparar a edição.', 'warn');
    ensureActions(root);
  } finally {
    resolving = false;
  }
}

function buildEditor(root: HTMLElement, item: ResolvedPurchase) {
  document.querySelector('[data-phoenix-card-purchase-editor-root]')?.remove();
  document.querySelector('[data-phoenix-card-purchase-editor-backdrop]')?.remove();

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'px-launch-backdrop';
  backdrop.dataset.phoenixCardPurchaseEditorBackdrop = 'true';
  backdrop.setAttribute('aria-label', 'Fechar edição da compra');

  const editor = document.createElement('aside');
  editor.className = 'px-launch-drawer px-card-purchase-editor';
  editor.dataset.phoenixCardPurchaseEditorRoot = 'true';
  editor.setAttribute('aria-label', 'Editar compra no cartão');

  const purchaseDate = String(item.purchase.purchaseDate || '').slice(0, 10);
  const total = Math.abs(Number(item.purchase.totalAmount || 0));
  const categoryOptions = categories
    .slice()
    .sort((left, right) => `${left.group || ''} ${left.name}`.localeCompare(`${right.group || ''} ${right.name}`, 'pt-BR'))
    .map((category) => `<option value="${escapeHtml(category.id)}"${category.id === item.purchase.category?.id ? ' selected' : ''}>${escapeHtml(category.group ? `${category.group} — ${category.name}` : category.name)}</option>`)
    .join('');
  const cardOptions = cards
    .map((card) => `<option value="${escapeHtml(card.id)}"${card.id === item.card.id ? ' selected' : ''}>${escapeHtml(card.name)}</option>`)
    .join('');

  editor.innerHTML = `
    <div class="px-drawer-head">
      <div><span class="px-kicker">Cartões / faturas</span><h2>Editar compra</h2></div>
      <button class="px-icon-btn" type="button" data-card-editor-close>×</button>
    </div>
    <div class="px-launch-form px-card">
      <div class="px-notice ok">Esta edição atua somente na compra do cartão. O caixa monetário não é movimentado.</div>
      <label class="px-field"><span>Descrição *</span><input data-card-edit-description maxlength="160" value="${escapeHtml(item.purchase.description)}" /></label>
      <label class="px-field"><span>Cartão *</span><select data-card-edit-card>${cardOptions}</select></label>
      <div class="px-form-row">
        <label class="px-field"><span>Data da compra *</span><input data-card-edit-date type="date" value="${escapeHtml(purchaseDate)}" /></label>
        <label class="px-field"><span>Valor total *</span><input data-card-edit-amount inputmode="decimal" value="${escapeHtml(total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}" /></label>
      </div>
      <label class="px-field"><span>Classificação / grupo</span><select data-card-edit-category><option value="">Sem classificação</option>${categoryOptions}</select></label>
      <label class="px-field"><span>Quantidade de parcelas *</span><input data-card-edit-installments type="number" min="1" max="48" value="${Math.max(1, Number(item.purchase.installments || 1))}" /></label>
      <div class="px-rule-box" data-card-edit-preview></div>
      <div class="px-notice" data-card-edit-feedback>Ao salvar, cartão, data, valor e quantidade de parcelas serão recalculados de forma atômica.</div>
      <div class="px-card-editor-actions">
        <button class="px-secondary-action" type="button" data-card-editor-close>Cancelar</button>
        <button class="px-primary-action" type="button" data-card-editor-save>Salvar alterações</button>
      </div>
    </div>`;

  document.body.append(backdrop, editor);
  backdrop.addEventListener('click', closeEditor);
  editor.querySelectorAll('[data-card-editor-close]').forEach((node) => node.addEventListener('click', closeEditor));
  editor.querySelectorAll('input,select').forEach((node) => node.addEventListener('input', updateEditorPreview));
  editor.querySelector('[data-card-editor-save]')?.addEventListener('click', () => void saveEditor(root, item));
  updateEditorPreview();
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function editorRoot() {
  return document.querySelector<HTMLElement>('[data-phoenix-card-purchase-editor-root]');
}

function editorDraft(): EditorDraft | null {
  const root = editorRoot();
  if (!root) return null;
  const description = root.querySelector<HTMLInputElement>('[data-card-edit-description]')?.value.trim() || '';
  const cardId = root.querySelector<HTMLSelectElement>('[data-card-edit-card]')?.value || '';
  const categoryId = root.querySelector<HTMLSelectElement>('[data-card-edit-category]')?.value || '';
  const purchaseDate = root.querySelector<HTMLInputElement>('[data-card-edit-date]')?.value || '';
  const totalAmount = parseBrazilianMoney(root.querySelector<HTMLInputElement>('[data-card-edit-amount]')?.value || '');
  const installments = Math.max(1, Math.min(48, Number(root.querySelector<HTMLInputElement>('[data-card-edit-installments]')?.value || 1) || 1));
  if (!description || !cardId || !purchaseDate || totalAmount <= 0 || !installments) return null;
  return { description, cardId, categoryId, purchaseDate, totalAmount, installments };
}

function firstStatementMonth(draft: EditorDraft) {
  const card = cards.find((item) => item.id === draft.cardId);
  if (!card || !draft.purchaseDate) return '';
  const [year, month] = draft.purchaseDate.slice(0, 7).split('-').map(Number);
  const day = Number(draft.purchaseDate.slice(8, 10));
  const offset = day > card.closingDay ? 1 : 0;
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function updateEditorPreview() {
  const root = editorRoot();
  if (!root) return;
  const preview = root.querySelector<HTMLElement>('[data-card-edit-preview]');
  const save = root.querySelector<HTMLButtonElement>('[data-card-editor-save]');
  const draft = editorDraft();
  if (!draft) {
    if (preview) preview.textContent = 'Preencha descrição, cartão, data, valor e quantidade de parcelas.';
    if (save) save.disabled = true;
    return;
  }
  const card = cards.find((item) => item.id === draft.cardId);
  const firstMonth = firstStatementMonth(draft);
  const installment = draft.totalAmount / draft.installments;
  if (preview) preview.textContent = `${draft.installments} parcela(s) · aproximadamente ${installment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · primeira fatura ${firstMonth || 'a calcular'} · ${card?.name || ''}.`;
  if (save) save.disabled = false;
  const fingerprint = purchaseFingerprint(draft);
  if (mutation && mutation.fingerprint !== fingerprint) mutation = null;
}

function feedback(text: string, kind: 'ok' | 'warn' | 'plain' = 'plain') {
  const root = editorRoot();
  const node = root?.querySelector<HTMLElement>('[data-card-edit-feedback]');
  if (!node) return;
  node.textContent = text;
  node.className = `px-notice${kind === 'plain' ? '' : ` ${kind}`}`;
}

function matchingRows(item: ResolvedPurchase) {
  const expectedDescription = normalize(item.purchase.description);
  const expectedCard = normalize(item.card.name);
  const expectedDate = String(item.purchase.purchaseDate || '').slice(0, 10);
  return [...document.querySelectorAll<HTMLTableRowElement>('.px-v15-launch-table tbody tr')].filter((row) => {
    const description = normalize(row.querySelector<HTMLElement>('td[data-label="Descrição"]')?.textContent || '').replace(/\s*·\s*\d+\s*\/\s*\d+$/, '');
    const payment = normalize(row.querySelector<HTMLElement>('td[data-label="Forma de pagamento"]')?.textContent || '');
    const purchaseDate = brazilianDateToIso(row.querySelector<HTMLElement>('td[data-label="Data da compra"]')?.textContent || '');
    return description === expectedDescription && payment.includes(expectedCard) && purchaseDate === expectedDate;
  });
}

function hideRows(item: ResolvedPurchase) {
  return matchingRows(item).map((row): HiddenRow => {
    const display = row.style.display;
    row.style.display = 'none';
    return { row, display };
  });
}

function restoreRows(rows: HiddenRow[]) {
  rows.forEach(({ row, display }) => { row.style.display = display; });
}

async function saveEditor(detail: HTMLElement, item: ResolvedPurchase) {
  const root = editorRoot();
  const draft = editorDraft();
  if (!root || !draft) return;
  const fingerprint = purchaseFingerprint(draft);
  if (!mutation || mutation.fingerprint !== fingerprint) {
    mutation = { fingerprint, operationId: operationId('phoenix-card-edit') };
  }
  const save = root.querySelector<HTMLButtonElement>('[data-card-editor-save]');
  const rows = hideRows(item);
  if (save) {
    save.disabled = true;
    save.textContent = 'Salvando e recalculando…';
  }
  feedback('Recalculando compra, parcelas e faturas no domínio de cartões…', 'ok');
  try {
    await cardsClient.updatePurchase(item.purchase.id, {
      cardId: draft.cardId,
      categoryId: draft.categoryId || undefined,
      description: draft.description,
      totalAmount: draft.totalAmount,
      purchaseDate: draft.purchaseDate,
      installments: draft.installments,
      operationId: mutation.operationId,
    });
    feedback('Alteração confirmada pelo servidor. Atualizando as faturas e a grade…', 'ok');
    closeEditor();
    detail.querySelector<HTMLButtonElement>('.px-drawer-head .px-icon-btn')?.click();
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: `/cards/purchases/${item.purchase.id}`, method: 'PATCH' } }));
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click(), 100);
  } catch (error) {
    restoreRows(rows);
    if (save) {
      save.disabled = false;
      save.textContent = 'Tentar salvar novamente';
    }
    const message = error instanceof Error ? error.message : 'Falha ao atualizar a compra.';
    feedback(message.includes('CARD_PURCHASE_ALREADY_PAID')
      ? 'A compra possui parcela paga e foi protegida contra alteração. Nenhum dado foi modificado.'
      : `${message} Os dados foram mantidos; a nova tentativa reutilizará a mesma operação protegida.`, 'warn');
  }
}

async function cancelPurchase(detail: HTMLElement, item: ResolvedPurchase) {
  if (paidPurchase(item.purchase)) return;
  if (!window.confirm(`Cancelar a compra “${item.purchase.description}” e retirar suas parcelas abertas das faturas?`)) return;
  if (!cancelOperationId) cancelOperationId = operationId('phoenix-card-cancel');
  const rows = hideRows(item);
  const button = detail.querySelector<HTMLButtonElement>('[data-phoenix-card-purchase-cancel]');
  if (button) {
    button.disabled = true;
    button.textContent = 'Cancelando…';
  }
  setStatus(detail, 'Cancelando a compra e preservando o registro na auditoria…', 'plain');
  try {
    await cardsClient.cancelPurchaseProtected(item.purchase.id, cancelOperationId);
    detail.querySelector<HTMLButtonElement>('.px-drawer-head .px-icon-btn')?.click();
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: `/cards/purchases/${item.purchase.id}`, method: 'DELETE' } }));
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click(), 100);
  } catch (error) {
    restoreRows(rows);
    if (button) {
      button.disabled = false;
      button.textContent = 'Tentar cancelar novamente';
    }
    const message = error instanceof Error ? error.message : 'Falha ao cancelar a compra.';
    setStatus(detail, message.includes('CARD_PURCHASE_ALREADY_PAID')
      ? 'A compra possui parcela paga e não pode ser cancelada. Nenhum dado foi alterado.'
      : `${message} A grade foi restaurada e a operação pode ser tentada novamente.`, 'warn');
  }
}

function closeEditor() {
  document.querySelector('[data-phoenix-card-purchase-editor-root]')?.remove();
  document.querySelector('[data-phoenix-card-purchase-editor-backdrop]')?.remove();
}

function sync() {
  scheduled = false;
  const root = detailDrawer();
  if (!root || !isProjectedCardMovement(root)) {
    currentDetail = null;
    resolved = null;
    mutation = null;
    cancelOperationId = '';
    closeEditor();
    return;
  }
  if (root !== currentDetail) {
    currentDetail = root;
    resolved = null;
    mutation = null;
    cancelOperationId = '';
    void resolvePurchase(root);
  } else {
    ensureActions(root);
  }
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(sync, 0);
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const detail = target?.closest<HTMLElement>('.px-detail-drawer.open');
  if (!detail || !resolved) return;
  if (target.closest('[data-phoenix-card-purchase-edit]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!paidPurchase(resolved.purchase)) buildEditor(detail, resolved);
  }
  if (target.closest('[data-phoenix-card-purchase-cancel]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void cancelPurchase(detail, resolved);
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && editorRoot()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeEditor();
  }
}

function start() {
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeydown, true);
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardPurchaseEditBridge() {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKeydown, true);
  closeEditor();
}
