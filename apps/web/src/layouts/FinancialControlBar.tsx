import { normalizeEvents } from '@core/finance/events';
import { runFinancialEngine } from '@core/finance/financial-engine';
import { useAppStore } from '../app/store';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function FinancialControlBar() {
  const { transactions, selectedMonth } = useAppStore();
  const events = normalizeEvents(transactions);
  const engine = runFinancialEngine(events, selectedMonth, `${selectedMonth}-15`);

  return (
    <section className="control-bar">
      <div>
        <span>Saldo disponível</span>
        <strong>{brl.format(engine.availableCash)}</strong>
      </div>
      <div>
        <span>Fechamento</span>
        <strong className={engine.projectedClosing >= 0 ? 'positive' : 'negative'}>
          {brl.format(engine.projectedClosing)}
        </strong>
      </div>
      <div>
        <span>Próximo vencimento</span>
        <strong>{engine.nextDue ? engine.nextDue.description : 'Nenhum'}</strong>
      </div>
      <div>
        <span>Pendências</span>
        <strong>{engine.openCommitments} • {brl.format(engine.openCommitmentsAmount)}</strong>
      </div>
    </section>
  );
}
