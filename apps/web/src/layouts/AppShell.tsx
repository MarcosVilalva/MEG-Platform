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

const primaryNav = [
  ['dashboard', 'Início', '⌂'], ['transactions', 'Lançamentos', '▦'], ['history', 'Histórico', '◷'],
  ['payables', 'Pendentes', '◷'], ['cards', 'Cartões', '▣'], ['catalogs', 'Cadastros', '≡'],
  ['users', 'Usuários e permissões', '♙'], ['settings', 'Configurações', '⚙']
] as const;

const secondaryNav = [
  ['receivables', 'Contas a receber', '◫'], ['analytics', 'Análises', '⌁'],
  ['cashflow', 'Fluxo de caixa', '↔'], ['decision', 'Decisões', '◆'], ['platform', 'Gestão comercial', '◈']
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
  decision: ['Decisões', 'Prioridades da sua vida financeira'],
  platform: ['Gestão comercial', 'Administração da plataforma']
};

export function AppShell({ active, onNavigate, onOpenCommand, onLogout, onNewTransaction, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('meg-sidebar-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth);
  const session = readSession();
  const [title, subtitle] = pageCopy[active] || ['MEG', 'Meu Equilíbrio Gerencial'];
  const initial = session?.user.name?.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() || 'U';

  useEffect(() => localStorage.setItem('meg-sidebar-collapsed', collapsed ? '1' : '0'), [collapsed]);
  const navigate = (id: string) => { onNavigate(id); setMobileOpen(false); };
  const navButton = ([id, label, icon]: readonly [string, string, string]) => {
    if (id === 'users' && session?.user.role !== 'ADMIN') return null;
    return <button key={id} className={active === id ? 'active' : ''} onClick={() => navigate(id)} title={collapsed ? label : undefined}><span aria-hidden="true">{icon}</span><b>{label}</b></button>;
  };

  return <div className={`meg-app ${theme} ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-menu-open' : ''}`}>
    <aside className="meg-sidebar" aria-label="Menu principal">
      <div className="meg-side-brand"><img src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" /><button onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} title={collapsed ? 'Expandir menu' : 'Recolher menu'}>‹</button></div>
      <button className="meg-search" onClick={onOpenCommand} title="Buscar no MEG"><span>⌘</span><b>Buscar no MEG</b></button>
      <nav className="meg-nav">{primaryNav.map(navButton)}</nav>
      <div className="meg-side-more"><button onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen}><span>＋</span><b>Web completo</b></button>{moreOpen && <nav>{secondaryNav.map(navButton)}</nav>}</div>
      <div className="meg-side-user"><span>{initial}</span><div><strong>{session?.user.name || 'Usuário'}</strong><small>Perfil {session?.user.role || 'MEG'}</small></div></div>
      <button className="meg-logout" onClick={onLogout}><span>↪</span><b>Sair</b></button>
    </aside>
    <button className="meg-sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />
    <main className="meg-main">
      <header className="meg-topbar">
        <div className="meg-top-context"><button className="meg-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">☰</button><div><strong>{title}</strong><small>{subtitle}</small></div></div>
        <div className="meg-top-actions">
          <div className="meg-period-wrap"><button className="meg-icon-action" onClick={() => setPeriodOpen((value) => !value)} aria-expanded={periodOpen} aria-label="Selecionar período" title="Selecionar período">▣</button>{periodOpen && <div className="meg-period-popover"><strong>Período global</strong><label>Mês e ano<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label><button onClick={() => setPeriodOpen(false)}>Aplicar período</button></div>}</div>
          <button className="meg-icon-action meg-add" onClick={onNewTransaction} aria-label="Novo lançamento" title="Novo lançamento">＋</button>
          <span className="meg-sync"><i />Dados sincronizados</span>
          <button className="meg-icon-action" onClick={toggleTheme} aria-label="Alternar tema" title="Alternar tema">◐</button>
          <button className="meg-user-avatar" aria-label={`Usuário conectado: ${session?.user.name || 'Usuário'}`} title={session?.user.name}>{initial}</button>
        </div>
      </header>
      <div className="meg-page-content">{children}</div>
    </main>
    <nav className="meg-mobile-dock" aria-label="Navegação móvel">
      {primaryNav.slice(0, 2).map(navButton)}
      <button className="dock-add" onClick={onNewTransaction} aria-label="Novo lançamento"><span>＋</span><b>Lançar</b></button>
      {primaryNav.slice(2, 4).map(navButton)}
      <button onClick={() => setMobileOpen(true)}><span>•••</span><b>Mais</b></button>
    </nav>
  </div>;
}
