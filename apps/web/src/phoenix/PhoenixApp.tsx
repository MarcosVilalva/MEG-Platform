import { useEffect, useRef, useState } from 'react';
import type { PhoenixLoadState, PhoenixReadModel } from './contracts';
import { loadPhoenixReadModel } from './data/load-phoenix-read-model';
import { PhoenixCommandPalette, type PhoenixRoute } from './PhoenixCommandPalette';
import { PhoenixPayables } from './screens/PhoenixReadScreens';
import { PhoenixCardsGrid } from './screens/PhoenixCardsGrid';
import { PhoenixCatalogsGrid } from './screens/PhoenixCatalogsGrid';
import { PhoenixMovementsV15 } from './screens/PhoenixMovementsV15';
import { PhoenixHistory } from './screens/PhoenixHistory';
import { PhoenixUsers } from './screens/PhoenixUsers';
import { PhoenixSettings } from './screens/PhoenixSettings';
import {
  PhoenixAnalytics,
  PhoenixBudgets,
  PhoenixCashflow,
  PhoenixReceivables,
  PhoenixReconciliation,
  PhoenixRevenues
} from './screens/PhoenixWebScreens';
import './phoenix-v15.css';
import './phoenix-parity-v15.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type PhoenixView = PhoenixRoute;
type ViewDefinition = { id: PhoenixView; icon: string; label: string };
type HomeAgendaItem = { id: string; description: string; dueDate: string; amount: number; meta: string; kind: 'VENCIDO' | 'FATURA' | 'PRÓXIMO' };
type HomeAgendaGroup = { kind: 'VENCIDOS' | 'FATURA' | 'PRÓXIMOS'; title: string; subtitle: string; amount: number; count: number };

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

function previousMonth(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function shortMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '')
    .replace(/^./, (letter) => letter.toUpperCase());
  return `${label}/${year}`;
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

function HomeScreen({ data, month, onNavigate }: { data: PhoenixReadModel; month: string; onNavigate: (view: PhoenixView) => void }) {
  const pendingCount = data.summary.pendingCount || 0;
  const pendingAmount = data.summary.pendingAmount || 0;
  const realizedBalance = data.summary.availableBalance + data.summary.realizedResult;
  const availableRevenue = data.summary.availableBalance + data.summary.realizedIncome;
  const projectedClosing = data.cashflow.projectedClosing;
  const consolidatedRealized = realizedBalance + data.summary.benefitBalance;
  const recentAudit = data.financialAudit.items.slice(0, 3);
  const today = todayIso();

  const payableAgenda: HomeAgendaItem[] = data.payables
    .filter((item) => !['paid', 'cancelled'].includes(item.status) && Number(item.openAmount) > 0)
    .map((item) => ({
      id: `payable-${item.id}`,
      description: item.description,
      dueDate: item.dueDate,
      amount: Number(item.openAmount || 0),
      meta: item.category?.name || 'Conta a pagar',
      kind: item.dueDate.slice(0, 10) < today ? 'VENCIDO' : 'PRÓXIMO'
    }));

  const eventAgenda: HomeAgendaItem[] = data.events.items
    .filter((event) => event.status === 'planned'
      && !['income', 'redemption', 'transfer'].includes(event.type)
      && event.account?.type !== 'benefit'
      && event.paymentMethod?.name?.trim().toUpperCase() !== 'VEROCARD')
    .map((event) => {
      const due = event.date.slice(0, 10);
      const card = `${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`.toUpperCase().includes('CARTÃO');
      return {
        id: `event-${event.id}`,
        description: event.description,
        dueDate: event.date,
        amount: Math.abs(Number(event.amount || 0)),
        meta: event.category?.name || event.sourceDetails?.expenseClass || 'Lançamento planejado',
        kind: due < today ? 'VENCIDO' : card ? 'FATURA' : 'PRÓXIMO'
      };
    });

  const agendaSource = payableAgenda.length ? payableAgenda : eventAgenda;
  const group = (kind: HomeAgendaItem['kind']) => agendaSource.filter((item) => item.kind === kind);
  const agendaGroups = ([
    { kind: 'VENCIDOS', title: 'Compromissos anteriores', subtitle: 'Agrupados por data de vencimento', amount: group('VENCIDO').reduce((sum, item) => sum + item.amount, 0), count: group('VENCIDO').length },
    { kind: 'FATURA', title: 'Compras do mesmo cartão', subtitle: 'Uma fatura por cartão e vencimento', amount: group('FATURA').reduce((sum, item) => sum + item.amount, 0), count: group('FATURA').length },
    { kind: 'PRÓXIMOS', title: 'Demais compromissos do período', subtitle: 'Ordenados por vencimento', amount: group('PRÓXIMO').reduce((sum, item) => sum + item.amount, 0), count: group('PRÓXIMO').length }
  ] satisfies HomeAgendaGroup[]).filter((item) => item.count > 0);

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
      <article className="px-card"><div className="px-panel-head"><div><span>Agenda financeira</span><h2>Vencimentos agrupados</h2></div><strong>{money.format(pendingAmount)}</strong></div><div>{agendaGroups.map((item) => <div className="px-dashboard-row" key={item.kind}><span className={`px-due-label ${item.kind === 'VENCIDOS' ? 'danger' : item.kind === 'FATURA' ? 'invoice' : ''}`}>{item.kind}</span><div className="px-dashboard-row-copy"><strong>{item.title}</strong><small>{item.subtitle} · {item.count} item(ns) · {money.format(item.amount)}</small></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Detalhes</button></div>)}{agendaGroups.length === 0 ? <p className="px-empty">Nenhum compromisso aberto no período.</p> : null}</div></article>
    </section>
  </>;
}

function ReadScreen({ view, data, month, theme, launchRequest, onToggleTheme, onNavigate }: {
  view: PhoenixView;
  data: PhoenixReadModel;
  month: string;
  theme: 'dark' | 'light';
  launchRequest: number;
  onToggleTheme: () => void;
  onNavigate: (view: PhoenixView) => void;
}) {
  if (view === 'home') return <HomeScreen data={data} month={month} onNavigate={onNavigate} />;
  if (view === 'movements') return <PhoenixMovementsV15 data={data} launchRequest={launchRequest} onNavigateHistory={() => onNavigate('history')} />;
  if (view === 'history') return <PhoenixHistory data={data} />;
  if (view === 'payables') return <PhoenixPayables data={data} />;
  if (view === 'cards') return <PhoenixCardsGrid data={data} />;
  if (view === 'catalogs') return <PhoenixCatalogsGrid data={data} />;
  if (view === 'users') return <PhoenixUsers data={data} />;
  if (view === 'settings') return <PhoenixSettings data={data} theme={theme} onToggleTheme={onToggleTheme} />;
  if (view === 'receivables') return <PhoenixReceivables data={data} />;
  if (view === 'revenues') return <PhoenixRevenues data={data} />;
  if (view === 'cashflow') return <PhoenixCashflow data={data} />;
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
  const [launchRequest, setLaunchRequest] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<PhoenixLoadState>({ status: 'idle' });
  const periodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoadState({ status: 'loading', startedAt: Date.now() });
    void loadPhoenixReadModel(month)
      .then((data) => { if (active) setLoadState({ status: 'ready', data }); })
      .catch((error: unknown) => { if (active) setLoadState({ status: 'error', message: error instanceof Error ? error.message : 'PHOENIX_LOAD_FAILED' }); });
    return () => { active = false; };
  }, [month, refreshKey]);

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
    const closeOutside = (event: PointerEvent) => {
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) setPeriodOpen(false);
    };
    window.addEventListener('pointerdown', closeOutside);
    return () => window.removeEventListener('pointerdown', closeOutside);
  }, [periodOpen]);

  const data = loadState.status === 'ready' ? loadState.data : null;
  const currentView = views.find((item) => item.id === view) || mainViews[0];
  const pendingCount = data?.summary.pendingCount || 0;
  const toggleTheme = () => setTheme((value) => value === 'dark' ? 'light' : 'dark');
  const userInitial = (data?.user.name || 'M').slice(0, 1).toUpperCase();

  function navigate(next: PhoenixView) {
    setView(next);
    setMobileOpen(false);
    setSearchOpen(false);
    setPeriodOpen(false);
  }

  function requestLaunch() {
    navigate('movements');
    setLaunchRequest((value) => value + 1);
  }

  function chooseMonth(next: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(next)) return;
    setMonth(next);
    setPeriodOpen(false);
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
              <button className="px-period-summary" type="button" title="Selecionar período" aria-label="Selecionar período" onClick={() => setPeriodOpen((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M14 14h2M8 18h2"/></svg><span className="px-period-active">{shortMonthLabel(month)}</span></button>
              {periodOpen ? <div className="px-period-popover"><span>Período global</span><div className="px-period-presets"><button type="button" onClick={() => chooseMonth(currentMonth())}>Mês atual</button><button type="button" onClick={() => chooseMonth(previousMonth(currentMonth()))}>Mês anterior</button></div><label className="px-period-field"><span>Mês e ano</span><input type="month" value={month} onChange={(event) => chooseMonth(event.target.value)} /></label></div> : null}
            </div>
            <button className="px-sync" type="button" disabled={loadState.status === 'loading'} onClick={() => setRefreshKey((value) => value + 1)}><span className="px-sync-dot" /><span>{loadState.status === 'loading' ? 'Atualizando dados' : data?.normalization.reconciled ? 'Dados sincronizados' : 'Verificar integridade'}</span></button><button className="px-icon-btn" type="button" title="Alternar tema" onClick={toggleTheme}>◐</button><button className="px-user-pill" type="button" title="Perfil do usuário"><span className="px-user-avatar">{userInitial}</span><span className="px-user-name">{data?.user.name || 'MEG'}</span><span className="px-user-chevron">⌄</span></button><button className="px-icon-btn px-top-exit" type="button" title="Sair" onClick={onLogout}>↪</button>
          </div>
        </header>

        <div className="px-content">
          {loadState.status === 'error' ? <section className="px-card"><span className="px-kicker">Phoenix V15</span><h1>Não foi possível carregar a leitura real</h1><p>{loadState.message}</p><button className="px-history-export" type="button" onClick={() => setRefreshKey((value) => value + 1)}>Tentar novamente</button></section> : data ? <ReadScreen view={view} data={data} month={month} theme={theme} launchRequest={launchRequest} onToggleTheme={toggleTheme} onNavigate={navigate} /> : <section className="px-card px-placeholder"><span className="px-kicker">Phoenix V15</span><h2>Carregando base real</h2><p>Resumo, lançamentos, cartões, pendências, histórico, usuários, configurações e relatórios estão sendo carregados em paralelo.</p></section>}
        </div>
      </main>

      <nav className="px-mobile-dock" aria-label="Navegação móvel Phoenix V15"><button className={view === 'home' ? 'active' : ''} type="button" onClick={() => navigate('home')}><strong>⌂</strong><span>Início</span></button><button className={view === 'movements' ? 'active' : ''} type="button" onClick={requestLaunch}><strong>＋</strong><span>Lançar</span></button><button className={view === 'history' ? 'active' : ''} type="button" onClick={() => navigate('history')}><strong>◷</strong><span>Histórico</span></button><button className={view === 'payables' ? 'active' : ''} type="button" onClick={() => navigate('payables')}><strong>◷</strong><span>Pendentes</span></button><button type="button" onClick={() => setMobileOpen(true)}><strong>≡</strong><span>Mais</span></button></nav>
    </div>
    {searchOpen ? <PhoenixCommandPalette data={data} onClose={() => setSearchOpen(false)} onNavigate={navigate} /> : null}
  </div>;
}
