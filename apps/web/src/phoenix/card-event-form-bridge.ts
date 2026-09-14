import { cardsClient, type CardPurchase, type CreditCard } from '../app/cards-client';

type CardBridgeMode = 'idle' | 'reviewed' | 'saving' | 'error' | 'confirmed';

type CardDraft = {
  cardId: string;
  categoryId?: string;
  description: string;
  totalAmount: number;
  purchaseDate: string;
  installments: number;
};

type CardBridgeState = {
  mode: CardBridgeMode;
  fingerprint: string;
  operationId?: string;
  knownMatchingIds: string[];
};

const state: CardBridgeState = {
  mode: 'idle',
  fingerprint: '',
  knownMatchingIds: [],
};

let observer: MutationObserver | null = null;
let currentDrawer: HTMLElement | null = null;
let syncTimer: number | null = null;

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

function activeType(root: ParentNode) {
  const label = normalize(root.querySelector('.px-segment button.active')?.textContent || 'DESPESA');
  if (label === 'RECEITA') return 'income';
  if (label.includes('TRANSFER')) return 'transfer';
  return 'expense';
}

function modality(root: ParentNode) {
  return normalize(root.querySelector<HTMLSelectElement>('[data-phoenix-modality-select]')?.value || '');
}

function isCreditLaunch(root: HTMLElement) {
  return activeType(root) === 'expense' && modality(root) === 'CREDITO';
}

function fieldByLabel(root: ParentNode, startsWith: string) {
  const target = normalize(startsWith);
  return [...root.querySelectorAll<HTMLLabelElement>('label.px-field')]
    .find((label) => normalize(label.querySelector('span')?.textContent || '').startsWith(target)) || null;
}

function inputByLabel(root: ParentNode, startsWith: string) {
  return fieldByLabel(root, startsWith)?.querySelector<HTMLInputElement>('input') || null;
}

function selectByLabel(root: ParentNode, startsWith: string) {
  return fieldByLabel(root, startsWith)?.querySelector<HTMLSelectElement>('select') || null;
}

function parseMoney(value: string) {
  const normalized = String(value || '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function installments(root: HTMLElement) {
  const input = inputByLabel(root, 'Quantidade de parcelas');
  return Math.max(1, Math.min(48, Number(input?.value || 1) || 1));
}

function selectedCardId(root: HTMLElement) {
  return root.querySelector<HTMLSelectElement>('.px-card-box select')?.value
    || root.querySelector<HTMLSelectElement>('[data-phoenix-modality-next] select')?.value
    || '';
}

function draftFromDrawer(root: HTMLElement): CardDraft | null {
  if (!isCreditLaunch(root)) return null;
  const description = inputByLabel(root, 'Descrição')?.value.trim() || '';
  const purchaseDate = inputByLabel(root, 'Data do evento')?.value || '';
  const totalAmount = parseMoney(root.querySelector<HTMLInputElement>('.px-money-mask')?.value || '');
  const cardId = selectedCardId(root);
  const categoryId = selectByLabel(root, 'Grupo')?.value || undefined;
  const quantity = installments(root);

  if (!description || !purchaseDate || !totalAmount || !cardId || !categoryId || !quantity) return null;
  return { cardId, categoryId, description, totalAmount, purchaseDate, installments: quantity };
}

function fingerprint(draft: CardDraft) {
  return JSON.stringify({
    cardId: draft.cardId,
    categoryId: draft.categoryId || '',
    description: normalize(draft.description),
    totalCents: Math.round(draft.totalAmount * 100),
    purchaseDate: draft.purchaseDate.slice(0, 10),
    installments: draft.installments,
  });
}

function operationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `phoenix-card-purchase:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function feedback(root: HTMLElement) {
  let node = root.querySelector<HTMLElement>('[data-phoenix-card-writer-feedback]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.phoenixCardWriterFeedback = 'true';
    node.className = 'px-notice';
    root.querySelector('.px-review-launch')?.insertAdjacentElement('beforebegin', node);
  }
  return node;
}

function setFeedback(root: HTMLElement, text: string, kind: 'ok' | 'warn' | 'plain' = 'plain') {
  const node = feedback(root);
  node.textContent = text;
  node.className = `px-notice${kind === 'plain' ? '' : ` ${kind}`}`;
}

function clearFeedback(root: HTMLElement) {
  root.querySelector('[data-phoenix-card-writer-feedback]')?.remove();
}

function resetState() {
  state.mode = 'idle';
  state.fingerprint = '';
  state.operationId = undefined;
  state.knownMatchingIds = [];
}

function matchingPurchases(cards: CreditCard[], draft: CardDraft) {
  const card = cards.find((item) => item.id === draft.cardId);
  if (!card) return [];
  const targetDescription = normalize(draft.description);
  const targetCents = Math.round(draft.totalAmount * 100);
  const targetDate = draft.purchaseDate.slice(0, 10);
  return card.purchases.filter((purchase) => {
    const purchaseCents = Math.round(Number(purchase.totalAmount || 0) * 100);
    const purchaseDate = String(purchase.purchaseDate || '').slice(0, 10);
    return normalize(purchase.description) === targetDescription
      && purchaseCents === targetCents
      && purchaseDate === targetDate
      && Number(purchase.installments || 1) === draft.installments;
  });
}

async function readMatchingPurchases(draft: CardDraft) {
  const cards = await cardsClient.list(draft.purchaseDate.slice(0, 7));
  return matchingPurchases(cards, draft);
}

function markConfirmed(root: HTMLElement, purchase?: CardPurchase) {
  state.mode = 'confirmed';
  const suffix = purchase?.id ? ` Compra ${purchase.id.slice(0, 8)} confirmada.` : '';
  setFeedback(root, `Compra no cartão confirmada no domínio de faturas.${suffix} O caixa monetário não foi movimentado neste lançamento.`, 'ok');
  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (button) {
    button.disabled = true;
    button.textContent = 'Salvo · atualizando…';
  }
  window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path: '/cards/purchases', method: 'POST' } }));
  window.setTimeout(() => document.querySelector<HTMLButtonElement>('.px-sync:not(:disabled)')?.click(), 120);
}

async function submit(root: HTMLElement, draft: CardDraft) {
  if (state.mode === 'saving' || state.mode === 'confirmed') return;
  const nextFingerprint = fingerprint(draft);
  if (state.fingerprint !== nextFingerprint) {
    state.fingerprint = nextFingerprint;
    state.operationId = operationId();
    state.knownMatchingIds = [];
  }

  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  try {
    state.mode = 'saving';
    if (button) {
      button.disabled = true;
      button.textContent = 'Salvando compra no cartão…';
    }
    setFeedback(root, 'Gravando a compra no cartão e aguardando confirmação do servidor.', 'ok');

    const before = await readMatchingPurchases(draft);
    if (!state.knownMatchingIds.length) state.knownMatchingIds = before.map((item) => item.id);
    else {
      const newlyConfirmed = before.find((item) => !state.knownMatchingIds.includes(item.id));
      if (newlyConfirmed) {
        markConfirmed(root, newlyConfirmed);
        return;
      }
    }

    if (before.length && state.knownMatchingIds.length === before.length) {
      const accepted = window.confirm('Já existe uma compra com a mesma descrição, valor, cartão, data e quantidade de parcelas. Deseja registrar outra mesmo assim?');
      if (!accepted) {
        state.mode = 'reviewed';
        if (button) {
          button.disabled = false;
          button.textContent = 'Salvar compra no cartão';
        }
        setFeedback(root, 'Gravação cancelada para evitar possível duplicidade. O formulário foi mantido.', 'warn');
        return;
      }
    }

    const purchase = await cardsClient.createPurchase({
      ...draft,
      operationId: state.operationId,
    });
    markConfirmed(root, purchase);
  } catch (error) {
    state.mode = 'error';
    if (button) {
      button.disabled = false;
      button.textContent = 'Tentar salvar compra no cartão';
    }
    setFeedback(
      root,
      error instanceof Error
        ? `${error.message} Os dados foram mantidos; uma nova tentativa verificará primeiro se o servidor já confirmou a compra.`
        : 'Não foi possível confirmar a compra. Os dados foram mantidos; uma nova tentativa verificará primeiro se o servidor já confirmou a compra.',
      'warn',
    );
  }
}

function review(root: HTMLElement) {
  const draft = draftFromDrawer(root);
  if (!draft) {
    setFeedback(root, 'Preencha descrição, classificação/grupo, data, valor e cartão antes de revisar a compra.', 'warn');
    return;
  }
  const nextFingerprint = fingerprint(draft);
  if (state.fingerprint !== nextFingerprint) {
    state.fingerprint = nextFingerprint;
    state.operationId = operationId();
    state.knownMatchingIds = [];
  }
  state.mode = 'reviewed';
  setFeedback(root, 'Paridade do formulário validada para compra no cartão. A próxima confirmação gravará no domínio de cartões/faturas, sem movimentar o caixa monetário.', 'ok');
  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (button) button.textContent = 'Salvar compra no cartão';
}

function syncButton() {
  const root = drawer();
  if (!root) {
    currentDrawer = null;
    resetState();
    return;
  }
  if (root !== currentDrawer) {
    currentDrawer = root;
    resetState();
  }
  if (!isCreditLaunch(root) || root.dataset.phoenixEditingEventId) return;
  const button = root.querySelector<HTMLButtonElement>('.px-review-launch');
  if (!button) return;
  if (state.mode === 'reviewed') button.textContent = 'Salvar compra no cartão';
  if (state.mode === 'error') button.textContent = 'Tentar salvar compra no cartão';
  if (state.mode === 'saving') {
    button.disabled = true;
    button.textContent = 'Salvando compra no cartão…';
  }
}

function scheduleSync() {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    syncButton();
  }, 25);
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('.px-review-launch');
  if (!button) return;
  const root = button.closest<HTMLElement>('.px-launch-drawer');
  if (!root || !isCreditLaunch(root) || root.dataset.phoenixEditingEventId) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const draft = draftFromDrawer(root);
  if (!draft) {
    review(root);
    return;
  }
  const nextFingerprint = fingerprint(draft);
  if (state.fingerprint && state.fingerprint !== nextFingerprint) {
    resetState();
    clearFeedback(root);
  }

  if (state.mode === 'reviewed' || state.mode === 'error') {
    void submit(root, draft);
    return;
  }
  review(root);
}

function onInput(event: Event) {
  const target = event.target as HTMLElement | null;
  const root = target?.closest<HTMLElement>('.px-launch-drawer');
  if (!root || !isCreditLaunch(root) || state.mode === 'saving' || state.mode === 'confirmed') return;
  const draft = draftFromDrawer(root);
  const next = draft ? fingerprint(draft) : '';
  if (state.fingerprint && state.fingerprint !== next) {
    resetState();
    clearFeedback(root);
  }
  scheduleSync();
}

function start() {
  document.addEventListener('click', onClick, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('change', onInput, true);
  observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardEventFormBridge() {
  observer?.disconnect();
  observer = null;
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('input', onInput, true);
  document.removeEventListener('change', onInput, true);
}
