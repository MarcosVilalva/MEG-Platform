import { readSession } from '../app/auth-client';
import { cardsClient, type CardPurchase, type CreditCard } from '../app/cards-client';
import { financeClient, type Category } from '../app/finance-client';
import { megConfirm } from './meg-confirm';
import './phoenix-card-purchase-editor.css';

type ResolvedPurchase = { card: CreditCard; purchase: CardPurchase; statementMonth: string; installmentNumber: number };
type EditorDraft = { description: string; cardId: string; categoryId: string; purchaseDate: string; totalAmount: number; installments: number };
type HiddenRow = { row: HTMLTableRowElement; display: string };

let observer: MutationObserver | null = null;
let scheduled = false;
let activeDetail: HTMLElement | null = null;
let cards: CreditCard[] = [];
let categories: Category[] = [];
let saveOperation: { fingerprint: string; operationId: string } | null = null;
let cancelOperationId = '';

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function detailDrawer() { return document.querySelector<HTMLElement>('.px-detail-drawer.open'); }
function detailValue(root: HTMLElement, label: string) {
  const wanted = normalize(label);
  return [...root.querySelectorAll<HTMLElement>('.px-detail-grid > div')]
    .find((node) => normalize(node.querySelector('span')?.textContent) === wanted)
    ?.querySelector('strong')?.textContent?.trim() || '';
}
function projectedCard(root: HTMLElement) {
  const notices = normalize([...root.querySelectorAll<HTMLElement>('.px-notice')].map((node) => node.textContent || '').join(' '));
  return normalize(detailValue(root, 'Modalidade')) === 'CREDITO' && notices.includes('DOMINIO DE CARTOES/FATURAS');
}
function brDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}
function money(value: string) {
  const parsed = Number(value.replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}
function statementMonth(root: HTMLElement) {
  const source = `${detailValue(root, 'Forma')} ${[...root.querySelectorAll<HTMLElement>('.px-notice')].map((node) => node.textContent || '').join(' ')}`;
  const match = source.match(/Fatura\s+(0[1-9]|1[0-2])\/(\d{4})/i);
  return match ? `${match[2]}-${match[1]}` : brDate(detailValue(root, 'Vencimento')).slice(0, 7);
}
function descriptionParts(root: HTMLElement) {
  const raw = root.querySelector<HTMLElement>('.px-detail-description')?.textContent?.trim() || '';
  const match = raw.match(/^(.*?)(?:\s*·\s*(\d+)\s*\/\s*(\d+))?$/);
  return { base: (match?.[1] || raw).trim(), number: Number(match?.[2] || 1), count: Number(match?.[3] || 1) };
}
function newOperationId(prefix: string) {
  return `${prefix}:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}
function paidPurchase(purchase: CardPurchase) { return purchase.entries.some((entry) => normalize(entry.status) === 'PAID'); }
function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function statusNode(root: HTMLElement) {
  let node = root.querySelector<HTMLElement>('[data-card-domain-editor-status]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.cardDomainEditorStatus = 'true';
    node.className = 'px-notice ok';
    root.querySelector('.px-detail-actions')?.insertAdjacentElement('beforebegin', node);
  }
  return node;
}
function setStatus(root: HTMLElement, text: string, warn = false) {
  const node = statusNode(root);
  if (node.textContent !== text) node.textContent = text;
  const className = `px-notice ${warn ? 'warn' : 'ok'}`;
  if (node.className !== className) node.className = className;
}

function ensureButtons(root: HTMLElement) {
  const actions = root.querySelector<HTMLElement>('.px-detail-actions');
  if (!actions || !projectedCard(root)) return;
  if (!actions.querySelector('[data-card-domain-edit]')) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'px-primary-action';
    edit.dataset.cardDomainEdit = 'true';
    edit.textContent = 'Editar compra no cartão';
    actions.prepend(edit);
  }
  const role = readSession()?.user.role;
  if ((role === 'ADMIN' || role === 'MANAGER') && !actions.querySelector('[data-card-domain-cancel]')) {
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'px-secondary-action px-card-danger-action';
    cancel.dataset.cardDomainCancel = 'true';
    cancel.textContent = 'Cancelar compra';
    actions.append(cancel);
  }
  if (!root.querySelector('[data-card-domain-editor-status]')) {
    setStatus(root, 'A compra pertence ao domínio de cartões/faturas. Edição e cancelamento recalculam somente cartão e parcelas; o caixa monetário permanece intacto.');
  }
}

async function resolvePurchase(root: HTMLElement): Promise<ResolvedPurchase> {
  const month = statementMonth(root);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Não foi possível identificar a fatura da parcela.');
  const [loadedCards, loadedCategories] = await Promise.all([cardsClient.list(month), financeClient.listCategories()]);
  cards = loadedCards.filter((card) => card.isActive);
  categories = loadedCategories.filter((category) => category.isActive && (!category.type || category.type === 'expense'));
  const expectedCard = normalize(detailValue(root, 'Conta') || detailValue(root, 'Forma').split('·')[0]);
  const expectedDate = brDate(detailValue(root, 'Data da compra'));
  const expectedAmount = Math.round(money(detailValue(root, 'Valor')) * 100);
  const parts = descriptionParts(root);
  const matches: ResolvedPurchase[] = [];
  for (const card of cards) {
    if (expectedCard && normalize(card.name) !== expectedCard) continue;
    for (const purchase of card.purchases) {
      if (purchase.id.startsWith('legacy-') || normalize(purchase.status) === 'CANCELLED') continue;
      if (normalize(purchase.description) !== normalize(parts.base)) continue;
      if (String(purchase.purchaseDate).slice(0, 10) !== expectedDate) continue;
      if (parts.count > 1 && Number(purchase.installments || 1) !== parts.count) continue;
      const entry = purchase.entries.find((item) => Number(item.number || 1) === parts.number && item.statementMonth === month && Math.round(Math.abs(Number(item.amount || 0)) * 100) === expectedAmount);
      if (entry) matches.push({ card, purchase, statementMonth: month, installmentNumber: Number(entry.number || 1) });
    }
  }
  if (matches.length !== 1) throw new Error(matches.length ? 'Mais de uma compra corresponde a esta parcela; a edição foi bloqueada.' : 'A compra de origem não foi localizada com segurança.');
  return matches[0];
}

function closeEditor() {
  document.querySelector('[data-card-purchase-editor]')?.remove();
  document.querySelector('[data-card-purchase-editor-backdrop]')?.remove();
}
function editorRoot() { return document.querySelector<HTMLElement>('[data-card-purchase-editor]'); }
function editorDraft(): EditorDraft | null {
  const root = editorRoot();
  if (!root) return null;
  const description = root.querySelector<HTMLInputElement>('[data-edit-description]')?.value.trim() || '';
  const cardId = root.querySelector<HTMLSelectElement>('[data-edit-card]')?.value || '';
  const categoryId = root.querySelector<HTMLSelectElement>('[data-edit-category]')?.value || '';
  const purchaseDate = root.querySelector<HTMLInputElement>('[data-edit-date]')?.value || '';
  const totalAmount = money(root.querySelector<HTMLInputElement>('[data-edit-amount]')?.value || '');
  const installments = Math.max(1, Math.min(48, Number(root.querySelector<HTMLInputElement>('[data-edit-installments]')?.value || 1) || 1));
  return description && cardId && purchaseDate && totalAmount > 0 ? { description, cardId, categoryId, purchaseDate, totalAmount, installments } : null;
}
function fingerprint(draft: EditorDraft) { return JSON.stringify({ ...draft, totalAmount: Math.round(draft.totalAmount * 100) }); }
function firstStatement(draft: EditorDraft) {
  const card = cards.find((item) => item.id === draft.cardId);
  if (!card) return '';
  const [year, month] = draft.purchaseDate.slice(0, 7).split('-').map(Number);
  const day = Number(draft.purchaseDate.slice(8, 10));
  return new Date(Date.UTC(year, month - 1 + (day > card.closingDay ? 1 : 0), 1)).toISOString().slice(0, 7);
}
function updatePreview() {
  const root = editorRoot();
  if (!root) return;
  const preview = root.querySelector<HTMLElement>('[data-edit-preview]');
  const save = root.querySelector<HTMLButtonElement>('[data-edit-save]');
  const draft = editorDraft();
  if (!draft) {
    if (preview) preview.textContent = 'Preencha descrição, cartão, data, valor e parcelas.';
    if (save) save.disabled = true;
    return;
  }
  const card = cards.find((item) => item.id === draft.cardId);
  if (preview) preview.textContent = `${draft.installments} parcela(s) · primeira fatura ${firstStatement(draft)} · ${card?.name || ''}. O servidor redistribuirá os centavos sem perda.`;
  if (save) save.disabled = false;
  if (saveOperation && saveOperation.fingerprint !== fingerprint(draft)) saveOperation = null;
}
function feedback(text: string, warn = false) {
  const node = editorRoot()?.querySelector<HTMLElement>('[data-edit-feedback]');
  if (!node) return;
  if (node.textContent !== text) node.textContent = text;
  const className = `px-notice ${warn ? 'warn' : 'ok'}`;
  if (node.className !== className) node.className = className;
}

function openEditor(detail: HTMLElement, item: ResolvedPurchase) {
  closeEditor();
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'px-launch-backdrop';
  backdrop.dataset.cardPurchaseEditorBackdrop = 'true';
  backdrop.addEventListener('click', closeEditor);
  const editor = document.createElement('aside');
  editor.className = 'px-launch-drawer px-card-purchase-editor';
  editor.dataset.cardPurchaseEditor = 'true';
  const cardOptions = cards.map((card) => `<option value="${escapeHtml(card.id)}"${card.id === item.card.id ? ' selected' : ''}>${escapeHtml(card.name)}</option>`).join('');
  const categoryOptions = categories.slice().sort((a, b) => `${a.group || ''}${a.name}`.localeCompare(`${b.group || ''}${b.name}`, 'pt-BR')).map((category) => `<option value="${escapeHtml(category.id)}"${category.id === item.purchase.category?.id ? ' selected' : ''}>${escapeHtml(category.group ? `${category.group} — ${category.name}` : category.name)}</option>`).join('');
  editor.innerHTML = `<div class="px-drawer-head"><div><span class="px-kicker">Cartões / faturas</span><h2>Editar compra</h2></div><button class="px-icon-btn" type="button" data-edit-close>×</button></div><div class="px-launch-form px-card"><div class="px-notice ok">A alteração é restrita ao domínio do cartão e não movimenta o caixa.</div><label class="px-field"><span>Descrição *</span><input data-edit-description maxlength="160" value="${escapeHtml(item.purchase.description)}"></label><label class="px-field"><span>Cartão *</span><select data-edit-card>${cardOptions}</select></label><div class="px-form-row"><label class="px-field"><span>Data da compra *</span><input data-edit-date type="date" value="${escapeHtml(String(item.purchase.purchaseDate).slice(0, 10))}"></label><label class="px-field"><span>Valor total *</span><input data-edit-amount inputmode="decimal" value="${escapeHtml(Math.abs(Number(item.purchase.totalAmount || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}"></label></div><label class="px-field"><span>Classificação / grupo</span><select data-edit-category><option value="">Sem classificação</option>${categoryOptions}</select></label><label class="px-field"><span>Quantidade de parcelas *</span><input data-edit-installments type="number" min="1" max="48" value="${Math.max(1, Number(item.purchase.installments || 1))}"></label><div class="px-rule-box" data-edit-preview></div><div class="px-notice" data-edit-feedback>Ao salvar, as parcelas abertas serão recalculadas de forma atômica.</div><div class="px-card-editor-actions"><button class="px-secondary-action" type="button" data-edit-close>Fechar</button><button class="px-primary-action" type="button" data-edit-save>Salvar alterações</button></div></div>`;
  document.body.append(backdrop, editor);
  editor.querySelectorAll('[data-edit-close]').forEach((node) => node.addEventListener('click', closeEditor));
  editor.querySelectorAll('input,select').forEach((node) => node.addEventListener('input', updatePreview));
  editor.querySelector('[data-edit-save]')?.addEventListener('click', () => void save(detail, item));
  updatePreview();
}

function matchingRows(item: ResolvedPurchase) {
  const expectedDescription = normalize(item.purchase.description);
  const expectedCard = normalize(item.card.name);
  const expectedDate = String(item.purchase.purchaseDate).slice(0, 10);
  return [...document.querySelectorAll<HTMLTableRowElement>('.px-v15-launch-table tbody tr')].filter((row) => {
    const description = normalize(row.querySelector<HTMLElement>('td[data-label="Descrição"]')?.textContent || '').replace(/\s*·\s*\d+\s*\/\s*\d+$/, '');
    const form = normalize(row.querySelector<HTMLElement>('td[data-label="Forma de pagamento"]')?.textContent || '');
    const purchaseDate = brDate(row.querySelector<HTMLElement>('td[data-label="Data da compra"]')?.textContent || '');
    return description === expectedDescription && form.includes(expectedCard) && purchaseDate === expectedDate;
  });
}
function hideRows(item: ResolvedPurchase): HiddenRow[] { return matchingRows(item).map((row) => { const display = row.style.display; row.style.display = 'none'; return { row, display }; }); }
function restoreRows(rows: HiddenRow[]) { rows.forEach(({ row, display }) => { row.style.display = display; }); }

async function save(detail: HTMLElement, item: ResolvedPurchase) {
  const draft = editorDraft();
  const root = editorRoot();
  if (!draft || !root) return;
  const mark = fingerprint(draft);
  if (!saveOperation || saveOperation.fingerprint !== mark) saveOperation = { fingerprint: mark, operationId: newOperationId('phoenix-card-edit') };
  const button = root.querySelector<HTMLButtonElement>('[data-edit-save]');
  const rows = hideRows(item);
  if (button) { button.disabled = true; button.textContent = 'Salvando…'; }
  feedback('Recalculando compra, parcelas e faturas…');
  try {
    await cardsClient.updatePurchase(item.purchase.id, { ...draft, categoryId: draft.categoryId || undefined, operationId: saveOperation.operationId });
    closeEditor();
    detail.querySelector<HTMLButtonElement>('.px-drawer-head .px-icon-btn')?.click();
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: `/cards/purchases/${item.purchase.id}`, method: 'PATCH' } }));
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click(), 100);
  } catch (error) {
    restoreRows(rows);
    if (button) { button.disabled = false; button.textContent = 'Tentar salvar novamente'; }
    const message = error instanceof Error ? error.message : 'Falha ao atualizar a compra.';
    feedback(message.includes('CARD_PURCHASE_ALREADY_PAID') ? 'A compra possui parcela paga e foi protegida contra alteração.' : `${message} Os dados foram mantidos para nova tentativa.`, true);
  }
}

async function cancel(detail: HTMLElement, item: ResolvedPurchase) {
  if (paidPurchase(item.purchase)) { setStatus(detail, 'Esta compra possui parcela paga e não pode ser cancelada.', true); return; }
  if (!await megConfirm({
    kicker: 'Compra no cartão',
    title: 'Cancelar esta compra?',
    message: `“${item.purchase.description}” será cancelada e as parcelas abertas serão retiradas das faturas. O histórico de auditoria será preservado.`,
    confirmLabel: 'Sim, cancelar compra',
    cancelLabel: 'Manter compra',
    danger: true,
  })) return;
  if (!cancelOperationId) cancelOperationId = newOperationId('phoenix-card-cancel');
  const rows = hideRows(item);
  setStatus(detail, 'Cancelando compra e registrando a operação na auditoria…');
  try {
    await cardsClient.cancelPurchaseProtected(item.purchase.id, cancelOperationId);
    detail.querySelector<HTMLButtonElement>('.px-drawer-head .px-icon-btn')?.click();
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: `/cards/purchases/${item.purchase.id}`, method: 'DELETE' } }));
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click(), 100);
  } catch (error) {
    restoreRows(rows);
    const message = error instanceof Error ? error.message : 'Falha ao cancelar a compra.';
    setStatus(detail, message.includes('CARD_PURCHASE_ALREADY_PAID') ? 'A compra possui parcela paga e foi protegida contra cancelamento.' : `${message} Nenhuma linha foi removida.`, true);
  }
}

async function handleEdit(detail: HTMLElement) {
  setStatus(detail, 'Identificando a compra no domínio de cartões…');
  try {
    const item = await resolvePurchase(detail);
    if (paidPurchase(item.purchase)) { setStatus(detail, 'Esta compra já possui parcela paga. A edição foi bloqueada.', true); return; }
    openEditor(detail, item);
  } catch (error) { setStatus(detail, error instanceof Error ? error.message : 'Não foi possível abrir a compra.', true); }
}
async function handleCancel(detail: HTMLElement) {
  setStatus(detail, 'Identificando a compra no domínio de cartões…');
  try { await cancel(detail, await resolvePurchase(detail)); }
  catch (error) { setStatus(detail, error instanceof Error ? error.message : 'Não foi possível localizar a compra.', true); }
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const detail = target.closest<HTMLElement>('.px-detail-drawer.open');
  if (!detail || !projectedCard(detail)) return;
  if (target.closest('[data-card-domain-edit]')) { event.preventDefault(); event.stopImmediatePropagation(); void handleEdit(detail); }
  else if (target.closest('[data-card-domain-cancel]')) { event.preventDefault(); event.stopImmediatePropagation(); void handleCancel(detail); }
}
function sync() {
  scheduled = false;
  const root = detailDrawer();
  if (!root || !projectedCard(root)) { activeDetail = null; saveOperation = null; cancelOperationId = ''; closeEditor(); return; }
  if (root !== activeDetail) { activeDetail = root; saveOperation = null; cancelOperationId = ''; }
  ensureButtons(root);
}
function schedule() { if (!scheduled) { scheduled = true; window.setTimeout(sync, 0); } }
function onKeydown(event: KeyboardEvent) { if (event.key === 'Escape' && editorRoot()) { event.preventDefault(); event.stopImmediatePropagation(); closeEditor(); } }
function start() {
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeydown, true);
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
export function stopPhoenixCardPurchaseEditBridge() { observer?.disconnect(); observer = null; document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKeydown, true); closeEditor(); }
