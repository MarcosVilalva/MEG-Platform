export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

export function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function isBenefitPaymentMethod(name: unknown) {
  return normalizeText(name) === 'VEROCARD';
}

export function isBenefitFinancialEvent(event: { description?: unknown; paymentMethod?: { name?: unknown } | null }) {
  return isBenefitPaymentMethod(event.paymentMethod?.name) || normalizeText(event.description).includes('VEROCARD');
}

export function parseIsoDay(value: string) {
  const match = String(value || '').match(ISO_DAY);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const maximum = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > maximum) return null;
  return { year, month, day };
}

export function formatIsoDay(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addMonthsClamped(value: string, offset = 1, anchorDay?: number) {
  const parsed = parseIsoDay(value);
  if (!parsed) return '';
  const monthIndex = parsed.month - 1 + offset;
  const targetYear = parsed.year + Math.floor(monthIndex / 12);
  const normalizedIndex = ((monthIndex % 12) + 12) % 12;
  const targetMonth = normalizedIndex + 1;
  const maximum = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const wantedDay = Math.max(1, Math.min(31, anchorDay || parsed.day));
  return formatIsoDay(targetYear, targetMonth, Math.min(wantedDay, maximum));
}

export function addRecurringPeriod(value: string, frequency: RecurrenceFrequency, anchorDay?: number) {
  const parsed = parseIsoDay(value);
  if (!parsed) return '';
  if (frequency === 'weekly') {
    const next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 7));
    return formatIsoDay(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  }
  return addMonthsClamped(value, frequency === 'yearly' ? 12 : 1, anchorDay);
}

export function recurrenceEndDate(firstDueDate: string, frequency: RecurrenceFrequency, occurrenceCount: number) {
  const parsed = parseIsoDay(firstDueDate);
  if (!parsed || !Number.isInteger(occurrenceCount) || occurrenceCount < 1) return '';
  let current = firstDueDate.slice(0, 10);
  for (let index = 1; index < occurrenceCount; index += 1) {
    current = addRecurringPeriod(current, frequency, parsed.day);
  }
  return current;
}

export function buildRecurringSchedule(input: {
  nextDueDate: string;
  frequency: RecurrenceFrequency;
  anchorDay: number;
  endDate?: string | null;
  horizonDate: string;
  maximumOccurrences?: number;
}) {
  const maximum = input.maximumOccurrences ?? 120;
  const horizon = input.endDate && input.endDate < input.horizonDate ? input.endDate : input.horizonDate;
  const dates: string[] = [];
  let current = input.nextDueDate.slice(0, 10);
  while (dates.length < maximum && current && current <= horizon) {
    dates.push(current);
    current = addRecurringPeriod(current, input.frequency, input.anchorDay);
  }
  const finished = Boolean(input.endDate && current > input.endDate);
  return { dates, nextDueDate: current, finished };
}

export function saoPauloDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

export function isFuturePaymentDay(paidAt: string, today = saoPauloDay()) {
  const day = paidAt.slice(0, 10);
  return Boolean(parseIsoDay(day) && day > today);
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
