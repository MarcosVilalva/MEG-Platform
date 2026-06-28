import { normalizeEvents } from '@core/finance/events';
import { buildAnalytics360 } from '@core/analytics/analytics-360';
import { useAppStore } from '../../app/store';
import { MEGBadge, MEGCard, MEGMetric } from '@ui';
import { BudgetPanel } from './BudgetPanel';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatDelta(value: number) {
  if (value === 0) return 'sem variação';
  return `${value > 0 ? '+' : ''}${brl.format(value)}`;
}

export function Analytics() {
  const { transactions, selectedMonth } = useAppStore();
  const events = normalizeEvents(transactions);
  const analytics = buildAnalytics360(events, selectedMonth);
  const topPareto = analytics.paretoByGroup.slice(0, 6);
  const topPayment = analytics.byPaymentMethod.slice(0, 6);

  return (
    <section className="page">
      <header className="page-header analytics-hero">
        <div>
          <span>Analytics 360</span>
          <h1>Como seu dinheiro está se comportando?</h1>
          <p>Análise executiva, Pareto, formas de pagamento e comparativo mensal.</p>
        </div>
      </header>

      <section className="metric-grid">
        <MEGMetric
          label="Receitas"
          value={brl.format(analytics.monthSummary.income)}
          hint={`vs anterior: ${formatDelta(analytics.monthDelta?.income || 0)}`}
          tone="good"
        />
        <MEGMetric
          label="Despesas"
          value={brl.format(analytics.monthSummary.expense)}
          hint={`vs anterior: ${formatDelta(analytics.monthDelta?.expense || 0)}`}
          tone="danger"
        />
        <MEGMetric
          label="Resultado"
          value={brl.format(analytics.monthSummary.result)}
          hint={`vs anterior: ${formatDelta(analytics.monthDelta?.result || 0)}`}
          tone={analytics.monthSummary.result >= 0 ? 'good' : 'danger'}
        />
        <MEGMetric
          label="Média diária"
          value={brl.format(analytics.dailyAverageExpense)}
          hint="considerando dias com despesa"
          tone="warning"
        />
      </section>

      <section className="analytics-grid">
        <MEGCard title="Leitura executiva" eyebrow="Resumo MEG">
          <div className="executive-reading">
            {analytics.executiveReading.map((item) => (
              <div key={item}>
                <MEGBadge tone="info">Insight</MEGBadge>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </MEGCard>

        <MEGCard title="Pareto por grupo" eyebrow="Onde o dinheiro foi">
          <div className="pareto-list">
            {topPareto.map((item) => (
              <div className="pareto-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.percent.toFixed(1).replace('.', ',')}% • acumulado {item.cumulativePercent.toFixed(1).replace('.', ',')}%</small>
                </div>
                <div className="pareto-track">
                  <i style={{ width: `${Math.min(100, item.percent)}%` }} />
                </div>
                <strong>{brl.format(item.amount)}</strong>
              </div>
            ))}
          </div>
        </MEGCard>
      </section>

      <section className="analytics-grid">
        <MEGCard title="Forma de pagamento" eyebrow="Impacto financeiro">
          <div className="payment-list">
            {topPayment.map((item, index) => (
              <div className="payment-card" key={item.name}>
                <span>#{index + 1}</span>
                <strong>{item.name}</strong>
                <small>{brl.format(item.amount)}</small>
              </div>
            ))}
          </div>
        </MEGCard>

        <BudgetPanel />
      </section>
    </section>
  );
}
