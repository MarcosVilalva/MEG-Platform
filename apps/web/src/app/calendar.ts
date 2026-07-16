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

export function monthInSaoPaulo(reference = new Date()): string {
  return dateInSaoPaulo(reference).slice(0, 7);
}
