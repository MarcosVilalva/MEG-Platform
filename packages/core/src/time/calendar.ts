export const MEG_TIME_ZONE = 'America/Sao_Paulo';

export function dateInSaoPaulo(reference = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MEG_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(reference);
  const read = (type: 'year' | 'month' | 'day') => parts.find((part) => part.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function utcDay(value: string): number {
  const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid calendar date: ${value}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

export function calendarDayDifference(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / 86400000);
}
