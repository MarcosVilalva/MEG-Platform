import type { FinancialEvent } from '@shared';
import { buildFinancialAgenda } from '../projections/agenda';
import { runFinancialEngine } from '../finance/financial-engine';
import { groupByAmount } from '../insights/insights';

export type DecisionPriority = 'critical' | 'warning' | 'info' | 'good';
export type DecisionAction = 'pay' | 'analyze' | 'simulate' | 'review' | 'none';

export interface DecisionItem {
  id: string;
  priority: DecisionPriority;
  title: string;
  description: string;
  actionLabel?: string;
  action?: DecisionAction;
  eventId?: string;
}

export function buildDecisionCenter(
  events: FinancialEvent[],
  month: string,
  today = new Date().toISOString().slice(0, 10)
): DecisionItem[] {
  const engine = runFinancialEngine(events, month, today);
  const monthEvents = events.filter((event) => event.competence === month);
  const agenda = buildFinancialAgenda(monthEvents, today);
  const decisions: DecisionItem[] = [];

  agenda.slice(0, 5).forEach((item) => {
    decisions.push({
      id: `agenda-${item.event.id}`,
      priority: item.priority === 'critical' ? 'critical' : item.priority === 'today' ? 'warning' : 'info',
      title: item.event.description,
      description: `${item.reason} • ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(item.event.signedAmount))}`,
      actionLabel: item.priority === 'critical' || item.priority === 'today' ? 'Pagar agora' : 'Revisar',
      action: item.priority === 'critical' || item.priority === 'today' ? 'pay' : 'review',
      eventId: item.event.id
    });
  });

  if (engine.projectedClosing < 0) {
    decisions.push({
      id: 'negative-projection',
      priority: 'critical',
      title: 'Fechamento em risco',
      description: 'A projeção do mês indica saldo negativo. Revise despesas ou antecipe receitas.',
      actionLabel: 'Analisar fluxo',
      action: 'analyze'
    });
  }

  const topGroup = groupByAmount(
    monthEvents.filter((event) => event.signedAmount < 0),
    'group'
  )[0];

  if (topGroup && topGroup.amount > engine.expense * 0.35) {
    decisions.push({
      id: 'expense-concentration',
      priority: 'warning',
      title: 'Despesa concentrada',
      description: `${topGroup.name} representa uma fatia relevante das despesas do mês.`,
      actionLabel: 'Ver analytics',
      action: 'analyze'
    });
  }

  if (engine.projectedClosing > 0 && engine.openCommitments === 0) {
    decisions.push({
      id: 'possible-investment',
      priority: 'good',
      title: 'Sobra potencial',
      description: 'O mês está positivo e sem pendências críticas. Avalie reservar ou investir parte do saldo.',
      actionLabel: 'Simular decisão',
      action: 'simulate'
    });
  }

  if (!decisions.length) {
    decisions.push({
      id: 'all-good',
      priority: 'good',
      title: 'Nenhuma ação crítica',
      description: 'Não há pendências críticas no momento.',
      actionLabel: 'Continuar acompanhando',
      action: 'none'
    });
  }

  return decisions;
}
