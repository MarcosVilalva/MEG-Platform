import { normalizeEvents } from '@core/finance/events';
import { projectDailyCashflow } from '@core/projections/cashflow';
import { useAppStore } from '../../app/store';
import { MEGCard } from '@ui';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Cashflow() {
  const { transactions, selectedMonth } = useAppStore();
  const timeline = projectDailyCashflow(normalizeEvents(transactions), selectedMonth);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span>Fluxo</span>
          <h1>Linha do tempo financeira</h1>
          <p>Fluxo diário calculado pelo MEG Core.</p>
        </div>
      </header>

      <MEGCard title="Eventos do mês">
        <div className="timeline">
          {timeline.map((item) => (
            <div className="timeline-item" key={item.event.id}>
              <strong>{item.date}</strong>
              <span>{item.event.description}</span>
              <small>Saldo após evento: {brl.format(item.runningBalance)}</small>
            </div>
          ))}
        </div>
      </MEGCard>
    </section>
  );
}
