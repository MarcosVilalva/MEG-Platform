export const MEG_TIME_ZONE = "America/Sao_Paulo";

function calendarParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Data de calendÃ¡rio invÃ¡lida: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function dateInTimeZone(reference = new Date(), timeZone = MEG_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const read = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function monthInTimeZone(reference = new Date(), timeZone = MEG_TIME_ZONE) {
  return dateInTimeZone(reference, timeZone).slice(0, 7);
}

export function addCalendarDays(value, days) {
  const { year, month, day } = calendarParts(value);
  const date = new Date(Date.UTC(year, month - 1, day + Number(days || 0), 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function lastCalendarDayOfMonth(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error(`MÃªs de calendÃ¡rio invÃ¡lido: ${value}`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function calendarDaysBetween(start, end) {
  const left = calendarParts(start);
  const right = calendarParts(end);
  return Math.round((Date.UTC(right.year, right.month - 1, right.day, 12) - Date.UTC(left.year, left.month - 1, left.day, 12)) / 86400000);
}
