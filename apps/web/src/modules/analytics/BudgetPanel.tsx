import { normalizeEvents } from '@core/finance/events';
import { calculateBudgetAlerts } from '@core/finance/financial-engine';
import { MEGCard } from '@ui';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const budgets: Record<string, number> = {
  Alimentação: 1200,
  Transporte: 800,
  Moradia: 1500,
  Cartão: 2500
};

export function BudgetPanel() {
  const { transactions, selectedMonth } = useAppStore();
  const alerts = calculateBudgetAlerts(normalizeEvents(transactions), selectedMonth, budgets);

  return (
    <MEGCard title="Orçamento por grupo" eyebrow="Alpha 0.4">
      <div className="budget-list">
        {alerts.map((alert) => (
          <div className={`budget-row ${alert.status}`} key={alert.group}>
            <div>
              <strong>{alert.group}</strong>
              <small>{brl.format(alert.used)} de {brl.format(alert.budget)}</small>
            </div>
            <div className="budget-track">
              <i style={{ width: `${Math.min(100, alert.percent)}%` }} />
            </div>
            <strong>{alert.percent.toFixed(1).replace('.', ',')}%</strong>
          </div>
        ))}
      </div>
    </MEGCard>
  );
}
