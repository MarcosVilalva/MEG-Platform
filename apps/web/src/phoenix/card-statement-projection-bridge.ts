import { authenticatedRequest } from '../app/auth-client';
import { cardsClient, type CreditCard, type CardPurchase } from '../app/cards-client';
import './phoenix-card-statement-projection.css';

type HistoryResponse = {
  cardId: string;
  summary: {
    monthsWithStatement: number;
    averageStatement: number;
  };
};

type ProjectionRisk = 'none' | 'normal' | 'attention' | 'high';
type ProjectionItem = {
  month: string;
  amount: number;
  installmentCount: number;
  purchaseCount: number;
  dueDate: string;
  closingDate: string;
  releaseAmount: number;
  availableAfterPayment: number;
  usedAfterPayment: number;
  shareOfLimit: number;
  deviationAmount: number;
  deviationPercent: number | null;
  risk: ProjectionRisk;
};

type ProjectionModel = {
  card: CreditCard;
  from: string;
  through: string;
  baselineAverage: number;
  baselineMonths: number;
  totalCommitted: number;
  totalInHorizon: number;
  beyondHorizon: number;
  overdueOpen: number;
  unscheduledReserved: number;
  alertCount: number;
  nextStatement: ProjectionItem | null;
  peak: ProjectionItem | null;
  availableAfterHorizon: number;
  items: ProjectionItem[];
};

const HORIZON_MONTHS = 12;
const HISTORY_MONTHS = 6;
let observer: MutationObserver | null = null;
let timer: number | null = null;
let requestSerial = 0;
let loadedKey = '';
let loadingKey = '';
let currentModel: ProjectionModel | null = null;
const cache = new Map<string, ProjectionModel>();

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

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(parsed) ? parsed : 0);
}

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function monthDate(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(Math.min(Math.max(day, 1), lastDay)).padStart(2, '0')}`;
}

function brDate(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
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

function riskFor(amount: number, average: number, creditLimit: number): ProjectionRisk {
  if (amount <= 0) return 'none';
  const averageRatio = average > 0 ? amount / average : 0;
  const limitRatio = creditLimit > 0 ? amount / creditLimit : 0;
  if ((average > 0 && averageRatio >= 1.5) || limitRatio >= 0.7) return 'high';
  if ((average > 0 && averageRatio >= 1.2) || limitRatio >= 0.5) return 'attention';
  return 'normal';
}

function openNormalizedPurchases(card: CreditCard) {
  return card.purchases.filter((purchase) => !purchase.id.startsWith('legacy-') && Array.isArray(purchase.entries));
}

function buildProjection(card: CreditCard, from: string, history: HistoryResponse): ProjectionModel {
  const creditLimit = Number(card.creditLimit) || 0;
  const usedLimit = Number(card.usedLimit) || 0;
  const availableLimit = Number(card.availableLimit) || Math.max(0, creditLimit - usedLimit);
  const baselineAverage = round(Number(history.summary.averageStatement) || 0);
  const normalizedPurchases = openNormalizedPurchases(card);
  const openEntries = normalizedPurchases.flatMap((purchase) => purchase.entries
    .filter((entry) => entry.status === 'open')
    .map((entry) => ({ purchase, entry })));
  const scheduledOpenTotal = round(openEntries.reduce((sum, item) => sum + Number(item.entry.amount), 0));
  const unscheduledReserved = round(Math.max(0, usedLimit - scheduledOpenTotal));
  const overdueOpen = round(openEntries
    .filter((item) => item.entry.statementMonth < from)
    .reduce((sum, item) => sum + Number(item.entry.amount), 0));
  const through = addMonths(from, HORIZON_MONTHS - 1);
  const futureAll = openEntries.filter((item) => item.entry.statementMonth >= from);
  const inHorizon = futureAll.filter((item) => item.entry.statementMonth <= through);
  const totalCommitted = round(futureAll.reduce((sum, item) => sum + Number(item.entry.amount), 0));
  const totalInHorizon = round(inHorizon.reduce((sum, item) => sum + Number(item.entry.amount), 0));
  const beyondHorizon = round(totalCommitted - totalInHorizon);

  let cumulativeReleased = 0;
  const items: ProjectionItem[] = Array.from({ length: HORIZON_MONTHS }, (_, index) => {
    const month = addMonths(from, index);
    const matching = openEntries.filter((item) => item.entry.statementMonth === month);
    const amount = round(matching.reduce((sum, item) => sum + Number(item.entry.amount), 0));
    const purchaseIds = new Set(matching.map((item) => item.purchase.id));
    cumulativeReleased = round(cumulativeReleased + amount);
    const usedAfterPayment = round(Math.max(0, usedLimit - cumulativeReleased));
    const availableAfterPayment = round(Math.min(creditLimit, Math.max(availableLimit, creditLimit - usedAfterPayment)));
    const deviationAmount = round(amount - baselineAverage);
    const deviationPercent = baselineAverage > 0 ? round((deviationAmount / baselineAverage) * 100) : null;
    const dueMonth = card.dueDay <= card.closingDay ? addMonths(month, 1) : month;
    return {
      month,
      amount,
      installmentCount: matching.length,
      purchaseCount: purchaseIds.size,
      dueDate: monthDate(dueMonth, card.dueDay),
      closingDate: monthDate(month, card.closingDay),
      releaseAmount: amount,
      availableAfterPayment,
      usedAfterPayment,
      shareOfLimit: creditLimit > 0 ? round((amount / creditLimit) * 100) : 0,
      deviationAmount,
      deviationPercent,
      risk: riskFor(amount, baselineAverage, creditLimit),
    };
  });

  const nonZero = items.filter((item) => item.amount > 0);
  const peak = nonZero.reduce<ProjectionItem | null>((best, item) => !best || item.amount > best.amount ? item : best, null);
  const nextStatement = nonZero[0] || null;
  const alertCount = items.filter((item) => item.risk === 'attention' || item.risk === 'high').length;

  return {
    card,
    from,
    through,
    baselineAverage,
    baselineMonths: Number(history.summary.monthsWithStatement) || 0,
    totalCommitted,
    totalInHorizon,
    beyondHorizon,
    overdueOpen,
    unscheduledReserved,
    alertCount,
    nextStatement,
    peak,
    availableAfterHorizon: items[items.length - 1]?.availableAfterPayment ?? availableLimit,
    items,
  };
}

function riskMeta(risk: ProjectionRisk) {
  return ({
    none: { label: 'SEM PARCELAS', className: 'none' },
    normal: { label: 'DENTRO DO PADRÃO', className: 'normal' },
    attention: { label: 'ACIMA DO PADRÃO', className: 'attention' },
    high: { label: 'ALERTA ALTO', className: 'high' },
  } as const)[risk];
}

function comparisonHtml(item: ProjectionItem, baseline: number) {
  if (!item.amount) return '<span class="px-card-projection-comparison neutral">Sem compromisso contratado</span>';
  if (!baseline) return `<span class="px-card-projection-comparison neutral">${item.shareOfLimit.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do limite</span>`;
  if (!item.deviationAmount) return '<span class="px-card-projection-comparison neutral">Na média histórica</span>';
  const sign = item.deviationAmount > 0 ? '+' : '−';
  return `<span class="px-card-projection-comparison ${item.deviationAmount > 0 ? 'up' : 'down'}">${sign}${escapeHtml(money(Math.abs(item.deviationAmount)))} · ${escapeHtml(percent(item.deviationPercent))}</span>`;
}

function summaryHtml(model: ProjectionModel) {
  const next = model.nextStatement;
  const peak = model.peak;
  return `<div class="px-card-projection-summary">
    <div><span>Comprometido futuro</span><strong>${escapeHtml(money(model.totalCommitted))}</strong><small>${model.beyondHorizon > 0 ? `${money(model.beyondHorizon)} além de 12 meses` : 'Dentro da janela exibida'}</small></div>
    <div><span>Próxima fatura contratada</span><strong>${escapeHtml(next ? money(next.amount) : 'R$ 0,00')}</strong><small>${next ? `Vence ${brDate(next.dueDate)}` : 'Nenhuma parcela futura'}</small></div>
    <div><span>Média histórica</span><strong>${escapeHtml(money(model.baselineAverage))}</strong><small>${model.baselineMonths ? `${model.baselineMonths} mês(es) anteriores com fatura` : 'Sem base histórica suficiente'}</small></div>
    <div><span>Pico projetado</span><strong>${escapeHtml(peak ? money(peak.amount) : 'R$ 0,00')}</strong><small>${peak ? monthLabel(peak.month, true) : 'Sem compromisso futuro'}</small></div>
    <div><span>Limite disponível hoje</span><strong>${escapeHtml(money(model.card.availableLimit))}</strong><small>Uso atual ${escapeHtml(money(model.card.usedLimit))}</small></div>
    <div><span>Disponível após a janela</span><strong>${escapeHtml(money(model.availableAfterHorizon))}</strong><small>Se as faturas contratadas forem pagas integralmente</small></div>
  </div>`;
}

function alertHtml(model: ProjectionModel) {
  if (!model.alertCount && !model.overdueOpen && !model.unscheduledReserved) {
    return '<div class="px-card-projection-insight ok"><strong>Nenhum alerta relevante na projeção contratada.</strong><span>As parcelas conhecidas permanecem dentro dos parâmetros atuais do cartão e da média histórica disponível.</span></div>';
  }
  const messages: string[] = [];
  if (model.alertCount) messages.push(`${model.alertCount} competência(s) acima dos parâmetros de atenção`);
  if (model.overdueOpen) messages.push(`${money(model.overdueOpen)} de competências anteriores ainda em aberto`);
  if (model.unscheduledReserved) messages.push(`${money(model.unscheduledReserved)} do limite sem calendário normalizado de parcelas`);
  return `<div class="px-card-projection-insight warn"><strong>Atenção à projeção do cartão.</strong><span>${escapeHtml(messages.join(' · '))}.</span></div>`;
}

function monthsHtml(model: ProjectionModel) {
  const max = Math.max(1, ...model.items.map((item) => item.amount), model.baselineAverage);
  return `<div class="px-card-projection-months">${model.items.map((item) => {
    const risk = riskMeta(item.risk);
    const bar = Math.max(item.amount > 0 ? 3 : 0, Math.min(100, (item.amount / max) * 100));
    return `<article class="px-card-projection-month ${risk.className}">
      <div class="px-card-projection-month-head"><div><span>${escapeHtml(monthLabel(item.month))}</span><strong>${escapeHtml(money(item.amount))}</strong></div><span class="px-card-projection-risk ${risk.className}">${risk.label}</span></div>
      <div class="px-card-projection-bar"><i style="width:${bar.toFixed(1)}%"></i>${model.baselineAverage > 0 ? `<b style="left:${Math.min(100, (model.baselineAverage / max) * 100).toFixed(1)}%" title="Média histórica"></b>` : ''}</div>
      ${comparisonHtml(item, model.baselineAverage)}
      <div class="px-card-projection-meta"><span>${item.installmentCount} parcela(s) · ${item.purchaseCount} compra(s)</span><span>Fecha ${escapeHtml(brDate(item.closingDate))} · vence ${escapeHtml(brDate(item.dueDate))}</span></div>
      <div class="px-card-projection-release"><div><span>Libera ao pagar</span><strong>${escapeHtml(money(item.releaseAmount))}</strong></div><div><span>Limite disponível depois</span><strong>${escapeHtml(money(item.availableAfterPayment))}</strong></div></div>
    </article>`;
  }).join('')}</div>`;
}

function panelHtml(model: ProjectionModel) {
  return `<section class="px-card-statement-projection" data-card-statement-projection>
    <div class="px-card-projection-head"><div><span>Projeção inteligente das próximas faturas</span><strong>${escapeHtml(model.card.name)} · ${escapeHtml(monthLabel(model.from))} — ${escapeHtml(monthLabel(model.through))}</strong><small>Baseada somente em parcelas já contratadas. O MEG não inventa compras futuras.</small></div><div class="px-card-projection-method"><span>Referência histórica</span><strong>${model.baselineMonths ? `${model.baselineMonths} mês(es)` : 'Sem histórico'}</strong><small>Atenção ≥ 120% da média ou 50% do limite · alerta alto ≥ 150% ou 70% do limite</small></div></div>
    ${summaryHtml(model)}
    ${alertHtml(model)}
    <div class="px-card-projection-legend"><span><i class="average"></i>Média histórica</span><span><i class="contracted"></i>Parcelas contratadas</span><span>O limite projetado considera liberação após pagamento integral de cada competência.</span></div>
    ${monthsHtml(model)}
  </section>`;
}

function panelHost() {
  return document.querySelector<HTMLElement>('.px-card-hero');
}

function removePanel() {
  document.querySelector('[data-card-statement-projection]')?.remove();
}

function render(model: ProjectionModel) {
  const host = panelHost();
  if (!host) return;
  removePanel();
  const history = host.querySelector<HTMLElement>('[data-card-statement-history]');
  const lifecycle = host.querySelector<HTMLElement>('[data-card-statement-lifecycle]');
  if (history) history.insertAdjacentHTML('afterend', panelHtml(model));
  else if (lifecycle) lifecycle.insertAdjacentHTML('afterend', panelHtml(model));
  else host.insertAdjacentHTML('beforeend', panelHtml(model));
}

async function load(force = false) {
  const name = selectedCardName();
  const month = activeMonth();
  const host = panelHost();
  if (!name || !host) {
    loadedKey = '';
    currentModel = null;
    removePanel();
    return;
  }
  const key = `${normalize(name)}|${month}`;
  if (!force && loadedKey === key && currentModel) {
    if (!document.querySelector('[data-card-statement-projection]')) render(currentModel);
    return;
  }
  if (!force && loadingKey === key) return;

  loadingKey = key;
  const request = ++requestSerial;
  try {
    const cards = await cardsClient.list(month);
    const card = cards.find((item) => normalize(item.name) === normalize(name));
    if (!card || request !== requestSerial || normalize(selectedCardName()) !== normalize(name)) return;
    const cacheKey = `${card.id}|${month}`;
    const cached = !force ? cache.get(cacheKey) : null;
    let model = cached || null;
    if (!model) {
      const historyThrough = addMonths(month, -1);
      const history = await authenticatedRequest<HistoryResponse>(`/cards/${encodeURIComponent(card.id)}/statements/history?through=${encodeURIComponent(historyThrough)}&months=${HISTORY_MONTHS}`);
      if (request !== requestSerial || normalize(selectedCardName()) !== normalize(name)) return;
      model = buildProjection(card, month, history);
      cache.set(cacheKey, model);
    }
    currentModel = model;
    loadedKey = key;
    render(model);
  } catch {
    // A projeção é um enriquecimento analítico e não bloqueia o domínio de cartões.
  } finally {
    if (loadingKey === key) loadingKey = '';
  }
}

function schedule(force = false) {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void load(force);
  }, 110);
}

function invalidate() {
  cache.clear();
  loadedKey = '';
  currentModel = null;
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