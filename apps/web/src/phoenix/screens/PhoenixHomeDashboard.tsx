import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../contracts';
import { buildPhoenixHomeAgenda, type PhoenixHomeAgendaItem } from '../home-agenda';
import { isPhoenixBenefitEvent } from '../home-period-summary';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type HomeRoute = 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs' | 'users' | 'settings' | 'receivables' | 'revenues' | 'cashflow' | 'reconcile' | 'analytics' | 'decisions' | 'budgets';
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

function actionLabel(action: string) {
  const normalized = action.toUpperCase();
  if (normalized.includes('CREATED')) return 'Lançamento incluído';
  if (normalized.includes('UPDATED')) return 'Lançamento alterado';
  if (normalized.includes('ARCHIVED') || normalized.includes('DELETED')) return 'Lançamento arquivado';
  if (normalized.includes('PAYMENT') || normalized.includes('PAID')) return 'Pagamento confirmado';
  if (normalized.includes('TRANSFER')) return 'Transferência registrada';
  return action.replace(/_/g, ' ').toLocaleLowerCase('pt-BR').replace(/^./, (letter) => letter.toUpperCase());
}

function historyFeed(data: PhoenixReadModel): HistoryFeedItem[] {
  const audit = data.financialAudit.items.map((item) => ({
    id: `audit-${item.id}`,
    at: item.at,
    title: actionLabel(item.action),
    description: item.entity ? `${item.entity} · registro ${item.entityId}` : 'Evento financeiro auditado',
    actor: item.actor?.name || item.actor?.email || 'Usuário do MEG',
  }));
  const legacy = data.activities.map((item) => ({
    id: `activity-${item.id}`,
    at: item.at,
    title: actionLabel(item.action),
    description: item.transaction?.description || 'Atividade financeira preservada',
    actor: item.userName || 'Usuário do MEG',
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


type HomeGlyphKind = 'home' | 'wallet' | 'pending' | 'calendar' | 'receive' | 'alert' | 'income' | 'expense' | 'benefit' | 'history' | 'launch' | 'decision';

function HomeGlyph({ kind }: { kind: HomeGlyphKind }) {
  if (kind === 'wallet') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h11" /><path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z" /></svg>;
  if (kind === 'pending') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /><path d="M5.8 4.8 4 6.6" /></svg>;
  if (kind === 'calendar') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.4" /><path d="M8 3.8v4M16 3.8v4M4 9.5h16" /><path d="M8 13h3M13 13h3M8 16h3" /></svg>;
  if (kind === 'receive') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11" /><path d="m8 10 4 4 4-4" /><path d="M5 17.5h14v3H5z" /></svg>;
  if (kind === 'alert') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 21 19H3L12 3.5Z" /><path d="M12 8.5v5" /><circle cx="12" cy="16.5" r=".8" /></svg>;
  if (kind === 'income') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17 11 11l3.5 3.5L20 9" /><path d="M15 9h5v5" /></svg>;
  if (kind === 'expense') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7 11 13l3.5-3.5L20 15" /><path d="M15 15h5v-5" /></svg>;
  if (kind === 'benefit') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M7 10h6M7 14h3" /></svg>;
  if (kind === 'history') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" /><path d="M4 4v4.6h4.6" /><path d="M12 7.5V12l3 2" /></svg>;
  if (kind === 'launch') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
  if (kind === 'decision') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 12 12 21 4 12 12 3Z" /><path d="M9 12h6" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4v-8.5Z" /></svg>;
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
  const feed = useMemo(() => historyFeed(data), [data]);
  const visibleAgenda = agendaRows.slice(0, 4);
  const hiddenAgendaCount = Math.max(0, agendaRows.length - visibleAgenda.length);
  const [detail, setDetail] = useState<AgendaDisplayGroup | null>(null);
  const [detailSelected, setDetailSelected] = useState<Set<string>>(() => new Set());
  const [benefitOpen, setBenefitOpen] = useState(false);

  const pendingAmount = data.summary.pendingAmount || 0;
  const realizedBalance = data.summary.availableBalance + data.summary.realizedResult;
  const freeAfterCommitments = realizedBalance - pendingAmount;
  const consolidatedRealized = realizedBalance + data.summary.benefitBalance;
  const openReceivables = data.receivables.filter((item) => item.status !== 'paid' && Number(item.openAmount || 0) > 0);
  const openReceivableAmount = openReceivables.reduce((sum, item) => sum + Number(item.openAmount || 0), 0);
  const latestActivity = feed[0] || null;
  const benefitEvents = data.events.items
    .filter(isPhoenixBenefitEvent)
    .filter((event) => ['paid', 'reconciled', 'confirmed'].includes(event.status))
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
  const benefitCredits = benefitEvents.reduce((sum, event) => {
    const signed = Number(event.signedAmount || 0);
    return signed > 0 ? sum + signed : sum;
  }, 0);
  const benefitSpent = benefitEvents.reduce((sum, event) => {
    const signed = Number(event.signedAmount || 0);
    return signed < 0 ? sum + Math.abs(signed) : sum;
  }, 0);
  const benefitPeriodNet = benefitEvents.reduce((sum, event) => sum + Number(event.signedAmount || 0), 0);
  const benefitOpeningBalance = Number(data.summary.benefitBalance || 0) - benefitPeriodNet;
  const benefitEvolution = benefitEvents.reduce<Array<{ id: string; date: string; description: string; amount: number; balance: number }>>((rows, event) => {
    const amount = Number(event.signedAmount || 0);
    const previous = rows.length ? rows[rows.length - 1].balance : benefitOpeningBalance;
    rows.push({
      id: event.id,
      date: String(event.date).slice(0, 10),
      description: event.description || (amount >= 0 ? 'Crédito de benefício' : 'Uso do benefício'),
      amount,
      balance: previous + amount
    });
    return rows;
  }, []);
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
    <section className="px-home-cockpit" data-home-layout="premium-v1">
      <header className="px-home-top-hero">
        <div className="px-home-top-main">
          <span className="px-home-top-icon" aria-hidden="true"><HomeGlyph kind="home" /></span>
          <div>
            <span className="px-kicker">Início · {monthLabel(month)}</span>
            <h1>Seu dinheiro, agora</h1>
            <p>O que está disponível, o que exige ação e o que vem pela frente — sem ruído.</p>
          </div>
        </div>
        <div className="px-home-top-status">
          <span className={`px-home-health ${healthy ? 'is-ok' : 'is-warning'}`}>{heroStatus}</span>
          <button className="px-home-benefit-chip" type="button" title="Abrir acompanhamento do benefício" onClick={() => setBenefitOpen(true)}>
            <HomeGlyph kind="benefit" />
            <span>Benefício</span>
            <strong>{money.format(data.summary.benefitBalance)}</strong>
          </button>
        </div>
      </header>

      <section className="px-home-kpis" aria-label="Indicadores principais">
        <article className="balance"><span className="px-home-kpi-icon" aria-hidden="true"><HomeGlyph kind="wallet" /></span><div><span>Saldo disponível</span><strong>{money.format(realizedBalance)}</strong><small>Caixa monetário atual</small></div></article>
        <article className={pendingAmount > 0 ? 'pending' : 'neutral'}><span className="px-home-kpi-icon" aria-hidden="true"><HomeGlyph kind="pending" /></span><div><span>Pendências abertas</span><strong>{money.format(pendingAmount)}</strong><small>{agendaRows.length} compromisso(s) na agenda</small></div></article>
        <article className={nextSevenTotal > realizedBalance ? 'warning' : 'week'}><span className="px-home-kpi-icon" aria-hidden="true"><HomeGlyph kind="calendar" /></span><div><span>Próximos 7 dias</span><strong>{money.format(nextSevenTotal)}</strong><small>{nextSevenRows.length} compromisso(s) até {shortDate(sevenDayEnd)}</small></div></article>
        <article className="receive"><span className="px-home-kpi-icon" aria-hidden="true"><HomeGlyph kind="receive" /></span><div><span>A receber</span><strong>{money.format(openReceivableAmount)}</strong><small>{openReceivables.length} título(s) em aberto</small></div></article>
      </section>

      <section className={`px-home-priority-strip ${megNow.kind === 'danger' ? 'is-danger' : megNow.kind === 'warning' ? 'is-warning' : 'is-ok'}`} aria-label="Prioridade do momento">
        <span className="px-home-priority-icon" aria-hidden="true"><HomeGlyph kind={megNow.kind === 'ok' ? 'calendar' : 'alert'} /></span>
        <div className="px-home-priority-copy"><span>{megNow.eyebrow}</span><strong>{megNow.title}</strong><small>{megNow.text}</small></div>
        <div className="px-home-priority-action"><b>{megNow.metric}</b><button type="button" onClick={() => onNavigate(megNow.route)}>{megNow.action}</button></div>
      </section>

      <section className="px-home-workspace">
        <article className="px-home-priority-panel">
          <header className="px-home-panel-head">
            <div className="px-home-panel-title"><span className="px-home-panel-icon" aria-hidden="true"><HomeGlyph kind="pending" /></span><div><h2>Prioridades de agora</h2><p>Vencimentos de {monthLabel(month)} ordenados para ação rápida.</p></div></div>
            <div className="px-home-panel-meta"><strong>{money.format(agenda.actionableAmount)}</strong><span>em compromissos</span></div>
          </header>

          <div className="px-home-priority-list">
            {visibleAgenda.map((group) => {
              const status = statusForDate(group.dueDate, today);
              return <button type="button" className={`px-home-priority-row ${status === 'VENCIDO' ? 'is-danger' : status === 'HOJE' ? 'is-today' : ''}`} key={group.key} onClick={() => openDetail(group)}>
                <span className="px-home-due-date"><strong>{shortDate(group.dueDate)}</strong><small>{status}</small></span>
                <span className="px-home-priority-row-copy"><strong>{group.title}</strong><small>{group.items.length > 1 ? `${group.items.length} lançamentos agrupados · ` : ''}{group.subtitle}</small></span>
                <strong className="px-home-priority-value">{money.format(group.amount)}</strong>
                <span className="px-home-priority-chevron" aria-hidden="true">›</span>
              </button>;
            })}
            {!visibleAgenda.length ? <div className="px-home-empty-state"><strong>Nenhum compromisso exige ação agora</strong><span>A agenda imediata está livre no período selecionado.</span></div> : null}
          </div>

          <footer className="px-home-panel-footer">
            <span>{hiddenAgendaCount ? `+ ${hiddenAgendaCount} compromisso(s) fora da visão rápida` : 'Agenda rápida atualizada'}</span>
            <button type="button" onClick={() => onNavigate('payables')}>Abrir Pendentes</button>
          </footer>
        </article>

        <aside className="px-home-executive-panel">
          <header className="px-home-panel-head">
            <div className="px-home-panel-title"><span className="px-home-panel-icon" aria-hidden="true"><HomeGlyph kind="wallet" /></span><div><h2>Resumo executivo</h2><p>Leitura curta para decidir sem abrir outro módulo.</p></div></div>
            <span className={`px-home-signal-chip ${alerts.length ? 'has-alerts' : ''}`}>{alerts.length ? `${alerts.length} sinal(is)` : 'Sem alertas'}</span>
          </header>

          <div className="px-home-executive-balance">
            <div><span>Dinheiro livre após compromissos</span><strong className={freeAfterCommitments < 0 ? 'negative' : ''}>{money.format(freeAfterCommitments)}</strong><small>{healthy ? 'Caixa cobre as pendências cadastradas.' : 'Pendências superam o caixa disponível.'}</small></div>
            <div className="px-home-coverage"><div><span>Cobertura</span><strong>{whole.format(coverageRaw)}%</strong></div><div className="px-home-coverage-track"><i style={{ width: `${coverageBar}%` }} /></div></div>
          </div>

          <div className="px-home-executive-metrics">
            <div><span className="px-home-mini-icon income" aria-hidden="true"><HomeGlyph kind="income" /></span><div><small>Receitas realizadas</small><strong>{money.format(data.summary.realizedIncome)}</strong></div></div>
            <div><span className="px-home-mini-icon expense" aria-hidden="true"><HomeGlyph kind="expense" /></span><div><small>Despesas pagas</small><strong>{money.format(data.summary.realizedExpense)}</strong></div></div>
            <div><span className="px-home-mini-icon benefit" aria-hidden="true"><HomeGlyph kind="benefit" /></span><div><small>Benefício alimentação · disponível</small><strong>{money.format(data.summary.benefitBalance)}</strong></div></div>
            <div><span className="px-home-mini-icon total" aria-hidden="true"><HomeGlyph kind="wallet" /></span><div><small>Consolidado realizado</small><strong>{money.format(consolidatedRealized)}</strong></div></div>
          </div>

          {alerts[0] ? <button type="button" className={`px-home-smart-signal ${alerts[0].level === 'danger' ? 'is-danger' : ''}`} onClick={() => onNavigate(alerts[0].route)}>
            <span aria-hidden="true"><HomeGlyph kind="alert" /></span><div><small>Sinal inteligente</small><strong>{alerts[0].title}</strong><p>{alerts[0].text}</p></div><b>Revisar</b>
          </button> : <div className="px-home-smart-signal is-clear"><span aria-hidden="true">✓</span><div><small>Sinal inteligente</small><strong>Nenhuma inconsistência relevante</strong><p>Duplicidades, classificação, cartões e integridade estão sem alertas.</p></div></div>}

          {latestActivity ? <button type="button" className="px-home-last-activity" onClick={() => onNavigate('history')}>
            <span className="px-home-mini-icon" aria-hidden="true"><HomeGlyph kind="history" /></span><div><small>Última atividade</small><strong>{latestActivity.title}</strong><p>{latestActivity.description} · {dateTime.format(new Date(latestActivity.at))}</p></div><b>Histórico</b>
          </button> : null}

          <div className="px-home-quick-actions" aria-label="Ações rápidas">
            <button type="button" onClick={() => onNavigate('movements')}><HomeGlyph kind="launch" /><span>Lançamentos</span></button>
            <button type="button" onClick={() => onNavigate('payables')}><HomeGlyph kind="pending" /><span>Pendentes</span></button>
            <button type="button" onClick={() => onNavigate('history')}><HomeGlyph kind="history" /><span>Histórico</span></button>
            <button type="button" onClick={() => onNavigate('decisions')}><HomeGlyph kind="decision" /><span>Decisões</span></button>
          </div>
        </aside>
      </section>
    </section>

    {benefitOpen ? <div className="px-home-benefit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBenefitOpen(false); }}>
      <section className="px-home-benefit-modal" role="dialog" aria-modal="true" aria-label="Acompanhamento do benefício alimentação">
        <header className="px-home-benefit-modal-head">
          <div className="px-home-benefit-modal-title">
            <span className="px-home-benefit-modal-icon" aria-hidden="true"><HomeGlyph kind="benefit" /></span>
            <div><span className="px-kicker">Benefício alimentação · {monthLabel(month)}</span><h2>Evolução do saldo</h2><p>Créditos, utilização e saldo disponível do período, separados do caixa monetário.</p></div>
          </div>
          <button type="button" aria-label="Fechar acompanhamento do benefício" onClick={() => setBenefitOpen(false)}>×</button>
        </header>

        <div className="px-home-benefit-summary px-home-benefit-summary-four">
          <article><span>Saldo inicial</span><strong>{money.format(benefitOpeningBalance)}</strong><small>Posição imediatamente antes do período</small></article>
          <article className="credit"><span>Créditos no período</span><strong>{money.format(benefitCredits)}</strong><small>{benefitEvolution.filter((item) => item.amount > 0).length} crédito(s) realizado(s)</small></article>
          <article className="spent"><span>Utilizado</span><strong>{money.format(benefitSpent)}</strong><small>{benefitEvolution.filter((item) => item.amount < 0).length} gasto(s) realizado(s)</small></article>
          <article className="current"><span>Saldo final</span><strong>{money.format(data.summary.benefitBalance)}</strong><small>Saldo do benefício ao fim do período selecionado</small></article>
        </div>

        <div className="px-home-benefit-equation" aria-label="Memória de cálculo do benefício">
          <span>{money.format(benefitOpeningBalance)}</span><b>+</b><span>{money.format(benefitCredits)}</span><b>−</b><span>{money.format(benefitSpent)}</span><b>=</b><strong>{money.format(data.summary.benefitBalance)}</strong>
        </div>

        <section className="px-home-benefit-movements">
          <header><div><span>Movimentações</span><strong>{benefitEvolution.length} registro(s) no período</strong></div><button type="button" onClick={() => { setBenefitOpen(false); onNavigate('movements'); }}>Ver lançamentos</button></header>
          <div className="px-home-benefit-list">
            {[...benefitEvolution].reverse().map((item) => <div className="px-home-benefit-row" key={item.id}>
              <span className={`px-home-benefit-row-icon ${item.amount >= 0 ? 'credit' : 'debit'}`} aria-hidden="true">{item.amount >= 0 ? '↗' : '↘'}</span>
              <div><strong>{item.description}</strong><small>{shortDate(item.date)} · saldo após movimento {money.format(item.balance)}</small></div>
              <strong className={item.amount >= 0 ? 'credit' : 'debit'}>{item.amount >= 0 ? '+' : '−'} {money.format(Math.abs(item.amount))}</strong>
            </div>)}
            {!benefitEvolution.length ? <div className="px-home-benefit-empty"><strong>Nenhuma movimentação de benefício neste período</strong><span>O saldo atual continua disponível para consulta.</span></div> : null}
          </div>
        </section>

        <footer className="px-home-benefit-footer"><span>O benefício permanece separado do saldo monetário da Home.</span><button type="button" onClick={() => { setBenefitOpen(false); onNavigate('history'); }}>Abrir Histórico</button><button type="button" className="primary" onClick={() => setBenefitOpen(false)}>Fechar</button></footer>
      </section>
    </div> : null}

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