type CardContinuitySnapshot = {
  month: string;
  cardName: string;
  tabLabel: string;
  search: string;
  pageY: number;
  tableTop: number;
  tableLeft: number;
  capturedAt: number;
};

type InvalidationDetail = {
  path?: string;
  method?: string;
  domain?: string;
};

const STORAGE_KEY = 'meg.phoenix.cards.continuity.v1';
const POLL_MS = 80;
const MIN_REFRESH_WINDOW_MS = 180;
const MAX_WAIT_MS = 6_000;

let observer: MutationObserver | null = null;
let pending: CardContinuitySnapshot | null = null;
let pollTimer: number | null = null;
let restoreTimer: number | null = null;
let mountedRestoreDoneFor = '';

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function monthFromText(value: string) {
  const cleaned = normalize(value).replace(/[.,]/g, ' ');
  const iso = cleaned.match(/(20\d{2})[-/]?(0[1-9]|1[0-2])/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const months: Record<string, string> = {
    jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', março: '03',
    abr: '04', abril: '04', mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07',
    ago: '08', agosto: '08', set: '09', setembro: '09', out: '10', outubro: '10', nov: '11', novembro: '11',
    dez: '12', dezembro: '12'
  };
  const year = cleaned.match(/\b(20\d{2})\b/)?.[1];
  if (!year) return '';
  const token = cleaned.split(/[^a-z0-9çã]+/).find((item) => months[item]);
  return token ? `${year}-${months[token]}` : '';
}

function activeMonth() {
  return monthFromText(document.querySelector<HTMLElement>('.px-period-active')?.textContent || '');
}

function cardsPanel() {
  return document.querySelector<HTMLElement>('.px-card-movement');
}

function selectedCardName() {
  return document.querySelector<HTMLElement>('.px-card-option.active strong')?.textContent?.trim()
    || document.querySelector<HTMLElement>('.px-card-account h2')?.textContent?.trim()
    || '';
}

function activeTabLabel() {
  return document.querySelector<HTMLElement>('.px-card-movement .px-tabbar button.active')?.textContent?.trim() || '';
}

function searchValue() {
  return document.querySelector<HTMLInputElement>('.px-card-movement .px-search-field input')?.value || '';
}

function tableScroll() {
  return document.querySelector<HTMLElement>('.px-card-movement .px-table-scroll');
}

function capture(): CardContinuitySnapshot | null {
  if (!cardsPanel()) return null;
  const table = tableScroll();
  return {
    month: activeMonth(),
    cardName: selectedCardName(),
    tabLabel: activeTabLabel(),
    search: searchValue(),
    pageY: window.scrollY,
    tableTop: table?.scrollTop || 0,
    tableLeft: table?.scrollLeft || 0,
    capturedAt: Date.now()
  };
}

function persist(snapshot: CardContinuitySnapshot) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* sessão opcional */ }
}

function readPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CardContinuitySnapshot;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function nativeSetInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function cardButton(name: string) {
  const wanted = normalize(name);
  if (!wanted) return null;
  return [...document.querySelectorAll<HTMLButtonElement>('.px-card-option')]
    .find((button) => normalize(button.querySelector('strong')?.textContent) === wanted) || null;
}

function tabButton(label: string) {
  const wanted = normalize(label);
  if (!wanted) return null;
  return [...document.querySelectorAll<HTMLButtonElement>('.px-card-movement .px-tabbar button')]
    .find((button) => normalize(button.textContent) === wanted) || null;
}

function setStatus(text: string, done = false) {
  const panel = cardsPanel();
  if (!panel) return;
  let node = panel.querySelector<HTMLElement>('[data-card-continuity-status]');
  if (!node) {
    node = document.createElement('span');
    node.dataset.cardContinuityStatus = 'true';
    node.className = 'px-card-continuity-status';
    panel.querySelector('.px-panel-head')?.append(node);
  }
  node.classList.toggle('is-done', done);
  node.textContent = text;
  panel.classList.toggle('is-card-domain-refreshing', !done);
  if (done) {
    window.setTimeout(() => {
      node?.remove();
      panel.classList.remove('is-card-domain-refreshing');
    }, 850);
  }
}

function restore(snapshot: CardContinuitySnapshot, markDone = false) {
  if (!cardsPanel()) return false;
  if (snapshot.month && activeMonth() && snapshot.month !== activeMonth()) return false;

  const currentCard = selectedCardName();
  if (snapshot.cardName && normalize(currentCard) !== normalize(snapshot.cardName)) {
    cardButton(snapshot.cardName)?.click();
  }

  window.requestAnimationFrame(() => {
    const currentTab = activeTabLabel();
    if (snapshot.tabLabel && normalize(currentTab) !== normalize(snapshot.tabLabel)) {
      tabButton(snapshot.tabLabel)?.click();
    }

    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>('.px-card-movement .px-search-field input');
      if (input && input.value !== snapshot.search) nativeSetInput(input, snapshot.search);
      const table = tableScroll();
      if (table) {
        table.scrollTop = snapshot.tableTop;
        table.scrollLeft = snapshot.tableLeft;
      }
      if (Math.abs(window.scrollY - snapshot.pageY) > 2) window.scrollTo({ top: snapshot.pageY, behavior: 'auto' });
      if (markDone) setStatus('Cartão atualizado sem perder sua posição.', true);
    });
  });
  return true;
}

function syncBusy() {
  const button = document.querySelector<HTMLButtonElement>('.px-sync');
  return Boolean(button && (button.disabled || button.getAttribute('aria-busy') === 'true' || button.classList.contains('is-refreshing')));
}

function stopPolling() {
  if (pollTimer !== null) window.clearTimeout(pollTimer);
  pollTimer = null;
}

function pollRefresh() {
  if (!pending) return;
  const elapsed = Date.now() - pending.capturedAt;
  if ((syncBusy() || elapsed < MIN_REFRESH_WINDOW_MS) && elapsed < MAX_WAIT_MS) {
    pollTimer = window.setTimeout(pollRefresh, POLL_MS);
    return;
  }
  const snapshot = pending;
  pending = null;
  stopPolling();
  restore(snapshot, true);
  persist(snapshot);
}

function onInvalidated(event: Event) {
  const detail = (event as CustomEvent<InvalidationDetail>).detail || {};
  const path = String(detail.path || '');
  if (!path.startsWith('/cards')) return;
  const snapshot = capture();
  if (!snapshot) return;
  pending = snapshot;
  persist(snapshot);
  setStatus('Atualizando cartão…');
  stopPolling();
  pollTimer = window.setTimeout(pollRefresh, 0);
}

function refreshSnapshotFromInteraction() {
  window.setTimeout(() => {
    const snapshot = capture();
    if (!snapshot) return;
    persist(snapshot);
    if (pending) pending = { ...snapshot, capturedAt: pending.capturedAt };
  }, 0);
}

function onClick(event: MouseEvent) {
  if (!event.isTrusted) return;
  const target = event.target as HTMLElement | null;
  if (!target?.closest('.px-card-option, .px-card-movement .px-tabbar button')) return;
  refreshSnapshotFromInteraction();
}

function onInput(event: Event) {
  if (!event.isTrusted) return;
  const target = event.target as HTMLElement | null;
  if (!target?.matches('.px-card-movement .px-search-field input')) return;
  refreshSnapshotFromInteraction();
}

function onScroll(event: Event) {
  const target = event.target as HTMLElement | null;
  if (!target?.matches('.px-card-movement .px-table-scroll')) return;
  const snapshot = capture();
  if (!snapshot) return;
  persist(snapshot);
  if (pending) pending = { ...snapshot, capturedAt: pending.capturedAt };
}

function restoreOnMount() {
  if (!cardsPanel()) {
    mountedRestoreDoneFor = '';
    return;
  }
  if (pending) return;
  const saved = readPersisted();
  if (!saved || (saved.month && activeMonth() && saved.month !== activeMonth())) return;
  const key = `${saved.month}|${saved.cardName}|${saved.tabLabel}`;
  if (mountedRestoreDoneFor === key) return;
  mountedRestoreDoneFor = key;
  restore(saved, false);
}

function scheduleMountedRestore() {
  if (restoreTimer !== null) return;
  restoreTimer = window.setTimeout(() => {
    restoreTimer = null;
    restoreOnMount();
  }, 0);
}

function start() {
  window.addEventListener('meg:data-invalidated', onInvalidated as EventListener);
  document.addEventListener('click', onClick, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('scroll', onScroll, true);
  observer = new MutationObserver(scheduleMountedRestore);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleMountedRestore();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardViewContinuityBridge() {
  stopPolling();
  if (restoreTimer !== null) window.clearTimeout(restoreTimer);
  restoreTimer = null;
  observer?.disconnect();
  observer = null;
  window.removeEventListener('meg:data-invalidated', onInvalidated as EventListener);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('input', onInput, true);
  document.removeEventListener('scroll', onScroll, true);
  document.querySelector('[data-card-continuity-status]')?.remove();
}
