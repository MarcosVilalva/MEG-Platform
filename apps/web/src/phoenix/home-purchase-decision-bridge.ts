import { authenticatedRequest } from '../app/auth-client';
import { cardsClient, type CreditCard } from '../app/cards-client';
import './phoenix-home-purchase-decision.css';

type ForecastRisk = 'normal' | 'attention' | 'high';
type ForecastMonth = {
  month: string;
  totalExpenses: number;
  totalIncome: number;
  projectedBalance: number;
  risk: ForecastRisk;
};
type CommitmentForecast = {
  from: string;
  through: string;
  months: number;
  currentBalance: number;
  items: ForecastMonth[];
  summary: { totalIncome: number; totalExpenses: number; firstNegativeMonth: string | null };
};
type DecisionOption = {
  kind: 'cash' | 'card';
  card: CreditCard | null;
  installments: number;
  installmentAmount: number;
  firstDueMonth: string;
  lastDueMonth: string;
  minimumProjectedBalance: number;
  projectedClosing: number;
  firstNegativeMonth: string | null;
  highRiskMonths: number;
  monthsAtRisk: number;
  newHighRiskMonths: number;
  createsNegative: boolean;
  outsideHorizonAmount: number;
  eligible: boolean;
};
type DecisionResult = {
  amount: number;
  purchaseDate: string;
  cash: DecisionOption;
  bestCard: DecisionOption | null;
  alternatives: DecisionOption[];
  safeCash: number;
  safeCredit: { amount: number; card: CreditCard; installments: number; firstDueMonth: string } | null;
  baselineHighRiskMonths: number;
  baselineFirstNegativeMonth: string | null;
};

const HORIZON_MONTHS = 12;
let observer: MutationObserver | null = null;
let timer: number | null = null;
let requestSerial = 0;
let loadedKey = '';
let loadingKey = '';
let forecast: CommitmentForecast | null = null;
let cards: CreditCard[] = [];
let result: DecisionResult | null = null;
const forecastCache = new Map<string, CommitmentForecast>();
const cardsCache = new Map<string, CreditCard[]>();

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function monthLabel(month: string, long = false) {
  const parsed = new Date(`${month}-01T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return month;
  const label = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', month: long ? 'long' : 'short', year: 'numeric' }).format(parsed);
  return long ? label.replace(/^./, (letter) => letter.toUpperCase()) : label.replace('.', '').replace(' de ', '/');
}

function todayBrazil() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function activeMonth() {
  const label = document.querySelector<HTMLElement>('.px-period-active')?.textContent || '';
  const cleaned = normalize(label).replace(/[.,]/g, ' ');
  const iso = cleaned.match(/(20\d{2})[-/]?(0[1-9]|1[0-2])/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const monthNames: Record<string, string> = {
    jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', março: '03', abr: '04', abril: '04',
    mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07', ago: '08', agosto: '08', set: '09', setembro: '09',
    out: '10', outubro: '10', nov: '11', novembro: '11', dez: '12', dezembro: '12'
  };
  const year = cleaned.match(/\b(20\d{2})\b/)?.[1];
  const token = cleaned.split(/[^a-z0-9çã]+/).find((item) => monthNames[item]);
  if (year && token) return `${year}-${monthNames[token]}`;
  return todayBrazil().slice(0, 7);
}

function isHomeDashboard() {
  return Boolean(document.querySelector('.px-home-balance-grid') && document.querySelector('.px-home-action-grid'));
}

function riskFor(totalExpenses: number, totalIncome: number, projectedBalance: number): ForecastRisk {
  if (projectedBalance < 0) return 'high';
  if (totalIncome > 0 && totalExpenses / totalIncome >= 1) return 'high';
  if (totalIncome > 0 && totalExpenses / totalIncome >= 0.8) return 'attention';
  if (totalExpenses > totalIncome && totalExpenses > 0) return 'attention';
  return 'normal';
}

function distributeInstallments(amount: number, installments: number) {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / installments);
  const remainder = cents - base * installments;
  return Array.from({ length: installments }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

function firstStatementMonth(card: CreditCard, purchaseDate: string) {
  const month = purchaseDate.slice(0, 7);
  const day = Number(purchaseDate.slice(8, 10));
  return addMonths(month, day > card.closingDay ? 1 : 0);
}

function dueMonth(card: CreditCard, statementMonth: string) {
  return card.dueDay <= card.closingDay ? addMonths(statementMonth, 1) : statementMonth;
}

function simulate(forecastData: CommitmentForecast, amount: number, purchaseDate: string, installments: number, card: CreditCard | null): DecisionOption {
  const additions = new Map<string, number>();
  let firstDueMonth = purchaseDate.slice(0, 7);
  let lastDueMonth = firstDueMonth;
  let outsideHorizonAmount = 0;
  let eligible = true;
  let installmentAmount = amount;

  if (card) {
    eligible = Number(card.availableLimit) + 0.0001 >= amount;
    const statement = firstStatementMonth(card, purchaseDate);
    const values = distributeInstallments(amount, installments);
    installmentAmount = values[0] || amount;
    values.forEach((value, index) => {
      const statementMonth = addMonths(statement, index);
      const paymentMonth = dueMonth(card, statementMonth);
      if (index === 0) firstDueMonth = paymentMonth;
      lastDueMonth = paymentMonth;
      if (forecastData.items.some((item) => item.month === paymentMonth)) {
        additions.set(paymentMonth, round((additions.get(paymentMonth) || 0) + value));
      } else {
        outsideHorizonAmount = round(outsideHorizonAmount + value);
      }
    });
  } else {
    const month = forecastData.items.some((item) => item.month === purchaseDate.slice(0, 7)) ? purchaseDate.slice(0, 7) : forecastData.from;
    firstDueMonth = month;
    lastDueMonth = month;
    additions.set(month, amount);
  }

  const baselineHigh = forecastData.items.filter((item) => item.risk === 'high').length;
  const baselineNegative = forecastData.items.find((item) => item.projectedBalance < 0)?.month || null;
  let balance = forecastData.currentBalance;
  let minimum = balance;
  let firstNegativeMonth: string | null = null;
  let highRiskMonths = 0;
  let monthsAtRisk = 0;

  for (const item of forecastData.items) {
    const totalExpenses = round(item.totalExpenses + (additions.get(item.month) || 0));
    const totalIncome = Number(item.totalIncome || 0);
    balance = round(balance + totalIncome - totalExpenses);
    minimum = Math.min(minimum, balance);
    if (balance < 0 && !firstNegativeMonth) firstNegativeMonth = item.month;
    const risk = riskFor(totalExpenses, totalIncome, balance);
    if (risk === 'high') highRiskMonths += 1;
    if (risk !== 'normal') monthsAtRisk += 1;
  }

  return {
    kind: card ? 'card' : 'cash',
    card,
    installments,
    installmentAmount: round(installmentAmount),
    firstDueMonth,
    lastDueMonth,
    minimumProjectedBalance: round(minimum),
    projectedClosing: round(balance),
    firstNegativeMonth,
    highRiskMonths,
    monthsAtRisk,
    newHighRiskMonths: Math.max(0, highRiskMonths - baselineHigh),
    createsNegative: !baselineNegative && Boolean(firstNegativeMonth),
    outsideHorizonAmount,
    eligible,
  };
}

function optionComparator(left: DecisionOption, right: DecisionOption) {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
  const leftOutside = left.outsideHorizonAmount > 0 ? 1 : 0;
  const rightOutside = right.outsideHorizonAmount > 0 ? 1 : 0;
  if (leftOutside !== rightOutside) return leftOutside - rightOutside;
  if (left.newHighRiskMonths !== right.newHighRiskMonths) return left.newHighRiskMonths - right.newHighRiskMonths;
  if (left.createsNegative !== right.createsNegative) return left.createsNegative ? 1 : -1;
  if (left.highRiskMonths !== right.highRiskMonths) return left.highRiskMonths - right.highRiskMonths;
  if (left.monthsAtRisk !== right.monthsAtRisk) return left.monthsAtRisk - right.monthsAtRisk;
  if (left.minimumProjectedBalance !== right.minimumProjectedBalance) return right.minimumProjectedBalance - left.minimumProjectedBalance;
  if (left.installments !== right.installments) return left.installments - right.installments;
  return (right.card?.availableLimit || 0) - (left.card?.availableLimit || 0);
}

function safeByBaseline(option: DecisionOption, baselineHigh: number, baselineNegative: string | null) {
  if (!option.eligible) return false;
  if (option.highRiskMonths > baselineHigh) return false;
  if (!baselineNegative && option.firstNegativeMonth) return false;
  return true;
}

function binarySafeAmount(forecastData: CommitmentForecast, purchaseDate: string, installments: number, card: CreditCard | null, high: number, baselineHigh: number, baselineNegative: string | null) {
  let low = 0;
  let upper = Math.max(0, high);
  for (let index = 0; index < 22; index += 1) {
    const middle = (low + upper) / 2;
    const option = simulate(forecastData, middle, purchaseDate, installments, card);
    if (safeByBaseline(option, baselineHigh, baselineNegative)) low = middle;
    else upper = middle;
  }
  return Math.floor(low * 100) / 100;
}

function analyze(amount: number, purchaseDate: string, maxInstallments: number): DecisionResult {
  if (!forecast) throw new Error('FORECAST_NOT_READY');
  const baselineHighRiskMonths = forecast.items.filter((item) => item.risk === 'high').length;
  const baselineFirstNegativeMonth = forecast.items.find((item) => item.projectedBalance < 0)?.month || null;
  const cash = simulate(forecast, amount, purchaseDate, 1, null);
  const options: DecisionOption[] = [];
  for (const card of cards.filter((item) => item.isActive)) {
    for (let installments = 1; installments <= maxInstallments; installments += 1) {
      options.push(simulate(forecast, amount, purchaseDate, installments, card));
    }
  }
  const eligible = options.filter((item) => item.eligible).sort(optionComparator);
  const bestCard = eligible[0] || null;

  const cashUpper = Math.max(0, forecast.currentBalance + forecast.summary.totalIncome);
  const safeCash = binarySafeAmount(forecast, purchaseDate, 1, null, cashUpper, baselineHighRiskMonths, baselineFirstNegativeMonth);
  let safeCredit: DecisionResult['safeCredit'] = null;
  for (const card of cards.filter((item) => item.isActive && Number(item.availableLimit) > 0)) {
    for (let installments = 1; installments <= maxInstallments; installments += 1) {
      const ceiling = binarySafeAmount(forecast, purchaseDate, installments, card, Number(card.availableLimit), baselineHighRiskMonths, baselineFirstNegativeMonth);
      if (!safeCredit || ceiling > safeCredit.amount + 0.009 || (Math.abs(ceiling - safeCredit.amount) < 0.01 && installments < safeCredit.installments)) {
        const option = simulate(forecast, ceiling, purchaseDate, installments, card);
        safeCredit = { amount: ceiling, card, installments, firstDueMonth: option.firstDueMonth };
      }
    }
  }

  return {
    amount,
    purchaseDate,
    cash,
    bestCard,
    alternatives: eligible.slice(0, 5),
    safeCash,
    safeCredit,
    baselineHighRiskMonths,
    baselineFirstNegativeMonth,
  };
}

function optionRiskText(option: DecisionOption, baselineHigh: number) {
  if (!option.eligible) return 'Limite insuficiente';
  if (option.createsNegative) return 'Cria saldo negativo';
  if (option.highRiskMonths > baselineHigh) return `Cria ${option.highRiskMonths - baselineHigh} novo(s) mês(es) crítico(s)`;
  if (option.monthsAtRisk > 0) return `${option.monthsAtRisk} mês(es) sob atenção no horizonte`;
  return 'Não cria mês crítico no horizonte';
}

function verdictHtml(data: DecisionResult) {
  const best = data.bestCard;
  const cashSafe = safeByBaseline(data.cash, data.baselineHighRiskMonths, data.baselineFirstNegativeMonth);
  if (!best && !cashSafe) {
    return `<div class="px-decision-verdict danger"><span>Decisão recomendada</span><strong>Adiar ou reduzir o valor</strong><p>Com os dados atuais, a compra de ${escapeHtml(money(data.amount))} não cabe nos cartões disponíveis e o pagamento à vista piora o nível crítico do horizonte.</p></div>`;
  }
  if (!best && cashSafe) {
    return `<div class="px-decision-verdict good"><span>Decisão recomendada</span><strong>À vista</strong><p>${escapeHtml(money(data.amount))} à vista não cria novo mês crítico. O menor saldo projetado ficaria em ${escapeHtml(money(data.cash.minimumProjectedBalance))}.</p></div>`;
  }
  if (best) {
    const label = best.installments === 1 ? '1x' : `${best.installments}x de ${money(best.installmentAmount)}`;
    return `<div class="px-decision-verdict ${best.newHighRiskMonths || best.createsNegative ? 'warn' : 'good'}"><span>Melhor encaixe encontrado</span><strong>${escapeHtml(best.card?.name || 'Cartão')} · ${escapeHtml(label)}</strong><p>Primeiro impacto em ${escapeHtml(monthLabel(best.firstDueMonth, true))}. ${escapeHtml(optionRiskText(best, data.baselineHighRiskMonths))}. Menor saldo: ${escapeHtml(money(best.minimumProjectedBalance))}.</p></div>`;
  }
  return '';
}

function optionCardHtml(title: string, option: DecisionOption, baselineHigh: number) {
  const payment = option.kind === 'cash' ? 'Pagamento imediato' : `${option.installments}x de ${money(option.installmentAmount)}`;
  const first = option.kind === 'cash' ? monthLabel(option.firstDueMonth, true) : `1ª fatura: ${monthLabel(option.firstDueMonth, true)}`;
  return `<div class="px-decision-option ${option.newHighRiskMonths || option.createsNegative || !option.eligible ? 'warn' : 'good'}"><span>${escapeHtml(title)}</span><strong>${escapeHtml(payment)}</strong><small>${escapeHtml(first)}</small><div><b>Menor saldo</b><em>${escapeHtml(money(option.minimumProjectedBalance))}</em></div><p>${escapeHtml(optionRiskText(option, baselineHigh))}</p></div>`;
}

function alternativesHtml(data: DecisionResult) {
  if (!data.alternatives.length) return '<div class="px-decision-empty">Nenhum cartão ativo possui limite suficiente para esse valor.</div>';
  return `<div class="px-decision-alt-list">${data.alternatives.map((option, index) => `<div><b>${index + 1}</b><span><strong>${escapeHtml(option.card?.name || 'Cartão')} · ${option.installments}x</strong><small>${escapeHtml(money(option.installmentAmount))} por fatura · começa em ${escapeHtml(monthLabel(option.firstDueMonth))}${option.outsideHorizonAmount > 0 ? ' · ultrapassa 12 meses' : ''}</small></span><em>${escapeHtml(money(option.minimumProjectedBalance))}</em></div>`).join('')}</div>`;
}

function resultsHtml(data: DecisionResult) {
  const safeCredit = data.safeCredit;
  return `<div class="px-decision-results" data-decision-results>
    ${verdictHtml(data)}
    <div class="px-decision-grid">
      ${optionCardHtml('À vista', data.cash, data.baselineHighRiskMonths)}
      ${data.bestCard ? optionCardHtml('Melhor parcelamento', data.bestCard, data.baselineHighRiskMonths) : '<div class="px-decision-option warn"><span>Melhor parcelamento</span><strong>Sem cartão elegível</strong><small>Limite disponível insuficiente</small></div>'}
      <div class="px-decision-option ceiling"><span>Até quanto cabe sem piorar o crítico</span><strong>${escapeHtml(money(data.safeCash))}</strong><small>Referência à vista</small><div><b>No crédito</b><em>${safeCredit ? escapeHtml(money(safeCredit.amount)) : '—'}</em></div><p>${safeCredit ? `${escapeHtml(safeCredit.card.name)} · ${safeCredit.installments}x · 1ª em ${escapeHtml(monthLabel(safeCredit.firstDueMonth))}` : 'Nenhum cartão com margem segura disponível.'}</p></div>
    </div>
    <div class="px-decision-alt"><div class="px-decision-subhead"><span>Alternativas mais seguras</span><small>Ordenadas por risco, menor saldo projetado e menor prazo quando os cenários são equivalentes.</small></div>${alternativesHtml(data)}</div>
    <div class="px-decision-method"><strong>Como o MEG decidiu</strong><span>Usou saldo atual, compromissos dos próximos 12 meses, vencimentos reais dos cartões, limite disponível, fechamento e vencimento de cada cartão. O cálculo não considera juros, cashback ou desconto à vista; se houver juros no parcelamento, o valor financiado precisa ser recalculado.</span></div>
  </div>`;
}

function panelHtml() {
  const defaultDate = forecast ? (todayBrazil().slice(0, 7) < forecast.from ? `${forecast.from}-01` : todayBrazil()) : todayBrazil();
  return `<section class="px-card px-home-purchase-decision" data-home-purchase-decision>
    <div class="px-decision-head"><div><span>Assistente de decisão</span><strong>Quanto posso comprar e qual forma pesa menos?</strong><small>Compare à vista, cartões e parcelamentos antes de assumir o compromisso.</small></div><div class="px-decision-badge">SÓ ANALISA</div></div>
    <div class="px-decision-form">
      <label><span>Valor da compra</span><input data-decision-amount type="number" min="0.01" step="0.01" placeholder="0,00" value="${result ? result.amount : ''}"></label>
      <label><span>Data da compra</span><input data-decision-date type="date" value="${escapeHtml(result?.purchaseDate || defaultDate)}"></label>
      <label><span>Comparar até</span><select data-decision-max>${[3, 6, 10, 12, 18, 24].map((value) => `<option value="${value}" ${value === 12 ? 'selected' : ''}>${value}x</option>`).join('')}</select></label>
      <button type="button" data-decision-run>Analisar decisão</button>
    </div>
    <div class="px-decision-error" data-decision-error></div>
    ${result ? resultsHtml(result) : '<div class="px-decision-intro"><strong>Informe uma compra para o MEG comparar as opções.</strong><span>Ele não olha só a parcela: considera também o saldo futuro, meses críticos e o limite real de cada cartão.</span></div>'}
  </section>`;
}

function removePanel() {
  document.querySelector('[data-home-purchase-decision]')?.remove();
}

function render() {
  if (!forecast || !isHomeDashboard()) return;
  const anchor = document.querySelector<HTMLElement>('[data-home-scenario-simulator]') || document.querySelector<HTMLElement>('[data-home-commitment-forecast]');
  if (!anchor) return;
  removePanel();
  anchor.insertAdjacentHTML('afterend', panelHtml());
  bindPanel();
}

function showError(message: string) {
  const target = document.querySelector<HTMLElement>('[data-decision-error]');
  if (target) target.textContent = message;
}

function runDecision() {
  const amount = Number(document.querySelector<HTMLInputElement>('[data-decision-amount]')?.value || 0);
  const purchaseDate = document.querySelector<HTMLInputElement>('[data-decision-date]')?.value || '';
  const maxInstallments = Number(document.querySelector<HTMLSelectElement>('[data-decision-max]')?.value || 12);
  if (!Number.isFinite(amount) || amount <= 0) return showError('Informe um valor maior que zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) return showError('Informe uma data válida para a compra.');
  if (!forecast || purchaseDate.slice(0, 7) < forecast.from || purchaseDate.slice(0, 7) > forecast.through) return showError(`A data precisa estar entre ${monthLabel(forecast?.from || '', true)} e ${monthLabel(forecast?.through || '', true)}.`);
  result = analyze(amount, purchaseDate, Math.max(1, Math.min(24, Math.trunc(maxInstallments))));
  render();
}

function bindPanel() {
  document.querySelector<HTMLButtonElement>('[data-decision-run]')?.addEventListener('click', runDecision);
  document.querySelector<HTMLInputElement>('[data-decision-amount]')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runDecision();
  });
}

async function load(force = false) {
  if (!isHomeDashboard()) {
    loadedKey = '';
    loadingKey = '';
    forecast = null;
    cards = [];
    result = null;
    removePanel();
    return;
  }
  const month = activeMonth();
  const key = `${month}|${HORIZON_MONTHS}`;
  if (!force && loadedKey === key && forecast) {
    if (!document.querySelector('[data-home-purchase-decision]')) render();
    return;
  }
  if (!force && loadingKey === key) return;
  loadingKey = key;
  const serial = ++requestSerial;
  try {
    const cachedForecast = !force ? forecastCache.get(key) : null;
    const cachedCards = !force ? cardsCache.get(month) : null;
    const [forecastData, cardData] = await Promise.all([
      cachedForecast || authenticatedRequest<CommitmentForecast>(`/finance/commitment-forecast?from=${encodeURIComponent(month)}&months=${HORIZON_MONTHS}`),
      cachedCards || cardsClient.list(month),
    ]);
    if (serial !== requestSerial || !isHomeDashboard() || activeMonth() !== month) return;
    forecastCache.set(key, forecastData);
    cardsCache.set(month, cardData);
    forecast = forecastData;
    cards = cardData;
    result = null;
    loadedKey = key;
    render();
  } catch {
    // O assistente é uma camada de leitura. Falhas não bloqueiam a Home nem os lançamentos.
  } finally {
    if (loadingKey === key) loadingKey = '';
  }
}

function schedule(force = false) {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void load(force);
  }, 160);
}

function invalidate() {
  forecastCache.clear();
  cardsCache.clear();
  loadedKey = '';
  forecast = null;
  cards = [];
  result = null;
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
