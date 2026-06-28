import type { FinancialEvent, MonthProjection } from '@shared';

export interface FinancialInsight {
  level: 'good' | 'warning' | 'danger' | 'action';
  title: string;
  message: string;
}

export function groupByAmount(events: FinancialEvent[], field: keyof FinancialEvent) {
  const map = new Map<string, number>();

  events.forEach((event) => {
    const key = String(event[field] || 'Não informado');
    map.set(key, (map.get(key) || 0) + Math.abs(event.signedAmount));
  });

  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function generateFinancialInsights(
  projection: MonthProjection,
  events: FinancialEvent[]
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  insights.push({
    level: projection.closingBalance >= 0 ? 'good' : 'danger',
    title: projection.closingBalance >= 0 ? 'Fechamento positivo' : 'Fechamento em risco',
    message:
      projection.closingBalance >= 0
        ? 'A projeção do mês está positiva.'
        : 'A projeção indica saldo negativo no fechamento.'
  });

  const expenses = events.filter((event) => event.signedAmount < 0);
  const topGroup = groupByAmount(expenses, 'group')[0];

  if (topGroup) {
    insights.push({
      level: 'warning',
      title: 'Maior grupo de gasto',
      message: `${topGroup.name} concentra o maior volume de despesas.`
    });
  }

  const plannedExpenses = expenses.filter((event) => event.status === 'planned');

  if (plannedExpenses.length) {
    insights.push({
      level: 'action',
      title: 'Pendências abertas',
      message: `Existem ${plannedExpenses.length} despesas previstas ainda não pagas.`
    });
  }

  return insights;
}
