import type { FinancialEvent } from '@shared';
import { calculateOpeningBalance } from '../projections/cashflow';

export interface ReplayStep {
  date: string;
  title: string;
  description: string;
  amount: number;
  balanceAfter: number;
  kind: 'opening' | 'income' | 'expense' | 'neutral';
}

export function buildFinancialReplay(events: FinancialEvent[], month: string): ReplayStep[] {
  const opening = calculateOpeningBalance(events, month);
  let balance = opening;

  const steps: ReplayStep[] = [
    {
      date: `${month}-01`,
      title: 'Saldo inicial',
      description: 'Saldo transportado do período anterior.',
      amount: opening,
      balanceAfter: opening,
      kind: 'opening'
    }
  ];

  events
    .filter((event) => event.competence === month)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((event) => {
      balance += event.signedAmount;

      steps.push({
        date: event.date,
        title: event.description,
        description: `${event.group || 'Não informado'} • ${event.paymentMethod || 'Sem forma'}`,
        amount: event.signedAmount,
        balanceAfter: balance,
        kind: event.signedAmount > 0 ? 'income' : event.signedAmount < 0 ? 'expense' : 'neutral'
      });
    });

  return steps;
}
