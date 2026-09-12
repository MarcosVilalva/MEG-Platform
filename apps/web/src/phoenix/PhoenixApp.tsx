import { useEffect, useState } from 'react';
import type { PhoenixLoadState, PhoenixReadModel } from './contracts';
import { loadPhoenixReadModel } from './data/load-phoenix-read-model';
import { PhoenixCommandPalette, type PhoenixRoute } from './PhoenixCommandPalette';
import { PhoenixCards, PhoenixCatalogs, PhoenixMovements, PhoenixPayables } from './screens/PhoenixReadScreens';
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

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type PhoenixView = PhoenixRoute;
type ViewDefinition = { id: PhoenixView; icon: string; label: string };

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

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function eventValue(type: string, value: string | number) {
  const amount = Math.abs(Number(value) || 0);
  return `${type === 'income' ? '+' : '−'} ${money.format(amount)}`;
}

function HomeScreen({ data, month }: { data: PhoenixReadModel; month: string }) {
  const pendingCount = data.summary.pendingCount || 0;
  const pendingAmount = data.summary.pendingAmount || 0;
  const realizedBalance = data.summary.availableBalance + data.summary.realizedResult;
  const currentStatements = data.cards.reduce((sum, card) => sum + Number(card.statementAmount || 0), 0);
  const recentEvents = data.events.items.filter((event) => event.competence === month).slice(0, 5);
  const agenda = data.payables.filter((item) => !['paid', 'cancelled'].includes(item.status)).slice(0, 5);

  return <>
    <div className="px-readonly-banner">Phoenix V15 em modo de leitura. Nenhuma ação desta raiz altera a base financeira.</div>
    <div className="px-page-head"><div><span className="px-kicker">Visão geral</span><h1>{monthLabel(month)}</h1><p>Leitura dos serviços reais do MEG, sem dados de demonstração e sem dependência do layout legado.</p><span className="px-updated">Atualizado {new Date(data.loadedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {data.normalization.primary && data.normalization.reconciled ? 'base normalizada reconciliada' : 'fallback monitorado'}</span></div></div>

    <section className="px-dashboard-grid">
      <article className="px-card px-premium-balance"><span className="px-kicker">Saldo monetário realizado</span><h2>{money.format(realizedBalance)}</h2><p>Saldo anterior somado ao resultado financeiro realizado do período.</p><div className="px-balance-stats"><div className="px-balance-stat"><span>Saldo anterior</span><strong>{money.format(data.summary.availableBalance)}</strong></div><div className="px-balance-stat"><span>Receitas do mês</span><strong>{money.format(data.summary.income)}</strong></div><div className="px-balance-stat"><span>Resultado realizado</span><strong>{money.format(data.summary.realizedResult)}</strong></div></div></article>
      <article className="px-card px-dashboard-alert"><div><span className="px-kicker">Mês sob controle</span><h3>{pendingCount ? `${pendingCount} compromisso${pendingCount === 1 ? '' : 's'} em aberto` : 'Sem compromissos em aberto'}</h3><p>As prioridades são carregadas do serviço oficial de pendências e do resumo financeiro.</p></div><strong className="px-gap-label">{money.format(pendingAmount)} pendente</strong></article>
    </section>

    <section className="px-metrics">
      <article className="px-card px-metric good"><span>Receitas realizadas</span><strong>{money.format(data.summary.realizedIncome)}</strong><small>Eventos efetivados no período</small></article>
      <article className="px-card px-metric bad"><span>Pendente</span><strong>{money.format(pendingAmount)}</strong><small>{pendingCount} item(ns) no resumo oficial</small></article>
      <article className="px-card px-metric info"><span>Faturas do período</span><strong>{money.format(currentStatements)}</strong><small>{data.cards.length} cartão(ões) ativo(s)</small></article>
      <article className="px-card px-metric warn"><span>Eventos financeiros</span><strong>{data.summary.eventCount}</strong><small>Movimentações do período</small></article>
    </section>

    <section className="px-bottom-grid">
      <article className="px-card"><div className="px-panel-head"><div><span>Histórico recente</span><h2>Últimos lançamentos</h2></div></div><div className="px-list">{recentEvents.map((event) => <div className="px-list-row" key={event.id}><div className="px-list-copy"><strong>{event.description}</strong><small>{shortDate.format(new Date(event.date))} · {event.category?.name || 'Sem classificação'} · {event.account?.name || 'Conta não informada'}</small></div><div className="px-list-value">{eventValue(event.type, event.amount)}</div></div>)}{recentEvents.length === 0 ? <p className="px-empty">Nenhum lançamento localizado.</p> : null}</div></article>
      <article className="px-card"><div className="px-panel-head"><div><span>Agenda financeira</span><h2>Próximos compromissos</h2></div><strong>{money.format(pendingAmount)}</strong></div><div className="px-list">{agenda.map((item) => <div className="px-list-row" key={item.id}><div className="px-list-copy"><strong>{item.description}</strong><small>{shortDate.format(new Date(item.dueDate))} · {item.category?.name || 'Sem classificação'}</small></div><div className="px-list-value">{money.format(Number(item.openAmount) || 0)}</div></div>)}{agenda.length === 0 ? <p className="px-empty">Nenhum compromisso aberto no período.</p> : null}</div></article>
    </section>
  </>;
}

function ReadScreen({ view, data, month, theme, onToggleTheme }: { view: PhoenixView; data: PhoenixReadModel; month: string; theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  if (view === 'home') return <HomeScreen data={data} month={month} />;
  if (view === 'movements') return <PhoenixMovements data={data} />;
  if (view === 'history') return <PhoenixHistory data={data} />;
  if (view === 'payables') return <PhoenixPayables data={data} />;
  if (view === 'cards') return <PhoenixCards data={data} />;
  if (view === 'catalogs') return <PhoenixCatalogs data={data} />;
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadState, setLoadState] = useState<PhoenixLoadState>({ status: 'idle' });

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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const data = loadState.status === 'ready' ? loadState.data : null;
  const currentView = views.find((item) => item.id === view) || mainViews[0];
  const pendingCount = data?.summary.pendingCount || 0;
  const toggleTheme = () => setTheme((value) => value === 'dark' ? 'light' : 'dark');

  function navigate(next: PhoenixView) {
    setView(next);
    setMobileOpen(false);
    setSearchOpen(false);
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
        <div className="px-side-user"><strong>{data?.user.name || 'MEG'}</strong><small>Perfil {data?.user.role || '—'}</small></div>
      </aside>

      <main className="px-main">
        <header className="px-topbar">
          <div className="px-top-left"><button className="px-collapse" type="button" aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} onClick={() => { if (window.matchMedia('(max-width:760px)').matches) setMobileOpen((value) => !value); else setCollapsed((value) => !value); }}>☰</button><div className="px-top-title"><strong>{currentView.label}</strong><small>{subtitles[view]}</small></div></div>
          <div className="px-top-right"><label className="px-period" aria-label="Período global"><span>▣</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><button className="px-sync" type="button" disabled={loadState.status === 'loading'} onClick={() => setRefreshKey((value) => value + 1)}><span className="px-sync-dot" /><span>{loadState.status === 'loading' ? 'Atualizando dados' : data?.normalization.reconciled ? 'Dados sincronizados' : 'Verificar integridade'}</span></button><button className="px-icon-btn" type="button" title="Alternar tema" onClick={toggleTheme}>◐</button><button className="px-user-pill" type="button" title="Perfil do usuário"><span className="px-user-avatar">{(data?.user.name || 'M').slice(0, 1).toUpperCase()}</span><span className="px-user-name">{data?.user.name || 'MEG'}</span><span>⌄</span></button><button className="px-icon-btn" type="button" title="Sair" onClick={onLogout}>↪</button></div>
        </header>

        <div className="px-content">
          {loadState.status === 'error' ? <section className="px-card"><span className="px-kicker">Phoenix V15</span><h1>Não foi possível carregar a leitura real</h1><p>{loadState.message}</p><button className="px-history-export" type="button" onClick={() => setRefreshKey((value) => value + 1)}>Tentar novamente</button></section> : data ? <ReadScreen view={view} data={data} month={month} theme={theme} onToggleTheme={toggleTheme} /> : <section className="px-card px-placeholder"><span className="px-kicker">Phoenix V15</span><h2>Carregando base real</h2><p>Resumo, lançamentos, cartões, pendências, histórico, usuários, configurações e relatórios estão sendo carregados em paralelo.</p></section>}
        </div>
      </main>

      <nav className="px-mobile-dock" aria-label="Navegação móvel Phoenix V15"><button className={view === 'home' ? 'active' : ''} type="button" onClick={() => navigate('home')}><strong>⌂</strong><span>Início</span></button><button className={view === 'movements' ? 'active' : ''} type="button" onClick={() => navigate('movements')}><strong>＋</strong><span>Lançar</span></button><button className={view === 'history' ? 'active' : ''} type="button" onClick={() => navigate('history')}><strong>◷</strong><span>Histórico</span></button><button className={view === 'payables' ? 'active' : ''} type="button" onClick={() => navigate('payables')}><strong>◷</strong><span>Pendentes</span></button><button type="button" onClick={() => setMobileOpen(true)}><strong>≡</strong><span>Mais</span></button></nav>
    </div>
    {searchOpen ? <PhoenixCommandPalette data={data} onClose={() => setSearchOpen(false)} onNavigate={navigate} /> : null}
  </div>;
}
