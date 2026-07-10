import { useAppStore } from '../app/store';
import { useFinanceSummary } from '../app/use-finance-summary';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function FinancialControlBar() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const { summary, loading } = useFinanceSummary(selectedMonth);

  return (
    <section className="control-bar" aria-busy={loading}>
      <div>
        <span>Saldo realizado</span>
        <strong>{loading && !summary ? 'Carregando...' : brl.format(summary?.availableBalance || 0)}</strong>
      </div>
      <div>
        <span>Resultado previsto</span>
        <strong className={(summary?.projectedResult || 0) >= 0 ? 'positive' : 'negative'}>
          {loading && !summary ? '—' : brl.format(summary?.projectedResult || 0)}
        </strong>
      </div>
      <div>
        <span>Próximo vencimento</span>
        <strong>{loading && !summary ? '—' : summary?.nextDue?.description || 'Nenhum'}</strong>
      </div>
      <div>
        <span>Pendências</span>
        <strong>{loading && !summary ? '—' : `${summary?.pendingCount || 0} • ${brl.format(summary?.pendingAmount || 0)}`}</strong>
      </div>
    </section>
  );
}