import { authenticatedRequest } from '../app/auth-client';
import { cardsClient, type CardStatementLifecycle } from '../app/cards-client';
import './phoenix-card-statement-history.css';

type HistoryStatus = 'none' | 'open' | 'partial' | 'paid' | 'reopened';
type StatementHistoryItem = {
  month: string;
  status: HistoryStatus;
  statementAmount: number;
  openAmount: number;
  paidAmount: number;
  openInstallments: number;
  paidInstallments: number;
  totalInstallments: number;
  closingDate: string;
  dueDate: string;
  paymentCount: number;
  reopenCount: number;
  lastPaidAt: string | null;
  lastLifecycleAt: string | null;
  source: 'audit' | 'installments' | 'none';
  deltaAmount: number;
  deltaPercent: number | null;
};

type StatementHistory = {
  cardId: string;
  cardName: string;
  through: string;
  from: string;
  months: number;
  items: StatementHistoryItem[];
  summary: {
    monthsWithStatement: number;
    totalStatement: number;
    totalPaid: number;
    totalOpen: number;
    averageStatement: number;
    highestStatement: { month: string; amount: number } | null;
    totalReopens: number;
    totalPayments: number;
    statusCounts: Record<string, number>;
  };
};

const HISTORY_MONTHS = 12;
let observer: MutationObserver | null = null;
let timer: number | null = null;
let serial = 0;
let loadedKey = '';
let loadingKey = '';
let selectedCardId = '';
let anchorMonth = '';
let throughMonth = '';
let selectedMonth = '';
let currentHistory: StatementHistory | null = null;
let currentDetail: CardStatementLifecycle | null = null;
const cache = new Map<string, StatementHistory>();
const detailCache = new Map<string, CardStatementLifecycle>();

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
  const label = document.querySelector<HTMLElement>('.px-period-active')?.textContent || '';
  const normalized = normalize(label).replace(/[.,]/g, ' ');
  const iso = normalized.match(/(20\d{2})[-/]?(0[1-9]|1[0-2])/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const monthNames: Record<string, string> = {
    jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', março: '03',
    abr: '04', abril: '04', mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07',
    ago: '08', agosto: '08', set: '09', setembro: '09', out: '10', outubro: '10', nov: '11', novembro: '11',
    dez: '12', dezembro: '12'
  };
  const year = normalized.match(/\b(20\d{2})\b/)?.[1];
  const token = normalized.split(/[^a-z0-9çã]+/).find((item) => monthNames[item]);
  if (year && token) return `${year}-${monthNames[token]}`;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function selectedCardName() {
  return document.querySelector<HTMLElement>('.px-card-account h2')?.textContent?.trim() || '';
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(parsed) ? parsed : 0);
}

function brDate(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(parsed);
}

function monthLabel(month: string, long = false) {
  const parsed = new Date(`${month}-01T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return month;
  const label = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', month: long ? 'long' : 'short', year: 'numeric'
  }).format(parsed);
  return long ? label.replace(/^./, (letter) => letter.toUpperCase()) : label.replace('.', '').replace(' de ', '/');
}

function statusMeta(status: HistoryStatus) {
  return ({
    none: { label: 'SEM FATURA', className: 'none' },
    open: { label: 'EM ABERTO', className: 'open' },
    partial: { label: 'PARCIAL', className: 'partial' },
    paid: { label: 'PAGA', className: 'paid' },
    reopened: { label: 'REABERTA', className: 'reopened' },
  } as const)[status];
}

function deltaHtml(item: StatementHistoryItem) {
  if (!item.deltaAmount) return '<span class="px-card-history-delta neutral">Estável</span>';
  const sign = item.deltaAmount > 0 ? '+' : '−';
  const absolute = money(Math.abs(item.deltaAmount));
  const percent = item.deltaPercent === null ? '' : ` · ${Math.abs(item.deltaPercent).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return `<span class="px-card-history-delta ${item.deltaAmount > 0 ? 'up' : 'down'}">${sign}${escapeHtml(absolute)}${escapeHtml(percent)}</span>`;
}

function summaryHtml(history: StatementHistory) {
  const highest = history.summary.highestStatement;
  return `<div class="px-card-history-summary">
    <div><span>Média da fatura</span><strong>${escapeHtml(money(history.summary.averageStatement))}</strong><small>${history.summary.monthsWithStatement} mês(es) com movimento</small></div>
    <div><span>Maior fatura</span><strong>${escapeHtml(highest ? money(highest.amount) : '—')}</strong><small>${highest ? escapeHtml(monthLabel(highest.month, true)) : 'Sem movimento no período'}</small></div>
    <div><span>Saldo em aberto</span><strong>${escapeHtml(money(history.summary.totalOpen))}</strong><small>${history.summary.totalPayments} pagamento(s) no recorte</small></div>
    <div><span>Reaberturas</span><strong>${history.summary.totalReopens}</strong><small>Estornos auditados no recorte</small></div>
  </div>`;
}

function monthCardsHtml(history: StatementHistory) {
  const max = Math.max(1, ...history.items.map((item) => item.statementAmount));
  return `<div class="px-card-history-months">${history.items.slice().reverse().map((item) => {
    const status = statusMeta(item.status);
    const width = Math.max(item.statementAmount > 0 ? 4 : 0, Math.min(100, (item.statementAmount / max) * 100));
    return `<button type="button" class="px-card-history-month ${item.month === selectedMonth ? 'selected' : ''}" data-card-history-month="${escapeHtml(item.month)}">
      <div class="px-card-history-month-head"><strong>${escapeHtml(monthLabel(item.month))}</strong><span class="px-card-history-status ${status.className}">${status.label}</span></div>
      <div class="px-card-history-value"><span>Fatura</span><strong>${escapeHtml(money(item.statementAmount))}</strong></div>
      <div class="px-card-history-bar"><i style="width:${width.toFixed(1)}%"></i></div>
      <div class="px-card-history-stats"><span>Pago <b>${escapeHtml(money(item.paidAmount))}</b></span><span>Aberto <b>${escapeHtml(money(item.openAmount))}</b></span></div>
      <div class="px-card-history-foot"><span>Vence ${escapeHtml(brDate(item.dueDate))}</span><span>${item.reopenCount ? `${item.reopenCount} reabertura(s)` : 'Sem reabertura'}</span></div>
      ${deltaHtml(item)}
    </button>`;
  }).join('')}</div>`;
}

function detailHtml(detail: CardStatementLifecycle | null) {
  if (!detail) return '<div class="px-card-history-detail-empty">Selecione um mês para ver o ciclo sem alterar o período geral do sistema.</div>';
  const status = statusMeta(detail.status);
  const auditRows = (detail.timeline || []).filter((item) => item.kind === 'payment' || item.kind === 'reopen' || item.kind === 'legacy-payment');
  return `<div class="px-card-history-detail">
    <div class="px-card-history-detail-head"><div><span>Mês selecionado</span><strong>${escapeHtml(monthLabel(detail.month, true))}</strong></div><span class="px-card-history-status ${status.className}">${status.label}</span></div>
    <div class="px-card-history-detail-numbers"><div><span>Fatura</span><strong>${escapeHtml(money(detail.statementAmount))}</strong></div><div><span>Pago</span><strong>${escapeHtml(money(detail.paidAmount))}</strong></div><div><span>Em aberto</span><strong>${escapeHtml(money(detail.openAmount))}</strong></div><div><span>Vencimento</span><strong>${escapeHtml(brDate(detail.dueDate))}</strong></div></div>
    <div class="px-card-history-detail-events">${auditRows.length ? auditRows.map((item) => `<div><span>${item.kind === 'reopen' ? 'Reabertura / estorno' : item.kind === 'legacy-payment' ? 'Pagamento legado' : 'Pagamento'}</span><strong>${escapeHtml(item.amount === null ? '—' : money(item.amount))}</strong><small>${escapeHtml(brDate(item.effectiveAt || item.at))}${item.actor?.name ? ` · ${escapeHtml(item.actor.name)}` : ''}</small></div>`).join('') : '<div><span>Movimentação</span><strong>Sem baixa registrada</strong><small>O mês permanece apenas com o ciclo calculado do cartão.</small></div>'}</div>
    <small class="px-card-history-detail-note">Esta consulta é independente do filtro geral. O período principal da tela não foi alterado.</small>
  </div>`;
}

function panelHtml(history: StatementHistory) {
  const canNext = throughMonth < anchorMonth;
  return `<section class="px-card-statement-history" data-card-statement-history>
    <div class="px-card-history-head">
      <div><span>Histórico de faturas</span><strong>${escapeHtml(history.cardName)}</strong><small>Compare mês a mês sem trocar o período geral do sistema.</small></div>
      <div class="px-card-history-nav"><button type="button" data-card-history-prev aria-label="Voltar um mês">‹</button><span>${escapeHtml(monthLabel(history.from))} — ${escapeHtml(monthLabel(history.through))}</span><button type="button" data-card-history-next aria-label="Avançar um mês" ${canNext ? '' : 'disabled'}>›</button><button type="button" class="px-secondary-action" data-card-history-reset ${throughMonth === anchorMonth ? 'disabled' : ''}>Período atual</button></div>
    </div>
    ${summaryHtml(history)}
    ${monthCardsHtml(history)}
    <div data-card-history-detail>${detailHtml(currentDetail)}</div>
  </section>`;
}

function panelHost() {
  return document.querySelector<HTMLElement>('.px-card-hero');
}

function removePanel() {
  document.querySelector('[data-card-statement-history]')?.remove();
}

function render(history: StatementHistory) {
  const host = panelHost();
  if (!host) return;
  removePanel();
  const lifecyclePanel = host.querySelector<HTMLElement>('[data-card-statement-lifecycle]');
  if (lifecyclePanel) lifecyclePanel.insertAdjacentHTML('afterend', panelHtml(history));
  else host.insertAdjacentHTML('beforeend', panelHtml(history));
  bindPanel();
}

function renderDetail() {
  const host = document.querySelector<HTMLElement>('[data-card-history-detail]');
  if (host) host.innerHTML = detailHtml(currentDetail);
  document.querySelectorAll<HTMLElement>('[data-card-history-month]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.cardHistoryMonth === selectedMonth);
  });
}

async function loadDetail(month: string) {
  if (!selectedCardId) return;
  selectedMonth = month;
  currentDetail = null;
  renderDetail();
  const key = `${selectedCardId}|${month}`;
  const cached = detailCache.get(key);
  if (cached) {
    currentDetail = cached;
    renderDetail();
    return;
  }
  try {
    const detail = await cardsClient.statementLifecycle(selectedCardId, month);
    if (selectedMonth !== month || !document.querySelector('[data-card-statement-history]')) return;
    detailCache.set(key, detail);
    currentDetail = detail;
    renderDetail();
  } catch {
    currentDetail = null;
    renderDetail();
  }
}

function bindPanel() {
  const panel = document.querySelector<HTMLElement>('[data-card-statement-history]');
  if (!panel) return;
  panel.querySelector<HTMLButtonElement>('[data-card-history-prev]')?.addEventListener('click', () => {
    throughMonth = addMonths(throughMonth, -1);
    selectedMonth = '';
    currentDetail = null;
    void loadHistory(true);
  });
  panel.querySelector<HTMLButtonElement>('[data-card-history-next]')?.addEventListener('click', () => {
    if (throughMonth >= anchorMonth) return;
    throughMonth = addMonths(throughMonth, 1);
    selectedMonth = '';
    currentDetail = null;
    void loadHistory(true);
  });
  panel.querySelector<HTMLButtonElement>('[data-card-history-reset]')?.addEventListener('click', () => {
    throughMonth = anchorMonth;
    selectedMonth = '';
    currentDetail = null;
    void loadHistory(true);
  });
  panel.querySelectorAll<HTMLButtonElement>('[data-card-history-month]').forEach((button) => {
    button.addEventListener('click', () => {
      const month = button.dataset.cardHistoryMonth;
      if (month) void loadDetail(month);
    });
  });
}

async function resolveCardId(name: string, month: string) {
  const cards = await cardsClient.list(month);
  return cards.find((card) => normalize(card.name) === normalize(name))?.id || '';
}

async function loadHistory(force = false) {
  const name = selectedCardName();
  const month = activeMonth();
  const host = panelHost();
  if (!name || !host) {
    loadedKey = '';
    selectedCardId = '';
    currentHistory = null;
    removePanel();
    return;
  }

  const cardChanged = Boolean(loadedKey) && loadedKey.split('|')[0] !== normalize(name);
  if (!anchorMonth || cardChanged) {
    selectedCardId = '';
    anchorMonth = month;
    throughMonth = month;
    selectedMonth = '';
    currentDetail = null;
  } else if (anchorMonth !== month) {
    const wasAtAnchor = throughMonth === anchorMonth;
    anchorMonth = month;
    if (wasAtAnchor) throughMonth = month;
  }
  if (!throughMonth) throughMonth = month;

  const key = `${normalize(name)}|${throughMonth}`;
  if (!force && loadedKey === key && currentHistory) {
    if (!document.querySelector('[data-card-statement-history]')) render(currentHistory);
    return;
  }
  if (!force && loadingKey === key) return;

  loadingKey = key;
  const request = ++serial;
  try {
    const cardId = selectedCardId || await resolveCardId(name, month);
    if (!cardId || request !== serial) return;
    selectedCardId = cardId;
    const cacheKey = `${cardId}|${throughMonth}`;
    const cached = !force ? cache.get(cacheKey) : null;
    const history = cached || await authenticatedRequest<StatementHistory>(`/cards/${encodeURIComponent(cardId)}/statements/history?through=${encodeURIComponent(throughMonth)}&months=${HISTORY_MONTHS}`);
    if (request !== serial || selectedCardName() !== name) return;
    cache.set(cacheKey, history);
    currentHistory = history;
    loadedKey = key;
    if (!selectedMonth || !history.items.some((item) => item.month === selectedMonth)) {
      selectedMonth = [...history.items].reverse().find((item) => item.statementAmount > 0)?.month || history.through;
      currentDetail = null;
    }
    render(history);
    void loadDetail(selectedMonth);
  } catch {
    // O histórico é um enriquecimento; a tela principal de cartões permanece utilizável.
  } finally {
    if (loadingKey === key) loadingKey = '';
  }
}

function schedule(force = false) {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void loadHistory(force);
  }, 90);
}

function invalidate() {
  cache.clear();
  detailCache.clear();
  loadedKey = '';
  selectedCardId = '';
  currentHistory = null;
  currentDetail = null;
  schedule(true);
}

function boot() {
  if (observer) return;
  observer = new MutationObserver(() => schedule(false));
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('meg:data-invalidated', invalidate as EventListener);
  schedule(false);
}

boot();
