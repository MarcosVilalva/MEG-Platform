import type { FinancialEvent } from '@shared';
import { groupByAmount } from '../insights/insights';

export interface MonthSummary {
  month: string;
  income: number;
  expense: number;
  result: number;
  eventCount: number;
}

export interface ParetoItem {
  name: string;
  amount: number;
  percent: number;
  cumulativePercent: number;
}

export interface Analytics360 {
  selectedMonth: string;
  monthSummary: MonthSummary;
  previousMonthSummary?: MonthSummary;
  monthDelta?: {
    income: number;
    expense: number;
    result: number;
  };
  paretoByGroup: ParetoItem[];
  byPaymentMethod: Array<{ name: string; amount: number }>;
  dailyAverageExpense: number;
  executiveReading: string[];
}

export function summarizeMonth(events: FinancialEvent[], month: string): MonthSummary {
  const monthEvents = events.filter((event) => event.competence === month);
  const income = monthEvents
    .filter((event) => event.signedAmount > 0)
    .reduce((sum, event) => sum + event.signedAmount, 0);
  const expense = monthEvents
    .filter((event) => event.signedAmount < 0)
    .reduce((sum, event) => sum + Math.abs(event.signedAmount), 0);

  return {
    month,
    income,
    expense,
    result: income - expense,
    eventCount: monthEvents.length
  };
}

export function previousMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildPareto(items: Array<{ name: string; amount: number }>): ParetoItem[] {
  const total = items.reduce((sum, item) => sum + item.amount, 0) || 1;
  let cumulative = 0;

  return items.map((item) => {
    const percent = (item.amount / total) * 100;
    cumulative += percent;

    return {
      ...item,
      percent,
      cumulativePercent: cumulative
    };
  });
}

export function buildAnalytics360(events: FinancialEvent[], selectedMonth: string): Analytics360 {
  const monthSummary = summarizeMonth(events, selectedMonth);
  const prevMonth = previousMonth(selectedMonth);
  const previousMonthSummary = summarizeMonth(events, prevMonth);
  const monthEvents = events.filter((event) => event.competence === selectedMonth);
  const expenses = monthEvents.filter((event) => event.signedAmount < 0);

  const byGroup = groupByAmount(expenses, 'group');
  const byPaymentMethod = groupByAmount(expenses, 'paymentMethod');
  const paretoByGroup = buildPareto(byGroup);

  const daysWithExpense = new Set(expenses.map((event) => event.date.slice(0, 10))).size || 1;
  const dailyAverageExpense = monthSummary.expense / daysWithExpense;

  const monthDelta = {
    income: monthSummary.income - previousMonthSummary.income,
    expense: monthSummary.expense - previousMonthSummary.expense,
    result: monthSummary.result - previousMonthSummary.result
  };

  const executiveReading: string[] = [];

  if (monthSummary.result >= 0) {
    executiveReading.push('O mês está fechando positivo considerando receitas e despesas registradas.');
  } else {
    executiveReading.push('O mês está fechando negativo. Revise despesas previstas e concentração de gastos.');
  }

  if (monthDelta.expense > 0) {
    executiveReading.push('As despesas aumentaram em relação ao mês anterior.');
  } else if (monthDelta.expense < 0) {
    executiveReading.push('As despesas reduziram em relação ao mês anterior.');
  }

  if (paretoByGroup[0]) {
    executiveReading.push(`${paretoByGroup[0].name} é o principal grupo de despesa do mês.`);
  }

  if (byPaymentMethod[0]) {
    executiveReading.push(`${byPaymentMethod[0].name} é a forma de pagamento com maior impacto.`);
  }

  return {
    selectedMonth,
    monthSummary,
    previousMonthSummary,
    monthDelta,
    paretoByGroup,
    byPaymentMethod,
    dailyAverageExpense,
    executiveReading
  };
}
