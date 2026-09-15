type CardInvalidationDetail = {
  path?: string;
  method?: string;
  domain?: string;
  source?: string;
};

type RequestMeta = {
  path: string;
  method: string;
};

const CARD_PATH_PREFIX = '/cards';
const DUPLICATE_EVENT_WINDOW_MS = 700;
const PROGRAMMATIC_SYNC_GUARD_MS = 1_500;
const RETRY_DELAY_MS = 120;
const MAX_RETRIES = 30;

let refreshTimer: number | null = null;
let pendingRefresh = false;
let dispatchingAutoSync = false;
let lastAutoSyncAt = 0;
let lastInvalidationKey = '';
let lastInvalidationAt = 0;
let originalFetch: typeof window.fetch | null = null;

function requestMeta(input: RequestInfo | URL, init?: RequestInit): RequestMeta {
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const rawUrl = input instanceof Request ? input.url : input instanceof URL ? input.toString() : String(input);
  try {
    const url = new URL(rawUrl, window.location.origin);
    return { path: url.pathname, method };
  } catch {
    return { path: rawUrl.split('?')[0] || '', method };
  }
}

function isCardMutation(meta: RequestMeta) {
  return meta.path.startsWith(CARD_PATH_PREFIX) && !['GET', 'HEAD', 'OPTIONS'].includes(meta.method);
}

function emitInvalidation(meta: RequestMeta) {
  window.dispatchEvent(new CustomEvent<CardInvalidationDetail>('meg:data-invalidated', {
    detail: {
      path: meta.path,
      method: meta.method,
      domain: 'cards',
      source: 'card-domain-live-refresh',
    },
  }));
}

function syncButton() {
  return document.querySelector<HTMLButtonElement>('.px-sync');
}

function buttonBusy(button: HTMLButtonElement) {
  return button.disabled || button.getAttribute('aria-busy') === 'true' || button.classList.contains('is-refreshing');
}

function finishPendingRefresh() {
  pendingRefresh = false;
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function runRefresh(attempt = 0) {
  refreshTimer = null;
  if (!pendingRefresh) return;

  const button = syncButton();
  if (!button) {
    if (attempt >= MAX_RETRIES) {
      finishPendingRefresh();
      return;
    }
    refreshTimer = window.setTimeout(() => runRefresh(attempt + 1), RETRY_DELAY_MS);
    return;
  }

  if (buttonBusy(button)) {
    // Se outra leitura já está em andamento, aguardamos o término e executamos uma
    // leitura final. Assim uma mutação confirmada nunca fica escondida por uma
    // fotografia que começou antes dela.
    if (attempt >= MAX_RETRIES) {
      finishPendingRefresh();
      return;
    }
    refreshTimer = window.setTimeout(() => runRefresh(attempt + 1), RETRY_DELAY_MS);
    return;
  }

  pendingRefresh = false;
  dispatchingAutoSync = true;
  lastAutoSyncAt = Date.now();
  try {
    button.click();
  } finally {
    dispatchingAutoSync = false;
  }
}

function scheduleRefresh() {
  pendingRefresh = true;
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => runRefresh(0), 0);
}

function onInvalidated(event: Event) {
  const detail = (event as CustomEvent<CardInvalidationDetail>).detail || {};
  const meta = {
    path: String(detail.path || ''),
    method: String(detail.method || '').toUpperCase(),
  };
  if (!meta.path.startsWith(CARD_PATH_PREFIX)) return;

  const now = Date.now();
  const key = `${meta.method}:${meta.path}`;
  if (key === lastInvalidationKey && now - lastInvalidationAt <= DUPLICATE_EVENT_WINDOW_MS) return;
  lastInvalidationKey = key;
  lastInvalidationAt = now;
  scheduleRefresh();
}

function blockDuplicateProgrammaticSync(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('.px-sync');
  if (!button || event.isTrusted || dispatchingAutoSync) return;
  if (Date.now() - lastAutoSyncAt > PROGRAMMATIC_SYNC_GUARD_MS) return;

  // Writers antigos ainda possuem uma chamada de compatibilidade ao botão de
  // sincronização. Depois que o bridge central iniciou a leitura, bloqueamos
  // apenas esses cliques programáticos repetidos; cliques reais do usuário
  // continuam livres.
  event.preventDefault();
  event.stopImmediatePropagation();
}

function installFetchObserver() {
  if (originalFetch) return;
  originalFetch = window.fetch.bind(window);
  const observedFetch: typeof window.fetch = async (input, init) => {
    const meta = requestMeta(input, init);
    const response = await originalFetch!(input, init);
    if (response.ok && isCardMutation(meta)) {
      // O evento é emitido somente após confirmação HTTP. Portanto os totais de
      // cartão nunca avançam antes do servidor confirmar a mutação.
      window.queueMicrotask(() => emitInvalidation(meta));
    }
    return response;
  };
  window.fetch = observedFetch;
}

function start() {
  installFetchObserver();
  window.addEventListener('meg:data-invalidated', onInvalidated as EventListener);
  document.addEventListener('click', blockDuplicateProgrammaticSync, true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export function stopPhoenixCardDomainLiveRefreshBridge() {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = null;
  pendingRefresh = false;
  window.removeEventListener('meg:data-invalidated', onInvalidated as EventListener);
  document.removeEventListener('click', blockDuplicateProgrammaticSync, true);
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
  }
}
