import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { financeClient } from '../app/finance-client';
import type { PhoenixLoadState, PhoenixReadModel } from './contracts';
import { loadPhoenixAllEvents, loadPhoenixReadModel, peekPhoenixReadModel, prefetchPhoenixReadModel } from './data/load-phoenix-read-model';
import { buildPhoenixHomeAgenda } from './home-agenda';
import { isPhoenixMonetaryEvent } from './home-period-summary';
import { PhoenixCommandPalette, type PhoenixRoute } from './PhoenixCommandPalette';
import { PhoenixSidebar } from './PhoenixSidebar';
import { PhoenixNavIcon } from './PhoenixNavIcon';
import { PhoenixOperationalMobileHome } from './PhoenixOperationalMobileHome';
import { PhoenixProfileAvatar, hydratePhoenixAvatarPreference, readPhoenixAvatarPreference, type PhoenixAvatarPreference } from './profile-avatar';
import { syncPhoenixLocalDueNotifications } from './phoenix-native-notifications';
import { PhoenixCatalogsGrid } from './screens/PhoenixCatalogsGrid';
import { PhoenixHomeAllTime } from './screens/PhoenixHomeAllTime';
import { PhoenixHomeDashboard } from './screens/PhoenixHomeDashboard';
import { PhoenixUsers } from './screens/PhoenixUsers';
import { PhoenixSettings } from './screens/PhoenixSettings';
import { PhoenixDecisionCenter } from './screens/PhoenixDecisionCenter';
import { PhoenixCashflowGrid, PhoenixReceivablesGrid, PhoenixRevenuesGrid } from './screens/PhoenixWebGridScreens';
import {
  PhoenixAnalytics,
  PhoenixBudgets,
  PhoenixReconciliation
} from './screens/PhoenixWebScreens';
import './phoenix-v15.css';
import './phoenix-parity-v15.css';
import './phoenix-period.css';
import './phoenix-sidebar.css';
import './phoenix-operational-mobile.css';

const loadMovementsModule = () => import('./screens/PhoenixMovementsV15');
const loadPayablesModule = () => import('./screens/PhoenixReadScreens');
const loadCardsModule = () => import('./screens/PhoenixCardsGrid');
const loadHistoryModule = () => import('./screens/PhoenixHistory');

const PhoenixMovementsV15 = lazy(async () => ({ default: (await loadMovementsModule()).PhoenixMovementsV15 }));
const PhoenixPayables = lazy(async () => ({ default: (await loadPayablesModule()).PhoenixPayables }));
const PhoenixCardsGrid = lazy(async () => ({ default: (await loadCardsModule()).PhoenixCardsGrid }));
const PhoenixHistory = lazy(async () => ({ default: (await loadHistoryModule()).PhoenixHistory }));

function warmFrequentScreens() {
  void Promise.allSettled([
    loadMovementsModule(),
    loadPayablesModule(),
    loadCardsModule(),
    loadHistoryModule()
  ]);
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const PHOENIX_SNAPSHOT_COMMITTED_EVENT = 'meg:phoenix-snapshot-committed';

function phoenixBrandAsset(path: string) {
  const configuredBase = import.meta.env.BASE_URL || '/';
  const base = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;
  const relative = `${base}${path.replace(/^\/+/, '')}`;
  try {
    return typeof document !== 'undefined' ? new URL(relative, document.baseURI).href : relative;
  } catch {
    return relative;
  }
}

type PhoenixView = PhoenixRoute;
type ViewDefinition = { id: PhoenixView; icon: string; label: string };
type PeriodMode = 'month' | 'range' | 'all';
type LaunchPreset = 'expense' | 'income' | 'benefit';
type HomePeriodContext = {
  label: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  currentRealBalance: number;
};

const mainViews: ViewDefinition[] = [
  { id: 'home', icon: '⌂', label: 'Início' },
  { id: 'movements', icon: '▦', label: 'Lançamentos' },
  { id: 'history', icon: '◷', label: 'Histórico' },
  { id: 'payables', icon: '!', label: 'Pendentes' },
  { id: 'cards', icon: '▣', label: 'Cartões' },
  { id: 'catalogs', icon: '≡', label: 'Cadastros' },
  { id: 'users', icon: '♙', label: 'Usuários e permissões' },
  { id: 'settings', icon: '⚙', label: 'Configurações' }
];

const webViews: ViewDefinition[] = [
  { id: 'receivables', icon: '◫', label: 'Contas a receber' },
  { id: 'revenues', icon: '↗', label: 'Receitas' },
  { id: 'cashflow', icon: '↔', label: 'Fluxo de caixa' },
  { id: 'decisions', icon: '◇', label: 'Decisões' },
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
  decisions: 'Radar, simulação e impacto antes de decidir',
  reconcile: 'Compare o MEG com o saldo real',
  analytics: 'Tendências e comparações históricas',
  budgets: 'Planejamento financeiro'
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

function monthBounds(value: string) {
  const [year, month] = value.split('-').map(Number);
  const startDate = `${value}-01`;
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { startDate, endDate };
}

function canonicalCurrentBalance(data: PhoenixReadModel) {
  return Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);
}

function realizedPeriodBounds(
  currentRealBalance: number,
  events: PhoenixReadModel['events']['items'],
  startDate: string,
  endDate: string
) {
  const today = todayIso();
  const realizedEnd = endDate < today ? endDate : today;
  const posted = events.filter((event) =>
    isPhoenixMonetaryEvent(event)
    && ['paid', 'reconciled', 'confirmed'].includes(event.status)
  );
  const signed = (event: (typeof posted)[number]) => {
    const value = Number(event.signedAmount || 0);
    return Number.isFinite(value) ? value : 0;
  };

  if (startDate > today) {
    return { openingBalance: currentRealBalance, closingBalance: currentRealBalance };
  }

  const afterPeriod = posted
    .filter((event) => {
      const date = String(event.date).slice(0, 10);
      return date > realizedEnd && date <= today;
    })
    .reduce((sum, event) => sum + signed(event), 0);

  const closingBalance = currentRealBalance - afterPeriod;
  const periodDelta = posted
    .filter((event) => {
      const date = String(event.date).slice(0, 10);
      return date >= startDate && date <= realizedEnd;
    })
    .reduce((sum, event) => sum + signed(event), 0);

  return {
    openingBalance: closingBalance - periodDelta,
    closingBalance
  };
}

function monthlySnapshotMatches(data: PhoenixReadModel, targetMonth: string) {
  return data.month === targetMonth
    && data.summary.month === targetMonth
    && data.analytics.month === targetMonth
    && data.cashflow.month === targetMonth;
}

function resetViewport() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelector<HTMLElement>('.px-main')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.querySelector<HTMLElement>('.px-content')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function HomeScreen({ data, month, onNavigate }: { data: PhoenixReadModel; month: string; onNavigate: (view: PhoenixView) => void }) {
  return <PhoenixHomeDashboard data={data} month={month} onNavigate={onNavigate} />;
}

function ScreenWarmFallback({ label }: { label: string }) {
  return <section className="px-card px-placeholder"><span className="px-kicker">MEG Finanças</span><h2>Abrindo {label}</h2><p>Preparando a tela com os dados que já estão carregados.</p></section>;
}

function MobileMenuIdentity({ data }: { data: PhoenixReadModel }) {
  const [avatar, setAvatar] = useState<PhoenixAvatarPreference>(() => readPhoenixAvatarPreference(data.user.id));

  useEffect(() => {
    let active = true;
    const syncLocal = (event?: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>)?.detail;
      if (detail?.userId && detail.userId !== data.user.id) return;
      setAvatar(readPhoenixAvatarPreference(data.user.id));
    };
    void hydratePhoenixAvatarPreference(data.user.id).then((preference) => {
      if (active) setAvatar(preference);
    });
    window.addEventListener('meg:profile-avatar-changed', syncLocal);
    return () => {
      active = false;
      window.removeEventListener('meg:profile-avatar-changed', syncLocal);
    };
  }, [data.user.id]);

  return <div className="px-mobile-menu-identity">
    <PhoenixProfileAvatar name={data.user.name} preference={avatar} className="px-mobile-menu-avatar" />
    <span><small>MEG OPERACIONAL</small><strong>{data.user.name}</strong><em>{data.user.role}</em></span>
  </div>;
}

function ReadScreen({ view, data, month, theme, periodMode, periodContext, periodRangeLabel, launchRequest, launchPreset, nativeOperational, onToggleTheme, onNavigate, onLaunch, onDataCommitted, onOpenPeriod, onLogoutRequest }: {
  view: PhoenixView;
  data: PhoenixReadModel;
  month: string;
  theme: 'dark' | 'light';
  periodMode: PeriodMode;
  periodContext: HomePeriodContext | null;
  periodRangeLabel: string;
  launchRequest: number;
  launchPreset: LaunchPreset;
  nativeOperational: boolean;
  onToggleTheme: () => void;
  onNavigate: (view: PhoenixView) => void;
  onLaunch: (preset: LaunchPreset) => void;
  onDataCommitted: (snapshot: PhoenixReadModel) => void;
  onOpenPeriod: () => void;
  onLogoutRequest: () => void;
}) {
  if (view === 'home') {
    const analyticalMonth = periodMode === 'month' && month !== currentMonth();
    if (periodMode === 'all' || periodMode === 'range' || analyticalMonth) {
      return <PhoenixHomeAllTime
        data={data}
        mode={periodMode}
        periodLabel={periodMode === 'all' ? 'Tudo' : periodMode === 'range' ? (periodRangeLabel || 'Intervalo') : monthLabel(month)}
        periodContext={periodContext}
        onNavigate={onNavigate}
        onOpenPeriod={onOpenPeriod}
      />;
    }
    if (nativeOperational) return <PhoenixOperationalMobileHome data={data} onLaunch={onLaunch} onNavigate={onNavigate} onOpenPeriod={onOpenPeriod} />;
    return <HomeScreen data={data} month={month} onNavigate={onNavigate} />;
  }
  if (view === 'movements') return <Suspense fallback={<ScreenWarmFallback label="Lançamentos" />}><PhoenixMovementsV15 data={data} launchRequest={launchRequest} launchPreset={launchPreset} onNavigateHistory={() => onNavigate('history')} onDataCommitted={onDataCommitted} onOpenPeriod={onOpenPeriod} /></Suspense>;
  if (view === 'history') return <Suspense fallback={<ScreenWarmFallback label="Histórico" />}><PhoenixHistory data={data} /></Suspense>;
  if (view === 'payables') return <Suspense fallback={<ScreenWarmFallback label="Pendentes" />}><PhoenixPayables data={data} /></Suspense>;
  if (view === 'cards') return <Suspense fallback={<ScreenWarmFallback label="Cartões" />}><PhoenixCardsGrid data={data} /></Suspense>;
  if (view === 'catalogs') return <PhoenixCatalogsGrid data={data} />;
  if (view === 'users') return <PhoenixUsers data={data} />;
  if (view === 'settings') return <PhoenixSettings data={data} theme={theme} onToggleTheme={onToggleTheme} onLogoutRequest={onLogoutRequest} />;
  if (view === 'receivables') return <PhoenixReceivablesGrid data={data} />;
  if (view === 'revenues') return <PhoenixRevenuesGrid data={data} />;
  if (view === 'cashflow') return <PhoenixCashflowGrid data={data} />;
  if (view === 'decisions') return <PhoenixDecisionCenter data={data} />;
  if (view === 'reconcile') return <PhoenixReconciliation data={data} />;
  if (view === 'analytics') return <PhoenixAnalytics data={data} />;
  return <PhoenixBudgets data={data} />;
}

export function PhoenixApp({ onLogout, onClose }: { onLogout?: () => void; onClose?: () => void }) {
  const nativeOperational = import.meta.env.VITE_MOBILE_APP === 'true';
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState<PhoenixView>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [periodDraftMode, setPeriodDraftMode] = useState<PeriodMode>('month');
  const [periodDraftMonth, setPeriodDraftMonth] = useState(currentMonth);
  const [periodStart, setPeriodStart] = useState(todayIso);
  const [periodEnd, setPeriodEnd] = useState(todayIso);
  const [periodRangeLabel, setPeriodRangeLabel] = useState('');
  const [movementPeriodData, setMovementPeriodData] = useState<PhoenixReadModel | null>(null);
  const [homePeriodContext, setHomePeriodContext] = useState<HomePeriodContext | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const [launchRequest, setLaunchRequest] = useState(0);
  const [launchPreset, setLaunchPreset] = useState<LaunchPreset>('expense');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadState, setLoadState] = useState<PhoenixLoadState>({ status: 'idle' });
  const periodRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef(month);
  const dataRef = useRef<PhoenixReadModel | null>(null);
  const refreshingRef = useRef(false);
  const workspaceSyncTokenRef = useRef<string | null>(null);
  const workspaceSyncCheckingRef = useRef(false);
  const periodRequestRef = useRef(0);
  const navigationHistoryRef = useRef<PhoenixView[]>([]);

  useEffect(() => {
    monthRef.current = month;
  }, [month]);

  useEffect(() => {
    if (!nativeOperational) return;
    const monthNow = currentMonth();
    monthRef.current = monthNow;
    setMonth(monthNow);
    setPeriodMode('month');
    setPeriodDraftMode('month');
    setPeriodDraftMonth(monthNow);
    setMovementPeriodData(null);
    setPeriodRangeLabel('');
    setHomePeriodContext(null);
  }, [nativeOperational]);

  useEffect(() => {
    resetViewport();
  }, [view]);

  useEffect(() => {
    if (loadState.status === 'ready') dataRef.current = loadState.data;
  }, [loadState]);

  useEffect(() => {
    if (!nativeOperational || loadState.status !== 'ready') return;
    syncPhoenixLocalDueNotifications(loadState.data);
  }, [nativeOperational, loadState]);

  useEffect(() => {
    if (loadState.status !== 'ready' || view !== 'home') return;
    const timer = window.setTimeout(warmFrequentScreens, 80);
    return () => window.clearTimeout(timer);
  }, [loadState.status, view]);


  useEffect(() => {
    if (loadState.status !== 'ready') return;
    const activeMonth = loadState.data.month;
    const timer = window.setTimeout(() => {
      void prefetchPhoenixReadModel(shiftMonth(activeMonth, -1));
      void prefetchPhoenixReadModel(shiftMonth(activeMonth, 1));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [loadState.status, loadState.status === 'ready' ? loadState.data.month : '']);

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
    if (periodMode === 'range' && periodRangeLabel && (view === 'home' || view === 'movements')) {
      void applyRangePeriod(periodStart, periodEnd, true);
      return;
    }
    if (periodMode === 'all' && (view === 'home' || view === 'movements')) {
      void applyAllPeriod(true);
      return;
    }
    const targetMonth = monthRef.current;
    if (view === 'home' && periodMode === 'month' && targetMonth !== currentMonth()) {
      void applyMonthlyPeriod(targetMonth, true);
      return;
    }
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

  function commitSnapshot(snapshot: PhoenixReadModel) {
    if (!monthlySnapshotMatches(snapshot, snapshot.month)) return;

    const visibleMonth = monthRef.current;
    if (nativeOperational && snapshot.month !== visibleMonth) {
      void loadPhoenixReadModel(visibleMonth, { force: true })
        .then((fresh) => {
          if (monthRef.current !== visibleMonth || !monthlySnapshotMatches(fresh, visibleMonth)) return;
          dataRef.current = fresh;
          setLoadState({ status: 'ready', data: fresh });
          if (periodMode === 'month') setMovementPeriodData(null);
          setRefreshing(false);
        })
        .catch(() => {
          // O APK preserva o período visível; uma releitura falha não pode trocar o mês sozinho.
        });
      return;
    }

    dataRef.current = snapshot;
    monthRef.current = snapshot.month;
    setLoadState({ status: 'ready', data: snapshot });
    setMonth(snapshot.month);
    if (periodMode === 'month') setMovementPeriodData(null);
    setRefreshing(false);
  }

  useEffect(() => {
    const handleCommittedSnapshot = (event: Event) => {
      const snapshot = (event as CustomEvent<{ snapshot?: PhoenixReadModel }>).detail?.snapshot;
      if (snapshot) commitSnapshot(snapshot);
    };
    window.addEventListener(PHOENIX_SNAPSHOT_COMMITTED_EVENT, handleCommittedSnapshot as EventListener);
    return () => window.removeEventListener(PHOENIX_SNAPSHOT_COMMITTED_EVENT, handleCommittedSnapshot as EventListener);
  }, [periodMode]);

  useEffect(() => {
    if (loadState.status !== 'ready') return;
    const refreshIfVisible = (event?: Event) => {
      if (event?.type === 'focus' && !event.isTrusted) return;
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
    if (loadState.status !== 'ready') return;
    let timer: number | null = null;
    let attempts = 0;
    const refreshAfterMutation = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        if (refreshingRef.current && attempts < 4) {
          attempts += 1;
          refreshAfterMutation();
          return;
        }
        attempts = 0;
        void refreshData();
      }, attempts ? 450 : 180);
    };
    window.addEventListener('meg:data-invalidated', refreshAfterMutation);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('meg:data-invalidated', refreshAfterMutation);
    };
  }, [loadState.status, month, periodMode, view]);

  useEffect(() => {
    if (loadState.status !== 'ready' || periodMode !== 'month') return;
    let active = true;

    const checkWorkspaceChanges = async () => {
      if (!active || document.visibilityState !== 'visible' || workspaceSyncCheckingRef.current) return;
      workspaceSyncCheckingRef.current = true;
      try {
        const status = await financeClient.getSyncStatus();
        if (!active) return;
        const previous = workspaceSyncTokenRef.current;
        workspaceSyncTokenRef.current = status.token;
        if (previous && previous !== status.token) {
          void refreshData();
        }
      } catch {
        // Pulso de sincronização é auxiliar; falha temporária não desmonta a fotografia válida.
      } finally {
        workspaceSyncCheckingRef.current = false;
      }
    };

    void checkWorkspaceChanges();
    const timer = window.setInterval(() => { void checkWorkspaceChanges(); }, 6_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkWorkspaceChanges();
    };
    window.addEventListener('focus', checkWorkspaceChanges);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', checkWorkspaceChanges);
      document.removeEventListener('visibilitychange', onVisible);
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
        closePeriodSelector();
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


  useEffect(() => {
    if (!periodOpen) return;
    const months = new Set<string>([
      month,
      periodDraftMonth,
      shiftMonth(periodDraftMonth, -1),
      shiftMonth(periodDraftMonth, 1)
    ]);
    const timer = window.setTimeout(() => {
      months.forEach((target) => { void prefetchPhoenixReadModel(target); });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [periodOpen, month, periodDraftMonth]);

  useEffect(() => {
    if (!periodOpen || periodDraftMode !== 'range' || !periodStart || !periodEnd || periodStart > periodEnd) return;
    const months = monthsBetween(periodStart, periodEnd).slice(0, 6);
    const timer = window.setTimeout(() => {
      months.forEach((target) => { void prefetchPhoenixReadModel(target); });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [periodOpen, periodDraftMode, periodStart, periodEnd]);

  useEffect(() => {
    if (!periodOpen || periodDraftMode !== 'all') return;
    const timer = window.setTimeout(() => { void loadPhoenixAllEvents(); }, 120);
    return () => window.clearTimeout(timer);
  }, [periodOpen, periodDraftMode]);

  const data = loadState.status === 'ready' ? loadState.data : dataRef.current;
  const specialView = view === 'movements' || (view === 'home' && periodMode !== 'month');
  const viewData = specialView && movementPeriodData ? movementPeriodData : data;
  const currentView = views.find((item) => item.id === view) || mainViews[0];
  const pendingCount = data ? buildPhoenixHomeAgenda(data, todayIso()).items.length : 0;
  const toggleTheme = () => setTheme((value) => value === 'dark' ? 'light' : 'dark');
  const userInitial = (data?.user.name || 'M').slice(0, 1).toUpperCase();
  const activePeriodMonth = data?.month || month;
  const periodActiveLabel = periodMode === 'month'
    ? nativeOperational && activePeriodMonth === currentMonth()
      ? `Atual · ${shortMonthLabel(activePeriodMonth)}`
      : shortMonthLabel(activePeriodMonth)
    : periodMode === 'all' ? 'Tudo' : periodRangeLabel || 'Intervalo';
  const periodDraftLabel = periodDraftMode === 'month'
    ? monthLabel(periodDraftMonth)
    : periodDraftMode === 'all'
      ? 'Histórico completo'
      : periodStart && periodEnd ? `${formatShortIso(periodStart)} → ${formatShortIso(periodEnd)}` : 'Defina o intervalo';

  function resetSpecialPeriod() {
    setPeriodMode('month');
    setMovementPeriodData(null);
    setPeriodRangeLabel('');
    setHomePeriodContext(null);
  }

  function applyNavigation(next: PhoenixView) {
    resetViewport();
    const preservesSpecialPeriod = (next === 'movements' || next === 'home') && periodMode !== 'month';
    if (!preservesSpecialPeriod && periodMode !== 'month') resetSpecialPeriod();
    setView(next);
    setMobileOpen(false);
    setSearchOpen(false);
    setPeriodOpen(false);
  }

  function navigate(next: PhoenixView, resetHistory = false) {
    if (nativeOperational) {
      if (resetHistory || next === 'home') {
        navigationHistoryRef.current = [];
      } else if (next !== view) {
        navigationHistoryRef.current.push(view);
      }
    }
    applyNavigation(next);
  }

  function requestLogout() {
    onLogout?.();
  }

  function requestClose() {
    if (!nativeOperational) {
      onLogout?.();
      return;
    }
    setMobileOpen(false);
    setSearchOpen(false);
    setPeriodOpen(false);
    setExitConfirmOpen(true);
  }

  function requestLaunch(preset: LaunchPreset = 'expense') {
    resetViewport();
    if (periodMode !== 'month') resetSpecialPeriod();
    if (nativeOperational && view !== 'movements') navigationHistoryRef.current.push(view);
    setLaunchPreset(preset);
    setView('movements');
    setMobileOpen(false);
    setSearchOpen(false);
    setPeriodOpen(false);
    setLaunchRequest((value) => value + 1);
  }


  useEffect(() => {
    if (!nativeOperational) return;
    let active = true;
    let listener: { remove: () => Promise<void> } | null = null;

    void import('@capacitor/app').then(async ({ App }) => {
      const handle = await App.addListener('backButton', () => {
        if (!active) return;
        if (exitConfirmOpen) {
          setExitConfirmOpen(false);
          return;
        }
        if (searchOpen) {
          setSearchOpen(false);
          return;
        }
        if (mobileOpen) {
          setMobileOpen(false);
          return;
        }
        if (periodOpen) {
          closePeriodSelector();
          return;
        }

        const childBack = new CustomEvent('meg:android-back', { cancelable: true });
        window.dispatchEvent(childBack);
        if (childBack.defaultPrevented) return;

        const previous = navigationHistoryRef.current.pop();
        if (previous) {
          applyNavigation(previous);
          return;
        }
        if (view !== 'home') {
          applyNavigation('home');
          return;
        }
        requestClose();
      });
      if (!active) await handle.remove();
      else listener = handle;
    }).catch((cause) => console.warn('MEG Android back navigation unavailable', cause));

    return () => {
      active = false;
      void listener?.remove();
    };
  }, [nativeOperational, exitConfirmOpen, searchOpen, mobileOpen, periodOpen, view, periodMode]);

  function stepDraftMonth(offset: number) {
    setPeriodDraftMode('month');
    setPeriodDraftMonth((value) => shiftMonth(value || currentMonth(), offset));
  }

  function quickRange(days: number) {
    const today = todayIso();
    const start = shiftIsoDay(today, -(days - 1));
    setPeriodDraftMode('range');
    setPeriodStart(start);
    setPeriodEnd(today);
  }

  function quickMonth(offset: number) {
    const target = shiftMonth(currentMonth(), offset);
    setPeriodDraftMode('month');
    setPeriodDraftMonth(target);
  }

  async function applyMonthlyPeriod(targetMonth: string, force = false) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) {
      setPeriodError('Informe um mês válido.');
      return;
    }
    if (!force && targetMonth === month && data && monthlySnapshotMatches(data, targetMonth)) {
      setPeriodMode('month');
      setMovementPeriodData(null);
      setPeriodRangeLabel('');
      if (targetMonth === currentMonth()) setHomePeriodContext(null);
      setPeriodOpen(false);
      resetViewport();
      return;
    }

    const requestId = periodRequestRef.current + 1;
    periodRequestRef.current = requestId;
    setPeriodLoading(true);
    setPeriodError('');
    try {
      const needsHistoricalContext = targetMonth !== currentMonth();
      const [fresh, currentSnapshot, allEvents] = await Promise.all([
        loadPhoenixReadModel(targetMonth, force ? { force: true } : {}),
        needsHistoricalContext ? loadPhoenixReadModel(currentMonth(), force ? { force: true } : {}) : Promise.resolve(null),
        needsHistoricalContext ? loadPhoenixAllEvents({ force }) : Promise.resolve(null)
      ]);
      if (!monthlySnapshotMatches(fresh, targetMonth)) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
      if (currentSnapshot && !monthlySnapshotMatches(currentSnapshot, currentMonth())) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
      if (periodRequestRef.current !== requestId) return;

      dataRef.current = fresh;
      monthRef.current = targetMonth;
      setLoadState({ status: 'ready', data: fresh });
      setMonth(targetMonth);
      setMovementPeriodData(null);
      setPeriodMode('month');
      setPeriodRangeLabel('');

      if (needsHistoricalContext && currentSnapshot && allEvents) {
        const { startDate, endDate } = monthBounds(targetMonth);
        const currentRealBalance = canonicalCurrentBalance(currentSnapshot);
        const bounds = realizedPeriodBounds(currentRealBalance, allEvents.items, startDate, endDate);
        setHomePeriodContext({
          label: monthLabel(targetMonth),
          startDate,
          endDate,
          currentRealBalance,
          ...bounds
        });
      } else {
        setHomePeriodContext(null);
      }

      setPeriodOpen(false);
      resetViewport();
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

    const requestId = periodRequestRef.current + 1;
    periodRequestRef.current = requestId;
    setPeriodLoading(true);
    setPeriodError('');
    try {
      const [models, currentSnapshot, allEvents] = await Promise.all([
        Promise.all(months.map((item) => loadPhoenixReadModel(item, force ? { force: true } : {}))),
        loadPhoenixReadModel(currentMonth(), force ? { force: true } : {}),
        loadPhoenixAllEvents({ force })
      ]);
      if (periodRequestRef.current !== requestId) return;
      if (models.some((model, index) => !monthlySnapshotMatches(model, months[index]))) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
      if (!monthlySnapshotMatches(currentSnapshot, currentMonth())) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');

      const base = models[models.length - 1];
      const unique = new Map<string, (typeof base.events.items)[number]>();
      models.forEach((model) => model.events.items.forEach((event) => {
        const eventDate = String(event.date).slice(0, 10);
        if (eventDate >= start && eventDate <= end) unique.set(event.id, { ...event, competence: base.month });
      }));
      const items = [...unique.values()].sort((left, right) => String(right.date).localeCompare(String(left.date)));
      const rangeData = {
        ...base,
        loadedAt: new Date().toISOString(),
        events: { ...base.events, items, total: items.length, page: 1, pageSize: items.length }
      };
      const currentRealBalance = canonicalCurrentBalance(currentSnapshot);
      const bounds = realizedPeriodBounds(currentRealBalance, allEvents.items, start, end);

      setMovementPeriodData(rangeData);
      setHomePeriodContext({
        label: `${formatShortIso(start)}–${formatShortIso(end)}`,
        startDate: start,
        endDate: end,
        currentRealBalance,
        ...bounds
      });
      setPeriodMode('range');
      setPeriodRangeLabel(`${formatShortIso(start)}–${formatShortIso(end)}`);
      setMobileOpen(false);
      setSearchOpen(false);
      setPeriodOpen(false);
      resetViewport();
    } catch (error) {
      if (periodRequestRef.current !== requestId) return;
      setPeriodError(error instanceof Error && error.message === 'PHOENIX_MONTH_SNAPSHOT_MISMATCH'
        ? 'Uma das leituras retornou dados de outro mês. O período atual foi mantido por segurança.'
        : error instanceof Error ? error.message : 'Não foi possível carregar o intervalo.');
    } finally {
      if (periodRequestRef.current === requestId) setPeriodLoading(false);
    }
  }

  async function applyAllPeriod(force = false) {
    const requestId = periodRequestRef.current + 1;
    periodRequestRef.current = requestId;
    setPeriodLoading(true);
    setPeriodError('');
    try {
      const baseMonth = currentMonth();
      const [base, events] = await Promise.all([
        loadPhoenixReadModel(baseMonth, force ? { force: true } : {}),
        loadPhoenixAllEvents({ force })
      ]);
      if (!monthlySnapshotMatches(base, baseMonth)) throw new Error('PHOENIX_MONTH_SNAPSHOT_MISMATCH');
      if (periodRequestRef.current !== requestId) return;
      const items = events.items.map((event) => ({ ...event, competence: base.month }));
      setMovementPeriodData({
        ...base,
        loadedAt: new Date().toISOString(),
        events: { ...events, items, total: items.length, page: 1, pageSize: items.length }
      });
      setPeriodMode('all');
      setPeriodRangeLabel('');
      setHomePeriodContext(null);
      setMobileOpen(false);
      setSearchOpen(false);
      setPeriodOpen(false);
      resetViewport();
    } catch (error) {
      if (periodRequestRef.current !== requestId) return;
      setPeriodError(error instanceof Error && error.message === 'PHOENIX_MONTH_SNAPSHOT_MISMATCH'
        ? 'A leitura mensal atual ficou inconsistente. O histórico completo não foi aberto.'
        : error instanceof Error ? error.message : 'Não foi possível carregar todo o histórico.');
    } finally {
      if (periodRequestRef.current === requestId) setPeriodLoading(false);
    }
  }

  function openPeriodSelector() {
    setPeriodDraftMode(periodMode);
    if (periodMode === 'month') setPeriodDraftMonth(monthRef.current);
    setPeriodError('');
    setPeriodOpen(true);
  }

  function closePeriodSelector() {
    if (periodLoading) return;
    setPeriodError('');
    setPeriodOpen(false);
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

  const homeAnalytical = view === 'home' && (periodMode !== 'month' || month !== currentMonth());

  const periodSelector = periodOpen ? <div className={`px-period-popover px-period-popover-v15 ${nativeOperational ? 'is-mobile-sheet' : ''} ${periodLoading ? 'is-loading' : ''}`} role={nativeOperational ? 'dialog' : undefined} aria-modal={nativeOperational ? true : undefined} aria-label={nativeOperational ? 'Filtro de período' : undefined} ref={nativeOperational ? periodRef : undefined} onPointerDown={(event) => event.stopPropagation()}>
                <header className="px-period-head">
                  <div className="px-period-head-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/></svg></div>
                  <div><span>Período de consulta</span><strong>{periodDraftLabel}</strong><small>Troque a visão sem desmontar a tela atual.</small></div>
                  <button className="px-period-close" type="button" aria-label="Cancelar e fechar seletor de período" disabled={periodLoading} onPointerDown={(event) => event.stopPropagation()} onClick={closePeriodSelector}>×</button>
                </header>

                <div className="px-period-modes" role="tablist" aria-label="Modo do período">
                  <button type="button" className={periodDraftMode === 'month' ? 'active' : ''} onClick={() => setPeriodDraftMode('month')}><span>Mês</span><small>Competência</small></button>
                  <button type="button" className={periodDraftMode === 'range' ? 'active' : ''} onClick={() => setPeriodDraftMode('range')}><span>Intervalo</span><small>Datas livres</small></button>
                  <button type="button" className={periodDraftMode === 'all' ? 'active' : ''} onClick={() => setPeriodDraftMode('all')}><span>Tudo</span><small>Base completa</small></button>
                </div>

                <div className="px-period-quick">
                  <span>Acesso rápido</span>
                  <div>
                    <button type="button" disabled={periodLoading} onClick={() => quickRange(1)}>Hoje</button>
                    <button type="button" disabled={periodLoading} onClick={() => quickRange(7)}>7 dias</button>
                    <button type="button" disabled={periodLoading} onClick={() => quickRange(30)}>30 dias</button>
                    <button type="button" disabled={periodLoading} onClick={() => quickMonth(0)}>Mês atual</button>
                    <button type="button" disabled={periodLoading} onClick={() => quickMonth(-1)}>Anterior</button>
                  </div>
                </div>

                {periodDraftMode === 'month' ? <section className="px-period-month-panel">
                  <span>Competência</span>
                  <div className="px-period-month-stepper">
                    <button type="button" aria-label="Mês anterior" onClick={() => stepDraftMonth(-1)}>‹</button>
                    <div><small>Selecionado</small><strong>{monthLabel(periodDraftMonth)}</strong></div>
                    <button type="button" aria-label="Próximo mês" onClick={() => stepDraftMonth(1)}>›</button>
                  </div>
                  <label className="px-period-field px-period-native-month"><span>Escolher outro mês</span><input type="month" value={periodDraftMonth} onChange={(event) => setPeriodDraftMonth(event.target.value)} /></label>
                </section> : null}

                {periodDraftMode === 'range' ? <section className="px-period-range-panel">
                  <span>Intervalo personalizado</span>
                  <div className="px-period-range">
                    <label className="px-period-field"><span>Data inicial</span><input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label>
                    <span className="px-period-range-arrow" aria-hidden="true">→</span>
                    <label className="px-period-field"><span>Data final</span><input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
                  </div>
                  <small className="px-period-scope-note">Intervalos abrem Lançamentos com os registros compreendidos entre as duas datas.</small>
                </section> : null}

                {periodDraftMode === 'all' ? <section className="px-period-all">
                  <div className="px-period-all-icon" aria-hidden="true">∞</div>
                  <div><strong>Histórico completo</strong><p>Consolida a trajetória financeira inteira. A mudança só será aplicada quando você confirmar no rodapé.</p></div>
                </section> : null}

                {periodDraftMode === 'month' && periodDraftMonth > currentMonth() ? <small className="px-period-scope-note">Mês futuro troca a competência exibida. Projeções permanecem concentradas em Decisões.</small> : null}
                {periodError ? <div className="px-period-error">{periodError}</div> : null}

                {periodLoading ? <div className="px-period-progress" role="status" aria-live="polite">
                  <span className="px-period-spinner" aria-hidden="true" />
                  <div><strong>Preparando {periodDraftLabel}</strong><small>A tela atual permanece disponível enquanto os dados são confirmados.</small></div>
                </div> : null}

                <footer className="px-period-footer">
                  <div><span>Nova visão</span><strong>{periodDraftLabel}</strong></div>
                  <div className="px-period-footer-actions">
                    <button className="px-period-cancel" type="button" disabled={periodLoading} onClick={closePeriodSelector}>Cancelar</button>
                    <button className="px-period-apply" type="button" disabled={periodLoading} onClick={applyPeriod}>{periodLoading ? 'Carregando…' : 'Aplicar'}</button>
                  </div>
                </footer>
              </div> : null;

  const mobilePeriodPortal = nativeOperational && periodOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="px-period-mobile-portal" data-meg-overlay="period">
        <button className="px-period-mobile-backdrop" type="button" aria-label="Cancelar filtro de período" onClick={closePeriodSelector} />
        {periodSelector}
      </div>,
      document.body,
    )
    : null;

  return <div className="phoenix-v15" data-theme={theme}>
    <div className={`px-app ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <PhoenixSidebar
        view={view}
        collapsed={collapsed}
        pendingCount={pendingCount}
        userName={data?.user.name || 'MEG'}
        userRole={data?.user.role || '—'}
        onNavigate={navigate}
        onSearch={() => setSearchOpen(true)}
        onLogout={requestLogout}
      />

      <main className={`px-main ${view === 'home' ? 'px-main-home' : ''} ${homeAnalytical ? 'px-main-home-all' : ''} ${view === 'payables' ? 'px-main-payables' : ''} ${view === 'history' ? 'px-main-history' : ''} ${view === 'cards' ? 'px-main-cards' : ''}`}>
        <header className="px-topbar">
          <div className="px-top-left">{nativeOperational ? <button className="px-mobile-brand-home" type="button" aria-label="Ir para o início" onClick={() => navigate('home', true)}><img src={phoenixBrandAsset('brand/meg-finance-system-mark.svg')} alt="" /><span>MEG</span></button> : <button className="px-collapse" type="button" aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} onClick={() => setCollapsed((value) => !value)}>☰</button>}<div className="px-top-title"><strong>{currentView.label}</strong><small>{subtitles[view]}</small></div></div>
          <div className="px-top-right">
            <button className="px-top-quick-launch" type="button" title="Nova despesa" aria-label="Nova despesa" onClick={() => requestLaunch('expense')}>＋</button>
            <div className={`px-period-menu ${periodOpen ? 'is-open' : ''}`} ref={!nativeOperational ? periodRef : undefined}>
              {!nativeOperational ? <button className={`px-period-summary ${periodLoading ? 'is-loading' : ''}`} type="button" title="Selecionar período" aria-label="Selecionar período" aria-busy={periodLoading} onClick={() => periodOpen ? closePeriodSelector() : openPeriodSelector()}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M14 14h2M8 18h2"/></svg><span className="px-period-active">{periodActiveLabel}</span></button> : null}
              {!nativeOperational ? periodSelector : null}
            </div>
            <button className={`px-sync ${refreshing ? 'is-refreshing' : ''}`} type="button" disabled={refreshing || periodLoading || !data} aria-busy={refreshing} title="Atualizar dados" onClick={() => { void refreshData(); }}><span className="px-sync-dot" /><span>{refreshing ? 'Atualizando dados…' : data?.normalization.reconciled ? 'Dados sincronizados' : 'Verificar integridade'}</span></button><button className="px-icon-btn px-theme-toggle" type="button" title="Alternar tema" onClick={toggleTheme}>◐</button><button className="px-user-pill" type="button" title="Perfil do usuário"><span className="px-user-avatar">{userInitial}</span><span className="px-user-name">{data?.user.name || 'MEG'}</span><span className="px-user-chevron">⌄</span></button><button className="px-icon-btn px-top-exit" type="button" title={nativeOperational ? 'Fechar aplicativo' : 'Sair'} onClick={nativeOperational ? requestClose : requestLogout}>↪</button>
          </div>
        </header>

        <div className={`px-content ${view === 'home' ? 'px-content-home' : ''} ${homeAnalytical ? 'px-content-home-all' : ''} ${view === 'movements' ? 'px-content-movements' : ''} ${view === 'payables' ? 'px-content-payables' : ''} ${view === 'history' ? 'px-content-history' : ''} ${view === 'cards' ? 'px-content-cards' : ''}`}>
          {loadState.status === 'error' && !data ? <section className="px-card"><span className="px-kicker">Phoenix V15</span><h1>Não foi possível carregar a leitura real</h1><p>{loadState.message}</p><button className="px-history-export" type="button" onClick={() => setRefreshKey((value) => value + 1)}>Tentar novamente</button></section> : viewData ? <ReadScreen key={`${view}:${periodMode}:${viewData.month}:${periodRangeLabel}`} view={view} data={viewData} month={viewData.month} theme={theme} periodMode={periodMode} periodContext={homePeriodContext} periodRangeLabel={periodRangeLabel} launchRequest={launchRequest} launchPreset={launchPreset} nativeOperational={nativeOperational} onToggleTheme={toggleTheme} onNavigate={navigate} onLaunch={requestLaunch} onDataCommitted={commitSnapshot} onOpenPeriod={openPeriodSelector} onLogoutRequest={requestLogout} /> : <section className="px-card px-placeholder"><span className="px-kicker">Phoenix V15</span><h2>Carregando base real</h2><p>Resumo, lançamentos, cartões, pendências, histórico, usuários, configurações e relatórios estão sendo carregados em paralelo.</p></section>}
        </div>
      </main>

      {mobilePeriodPortal}
      {nativeOperational && mobileOpen ? <div className="px-mobile-menu-backdrop" role="presentation" onClick={() => setMobileOpen(false)}>
        <section className="px-mobile-menu-sheet" role="dialog" aria-modal="true" aria-label="Menu do MEG" onClick={(event) => event.stopPropagation()}>
          <header className="px-mobile-menu-head">{data ? <MobileMenuIdentity data={data} /> : <div><span>MEG OPERACIONAL</span><strong>Menu</strong></div>}<button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}>×</button></header>
          <button className="px-mobile-menu-search" type="button" onClick={() => { setMobileOpen(false); setSearchOpen(true); }}><span>⌕</span><div><strong>Buscar no MEG</strong><small>Localize telas e funções</small></div></button>
          <div className="px-mobile-menu-grid">
            {(['home','movements','payables','cards','history','catalogs','receivables','revenues','cashflow','analytics','budgets','settings'] as PhoenixView[]).map((itemId) => {
              const item = views.find((candidate) => candidate.id === itemId);
              if (!item) return null;
              return <button key={item.id} className={`${view === item.id ? 'active' : ''} ${item.id === 'payables' ? 'payables' : ''}`} type="button" onClick={() => navigate(item.id, item.id === 'home')}>
                <span className="px-mobile-menu-icon" aria-hidden="true">{item.icon}</span>
                <span><strong>{item.label}</strong><small>{subtitles[item.id]}</small></span>
                {item.id === 'payables' && pendingCount > 0 ? <b>{pendingCount > 99 ? '99+' : pendingCount}</b> : null}
              </button>;
            })}
          </div>
          <footer className="px-mobile-menu-footer"><button type="button" onClick={requestClose}>Fechar o MEG</button></footer>
        </section>
      </div> : null}

      <nav className="px-mobile-dock" aria-label="Navegação móvel Phoenix V15">
        <button className={view === 'home' ? 'active' : ''} type="button" onClick={() => navigate('home', true)}><strong><PhoenixNavIcon name="home" /></strong><span>Início</span></button>
        <button className={view === 'movements' ? 'active' : ''} type="button" onClick={() => navigate('movements')}><strong><PhoenixNavIcon name="movements" /></strong><span>Lançamentos</span></button>
        <button className="px-dock-new" type="button" onClick={() => requestLaunch('expense')} aria-label="Novo lançamento"><strong>＋</strong><span>Novo</span></button>
        <button className={view === 'payables' ? 'active' : ''} type="button" onClick={() => navigate('payables')}><strong className="px-dock-icon-wrap"><PhoenixNavIcon name="payables" />{pendingCount > 0 ? <b className="px-dock-badge">{pendingCount > 99 ? '99+' : pendingCount}</b> : null}</strong><span>Pendentes</span></button>
        <button className={mobileOpen ? 'active' : ''} type="button" onClick={() => setMobileOpen(true)}><strong><PhoenixNavIcon name="more" /></strong><span>Menu</span></button>
      </nav>
    </div>
    {searchOpen ? <PhoenixCommandPalette data={viewData} onClose={() => setSearchOpen(false)} onNavigate={navigate} /> : null}
    {exitConfirmOpen ? <div className="px-meg-confirm-overlay px-app-exit-confirm">
      <button className="px-meg-confirm-backdrop" type="button" aria-label="Não sair" onClick={() => setExitConfirmOpen(false)} />
      <section className="px-meg-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="px-exit-title" aria-describedby="px-exit-copy">
        <div className="px-meg-confirm-icon" aria-hidden="true">↪</div>
        <div className="px-meg-confirm-copy">
          <span className="px-kicker">MEG Finanças</span>
          <h3 id="px-exit-title">Deseja fechar o aplicativo?</h3>
          <p id="px-exit-copy">O MEG será fechado. Sua conta continuará protegida e, se a biometria estiver ativada, ela será usada no próximo acesso.</p>
        </div>
        <button className="px-meg-confirm-close" type="button" aria-label="Não sair" onClick={() => setExitConfirmOpen(false)}>×</button>
        <div className="px-meg-confirm-actions">
          <button className="px-meg-confirm-secondary" type="button" onClick={() => setExitConfirmOpen(false)}>Não</button>
          <button className="px-meg-confirm-danger" type="button" onClick={() => { setExitConfirmOpen(false); onClose?.(); }}>Sim, fechar</button>
        </div>
      </section>
    </div> : null}
  </div>;
}
