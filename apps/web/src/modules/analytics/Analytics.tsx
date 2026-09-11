import { useEffect, useMemo, useState } from 'react';
import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';
import { MEGCard, MEGMetric } from '@ui';
import { readCloudState } from '../../app/app-state-client';
import { useAppStore } from '../../app/store';
import { BudgetPanel } from './BudgetPanel';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const iso = (value: string) => String(value || '').slice(0, 10);
const realized = (status: string) => ['paid', 'confirmed', 'reconciled'].includes(status);
function monthLabel(value: string) { return new Date(`${value}-02T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''); }
function previousMonth(value: string) { const [year, month] = value.split('-').map(Number); return new Date(year, month - 2, 2).toISOString().slice(0, 7); }

export function Analytics() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodStart = useAppStore((state) => state.periodStart);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const [transactions, setTransactions] = useState<LegacyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true; setLoading(true); setError('');
    void readCloudState().then((data) => { if (active) setTransactions(data.state.transactions); })
      .catch(() => { if (active) setError('Não foi possível carregar a base financeira compartilhada.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedMonth, periodMode, periodStart, periodEnd]);

  const analysis = useMemo(() => {
    const events = normalizeEvents(transactions);
    const inPeriod = (date: string) => periodMode === 'all' || (periodMode === 'range' ? date >= periodStart && date <= periodEnd : date.startsWith(selectedMonth));
    const current = events.filter((item) => inPeriod(iso(item.date)));
    const previous = events.filter((item) => iso(item.date).startsWith(previousMonth(selectedMonth)));
    const income = current.filter((item) => item.type === 'income' && realized(item.status)).reduce((sum, item) => sum + item.amount, 0);
    const paid = current.filter((item) => item.type === 'expense' && realized(item.status)).reduce((sum, item) => sum + item.amount, 0);
    const pending = current.filter((item) => item.type === 'expense' && !realized(item.status)).reduce((sum, item) => sum + item.amount, 0);
    const previousExpense = previous.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = paid + pending;
    const groups = new Map<string, number>(); const methods = new Map<string, number>(); const expenseDays = new Set<string>();
    current.filter((item) => item.type === 'expense').forEach((item) => {
      const group = item.group || item.category || 'Sem grupo'; groups.set(group, (groups.get(group) || 0) + item.amount);
      const method = item.paymentMethod || 'Não informada'; methods.set(method, (methods.get(method) || 0) + item.amount); expenseDays.add(iso(item.date));
    });
    const groupRows = [...groups].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    const methodRows = [...methods].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    const trend = Array.from({ length: 12 }, (_, index) => {
      const [year, month] = selectedMonth.split('-').map(Number); const key = new Date(year, month - 12 + index, 2).toISOString().slice(0, 7);
      const rows = events.filter((item) => iso(item.date).startsWith(key));
      const trendIncome = rows.filter((item) => item.type === 'income' && realized(item.status)).reduce((sum, item) => sum + item.amount, 0);
      const trendExpense = rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
      return { month: key, income: trendIncome, expense: trendExpense };
    });
    const top3 = groupRows.slice(0, 3).reduce((sum, item) => sum + item.amount, 0);
    return { current, income, paid, pending, totalExpense, result: income - paid, projected: income - paid - pending, previousExpense, delta: totalExpense - previousExpense, dailyAverage: expenseDays.size ? totalExpense / expenseDays.size : 0, concentration: totalExpense ? top3 / totalExpense * 100 : 0, groups: groupRows, methods: methodRows, trend };
  }, [transactions, selectedMonth, periodMode, periodStart, periodEnd]);
  const maxTrend = Math.max(1, ...analysis.trend.flatMap((item) => [item.income, item.expense]));
  const maxGroup = Math.max(1, ...analysis.groups.map((item) => item.amount));
  const maxMethod = Math.max(1, ...analysis.methods.map((item) => item.amount));

  return <section className="page analytics-page" aria-busy={loading}>
    <header className="page-header analytics-hero compact"><div><span>Análises para decisão</span><h1>Leitura financeira do período</h1><p>Realizado, compromissos e tendências calculados diretamente sobre sua base principal.</p></div>{periodMode === 'month' && <label className="catalog-role">Período<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>}</header>
    {error && <div className="auth-error">{error}</div>}
    <section className="analytics-result"><div><span>RESULTADO REALIZADO</span><strong className={analysis.result >= 0 ? 'positive' : 'negative'}>{loading ? '—' : brl.format(analysis.result)}</strong><small>Receitas recebidas menos despesas pagas.</small></div><div><span>FECHAMENTO PROJETADO</span><strong className={analysis.projected >= 0 ? 'positive' : 'negative'}>{loading ? '—' : brl.format(analysis.projected)}</strong><small>Inclui os compromissos ainda pendentes.</small></div></section>
    <section className="metric-grid"><MEGMetric label="Receita realizada" value={loading ? '—' : brl.format(analysis.income)} hint="Somente valores recebidos" tone="good" /><MEGMetric label="Despesas pagas" value={loading ? '—' : brl.format(analysis.paid)} hint="Caixa efetivamente consumido" tone="danger" /><MEGMetric label="Compromissos em aberto" value={loading ? '—' : brl.format(analysis.pending)} hint="Não reduzem o realizado" tone="warning" /><MEGMetric label="Variação mensal" value={loading ? '—' : brl.format(analysis.delta)} hint="Despesas versus mês anterior" tone={analysis.delta <= 0 ? 'good' : 'danger'} /></section>
    <section className="analytics-main-grid"><MEGCard title="Evolução financeira" eyebrow="Últimos 12 meses"><div className="trend-chart">{analysis.trend.map((item) => <div className="trend-column" key={item.month} title={`${item.month}: receitas ${brl.format(item.income)}, despesas ${brl.format(item.expense)}`}><div className="trend-bars"><i className="income" style={{ height: `${Math.max(2, item.income / maxTrend * 100)}%` }} /><i className="expense" style={{ height: `${Math.max(2, item.expense / maxTrend * 100)}%` }} /></div><strong>{compact.format(item.expense)}</strong><span>{monthLabel(item.month)}</span></div>)}</div><div className="chart-legend"><span><i className="income" />Receitas realizadas</span><span><i className="expense" />Despesas totais</span></div></MEGCard>
      <MEGCard title="Despesas por grupo" eyebrow="Concentração e prioridade"><div className="category-bars">{analysis.groups.slice(0, 10).map((item, index) => <div className="category-bar-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.amount / maxGroup * 100}%` }} className={index < 3 ? 'top' : ''} /></div><strong>{brl.format(item.amount)}</strong></div>)}{!analysis.groups.length && <div className="empty-state">Sem despesas no período.</div>}</div></MEGCard></section>
    <section className="analytics-grid"><MEGCard title="Formas de pagamento" eyebrow="Distribuição das despesas"><div className="category-bars payment-bars">{analysis.methods.map((item) => <div className="category-bar-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.amount / maxMethod * 100}%` }} /></div><strong>{brl.format(item.amount)}</strong></div>)}{!analysis.methods.length && <div className="empty-state">Sem formas de pagamento no período.</div>}</div></MEGCard><MEGCard title="Leitura executiva" eyebrow="O que merece atenção"><div className="executive-reading"><div><strong>{analysis.projected >= 0 ? 'Período sob controle' : 'Resultado exige atenção'}</strong><span>{analysis.projected >= 0 ? `Margem projetada de ${brl.format(analysis.projected)} após os compromissos.` : `Faltam ${brl.format(Math.abs(analysis.projected))} para cobrir todos os compromissos.`}</span></div><div><strong>{analysis.concentration.toFixed(1)}% no top 3</strong><span>Média diária de despesas: {brl.format(analysis.dailyAverage)}.</span></div></div></MEGCard></section>
    <BudgetPanel />
  </section>;
}
