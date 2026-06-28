import { normalizeEvents } from '@core/finance/events';
import { eventsToLedger, validateLedgerBalance, ledgerBalanceByAccount } from '@core/ledger/ledger';
import { buildDecisionCenter } from '@core/decision/decision-engine';
import { buildAnalyticsQuestions } from '@core/analytics/analytics-engine';
import { createPurchaseScenario, simulateScenario } from '@core/simulation/simulation-engine';
import { MEGCard, MEGBadge } from '@ui';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Platform() {
  const { transactions, selectedMonth } = useAppStore();
  const events = normalizeEvents(transactions);
  const ledger = eventsToLedger(events);
  const ledgerValid = validateLedgerBalance(ledger);
  const balances = ledgerBalanceByAccount(ledger).slice(0, 8);
  const decisions = buildDecisionCenter(events, selectedMonth, `${selectedMonth}-15`);
  const questions = buildAnalyticsQuestions(events, selectedMonth);
  const notebookScenario = createPurchaseScenario({
    id: 'notebook-gamer',
    name: 'Notebook gamer',
    amount: 8600,
    date: `${selectedMonth}-20`,
    group: 'Planejamento',
    category: 'Tecnologia'
  });
  const simulation = simulateScenario(events, selectedMonth, notebookScenario, `${selectedMonth}-15`);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span>MEG Platform</span>
          <h1>Foundation Engine</h1>
          <p>Ledger, decisões, analytics e simulações calculados pelo Core.</p>
        </div>
      </header>

      <section className="platform-grid">
        <MEGCard title="Ledger Financeiro" eyebrow="Contabilidade simplificada">
          <div className="engine-status">
            <MEGBadge tone={ledgerValid ? 'good' : 'danger'}>
              {ledgerValid ? 'Balanceado' : 'Divergente'}
            </MEGBadge>
            <strong>{ledger.length} partidas geradas</strong>
          </div>
          <div className="mini-ledger">
            {balances.map((item) => (
              <div key={item.accountId}>
                <span>{item.accountId}</span>
                <strong>{brl.format(item.balance)}</strong>
              </div>
            ))}
          </div>
        </MEGCard>

        <MEGCard title="Centro de Decisão" eyebrow="Decision Engine">
          <div className="decision-list">
            {decisions.map((decision) => (
              <div className={`decision-item ${decision.priority}`} key={decision.id}>
                <MEGBadge tone={decision.priority === 'critical' ? 'danger' : decision.priority === 'good' ? 'good' : 'warning'}>
                  {decision.priority}
                </MEGBadge>
                <div>
                  <strong>{decision.title}</strong>
                  <small>{decision.description}</small>
                </div>
              </div>
            ))}
          </div>
        </MEGCard>

        <MEGCard title="Perguntas Analíticas" eyebrow="Analytics Engine">
          <div className="qa-list">
            {questions.map((item) => (
              <div className="qa-item" key={item.id}>
                <strong>{item.question}</strong>
                <small>{item.answer}</small>
                {item.value !== undefined && <span>{brl.format(item.value)}</span>}
              </div>
            ))}
          </div>
        </MEGCard>

        <MEGCard title="Simulador" eyebrow="Simulation Engine">
          <div className="simulation-box">
            <strong>Compra simulada: Notebook gamer</strong>
            <small>Impacto no fechamento do mês</small>
            <span className={simulation.delta.projectedClosing >= 0 ? 'positive' : 'negative'}>
              {brl.format(simulation.delta.projectedClosing)}
            </span>
            <p>
              Antes: {brl.format(simulation.before.projectedClosing)}<br />
              Depois: {brl.format(simulation.after.projectedClosing)}
            </p>
          </div>
        </MEGCard>
      </section>
    </section>
  );
}
