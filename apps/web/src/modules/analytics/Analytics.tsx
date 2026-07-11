import { useEffect, useMemo, useState } from 'react';
import { MEGCard, MEGMetric } from '@ui';
import { financeClient, type FinancialAnalytics } from '../../app/finance-client';
import { useAppStore } from '../../app/store';
import { BudgetPanel } from './BudgetPanel';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
function formatDelta(value: number) { return `${value > 0 ? '+' : ''}${brl.format(value)}`; }
function monthLabel(value: string) { return new Date(`${value}-02T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''); }

export function Analytics() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void financeClient.getAnalytics(selectedMonth)
      .then((data) => { if (active) setAnalytics(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'ANALYTICS_ERROR'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedMonth]);

  const maxTrend = useMemo(() => Math.max(1, ...(analytics?.monthlyTrend.flatMap((item) => [item.income, item.expense]) || [1])), [analytics]);
  const maxCategory = Math.max(1, ...(analytics?.categories.map((item) => item.amount) || [1]));
  const summary = analytics?.summary;
  const result = summary?.projectedResult || 0;

  return (
    <section className="page analytics-page">
      <header className="page-header analytics-hero compact">
        <div><span>Análises para decisão</span><h1>Entenda para onde seu dinheiro está indo</h1><p>Comparativos, evolução mensal e concentração dos gastos calculados sobre a base real.</p></div>
        <label className="catalog-role">Período<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
      </header>

      {error && <div className="auth-error">Não foi possível carregar a análise: {error}</div>}

      <section className="metric-grid" aria-busy={loading}>
        <MEGMetric label="Média mensal de despesas" value={loading ? '—' : brl.format(summary?.expense || 0)} hint={`média diária: ${brl.format(analytics?.dailyAverageExpense || 0)}`} tone="danger" />
        <MEGMetric label="Maior grupo de gasto" value={loading ? '—' : analytics?.categories[0]?.name || 'Sem dados'} hint={brl.format(analytics?.categories[0]?.amount || 0)} tone="warning" />
        <MEGMetric label="Variação vs. mês anterior" value={loading ? '—' : formatDelta(analytics?.delta.expense || 0)} hint="despesas do período" tone={(analytics?.delta.expense || 0) <= 0 ? 'good' : 'danger'} />
        <MEGMetric label="Concentração no top 3" value={loading ? '—' : `${(analytics?.concentrationTop3 || 0).toFixed(1)}%`} hint="participação nas despesas" tone="warning" />
      </section>

      <section className="analytics-main-grid">
        <MEGCard title="Evolução de receitas e despesas" eyebrow="Últimos 12 meses">
          <div className="trend-chart" aria-label="Evolução mensal">
            {analytics?.monthlyTrend.map((item) => (
              <div className="trend-column" key={item.month} title={`${item.month}: receitas ${brl.format(item.income)}, despesas ${brl.format(item.expense)}`}>
                <div className="trend-bars"><i className="income" style={{ height: `${Math.max(2, item.income / maxTrend * 100)}%` }} /><i className="expense" style={{ height: `${Math.max(2, item.expense / maxTrend * 100)}%` }} /></div>
                <strong>{compact.format(item.expense)}</strong><span>{monthLabel(item.month)}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend"><span><i className="income" />Receitas</span><span><i className="expense" />Despesas</span></div>
        </MEGCard>

        <MEGCard title="Gastos por grupo" eyebrow="Ranking do período">
          <div className="category-bars">
            {analytics?.categories.map((item, index) => (
              <div className="category-bar-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.amount / maxCategory * 100}%` }} className={index < 3 ? 'top' : ''} /></div><strong>{compact.format(item.amount)}</strong></div>
            ))}
            {!analytics?.categories.length && <div className="empty-state">Sem despesas no período.</div>}
          </div>
        </MEGCard>
      </section>

      <section className="analytics-grid">
        <MEGCard title="Leitura do mês" eyebrow="Resultado financeiro"><div className="executive-reading"><div><strong>{brl.format(result)}</strong><span>{result >= 0 ? 'O período fecha positivo.' : 'As despesas superam as receitas previstas.'}</span></div><div><strong>{summary?.eventCount || 0} lançamentos</strong><span>{summary?.pendingCount || 0} pendência(s), totalizando {brl.format(summary?.pendingAmount || 0)}.</span></div></div></MEGCard>
        <BudgetPanel />
      </section>
    </section>
  );
}
