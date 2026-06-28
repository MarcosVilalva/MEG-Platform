import type { FinancialEvent, MonthProjection } from '@shared';

export function monthKey(date: string): string {
  return String(date || '').slice(0, 7);
}

export function calculateOpeningBalance(events: FinancialEvent[], month: string): number {
  return events
    .filter((event) => monthKey(event.date) < month)
    .reduce((sum, event) => sum + Number(event.signedAmount || 0), 0);
}

export function calculateMonthProjection(events: FinancialEvent[], month: string): MonthProjection {
  const openingBalance = calculateOpeningBalance(events, month);
  const monthEvents = events.filter((event) => monthKey(event.date) === month);

  const income = monthEvents
    .filter((event) => event.signedAmount > 0)
    .reduce((sum, event) => sum + event.signedAmount, 0);

  const expense = monthEvents
    .filter((event) => event.signedAmount < 0)
    .reduce((sum, event) => sum + Math.abs(event.signedAmount), 0);

  return {
    month,
    openingBalance,
    income,
    expense,
    closingBalance: openingBalance + income - expense,
    eventCount: monthEvents.length
  };
}

export function projectDailyCashflow(events: FinancialEvent[], month: string) {
  const openingBalance = calculateOpeningBalance(events, month);
  let runningBalance = openingBalance;

  return events
    .filter((event) => monthKey(event.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => {
      runningBalance += event.signedAmount;
      return {
        date: event.date,
        event,
        runningBalance
      };
    });
}
