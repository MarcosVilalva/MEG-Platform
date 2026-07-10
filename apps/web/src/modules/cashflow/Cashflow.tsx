import { useEffect, useState } from 'react';
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
    setLoading(true);
    setError('');
    void financeClient.getCashflow(selectedMonth)
      .then((data) => { if (active) setCashflow(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'CASHFLOW_ERROR'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedMonth]);

  return (
    <section className="page">
      <header className="page-header compact">
        <div>
          <span>Fluxo de caixa</span>
          <h1>Linha do tempo financeira real</h1>
          <p>Entradas, saídas e saldo acumulado calculados a partir dos lançamentos no banco.</p>
        </div>
        <label className="catalog-role">
          Mês
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>
      </header>

      {error && <div className="auth-error">Não foi possível carregar o fluxo de caixa: {error}</div>}

      <section className="metric-grid" aria-busy={loading}>
        <MEGMetric label="Saldo inicial" value={loading ? '—' : brl.format(cashflow?.openingBalance || 0)} hint="Realizado antes do mês" />
        <MEGMetric label="Entradas" value={loading ? '—' : brl.format(cashflow?.totalIncome || 0)} hint="Previstas no mês" tone="good" />
        <MEGMetric label="Saídas" value={loading ? '—' : brl.format(cashflow?.totalExpense || 0)} hint="Previstas no mês" tone="danger" />
        <MEGMetric
          label="Fechamento projetado"
          value={loading ? '—' : brl.format(cashflow?.projectedClosing || 0)}
          hint={`Realizado: ${brl.format(cashflow?.realizedClosing || 0)}`}
          tone={(cashflow?.projectedClosing || 0) >= 0 ? 'good' : 'danger'}
        />
      </section>

      <MEGCard title="Movimento diário" eyebrow="Projeção acumulada">
        <div className="timeline" aria-busy={loading}>
          {loading && <div className="empty-state">Carregando fluxo de caixa...</div>}
          {!loading && cashflow?.days.map((day) => (
            <div className="timeline-item" key={day.date}>
              <strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR')}</strong>
              <span>{day.eventCount} lançamento(s) • Entradas {brl.format(day.income)} • Saídas {brl.format(day.expense)}</span>
              <small>
                Movimento: <b className={day.net >= 0 ? 'positive' : 'negative'}>{brl.format(day.net)}</b>
                {' • '}Saldo projetado: <b className={day.projectedBalance >= 0 ? 'positive' : 'negative'}>{brl.format(day.projectedBalance)}</b>
              </small>
            </div>
          ))}
          {!loading && !cashflow?.days.length && <div className="empty-state">Nenhum lançamento no mês selecionado.</div>}
        </div>
      </MEGCard>
    </section>
  );
}