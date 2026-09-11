import { useEffect, useMemo, useState } from 'react';
import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';
import { MEGCard, MEGMetric } from '@ui';
import { readCloudState } from '../../app/app-state-client';
import { useAppStore } from '../../app/store';
import { dateInSaoPaulo } from '../../app/calendar';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const iso = (value: string) => String(value || '').slice(0, 10);
const isRealized = (status: string) => ['paid', 'confirmed', 'reconciled'].includes(status);
const isBenefit = (item: { description: string; category?: string; group?: string; account?: string; paymentMethod?: string }) => /benef|aliment|vero/i.test(`${item.description} ${item.category || ''} ${item.group || ''} ${item.account || ''} ${item.paymentMethod || ''}`);

export function Cashflow() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const [transactions, setTransactions] = useState<LegacyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    void readCloudState().then((data) => { if (active) setTransactions(data.state.transactions); })
      .catch(() => { if (active) setError('Não foi possível carregar a base financeira compartilhada.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedMonth]);

  const flow = useMemo(() => {
    const today = dateInSaoPaulo();
    const events = normalizeEvents(transactions).filter((item) => !isBenefit(item));
    const opening = events.filter((item) => iso(item.date) < `${selectedMonth}-01` && isRealized(item.status) && (item.type === 'expense' || iso(item.date) <= today)).reduce((sum, item) => sum + item.signedAmount, 0);
    const monthEvents = events.filter((item) => iso(item.date).startsWith(selectedMonth));
    const realizedIncome = monthEvents.filter((item) => item.type === 'income' && isRealized(item.status) && iso(item.date) <= today).reduce((sum, item) => sum + item.amount, 0);
    const paidExpense = monthEvents.filter((item) => item.type === 'expense' && isRealized(item.status)).reduce((sum, item) => sum + item.amount, 0);
    const pendingEvents = monthEvents.filter((item) => item.type === 'expense' && !isRealized(item.status));
    const pending = pendingEvents.reduce((sum, item) => sum + item.amount, 0);
    const realizedBalance = opening + realizedIncome - paidExpense;
    const daysInMonth = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).getDate();
    let projectedBalance = opening; let actualBalance = opening;
    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const date = `${selectedMonth}-${String(index + 1).padStart(2, '0')}`; const rows = monthEvents.filter((item) => iso(item.date) === date);
      const income = rows.filter((item) => item.type === 'income' && isRealized(item.status) && date <= today).reduce((sum, item) => sum + item.amount, 0);
      const expensePaid = rows.filter((item) => item.type === 'expense' && isRealized(item.status)).reduce((sum, item) => sum + item.amount, 0);
      const expensePending = rows.filter((item) => item.type === 'expense' && !isRealized(item.status)).reduce((sum, item) => sum + item.amount, 0);
      actualBalance += income - expensePaid; projectedBalance += income - expensePaid - expensePending;
      return { date, income, expense: expensePaid + expensePending, net: income - expensePaid - expensePending, realizedBalance: actualBalance, projectedBalance, eventCount: rows.length };
    });
    const next30 = events.filter((item) => item.type === 'expense' && !isRealized(item.status) && iso(item.date) >= today && iso(item.date) <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).reduce((sum, item) => sum + item.amount, 0);
    return { opening, realizedIncome, paidExpense, pending, realizedBalance, projectedClosing: realizedBalance - pending, next30, coverage: next30 > 0 ? realizedBalance / next30 * 100 : 100, days };
  }, [transactions, selectedMonth]);
  const chart = useMemo(() => {
    const values = flow.days.map((day) => day.projectedBalance); const min = Math.min(0, ...values); const max = Math.max(0, ...values); const range = Math.max(1, max - min);
    const points = flow.days.map((day, index) => ({ ...day, x: flow.days.length === 1 ? 50 : index / (flow.days.length - 1) * 100, y: 92 - ((day.projectedBalance - min) / range) * 80 }));
    return { points, polyline: points.map((point) => `${point.x},${point.y}`).join(' '), zero: 92 - ((0 - min) / range) * 80, low: points.reduce<typeof points[number] | null>((result, point) => !result || point.projectedBalance < result.projectedBalance ? point : result, null) };
  }, [flow]);

  return <section id="cashflow" className="page cashflow-page"><header className="page-head page-header compact"><div><span>Fluxo de caixa</span><h1>Fechamento do período</h1><p>Resultado líquido considera receitas monetárias do período menos todas as despesas monetárias, pagas ou pendentes. O indicador principal é o fechamento projetado.</p></div><label className="catalog-role">Período<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label></header>
    {error && <div className="auth-error">{error}</div>}
    <section className="cashflow-status"><div><span>SALDO REALIZADO</span><strong className={flow.realizedBalance >= 0 ? 'positive' : 'negative'}>{loading ? '—' : brl.format(flow.realizedBalance)}</strong><small>Saldo anterior + receitas recebidas − despesas pagas.</small></div><div><span>FECHAMENTO COM COMPROMISSOS</span><strong className={flow.projectedClosing >= 0 ? 'positive' : 'negative'}>{loading ? '—' : brl.format(flow.projectedClosing)}</strong><small>Não considera receitas futuras como realizadas.</small></div></section>
    <section className="metric-grid" aria-busy={loading}><MEGMetric label="Receitas realizadas" value={loading ? '—' : brl.format(flow.realizedIncome)} hint="Entradas confirmadas" tone="good" /><MEGMetric label="Despesas pagas" value={loading ? '—' : brl.format(flow.paidExpense)} hint="Saídas efetivas" tone="danger" /><MEGMetric label="Compromissos pendentes" value={loading ? '—' : brl.format(flow.pending)} hint="Ainda sem baixa" tone="warning" /><MEGMetric label="Cobertura dos próximos 30 dias" value={loading ? '—' : `${Math.max(0, flow.coverage).toFixed(0)}%`} hint={`${brl.format(flow.next30)} a vencer`} tone={flow.coverage >= 100 ? 'good' : 'danger'} /></section>
    <MEGCard title="Evolução do saldo" eyebrow="Cenário diário"><div className="cashflow-chart-wrap">{loading && <div className="empty-state">Calculando fluxo...</div>}{!loading && chart.points.length > 0 && <svg className="cashflow-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Gráfico do saldo após compromissos"><defs><linearGradient id="cashArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b9f82" stopOpacity=".28"/><stop offset="1" stopColor="#1b9f82" stopOpacity=".03"/></linearGradient></defs>{[20,40,60,80].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="chart-grid-line" />)}<line x1="0" x2="100" y1={chart.zero} y2={chart.zero} className="chart-zero-line" /><polygon points={`0,92 ${chart.polyline} 100,92`} fill="url(#cashArea)" /><polyline points={chart.polyline} className="cashflow-line" />{chart.points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r=".9" className="cashflow-dot"><title>{`${point.date}: ${brl.format(point.projectedBalance)}`}</title></circle>)}</svg>}</div><div className="cashflow-caption"><span>Saldo inicial: <strong>{brl.format(flow.opening)}</strong></span><span>Menor saldo: <strong className={(chart.low?.projectedBalance || 0) >= 0 ? 'positive' : 'negative'}>{brl.format(chart.low?.projectedBalance || 0)}</strong></span></div></MEGCard>
    <MEGCard title="Agenda financeira" eyebrow="Dias com movimentação"><div className="cashflow-day-grid">{flow.days.filter((day) => day.eventCount).map((day) => <div key={day.date}><time>{new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR')}</time><span>{day.eventCount} lançamento(s)</span><strong className={day.net >= 0 ? 'positive' : 'negative'}>{brl.format(day.net)}</strong></div>)}{!loading && !flow.days.some((day) => day.eventCount) && <p className="empty-state">Nenhum movimento no período.</p>}</div></MEGCard>
  </section>;
}
