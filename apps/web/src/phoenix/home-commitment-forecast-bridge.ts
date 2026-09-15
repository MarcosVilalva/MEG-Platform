import { authenticatedRequest } from '../app/auth-client';
import './phoenix-home-commitment-forecast.css';

type ForecastRisk = 'normal' | 'attention' | 'high';
type CardBreakdown = { cardId: string; name: string; amount: number; installments: number };
type ForecastMonth = {
  month: string;
  cardCommitments: number;
  payables: number;
  recurringProjected: number;
  plannedExpenses: number;
  receivables: number;
  plannedIncome: number;
  totalExpenses: number;
  totalIncome: number;
  net: number;
  projectedBalance: number;
  commitmentPercent: number | null;
  risk: ForecastRisk;
  cardInstallments: number;
  payableCount: number;
  recurringCount: number;
  plannedExpenseCount: number;
  receivableCount: number;
  plannedIncomeCount: number;
  cards: CardBreakdown[];
};

type CommitmentForecast = {
  from: string;
  through: string;
  months: number;
  generatedAt: string;
  currentBalance: number;
  items: ForecastMonth[];
  summary: {
    totalExpenses: number;
    totalIncome: number;
    netForecast: number;
    projectedClosing: number;
    minimumProjectedBalance: number;
    minimumProjectedMonth: string | null;
    firstNegativeMonth: string | null;
    monthsAtRisk: number;
    overdueOutflow: number;
    overdueIncome: number;
    cardCommitments: number;
    payables: number;
    recurringProjected: number;
    plannedExpenses: number;
    receivables: number;
    plannedIncome: number;
    unallocatedLegacyCardCommitment: number;
    unallocatedLegacyCardCount: number;
    topCards: CardBreakdown[];
  };
  methodology: Record<string, string>;
};

const HORIZON_MONTHS = 12;
let observer: MutationObserver | null = null;
let timer: number | null = null;
let requestSerial = 0;
let loadedKey = '';
let loadingKey = '';
let selectedMonth = '';
let currentForecast: CommitmentForecast | null = null;
const cache = new Map<string, CommitmentForecast>();

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

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(parsed) ? parsed : 0);
}

function monthLabel(month: string, long = false) {
  const parsed = new Date(`${month}-01T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return month;
  const label = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', month: long ? 'long' : 'short', year: 'numeric'
  }).format(parsed);
  return long ? label.replace(/^./, (letter) => letter.toUpperCase()) : label.replace('.', '').replace(' de ', '/');
}

function activeMonth() {
  const label = document.querySelector<HTMLElement>('.px-period-active')?.textContent || '';
  const cleaned = normalize(label).replace(/[.,]/g, ' ');
  const iso = cleaned.match(/(20\d{2})[-/]?(0[1-9]|1[0-2])/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const monthNames: Record<string, string> = {
    jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', março: '03',
    abr: '04', abril: '04', mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07',
    ago: '08', agosto: '08', set: '09', setembro: '09', out: '10', outubro: '10', nov: '11', novembro: '11',
    dez: '12', dezembro: '12'
  };
  const year = cleaned.match(/\b(20\d{2})\b/)?.[1];
  const token = cleaned.split(/[^a-z0-9çã]+/).find((item) => monthNames[item]);
  if (year && token) return `${year}-${monthNames[token]}`;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isHomeDashboard() {
  return Boolean(document.querySelector('.px-home-balance-grid') && document.querySelector('.px-home-action-grid'));
}

function removePanel() {
  document.querySelector('[data-home-commitment-forecast]')?.remove();
}

function riskMeta(risk: ForecastRisk) {
  return ({
    normal: { label: 'CONFORTÁVEL', className: 'normal' },
    attention: { label: 'ATENÇÃO', className: 'attention' },
    high: { label: 'CRÍTICO', className: 'high' },
  } as const)[risk];
}

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}

function summaryHtml(forecast: CommitmentForecast) {
  const summary = forecast.summary;
  return `<div class="px-home-forecast-summary">
    <div><span>Saldo monetário hoje</span><strong>${escapeHtml(money(forecast.currentBalance))}</strong><small>Base realizada do radar</small></div>
    <div><span>Receitas previstas</span><strong>${escapeHtml(money(summary.totalIncome))}</strong><small>Contas a receber + receitas planejadas</small></div>
    <div><span>Compromissos contratados</span><strong>${escapeHtml(money(summary.totalExpenses))}</strong><small>Cartões + contas + despesas previstas</small></div>
    <div><span>Saldo ao fim de 12 meses</span><strong class="${summary.projectedClosing < 0 ? 'negative' : ''}">${escapeHtml(money(summary.projectedClosing))}</strong><small>${summary.firstNegativeMonth ? `Primeiro mês negativo: ${escapeHtml(monthLabel(summary.firstNegativeMonth))}` : 'Sem cruzamento negativo no horizonte'}</small></div>
    <div><span>Menor saldo projetado</span><strong class="${summary.minimumProjectedBalance < 0 ? 'negative' : ''}">${escapeHtml(money(summary.minimumProjectedBalance))}</strong><small>${summary.minimumProjectedMonth ? escapeHtml(monthLabel(summary.minimumProjectedMonth, true)) : 'Saldo atual é a menor referência'}</small></div>
    <div><span>Meses sob atenção</span><strong>${summary.monthsAtRisk}</strong><small>De ${forecast.months} competências analisadas</small></div>
  </div>`;
}

function alertHtml(forecast: CommitmentForecast) {
  const summary = forecast.summary;
  const notes: string[] = [];
  if (summary.overdueOutflow > 0) notes.push(`${money(summary.overdueOutflow)} vencidos em aberto foram carregados para o primeiro mês`);
  if (summary.overdueIncome > 0) notes.push(`${money(summary.overdueIncome)} de recebimentos vencidos foram carregados como entrada esperada`);
  if (summary.unallocatedLegacyCardCommitment > 0) notes.push(`${money(summary.unallocatedLegacyCardCommitment)} de cartão legado ficou fora dos meses por não possuir calendário confiável`);
  if (!notes.length && !summary.firstNegativeMonth) {
    return '<div class="px-home-forecast-insight ok"><strong>O horizonte cadastrado não cruza saldo negativo.</strong><span>O radar considera apenas compromissos e receitas que já existem na base; não inventa compras nem renda futura.</span></div>';
  }
  return `<div class="px-home-forecast-insight ${summary.firstNegativeMonth ? 'high' : 'attention'}"><strong>${summary.firstNegativeMonth ? `A projeção cruza abaixo de zero em ${escapeHtml(monthLabel(summary.firstNegativeMonth, true))}.` : 'Há pontos que exigem leitura antes de usar a projeção como caixa livre.'}</strong><span>${escapeHtml(notes.join(' · ') || 'Revise as competências marcadas em atenção ou crítico.')}</span></div>`;
}

function monthRowsHtml(forecast: CommitmentForecast) {
  const maxExpense = Math.max(1, ...forecast.items.map((item) => item.totalExpenses));
  return `<div class="px-home-forecast-months">${forecast.items.map((item) => {
    const risk = riskMeta(item.risk);
    const cardsWidth = (item.cardCommitments / maxExpense) * 100;
    const payablesWidth = (item.payables / maxExpense) * 100;
    const recurringWidth = (item.recurringProjected / maxExpense) * 100;
    const plannedWidth = (item.plannedExpenses / maxExpense) * 100;
    const selected = item.month === selectedMonth;
    return `<button type="button" class="px-home-forecast-month ${selected ? 'selected' : ''}" data-home-forecast-month="${escapeHtml(item.month)}">
      <div class="px-home-forecast-month-label"><strong>${escapeHtml(monthLabel(item.month))}</strong><span class="px-home-forecast-risk ${risk.className}">${risk.label}</span></div>
      <div class="px-home-forecast-flow"><div><span>Entradas</span><strong>${escapeHtml(money(item.totalIncome))}</strong></div><div><span>Compromissos</span><strong>${escapeHtml(money(item.totalExpenses))}</strong></div><div><span>Saldo projetado</span><strong class="${item.projectedBalance < 0 ? 'negative' : ''}">${escapeHtml(money(item.projectedBalance))}</strong></div></div>
      <div class="px-home-forecast-stack" title="Cartões, contas a pagar, recorrentes e demais despesas previstas"><i class="cards" style="width:${Math.max(0, cardsWidth).toFixed(2)}%"></i><i class="payables" style="width:${Math.max(0, payablesWidth).toFixed(2)}%"></i><i class="recurring" style="width:${Math.max(0, recurringWidth).toFixed(2)}%"></i><i class="planned" style="width:${Math.max(0, plannedWidth).toFixed(2)}%"></i></div>
      <div class="px-home-forecast-month-foot"><span>Renda comprometida <b>${escapeHtml(percent(item.commitmentPercent))}</b></span><span>Resultado do mês <b class="${item.net < 0 ? 'negative' : ''}">${escapeHtml(money(item.net))}</b></span></div>
    </button>`;
  }).join('')}</div>`;
}

function selectedItem(forecast: CommitmentForecast) {
  return forecast.items.find((item) => item.month === selectedMonth) || forecast.items[0] || null;
}

function detailHtml(forecast: CommitmentForecast) {
  const item = selectedItem(forecast);
  if (!item) return '';
  const cards = item.cards.length
    ? item.cards.slice(0, 5).map((card) => `<div><span>${escapeHtml(card.name)}</span><strong>${escapeHtml(money(card.amount))}</strong><small>${card.installments} parcela(s)</small></div>`).join('')
    : '<div><span>Cartões</span><strong>R$ 0,00</strong><small>Nenhuma parcela com vencimento neste mês</small></div>';
  return `<div class="px-home-forecast-detail" data-home-forecast-detail>
    <div class="px-home-forecast-detail-head"><div><span>Composição de ${escapeHtml(monthLabel(item.month, true))}</span><strong>${escapeHtml(money(item.totalExpenses))} em compromissos</strong></div><div><span>Receita prevista</span><strong>${escapeHtml(money(item.totalIncome))}</strong></div></div>
    <div class="px-home-forecast-breakdown">
      <div><span>Cartões</span><strong>${escapeHtml(money(item.cardCommitments))}</strong><small>${item.cardInstallments} parcela(s)</small></div>
      <div><span>Contas a pagar</span><strong>${escapeHtml(money(item.payables))}</strong><small>${item.payableCount} conta(s)</small></div>
      <div><span>Recorrentes projetadas</span><strong>${escapeHtml(money(item.recurringProjected))}</strong><small>${item.recurringCount} ocorrência(s)</small></div>
      <div><span>Outras despesas previstas</span><strong>${escapeHtml(money(item.plannedExpenses))}</strong><small>${item.plannedExpenseCount} lançamento(s)</small></div>
      <div><span>Contas a receber</span><strong>${escapeHtml(money(item.receivables))}</strong><small>${item.receivableCount} recebível(is)</small></div>
      <div><span>Outras receitas previstas</span><strong>${escapeHtml(money(item.plannedIncome))}</strong><small>${item.plannedIncomeCount} lançamento(s)</small></div>
    </div>
    <div class="px-home-forecast-card-list"><div class="px-home-forecast-subhead"><span>Cartões que vencem no mês</span><small>O caixa usa o mês real do vencimento da fatura, não o mês da compra.</small></div>${cards}</div>
  </div>`;
}

function topCardsHtml(forecast: CommitmentForecast) {
  const cards = forecast.summary.topCards;
  if (!cards.length) return '';
  return `<div class="px-home-forecast-topcards"><div class="px-home-forecast-subhead"><span>Cartões que mais comprometem o horizonte</span><small>Somente parcelas abertas com calendário normalizado.</small></div>${cards.map((card, index) => `<div><b>${index + 1}</b><span>${escapeHtml(card.name)}</span><strong>${escapeHtml(money(card.amount))}</strong><small>${card.installments} parcela(s)</small></div>`).join('')}</div>`;
}

function panelHtml(forecast: CommitmentForecast) {
  return `<section class="px-card px-home-commitment-forecast" data-home-commitment-forecast>
    <div class="px-home-forecast-head"><div><span>Radar financeiro · 12 meses</span><strong>Quanto da renda futura já está comprometido</strong><small>${escapeHtml(monthLabel(forecast.from))} — ${escapeHtml(monthLabel(forecast.through))} · cartões, contas, recorrentes, despesas e receitas previstas em uma única leitura.</small></div><div class="px-home-forecast-head-state"><b>${forecast.summary.monthsAtRisk}</b><span>mês(es) sob atenção</span></div></div>
    ${summaryHtml(forecast)}
    ${alertHtml(forecast)}
    <div class="px-home-forecast-legend"><span><i class="cards"></i>Cartões</span><span><i class="payables"></i>Contas</span><span><i class="recurring"></i>Recorrentes</span><span><i class="planned"></i>Demais despesas</span></div>
    ${monthRowsHtml(forecast)}
    ${detailHtml(forecast)}
    ${topCardsHtml(forecast)}
    <div class="px-home-forecast-method"><strong>Leitura conservadora e auditável.</strong><span>Compras futuras não são estimadas. Parcelas de cartão entram no mês real do vencimento; benefícios e compras no crédito são excluídos dos lançamentos monetários previstos para não duplicar valores.</span></div>
  </section>`;
}

function render(forecast: CommitmentForecast) {
  if (!isHomeDashboard()) return;
  const metrics = document.querySelector<HTMLElement>('.px-home-balance-grid')?.parentElement?.querySelector<HTMLElement>('.px-metrics')
    || document.querySelector<HTMLElement>('.px-metrics');
  if (!metrics) return;
  removePanel();
  metrics.insertAdjacentHTML('afterend', panelHtml(forecast));
  bindPanel();
}

function renderSelection() {
  const forecast = currentForecast;
  if (!forecast) return;
  document.querySelectorAll<HTMLElement>('[data-home-forecast-month]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.homeForecastMonth === selectedMonth);
  });
  const detail = document.querySelector<HTMLElement>('[data-home-forecast-detail]');
  if (detail) detail.outerHTML = detailHtml(forecast);
}

function bindPanel() {
  document.querySelectorAll<HTMLButtonElement>('[data-home-forecast-month]').forEach((button) => {
    button.addEventListener('click', () => {
      const month = button.dataset.homeForecastMonth;
      if (!month) return;
      selectedMonth = month;
      renderSelection();
    });
  });
}

async function loadForecast(force = false) {
  if (!isHomeDashboard()) {
    loadedKey = '';
    loadingKey = '';
    currentForecast = null;
    removePanel();
    return;
  }
  const month = activeMonth();
  const key = `${month}|${HORIZON_MONTHS}`;
  if (!force && loadedKey === key && currentForecast) {
    if (!document.querySelector('[data-home-commitment-forecast]')) render(currentForecast);
    return;
  }
  if (!force && loadingKey === key) return;

  loadingKey = key;
  const request = ++requestSerial;
  try {
    const cached = !force ? cache.get(key) : null;
    const forecast = cached || await authenticatedRequest<CommitmentForecast>(`/finance/commitment-forecast?from=${encodeURIComponent(month)}&months=${HORIZON_MONTHS}`);
    if (request !== requestSerial || !isHomeDashboard() || activeMonth() !== month) return;
    cache.set(key, forecast);
    currentForecast = forecast;
    loadedKey = key;
    if (!selectedMonth || !forecast.items.some((item) => item.month === selectedMonth)) selectedMonth = forecast.from;
    render(forecast);
  } catch {
    // O radar é um enriquecimento de leitura. A Home principal permanece disponível se a API ainda estiver em atualização.
  } finally {
    if (loadingKey === key) loadingKey = '';
  }
}

function schedule(force = false) {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void loadForecast(force);
  }, 120);
}

function invalidate() {
  cache.clear();
  loadedKey = '';
  currentForecast = null;
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
