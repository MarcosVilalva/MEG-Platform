import { useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '../app/store';
import { readSession } from '../app/auth-client';

interface AppShellProps {
  active: string;
  onNavigate: (view: string) => void;
  onOpenCommand: () => void;
  onLogout: () => void;
  onNewTransaction?: () => void;
  children: ReactNode;
}

type IconName = 'home' | 'transactions' | 'history' | 'pending' | 'cards' | 'catalogs' | 'users' | 'settings' | 'receivables' | 'analytics' | 'cashflow' | 'decision' | 'search' | 'logout' | 'calendar' | 'plus' | 'theme' | 'more' | 'menu' | 'close';

const iconPaths: Record<IconName, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></>,
  transactions: <><path d="M5 5h14M5 12h14M5 19h14"/><circle cx="8" cy="5" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="10" cy="19" r="1"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  pending: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  cards: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h3"/></>,
  catalogs: <><path d="M5 6h14M5 12h14M5 18h14"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
  users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-4 2.7-6 6-6s6 2 6 6M15 15c3 0 5 1.7 5 5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  receivables: <><path d="M4 7h16v12H4zM7 4h10v3M8 13h8M8 16h5"/></>, analytics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
  cashflow: <><path d="M4 8h14l-3-3M20 16H6l3 3"/></>, decision: <path d="m12 3 8 9-8 9-8-9 8-9Z"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>, logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>, plus: <path d="M12 5v14M5 12h14"/>, theme: <><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></>, more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>, menu: <path d="M4 7h16M4 12h16M4 17h16"/>, close: <path d="m6 6 12 12M18 6 6 18"/>
};
function Icon({ name }: { name: IconName }) { return <svg className="meg-nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>; }

const primaryNav = [
  ['dashboard', 'Início', 'home'], ['transactions', 'Lançamentos', 'transactions'], ['history', 'Histórico', 'history'],
  ['payables', 'Pendentes', 'pending'], ['cards', 'Cartões', 'cards'], ['catalogs', 'Cadastros', 'catalogs'],
  ['users', 'Usuários e permissões', 'users'], ['settings', 'Configurações', 'settings']
] as const;

const secondaryNav = [
  ['receivables', 'Contas a receber', 'receivables'], ['analytics', 'Análises', 'analytics'],
  ['cashflow', 'Fluxo de caixa', 'cashflow'], ['decision', 'Decisões', 'decision']
] as const;

const pageCopy: Record<string, [string, string]> = {
  dashboard: ['Início', 'Visão geral da vida financeira'],
  transactions: ['Lançamentos', 'Inclua e controle seus eventos financeiros'],
  history: ['Histórico', 'Auditoria completa dos lançamentos'],
  payables: ['Pendentes', 'Vencimentos organizados por prioridade'],
  cards: ['Cartões', 'Faturas, limites e compras'],
  catalogs: ['Cadastros', 'Organize a base operacional'],
  users: ['Usuários e permissões', 'Controle de acesso ao MEG'],
  settings: ['Configurações', 'Personalize o MEG do seu jeito'],
  receivables: ['Contas a receber', 'Títulos e recebimentos'],
  analytics: ['Análises', 'Indicadores para decisões financeiras'],
  cashflow: ['Fluxo de caixa', 'Projeção das movimentações'],
  decision: ['Decisões', 'Prioridades da sua vida financeira']
};

export function AppShell({ active, onNavigate, onOpenCommand, onLogout, onNewTransaction, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('meg-sidebar-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(() => useAppStore.getState().selectedMonth);
  const [draftMode, setDraftMode] = useState<'month' | 'range' | 'all'>(() => useAppStore.getState().periodMode);
  const [draftStart, setDraftStart] = useState(() => useAppStore.getState().periodStart);
  const [draftEnd, setDraftEnd] = useState(() => useAppStore.getState().periodEnd);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() => window.matchMedia('(max-width: 820px)').matches);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const periodMode = useAppStore((state) => state.periodMode);
  const setGlobalPeriod = useAppStore((state) => state.setGlobalPeriod);
  const session = readSession();
  const [title, subtitle] = pageCopy[active] || ['MEG', 'Meu Equilíbrio Gerencial'];
  const initial = session?.user.name?.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() || 'U';

  useEffect(() => localStorage.setItem('meg-sidebar-collapsed', collapsed ? '1' : '0'), [collapsed]);
  useEffect(() => {
    if (!periodOpen) return;
    const state = useAppStore.getState();
    setDraftMonth(state.selectedMonth);
    setDraftMode(state.periodMode);
    setDraftStart(state.periodStart);
    setDraftEnd(state.periodEnd);
  }, [periodOpen, selectedMonth]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)');
    const update = () => { setIsCompactViewport(media.matches); if (!media.matches) setMobileOpen(false); };
    update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  const navigate = (id: string) => { onNavigate(id); setMobileOpen(false); };
  const navButton = ([id, label, icon]: readonly [string, string, string]) => {
    if (id === 'users' && session?.user.role !== 'ADMIN') return null;
    return <button key={id} className={active === id ? 'active' : ''} onClick={() => navigate(id)} title={!isCompactViewport && collapsed ? label : undefined}><span><Icon name={icon as IconName} /></span><b>{label}</b></button>;
  };

  return <div className={`meg-app ${theme} ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-menu-open' : ''}`}>
    <aside className="meg-sidebar" aria-label="Menu principal">
      <div className="meg-side-brand"><img src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" /><button onClick={() => isCompactViewport ? setMobileOpen(false) : setCollapsed((value) => !value)} aria-label={isCompactViewport ? 'Fechar menu' : collapsed ? 'Expandir menu' : 'Recolher menu'} title={isCompactViewport ? 'Fechar menu' : collapsed ? 'Expandir menu' : 'Recolher menu'}>{isCompactViewport ? <Icon name="close" /> : '‹'}</button></div>
      <button className="meg-search" onClick={onOpenCommand} title="Buscar no MEG"><span><Icon name="search" /></span><b>Buscar no MEG</b></button>
      <nav className="meg-nav">{primaryNav.map(navButton)}</nav>
      <div className="meg-side-more"><button onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen}><span><Icon name="plus" /></span><b>Web completo</b></button>{moreOpen && <nav>{secondaryNav.map(navButton)}</nav>}</div>
      <div className="meg-side-user"><span>{initial}</span><div><strong>{session?.user.name || 'Usuário'}</strong><small>Perfil {session?.user.role || 'MEG'}</small></div></div>
      <button className="meg-logout" onClick={onLogout}><span><Icon name="logout" /></span><b>Sair</b></button>
    </aside>
    <button className="meg-sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />
    <main className="meg-main">
      <header className="meg-topbar">
        <div className="meg-top-context"><button className="meg-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button><div><strong>{title}</strong><small>{subtitle}</small></div></div>
        <div className="meg-top-actions">
          <div className="meg-period-wrap"><button className="meg-icon-action" onClick={() => setPeriodOpen((value) => !value)} aria-expanded={periodOpen} aria-label="Selecionar período" title="Selecionar período"><Icon name="calendar" /></button>{periodOpen && <form className="meg-period-popover" onSubmit={(event) => { event.preventDefault(); setGlobalPeriod({ mode: draftMode, month: draftMonth, start: draftStart, end: draftEnd }); setPeriodOpen(false); }}><strong>Período global</strong><div className="meg-period-modes"><button type="button" className={draftMode === 'month' ? 'active' : ''} onClick={() => setDraftMode('month')}>Mês</button><button type="button" className={draftMode === 'range' ? 'active' : ''} onClick={() => setDraftMode('range')}>Intervalo</button><button type="button" className={draftMode === 'all' ? 'active' : ''} onClick={() => setDraftMode('all')}>Tudo</button></div>{draftMode === 'month' && <label>Mês e ano<input type="month" value={draftMonth} onChange={(event) => setDraftMonth(event.target.value)} required /></label>}{draftMode === 'range' && <div className="meg-period-range"><label>Data inicial<input type="date" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} required /></label><label>Data final<input type="date" value={draftEnd} min={draftStart} onChange={(event) => setDraftEnd(event.target.value)} required /></label></div>}{draftMode === 'all' && <p className="meg-period-all">Exibir todo o histórico disponível.</p>}<button className="meg-period-apply" type="submit">Aplicar período</button></form>}<span className="meg-period-active">{periodMode === 'month' ? new Date(`${selectedMonth}-02T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '') : periodMode === 'range' ? 'Intervalo' : 'Tudo'}</span></div>
          <button className="meg-icon-action meg-add" onClick={onNewTransaction} aria-label="Novo lançamento" title="Novo lançamento"><Icon name="plus" /></button>
          <span className="meg-sync"><i />Dados sincronizados</span>
          <button className="meg-icon-action" onClick={toggleTheme} aria-label="Alternar tema" title="Alternar tema"><Icon name="theme" /></button>
          <button className="meg-user-avatar" aria-label={`Usuário conectado: ${session?.user.name || 'Usuário'}`} title={session?.user.name}>{initial}</button>
        </div>
      </header>
      <div className="meg-page-content">{children}</div>
    </main>
    <nav className="meg-mobile-dock" aria-label="Navegação móvel">
      {primaryNav.slice(0, 2).map(navButton)}
      <button className="dock-add" onClick={onNewTransaction} aria-label="Novo lançamento"><span><Icon name="plus" /></span><b>Lançar</b></button>
      {primaryNav.slice(2, 4).map(navButton)}
      <button onClick={() => setMobileOpen(true)}><span><Icon name="more" /></span><b>Mais</b></button>
    </nav>
  </div>;
}
