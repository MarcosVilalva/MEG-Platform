const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(value) {
  const match = String(value || '').match(ISO_DATE_PATTERN);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const maximum = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > maximum) return null;
  return { year, month, day };
}

export function formatIsoDate(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addMonthsClamped(value, offset = 1) {
  const parsed = parseIsoDate(value);
  if (!parsed) return '';
  const monthIndex = parsed.month - 1 + Number(offset || 0);
  const targetYear = parsed.year + Math.floor(monthIndex / 12);
  const normalizedMonthIndex = ((monthIndex % 12) + 12) % 12;
  const targetMonth = normalizedMonthIndex + 1;
  const maximumDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return formatIsoDate(targetYear, targetMonth, Math.min(parsed.day, maximumDay));
}

export function normalizeRecurrenceCount(value, { minimum = 2, maximum = 24 } = {}) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(Math.max(parsed, minimum), maximum);
}

export function buildMonthlySchedule(firstDate, count) {
  const normalizedCount = normalizeRecurrenceCount(count);
  if (!parseIsoDate(firstDate)) return [];
  return Array.from({ length: normalizedCount }, (_, index) => addMonthsClamped(firstDate, index));
}

export function weekdayShortPt(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) return '';
  const labels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  return labels[new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)).getUTCDay()];
}

export function normalizeModality(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function isInstallmentModality(value) {
  const modality = normalizeModality(value);
  return modality === 'CREDITO' || modality === 'CREDIARIO';
}
