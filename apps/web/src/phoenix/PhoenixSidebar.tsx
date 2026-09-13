import type { PhoenixRoute } from './PhoenixCommandPalette';
import { PhoenixNavIcon, type PhoenixNavigationIcon } from './PhoenixNavIcon';

type SidebarItem = {
  id: PhoenixRoute;
  label: string;
  icon: PhoenixNavigationIcon;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

const sections: SidebarSection[] = [
  {
    label: 'Principal',
    items: [
      { id: 'home', label: 'Início', icon: 'home' },
      { id: 'movements', label: 'Lançamentos', icon: 'movements' },
      { id: 'history', label: 'Histórico', icon: 'history' },
      { id: 'payables', label: 'Pendentes', icon: 'payables' },
      { id: 'cards', label: 'Cartões', icon: 'cards' }
    ]
  },
  {
    label: 'Gestão',
    items: [
      { id: 'catalogs', label: 'Cadastros', icon: 'catalogs' },
      { id: 'users', label: 'Usuários e permissões', icon: 'users' },
      { id: 'receivables', label: 'Contas a receber', icon: 'receivables' },
      { id: 'revenues', label: 'Receitas', icon: 'revenues' },
      { id: 'cashflow', label: 'Fluxo de caixa', icon: 'cashflow' }
    ]
  },
  {
    label: 'Inteligência',
    items: [
      { id: 'reconcile', label: 'Conciliação', icon: 'reconcile' },
      { id: 'analytics', label: 'Análises', icon: 'analytics' },
      { id: 'budgets', label: 'Orçamentos e metas', icon: 'budgets' }
    ]
  },
  {
    label: 'Sistema',
    items: [
      { id: 'settings', label: 'Configurações', icon: 'settings' }
    ]
  }
];

export const phoenixSidebarViews = sections.flatMap((section) => section.items);

export function PhoenixSidebar({
  view,
  collapsed,
  pendingCount,
  userName,
  userRole,
  onNavigate,
  onSearch,
  onLogout
}: {
  view: PhoenixRoute;
  collapsed: boolean;
  pendingCount: number;
  userName: string;
  userRole: string;
  onNavigate: (view: PhoenixRoute) => void;
  onSearch: () => void;
  onLogout?: () => void;
}) {
  const initial = (userName || 'M').slice(0, 1).toUpperCase();

  return <aside className="px-sidebar" aria-label="Menu Lateral MEG">
    <div className="px-side-brand"><img src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" /></div>
    <button className="px-search-command" type="button" title={collapsed ? 'Buscar no MEG' : undefined} aria-label="Buscar no MEG" onClick={onSearch}>⌘ Buscar no MEG</button>

    <nav className="px-nav-group" aria-label="Módulos do MEG">
      {sections.map((section) => <section className="px-side-section" key={section.label} aria-label={section.label}>
        <div className="px-side-section-label">{section.label}</div>
        {section.items.map((item) => <button
          key={item.id}
          className={`px-nav-btn ${view === item.id ? 'active' : ''}`}
          type="button"
          title={collapsed ? item.label : undefined}
          aria-label={item.label}
          onClick={() => onNavigate(item.id)}
        >
          <span className="px-nav-icon"><PhoenixNavIcon name={item.icon} /></span>
          <span className="px-nav-text">{item.label}</span>
          {item.id === 'payables' && pendingCount > 0 ? <span className="px-side-badge" aria-label={`${pendingCount} pendência(s)`}>{pendingCount > 99 ? '99+' : pendingCount}</span> : null}
        </button>)}
      </section>)}
    </nav>

    <div className="px-side-footer">
      <div className="px-side-user" title={collapsed ? `${userName} · Perfil ${userRole}` : undefined}>
        <span className="px-side-user-avatar">{initial}</span>
        <div><strong>{userName || 'MEG'}</strong><small>Perfil {userRole || '—'}</small></div>
      </div>
      <button className="px-side-exit" type="button" title={collapsed ? 'Sair' : undefined} aria-label="Sair" onClick={onLogout}>
        <span className="px-nav-icon"><PhoenixNavIcon name="logout" /></span><strong>Sair</strong>
      </button>
    </div>
  </aside>;
}
