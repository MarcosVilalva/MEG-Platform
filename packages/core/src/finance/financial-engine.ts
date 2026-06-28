import type { FinancialEvent } from '@shared';
import { calculateMonthProjection, projectDailyCashflow } from '../projections/cashflow';
import { buildFinancialAgenda } from '../projections/agenda';
import { groupByAmount } from '../insights/insights';

export interface FinancialEngineResult {
  month: string;
  availableCash: number;
  projectedClosing: number;
  income: number;
  expense: number;
  openCommitments: number;
  openCommitmentsAmount: number;
  nextDue?: {
    id: string;
    description: string;
    date: string;
    amount: number;
  };
  topExpenseGroup?: {
    name: string;
    amount: number;
  };
  dailyCashflow: ReturnType<typeof projectDailyCashflow>;
}

export function runFinancialEngine(
  events: FinancialEvent[],
  month: string,
  today = new Date().toISOString().slice(0, 10)
): FinancialEngineResult {
  const projection = calculateMonthProjection(events, month);
  const monthEvents = events.filter((event) => event.competence === month);
  const agenda = buildFinancialAgenda(monthEvents, today);
  const expenses = monthEvents.filter((event) => event.signedAmount < 0);
  const topGroup = groupByAmount(expenses, 'group')[0];

  const openCommitmentsAmount = agenda.reduce(
    (sum, item) => sum + Math.abs(item.event.signedAmount),
    0
  );

  const next = agenda[0]?.event;

  return {
    month,
    availableCash: projection.openingBalance + projection.income,
    projectedClosing: projection.closingBalance,
    income: projection.income,
    expense: projection.expense,
    openCommitments: agenda.length,
    openCommitmentsAmount,
    nextDue: next
      ? {
          id: next.id,
          description: next.description,
          date: next.date,
          amount: Math.abs(next.signedAmount)
        }
      : undefined,
    topExpenseGroup: topGroup,
    dailyCashflow: projectDailyCashflow(events, month)
  };
}

export interface BudgetAlert {
  group: string;
  budget: number;
  used: number;
  percent: number;
  status: 'ok' | 'warning' | 'danger';
}

export function calculateBudgetAlerts(
  events: FinancialEvent[],
  month: string,
  budgets: Record<string, number>
): BudgetAlert[] {
  const monthExpenses = events.filter(
    (event) => event.competence === month && event.signedAmount < 0
  );

  return Object.entries(budgets).map(([group, budget]) => {
    const used = monthExpenses
      .filter((event) => (event.group || 'Não informado') === group)
      .reduce((sum, event) => sum + Math.abs(event.signedAmount), 0);

    const percent = budget > 0 ? (used / budget) * 100 : 0;

    return {
      group,
      budget,
      used,
      percent,
      status: percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'ok'
    };
  });
}
