import type { FinancialEvent } from '@shared';
import { groupByAmount } from '../insights/insights';

export interface AnalyticsQuestion {
  id: string;
  question: string;
  answer: string;
  value?: number;
}

export function buildAnalyticsQuestions(events: FinancialEvent[], month: string): AnalyticsQuestion[] {
  const monthEvents = events.filter((event) => event.competence === month);
  const expenses = monthEvents.filter((event) => event.signedAmount < 0);
  const income = monthEvents.filter((event) => event.signedAmount > 0);
  const totalExpense = expenses.reduce((sum, event) => sum + Math.abs(event.signedAmount), 0);
  const totalIncome = income.reduce((sum, event) => sum + event.signedAmount, 0);
  const topGroup = groupByAmount(expenses, 'group')[0];
  const topPayment = groupByAmount(expenses, 'paymentMethod')[0];

  return [
    {
      id: 'where-money-went',
      question: 'Onde meu dinheiro foi?',
      answer: topGroup
        ? `${topGroup.name} foi o maior grupo de despesa.`
        : 'Ainda não há despesas suficientes no mês.',
      value: topGroup?.amount
    },
    {
      id: 'income-expense-relation',
      question: 'Receitas cobrem despesas?',
      answer:
        totalIncome >= totalExpense
          ? 'As receitas do mês cobrem as despesas registradas.'
          : 'As despesas registradas superam as receitas do mês.',
      value: totalIncome - totalExpense
    },
    {
      id: 'payment-pressure',
      question: 'Qual forma de pagamento mais pesa?',
      answer: topPayment
        ? `${topPayment.name} concentra o maior volume de pagamentos.`
        : 'Ainda não há forma de pagamento dominante.',
      value: topPayment?.amount
    }
  ];
}
