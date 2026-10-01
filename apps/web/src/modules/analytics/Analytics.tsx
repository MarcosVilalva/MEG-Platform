import { useEffect, useMemo, useState } from 'react';
import { MEGCard, MEGMetric } from '@ui';
import { financeClient, type FinancialAnalytics } from '../../app/finance-client';
import { useAppStore } from '../../app/store';
import { BudgetPanel } from './BudgetPanel';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

function monthLabel(value: string) {
  return new Date(`${value}-02T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

export function Analytics() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const [analysis, setAnalysis] = useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void financeClient.getAnalytics(selectedMonth)
      .then((result) => { if (active) setAnalysis(result); })
      .catch(() => {
        if (!active) return;
        setAnalysis(null);
        setError('Não foi possível carregar a análise financeira canônica.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedMonth]);

  const summary = analysis?.summary;
  const trend = analysis?.monthlyTrend || [];
  const groups = analysis?.categories || [];
  const methods = analysis?.paymentMethods || [];
  const maxTrend = useMemo(() => Math.max(1, ...trend.flatMap((item) => [item.income, item.expense])), [trend]);
  const maxGroup = useMemo(() => Math.max(1, ...groups.map((item) => item.amount)), [groups]);
  const maxMethod = useMemo(() => Math.max(1, ...methods.map((item) => item.amount)), [methods]);

  const realizedResult = summary?.realizedResult || 0;
  const projectedResult = summary?.projectedResult || 0;
  const realizedIncome = summary?.realizedIncome || 0;
  const realizedExpense = summary?.realizedExpense || 0;
  const pendingAmount = summary?.pendingAmount || 0;
  const expenseDelta = analysis?.delta.expense || 0;
  const concentration = analysis?.concentrationTop3 || 0;
  const dailyAverage = analysis?.dailyAverageExpense || 0;

  return <section id="analytics" className="page analytics-page" aria-busy={loading}>
    <header className="page-head page-header analytics-hero compact">
      <div>
        <span>Análises</span>
        <h1>Tendência e comparação histórica</h1>
        <p>Indicadores calculados pelo modelo financeiro canônico da API, usando as mesmas regras de saldo, baixa, transferência e exclusão de benefícios do restante do sistema.</p>
      </div>
      <label className="catalog-role">Período<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
    </header>

    {error && <div className="auth-error">{error}</div>}

    <section className="analytics-result">
      <div>
        <span>RESULTADO REALIZADO</span>
        <strong className={realizedResult >= 0 ? 'positive' : 'negative'}>{loading ? '—' : brl.format(realizedResult)}</strong>
        <small>Receitas e despesas efetivamente confirmadas.</small>
      </div>
      <div>
        <span>FECHAMENTO PROJETADO</span>
        <strong className={projectedResult >= 0 ? 'positive' : 'negative'}>{loading ? '—' : brl.format(projectedResult)}</strong>
        <small>Inclui os compromissos planejados da competência.</small>
      </div>
    </section>

    <section className="metric-grid">
      <MEGMetric label="Receita realizada" value={loading ? '—' : brl.format(realizedIncome)} hint="Somente valores confirmados" tone="good" />
      <MEGMetric label="Despesas pagas" value={loading ? '—' : brl.format(realizedExpense)} hint="Caixa efetivamente consumido" tone="danger" />
      <MEGMetric label="Compromissos em aberto" value={loading ? '—' : brl.format(pendingAmount)} hint={`${summary?.pendingCount || 0} compromisso(s) pendente(s)`} tone="warning" />
      <MEGMetric label="Variação mensal" value={loading ? '—' : brl.format(expenseDelta)} hint={`Despesas versus ${analysis?.previous.month || 'mês anterior'}`} tone={expenseDelta <= 0 ? 'good' : 'danger'} />
    </section>

    <section className="analytics-main-grid">
      <MEGCard title="Evolução financeira" eyebrow="Últimos 12 meses">
        <div className="trend-chart">
          {trend.map((item) => <div className="trend-column" key={item.month} title={`${item.month}: receitas ${brl.format(item.income)}, despesas ${brl.format(item.expense)}`}>
            <div className="trend-bars">
              <i className="income" style={{ height: `${Math.max(2, item.income / maxTrend * 100)}%` }} />
              <i className="expense" style={{ height: `${Math.max(2, item.expense / maxTrend * 100)}%` }} />
            </div>
            <strong>{compact.format(item.expense)}</strong>
            <span>{monthLabel(item.month)}</span>
          </div>)}
        </div>
        <div className="chart-legend"><span><i className="income" />Receitas</span><span><i className="expense" />Despesas</span></div>
      </MEGCard>

      <MEGCard title="Despesas por grupo" eyebrow="Concentração e prioridade">
        <div className="category-bars">
          {groups.map((item, index) => <div className="category-bar-row" key={item.name}>
            <span>{item.name}</span>
            <div><i style={{ width: `${item.amount / maxGroup * 100}%` }} className={index < 3 ? 'top' : ''} /></div>
            <strong>{brl.format(item.amount)}</strong>
          </div>)}
          {!groups.length && <div className="empty-state">Sem despesas no período.</div>}
        </div>
      </MEGCard>
    </section>

    <section className="analytics-grid">
      <MEGCard title="Formas de pagamento" eyebrow="Distribuição das despesas">
        <div className="category-bars payment-bars">
          {methods.map((item) => <div className="category-bar-row" key={item.name}>
            <span>{item.name}</span>
            <div><i style={{ width: `${item.amount / maxMethod * 100}%` }} /></div>
            <strong>{brl.format(item.amount)}</strong>
          </div>)}
          {!methods.length && <div className="empty-state">Sem formas de pagamento no período.</div>}
        </div>
      </MEGCard>

      <MEGCard title="Leitura executiva" eyebrow="O que merece atenção">
        <div className="executive-reading">
          <div>
            <strong>{projectedResult >= 0 ? 'Período sob controle' : 'Resultado exige atenção'}</strong>
            <span>{projectedResult >= 0 ? `Margem projetada de ${brl.format(projectedResult)} após os compromissos.` : `Faltam ${brl.format(Math.abs(projectedResult))} para cobrir todos os compromissos.`}</span>
          </div>
          <div>
            <strong>{concentration.toFixed(1)}% no top 3</strong>
            <span>Média diária de despesas: {brl.format(dailyAverage)}.</span>
          </div>
        </div>
      </MEGCard>
    </section>

    <BudgetPanel />
  </section>;
}
