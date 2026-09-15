import type { FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from './contracts';

export type PhoenixAllTimeHomeSummary = {
  firstDate: string | null;
  lastDate: string | null;
  eventCount: number;
  monetaryEventCount: number;
  currentMonetaryBalance: number;
  recordedIncome: number;
  recordedExpense: number;
  realizedIncome: number;
  realizedExpense: number;
  realizedResult: number;
  plannedIncome: number;
  plannedExpense: number;
  actionableCommitmentCount: number;
  freeAfterCommitments: number;
  projectedAfterPlanned: number;
  benefitBalance: number;
  benefitCredits: number;
  benefitUsed: number;
};

export type PhoenixHorizonSummary = {
  targetMonth: string;
  cutoffDate: string;
  currentMonetaryBalance: number;
  pendingExpense: number;
  pendingIncome: number;
  actionableCommitmentCount: number;
  plannedIncomeCount: number;
  freeAfterCommitments: number;
  projectedClosing: number;
  minimumProjectedBalance: number;
  minimumProjectedDate: string | null;
  firstNegativeDate: string | null;
  overdueExpense: number;
  overdueCount: number;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function signedAmount(event: FinancialEvent) {
  const value = Number(event.signedAmount);
  return Number.isFinite(value) ? value : 0;
}

function isPosted(event: FinancialEvent) {
  return ['paid', 'reconciled', 'confirmed'].includes(event.status);
}

function isIncomeLike(event: FinancialEvent) {
  return event.type === 'income' || event.type === 'redemption';
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

export function isPhoenixBenefitEvent(event: FinancialEvent) {
  return normalize(event.account?.type) === 'BENEFIT'
    || normalize(event.paymentMethod?.name) === 'VEROCARD'
    || normalize(event.description).includes('VEROCARD');
}

export function isPhoenixMonetaryEvent(event: FinancialEvent) {
  return event.type !== 'transfer' && !isPhoenixBenefitEvent(event);
}

/**
 * Consolidação da Home no modo Tudo.
 *
 * O read model base precisa ser o mês atual: assim o saldo realizado continua sendo
 * a fotografia canônica de hoje, enquanto os eventos completos explicam toda a trajetória.
 * Valores registrados incluem planejados; valores realizados incluem apenas posted.
 */
export function buildPhoenixAllTimeHomeSummary(data: PhoenixReadModel): PhoenixAllTimeHomeSummary {
  const items = data.events.items;
  const monetary = items.filter(isPhoenixMonetaryEvent);
  const benefits = items.filter(isPhoenixBenefitEvent);
  const dates = items
    .map((event) => String(event.date).slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();

  let recordedIncome = 0;
  let recordedExpense = 0;
  let realizedIncome = 0;
  let realizedExpense = 0;
  let plannedIncome = 0;
  let plannedExpense = 0;
  let actionableCommitmentCount = 0;

  for (const event of monetary) {
    const signed = signedAmount(event);
    const incomeLike = isIncomeLike(event);
    if (incomeLike) recordedIncome += signed;
    else recordedExpense += -signed;

    if (isPosted(event)) {
      if (incomeLike) realizedIncome += signed;
      else realizedExpense += -signed;
    }

    if (event.status === 'planned') {
      if (incomeLike) plannedIncome += signed;
      else {
        plannedExpense += -signed;
        if (signed < 0) actionableCommitmentCount += 1;
      }
    }
  }

  let benefitCredits = 0;
  let benefitUsed = 0;
  for (const event of benefits) {
    if (!isPosted(event)) continue;
    const signed = signedAmount(event);
    if (signed >= 0) benefitCredits += signed;
    else benefitUsed += -signed;
  }

  const currentMonetaryBalance = Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);
  const freeAfterCommitments = currentMonetaryBalance - plannedExpense;
  const projectedAfterPlanned = currentMonetaryBalance + plannedIncome - plannedExpense;

  return {
    firstDate: dates[0] || null,
    lastDate: dates[dates.length - 1] || null,
    eventCount: items.length,
    monetaryEventCount: monetary.length,
    currentMonetaryBalance: round(currentMonetaryBalance),
    recordedIncome: round(recordedIncome),
    recordedExpense: round(recordedExpense),
    realizedIncome: round(realizedIncome),
    realizedExpense: round(realizedExpense),
    realizedResult: round(realizedIncome - realizedExpense),
    plannedIncome: round(plannedIncome),
    plannedExpense: round(plannedExpense),
    actionableCommitmentCount,
    freeAfterCommitments: round(freeAfterCommitments),
    projectedAfterPlanned: round(projectedAfterPlanned),
    benefitBalance: round(Number(data.summary.benefitBalance || 0)),
    benefitCredits: round(benefitCredits),
    benefitUsed: round(benefitUsed)
  };
}

/**
 * Horizonte financeiro para um mês futuro.
 *
 * O saldo monetário atual permanece a fotografia realizada do mês corrente.
 * O horizonte agrega somente eventos monetários ainda planejados com vencimento até
 * o último dia do mês selecionado. Despesas planejadas positivas (estornos/ajustes)
 * reduzem o compromisso líquido; receitas planejadas só entram na projeção, nunca no
 * dinheiro livre após compromissos.
 */
export function buildPhoenixHorizonSummary(
  current: PhoenixReadModel,
  events: FinancialEvent[],
  targetMonth: string,
  today: string
): PhoenixHorizonSummary {
  const cutoffDate = monthEnd(targetMonth);
  const currentMonetaryBalance = Number(current.summary.availableBalance || 0) + Number(current.summary.realizedResult || 0);
  const planned = events
    .filter(isPhoenixMonetaryEvent)
    .filter((event) => event.status === 'planned')
    .filter((event) => String(event.date).slice(0, 10) <= cutoffDate);

  let pendingExpense = 0;
  let pendingIncome = 0;
  let actionableCommitmentCount = 0;
  let plannedIncomeCount = 0;
  let overdueExpense = 0;
  let overdueCount = 0;
  const byDate = new Map<string, number>();

  for (const event of planned) {
    const signed = signedAmount(event);
    const date = String(event.date).slice(0, 10);
    const incomeLike = isIncomeLike(event);

    if (incomeLike) {
      pendingIncome += signed;
      if (signed > 0) plannedIncomeCount += 1;
    } else {
      pendingExpense += -signed;
      if (signed < 0) {
        actionableCommitmentCount += 1;
        if (date < today) {
          overdueExpense += -signed;
          overdueCount += 1;
        }
      }
    }

    const effectiveDate = date < today ? today : date;
    byDate.set(effectiveDate, (byDate.get(effectiveDate) || 0) + signed);
  }

  const freeAfterCommitments = currentMonetaryBalance - pendingExpense;
  const projectedClosing = currentMonetaryBalance + pendingIncome - pendingExpense;
  let running = currentMonetaryBalance;
  let minimumProjectedBalance = currentMonetaryBalance;
  let minimumProjectedDate: string | null = null;
  let firstNegativeDate: string | null = currentMonetaryBalance < 0 ? today : null;

  for (const [date, delta] of [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    running += delta;
    if (running < minimumProjectedBalance) {
      minimumProjectedBalance = running;
      minimumProjectedDate = date;
    }
    if (!firstNegativeDate && running < 0) firstNegativeDate = date;
  }

  return {
    targetMonth,
    cutoffDate,
    currentMonetaryBalance: round(currentMonetaryBalance),
    pendingExpense: round(pendingExpense),
    pendingIncome: round(pendingIncome),
    actionableCommitmentCount,
    plannedIncomeCount,
    freeAfterCommitments: round(freeAfterCommitments),
    projectedClosing: round(projectedClosing),
    minimumProjectedBalance: round(minimumProjectedBalance),
    minimumProjectedDate,
    firstNegativeDate,
    overdueExpense: round(overdueExpense),
    overdueCount
  };
}
