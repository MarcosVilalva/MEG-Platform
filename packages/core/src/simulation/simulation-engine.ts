import type { FinancialEvent } from '@shared';
import { runFinancialEngine } from '../finance/financial-engine';
import { dateInSaoPaulo } from '../time/calendar';

export interface SimulationScenario {
  id: string;
  name: string;
  description?: string;
  addEvents?: FinancialEvent[];
  removeEventIds?: string[];
  updateEvents?: Array<Partial<FinancialEvent> & { id: string }>;
}

export interface SimulationResult {
  scenario: SimulationScenario;
  before: ReturnType<typeof runFinancialEngine>;
  after: ReturnType<typeof runFinancialEngine>;
  delta: {
    availableCash: number;
    projectedClosing: number;
    expense: number;
    income: number;
  };
}

export function applyScenario(events: FinancialEvent[], scenario: SimulationScenario): FinancialEvent[] {
  let next = events.filter((event) => !scenario.removeEventIds?.includes(event.id));

  if (scenario.updateEvents?.length) {
    next = next.map((event) => {
      const update = scenario.updateEvents?.find((item) => item.id === event.id);
      return update ? { ...event, ...update } : event;
    });
  }

  if (scenario.addEvents?.length) {
    next = [...scenario.addEvents, ...next];
  }

  return next;
}

export function simulateScenario(
  events: FinancialEvent[],
  month: string,
  scenario: SimulationScenario,
  today = dateInSaoPaulo()
): SimulationResult {
  const before = runFinancialEngine(events, month, today);
  const afterEvents = applyScenario(events, scenario);
  const after = runFinancialEngine(afterEvents, month, today);

  return {
    scenario,
    before,
    after,
    delta: {
      availableCash: after.availableCash - before.availableCash,
      projectedClosing: after.projectedClosing - before.projectedClosing,
      expense: after.expense - before.expense,
      income: after.income - before.income
    }
  };
}

export function createPurchaseScenario(params: {
  id: string;
  name: string;
  amount: number;
  date: string;
  account?: string;
  group?: string;
  category?: string;
  paymentMethod?: string;
}): SimulationScenario {
  return {
    id: params.id,
    name: params.name,
    description: `Simulação de compra: ${params.name}`,
    addEvents: [
      {
        id: `scenario-${params.id}`,
        type: 'expense',
        status: 'planned',
        date: params.date,
        competence: params.date.slice(0, 7),
        description: params.name,
        amount: params.amount,
        signedAmount: -Math.abs(params.amount),
        account: params.account || 'Santander',
        group: params.group || 'Simulações',
        category: params.category || 'Compra planejada',
        paymentMethod: params.paymentMethod || 'Cartão de crédito',
        tags: ['simulacao']
      }
    ]
  };
}
