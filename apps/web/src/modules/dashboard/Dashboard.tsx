import { MEGBadge, MEGButton, MEGCard, MEGMetric } from '@ui';
import { readSession } from '../../app/auth-client';
import { useAppStore } from '../../app/store';
import { useFinanceSummary } from '../../app/use-finance-summary';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface DashboardProps {
  onNewTransaction: () => void;
}

export function Dashboard({ onNewTransaction }: DashboardProps) {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const { summary, loading, error } = useFinanceSummary(selectedMonth);
  const firstName = readSession()?.user.name?.split(' ')[0] || 'Marcos';
  const projectedResult = summary?.projectedResult || 0;
  const savingsRate = summary && summary.income > 0 ? (projectedResult / summary.income) * 100 : 0;

  return (
    <section className="page">
      <header className="hero cockpit">
        <div>
          <span>Cockpit Financeiro</span>
          <h1>Olá, {firstName}.</h1>
          <p>
            {loading && !summary
              ? 'Carregando seus dados financeiros reais...'
              : `Este mês possui ${summary?.eventCount || 0} lançamento(s) e resultado previsto de ${brl.format(projectedResult)}.`}
          </p>
        </div>
        <div className="hero-actions">
          <label>
            Mês
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </label>
          <MEGButton onClick={onNewTransaction}>Novo lançamento</MEGButton>
        </div>
      </header>

      {error && <div className="auth-error">Não foi possível carregar o resumo financeiro: {error}</div>}

      <section className="metric-grid" aria-busy={loading}>
        <MEGMetric
          label="Receitas previstas"
          value={loading && !summary ? '—' : brl.format(summary?.income || 0)}
          hint={`Realizadas: ${brl.format(summary?.realizedIncome || 0)}`}
          tone="good"
        />
        <MEGMetric
          label="Despesas previstas"
          value={loading && !summary ? '—' : brl.format(summary?.expense || 0)}
          hint={`Realizadas: ${brl.format(summary?.realizedExpense || 0)}`}
          tone="danger"
        />
        <MEGMetric
          label="Resultado previsto"
          value={loading && !summary ? '—' : brl.format(projectedResult)}
          hint={projectedResult >= 0 ? 'Fechamento positivo' : 'Mês exige atenção'}
          tone={projectedResult >= 0 ? 'good' : 'danger'}
        />
        <MEGMetric
          label="Taxa de economia"
          value={loading && !summary ? '—' : `${savingsRate.toFixed(1)}%`}
          hint={`${summary?.pendingCount || 0} pendência(s) em aberto`}
          tone={savingsRate >= 10 ? 'good' : savingsRate >= 0 ? 'warning' : 'danger'}
        />
      </section>

      <section className="dashboard-grid">
        <MEGCard title="Próximo compromisso" eyebrow="Agenda financeira">
          {summary?.nextDue ? (
            <div className="advisor-card">
              <MEGBadge tone="warning">Previsto</MEGBadge>
              <h3>{summary.nextDue.description}</h3>
              <p>Vencimento em {new Date(summary.nextDue.date).toLocaleDateString('pt-BR')}</p>
              <strong>{brl.format(Number(summary.nextDue.amount))}</strong>
            </div>
          ) : (
            <div className="empty-state">Nenhum vencimento futuro encontrado.</div>
          )}
        </MEGCard>

        <MEGCard title="Maiores categorias" eyebrow="Despesas do mês">
          <div className="stack">
            {summary?.topCategories.length ? summary.topCategories.map((category, index) => (
              <div className="insight" key={category.name}>
                <MEGBadge tone={index === 0 ? 'danger' : 'info'}>{String(index + 1)}</MEGBadge>
                <div>
                  <strong>{category.name}</strong>
                  <small>{brl.format(category.amount)}</small>
                </div>
              </div>
            )) : <div className="empty-state">Sem despesas no mês selecionado.</div>}
          </div>
        </MEGCard>
      </section>
    </section>
  );
}