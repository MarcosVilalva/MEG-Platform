import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../contracts';
import { buildPhoenixHomeAgenda, type PhoenixHomeAgendaItem } from '../home-agenda';
import '../phoenix-home-now.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

type HomeRoute = 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs' | 'users' | 'settings' | 'receivables' | 'revenues' | 'cashflow' | 'reconcile' | 'analytics' | 'decisions' | 'budgets';
type AgendaDisplayGroup = {
  key: string;
  dueDate: string;
  title: string;
  subtitle: string;
  amount: number;
  items: PhoenixHomeAgendaItem[];
};
type MegNowSignal = {
  kind: 'ok' | 'warning' | 'danger';
  eyebrow: string;
  title: string;
  text: string;
  metric: string;
  action: string;
  route: HomeRoute;
};
type IntelligentAlert = {
  id: string;
  level: 'warning' | 'danger';
  title: string;
  text: string;
  action: string;
  route: HomeRoute;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function shiftIsoDay(value: string, offset: number) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset, 12)).toISOString().slice(0, 10);
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

function eventIsActive(status: unknown) {
  return !['archived', 'arquivado', 'cancelled', 'canceled', 'cancelado'].includes(normalize(status));
}

function cardEntryIsOpen(status: unknown) {
  return !['paid', 'pago', 'reconciled', 'conciliado', 'cancelled', 'canceled', 'cancelado', 'archived', 'arquivado'].includes(normalize(status));
}

function buildIntelligentAlerts(data: PhoenixReadModel, month: string): IntelligentAlert[] {
  const alerts: IntelligentAlert[] = [];
  const monthEvents = data.events.items.filter((event) => event.competence === month && eventIsActive(event.status));

  const duplicateBuckets = new Map<string, typeof monthEvents>();
  monthEvents.forEach((event) => {
    const amount = Math.abs(Number(event.amount || 0));
    if (!amount || !event.description) return;
    const key = `${String(event.date).slice(0, 10)}|${event.accountId || ''}|${normalize(event.description)}|${amount.toFixed(2)}`;
    const current = duplicateBuckets.get(key) || [];
    current.push(event);
    duplicateBuckets.set(key, current);
  });
  const duplicateGroups = [...duplicateBuckets.values()].filter((items) => items.length > 1);
  if (duplicateGroups.length) {
    const first = duplicateGroups[0];
    const amount = Math.abs(Number(first[0]?.amount || 0));
    alerts.push({
      id: 'possible-duplicates',
      level: 'warning',
      title: `${duplicateGroups.length} possível(is) duplicidade(s) encontrada(s)`,
      text: `${first[0]?.description || 'Lançamento'} aparece ${first.length} vezes com mesma data, conta e valor de ${money.format(amount)}.`,
      action: 'Revisar lançamentos',
      route: 'movements',
    });
  }

  const cardPressure = data.cards
    .map((card) => {
      const limit = Number(card.creditLimit || 0);
      const committed = Math.max(0, (card.purchases || []).flatMap((purchase) => purchase.entries || [])
        .filter((entry) => cardEntryIsOpen(entry.status))
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
      const ratio = limit > 0 ? committed / limit * 100 : 0;
      return { card, limit, committed, ratio };
    })
    .filter((item) => item.limit > 0 && item.ratio >= 80)
    .sort((left, right) => right.ratio - left.ratio)[0];
  if (cardPressure) {
    alerts.push({
      id: `card-limit-${cardPressure.card.id}`,
      level: cardPressure.ratio >= 95 ? 'danger' : 'warning',
      title: `${cardPressure.card.name} está em ${whole.format(cardPressure.ratio)}% do limite`,
      text: `${money.format(cardPressure.committed)} comprometidos de ${money.format(cardPressure.limit)}.`,
      action: 'Revisar cartão',
      route: 'cards',
    });
  }

  const unclassified = monthEvents.filter((event) => {
    if (event.type !== 'expense') return false;
    if (normalize(event.account?.type) === 'benefit') return false;
    return !event.categoryId
      && !event.category?.name
      && !event.sourceDetails?.expenseClass
      && !event.sourceDetails?.group;
  });
  if (unclassified.length) {
    alerts.push({
      id: 'unclassified-expenses',
      level: 'warning',
      title: `${unclassified.length} despesa(s) sem classificação`,
      text: 'Classificar esses lançamentos melhora filtros, relatórios e futuras análises do MEG.',
      action: 'Classificar agora',
      route: 'movements',
    });
  }

  if (!data.normalization.primary || !data.normalization.reconciled) {
    alerts.push({
      id: 'normalization-integrity',
      level: 'danger',
      title: 'A leitura financeira precisa de verificação',
      text: 'A normalização atual ainda não está marcada como primária e reconciliada.',
      action: 'Ver integridade',
      route: 'settings',
    });
  }

  return alerts.slice(0, 4);
}

export function PhoenixHomeDashboard({ data, month, onNavigate }: { data: PhoenixReadModel; month: string; onNavigate: (view: HomeRoute) => void }) {
  const today = todayIso();
  const agenda = useMemo(() => buildPhoenixHomeAgenda(data, today), [data, today]);
  const agendaRows = useMemo(() => agendaDisplayGroups(agenda.items), [agenda.items]);
  const alerts = useMemo(() => buildIntelligentAlerts(data, month), [data, month]);
  const visibleAgenda = agendaRows.slice(0, 5);
  const hiddenAgendaCount = Math.max(0, agendaRows.length - visibleAgenda.length);
  const [detail, setDetail] = useState<AgendaDisplayGroup | null>(null);
  const [detailSelected, setDetailSelected] = useState<Set<string>>(() => new Set());

  const pendingAmount = data.summary.pendingAmount || 0;
  const realizedBalance = data.summary.availableBalance + data.summary.realizedResult;
  const freeAfterCommitments = realizedBalance - pendingAmount;
  const nextDue = agendaRows.find((item) => item.dueDate >= today) || agendaRows[0];
  const coverageRaw = pendingAmount > 0 ? (realizedBalance / pendingAmount) * 100 : 100;
  const coverageBar = Math.max(0, Math.min(100, coverageRaw));
  const healthy = freeAfterCommitments >= 0;
  const heroStatus = healthy ? 'Compromissos cobertos' : 'Caixa pressionado';
  const selectedDetailAmount = detail?.items.filter((item) => detailSelected.has(item.id)).reduce((sum, item) => sum + item.amount, 0) || 0;

  const overdueRows = agendaRows.filter((item) => item.dueDate < today);
  const todayRows = agendaRows.filter((item) => item.dueDate === today);
  const sevenDayEnd = shiftIsoDay(today, 6);
  const nextSevenRows = agendaRows.filter((item) => item.dueDate >= today && item.dueDate <= sevenDayEnd);
  const overdueTotal = overdueRows.reduce((sum, item) => sum + item.amount, 0);
  const todayTotal = todayRows.reduce((sum, item) => sum + item.amount, 0);
  const nextSevenTotal = nextSevenRows.reduce((sum, item) => sum + item.amount, 0);
  const sevenDayRemainder = realizedBalance - nextSevenTotal;

  const megNow: MegNowSignal = overdueRows.length
    ? {
      kind: 'danger',
      eyebrow: 'Ação imediata',
      title: `${overdueRows.length} vencimento(s) precisam da sua atenção`,
      text: `Há ${money.format(overdueTotal)} vencidos. Resolva primeiro essas pendências para limpar a agenda.`,
      metric: `${money.format(overdueTotal)} vencido`,
      action: 'Resolver pendências',
      route: 'payables',
    }
    : todayRows.length
      ? {
        kind: 'warning',
        eyebrow: 'MEG Agora',
        title: `Hoje vencem ${money.format(todayTotal)}`,
        text: `${todayRows.length} compromisso(s) vencem hoje. Abra Pendentes para revisar e concluir as baixas.`,
        metric: `${todayRows.length} hoje`,
        action: 'Ver vencimentos de hoje',
        route: 'payables',
      }
      : nextSevenTotal > realizedBalance
        ? {
          kind: 'danger',
          eyebrow: 'Próximos 7 dias',
          title: 'O caixa não cobre todos os próximos compromissos',
          text: `Faltam ${money.format(Math.abs(sevenDayRemainder))} para cobrir os compromissos cadastrados até ${shortDate(sevenDayEnd)}.`,
          metric: `${money.format(Math.abs(sevenDayRemainder))} faltando`,
          action: 'Organizar pendências',
          route: 'payables',
        }
        : {
          kind: 'ok',
          eyebrow: 'MEG Agora',
          title: nextSevenRows.length ? 'Próximos 7 dias cobertos' : 'Nenhum compromisso nos próximos 7 dias',
          text: nextSevenRows.length
            ? `Depois dos compromissos até ${shortDate(sevenDayEnd)}, permanecem ${money.format(Math.max(0, sevenDayRemainder))} no caixa atual.`
            : 'Sua agenda imediata está livre. Planejamentos e simulações ficam concentrados em Decisões.',
          metric: nextSevenRows.length ? `${money.format(Math.max(0, sevenDayRemainder))} livre` : 'Agenda livre',
          action: nextSevenRows.length ? 'Ver pendências' : 'Abrir Decisões',
          route: nextSevenRows.length ? 'payables' : 'decisions',
        };

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

  return <>
    <div className="px-page-head">
      <div>
        <span className="px-kicker">Visão geral</span>
        <h1>{monthLabel(month)}</h1>
        <p>O essencial para decidir o que fazer agora, sem repetir análises que pertencem às outras áreas.</p>
        <span className="px-updated">Atualizado agora · {data.normalization.primary && data.normalization.reconciled ? 'dados sincronizados' : 'integridade em verificação'}</span>
      </div>
    </div>

    <section className={`px-meg-now ${megNow.kind === 'danger' ? 'is-danger' : megNow.kind === 'warning' ? 'is-warning' : ''}`} aria-label="MEG Agora">
      <div className="px-meg-now-mark" aria-hidden="true">{megNow.kind === 'danger' ? '!' : megNow.kind === 'warning' ? '↗' : '✓'}</div>
      <div className="px-meg-now-copy"><span>{megNow.eyebrow}</span><h2>{megNow.title}</h2><p>{megNow.text}</p></div>
      <div className="px-meg-now-action"><strong>{megNow.metric}</strong><button type="button" onClick={() => onNavigate(megNow.route)}>{megNow.action}</button></div>
    </section>

    <section className={`px-smart-alerts ${alerts.length ? 'has-alerts' : 'is-clear'}`} aria-label="Alertas inteligentes">
      <div className="px-smart-alerts-head">
        <span className="px-smart-alerts-mark" aria-hidden="true">{alerts.length ? '!' : '✓'}</span>
        <div><span>Monitoramento inteligente</span><strong>{alerts.length ? `MEG detectou ${alerts.length} ponto(s) de atenção` : 'Nenhuma inconsistência relevante encontrada'}</strong></div>
        <small>{alerts.length ? 'Somente exceções que merecem revisão.' : 'Duplicidades, classificação, cartões e integridade estão sem alertas.'}</small>
      </div>
      {alerts.length ? <div className="px-smart-alerts-list">{alerts.map((alert) => <div className={`px-smart-alert-row ${alert.level === 'danger' ? 'is-danger' : ''}`} key={alert.id}><span className="px-smart-alert-dot" /><div><strong>{alert.title}</strong><small>{alert.text}</small></div><button type="button" onClick={() => onNavigate(alert.route)}>{alert.action}</button></div>)}</div> : null}
    </section>

    <section className="px-dashboard-grid px-home-balance-grid">
      <article className={`px-card px-home-hero ${healthy ? 'is-healthy' : 'is-attention'}`}>
        <div className="px-home-hero-rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="px-home-hero-primary">
          <div className="px-home-hero-status"><span className="px-home-hero-status-dot" />{heroStatus}</div>
          <span className="px-kicker">Saldo monetário atual</span>
          <h2>{money.format(realizedBalance)}</h2>
          <p>Valor efetivamente disponível agora. Receitas futuras só entram quando forem realizadas.</p>
          <div className="px-home-coverage"><div><span>Cobertura dos compromissos</span><strong>{whole.format(coverageRaw)}%</strong></div><div className="px-home-coverage-track"><i style={{ width: `${coverageBar}%` }} /></div></div>
        </div>

        <div className="px-home-hero-insights">
          <article className="px-home-insight is-free"><span>Dinheiro livre</span><strong className={freeAfterCommitments < 0 ? 'negative' : ''}>{money.format(freeAfterCommitments)}</strong><small>Saldo atual menos pendências</small></article>
          <article className="px-home-insight is-due"><span>Próximo vencimento</span><strong>{nextDue ? money.format(nextDue.amount) : '—'}</strong><small>{nextDue ? `${shortDate(nextDue.dueDate)} · ${nextDue.title}` : 'Nenhum vencimento no período'}</small></article>
        </div>

        <div className="px-home-hero-footer">
          <div><span>Receitas realizadas</span><strong>{money.format(data.summary.realizedIncome)}</strong></div>
          <div><span>Despesas pagas</span><strong>{money.format(data.summary.realizedExpense)}</strong></div>
          <div><span>Benefício disponível</span><strong>{money.format(data.summary.benefitBalance)}</strong></div>
        </div>
      </article>
    </section>

    <section className="px-bottom-grid px-home-action-grid">
      <article className="px-card px-home-scroll-card px-home-agenda-card">
        <div className="px-panel-head"><div><span>Prioridades</span><h2>Vencimentos de {monthLabel(month)}</h2></div><div className="px-home-panel-actions"><strong>{money.format(agenda.actionableAmount)}</strong><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Abrir Pendentes</button></div></div>
        <div className="px-home-scroll-list">
          {visibleAgenda.map((group) => {
            const status = statusForDate(group.dueDate, today);
            return <div className="px-dashboard-row px-home-agenda-row" key={group.key}><div className={`px-home-due-date ${status === 'VENCIDO' ? 'danger' : status === 'HOJE' ? 'today' : ''}`}><strong>{shortDate(group.dueDate)}</strong><small>{status}</small></div><div className="px-dashboard-row-copy"><strong>{group.title}</strong><small>{group.items.length > 1 ? `${group.items.length} lançamentos agrupados · ` : ''}{group.subtitle}</small></div><strong className="px-home-row-value">{money.format(group.amount)}</strong><button className="px-dashboard-row-action" type="button" onClick={() => openDetail(group)}>Detalhes</button></div>;
          })}
          {!visibleAgenda.length ? <div className="px-home-empty-state"><strong>Nenhum vencimento acionável</strong><span>Não há compromissos em aberto no período selecionado.</span></div> : null}
        </div>
        {hiddenAgendaCount ? <div className="px-home-panel-actions"><span className="px-toolbar-note">+ {hiddenAgendaCount} compromisso(s) na agenda</span><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Ver todos</button></div> : null}
      </article>
    </section>

    {detail ? <div className="px-home-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
      <aside className="px-home-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${detail.title}`}>
        <header className="px-home-drawer-head"><div><span className="px-kicker">Vencimento · {shortDate(detail.dueDate)}</span><h2>{detail.title}</h2><p>{detail.items.length} item(ns) · {money.format(detail.amount)}</p></div><button type="button" aria-label="Fechar detalhes" onClick={() => setDetail(null)}>×</button></header>
        <div className="px-home-drawer-tools"><button type="button" onClick={() => setDetailSelected(new Set(detail.items.map((item) => item.id)))}>Selecionar todos</button><button type="button" onClick={() => setDetailSelected(new Set())}>Limpar</button><span>{detailSelected.size} selecionado(s)</span></div>
        <div className="px-home-drawer-list">{detail.items.map((item) => <label key={item.id} className="px-home-drawer-item"><input type="checkbox" checked={detailSelected.has(item.id)} onChange={() => toggleDetailItem(item.id)} /><div><strong>{item.description}</strong><small>{item.meta}</small></div><strong>{money.format(item.amount)}</strong></label>)}</div>
        <footer className="px-home-drawer-footer"><div><span>Total selecionado</span><strong>{money.format(selectedDetailAmount)}</strong></div><button type="button" className="px-secondary-action" onClick={() => { setDetail(null); onNavigate('payables'); }}>Abrir Pendentes</button><button type="button" className="px-primary-action" disabled={!detailSelected.size} onClick={() => { setDetail(null); onNavigate('payables'); }}>Revisar pagamento</button><small>A baixa é concluída na tela Pendentes, onde seleção, conta e forma de pagamento são revisadas.</small></footer>
      </aside>
    </div> : null}
  </>;
}
