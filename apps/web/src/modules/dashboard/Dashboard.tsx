import { normalizeEvents } from '@core/finance/events';
import { calculateMonthProjection } from '@core/projections/cashflow';
import { buildFinancialAgenda } from '@core/projections/agenda';
import { runFinancialEngine } from '@core/finance/financial-engine';
import { generateFinancialInsights } from '@core/insights/insights';
import { MEGBadge, MEGButton, MEGCard, MEGMetric } from '@ui';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface DashboardProps {
  onNewTransaction: () => void;
}

export function Dashboard({ onNewTransaction }: DashboardProps) {
  const { transactions, selectedMonth, setSelectedMonth, markAsPaid } = useAppStore();
  const events = normalizeEvents(transactions);
  const projection = calculateMonthProjection(events, selectedMonth);
  const monthEvents = events.filter((event) => event.competence === selectedMonth);
  const insights = generateFinancialInsights(projection, monthEvents);
  const engine = runFinancialEngine(events, selectedMonth, `${selectedMonth}-15`);
  const agenda = buildFinancialAgenda(monthEvents, `${selectedMonth}-15`).slice(0, 6);
  const openAmount = agenda.reduce((sum, item) => sum + Math.abs(item.event.signedAmount), 0);

  return (
    <section className="page">
      <header className="hero cockpit">
        <div>
          <span>Cockpit Financeiro</span>
          <h1>Bom dia, Marcos.</h1>
          <p>
            Existem <strong>{engine.openCommitments}</strong> prioridade(s) e o fechamento projetado é{' '}
            <strong>{brl.format(projection.closingBalance)}</strong>.
          </p>
        </div>
        <div className="hero-actions">
          <label>
            Mês
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </label>
          <MEGButton onClick={onNewTransaction}>Novo lançamento</MEGButton>
        </div>
      </header>

      <section className="metric-grid">
        <MEGMetric
          label="Caixa disponível"
          value={brl.format(projection.openingBalance + projection.income)}
          hint={`Saldo inicial ${brl.format(projection.openingBalance)} + entradas ${brl.format(
            projection.income
          )}`}
          tone="good"
        />
        <MEGMetric
          label="Despesas do mês"
          value={brl.format(projection.expense)}
          hint={`${projection.eventCount} evento(s) no período`}
          tone="danger"
        />
        <MEGMetric
          label="Fechamento previsto"
          value={brl.format(projection.closingBalance)}
          hint={projection.closingBalance >= 0 ? 'positivo' : 'em atenção'}
          tone={projection.closingBalance >= 0 ? 'good' : 'danger'}
        />
        <MEGMetric
          label="Agenda aberta"
          value={brl.format(openAmount)}
          hint={`${agenda.length} prioridade(s)`}
          tone={agenda.length ? 'warning' : 'good'}
        />
      </section>

      <section className="dashboard-grid">
        <MEGCard title="Fila de prioridades" eyebrow="Gestão por exceção">
          <div className="stack">
            {agenda.length ? (
              agenda.map((item) => (
                <div className={`action-row ${item.priority}`} key={item.event.id}>
                  <div>
                    <strong>{item.event.description}</strong>
                    <small>{item.reason} • {item.event.date} • {item.event.paymentMethod}</small>
                  </div>
                  <div className="row-actions">
                    <MEGBadge tone={item.priority === 'critical' ? 'danger' : item.priority === 'today' ? 'info' : 'warning'}>
                      {item.reason}
                    </MEGBadge>
                    <button onClick={() => markAsPaid(item.event.id)}>Pagar</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Nenhuma pendência crítica no mês.</div>
            )}
          </div>
        </MEGCard>

        <MEGCard title="Consultor MEG" eyebrow="IA financeira inicial">
          <div className="advisor-card">
            <strong>
              {projection.closingBalance >= 0
                ? 'Seu mês continua positivo.'
                : 'Seu mês precisa de atenção.'}
            </strong>
            <p>
              {projection.closingBalance >= 0
                ? `Mesmo pagando as pendências abertas, a projeção ainda aponta sobra de ${brl.format(projection.closingBalance)}.`
                : `Falta ${brl.format(Math.abs(projection.closingBalance))} para equilibrar o mês.`}
            </p>
          </div>
          <div className="stack">
            {insights.map((insight) => (
              <div className="insight" key={insight.title}>
                <MEGBadge tone={insight.level === 'danger' ? 'danger' : insight.level === 'good' ? 'good' : 'warning'}>
                  {insight.level}
                </MEGBadge>
                <div>
                  <strong>{insight.title}</strong>
                  <small>{insight.message}</small>
                </div>
              </div>
            ))}
          </div>
        </MEGCard>
      </section>
    </section>
  );
}
