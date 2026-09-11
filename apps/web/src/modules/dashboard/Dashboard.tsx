import { useEffect, useMemo, useState } from 'react';
import { normalizeEvents } from '@core/finance/events';
import { readCloudState } from '../../app/app-state-client';
import { useAppStore } from '../../app/store';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (value: string) => String(value || '').slice(0, 10);
function monthTitle(value: string) { const [year, month] = value.split('-').map(Number); const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return label.charAt(0).toUpperCase() + label.slice(1); }
function isBenefit(item: { description: string; category?: string; group?: string; account?: string; paymentMethod?: string }) { return /benef|aliment|vero/i.test(`${item.description} ${item.category || ''} ${item.group || ''} ${item.account || ''} ${item.paymentMethod || ''}`); }
function isRealized(item: { type: string; status: string }) { return item.type === 'income' || ['paid', 'confirmed', 'reconciled'].includes(item.status); }

export function Dashboard() {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodStart = useAppStore((state) => state.periodStart);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const transactions = useAppStore((state) => state.transactions);
  const replaceTransactions = useAppStore((state) => state.replaceTransactions);
  const [loading, setLoading] = useState(transactions.length === 0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true; setLoading(true); setError('');
    void readCloudState().then((result) => { if (active) replaceTransactions(result.state.transactions); })
      .catch(() => { if (active) setError('Não foi possível carregar a base financeira compartilhada.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [replaceTransactions]);

  const view = useMemo(() => {
    const events = normalizeEvents(transactions);
    const monetary = events.filter((item) => !isBenefit(item));
    const before = monetary.filter((item) => day(item.date) < `${selectedMonth}-01` && isRealized(item));
    const inPeriod = (value: string) => periodMode === 'all' || (periodMode === 'range' ? value >= periodStart && value <= periodEnd : value.startsWith(selectedMonth));
    const current = monetary.filter((item) => inPeriod(day(item.date)));
    const benefitEvents = events.filter((item) => inPeriod(day(item.date)) && isBenefit(item));
    const opening = before.reduce((sum, item) => sum + item.signedAmount, 0);
    const income = current.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const paidExpense = current.filter((item) => item.type === 'expense' && isRealized(item)).reduce((sum, item) => sum + item.amount, 0);
    const pendingEvents = current.filter((item) => item.type === 'expense' && item.status === 'planned');
    const pending = pendingEvents.reduce((sum, item) => sum + item.amount, 0);
    const benefit = benefitEvents.reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);
    const realized = opening + income - paidExpense;
    const projected = realized - pending;
    const recent = events.filter((item) => inPeriod(day(item.date))).sort((a, b) => day(b.date).localeCompare(day(a.date))).slice(0, 4);
    const today = new Date().toISOString().slice(0, 10);
    const overdue = pendingEvents.filter((item) => day(item.date) < today).reduce((sum, item) => sum + item.amount, 0);
    const next = pendingEvents.filter((item) => day(item.date) >= today).reduce((sum, item) => sum + item.amount, 0);
    return { opening, income, paidExpense, pending, benefit, realized, projected, recent, overdue, next };
  }, [transactions, selectedMonth, periodMode, periodStart, periodEnd]);

  return <section id="home" className="page meg-screen dashboard-screen validated-dashboard" aria-busy={loading}>
    <header className="page-head screen-heading"><div><span>VISÃO GERAL</span><h1>{periodMode === 'month' ? monthTitle(selectedMonth) : periodMode === 'range' ? 'Período selecionado' : 'Todo o histórico'}</h1><p>Leitura do período usando exclusivamente os lançamentos preservados na base financeira do MEG.</p><small>{loading ? 'Atualizando em segundo plano...' : 'Atualizado agora · dados sincronizados'}</small></div></header>
    {error && <div className="notice danger">{error}</div>}
    <div className="dashboard-primary"><section className="balance-card premium-balance"><div><span>SALDO MONETÁRIO REALIZADO</span><strong>{money.format(view.realized)}</strong><p>Receita disponível menos despesas monetárias efetivamente pagas.</p></div><dl><div><dt>Saldo anterior</dt><dd>{money.format(view.opening)}</dd></div><div><dt>Receitas do mês</dt><dd>{money.format(view.income)}</dd></div><div><dt>Receita disponível</dt><dd>{money.format(view.opening + view.income)}</dd></div></dl></section></div>
    <section className={`attention-card dashboard-alert ${view.projected < 0 ? 'danger' : 'ok'}`}><div><span className="premium-alert-icon">{view.projected < 0 ? '!' : '✓'}</span><div><h2>{view.projected < 0 ? 'Mês exige atenção' : 'Mês sob controle'}</h2><p>O diagnóstico principal considera o mês corrente e não pode ser mascarado pelos filtros analíticos.</p></div></div><div><small>{view.projected < 0 ? 'FALTA PROJETADA PARA FECHAR O MÊS' : 'RESULTADO PROJETADO'}</small><strong>{money.format(view.projected)}</strong></div></section>
    <section className="premium-metrics dashboard-metrics"><article><span>DESPESAS PAGAS</span><strong>{money.format(view.paidExpense)}</strong><p>Reduzem o saldo realizado</p></article><article><span>DESPESAS PENDENTES</span><strong>{money.format(view.pending)}</strong><p>Não reduzem o realizado até a baixa</p></article><article className="benefit-control"><span>BENEFÍCIO ALIMENTAÇÃO · DISPONÍVEL</span><strong>{money.format(view.benefit)}</strong><p>Conta separada da caixa monetária</p></article><article><span>CONSOLIDADO REALIZADO</span><strong>{money.format(view.realized + view.benefit)}</strong><p>Monetário + benefício do período</p></article></section>
    <section className="premium-grid2 dashboard-lower"><article className="card premium-card meg-panel"><header><div><span>HISTÓRICO RECENTE</span><h2>Últimos lançamentos</h2></div></header><div className="compact-list">{view.recent.map((event) => <div key={event.id}><div><strong>{event.description}</strong><small>{new Date(`${day(event.date)}T12:00:00`).toLocaleDateString('pt-BR')} · {event.group || event.category || 'Sem grupo'}</small></div><span className={`status ${event.status}`}>{event.status === 'paid' ? 'Pago' : event.status === 'planned' ? 'Pendente' : 'Conciliado'}</span></div>)}{!view.recent.length && <p className="empty-state">Nenhum lançamento no período.</p>}</div></article><article className="meg-panel premium-card due-agenda"><header><div><span>AGENDA FINANCEIRA</span><h2>Vencimentos agrupados</h2></div><strong>{money.format(view.pending)}</strong></header><div className="due-row overdue"><b>Vencidos</b><span>Compromissos anteriores</span><strong>{money.format(view.overdue)}</strong></div><div className="due-row"><b>Fatura</b><span>Compras do mesmo cartão</span><strong>Ver pendentes</strong></div><div className="due-row"><b>Próximos</b><span>Hoje e próximos dias</span><strong>{money.format(view.next)}</strong></div></article></section>
  </section>;
}
