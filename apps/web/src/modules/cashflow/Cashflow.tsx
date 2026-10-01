import { useEffect, useMemo, useState } from 'react';
import { MEGCard, MEGMetric } from '@ui';
import { financeClient, type FinanceSummary, type FinancialCashflow } from '../../app/finance-client';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function expandMonthDays(month: string, flow: FinancialCashflow) {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const byDate = new Map(flow.days.map((day) => [day.date, day]));
  let realizedBalance = flow.openingBalance;
  let projectedBalance = flow.openingBalance;

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const source = byDate.get(date);
    if (source) {
      realizedBalance = source.realizedBalance;
      projectedBalance = source.projectedBalance;
    }
    return {
      date,
      income: source?.income || 0,
      expense: source?.expense || 0,
      net: source?.net || 0,
      eventCount: source?.eventCount || 0,
      realizedBalance,
      projectedBalance,
    };
  });
}

export function Cashflow() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const [flow, setFlow] = useState<FinancialCashflow | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void Promise.all([
      financeClient.getCashflow(selectedMonth),
      financeClient.getSummary(selectedMonth),
    ]).then(([cashflow, financeSummary]) => {
      if (!active) return;
      setFlow(cashflow);
      setSummary(financeSummary);
    }).catch(() => {
      if (!active) return;
      setFlow(null);
      setSummary(null);
      setError('Não foi possível carregar o fluxo de caixa canônico da base financeira.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [selectedMonth]);

  const days = useMemo(() => flow ? expandMonthDays(selectedMonth, flow) : [], [flow, selectedMonth]);
  const coverage = summary && summary.pendingAmount > 0
    ? summary.availableBalance / summary.pendingAmount * 100
    : 100;

  const chart = useMemo(() => {
    const values = days.map((day) => day.projectedBalance);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = Math.max(1, max - min);
    const points = days.map((day, index) => ({
      ...day,
      x: days.length === 1 ? 50 : index / (days.length - 1) * 100,
      y: 92 - ((day.projectedBalance - min) / range) * 80,
    }));
    return {
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
      zero: 92 - ((0 - min) / range) * 80,
      low: points.reduce<typeof points[number] | null>(
        (result, point) => !result || point.projectedBalance < result.projectedBalance ? point : result,
        null,
      ),
    };
  }, [days]);

  const realizedClosing = flow?.realizedClosing || 0;
  const projectedClosing = flow?.projectedClosing || 0;
  const openingBalance = flow?.openingBalance || 0;
  const realizedIncome = summary?.realizedIncome || 0;
  const realizedExpense = summary?.realizedExpense || 0;
  const pendingAmount = summary?.pendingAmount || 0;

  return <section id="cashflow" className="page cashflow-page">
    <header className="page-head page-header compact">
      <div>
        <span>Fluxo de caixa</span>
        <h1>Fechamento do período</h1>
        <p>Valores lidos do modelo financeiro canônico. Transferências internas não alteram o resultado consolidado e benefícios permanecem fora do caixa monetário.</p>
      </div>
      <label className="catalog-role">Período<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
    </header>

    {error && <div className="auth-error">{error}</div>}

    <section className="cashflow-status">
      <div>
        <span>SALDO REALIZADO</span>
        <strong className={realizedClosing >= 0 ? 'positive' : 'negative'}>{loading ? '—' : brl.format(realizedClosing)}</strong>
        <small>Saldo confirmado pela base financeira após os eventos efetivados.</small>
      </div>
      <div>
        <span>FECHAMENTO COM COMPROMISSOS</span>
        <strong className={projectedClosing >= 0 ? 'positive' : 'negative'}>{loading ? '—' : brl.format(projectedClosing)}</strong>
        <small>Inclui os compromissos planejados do período sem tratá-los como pagos.</small>
      </div>
    </section>

    <section className="metric-grid" aria-busy={loading}>
      <MEGMetric label="Receitas realizadas" value={loading ? '—' : brl.format(realizedIncome)} hint="Entradas efetivamente confirmadas" tone="good" />
      <MEGMetric label="Despesas pagas" value={loading ? '—' : brl.format(realizedExpense)} hint="Saídas efetivamente confirmadas" tone="danger" />
      <MEGMetric label="Compromissos pendentes" value={loading ? '—' : brl.format(pendingAmount)} hint={`${summary?.pendingCount || 0} compromisso(s) em aberto`} tone="warning" />
      <MEGMetric label="Cobertura dos compromissos" value={loading ? '—' : `${Math.max(0, coverage).toFixed(0)}%`} hint={`${brl.format(pendingAmount)} ainda em aberto`} tone={coverage >= 100 ? 'good' : 'danger'} />
    </section>

    <MEGCard title="Evolução do saldo" eyebrow="Cenário diário canônico">
      <div className="cashflow-chart-wrap">
        {loading && <div className="empty-state">Calculando fluxo...</div>}
        {!loading && chart.points.length > 0 && <svg className="cashflow-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Gráfico do saldo após compromissos">
          <defs><linearGradient id="cashArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b9f82" stopOpacity=".28"/><stop offset="1" stopColor="#1b9f82" stopOpacity=".03"/></linearGradient></defs>
          {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="chart-grid-line" />)}
          <line x1="0" x2="100" y1={chart.zero} y2={chart.zero} className="chart-zero-line" />
          <polygon points={`0,92 ${chart.polyline} 100,92`} fill="url(#cashArea)" />
          <polyline points={chart.polyline} className="cashflow-line" />
          {chart.points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r=".9" className="cashflow-dot"><title>{`${point.date}: ${brl.format(point.projectedBalance)}`}</title></circle>)}
        </svg>}
      </div>
      <div className="cashflow-caption">
        <span>Saldo inicial: <strong>{brl.format(openingBalance)}</strong></span>
        <span>Menor saldo: <strong className={(chart.low?.projectedBalance || 0) >= 0 ? 'positive' : 'negative'}>{brl.format(chart.low?.projectedBalance || 0)}</strong></span>
      </div>
    </MEGCard>

    <MEGCard title="Agenda financeira" eyebrow="Dias com movimentação">
      <div className="cashflow-day-grid">
        {days.filter((day) => day.eventCount).map((day) => <div key={day.date}>
          <time>{new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR')}</time>
          <span>{day.eventCount} lançamento(s)</span>
          <strong className={day.net >= 0 ? 'positive' : 'negative'}>{brl.format(day.net)}</strong>
        </div>)}
        {!loading && !days.some((day) => day.eventCount) && <p className="empty-state">Nenhum movimento no período.</p>}
      </div>
    </MEGCard>
  </section>;
}
