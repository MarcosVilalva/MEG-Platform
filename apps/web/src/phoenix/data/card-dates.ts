export function cardMonthPlus(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function validCardDayInMonth(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Math.max(1, Math.min(last, Number(day || 1)));
}

export function nextWeekdayCardDueDate(isoDay: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay;
  const date = new Date(`${isoDay}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return isoDay;
  const weekday = date.getUTCDay();
  if (weekday === 6) date.setUTCDate(date.getUTCDate() + 2);
  else if (weekday === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function cardDueDateForStatement(statementMonth: string, closingDay: number, dueDay: number) {
  const dueMonth = dueDay <= closingDay ? cardMonthPlus(statementMonth, 1) : statementMonth;
  const safeDay = validCardDayInMonth(dueMonth, dueDay);
  return nextWeekdayCardDueDate(`${dueMonth}-${String(safeDay).padStart(2, '0')}`);
}

export function cardStatementMonthForPurchase(purchaseDate: string, closingDay: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) return '';
  const purchaseMonth = purchaseDate.slice(0, 7);
  const purchaseDay = Number(purchaseDate.slice(8, 10));
  return cardMonthPlus(purchaseMonth, purchaseDay > closingDay ? 1 : 0);
}

export function cardDueDateForPurchase(purchaseDate: string, closingDay: number, dueDay: number) {
  const statementMonth = cardStatementMonthForPurchase(purchaseDate, closingDay);
  return statementMonth ? cardDueDateForStatement(statementMonth, closingDay, dueDay) : '';
}

export function cardCompetenceFromDueDate(dueDate: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate.slice(0, 7) : '';
}
