import { useEffect, useMemo, useState } from 'react';
import { normalizeEvents, type LegacyTransaction } from '@core/finance/events';
import { buildDecisionCenter } from '@core/decision/decision-engine';
import { runFinancialEngine } from '@core/finance/financial-engine';
import { buildAnalyticsQuestions } from '@core/analytics/analytics-engine';
import { buildFinancialReplay } from '@core/analytics/replay-engine';
import { MEGBadge, MEGButton, MEGCard } from '@ui';
import { useAppStore } from '../../app/store';
import { patchCloudTransactions, readCloudState } from '../../app/app-state-client';
import { dateInSaoPaulo } from '../../app/calendar';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface DecisionCenterProps {
  onNavigate: (view: string) => void;
}

export function DecisionCenter({ onNavigate }: DecisionCenterProps) {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const [transactions, setTransactions] = useState<LegacyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() { setLoading(true); setError(''); try { setTransactions((await readCloudState()).state.transactions); } catch { setError('Não foi possível carregar a base financeira compartilhada.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [selectedMonth]);
  const events = useMemo(() => normalizeEvents(transactions), [transactions]);
  const referenceDate = selectedMonth === dateInSaoPaulo().slice(0, 7) ? dateInSaoPaulo() : `${selectedMonth}-15`;
  const engine = runFinancialEngine(events, selectedMonth, referenceDate);
  const decisions = buildDecisionCenter(events, selectedMonth, referenceDate);
  const questions = buildAnalyticsQuestions(events, selectedMonth);
  const replay = buildFinancialReplay(events, selectedMonth).slice(0, 9);

  function handleDecision(decision: ReturnType<typeof buildDecisionCenter>[number]) {
    if (decision.action === 'pay' && decision.eventId) {
      const current = transactions.find((item) => item.id === decision.eventId);
      if (current) void patchCloudTransactions([{ ...current, status: 'paid', situation: 'PAGO' }]).then(load).catch(() => setError('A base não confirmou a baixa.'));
      return;
    }

    if (decision.action === 'analyze') {
      onNavigate('analytics');
      return;
    }

    if (decision.action === 'simulate') onNavigate('cashflow');
  }

  return (
    <section className="page decision-page" aria-busy={loading}>
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
      {error && <div className="auth-error">{error}</div>}

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

        <MEGCard title="Cenário atual" eyebrow="Realizado e compromissos"><div className="simulation-box"><strong className={engine.projectedClosing >= 0 ? 'positive' : 'negative'}>{brl.format(engine.projectedClosing)}</strong><small>Fechamento considerando os compromissos registrados.</small><p>{engine.projectedClosing >= 0 ? 'Há cobertura para os compromissos do período.' : `Faltam ${brl.format(Math.abs(engine.projectedClosing))} para equilibrar o período.`}</p><MEGButton variant="ghost" onClick={() => onNavigate('cashflow')}>Abrir fluxo de caixa</MEGButton></div></MEGCard>
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
