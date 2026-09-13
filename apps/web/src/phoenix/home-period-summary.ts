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
