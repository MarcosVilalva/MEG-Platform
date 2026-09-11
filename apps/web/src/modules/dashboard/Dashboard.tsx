import { useMemo } from 'react';
import { normalizeEvents } from '@core/finance/events';
import { useAppStore } from '../../app/store';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (value: string) => String(value || '').slice(0, 10);
function monthTitle(value: string) { const [year, month] = value.split('-').map(Number); const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return label.charAt(0).toUpperCase() + label.slice(1); }
function isBenefit(item: { description: string; category?: string; group?: string; account?: string; paymentMethod?: string }) { return /benef|aliment|vero/i.test(`${item.description} ${item.category || ''} ${item.group || ''} ${item.account || ''} ${item.paymentMethod || ''}`); }
function isRealized(item: { type: string; status: string }) { return item.type === 'income' || ['paid', 'confirmed', 'reconciled'].includes(item.status); }

interface DashboardProps { onNavigate?: (view: string) => void; }

export function Dashboard({ onNavigate }: DashboardProps) {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodStart = useAppStore((state) => state.periodStart);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const transactions = useAppStore((state) => state.transactions);

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

  const statusCopy = (status: string) => status === 'paid' ? ['Pago', ''] : status === 'planned' ? ['Pendente', 'warn'] : status === 'reconciled' ? ['Conciliado', 'info'] : ['Confirmado', ''];

  return <section id="home" className="page meg-screen dashboard-screen validated-dashboard">
    <header className="page-head screen-heading"><div><span className="kicker">Visão geral</span><h1>{periodMode === 'month' ? monthTitle(selectedMonth) : periodMode === 'range' ? 'Período selecionado' : 'Todo o histórico'}</h1><p>Leitura do período usando exclusivamente os lançamentos preservados na base financeira do MEG.</p><span className="dashboard-updated">Base compartilhada carregada · atualização automática ativa</span></div></header>

    <div className="dashboard-primary">
      <article className="premium-balance">
        <span className="kicker">Saldo monetário realizado</span>
        <h2>{money.format(view.realized)}</h2>
        <p>Receita disponível menos despesas monetárias efetivamente pagas.</p>
        <div className="premium-balance-stats">
          <div className="pb-stat"><span>Saldo anterior</span><strong>{money.format(view.opening)}</strong></div>
          <div className="pb-stat"><span>Receitas do mês</span><strong>{money.format(view.income)}</strong></div>
          <div className="pb-stat"><span>Receita disponível</span><strong>{money.format(view.opening + view.income)}</strong></div>
        </div>
      </article>
    </div>

    <article className={`premium-alert dashboard-alert ${view.projected < 0 ? 'danger' : 'ok'}`}>
      <div><div className="premium-alert-icon">{view.projected < 0 ? '!' : '✓'}</div><h3>{view.projected < 0 ? 'Mês exige atenção' : 'Mês sob controle'}</h3><p>O diagnóstico principal considera o mês corrente e não pode ser mascarado pelos filtros analíticos.</p></div>
      <div><span className="gap-label">{view.projected < 0 ? 'Falta projetada para fechar o mês' : 'Resultado projetado'}</span><strong>{money.format(view.projected)}</strong></div>
    </article>

    <div className="premium-metrics dashboard-metrics">
      <article className="premium-metric good"><span>Despesas pagas</span><strong>{money.format(view.paidExpense)}</strong><small>Reduzem o saldo realizado</small></article>
      <article className="premium-metric bad"><span>Despesas pendentes</span><strong>{money.format(view.pending)}</strong><small>Não reduzem o realizado até a baixa</small></article>
      <article className="premium-metric info benefit-control"><span>Benefício alimentação · disponível</span><strong>{money.format(view.benefit)}</strong><div className="benefit-inline"><div><span>Saldo carregado</span><b>{money.format(view.benefit)}</b></div><button className="btn secondary row-action" onClick={() => onNavigate?.('transactions')}>Ver extrato</button></div></article>
      <article className="premium-metric warn"><span>Consolidado realizado</span><strong>{money.format(view.realized + view.benefit)}</strong><small>Monetário + benefício do período</small></article>
    </div>

    <div className="premium-grid2 dashboard-lower">
      <article className="premium-card">
        <div className="premium-card-head"><div><span className="premium-label">Histórico recente</span><h3>Últimos lançamentos</h3></div><button className="btn secondary row-action" onClick={() => onNavigate?.('history')}>Ver histórico completo</button></div>
        <div className="dashboard-list">{view.recent.map((event) => { const [label, tone] = statusCopy(event.status); return <div className="dashboard-row" key={event.id}><div><strong>{event.description}</strong><small>{new Date(`${day(event.date)}T12:00:00`).toLocaleDateString('pt-BR')} · {event.group || event.category || 'Sem grupo'}</small></div><span className={`pill ${tone}`}>{label}</span><button className="btn secondary row-action" onClick={() => onNavigate?.('history')}>Abrir</button></div>; })}{!view.recent.length && <p className="empty-state">Nenhum lançamento no período.</p>}</div>
      </article>

      <article className="premium-card agenda-card">
        <div className="premium-card-head"><div><span className="premium-label">Agenda financeira</span><h3>Vencimentos agrupados</h3></div><span className="pill bad">{money.format(view.pending)}</span></div>
        <div className="dashboard-list">
          <div className="dashboard-row"><span className="due-date danger">VENCIDOS</span><div><strong>Compromissos anteriores</strong><small>Agrupados por data de vencimento · {money.format(view.overdue)}</small></div><button className="btn secondary row-action" onClick={() => onNavigate?.('payables')}>Detalhes</button></div>
          <div className="dashboard-row"><span className="due-date">FATURA</span><div><strong>Compras do mesmo cartão</strong><small>Uma fatura por cartão e vencimento</small></div><button className="btn secondary row-action" onClick={() => onNavigate?.('payables')}>Detalhes</button></div>
          <div className="dashboard-row"><span className="due-date">PRÓXIMOS</span><div><strong>Demais compromissos</strong><small>Hoje e próximos dias · {money.format(view.next)}</small></div><button className="btn secondary row-action" onClick={() => onNavigate?.('payables')}>Detalhes</button></div>
        </div>
      </article>
    </div>
  </section>;
}
