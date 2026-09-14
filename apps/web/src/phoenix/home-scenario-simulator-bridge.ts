import { authenticatedRequest } from '../app/auth-client';
import './phoenix-home-scenario-simulator.css';

type ForecastRisk = 'normal' | 'attention' | 'high';
type ScenarioMode = 'base' | 'conservative' | 'optimistic';
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
  currentBalance: number;
  items: ForecastMonth[];
};
type SimulatedMonth = ForecastMonth & { whatIfExpense: number; whatIfIncome: number };
type ScenarioProjection = {
  mode: ScenarioMode;
  items: SimulatedMonth[];
  summary: {
    totalExpenses: number;
    totalIncome: number;
    projectedClosing: number;
    minimumProjectedBalance: number;
    minimumProjectedMonth: string | null;
    firstNegativeMonth: string | null;
    monthsAtRisk: number;
  };
};
type Simulation =
  | { kind: 'card'; amount: number; installments: number; month: string }
  | { kind: 'expense'; amount: number; month: string }
  | { kind: 'income'; amount: number; month: string }
  | { kind: 'move'; amount: number; fromMonth: string; toMonth: string };

const HORIZON_MONTHS = 12;
let observer: MutationObserver | null = null;
let timer: number | null = null;
let requestSerial = 0;
let loadedKey = '';
let loadingKey = '';
let forecast: CommitmentForecast | null = null;
let mode: ScenarioMode = 'base';
let simulatorKind: Simulation['kind'] = 'card';
let simulation: Simulation | null = null;
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
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number.isFinite(parsed) ? parsed : 0);
}

function signedMoney(value: number) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${money(value)}`;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
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

function riskFor(totalExpenses: number, totalIncome: number, projectedBalance: number): ForecastRisk {
  if (projectedBalance < 0) return 'high';
  if (totalIncome > 0 && totalExpenses / totalIncome >= 1) return 'high';
  if (totalIncome > 0 && totalExpenses / totalIncome >= 0.8) return 'attention';
  if (totalExpenses > totalIncome && totalExpenses > 0) return 'attention';
  return 'normal';
}

function scenarioAssumptions(selected: ScenarioMode) {
  if (selected === 'conservative') return 'Entradas futuras -15% e margem de +10% somente nas demais despesas planejadas. Cartões, contas e recorrentes permanecem integrais.';
  if (selected === 'optimistic') return 'Receitas cadastradas são mantidas; somente as demais despesas planejadas recebem uma redução simulada de 10%. Nenhuma renda extra é inventada.';
  return 'Usa exatamente os compromissos e receitas já cadastrados no radar, sem aplicar margem adicional.';
}

function distributeInstallments(total: number, installments: number) {
  const cents = Math.max(0, Math.round(total * 100));
  const count = Math.max(1, Math.min(24, Math.trunc(installments)));
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

function buildProjection(source: CommitmentForecast, selectedMode: ScenarioMode, adjustment: Simulation | null): ScenarioProjection {
  const items = source.items.map<SimulatedMonth>((item) => {
    const conservative = selectedMode === 'conservative';
    const optimistic = selectedMode === 'optimistic';
    const receivables = round(item.receivables * (conservative ? 0.85 : 1));
    const plannedIncome = round(item.plannedIncome * (conservative ? 0.85 : 1));
    const plannedExpenses = round(item.plannedExpenses * (conservative ? 1.10 : optimistic ? 0.90 : 1));
    return {
      ...item,
      receivables,
      plannedIncome,
      plannedExpenses,
      whatIfExpense: 0,
      whatIfIncome: 0,
      totalExpenses: round(item.cardCommitments + item.payables + item.recurringProjected + plannedExpenses),
      totalIncome: round(receivables + plannedIncome),
      net: 0,
      projectedBalance: source.currentBalance,
      commitmentPercent: null,
      risk: 'normal',
    };
  });
  const byMonth = new Map(items.map((item) => [item.month, item]));

  if (adjustment?.kind === 'card') {
    const start = items.findIndex((item) => item.month === adjustment.month);
    if (start >= 0) {
      const values = distributeInstallments(adjustment.amount, adjustment.installments);
      values.forEach((value, offset) => {
        const item = items[start + offset];
        if (!item) return;
        item.whatIfExpense = round(item.whatIfExpense + value);
        item.cardCommitments = round(item.cardCommitments + value);
        item.cardInstallments += 1;
      });
    }
  } else if (adjustment?.kind === 'expense') {
    const item = byMonth.get(adjustment.month);
    if (item) {
      item.whatIfExpense = round(item.whatIfExpense + adjustment.amount);
      item.plannedExpenses = round(item.plannedExpenses + adjustment.amount);
    }
  } else if (adjustment?.kind === 'income') {
    const item = byMonth.get(adjustment.month);
    if (item) {
      item.whatIfIncome = round(item.whatIfIncome + adjustment.amount);
      item.plannedIncome = round(item.plannedIncome + adjustment.amount);
    }
  } else if (adjustment?.kind === 'move') {
    const from = byMonth.get(adjustment.fromMonth);
    const to = byMonth.get(adjustment.toMonth);
    if (from && to && from !== to) {
      const available = Math.max(0, from.cardCommitments + from.payables + from.recurringProjected + from.plannedExpenses);
      const moved = Math.min(adjustment.amount, available);
      from.whatIfExpense = round(from.whatIfExpense - moved);
      to.whatIfExpense = round(to.whatIfExpense + moved);
    }
  }

  let balance = source.currentBalance;
  for (const item of items) {
    const structuralExpenses = item.cardCommitments + item.payables + item.recurringProjected + item.plannedExpenses;
    const structuralIncome = item.receivables + item.plannedIncome;
    const moveOnlyDelta = adjustment?.kind === 'move' ? item.whatIfExpense : 0;
    item.totalExpenses = round(Math.max(0, structuralExpenses + moveOnlyDelta));
    item.totalIncome = round(Math.max(0, structuralIncome + item.whatIfIncome));
    item.net = round(item.totalIncome - item.totalExpenses);
    balance = round(balance + item.net);
    item.projectedBalance = balance;
    item.commitmentPercent = item.totalIncome > 0 ? round((item.totalExpenses / item.totalIncome) * 100) : null;
    item.risk = riskFor(item.totalExpenses, item.totalIncome, balance);
  }

  const totalExpenses = round(items.reduce((sum, item) => sum + item.totalExpenses, 0));
  const totalIncome = round(items.reduce((sum, item) => sum + item.totalIncome, 0));
  const minimum = items.reduce<{ balance: number; month: string | null }>((current, item) => {
    return item.projectedBalance < current.balance ? { balance: item.projectedBalance, month: item.month } : current;
  }, { balance: source.currentBalance, month: null });
  const firstNegative = items.find((item) => item.projectedBalance < 0)?.month || null;
  return {
    mode: selectedMode,
    items,
    summary: {
      totalExpenses,
      totalIncome,
      projectedClosing: items.at(-1)?.projectedBalance ?? source.currentBalance,
      minimumProjectedBalance: minimum.balance,
      minimumProjectedMonth: minimum.month,
      firstNegativeMonth: firstNegative,
      monthsAtRisk: items.filter((item) => item.risk !== 'normal').length,
    },
  };
}

function scenarioLabel(selected: ScenarioMode) {
  return selected === 'conservative' ? 'Conservador' : selected === 'optimistic' ? 'Otimista' : 'Base';
}

function riskLabel(risk: ForecastRisk) {
  return risk === 'high' ? 'CRÍTICO' : risk === 'attention' ? 'ATENÇÃO' : 'CONFORTÁVEL';
}

function monthOptions(source: CommitmentForecast, selected?: string) {
  return source.items.map((item) => `<option value="${escapeHtml(item.month)}" ${item.month === selected ? 'selected' : ''}>${escapeHtml(monthLabel(item.month, true))}</option>`).join('');
}

function simulatorFields(source: CommitmentForecast) {
  const first = source.items[0]?.month || source.from;
  if (simulatorKind === 'card') {
    return `<label><span>Valor total da compra</span><input data-sim-amount type="number" min="0.01" step="0.01" placeholder="0,00"></label>
      <label><span>Parcelas</span><input data-sim-installments type="number" min="1" max="24" step="1" value="1"></label>
      <label><span>Primeiro vencimento</span><select data-sim-month>${monthOptions(source, first)}</select></label>`;
  }
  if (simulatorKind === 'move') {
    const second = source.items[1]?.month || first;
    return `<label><span>Valor a antecipar</span><input data-sim-amount type="number" min="0.01" step="0.01" placeholder="0,00"></label>
      <label><span>Vence originalmente em</span><select data-sim-from>${monthOptions(source, second)}</select></label>
      <label><span>Levar pagamento para</span><select data-sim-to>${monthOptions(source, first)}</select></label>`;
  }
  const label = simulatorKind === 'income' ? 'Valor da receita' : 'Valor da despesa';
  return `<label><span>${label}</span><input data-sim-amount type="number" min="0.01" step="0.01" placeholder="0,00"></label>
    <label><span>Mês do impacto</span><select data-sim-month>${monthOptions(source, first)}</select></label>`;
}

function simulationLabel(adjustment: Simulation | null) {
  if (!adjustment) return 'Nenhuma simulação adicional aplicada.';
  if (adjustment.kind === 'card') return `Compra de ${money(adjustment.amount)} em ${adjustment.installments}x, primeiro vencimento em ${monthLabel(adjustment.month)}.`;
  if (adjustment.kind === 'expense') return `Nova despesa de ${money(adjustment.amount)} em ${monthLabel(adjustment.month)}.`;
  if (adjustment.kind === 'income') return `Receita extra de ${money(adjustment.amount)} em ${monthLabel(adjustment.month)}.`;
  return `Antecipação de ${money(adjustment.amount)}: ${monthLabel(adjustment.fromMonth)} → ${monthLabel(adjustment.toMonth)}.`;
}

function monthlyStrip(base: ScenarioProjection, selected: ScenarioProjection) {
  return `<div class="px-scenario-month-strip">${selected.items.map((item, index) => {
    const original = base.items[index];
    const delta = round(item.projectedBalance - original.projectedBalance);
    return `<div class="px-scenario-month ${item.risk}"><div><strong>${escapeHtml(monthLabel(item.month))}</strong><span>${riskLabel(item.risk)}</span></div><b>${escapeHtml(money(item.projectedBalance))}</b><small>Base ${escapeHtml(money(original.projectedBalance))}</small><em class="${delta < 0 ? 'negative' : delta > 0 ? 'positive' : ''}">${escapeHtml(signedMoney(delta))}</em></div>`;
  }).join('')}</div>`;
}

function panelHtml(source: CommitmentForecast) {
  const base = buildProjection(source, 'base', null);
  const selectedWithoutSimulation = buildProjection(source, mode, null);
  const selected = buildProjection(source, mode, simulation);
  const deltaVsBase = round(selected.summary.projectedClosing - base.summary.projectedClosing);
  const simulationImpact = round(selected.summary.projectedClosing - selectedWithoutSimulation.summary.projectedClosing);
  const weakest = selected.items.reduce<SimulatedMonth | null>((current, item) => !current || item.projectedBalance < current.projectedBalance ? item : current, null);
  return `<section class="px-card px-home-scenario-simulator" data-home-scenario-simulator>
    <div class="px-scenario-head"><div><span>Simulador preditivo · 12 meses</span><strong>E se eu comprar, gastar, receber ou antecipar?</strong><small>Simulação local e não destrutiva. Nada aqui cria lançamento, paga fatura ou altera sua base.</small></div><div class="px-scenario-badge">SEM GRAVAR</div></div>

    <div class="px-scenario-switch" role="group" aria-label="Cenário financeiro">
      ${(['base', 'conservative', 'optimistic'] as ScenarioMode[]).map((item) => `<button type="button" data-scenario-mode="${item}" class="${mode === item ? 'active' : ''}"><strong>${scenarioLabel(item)}</strong><span>${item === 'base' ? 'Base cadastrada' : item === 'conservative' ? 'Mais proteção' : 'Economia possível'}</span></button>`).join('')}
    </div>
    <div class="px-scenario-assumption"><strong>Premissa ${escapeHtml(scenarioLabel(mode))}:</strong><span>${escapeHtml(scenarioAssumptions(mode))}</span></div>

    <div class="px-scenario-kpis">
      <div><span>Saldo final simulado</span><strong class="${selected.summary.projectedClosing < 0 ? 'negative' : ''}">${escapeHtml(money(selected.summary.projectedClosing))}</strong><small>Diferença vs Base <b class="${deltaVsBase < 0 ? 'negative' : deltaVsBase > 0 ? 'positive' : ''}">${escapeHtml(signedMoney(deltaVsBase))}</b></small></div>
      <div><span>Menor saldo</span><strong class="${selected.summary.minimumProjectedBalance < 0 ? 'negative' : ''}">${escapeHtml(money(selected.summary.minimumProjectedBalance))}</strong><small>${selected.summary.minimumProjectedMonth ? escapeHtml(monthLabel(selected.summary.minimumProjectedMonth, true)) : 'Saldo atual é a menor referência'}</small></div>
      <div><span>Meses sob atenção</span><strong>${selected.summary.monthsAtRisk}</strong><small>${selected.summary.firstNegativeMonth ? `Primeiro negativo: ${escapeHtml(monthLabel(selected.summary.firstNegativeMonth))}` : 'Sem mês negativo'}</small></div>
      <div><span>Impacto do “e se”</span><strong class="${simulationImpact < 0 ? 'negative' : simulationImpact > 0 ? 'positive' : ''}">${escapeHtml(signedMoney(simulationImpact))}</strong><small>${escapeHtml(simulationLabel(simulation))}</small></div>
    </div>

    ${monthlyStrip(base, selected)}

    <div class="px-scenario-simulator-box">
      <div class="px-scenario-simulator-title"><div><span>Teste uma decisão antes de lançar</span><strong>Simulação instantânea</strong></div>${simulation ? '<button type="button" data-sim-clear>Limpar ajuste</button>' : ''}</div>
      <div class="px-scenario-kind">
        <select data-sim-kind>
          <option value="card" ${simulatorKind === 'card' ? 'selected' : ''}>Compra no cartão</option>
          <option value="expense" ${simulatorKind === 'expense' ? 'selected' : ''}>Nova despesa</option>
          <option value="income" ${simulatorKind === 'income' ? 'selected' : ''}>Receita extra</option>
          <option value="move" ${simulatorKind === 'move' ? 'selected' : ''}>Antecipar compromisso</option>
        </select>
        <span>${simulatorKind === 'card' ? 'Informe o primeiro vencimento; o sistema não adivinha fechamento de cartão nesta simulação.' : simulatorKind === 'move' ? 'Move somente o impacto de caixa entre meses; não baixa nem altera o compromisso original.' : 'O valor entra apenas no cenário e desaparece ao limpar.'}</span>
      </div>
      <div class="px-scenario-form">${simulatorFields(source)}<button type="button" data-sim-apply>Simular impacto</button></div>
      <div class="px-scenario-error" data-scenario-error></div>
    </div>

    <div class="px-scenario-foot"><div><span>Entradas no horizonte</span><strong>${escapeHtml(money(selected.summary.totalIncome))}</strong></div><div><span>Compromissos no horizonte</span><strong>${escapeHtml(money(selected.summary.totalExpenses))}</strong></div><div><span>Ponto de maior pressão</span><strong>${weakest ? `${escapeHtml(monthLabel(weakest.month))} · ${escapeHtml(money(weakest.projectedBalance))}` : '—'}</strong></div></div>
  </section>`;
}

function removePanel() {
  document.querySelector('[data-home-scenario-simulator]')?.remove();
}

function render() {
  if (!forecast || !isHomeDashboard()) return;
  const anchor = document.querySelector<HTMLElement>('[data-home-commitment-forecast]')
    || document.querySelector<HTMLElement>('.px-metrics');
  if (!anchor) return;
  removePanel();
  anchor.insertAdjacentHTML('afterend', panelHtml(forecast));
  bindPanel();
}

function readPositive(selector: string) {
  const input = document.querySelector<HTMLInputElement>(selector);
  const value = Number(input?.value || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function showError(message: string) {
  const target = document.querySelector<HTMLElement>('[data-scenario-error]');
  if (target) target.textContent = message;
}

function applySimulation() {
  if (!forecast) return;
  const amount = readPositive('[data-sim-amount]');
  if (amount <= 0) return showError('Informe um valor maior que zero.');
  if (simulatorKind === 'card') {
    const installments = Math.max(1, Math.min(24, Math.trunc(readPositive('[data-sim-installments]') || 1)));
    const month = document.querySelector<HTMLSelectElement>('[data-sim-month]')?.value || '';
    if (!month) return showError('Selecione o primeiro vencimento.');
    simulation = { kind: 'card', amount, installments, month };
  } else if (simulatorKind === 'expense' || simulatorKind === 'income') {
    const month = document.querySelector<HTMLSelectElement>('[data-sim-month]')?.value || '';
    if (!month) return showError('Selecione o mês do impacto.');
    simulation = simulatorKind === 'expense' ? { kind: 'expense', amount, month } : { kind: 'income', amount, month };
  } else {
    const fromMonth = document.querySelector<HTMLSelectElement>('[data-sim-from]')?.value || '';
    const toMonth = document.querySelector<HTMLSelectElement>('[data-sim-to]')?.value || '';
    if (!fromMonth || !toMonth) return showError('Selecione os dois meses.');
    if (fromMonth === toMonth) return showError('Origem e destino precisam ser meses diferentes.');
    simulation = { kind: 'move', amount, fromMonth, toMonth };
  }
  render();
}

function bindPanel() {
  document.querySelectorAll<HTMLButtonElement>('[data-scenario-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.scenarioMode as ScenarioMode | undefined;
      if (!next || next === mode) return;
      mode = next;
      render();
    });
  });
  document.querySelector<HTMLSelectElement>('[data-sim-kind]')?.addEventListener('change', (event) => {
    const next = (event.currentTarget as HTMLSelectElement).value as Simulation['kind'];
    simulatorKind = next;
    simulation = null;
    render();
  });
  document.querySelector<HTMLButtonElement>('[data-sim-apply]')?.addEventListener('click', applySimulation);
  document.querySelector<HTMLButtonElement>('[data-sim-clear]')?.addEventListener('click', () => {
    simulation = null;
    render();
  });
}

async function load(force = false) {
  if (!isHomeDashboard()) {
    loadedKey = '';
    loadingKey = '';
    forecast = null;
    simulation = null;
    removePanel();
    return;
  }
  const month = activeMonth();
  const key = `${month}|${HORIZON_MONTHS}`;
  if (!force && loadedKey === key && forecast) {
    if (!document.querySelector('[data-home-scenario-simulator]')) render();
    return;
  }
  if (!force && loadingKey === key) return;
  loadingKey = key;
  const serial = ++requestSerial;
  try {
    const cached = !force ? cache.get(key) : null;
    const result = cached || await authenticatedRequest<CommitmentForecast>(`/finance/commitment-forecast?from=${encodeURIComponent(month)}&months=${HORIZON_MONTHS}`);
    if (serial !== requestSerial || !isHomeDashboard() || activeMonth() !== month) return;
    cache.set(key, result);
    forecast = result;
    loadedKey = key;
    simulation = null;
    render();
  } catch {
    // Simulador é apenas uma camada analítica; a Home continua funcional se a leitura preditiva estiver indisponível.
  } finally {
    if (loadingKey === key) loadingKey = '';
  }
}

function schedule(force = false) {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void load(force);
  }, 140);
}

function invalidate() {
  cache.clear();
  loadedKey = '';
  forecast = null;
  simulation = null;
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
