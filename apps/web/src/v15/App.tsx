import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { deriveDashboard, type PeriodMode, type PeriodSelection } from './domain/dashboard';
import {
  currentSession,
  loadV15Core,
  loadV15Supplemental,
  signIn,
  signOut,
  type AuthSession,
  type V15CoreModel,
  type V15SupplementalModel
} from './services/api';

type PageKey = 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs' | 'users' | 'settings';

const PAGE_META: Record<PageKey, { title: string; subtitle: string; label: string; icon: string }> = {
  home: { title: 'Início', subtitle: 'Visão geral do período', label: 'Início', icon: '⌂' },
  movements: { title: 'Lançamentos', subtitle: 'Controle financeiro', label: 'Lançamentos', icon: '▦' },
  history: { title: 'Histórico', subtitle: 'Auditoria e rastreabilidade', label: 'Histórico', icon: '◷' },
  payables: { title: 'Pendentes', subtitle: 'Prioridades e compromissos do período', label: 'Pendentes', icon: '◷' },
  cards: { title: 'Cartões', subtitle: 'Faturas, compras e parcelas', label: 'Cartões', icon: '▣' },
  catalogs: { title: 'Cadastros', subtitle: 'Contas, categorias, formas e cartões', label: 'Cadastros', icon: '≡' },
  users: { title: 'Usuários e permissões', subtitle: 'Acessos do workspace', label: 'Usuários e permissões', icon: '♙' },
  settings: { title: 'Configurações', subtitle: 'Preferências e integrações', label: 'Configurações', icon: '⚙' }
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

function monthTitle(value: string) {
  const [year, month] = value.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function periodLabel(period: PeriodSelection) {
  if (period.mode === 'all') return 'Tudo';
  if (period.mode === 'range') return 'Intervalo';
  const [year, month] = period.month.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
}

function dateLabel(value: string) {
  const iso = String(value || '').slice(0, 10);
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR') : '—';
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Login({ onSession }: { onSession: (session: AuthSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError('');
    try {
      onSession(await signIn(email.trim(), password));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.');
    } finally {
      setWorking(false);
    }
  }

  const brandMark = `${import.meta.env.BASE_URL}brand/meg-finance-system-mark.svg`;

  return <section className="auth">
    <div className="auth-visual">
      <div><img className="brand-mark-logo" src={brandMark} alt="MEG Finance System" /></div>
      <div className="auth-copy">
        <span className="kicker">Finanças pessoais</span>
        <h1>Seu dinheiro organizado por eventos, não por improvisos.</h1>
        <p>Saldo, compromissos, cartões, benefícios, metas e análises em um sistema único. Ações financeiras relevantes permanecem sob confirmação do usuário.</p>
      </div>
      <div className="auth-principles">
        <div><strong>Dados do usuário</strong><span>Cada evento pertence ao seu espaço financeiro.</span></div>
        <div><strong>Saldo por eventos</strong><span>O saldo não é editado arbitrariamente.</span></div>
        <div><strong>Rastreabilidade</strong><span>Alterações relevantes permanecem auditáveis.</span></div>
      </div>
    </div>
    <div className="auth-panel">
      <form className="auth-card" onSubmit={submit}>
        <span className="kicker">Área segura</span>
        <h2>Acesse sua conta</h2>
        <p>Informe suas credenciais para continuar.</p>
        <label className="field"><span>E-mail</span><input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field password-wrap"><span>Senha</span><input autoComplete="current-password" minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="notice warn">{error}</div>}
        <button className="btn auth-submit" disabled={working}>{working ? 'Entrando…' : 'Entrar no MEG'}</button>
        <div className="notice" style={{ marginTop: 16 }}>V15 Phoenix · conectada à mesma autenticação e à mesma base do MEG.</div>
      </form>
    </div>
  </section>;
}

function Dashboard({
  core,
  supplemental,
  period,
  onNavigate
}: {
  core: V15CoreModel;
  supplemental: V15SupplementalModel | null;
  period: PeriodSelection;
  onNavigate: (page: PageKey) => void;
}) {
  const view = useMemo(() => deriveDashboard(core.transactions, period), [core.transactions, period]);
  const cardStatement = supplemental?.cards.reduce((sum, card) => sum + numberValue(card.statementAmount), 0) || 0;
  const statusCopy = (status: string) => status === 'paid' ? ['Pago', ''] : status === 'planned' ? ['Pendente', 'warn'] : status === 'reconciled' ? ['Conciliado', 'info'] : ['Confirmado', ''];

  return <section className="page active" id="home">
    <div className="page-head">
      <div>
        <span className="kicker">Visão geral</span>
        <h1>{period.mode === 'month' ? monthTitle(period.month) : period.mode === 'range' ? 'Período selecionado' : 'Todo o histórico'}</h1>
        <p>Leitura do período usando exclusivamente as regras e os lançamentos preservados na base financeira do MEG.</p>
        <span className="dashboard-updated">Revisão {core.revision} · dados compartilhados confirmados</span>
      </div>
    </div>

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
      <div><div className="premium-alert-icon">{view.projected < 0 ? '!' : '✓'}</div><h3>{view.projected < 0 ? 'Mês exige atenção' : 'Mês sob controle'}</h3><p>O diagnóstico principal considera o período corrente e não pode ser mascarado pelos filtros analíticos.</p></div>
      <div><span className="gap-label">{view.projected < 0 ? 'Falta projetada para fechar o mês' : 'Resultado projetado'}</span><strong>{money.format(view.projected)}</strong></div>
    </article>

    <div className="premium-metrics">
      <article className="premium-metric good"><span>Despesas pagas</span><strong>{money.format(view.paidExpense)}</strong><small>Reduzem o saldo realizado</small></article>
      <article className="premium-metric bad"><span>Despesas pendentes</span><strong>{money.format(view.pending)}</strong><small>Não reduzem o realizado até a baixa</small></article>
      <article className="premium-metric info benefit-control"><span>Benefício alimentação · disponível</span><strong>{money.format(view.benefit)}</strong><div className="benefit-inline"><div><span>Saldo carregado</span><b>{money.format(view.benefit)}</b></div><button className="btn secondary row-action" onClick={() => onNavigate('movements')}>Ver extrato</button></div></article>
      <article className="premium-metric warn"><span>Consolidado realizado</span><strong>{money.format(view.realized + view.benefit)}</strong><small>Monetário + benefício do período</small></article>
    </div>

    <div className="premium-grid2">
      <article className="premium-card">
        <div className="premium-card-head"><div><span className="premium-label">Histórico recente</span><h3>Últimos lançamentos</h3></div><button className="btn secondary row-action" onClick={() => onNavigate('history')}>Ver histórico completo</button></div>
        <div className="dashboard-list">
          {view.recent.map((event) => {
            const [label, tone] = statusCopy(event.status);
            return <div className="dashboard-row" key={event.id}>
              <div><strong>{event.description}</strong><small>{dateLabel(event.date)} · {event.group || event.category || 'Sem grupo'}</small></div>
              <span className={`pill ${tone}`}>{label}</span>
              <button className="btn secondary row-action" onClick={() => onNavigate('history')}>Abrir</button>
            </div>;
          })}
          {!view.recent.length && <p className="empty">Nenhum lançamento no período.</p>}
        </div>
      </article>

      <article className="premium-card agenda-card">
        <div className="premium-card-head"><div><span className="premium-label">Agenda financeira</span><h3>Vencimentos agrupados</h3></div><span className="pill bad">{money.format(view.pending)}</span></div>
        <div className="dashboard-list">
          <div className="dashboard-row"><span className="due-date danger">VENCIDOS</span><div><strong>Compromissos anteriores</strong><small>Agrupados por vencimento · {money.format(view.overdue)}</small></div><button className="btn secondary row-action" onClick={() => onNavigate('payables')}>Detalhes</button></div>
          <div className="dashboard-row"><span className="due-date">FATURA</span><div><strong>Compras do mesmo cartão</strong><small>Faturas abertas do período · {money.format(cardStatement)}</small></div><button className="btn secondary row-action" onClick={() => onNavigate('cards')}>Detalhes</button></div>
          <div className="dashboard-row"><span className="due-date">PRÓXIMOS</span><div><strong>Demais compromissos</strong><small>Hoje e próximos dias · {money.format(view.next)}</small></div><button className="btn secondary row-action" onClick={() => onNavigate('payables')}>Detalhes</button></div>
        </div>
      </article>
    </div>
  </section>;
}

function MigrationPlaceholder({ page }: { page: Exclude<PageKey, 'home'> }) {
  const meta = PAGE_META[page];
  return <section className="page active">
    <div className="page-head"><div><span className="kicker">V15 Phoenix</span><h1>{meta.title}</h1><p>{meta.subtitle}. Esta tela será conectada às regras reais na próxima etapa; nenhuma versão legada foi importada para preencher o espaço.</p></div></div>
    <article className="card phoenix-placeholder">
      <strong>Estrutura clean-room pronta</strong>
      <p>A próxima implementação desta tela partirá do HTML V15 validado e consumirá os serviços existentes, sem reaproveitar o layout antigo.</p>
    </article>
  </section>;
}

export function App() {
  const initialMonth = localStorage.getItem('meg.v15.period') || currentMonth();
  const initialBounds = monthBounds(initialMonth);
  const [session, setSession] = useState<AuthSession | null>(() => currentSession());
  const [page, setPage] = useState<PageKey>('home');
  const [core, setCore] = useState<V15CoreModel | null>(null);
  const [supplemental, setSupplemental] = useState<V15SupplementalModel | null>(null);
  const [loadError, setLoadError] = useState('');
  const [supplementalLoading, setSupplementalLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodSelection>({ mode: 'month', month: initialMonth, start: initialBounds.start, end: initialBounds.end });
  const [draftMonth, setDraftMonth] = useState(initialMonth);
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('meg-sidebar-collapsed');
    return stored === 'true' || (stored === null && window.matchMedia('(max-width:1100px)').matches);
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('meg.v15.theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('meg.v15.theme', theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle('authenticated', Boolean(session));
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem('meg-sidebar-collapsed', String(collapsed));
    return () => {
      document.body.classList.remove('authenticated', 'sidebar-collapsed');
    };
  }, [session, collapsed]);

  useEffect(() => {
    if (!session) {
      setCore(null);
      setSupplemental(null);
      return;
    }
    const controller = new AbortController();
    setLoadError('');
    void loadV15Core(controller.signal)
      .then(setCore)
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setLoadError(error instanceof Error ? error.message : 'BASE_INDISPONIVEL');
      });
    return () => controller.abort();
  }, [session]);

  useEffect(() => {
    if (!session || !core) return;
    const controller = new AbortController();
    setSupplementalLoading(true);
    void loadV15Supplemental(period.month, controller.signal)
      .then(setSupplemental)
      .finally(() => setSupplementalLoading(false));
    return () => controller.abort();
  }, [session, core, period.month]);

  const dashboard = useMemo(() => core ? deriveDashboard(core.transactions, period) : null, [core, period]);
  const brandMark = `${import.meta.env.BASE_URL}brand/meg-finance-system-mark.svg`;
  const meta = PAGE_META[page];

  if (!session) return <Login onSession={setSession} />;

  if (!core) {
    return <div className="phoenix-boot">
      <img src={brandMark} alt="MEG" />
      <strong>{loadError ? 'Base financeira indisponível' : 'Carregando sua base financeira'}</strong>
      <small>{loadError || 'Confirmando os dados compartilhados antes de liberar a interface.'}</small>
      {!loadError && <div className="phoenix-boot-progress" />}
      {loadError && <button className="btn" onClick={() => window.location.reload()}>Tentar novamente</button>}
    </div>;
  }

  function applyPeriod() {
    if (period.mode === 'month') {
      const bounds = monthBounds(draftMonth);
      setPeriod((current) => ({ ...current, month: draftMonth, start: bounds.start, end: bounds.end }));
      localStorage.setItem('meg.v15.period', draftMonth);
      return;
    }
    if (period.mode === 'range' && period.start > period.end) {
      setPeriod((current) => ({ ...current, start: current.end, end: current.start }));
    }
  }

  function setPeriodMode(mode: PeriodMode) {
    setPeriod((current) => ({ ...current, mode }));
  }

  async function doLogout() {
    const active = session;
    setSession(null);
    try { await signOut(active); } catch { /* sessão local já foi encerrada */ }
  }

  const nav = (['home', 'movements', 'history', 'payables', 'cards', 'catalogs', 'users', 'settings'] as PageKey[]);

  return <div id="app" className="app">
    <aside className="sidebar">
      <div className="side-brand"><img className="brand-mark-logo" src={brandMark} alt="MEG Finance System" /></div>
      <button className="search-command" type="button" title="Busca global entra na etapa de navegação">⌘ Buscar no MEG</button>
      <div className="nav-group" id="desktopNav">
        {nav.map((item) => <button key={item} className={`nav-btn ${page === item ? 'active' : ''}`} onClick={() => setPage(item)} title={PAGE_META[item].label}>
          <span className="nav-icon">{PAGE_META[item].icon}</span>{PAGE_META[item].label}
          {item === 'payables' && Boolean(dashboard?.pendingCount) && <span className="side-badge">{dashboard!.pendingCount > 99 ? '99+' : dashboard!.pendingCount}</span>}
        </button>)}
      </div>
      <div className="side-user"><strong>{session.user.name}</strong><small>{session.user.role}</small></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="top-left">
          <button className="side-collapse" title={collapsed ? 'Expandir menu' : 'Recolher menu'} aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}>☰</button>
          <div className="top-title"><strong>{meta.title}</strong><small>{meta.subtitle}</small></div>
        </div>
        <div className="top-right">
          <details className="period-menu">
            <summary title="Selecionar período" aria-label="Selecionar período">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M14 14h2M8 18h2"/></svg>
              <span className="period-active">{periodLabel(period)}</span>
            </summary>
            <div className="period-popover">
              <span>Período global</span>
              <div className="period-modes">
                <button type="button" className={period.mode === 'month' ? 'active' : ''} onClick={() => setPeriodMode('month')}>Mês</button>
                <button type="button" className={period.mode === 'range' ? 'active' : ''} onClick={() => setPeriodMode('range')}>Intervalo</button>
                <button type="button" className={period.mode === 'all' ? 'active' : ''} onClick={() => setPeriodMode('all')}>Tudo</button>
              </div>
              {period.mode === 'month' && <div className="period-panel"><label className="period-field"><span>Mês e ano</span><input type="month" value={draftMonth} onChange={(event) => setDraftMonth(event.target.value)} /></label></div>}
              {period.mode === 'range' && <div className="period-panel period-range">
                <label className="period-field"><span>Data inicial</span><input type="date" value={period.start} onChange={(event) => setPeriod((current) => ({ ...current, start: event.target.value }))} /></label>
                <label className="period-field"><span>Data final</span><input type="date" value={period.end} onChange={(event) => setPeriod((current) => ({ ...current, end: event.target.value }))} /></label>
              </div>}
              {period.mode === 'all' && <div className="period-panel period-all">Exibir todo o histórico disponível, sem limitar por mês ou intervalo.</div>}
              <button type="button" className="btn period-apply" onClick={applyPeriod}>Aplicar período</button>
            </div>
          </details>
          <button className="sync" type="button"><span className="sync-dot" /><span>{supplementalLoading ? 'Carregando complementos' : supplemental?.errors.length ? 'Base principal sincronizada' : 'Dados sincronizados'}</span></button>
          <button className="icon-btn" type="button" title="Alternar tema" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}>◐</button>
          <button className="user-pill" type="button" title="Perfil do usuário"><span className="user-avatar">{session.user.name.charAt(0).toUpperCase()}</span><span className="user-name">{session.user.name}</span><span className="user-chevron">⌄</span></button>
          <button className="icon-btn" type="button" title="Sair" onClick={doLogout}>↪</button>
        </div>
      </header>

      <div className="content">
        {page === 'home' ? <Dashboard core={core} supplemental={supplemental} period={period} onNavigate={setPage} /> : <MigrationPlaceholder page={page} />}
      </div>
    </main>

    <nav className="mobile-nav" aria-label="Navegação móvel">
      {(['home', 'movements', 'payables', 'cards'] as PageKey[]).map((item) => <button key={item} className={page === item ? 'active' : ''} onClick={() => setPage(item)}><b>{PAGE_META[item].icon}</b>{PAGE_META[item].label}</button>)}
    </nav>
  </div>;
}
