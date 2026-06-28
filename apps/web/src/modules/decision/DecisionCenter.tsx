import { normalizeEvents } from '@core/finance/events';
import { buildDecisionCenter } from '@core/decision/decision-engine';
import { runFinancialEngine } from '@core/finance/financial-engine';
import { buildAnalyticsQuestions } from '@core/analytics/analytics-engine';
import { createPurchaseScenario, simulateScenario } from '@core/simulation/simulation-engine';
import { buildFinancialReplay } from '@core/analytics/replay-engine';
import { MEGBadge, MEGButton, MEGCard } from '@ui';
import { useAppStore } from '../../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface DecisionCenterProps {
  onNavigate: (view: string) => void;
}

export function DecisionCenter({ onNavigate }: DecisionCenterProps) {
  const { transactions, selectedMonth, markAsPaid } = useAppStore();
  const events = normalizeEvents(transactions);
  const engine = runFinancialEngine(events, selectedMonth, `${selectedMonth}-15`);
  const decisions = buildDecisionCenter(events, selectedMonth, `${selectedMonth}-15`);
  const questions = buildAnalyticsQuestions(events, selectedMonth);
  const replay = buildFinancialReplay(events, selectedMonth).slice(0, 9);

  const notebookScenario = createPurchaseScenario({
    id: 'notebook-gamer',
    name: 'Notebook gamer',
    amount: 8600,
    date: `${selectedMonth}-20`,
    group: 'Planejamento',
    category: 'Tecnologia'
  });

  const simulation = simulateScenario(events, selectedMonth, notebookScenario, `${selectedMonth}-15`);

  function handleDecision(decision: ReturnType<typeof buildDecisionCenter>[number]) {
    if (decision.action === 'pay' && decision.eventId) {
      markAsPaid(decision.eventId);
      return;
    }

    if (decision.action === 'analyze') {
      onNavigate('analytics');
      return;
    }

    if (decision.action === 'simulate') {
      onNavigate('decision');
      return;
    }
  }

  return (
    <section className="page">
      <header className="page-header decision-hero">
        <div>
          <span>Decision Center</span>
          <h1>Hoje existem {decisions.length} decisão(ões).</h1>
          <p>
            Saldo projetado: <strong>{brl.format(engine.projectedClosing)}</strong> • Pendências:{' '}
            <strong>{engine.openCommitments}</strong>
          </p>
        </div>
      </header>

      <section className="decision-layout">
        <MEGCard title="Fila de decisões" eyebrow="Gestão por exceção">
          <div className="decision-list-xl">
            {decisions.map((decision) => (
              <div className={`decision-card-xl ${decision.priority}`} key={decision.id}>
                <MEGBadge tone={decision.priority === 'critical' ? 'danger' : decision.priority === 'good' ? 'good' : 'warning'}>
                  {decision.priority}
                </MEGBadge>
                <div>
                  <strong>{decision.title}</strong>
                  <small>{decision.description}</small>
                </div>
                {decision.action !== 'none' && (
                  <MEGButton variant="ghost" onClick={() => handleDecision(decision)}>
                    {decision.actionLabel || 'Abrir'}
                  </MEGButton>
                )}
              </div>
            ))}
          </div>
        </MEGCard>

        <MEGCard title="Resumo executivo" eyebrow="Financial Engine">
          <div className="executive-grid">
            <div>
              <span>Disponível</span>
              <strong>{brl.format(engine.availableCash)}</strong>
            </div>
            <div>
              <span>Fechamento</span>
              <strong className={engine.projectedClosing >= 0 ? 'positive' : 'negative'}>
                {brl.format(engine.projectedClosing)}
              </strong>
            </div>
            <div>
              <span>Compromissos</span>
              <strong>{brl.format(engine.openCommitmentsAmount)}</strong>
            </div>
            <div>
              <span>Maior grupo</span>
              <strong>{engine.topExpenseGroup?.name || '-'}</strong>
            </div>
          </div>
        </MEGCard>
      </section>

      <section className="decision-layout">
        <MEGCard title="Perguntas que o MEG já responde" eyebrow="Analytics Engine">
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

        <MEGCard title="Simulação rápida" eyebrow="Simulation Engine">
          <div className="simulation-box">
            <strong>Comprar Notebook gamer de R$ 8.600</strong>
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

      <MEGCard title="Replay Financeiro inicial" eyebrow="Timeline do dinheiro">
        <div className="replay-list">
          {replay.map((step, index) => (
            <div className={`replay-step ${step.kind}`} key={`${step.date}-${index}`}>
              <div className="replay-dot">{index + 1}</div>
              <div>
                <strong>{step.date} • {step.title}</strong>
                <small>{step.description}</small>
              </div>
              <div>
                <span className={step.amount >= 0 ? 'positive' : 'negative'}>{brl.format(step.amount)}</span>
                <small>Saldo: {brl.format(step.balanceAfter)}</small>
              </div>
            </div>
          ))}
        </div>
      </MEGCard>
    </section>
  );
}
