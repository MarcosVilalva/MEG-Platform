import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../contracts';
import { buildPhoenixHomeAgenda, type PhoenixHomeAgendaItem } from '../home-agenda';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type HomeRoute = 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs' | 'users' | 'settings' | 'receivables' | 'revenues' | 'cashflow' | 'reconcile' | 'analytics' | 'budgets';
type AgendaDisplayGroup = {
  key: string;
  dueDate: string;
  title: string;
  subtitle: string;
  amount: number;
  items: PhoenixHomeAgendaItem[];
};
type HistoryFeedItem = {
  id: string;
  at: string;
  title: string;
  description: string;
  actor: string;
  state: string;
};

function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function shortDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}` : value;
}

function actionLabel(action: string) {
  const normalized = action.toUpperCase();
  if (normalized.includes('CREATED')) return 'Lançamento incluído';
  if (normalized.includes('UPDATED')) return 'Lançamento alterado';
  if (normalized.includes('ARCHIVED') || normalized.includes('DELETED')) return 'Lançamento arquivado';
  if (normalized.includes('RECOVERED')) return 'Lançamento recuperado';
  if (normalized.includes('PAYMENT') || normalized.includes('PAID')) return 'Pagamento confirmado';
  if (normalized.includes('TRANSFER')) return 'Transferência registrada';
  return action.replace(/_/g, ' ').toLocaleLowerCase('pt-BR').replace(/^./, (letter) => letter.toUpperCase());
}

function actionState(action: string) {
  const normalized = action.toUpperCase();
  if (normalized.includes('UPDATED')) return 'ATUALIZADO';
  if (normalized.includes('DELETED') || normalized.includes('ARCHIVED')) return 'ARQUIVADO';
  if (normalized.includes('PAY') || normalized.includes('PAID')) return 'PAGO';
  return 'SINCRONIZADO';
}

function historyFeed(data: PhoenixReadModel): HistoryFeedItem[] {
  const audit = data.financialAudit.items.map((item) => ({
    id: `audit-${item.id}`,
    at: item.at,
    title: actionLabel(item.action),
    description: item.entity ? `${item.entity} · registro ${item.entityId}` : 'Evento financeiro auditado',
    actor: item.actor?.name || item.actor?.email || 'Usuário do MEG',
    state: actionState(item.action)
  }));
  const legacy = data.activities.map((item) => ({
    id: `activity-${item.id}`,
    at: item.at,
    title: actionLabel(item.action),
    description: item.transaction?.description || 'Atividade financeira preservada',
    actor: item.userName || 'Usuário do MEG',
    state: actionState(item.action)
  }));
  const seen = new Set<string>();
  return [...audit, ...legacy]
    .sort((left, right) => String(right.at).localeCompare(String(left.at)))
    .filter((item) => {
      const key = `${item.at}|${item.title}|${item.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

function agendaDisplayGroups(items: PhoenixHomeAgendaItem[]) {
  const buckets = new Map<string, AgendaDisplayGroup>();
  items.forEach((item) => {
    const dueDate = item.dueDate.slice(0, 10);
    const isCard = item.kind === 'FATURA' || Boolean(item.cardLabel);
    const title = isCard ? `Fatura ${item.cardLabel || 'Cartão'}` : item.description;
    const key = isCard ? `card|${item.cardLabel || 'Cartão'}|${dueDate}` : `item|${item.id}`;
    const current = buckets.get(key) || {
      key,
      dueDate,
      title,
      subtitle: isCard ? 'Compras agrupadas por cartão e vencimento' : item.meta,
      amount: 0,
      items: []
    };
    current.amount += item.amount;
    current.items.push(item);
    buckets.set(key, current);
  });
  return [...buckets.values()].sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.title.localeCompare(right.title, 'pt-BR'));
}

function statusForDate(dueDate: string, today: string) {
  if (dueDate < today) return 'VENCIDO';
  if (dueDate === today) return 'HOJE';
  return 'PRÓXIMO';
}

export function PhoenixHomeDashboard({ data, month, onNavigate }: { data: PhoenixReadModel; month: string; onNavigate: (view: HomeRoute) => void }) {
  const today = todayIso();
  const agenda = useMemo(() => buildPhoenixHomeAgenda(data, today), [data, today]);
  const agendaRows = useMemo(() => agendaDisplayGroups(agenda.items), [agenda.items]);
  const feed = useMemo(() => historyFeed(data), [data]);
  const [agendaExpanded, setAgendaExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [detail, setDetail] = useState<AgendaDisplayGroup | null>(null);
  const [detailSelected, setDetailSelected] = useState<Set<string>>(() => new Set());

  const pendingAmount = data.summary.pendingAmount || 0;
  const realizedBalance = data.summary.availableBalance + data.summary.realizedResult;
  const availableRevenue = data.summary.availableBalance + data.summary.realizedIncome;
  const projectedClosing = data.cashflow.projectedClosing;
  const consolidatedRealized = realizedBalance + data.summary.benefitBalance;
  const freeAfterCommitments = realizedBalance - pendingAmount;
  const nextDue = agendaRows.find((item) => item.dueDate >= today) || agendaRows[0];

  function openDetail(group: AgendaDisplayGroup) {
    setDetail(group);
    setDetailSelected(new Set());
  }

  function toggleDetailItem(id: string) {
    setDetailSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedDetailAmount = detail?.items
    .filter((item) => detailSelected.has(item.id))
    .reduce((sum, item) => sum + item.amount, 0) || 0;

  return <>
    <div className="px-page-head"><div><span className="px-kicker">Visão geral</span><h1>{monthLabel(month)}</h1><p>Saldo, compromissos e próximos passos reunidos para você trabalhar sem sair da Home.</p><span className="px-updated">Atualizado agora · {data.normalization.primary && data.normalization.reconciled ? 'dados sincronizados' : 'integridade em verificação'}</span></div></div>

    <section className="px-dashboard-grid px-home-balance-grid">
      <article className="px-card px-premium-balance px-home-balance-card">
        <div className="px-home-balance-main"><span className="px-kicker">Saldo monetário realizado</span><h2>{money.format(realizedBalance)}</h2><p>O que existe hoje no caixa monetário, sem antecipar receitas futuras.</p></div>
        <div className="px-home-balance-quick">
          <div><span>Livre após compromissos</span><strong className={freeAfterCommitments < 0 ? 'negative' : ''}>{money.format(freeAfterCommitments)}</strong><small>Saldo atual − pendências líquidas</small></div>
          <div><span>Próximo vencimento</span><strong>{nextDue ? money.format(nextDue.amount) : '—'}</strong><small>{nextDue ? `${shortDate(nextDue.dueDate)} · ${nextDue.title}` : 'Nenhum compromisso no período'}</small></div>
          <div><span>Fechamento projetado</span><strong className={projectedClosing < 0 ? 'negative' : ''}>{money.format(projectedClosing)}</strong><small>Projeção do mês selecionado</small></div>
        </div>
        <div className="px-balance-stats"><div className="px-balance-stat"><span>Saldo anterior</span><strong>{money.format(data.summary.availableBalance)}</strong></div><div className="px-balance-stat"><span>Receitas realizadas</span><strong>{money.format(data.summary.realizedIncome)}</strong></div><div className="px-balance-stat"><span>Despesas pagas</span><strong>{money.format(data.summary.realizedExpense)}</strong></div><div className="px-balance-stat"><span>Receita disponível</span><strong>{money.format(availableRevenue)}</strong></div></div>
      </article>
    </section>

    <article className={`px-dashboard-alert ${projectedClosing >= 0 ? 'is-positive' : ''}`}>
      <div className="px-dashboard-alert-copy"><div className="px-dashboard-alert-icon">{projectedClosing >= 0 ? '✓' : '!'}</div><div><h3>{projectedClosing >= 0 ? 'Mês sob controle' : 'Mês exige atenção'}</h3><p>{projectedClosing >= 0 ? 'O fluxo projetado termina positivo com os compromissos registrados.' : 'Há compromissos suficientes para levar o fluxo projetado ao negativo.'}</p></div></div>
      <div className="px-gap-block"><span>Fechamento projetado</span><strong>{money.format(projectedClosing)}</strong></div>
    </article>

    <section className="px-metrics">
      <article className="px-card px-metric good"><span>Despesas pagas</span><strong>{money.format(data.summary.realizedExpense)}</strong><small>Já refletidas no saldo atual</small></article>
      <article className="px-card px-metric bad"><span>Despesas pendentes</span><strong>{money.format(pendingAmount)}</strong><small>{agenda.items.length} compromisso(s) acionável(is)</small></article>
      <article className="px-card px-metric info px-benefit-control"><span>Benefício alimentação · disponível</span><strong>{money.format(data.summary.benefitBalance)}</strong><div className="px-benefit-inline"><div><span>Créditos</span><b>{money.format(data.summary.benefitCredits)}</b></div><div><span>Utilizado</span><b>{money.format(data.summary.benefitUsed)}</b></div><button type="button" onClick={() => onNavigate('movements')}>Ver extrato</button></div></article>
      <article className="px-card px-metric warn"><span>Consolidado realizado</span><strong>{money.format(consolidatedRealized)}</strong><small>Monetário + benefício, sem misturar os saldos</small></article>
    </section>

    <section className="px-bottom-grid px-home-action-grid">
      <article className={`px-card px-home-scroll-card ${historyExpanded ? 'is-expanded' : ''}`}>
        <div className="px-panel-head"><div><span>Histórico recente</span><h2>Últimos 20 eventos</h2></div><div className="px-home-panel-actions"><button className="px-home-size-btn" type="button" title={historyExpanded ? 'Recolher card' : 'Expandir card'} onClick={() => setHistoryExpanded((value) => !value)}>{historyExpanded ? '−' : '+'}</button><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('history')}>Ver histórico completo</button></div></div>
        <div className="px-home-scroll-list">
          {feed.map((item) => <div className="px-dashboard-row px-home-history-row" key={item.id}><div className="px-dashboard-row-copy"><strong>{item.title}</strong><small>{item.description}</small><small>{dateTime.format(new Date(item.at))} · {item.actor}</small></div><span className={`px-history-state ${item.state.toLocaleLowerCase('pt-BR')}`}>{item.state}</span><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('history')}>Detalhes</button></div>)}
          {!feed.length ? <div className="px-home-empty-state"><strong>Nenhuma atividade recente encontrada</strong><span>A auditoria normalizada e o histórico legado foram consultados para este período.</span></div> : null}
        </div>
      </article>

      <article className={`px-card px-home-scroll-card px-home-agenda-card ${agendaExpanded ? 'is-expanded' : ''}`}>
        <div className="px-panel-head"><div><span>Agenda financeira</span><h2>Vencimentos de {monthLabel(month)}</h2></div><div className="px-home-panel-actions"><strong>{money.format(agenda.actionableAmount)}</strong><button className="px-home-size-btn" type="button" title={agendaExpanded ? 'Recolher card' : 'Expandir card'} onClick={() => setAgendaExpanded((value) => !value)}>{agendaExpanded ? '−' : '+'}</button></div></div>
        <div className="px-home-scroll-list">
          {agendaRows.map((group) => {
            const status = statusForDate(group.dueDate, today);
            return <div className="px-dashboard-row px-home-agenda-row" key={group.key}><div className={`px-home-due-date ${status === 'VENCIDO' ? 'danger' : status === 'HOJE' ? 'today' : ''}`}><strong>{shortDate(group.dueDate)}</strong><small>{status}</small></div><div className="px-dashboard-row-copy"><strong>{group.title}</strong><small>{group.items.length > 1 ? `${group.items.length} lançamentos agrupados · ` : ''}{group.subtitle}</small></div><strong className="px-home-row-value">{money.format(group.amount)}</strong><button className="px-dashboard-row-action" type="button" onClick={() => openDetail(group)}>Detalhes</button></div>;
          })}
          {!agendaRows.length ? <div className="px-home-empty-state"><strong>Nenhum vencimento acionável</strong><span>Não há compromissos em aberto no período selecionado.</span></div> : null}
        </div>
      </article>
    </section>

    {detail ? <div className="px-home-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
      <aside className="px-home-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${detail.title}`}>
        <header className="px-home-drawer-head"><div><span className="px-kicker">Vencimento · {shortDate(detail.dueDate)}</span><h2>{detail.title}</h2><p>{detail.items.length} item(ns) · {money.format(detail.amount)}</p></div><button type="button" aria-label="Fechar detalhes" onClick={() => setDetail(null)}>×</button></header>
        <div className="px-home-drawer-tools"><button type="button" onClick={() => setDetailSelected(new Set(detail.items.map((item) => item.id)))}>Selecionar todos</button><button type="button" onClick={() => setDetailSelected(new Set())}>Limpar</button><span>{detailSelected.size} selecionado(s)</span></div>
        <div className="px-home-drawer-list">{detail.items.map((item) => <label key={item.id} className="px-home-drawer-item"><input type="checkbox" checked={detailSelected.has(item.id)} onChange={() => toggleDetailItem(item.id)} /><div><strong>{item.description}</strong><small>{item.meta}</small></div><strong>{money.format(item.amount)}</strong></label>)}</div>
        <footer className="px-home-drawer-footer"><div><span>Total selecionado</span><strong>{money.format(selectedDetailAmount)}</strong></div><button type="button" className="px-secondary-action" onClick={() => { setDetail(null); onNavigate('payables'); }}>Abrir Pendentes</button><button type="button" className="px-primary-action" disabled={!detailSelected.size} title="A escrita financeira continua protegida durante a homologação">Revisar pagamento</button><small>A seleção e a revisão estão funcionais. A gravação da baixa continua bloqueada até o gate de escrita financeira.</small></footer>
      </aside>
    </div> : null}
  </>;
}
