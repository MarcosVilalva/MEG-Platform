function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function isBenefitPaymentMethod(name: unknown) {
  return normalizeText(name) === 'VEROCARD';
}

export function isMonetaryAccountType(type: unknown) {
  return ['CHECKING', 'SAVINGS', 'CASH'].includes(normalizeText(type));
}

export function isBenefitFinancialEvent(event: {
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return normalizeText(event.account?.type) === 'BENEFIT'
    || isBenefitPaymentMethod(event.paymentMethod?.name)
    || normalizeText(event.description).includes('VEROCARD');
}

export function isPostedFinancialStatus(status: string) {
  return status === 'paid' || status === 'reconciled' || status === 'confirmed';
}

export function isMonetaryFinancialEvent(event: {
  type: string;
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return event.type !== 'transfer' && !isBenefitFinancialEvent(event);
}

export function countsTowardMonetaryBalance(event: {
  type: string;
  status: string;
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}) {
  return isMonetaryFinancialEvent(event) && isPostedFinancialStatus(event.status);
}

export function summarizeMonetaryEvents(events: Array<{
  type: string;
  status: string;
  signedAmount: number | string | { toString(): string };
  description?: unknown;
  paymentMethod?: { name?: unknown } | null;
  account?: { type?: unknown } | null;
}>) {
  let income = 0;
  let expense = 0;
  let realizedIncome = 0;
  let realizedExpense = 0;
  let eventCount = 0;

  for (const event of events) {
    if (!isMonetaryFinancialEvent(event)) continue;
    const signed = Number(event.signedAmount);
    if (!Number.isFinite(signed)) continue;
    eventCount += 1;
    const incomeLike = event.type === 'income' || event.type === 'redemption';
    if (incomeLike) income += signed;
    else expense += -signed;
    if (!isPostedFinancialStatus(event.status)) continue;
    if (incomeLike) realizedIncome += signed;
    else realizedExpense += -signed;
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    income: round(income),
    expense: round(expense),
    projectedResult: round(income - expense),
    realizedIncome: round(realizedIncome),
    realizedExpense: round(realizedExpense),
    realizedResult: round(realizedIncome - realizedExpense),
    eventCount,
  };
}

export function paymentBalanceDecision(available: number, requested: number) {
  const availableCents = Math.round(Number(available || 0) * 100);
  const requestedCents = Math.round(Number(requested || 0) * 100);
  return {
    allowed: requestedCents <= availableCents,
    available: availableCents / 100,
    requested: requestedCents / 100,
    missing: Math.max(0, requestedCents - availableCents) / 100,
  };
}
