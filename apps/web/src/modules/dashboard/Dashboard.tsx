import { useEffect, useState } from 'react';
import { financeClient, type Account, type BenefitSummary, type FinanceSummary, type FinancialEvent } from '../../app/finance-client';
import { useAppStore } from '../../app/store';
import { dateInSaoPaulo } from '../../app/calendar';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (value: string) => String(value || '').slice(0, 10);
const round = (value: number) => Math.round(value * 100) / 100;

function monthTitle(value: string) {
  const [year, month] = value.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalizeText(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function isPosted(status: string) {
  return status === 'paid' || status === 'confirmed' || status === 'reconciled';
}

function isBenefitEvent(item: FinancialEvent) {
  return normalizeText(item.account?.type) === 'BENEFIT'
    || normalizeText(item.paymentMethod?.name) === 'VEROCARD'
    || normalizeText(item.description).includes('VEROCARD');
}

function isMonetaryEvent(item: FinancialEvent) {
  return item.type !== 'transfer' && !isBenefitEvent(item);
}

function isIncomeLike(item: FinancialEvent) {
  return item.type === 'income' || item.type === 'redemption';
}

function monetaryOpeningBalance(accounts: Account[]) {
  return round(accounts
    .filter((account) => ['CHECKING', 'SAVINGS', 'CASH'].includes(normalizeText(account.type)))
    .reduce((sum, account) => sum + Number(account.openingBalance || 0), 0));
}

function benefitOpeningBalance(accounts: Account[]) {
  return round(accounts
    .filter((account) => normalizeText(account.type) === 'BENEFIT')
    .reduce((sum, account) => sum + Number(account.openingBalance || 0), 0));
}

async function listAllNormalizedEvents() {
  const items: FinancialEvent[] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await financeClient.listEvents(page, 100);
    items.push(...result.items);
    total = result.total;
    page += 1;
  } while (items.length < total && page <= 250);
  return items;
}

type DashboardEvent = {
  id: string;
  description: string;
  date: string;
  status: string;
  group?: string;
  category?: string;
};

type DashboardView = {
  opening: number;
  income: number;
  paidExpense: number;
  pending: number;
  benefit: number;
  realized: number;
  projected: number;
  recent: DashboardEvent[];
  overdue: number;
  next: number;
};

function recentRows(events: FinancialEvent[]): DashboardEvent[] {
  return [...events]
    .sort((left, right) => {
      const byDate = day(right.date).localeCompare(day(left.date));
      if (byDate !== 0) return byDate;
      return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
    })
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      description: item.description,
      date: day(item.date),
      status: item.status,
      group: item.sourceDetails?.group || item.category?.group || undefined,
      category: item.category?.name || undefined,
    }));
}

function monthlyView(summary: FinanceSummary, benefit: BenefitSummary, events: FinancialEvent[]): DashboardView {
  const today = dateInSaoPaulo();
  const monetaryEvents = events.filter(isMonetaryEvent);
  const pendingEvents = monetaryEvents.filter((item) =>
    item.status === 'planned' && !isIncomeLike(item)
  );
  return {
    opening: summary.availableBalance,
    income: summary.realizedIncome,
    paidExpense: summary.realizedExpense,
    pending: summary.pendingAmount,
    benefit: benefit.balance,
    realized: round(summary.availableBalance + summary.realizedResult),
    projected: round(summary.availableBalance + summary.projectedResult),
    recent: recentRows(events),
    overdue: round(pendingEvents.filter((item) => day(item.date) < today).reduce((sum, item) => sum + Number(item.amount || 0), 0)),
    next: round(pendingEvents.filter((item) => day(item.date) >= today).reduce((sum, item) => sum + Number(item.amount || 0), 0)),
  };
}

function rangedView(
  accounts: Account[],
  events: FinancialEvent[],
  mode: 'range' | 'all',
  start: string,
  end: string,
): DashboardView {
  const today = dateInSaoPaulo();
  const inPeriod = (value: string) => mode === 'all' || (value >= start && value <= end);
  const beforePeriod = (value: string) => mode === 'range' && value < start;
  const upToPeriodEnd = (value: string) => mode === 'all' || value <= end;

  const monetary = events.filter(isMonetaryEvent);
  const current = monetary.filter((item) => inPeriod(day(item.date)));
  const openingEvents = monetary.filter((item) => beforePeriod(day(item.date)) && isPosted(item.status));
  const opening = round(openingEvents.reduce(
    (sum, item) => sum + Number(item.signedAmount || 0),
    monetaryOpeningBalance(accounts),
  ));

  let projectedIncome = 0;
  let projectedExpense = 0;
  let realizedIncome = 0;
  let realizedExpense = 0;
  for (const item of current) {
    const signed = Number(item.signedAmount || 0);
    if (!Number.isFinite(signed)) continue;
    if (isIncomeLike(item)) {
      projectedIncome += signed;
      if (isPosted(item.status)) realizedIncome += signed;
    } else {
      projectedExpense += -signed;
      if (isPosted(item.status)) realizedExpense += -signed;
    }
  }

  const pendingEvents = current.filter((item) =>
    item.status === 'planned' && !isIncomeLike(item)
  );
  const pending = round(pendingEvents.reduce((sum, item) => sum - Number(item.signedAmount || 0), 0));

  const benefitEvents = events.filter((item) =>
    isBenefitEvent(item) && isPosted(item.status) && upToPeriodEnd(day(item.date))
  );
  const benefit = round(benefitEvents.reduce(
    (sum, item) => sum + Number(item.signedAmount || 0),
    benefitOpeningBalance(accounts),
  ));

  const realizedResult = round(realizedIncome - realizedExpense);
  const projectedResult = round(projectedIncome - projectedExpense);
  const periodEvents = events.filter((item) => inPeriod(day(item.date)));

  return {
    opening,
    income: round(realizedIncome),
    paidExpense: round(realizedExpense),
    pending,
    benefit,
    realized: round(opening + realizedResult),
    projected: round(opening + projectedResult),
    recent: recentRows(periodEvents),
    overdue: round(pendingEvents.filter((item) => day(item.date) < today).reduce((sum, item) => sum + Number(item.amount || 0), 0)),
    next: round(pendingEvents.filter((item) => day(item.date) >= today).reduce((sum, item) => sum + Number(item.amount || 0), 0)),
  };
}

interface DashboardProps { onNavigate?: (view: string) => void; }

const EMPTY_VIEW: DashboardView = {
  opening: 0,
  income: 0,
  paidExpense: 0,
  pending: 0,
  benefit: 0,
  realized: 0,
  projected: 0,
  recent: [],
  overdue: 0,
  next: 0,
};

export function Dashboard({ onNavigate }: DashboardProps) {
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const periodStart = useAppStore((state) => state.periodStart);
  const periodEnd = useAppStore((state) => state.periodEnd);
  const [view, setView] = useState<DashboardView>(EMPTY_VIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const request = periodMode === 'month'
      ? Promise.all([
          financeClient.getSummary(selectedMonth),
          financeClient.getBenefitSummary(selectedMonth),
          financeClient.listEventsForMonth(selectedMonth),
        ]).then(([summary, benefit, events]) => monthlyView(summary, benefit, events.items))
      : Promise.all([
          financeClient.listAccounts(),
          listAllNormalizedEvents(),
        ]).then(([accounts, events]) => rangedView(
          accounts,
          events,
          periodMode,
          periodStart,
          periodEnd,
        ));

    void request
      .then((next) => { if (active) setView(next); })
      .catch(() => {
        if (!active) return;
        setError('Não foi possível carregar a visão financeira canônica deste período.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [selectedMonth, periodMode, periodStart, periodEnd]);

  const statusCopy = (status: string) => status === 'paid'
    ? ['Pago', '']
    : status === 'planned'
      ? ['Pendente', 'warn']
      : status === 'reconciled'
        ? ['Conciliado', 'info']
        : ['Confirmado', ''];

  return <section id="home" className="page meg-screen dashboard-screen validated-dashboard" aria-busy={loading}>
    <header className="page-head screen-heading"><div><span className="kicker">Visão geral</span><h1>{periodMode === 'month' ? monthTitle(selectedMonth) : periodMode === 'range' ? 'Período selecionado' : 'Todo o histórico'}</h1><p>Leitura do período usando exclusivamente a base financeira normalizada do MEG.</p><span className="dashboard-updated">{loading ? 'Atualizando leitura financeira...' : 'Base financeira canônica carregada · atualização automática ativa'}</span></div></header>

    {error && <div className="notice danger">{error}</div>}

    <div className="dashboard-primary">
      <article className="premium-balance">
        <span className="kicker">Saldo monetário realizado</span>
        <h2>{money.format(view.realized)}</h2>
        <p>Receita disponível menos despesas monetárias efetivamente pagas.</p>
        <div className="premium-balance-stats">
          <div className="pb-stat"><span>Saldo anterior</span><strong>{money.format(view.opening)}</strong></div>
          <div className="pb-stat"><span>{periodMode === 'month' ? 'Receitas do mês' : 'Receitas do período'}</span><strong>{money.format(view.income)}</strong></div>
          <div className="pb-stat"><span>Receita disponível</span><strong>{money.format(view.opening + view.income)}</strong></div>
        </div>
      </article>
    </div>

    <article className={`premium-alert dashboard-alert ${view.projected < 0 ? 'danger' : 'ok'}`}>
      <div><div className="premium-alert-icon">{view.projected < 0 ? '!' : '✓'}</div><h3>{view.projected < 0 ? 'Período exige atenção' : 'Período sob controle'}</h3><p>O diagnóstico usa a mesma base financeira canônica adotada por Fluxo de Caixa e Análises.</p></div>
      <div><span className="gap-label">{view.projected < 0 ? 'Falta projetada para fechar o período' : 'Resultado projetado'}</span><strong>{money.format(view.projected)}</strong></div>
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
        <div className="dashboard-list">{view.recent.map((event) => { const [label, tone] = statusCopy(event.status); return <div className="dashboard-row" key={event.id}><div><strong>{event.description}</strong><small>{new Date(`${day(event.date)}T12:00:00`).toLocaleDateString('pt-BR')} · {event.group || event.category || 'Sem grupo'}</small></div><span className={`pill ${tone}`}>{label}</span><button className="btn secondary row-action" onClick={() => onNavigate?.('history')}>Abrir</button></div>; })}{!loading && !view.recent.length && <p className="empty-state">Nenhum lançamento no período.</p>}</div>
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
