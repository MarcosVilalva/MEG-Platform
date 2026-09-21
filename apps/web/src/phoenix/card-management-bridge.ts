import { readSession } from '../app/auth-client';
import { cardsClient, type CreditCard, type CreditCardMutationInput } from '../app/cards-client';
import { resolvePhoenixCardIdentity } from './card-identity';
import { megConfirm } from './meg-confirm';
import './phoenix-card-management.css';

type Mode = 'list' | 'create' | 'edit';

let observer: MutationObserver | null = null;
let scheduled = false;
let loadingPromise: Promise<CreditCard[]> | null = null;
let cards: CreditCard[] = [];
let mode: Mode = 'list';
let editingId = '';
let pendingMutation: { fingerprint: string; operationId: string } | null = null;

function mutationOperationId(fingerprint: string) {
  if (pendingMutation?.fingerprint === fingerprint) return pendingMutation.operationId;
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const operationId = `card-management:${random}`;
  pendingMutation = { fingerprint, operationId };
  return operationId;
}

function clearMutationOperation() {
  pendingMutation = null;
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function activeMonth() {
  const raw = document.querySelector<HTMLElement>('.px-period-active')?.textContent || '';
  const monthNames: Record<string, string> = {
    jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', março: '03',
    abr: '04', abril: '04', mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07',
    ago: '08', agosto: '08', set: '09', setembro: '09', out: '10', outubro: '10', nov: '11', novembro: '11',
    dez: '12', dezembro: '12'
  };
  const cleaned = normalize(raw).replace(/[.,]/g, ' ');
  const iso = cleaned.match(/(20\d{2})[-/]?(0[1-9]|1[0-2])/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const year = cleaned.match(/\b(20\d{2})\b/)?.[1];
  const token = cleaned.split(/[^a-z0-9çã]+/).find((item) => monthNames[item]);
  if (year && token) return `${year}-${monthNames[token]}`;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value || '2026'}-${parts.find((part) => part.type === 'month')?.value || '01'}`;
}

function managementButton() {
  return [...document.querySelectorAll<HTMLButtonElement>('.px-screen-head-aside button')]
    .find((button) => normalize(button.textContent).includes('gerenciar cart')) || null;
}

function canWrite() {
  const role = readSession()?.user.role;
  return role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
}

function canDeactivate() {
  const role = readSession()?.user.role;
  return role === 'ADMIN' || role === 'MANAGER';
}

function decorateButton() {
  scheduled = false;
  const button = managementButton();
  if (!button) return;
  button.dataset.phoenixCardManagement = 'true';
  if (canWrite()) {
    button.disabled = false;
    button.title = 'Cadastrar, editar, desativar e reativar cartões';
  } else {
    button.disabled = true;
    button.title = 'Seu perfil não possui permissão para alterar cartões.';
  }
}

function scheduleDecorate() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(decorateButton, 0);
}

function closeDrawer() {
  document.querySelector('[data-card-management]')?.remove();
  document.querySelector('[data-card-management-backdrop]')?.remove();
  mode = 'list';
  editingId = '';
  clearMutationOperation();
}

function root() {
  return document.querySelector<HTMLElement>('[data-card-management]');
}

function feedback(text: string, warn = false) {
  const node = root()?.querySelector<HTMLElement>('[data-card-management-feedback]');
  if (!node) return;
  node.className = `px-notice ${warn ? 'warn' : 'ok'}`;
  node.textContent = text;
}

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(parsed) ? parsed : 0);
}

function numericInput(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function parseBrazilianNumber(value: string) {
  const raw = value.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!raw) return 0;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function activeCards() {
  return cards.filter((card) => card.isActive);
}

function inactiveCards() {
  return cards.filter((card) => !card.isActive);
}

function currentEditing() {
  return cards.find((card) => card.id === editingId && card.isActive) || null;
}

function cardVisual(card: CreditCard) {
  const identity = resolvePhoenixCardIdentity(card);
  const art = identity.artwork
    ? `<img src="${escapeHtml(`${import.meta.env.BASE_URL}${identity.artwork}`)}" alt="${escapeHtml(identity.label)}">`
    : `<strong>${escapeHtml(identity.miniLabel)}</strong>`;
  return { identity, art };
}

function activeCardListHtml() {
  const items = activeCards();
  if (!items.length) return '<div class="px-card-management-empty"><strong>Nenhum cartão ativo</strong><span>Cadastre um cartão novo ou reative um cartão abaixo.</span></div>';
  return items.map((card) => {
    const { identity, art } = cardVisual(card);
    return `<button type="button" class="px-card-manage-item" data-card-manage-edit="${escapeHtml(card.id)}">
      <span class="px-card-manage-mini" style="background:${escapeHtml(identity.background)}">${art}</span>
      <span class="px-card-manage-copy"><span class="px-card-manage-title"><strong>${escapeHtml(card.name)}</strong><em class="px-card-state is-active">Ativo</em></span><small>${escapeHtml(card.issuer || card.brand || 'Cartão cadastrado')} · limite ${escapeHtml(money(card.creditLimit))}</small><small>Fecha dia ${escapeHtml(card.closingDay)} · vence dia ${escapeHtml(card.dueDay)}${card.lastFour ? ` · final ${escapeHtml(card.lastFour)}` : ''}</small></span>
      <span class="px-card-manage-chevron">›</span>
    </button>`;
  }).join('');
}

function inactiveCardListHtml() {
  const items = inactiveCards();
  if (!items.length) return '<div class="px-card-management-empty is-compact"><strong>Nenhum cartão inativo</strong><span>Cartões desativados aparecerão aqui sem perder o histórico.</span></div>';
  return items.map((card) => {
    const { identity, art } = cardVisual(card);
    const action = canDeactivate()
      ? `<button type="button" class="px-secondary-action px-card-reactivate" data-card-manage-reactivate="${escapeHtml(card.id)}">Reativar</button>`
      : '<span class="px-card-reactivate-note">ADMIN/MANAGER</span>';
    return `<div class="px-card-manage-item is-inactive">
      <span class="px-card-manage-mini" style="background:${escapeHtml(identity.background)}">${art}</span>
      <span class="px-card-manage-copy"><span class="px-card-manage-title"><strong>${escapeHtml(card.name)}</strong><em class="px-card-state is-inactive">Inativo</em></span><small>${escapeHtml(card.issuer || card.brand || 'Cartão cadastrado')} · limite ${escapeHtml(money(card.creditLimit))}</small><small>Histórico preservado${card.lastFour ? ` · final ${escapeHtml(card.lastFour)}` : ''}</small></span>
      <span class="px-card-manage-reactivate-slot">${action}</span>
    </div>`;
  }).join('');
}

function listView() {
  const active = activeCards();
  const inactive = inactiveCards();
  return `<div class="px-card-management-body">
    <div class="px-card-management-toolbar"><div class="px-card-management-counts"><span>Ativos <strong>${active.length}</strong></span><span>Inativos <strong>${inactive.length}</strong></span></div><button class="px-primary-action" type="button" data-card-manage-new>＋ Novo cartão</button></div>
    <section class="px-card-management-section"><div class="px-card-management-section-head"><div><strong>Cartões ativos</strong><span>Disponíveis para compras, faturas e novos lançamentos.</span></div></div><div class="px-card-management-list">${activeCardListHtml()}</div></section>
    <section class="px-card-management-section is-inactive"><div class="px-card-management-section-head"><div><strong>Cartões inativos</strong><span>Ficam fora dos novos lançamentos, mas continuam ligados ao histórico original.</span></div></div><div class="px-card-management-list">${inactiveCardListHtml()}</div></section>
    <div class="px-notice ok" data-card-management-feedback>Desativar não apaga compras nem faturas. Reativar reutiliza o mesmo cartão e o mesmo histórico.</div>
  </div>`;
}

function previewCard(input: Partial<CreditCardMutationInput>, id = 'preview') {
  const mock: CreditCard = {
    id,
    name: input.name || 'Novo cartão',
    issuer: input.issuer || null,
    brand: input.brand || null,
    lastFour: input.lastFour || null,
    creditLimit: input.creditLimit || 0,
    closingDay: input.closingDay || 1,
    dueDay: input.dueDay || 1,
    color: input.color || '#172341',
    isActive: true,
    usedLimit: 0,
    availableLimit: Number(input.creditLimit || 0),
    statementAmount: 0,
    purchases: []
  };
  return { mock, identity: resolvePhoenixCardIdentity(mock) };
}

function formView(card: CreditCard | null) {
  const creating = mode === 'create';
  const draft: CreditCardMutationInput = {
    name: card?.name || '',
    issuer: card?.issuer || '',
    brand: card?.brand || '',
    lastFour: card?.lastFour || '',
    creditLimit: Number(card?.creditLimit || 0),
    closingDay: Number(card?.closingDay || 1),
    dueDay: Number(card?.dueDay || 1),
    color: card?.color || '#172341'
  };
  const { identity } = previewCard(draft, card?.id || 'preview');
  const art = identity.artwork
    ? `<img data-card-preview-art src="${escapeHtml(`${import.meta.env.BASE_URL}${identity.artwork}`)}" alt="${escapeHtml(identity.label)}">`
    : `<strong data-card-preview-label>${escapeHtml(identity.label)}</strong>`;
  const brandOptions = ['', 'Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard'].map((brand) => `<option value="${escapeHtml(brand)}"${normalize(draft.brand) === normalize(brand) ? ' selected' : ''}>${escapeHtml(brand || 'Não informado')}</option>`).join('');
  return `<div class="px-card-management-body">
    <button class="px-card-management-back" type="button" data-card-manage-back>← Voltar aos cartões</button>
    <div class="px-card-management-preview" data-card-management-preview style="background:${escapeHtml(identity.background)}">${art}<span data-card-preview-sub>${escapeHtml(draft.issuer || draft.brand || 'MEG FINANÇAS')}${draft.lastFour ? ` · •••• ${escapeHtml(draft.lastFour)}` : ''}</span></div>
    <div class="px-card-management-form">
      <label class="px-field"><span>Nome do cartão *</span><input data-card-field="name" maxlength="80" value="${escapeHtml(draft.name)}" placeholder="Ex.: LATAM Pass Platinum"></label>
      <div class="px-form-row"><label class="px-field"><span>Emissor / banco</span><input data-card-field="issuer" maxlength="80" value="${escapeHtml(draft.issuer)}" placeholder="Ex.: Itaú"></label><label class="px-field"><span>Bandeira</span><select data-card-field="brand">${brandOptions}</select></label></div>
      <div class="px-form-row"><label class="px-field"><span>Final do cartão</span><input data-card-field="lastFour" inputmode="numeric" maxlength="4" value="${escapeHtml(draft.lastFour)}" placeholder="1234"></label><label class="px-field"><span>Limite *</span><input data-card-field="creditLimit" inputmode="decimal" value="${escapeHtml(numericInput(draft.creditLimit))}" placeholder="0,00"></label></div>
      <div class="px-form-row"><label class="px-field"><span>Dia do fechamento *</span><input data-card-field="closingDay" type="number" min="1" max="31" value="${escapeHtml(draft.closingDay)}"></label><label class="px-field"><span>Dia do vencimento *</span><input data-card-field="dueDay" type="number" min="1" max="31" value="${escapeHtml(draft.dueDay)}"></label></div>
      <label class="px-card-color-field"><span>Cor de apoio visual</span><input data-card-field="color" type="color" value="${escapeHtml(draft.color || '#172341')}"><small>A identidade e a imagem do cartão são resolvidas automaticamente pelo produto, emissor e bandeira; esta cor é usada quando não há arte específica.</small></label>
      <div class="px-notice" data-card-management-feedback>${creating ? 'Revise os dados antes de cadastrar. O cartão será incluído como ativo.' : 'Alterações de cadastro não movimentam o caixa nem recriam compras existentes.'}</div>
      <div class="px-card-management-actions">
        ${!creating && canDeactivate() ? '<button class="px-secondary-action px-card-management-danger" type="button" data-card-manage-deactivate>Desativar cartão</button>' : '<span></span>'}
        <div><button class="px-secondary-action" type="button" data-card-manage-back>Cancelar</button><button class="px-primary-action" type="button" data-card-manage-save>${creating ? 'Cadastrar cartão' : 'Salvar alterações'}</button></div>
      </div>
    </div>
  </div>`;
}

function render() {
  const drawer = root();
  if (!drawer) return;
  const content = drawer.querySelector<HTMLElement>('[data-card-management-content]');
  if (!content) return;
  content.innerHTML = mode === 'list' ? listView() : formView(currentEditing());
  bindContent();
}

async function loadCards() {
  if (loadingPromise) return loadingPromise;
  const pending = cardsClient.listManagement(activeMonth())
    .then((loaded) => {
      cards = loaded;
      return loaded;
    })
    .finally(() => {
      if (loadingPromise === pending) loadingPromise = null;
    });
  loadingPromise = pending;
  return pending;
}

function replaceCard(saved: CreditCard) {
  const index = cards.findIndex((card) => card.id === saved.id);
  if (index < 0) cards = [...cards, saved];
  else cards = cards.map((card) => card.id === saved.id ? saved : card);
}

function refreshCardsInBackground() {
  void loadCards()
    .then(() => {
      if (root() && mode === 'list') render();
    })
    .catch(() => {
      // O resultado confirmado pelo servidor permanece visível; uma releitura futura tenta novamente.
    });
}

async function openDrawer() {
  if (!canWrite()) return;
  closeDrawer();
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'px-launch-backdrop';
  backdrop.dataset.cardManagementBackdrop = 'true';
  backdrop.setAttribute('aria-label', 'Fechar gerenciamento de cartões');
  backdrop.addEventListener('click', closeDrawer);

  const drawer = document.createElement('aside');
  drawer.className = 'px-launch-drawer px-card-management-drawer';
  drawer.dataset.cardManagement = 'true';
  drawer.innerHTML = `<div class="px-drawer-head"><div><span class="px-kicker">Cartões / faturas</span><h2>Gerenciar cartões</h2></div><button class="px-icon-btn" type="button" data-card-management-close>×</button></div><div data-card-management-content><div class="px-card-management-loading"><span class="px-card-management-spinner"></span><strong>Carregando cartões…</strong></div></div>`;
  document.body.append(backdrop, drawer);
  drawer.querySelector('[data-card-management-close]')?.addEventListener('click', closeDrawer);
  try {
    await loadCards();
    if (!root()) return;
    render();
  } catch (error) {
    const content = root()?.querySelector<HTMLElement>('[data-card-management-content]');
    if (content) content.innerHTML = `<div class="px-card-management-body"><div class="px-notice warn">${escapeHtml(error instanceof Error ? error.message : 'Não foi possível carregar os cartões.')}</div></div>`;
  }
}

function readDraft(): CreditCardMutationInput | null {
  const drawer = root();
  if (!drawer) return null;
  const name = drawer.querySelector<HTMLInputElement>('[data-card-field="name"]')?.value.trim() || '';
  const issuer = drawer.querySelector<HTMLInputElement>('[data-card-field="issuer"]')?.value.trim() || '';
  const brand = drawer.querySelector<HTMLSelectElement>('[data-card-field="brand"]')?.value.trim() || '';
  const lastFour = (drawer.querySelector<HTMLInputElement>('[data-card-field="lastFour"]')?.value || '').replace(/\D/g, '').slice(0, 4);
  const creditLimit = parseBrazilianNumber(drawer.querySelector<HTMLInputElement>('[data-card-field="creditLimit"]')?.value || '');
  const closingDay = Number(drawer.querySelector<HTMLInputElement>('[data-card-field="closingDay"]')?.value || 0);
  const dueDay = Number(drawer.querySelector<HTMLInputElement>('[data-card-field="dueDay"]')?.value || 0);
  const color = drawer.querySelector<HTMLInputElement>('[data-card-field="color"]')?.value || '#172341';
  if (name.length < 2 || !(creditLimit > 0) || closingDay < 1 || closingDay > 31 || dueDay < 1 || dueDay > 31 || (lastFour && lastFour.length !== 4)) return null;
  return { name, issuer: issuer || undefined, brand: brand || undefined, lastFour: lastFour || undefined, creditLimit, closingDay, dueDay, color };
}

function updatePreview() {
  const drawer = root();
  const preview = drawer?.querySelector<HTMLElement>('[data-card-management-preview]');
  if (!drawer || !preview) return;
  const name = drawer.querySelector<HTMLInputElement>('[data-card-field="name"]')?.value.trim() || 'Novo cartão';
  const issuer = drawer.querySelector<HTMLInputElement>('[data-card-field="issuer"]')?.value.trim() || '';
  const brand = drawer.querySelector<HTMLSelectElement>('[data-card-field="brand"]')?.value || '';
  const lastFour = (drawer.querySelector<HTMLInputElement>('[data-card-field="lastFour"]')?.value || '').replace(/\D/g, '').slice(0, 4);
  const color = drawer.querySelector<HTMLInputElement>('[data-card-field="color"]')?.value || '#172341';
  const { identity } = previewCard({ name, issuer, brand, lastFour, creditLimit: 1, closingDay: 1, dueDay: 1, color }, editingId || 'preview');
  preview.style.background = identity.background;
  const existingArt = preview.querySelector<HTMLImageElement>('[data-card-preview-art]');
  const existingLabel = preview.querySelector<HTMLElement>('[data-card-preview-label]');
  if (identity.artwork) {
    if (existingLabel) existingLabel.remove();
    const image = existingArt || document.createElement('img');
    image.dataset.cardPreviewArt = 'true';
    image.src = `${import.meta.env.BASE_URL}${identity.artwork}`;
    image.alt = identity.label;
    if (!existingArt) preview.prepend(image);
  } else {
    existingArt?.remove();
    const label = existingLabel || document.createElement('strong');
    label.dataset.cardPreviewLabel = 'true';
    label.textContent = identity.label;
    if (!existingLabel) preview.prepend(label);
  }
  const sub = preview.querySelector<HTMLElement>('[data-card-preview-sub]');
  if (sub) sub.textContent = `${issuer || brand || 'MEG FINANÇAS'}${lastFour ? ` · •••• ${lastFour}` : ''}`;
}

async function saveCard() {
  const draft = readDraft();
  if (!draft) {
    feedback('Confira os campos obrigatórios: nome, limite maior que zero, fechamento/vencimento entre 1 e 31 e final com 4 dígitos.', true);
    return;
  }
  const duplicate = cards.find((card) => card.id !== editingId && normalize(card.name) === normalize(draft.name));
  if (duplicate) {
    feedback(duplicate.isActive
      ? `Já existe um cartão ativo chamado “${duplicate.name}”. Ajuste o nome antes de salvar.`
      : `Já existe um cartão inativo chamado “${duplicate.name}”. Reative esse cartão para preservar o histórico em vez de criar outro.`, true);
    return;
  }
  const button = root()?.querySelector<HTMLButtonElement>('[data-card-manage-save]');
  if (button) { button.disabled = true; button.textContent = mode === 'create' ? 'Cadastrando…' : 'Salvando…'; }
  feedback(mode === 'create' ? 'Cadastrando cartão…' : 'Atualizando cadastro do cartão…');
  try {
    const current = mode === 'edit' && editingId ? cards.find((card) => card.id === editingId) || null : null;
    const fingerprint = JSON.stringify({ action: mode, id: editingId || null, updatedAt: current?.updatedAt || null, draft });
    const operationId = mutationOperationId(fingerprint);
    const saved = mode === 'create'
      ? await cardsClient.create({ ...draft, operationId })
      : editingId
        ? await cardsClient.update(editingId, { ...draft, operationId, expectedUpdatedAt: current?.updatedAt })
        : null;
    if (!saved) throw new Error('CARD_SAVE_TARGET_MISSING');
    replaceCard(saved);
    clearMutationOperation();
    mode = 'list';
    editingId = '';
    render();
    feedback('Cadastro de cartões atualizado. A confirmação do servidor já foi aplicada; a sincronização completa continua em segundo plano.');
    refreshCardsInBackground();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível salvar o cartão.';
    feedback(message.includes('CARD_STALE_VERSION')
      ? 'Este cartão foi alterado em outro dispositivo. Volte à lista, aguarde a sincronização e abra novamente antes de salvar.'
      : message.includes('OPERATION_ID_REUSED')
        ? 'Os dados mudaram depois de uma tentativa anterior. Revise o cartão e tente novamente.'
        : message, true);
    if (button) { button.disabled = false; button.textContent = mode === 'create' ? 'Cadastrar cartão' : 'Salvar alterações'; }
  }
}

async function deactivateCard() {
  if (!canDeactivate() || !editingId) return;
  const card = currentEditing();
  if (!card) return;
  if (!await megConfirm({
    kicker: 'Cadastro de cartão',
    title: 'Desativar cartão?',
    message: `“${card.name}” deixará de aparecer em novos lançamentos, mas todo o histórico existente será preservado.`,
    confirmLabel: 'Desativar cartão',
    cancelLabel: 'Manter ativo',
    danger: true,
  })) return;
  const button = root()?.querySelector<HTMLButtonElement>('[data-card-manage-deactivate]');
  if (button) { button.disabled = true; button.textContent = 'Desativando…'; }
  feedback('Desativando cartão sem apagar o histórico…');
  try {
    const operationId = mutationOperationId(JSON.stringify({ action: 'deactivate', id: card.id, updatedAt: card.updatedAt || null }));
    const saved = await cardsClient.deactivate(card.id, { operationId, expectedUpdatedAt: card.updatedAt });
    replaceCard(saved);
    clearMutationOperation();
    mode = 'list';
    editingId = '';
    render();
    feedback('Cartão desativado. A alteração confirmada já foi aplicada e o histórico permanece preservado.');
    refreshCardsInBackground();
  } catch (error) {
    feedback(error instanceof Error ? error.message : 'Não foi possível desativar o cartão.', true);
    if (button) { button.disabled = false; button.textContent = 'Desativar cartão'; }
  }
}

async function reactivateCard(id: string) {
  if (!canDeactivate()) return;
  const card = cards.find((candidate) => candidate.id === id && !candidate.isActive);
  if (!card) return;
  if (!await megConfirm({
    kicker: 'Cadastro de cartão',
    title: 'Reativar cartão?',
    message: `“${card.name}” será reativado usando o mesmo cadastro e todo o histórico já existente.`,
    confirmLabel: 'Reativar cartão',
    cancelLabel: 'Cancelar',
  })) return;
  const button = [...(root()?.querySelectorAll<HTMLButtonElement>('[data-card-manage-reactivate]') || [])]
    .find((candidate) => candidate.dataset.cardManageReactivate === id) || null;
  if (button) { button.disabled = true; button.textContent = 'Reativando…'; }
  feedback('Reativando o cartão original e preservando todos os vínculos…');
  try {
    const operationId = mutationOperationId(JSON.stringify({ action: 'reactivate', id: card.id, updatedAt: card.updatedAt || null }));
    const result = await cardsClient.reactivate(id, { operationId, expectedUpdatedAt: card.updatedAt });
    replaceCard(result.card);
    clearMutationOperation();
    mode = 'list';
    editingId = '';
    render();
    feedback(result.reactivated ? `“${result.card.name}” foi reativado com o histórico preservado.` : `“${result.card.name}” já estava ativo; nenhum registro foi duplicado.`);
    refreshCardsInBackground();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível reativar o cartão.';
    feedback(message === 'CARD_NAME_ALREADY_ACTIVE'
      ? 'Não foi possível reativar: já existe outro cartão ativo com o mesmo nome. Ajuste o cartão ativo antes de tentar novamente.'
      : message, true);
    if (button) { button.disabled = false; button.textContent = 'Reativar'; }
  }
}

function bindContent() {
  const drawer = root();
  if (!drawer) return;
  drawer.querySelector('[data-card-manage-new]')?.addEventListener('click', () => { clearMutationOperation(); mode = 'create'; editingId = ''; render(); });
  drawer.querySelectorAll<HTMLElement>('[data-card-manage-edit]').forEach((node) => node.addEventListener('click', () => { clearMutationOperation(); mode = 'edit'; editingId = node.dataset.cardManageEdit || ''; render(); }));
  drawer.querySelectorAll<HTMLButtonElement>('[data-card-manage-reactivate]').forEach((node) => node.addEventListener('click', () => void reactivateCard(node.dataset.cardManageReactivate || '')));
  drawer.querySelectorAll('[data-card-manage-back]').forEach((node) => node.addEventListener('click', () => { clearMutationOperation(); mode = 'list'; editingId = ''; render(); }));
  drawer.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-card-field]').forEach((node) => node.addEventListener('input', updatePreview));
  drawer.querySelector('[data-card-manage-save]')?.addEventListener('click', () => void saveCard());
  drawer.querySelector('[data-card-manage-deactivate]')?.addEventListener('click', () => void deactivateCard());
}

function handleOpen(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('[data-phoenix-card-management]');
  if (!button || button.disabled) return;
  event.preventDefault();
  void openDrawer();
}

function handleExternalOpen() {
  if (!canWrite()) return;
  void openDrawer();
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && root()) closeDrawer();
}

function start() {
  document.addEventListener('click', handleOpen);
  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('meg:open-card-management', handleExternalOpen);
  observer = new MutationObserver(scheduleDecorate);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleDecorate();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardManagementBridge() {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('click', handleOpen);
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('meg:open-card-management', handleExternalOpen);
  closeDrawer();
}
