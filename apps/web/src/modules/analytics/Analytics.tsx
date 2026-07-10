import { useEffect, useState } from 'react';
import { MEGBadge, MEGCard, MEGMetric } from '@ui';
import { financeClient, type FinancialAnalytics } from '../../app/finance-client';
import { useAppStore } from '../../app/store';
import { BudgetPanel } from './BudgetPanel';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function formatDelta(value: number) { return `${value > 0 ? '+' : ''}${brl.format(value)}`; }

export function Analytics() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void financeClient.getAnalytics(selectedMonth)
      .then((data) => { if (active) setAnalytics(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'ANALYTICS_ERROR'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedMonth]);

  const summary = analytics?.summary;
  const result = summary?.projectedResult || 0;

  return (
    <section className="page">
      <header className="page-header analytics-hero compact">
        <div>
          <span>Inteligência financeira</span>
          <h1>Como seu dinheiro está se comportando?</h1>
          <p>Comparativo mensal, categorias, meios de pagamento e orçamento usando seus dados reais.</p>
        </div>
        <label className="catalog-role">Mês<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
      </header>

      {error && <div className="auth-error">Não foi possível carregar a análise: {error}</div>}

      <section className="metric-grid" aria-busy={loading}>
        <MEGMetric label="Receitas" value={loading ? '—' : brl.format(summary?.income || 0)} hint={`vs anterior: ${formatDelta(analytics?.delta.income || 0)}`} tone="good" />
        <MEGMetric label="Despesas" value={loading ? '—' : brl.format(summary?.expense || 0)} hint={`vs anterior: ${formatDelta(analytics?.delta.expense || 0)}`} tone="danger" />
        <MEGMetric label="Resultado" value={loading ? '—' : brl.format(result)} hint={`vs anterior: ${formatDelta(analytics?.delta.result || 0)}`} tone={result >= 0 ? 'good' : 'danger'} />
        <MEGMetric label="Média diária" value={loading ? '—' : brl.format(analytics?.dailyAverageExpense || 0)} hint="dias com despesas" tone="warning" />
      </section>

      <section className="analytics-grid">
        <MEGCard title="Leitura executiva" eyebrow="Resumo MEG">
          <div className="executive-reading">
            <div><MEGBadge tone={result >= 0 ? 'good' : 'danger'}>Resultado</MEGBadge><span>{result >= 0 ? 'O mês está projetado para fechar positivo.' : 'As despesas previstas superam as receitas do mês.'}</span></div>
            <div><MEGBadge tone="info">Pendências</MEGBadge><span>Existem {summary?.pendingCount || 0} lançamento(s) previsto(s), totalizando {brl.format(summary?.pendingAmount || 0)}.</span></div>
            <div><MEGBadge tone="warning">Comparativo</MEGBadge><span>As despesas variaram {formatDelta(analytics?.delta.expense || 0)} em relação ao mês anterior.</span></div>
          </div>
        </MEGCard>

        <MEGCard title="Maiores categorias" eyebrow="Onde o dinheiro foi">
          <div className="pareto-list">
            {summary?.topCategories.map((item) => (
              <div className="pareto-row" key={item.name}><div><strong>{item.name}</strong></div><strong>{brl.format(item.amount)}</strong></div>
            ))}
            {!summary?.topCategories.length && <div className="empty-state">Sem despesas no mês.</div>}
          </div>
        </MEGCard>
      </section>

      <section className="analytics-grid">
        <MEGCard title="Forma de pagamento" eyebrow="Impacto financeiro">
          <div className="payment-list">
            {analytics?.paymentMethods.map((item, index) => (
              <div className="payment-card" key={item.name}><span>#{index + 1}</span><strong>{item.name}</strong><small>{brl.format(item.amount)}</small></div>
            ))}
            {!analytics?.paymentMethods.length && <div className="empty-state">Sem formas de pagamento no período.</div>}
          </div>
        </MEGCard>
        <BudgetPanel />
      </section>
    </section>
  );
}