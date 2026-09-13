import { useEffect, useRef, useState } from 'react';
import type { PhoenixLoadState, PhoenixReadModel } from './contracts';
import { loadPhoenixAllEvents, loadPhoenixReadModel, peekPhoenixReadModel } from './data/load-phoenix-read-model';
import { buildPhoenixHomeAgenda } from './home-agenda';
import { PhoenixCommandPalette, type PhoenixRoute } from './PhoenixCommandPalette';
import { PhoenixPayables } from './screens/PhoenixReadScreens';
import { PhoenixCardsGrid } from './screens/PhoenixCardsGrid';
import { PhoenixCatalogsGrid } from './screens/PhoenixCatalogsGrid';
import { PhoenixHomeAllTime } from './screens/PhoenixHomeAllTime';
import { PhoenixMovementsV15 } from './screens/PhoenixMovementsV15';
import { PhoenixHistory } from './screens/PhoenixHistory';
import { PhoenixUsers } from './screens/PhoenixUsers';
import { PhoenixSettings } from './screens/PhoenixSettings';
import { PhoenixCashflowGrid, PhoenixReceivablesGrid, PhoenixRevenuesGrid } from './screens/PhoenixWebGridScreens';
import {
  PhoenixAnalytics,
  PhoenixBudgets,
  PhoenixReconciliation
} from './screens/PhoenixWebScreens';
import './phoenix-v15.css';
import './phoenix-parity-v15.css';
import './phoenix-period.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type PhoenixView = PhoenixRoute;
type ViewDefinition = { id: PhoenixView; icon: string; label: string };
type PeriodMode = 'month' | 'range' | 'all';

const mainViews: ViewDefinition[] = [
  { id: 'home', icon: '⌂', label: 'Início' },
  { id: 'movements', icon: '▦', label: 'Lançamentos' },
  { id: 'history', icon: '◷', label: 'Histórico' },
  { id: 'payables', icon: '◷', label: 'Pendentes' },
  { id: 'cards', icon: '▣', label: 'Cartões' },
  { id: 'catalogs', icon: '≡', label: 'Cadastros' },
  { id: 'users', icon: '♙', label: 'Usuários e permissões' },
  { id: 'settings', icon: '⚙', label: 'Configurações' }
];

const webViews: ViewDefinition[] = [
  { id: 'receivables', icon: '◫', label: 'Contas a receber' },
  { id: 'revenues', icon: '↗', label: 'Receitas' },
  { id: 'cashflow', icon: '↔', label: 'Fluxo de caixa' },
  { id: 'reconcile', icon: '✓', label: 'Conciliação' },
  { id: 'analytics', icon: '⌁', label: 'Análises' },
  { id: 'budgets', icon: '◎', label: 'Orçamentos e metas' }
];

const views = [...mainViews, ...webViews];

const subtitles: Record<PhoenixView, string> = {
  home: 'Visão geral da sua vida financeira',
  movements: 'Inclua e controle seus eventos financeiros',
  history: 'Consulte as ações do mais novo para o mais antigo',
  payables: 'Prioridades e compromissos do período',
  cards: 'Limites, faturas e compras',
  catalogs: 'Organize a base operacional',
  users: 'Pessoas, perfis e permissões',
  settings: 'Personalize o MEG do seu jeito',
  receivables: 'Títulos e recebimentos em aberto',
  revenues: 'Origem e evolução das entradas',
  cashflow: 'Fechamento realizado e projetado',
  reconcile: 'Compare o MEG com o saldo real',
  analytics: 'Tendências e comparações históricas',
  budgets: 'Planejamento e metas financeiras'
};

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value || '2026';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  return `${year}-${month}`;
}

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function nextMonth(value: string) {
  return shiftMonth(value, 1);
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function shortMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '')
    .replace(/^./, (letter) => letter.toUpperCase());
  return `${label}/${year}`;
}

function formatShortIso(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function financialActionLabel(action: string) {
  const normalized = action.toUpperCase();
  if (normalized.includes('CREATED')) return 'Lançamento incluído';
  if (normalized.includes('UPDATED')) return 'Lançamento alterado';
  if (normalized.includes('ARCHIVED') || normalized.includes('DELETED')) return 'Lançamento arquivado';
  if (normalized.includes('PAYMENT') || normalized.includes('PAID')) return 'Pagamento confirmado';
  if (normalized.includes('TRANSFER')) return 'Transferência registrada';
  return action.replace(/_/g, ' ').toLocaleLowerCase('pt-BR').replace(/^./, (letter) => letter.toUpperCase());
}

function financialAuditStatus(action: string) {
  const normalized = action.toUpperCase();
  if (normalized.includes('UPDATED')) return 'ATUALIZADO';
  if (normalized.includes('ARCHIVED') || normalized.includes('DELETED')) return 'ARQUIVADO';
  return 'SINCRONIZADO';
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
  const result = new Date(Date.UTC(year, month - 1, day + offset, 12));
  return result.toISOString().slice(0, 10);
}

function monthsBetween(start: string, end: string) {
  const result: string[] = [];
  let cursor = start.slice(0, 7);
  const finish = end.slice(0, 7);
  for (let guard = 0; guard < 36 && cursor <= finish; guard += 1) {
    result.push(cursor);
    cursor = nextMonth(cursor);
  }
  return result;
}

function monthlySnapshotMatches(data: PhoenixReadModel, targetMonth: string) {
  return data.month === targetMonth
    && data.summary.month === targetMonth
    && data.analytics.month === targetMonth
    && data.cashflow.month === targetMonth;
}

function HomeScreen({ data, month, onNavigate }: { data: PhoenixReadModel; month: string; onNavigate: (view: PhoenixView) => void }) {
  const pendingAmount = data.summary.pendingAmount || 0;
  const realizedBalance = data.summary.availableBalance + data.summary.realizedResult;
  const availableRevenue = data.summary.availableBalance + data.summary.realizedIncome;
  const projectedClosing = data.cashflow.projectedClosing;
  const consolidatedRealized = realizedBalance + data.summary.benefitBalance;
  const recentAudit = data.financialAudit.items.slice(0, 3);
  const today = todayIso();
  const agenda = buildPhoenixHomeAgenda(data, today);
  const agendaGroups = agenda.groups;
  const agendaAmount = agenda.actionableAmount;

  return <>
    <div className="px-page-head"><div><span className="px-kicker">Visão geral</span><h1>{monthLabel(month)}</h1><p>Leitura do mês usando apenas os valores de referência definidos na regra de negócio do MEG.</p><span className="px-updated">Atualizado agora · {data.normalization.primary && data.normalization.reconciled ? 'dados sincronizados' : 'integridade em verificação'}</span></div></div>

    <section className="px-dashboard-grid">
      <article className="px-card px-premium-balance"><span className="px-kicker">Saldo monetário realizado</span><h2>{money.format(realizedBalance)}</h2><p>Receita disponível menos despesas monetárias efetivamente pagas.</p><div className="px-balance-stats"><div className="px-balance-stat"><span>Saldo anterior</span><strong>{money.format(data.summary.availableBalance)}</strong></div><div className="px-balance-stat"><span>Receitas do mês</span><strong>{money.format(data.summary.realizedIncome)}</strong></div><div className="px-balance-stat"><span>Receita disponível</span><strong>{money.format(availableRevenue)}</strong></div></div></article>
    </section>

    <article className={`px-dashboard-alert ${projectedClosing >= 0 ? 'is-positive' : ''}`}>
      <div className="px-dashboard-alert-copy"><div className="px-dashboard-alert-icon">{projectedClosing >= 0 ? '✓' : '!'}</div><div><h3>{projectedClosing >= 0 ? 'Mês sob controle' : 'Mês exige atenção'}</h3><p>O diagnóstico principal considera o mês corrente e não pode ser mascarado por filtros analíticos.</p></div></div>
      <div className="px-gap-block"><span>{projectedClosing >= 0 ? 'Saldo projetado para fechar o mês' : 'Falta projetada para fechar o mês'}</span><strong>{money.format(projectedClosing)}</strong></div>
    </article>

    <section className="px-metrics">
      <article className="px-card px-metric good"><span>Despesas pagas</span><strong>{money.format(data.summary.realizedExpense)}</strong><small>Reduzem o saldo realizado</small></article>
      <article className="px-card px-metric bad"><span>Despesas pendentes</span><strong>{money.format(pendingAmount)}</strong><small>Não reduzem o realizado até a baixa</small></article>
      <article className="px-card px-metric info px-benefit-control"><span>Benefício alimentação · disponível</span><strong>{money.format(data.summary.benefitBalance)}</strong><div className="px-benefit-inline"><div><span>Créditos</span><b>{money.format(data.summary.benefitCredits)}</b></div><div><span>Utilizado</span><b>{money.format(data.summary.benefitUsed)}</b></div><button type="button" onClick={() => onNavigate('movements')}>Ver extrato</button></div></article>
      <article className="px-card px-metric warn"><span>Consolidado realizado</span><strong>{money.format(consolidatedRealized)}</strong><small>Monetário + benefício do período</small></article>
    </section>

    <section className="px-bottom-grid">
      <article className="px-card"><div className="px-panel-head"><div><span>Histórico recente</span><h2>Últimos lançamentos</h2></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('history')}>Ver histórico completo</button></div><div>{recentAudit.map((item) => <div className="px-dashboard-row" key={item.id}><div className="px-dashboard-row-copy"><strong>{financialActionLabel(item.action)}</strong><small>{shortDate.format(new Date(item.at))} · {item.actor?.name || item.actor?.email || 'Usuário do MEG'}</small></div><span className={`px-history-state ${financialAuditStatus(item.action).toLocaleLowerCase('pt-BR')}`}>{financialAuditStatus(item.action)}</span><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('history')}>Abrir</button></div>)}{recentAudit.length === 0 ? <p className="px-empty">Nenhum evento de auditoria localizado.</p> : null}</div></article>
      <article className="px-card"><div className="px-panel-head"><div><span>Agenda financeira</span><h2>Vencimentos acionáveis</h2></div><strong>{money.format(agendaAmount)}</strong></div><div>{agendaGroups.map((item) => <div className="px-dashboard-row" key={item.kind}><span className={`px-due-label ${item.kind === 'VENCIDOS' ? 'danger' : item.kind === 'FATURA' ? 'invoice' : ''}`}>{item.kind}</span><div className="px-dashboard-row-copy"><strong>{item.title}</strong><small>{item.subtitle} · {item.count} item(ns) · {money.format(item.amount)}</small></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Detalhes</button></div>)}{agendaGroups.length === 0 ? <p className="px-empty">Nenhum compromisso acionável no período.</p> : null}</div></article>
    </section>
  </>;
}

function ReadScreen({ view, data, month, theme, periodMode, launchRequest, onToggleTheme, onNavigate }: {
  view: PhoenixView;
  data: PhoenixReadModel;
  month: string;
  theme: 'dark' | 'light';
  periodMode: PeriodMode;
  launchRequest: number;
  onToggleTheme: () => void;
  onNavigate: (view: PhoenixView) => void;
}) {
  if (view === 'home') return periodMode === 'all'
    ? <PhoenixHomeAllTime data={data} onNavigate={onNavigate} />
    : <HomeScreen data={data} month={month} onNavigate={onNavigate} />;
  if (view === 'movements') return <PhoenixMovementsV15 data={data} launchRequest={launchRequest} onNavigateHistory={() => onNavigate('history')} />;
  if (view === 'history') return <PhoenixHistory data={data} />;
  if (view === 'payables') return <PhoenixPayables data={data} />;
  if (view === 'cards') return <PhoenixCardsGrid data={data} />;
  if (view === 'catalogs') return <PhoenixCatalogsGrid data={data} />;
  if (view === 'users') return <PhoenixUsers data={data} />;
  if (view === 'settings') return <PhoenixSettings data={data} theme={theme} onToggleTheme={onToggleTheme} />;
  if (view === 'receivables') return <PhoenixReceivablesGrid data={data} />;
  if (view === 'revenues') return <PhoenixRevenuesGrid data={data} />;
  if (view === 'cashflow') return <PhoenixCashflowGrid data={data} />;
  if (view === 'reconcile') return <PhoenixReconciliation data={data} />;
  if (view === 'analytics') return <PhoenixAnalytics data={data} />;
  return <PhoenixBudgets data={data} />;
}

export function PhoenixApp({ onLogout }: { onLogout?: () => void }) {
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState<PhoenixView>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [periodDraftMode, setPeriodDraftMode] = useState<PeriodMode>('month');
  const [periodDraftMonth, setPeriodDraftMonth] = useState(currentMonth);
  const [periodStart, setPeriodStart] = useState(todayIso);
  const [periodEnd, setPeriodEnd] = useState(todayIso);
  const [periodRangeLabel, setPeriodRangeLabel] = useState('');
  const [movementPeriodData, setMovementPeriodData] = useState<PhoenixReadModel | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const [launchRequest, setLaunchRequest] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadState, setLoadState] = useState<PhoenixLoadState>({ status: 'idle' });
  const periodRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef(month);
  const dataRef = useRef<PhoenixReadModel | null>(null);
  const refreshingRef = useRef(false);
  const periodRequestRef = useRef(0);

  useEffect(() => {
    monthRef.current = month;
  }, [month]);

  useEffect(() => {
    if (loadState.status === 'ready') dataRef.current = loadState.data;
  }, [loadState]);

  useEffect(() => {
    let active = true;
    const cached = peekPhoenixReadModel(month);
    if (cached && monthlySnapshotMatches(cached, month)) {
      dataRef.current = cached;
      setLoadState({ status: 'ready', data: cached });
      setRefreshing(false);
      return () => { active = false; };
    }

    const hasValidSnapshot = Boolean(dataRef.current);
    refreshingRef.current = hasValidSnapshot;
    setRefreshing(hasValidSnapshot);
    if (!hasValidSnapshot) setLoadState({ status: 'loading', startedAt: Date.now() });

    void loadPhoenixReadModel(month)
      .then((data) => {
        if (!active) return;
        if (!monthlySnapshotMatches(data, month)) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
        dataRef.current = data;
        setLoadState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (!dataRef.current) setLoadState({ status: 'error', message: error instanceof Error ? error.message : 'PHOENIX_LOAD_FAILED' });
      })
      .finally(() => {
        if (!active) return;
        refreshingRef.current = false;
        setRefreshing(false);
      });
    return () => { active = false; };
  }, [month, refreshKey]);

  async function refreshData() {
    if (refreshingRef.current || periodLoading || loadState.status !== 'ready') return;
    if (periodMode === 'range' && periodRangeLabel && view === 'movements') {
      void applyRangePeriod(periodStart, periodEnd, true);
      return;
    }
    if (periodMode === 'all' && (view === 'home' || view === 'movements')) {
      void applyAllPeriod(true);
      return;
    }
    const targetMonth = monthRef.current;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const fresh = await loadPhoenixReadModel(targetMonth, { force: true });
      if (!monthlySnapshotMatches(fresh, targetMonth)) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
      if (monthRef.current === targetMonth) {
        dataRef.current = fresh;
        setLoadState({ status: 'ready', data: fresh });
      }
    } catch {
      // Mantém a fotografia válida já exibida. Falhas de atualização em segundo plano não desmontam a tela.
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (loadState.status !== 'ready') return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && periodMode === 'month') void refreshData();
    };
    const timer = window.setInterval(refreshIfVisible, 120_000);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [month, loadState.status, periodMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
        setMobileOpen(false);
        setPeriodOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!periodOpen) return;
    setPeriodDraftMode(periodMode);
    setPeriodDraftMonth(month);
    setPeriodError('');
    const closeOutside = (event: PointerEvent) => {
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) setPeriodOpen(false);
    };
    window.addEventListener('pointerdown', closeOutside);
    return () => window.removeEventListener('pointerdown', closeOutside);
  }, [periodOpen]);

  const data = loadState.status === 'ready' ? loadState.data : dataRef.current;
  const specialView = view === 'movements' || (view === 'home' && periodMode === 'all');
  const viewData = specialView && movementPeriodData ? movementPeriodData : data;
  const currentView = views.find((item) => item.id === view) || mainViews[0];
  const pendingCount = data ? buildPhoenixHomeAgenda(data, todayIso()).items.length : 0;
  const toggleTheme = () => setTheme((value) => value === 'dark' ? 'light' : 'dark');
  const userInitial = (data?.user.name || 'M').slice(0, 1).toUpperCase();
  const periodActiveLabel = periodMode === 'month' ? shortMonthLabel(data?.month || month) : periodMode === 'all' ? 'Tudo' : periodRangeLabel || 'Intervalo';
  const updatingPeriod = periodLoading && periodDraftMode === 'month';

  function resetSpecialPeriod() {
    setPeriodMode('month');
    setMovementPeriodData(null);
    setPeriodRangeLabel('');
  }

  function navigate(next: PhoenixView) {
    const preservesSpecialPeriod = next === 'movements' || (next === 'home' && periodMode === 'all');
    if (!preservesSpecialPeriod && periodMode !== 'month') resetSpecialPeriod();
    setView(next);
    setMobileOpen(false);
    setSearchOpen(false);
    setPeriodOpen(false);
  }

  function requestLaunch() {
    if (periodMode !== 'month') resetSpecialPeriod();
    setView('movements');
    setMobileOpen(false);
    setSearchOpen(false);
    setPeriodOpen(false);
    setLaunchRequest((value) => value + 1);
  }

  function presetRange(days: number) {
    const today = todayIso();
    setPeriodDraftMode('range');
    setPeriodStart(shiftIsoDay(today, -(days - 1)));
    setPeriodEnd(today);
  }

  function presetMonth(offset: number) {
    setPeriodDraftMode('month');
    setPeriodDraftMonth(shiftMonth(currentMonth(), offset));
  }

  async function applyMonthlyPeriod(targetMonth: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) {
      setPeriodError('Informe um mês válido.');
      return;
    }
    if (targetMonth === month && data && monthlySnapshotMatches(data, targetMonth)) {
      resetSpecialPeriod();
      setPeriodOpen(false);
      return;
    }

    const requestId = periodRequestRef.current + 1;
    periodRequestRef.current = requestId;
    setPeriodLoading(true);
    setPeriodError('');
    try {
      const fresh = await loadPhoenixReadModel(targetMonth);
      if (!monthlySnapshotMatches(fresh, targetMonth)) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
      if (periodRequestRef.current !== requestId) return;
      dataRef.current = fresh;
      monthRef.current = targetMonth;
      setLoadState({ status: 'ready', data: fresh });
      setMonth(targetMonth);
      setMovementPeriodData(null);
      setPeriodMode('month');
      setPeriodRangeLabel('');
      setPeriodOpen(false);
    } catch (error) {
      if (periodRequestRef.current !== requestId) return;
      setPeriodError(error instanceof Error && error.message === 'PHOENIX_MONTH_SNAPSHOT_MISMATCH'
        ? 'A leitura retornou dados de outro mês. O período anterior foi mantido por segurança.'
        : error instanceof Error ? error.message : 'Não foi possível carregar o mês selecionado.');
    } finally {
      if (periodRequestRef.current === requestId) setPeriodLoading(false);
    }
  }

  async function applyRangePeriod(start: string, end: string, force = false) {
    if (!start || !end) {
      setPeriodError('Informe a data inicial e a data final.');
      return;
    }
    if (start > end) {
      setPeriodError('A data inicial não pode ser maior que a data final.');
      return;
    }
    const months = monthsBetween(start, end);
    if (!months.length || months.length > 24) {
      setPeriodError('Para intervalos acima de 24 meses, use “Tudo”.');
      return;
    }

    setPeriodLoading(true);
    setPeriodError('');
    try {
      const models = await Promise.all(months.map((item) => loadPhoenixReadModel(item, force ? { force: true } : {})));
      if (models.some((model, index) => !monthlySnapshotMatches(model, months[index]))) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
      const base = models[models.length - 1];
      const unique = new Map<string, (typeof base.events.items)[number]>();
      models.forEach((model) => model.events.items.forEach((event) => {
        const eventDate = String(event.date).slice(0, 10);
        if (eventDate >= start && eventDate <= end) unique.set(event.id, { ...event, competence: base.month });
      }));
      const items = [...unique.values()].sort((left, right) => String(right.date).localeCompare(String(left.date)));
      setMovementPeriodData({
        ...base,
        loadedAt: new Date().toISOString(),
        events: { ...base.events, items, total: items.length, page: 1, pageSize: items.length }
      });
      setPeriodMode('range');
      setPeriodRangeLabel(`${formatShortIso(start)}–${formatShortIso(end)}`);
      setView('movements');
      setMobileOpen(false);
      setSearchOpen(false);
      setPeriodOpen(false);
    } catch (error) {
      setPeriodError(error instanceof Error && error.message === 'PHOENIX_MONTH_SNAPSHOT_MISMATCH'
        ? 'Uma das leituras retornou dados de outro mês. O período atual foi mantido por segurança.'
        : error instanceof Error ? error.message : 'Não foi possível carregar o intervalo.');
    } finally {
      setPeriodLoading(false);
    }
  }

  async function applyAllPeriod(force = false) {
    setPeriodLoading(true);
    setPeriodError('');
    try {
      const baseMonth = currentMonth();
      const base = await loadPhoenixReadModel(baseMonth, force ? { force: true } : {});
      if (!monthlySnapshotMatches(base, baseMonth)) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
      const events = await loadPhoenixAllEvents({ force });
      const items = events.items.map((event) => ({ ...event, competence: base.month }));
      setMovementPeriodData({
        ...base,
        loadedAt: new Date().toISOString(),
        events: { ...events, items, total: items.length, page: 1, pageSize: items.length }
      });
      setPeriodMode('all');
      setPeriodRangeLabel('');
      if (view !== 'home' && view !== 'movements') setView('home');
      setMobileOpen(false);
      setSearchOpen(false);
      setPeriodOpen(false);
    } catch (error) {
      setPeriodError(error instanceof Error && error.message === 'PHOENIX_MONTH_SNAPSHOT_MISMATCH'
        ? 'A leitura mensal atual ficou inconsistente. O histórico completo não foi aberto.'
        : error instanceof Error ? error.message : 'Não foi possível carregar todo o histórico.');
    } finally {
      setPeriodLoading(false);
    }
  }

  function applyPeriod() {
    if (periodDraftMode === 'month') {
      void applyMonthlyPeriod(periodDraftMonth);
      return;
    }
    if (periodDraftMode === 'range') {
      void applyRangePeriod(periodStart, periodEnd);
      return;
    }
    void applyAllPeriod();
  }

  return <div className="phoenix-v15" data-theme={theme}>
    <div className={`px-app ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <aside className="px-sidebar" aria-label="Navegação principal Phoenix V15">
        <div className="px-side-brand"><img src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" /></div>
        <button className="px-search-command" type="button" onClick={() => setSearchOpen(true)}>⌘ Buscar no MEG</button>
        <nav className="px-nav-group">
          {mainViews.map((item) => <button key={item.id} className={`px-nav-btn ${view === item.id ? 'active' : ''}`} type="button" onClick={() => navigate(item.id)}><span className="px-nav-icon" aria-hidden="true">{item.icon}</span><span className="px-nav-text">{item.label}</span>{item.id === 'payables' && pendingCount > 0 ? <span className="px-side-badge">{pendingCount > 99 ? '99+' : pendingCount}</span> : null}</button>)}
          <details className="px-side-more" open={webViews.some((item) => item.id === view)}><summary>Web completo</summary>{webViews.map((item) => <button key={item.id} className={`px-nav-btn ${view === item.id ? 'active' : ''}`} type="button" onClick={() => navigate(item.id)}><span className="px-nav-icon" aria-hidden="true">{item.icon}</span><span className="px-nav-text">{item.label}</span></button>)}</details>
        </nav>
        <button className="px-side-exit" type="button" onClick={onLogout}><span>↪</span><strong>Sair</strong></button>
        <div className="px-side-user"><span className="px-side-user-avatar">{userInitial}</span><div><strong>{data?.user.name || 'MEG'}</strong><small>Perfil {data?.user.role || '—'}</small></div></div>
      </aside>

      <main className="px-main">
        <header className="px-topbar">
          <div className="px-top-left"><button className="px-collapse" type="button" aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} onClick={() => setCollapsed((value) => !value)}>☰</button><div className="px-top-title"><strong>{currentView.label}</strong><small>{subtitles[view]}</small></div></div>
          <div className="px-top-right">
            <button className="px-top-quick-launch" type="button" title="Novo lançamento" aria-label="Novo lançamento" onClick={requestLaunch}>＋</button>
            <div className={`px-period-menu ${periodOpen ? 'is-open' : ''}`} ref={periodRef}>
              <button className="px-period-summary" type="button" title="Selecionar período" aria-label="Selecionar período" onClick={() => setPeriodOpen((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M14 14h2M8 18h2"/></svg><span className="px-period-active">{periodActiveLabel}</span></button>
              {periodOpen ? <div className="px-period-popover px-period-popover-v15">
                <span>Período de consulta</span>
                <div className="px-period-modes"><button type="button" className={periodDraftMode === 'month' ? 'active' : ''} onClick={() => setPeriodDraftMode('month')}>Mês</button><button type="button" className={periodDraftMode === 'range' ? 'active' : ''} onClick={() => setPeriodDraftMode('range')}>Intervalo</button><button type="button" className={periodDraftMode === 'all' ? 'active' : ''} onClick={() => setPeriodDraftMode('all')}>Tudo</button></div>
                <div className="px-period-presets"><button type="button" onClick={() => presetRange(1)}>Hoje</button><button type="button" onClick={() => presetRange(7)}>7 dias</button><button type="button" onClick={() => presetRange(30)}>30 dias</button><button type="button" onClick={() => presetMonth(0)}>Mês atual</button><button type="button" onClick={() => presetMonth(-1)}>Mês anterior</button></div>
                {periodDraftMode === 'month' ? <label className="px-period-field"><span>Mês e ano</span><input type="month" value={periodDraftMonth} onChange={(event) => setPeriodDraftMonth(event.target.value)} /></label> : null}
                {periodDraftMode === 'range' ? <div className="px-period-range"><label className="px-period-field"><span>Data inicial</span><input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label><label className="px-period-field"><span>Data final</span><input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label></div> : null}
                {periodDraftMode === 'all' ? <div className="px-period-all">Exibe toda a trajetória financeira desde o primeiro lançamento. Na Home consolida o histórico completo; em Lançamentos mostra todos os registros normalizados.</div> : null}
                {periodDraftMode === 'range' ? <small className="px-period-scope-note">Intervalo abre Lançamentos. Home, Cartões e demais indicadores globais permanecem mensais até existir contrato agregado específico.</small> : null}
                {periodDraftMode === 'all' ? <small className="px-period-scope-note">Tudo permanece ativo entre Home e Lançamentos. O saldo atual continua sendo a fotografia realizada de hoje; eventos futuros entram apenas nos compromissos e projeções.</small> : null}
                {periodError ? <div className="px-period-error">{periodError}</div> : null}
                <button className="px-period-apply" type="button" disabled={periodLoading} onClick={applyPeriod}>{periodLoading ? 'Carregando período…' : 'Aplicar período'}</button>
              </div> : null}
            </div>
            <button className={`px-sync ${refreshing || periodLoading ? 'is-refreshing' : ''}`} type="button" disabled={refreshing || periodLoading || !data} aria-busy={refreshing || periodLoading} title={updatingPeriod ? 'Atualizando período sem desmontar a tela' : 'Atualizar dados'} onClick={() => { void refreshData(); }}><span className="px-sync-dot" /><span>{updatingPeriod ? 'Atualizando período…' : periodLoading ? 'Carregando período…' : data?.normalization.reconciled ? 'Dados sincronizados' : 'Verificar integridade'}</span></button><button className="px-icon-btn" type="button" title="Alternar tema" onClick={toggleTheme}>◐</button><button className="px-user-pill" type="button" title="Perfil do usuário"><span className="px-user-avatar">{userInitial}</span><span className="px-user-name">{data?.user.name || 'MEG'}</span><span className="px-user-chevron">⌄</span></button><button className="px-icon-btn px-top-exit" type="button" title="Sair" onClick={onLogout}>↪</button>
          </div>
        </header>

        <div className="px-content">
          {loadState.status === 'error' && !data ? <section className="px-card"><span className="px-kicker">Phoenix V15</span><h1>Não foi possível carregar a leitura real</h1><p>{loadState.message}</p><button className="px-history-export" type="button" onClick={() => setRefreshKey((value) => value + 1)}>Tentar novamente</button></section> : viewData ? <ReadScreen view={view} data={viewData} month={viewData.month} theme={theme} periodMode={periodMode} launchRequest={launchRequest} onToggleTheme={toggleTheme} onNavigate={navigate} /> : <section className="px-card px-placeholder"><span className="px-kicker">Phoenix V15</span><h2>Carregando base real</h2><p>Resumo, lançamentos, cartões, pendências, histórico, usuários, configurações e relatórios estão sendo carregados em paralelo.</p></section>}
        </div>
      </main>

      <nav className="px-mobile-dock" aria-label="Navegação móvel Phoenix V15"><button className={view === 'home' ? 'active' : ''} type="button" onClick={() => navigate('home')}><strong>⌂</strong><span>Início</span></button><button className={view === 'movements' ? 'active' : ''} type="button" onClick={requestLaunch}><strong>＋</strong><span>Lançar</span></button><button className={view === 'history' ? 'active' : ''} type="button" onClick={() => navigate('history')}><strong>◷</strong><span>Histórico</span></button><button className={view === 'payables' ? 'active' : ''} type="button" onClick={() => navigate('payables')}><strong>◷</strong><span>Pendentes</span></button><button type="button" onClick={() => setMobileOpen(true)}><strong>≡</strong><span>Mais</span></button></nav>
    </div>
    {searchOpen ? <PhoenixCommandPalette data={viewData} onClose={() => setSearchOpen(false)} onNavigate={navigate} /> : null}
  </div>;
}
