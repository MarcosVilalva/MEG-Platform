import { useEffect, useMemo, useState } from 'react';
import { MEGCard, MEGMetric } from '@ui';
import { financeClient, type FinancialCashflow } from '../../app/finance-client';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Cashflow() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const [cashflow, setCashflow] = useState<FinancialCashflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void financeClient.getCashflow(selectedMonth)
      .then((data) => { if (active) setCashflow(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'CASHFLOW_ERROR'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedMonth]);

  const chart = useMemo(() => {
    const days = cashflow?.days || [];
    const values = days.map((day) => day.projectedBalance);
    const min = Math.min(0, ...values); const max = Math.max(0, ...values); const range = Math.max(1, max - min);
    const points = days.map((day, index) => ({ ...day, x: days.length === 1 ? 50 : index / (days.length - 1) * 100, y: 92 - ((day.projectedBalance - min) / range) * 80 }));
    return { points, polyline: points.map((point) => `${point.x},${point.y}`).join(' '), zero: 92 - ((0 - min) / range) * 80, low: points.reduce<typeof points[number] | null>((result, point) => !result || point.projectedBalance < result.projectedBalance ? point : result, null) };
  }, [cashflow]);

  return (
    <section className="page cashflow-page">
      <header className="page-header compact"><div><span>Fluxo de caixa</span><h1>Veja o saldo evoluir dia a dia</h1><p>Projeção bancária sem VEROCARD, seguindo a regra do sistema original.</p></div><label className="catalog-role">Período<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label></header>
      {error && <div className="auth-error">Não foi possível carregar o fluxo: {error}</div>}
      <section className="metric-grid" aria-busy={loading}>
        <MEGMetric label="Saldo inicial" value={loading ? '—' : brl.format(cashflow?.openingBalance || 0)} hint="antes do período" />
        <MEGMetric label="Entradas previstas" value={loading ? '—' : brl.format(cashflow?.totalIncome || 0)} hint={`${cashflow?.days.reduce((sum, day) => sum + (day.income > 0 ? 1 : 0), 0) || 0} dia(s) com entradas`} tone="good" />
        <MEGMetric label="Saídas previstas" value={loading ? '—' : brl.format(cashflow?.totalExpense || 0)} hint={`${cashflow?.days.reduce((sum, day) => sum + (day.expense > 0 ? 1 : 0), 0) || 0} dia(s) com saídas`} tone="danger" />
        <MEGMetric label="Menor saldo" value={loading ? '—' : brl.format(chart.low?.projectedBalance || cashflow?.openingBalance || 0)} hint={chart.low ? `em ${new Date(`${chart.low.date}T12:00:00`).toLocaleDateString('pt-BR')}` : 'sem movimentos'} tone="warning" />
      </section>

      <MEGCard title="Saldo previsto" eyebrow="Receitas e despesas do período">
        <div className="cashflow-chart-wrap">
          {loading && <div className="empty-state">Calculando fluxo...</div>}
          {!loading && chart.points.length > 0 && <svg className="cashflow-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Gráfico do saldo previsto">
            <defs><linearGradient id="cashArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b7aa8" stopOpacity=".24"/><stop offset="1" stopColor="#1b7aa8" stopOpacity=".03"/></linearGradient></defs>
            {[20,40,60,80].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="chart-grid-line" />)}
            <line x1="0" x2="100" y1={chart.zero} y2={chart.zero} className="chart-zero-line" />
            <polygon points={`0,92 ${chart.polyline} 100,92`} fill="url(#cashArea)" />
            <polyline points={chart.polyline} className="cashflow-line" />
            {chart.points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r=".9" className="cashflow-dot"><title>{`${point.date}: ${brl.format(point.projectedBalance)}`}</title></circle>)}
          </svg>}
          {!loading && !chart.points.length && <div className="empty-state">Nenhum lançamento no período.</div>}
        </div>
        <div className="cashflow-caption"><span>Saldo inicial: <strong>{brl.format(cashflow?.openingBalance || 0)}</strong></span><span>Fechamento previsto: <strong className={(cashflow?.projectedClosing || 0) >= 0 ? 'positive' : 'negative'}>{brl.format(cashflow?.projectedClosing || 0)}</strong></span></div>
      </MEGCard>

      <MEGCard title="Agenda financeira" eyebrow="Movimentos por dia"><div className="cashflow-day-grid">{cashflow?.days.slice(0, 12).map((day) => <div key={day.date}><time>{new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR')}</time><span>{day.eventCount} lançamento(s)</span><strong className={day.net >= 0 ? 'positive' : 'negative'}>{brl.format(day.net)}</strong></div>)}</div></MEGCard>
    </section>
  );
}
