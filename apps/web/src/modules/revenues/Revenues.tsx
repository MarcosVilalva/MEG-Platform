import { useMemo } from 'react';
import { normalizeEvents } from '@core/finance/events';
import { useAppStore } from '../../app/store';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const isBenefit = (value: string) => /benef|aliment|vero/i.test(value);

export function Revenues() {
  const transactions = useAppStore((state) => state.transactions);
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodStart = useAppStore((state) => state.periodStart);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const data = useMemo(() => {
    const inPeriod = (date: string) => periodMode === 'all' || (periodMode === 'range' ? date >= periodStart && date <= periodEnd : date.startsWith(selectedMonth));
    const income = normalizeEvents(transactions).filter((item) => item.type === 'income' && inPeriod(item.date.slice(0, 10)));
    const benefit = income.filter((item) => isBenefit(`${item.description} ${item.category || ''} ${item.group || ''} ${item.account || ''}`));
    const monetary = income.filter((item) => !benefit.includes(item));
    const total = monetary.reduce((sum, item) => sum + item.amount, 0);
    const benefitTotal = benefit.reduce((sum, item) => sum + item.amount, 0);
    const sources = new Map<string, number>();
    monetary.forEach((item) => { const key = item.group || item.category || 'Sem grupo'; sources.set(key, (sources.get(key) || 0) + item.amount); });
    const largest = [...sources.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total, benefitTotal, average: monetary.length ? total / monetary.length : 0, largest, sources: [...sources.entries()].sort((a, b) => b[1] - a[1]) };
  }, [transactions, selectedMonth, periodMode, periodStart, periodEnd]);

  return <section className="meg-screen"><header className="screen-heading"><div><span>RECEITAS</span><h1>Análise de receitas</h1><p>Receitas monetárias e créditos de benefício permanecem separados e respondem ao período global.</p></div></header><section className="dashboard-metrics premium-metrics"><article><span>TOTAL MONETÁRIO</span><strong>{money.format(data.total)}</strong><p>Receitas disponíveis</p></article><article><span>CRÉDITO DE BENEFÍCIO</span><strong>{money.format(data.benefitTotal)}</strong><p>Fora do caixa monetário</p></article><article><span>MÉDIA POR RECEBIMENTO</span><strong>{money.format(data.average)}</strong><p>Período filtrado</p></article><article><span>MAIOR FONTE</span><strong>{data.largest?.[0] || 'Sem dados'}</strong><p>{data.largest ? money.format(data.largest[1]) : 'Carregada da base'}</p></article></section><section className="premium-grid2"><article className="meg-panel premium-card"><header><div><span>ORIGENS</span><h2>Concentração por grupo</h2></div></header><div className="compact-list">{data.sources.slice(0, 8).map(([source, value]) => <div key={source}><strong>{source}</strong><span>{money.format(value)}</span></div>)}{!data.sources.length && <p className="empty-state">Nenhuma receita no período.</p>}</div></article><article className="meg-panel premium-card"><header><div><span>REGRA DE ATENÇÃO</span><h2>Monitoramento</h2></div></header><div className="notice warn">Queda superior a 10% entre os dois meses mais recentes deve ser destacada. Ausência de receita monetária é situação crítica.</div></article></section></section>;
}
