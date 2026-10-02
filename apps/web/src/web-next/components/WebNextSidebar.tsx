import { WebNextIcon, type WebNextIconName } from './WebNextIcon';

export type WebNextRoute =
  | 'home' | 'movements' | 'history' | 'payables' | 'cards'
  | 'catalogs' | 'receivables' | 'cashflow'
  | 'analytics' | 'budgets' | 'reports' | 'settings';

type NavItem = { key: string; id: WebNextRoute; label: string; icon: WebNextIconName };
type NavSection = { key: string; items: NavItem[] };

const sections: NavSection[] = [
  { key: 'principal', items: [
    { key: 'home', id: 'home', label: 'Início', icon: 'home' },
    { key: 'movements', id: 'movements', label: 'Lançamentos', icon: 'movements' },
    { key: 'cards', id: 'cards', label: 'Cartões', icon: 'cards' },
    { key: 'planning', id: 'budgets', label: 'Planejamento', icon: 'budgets' },
    { key: 'reports', id: 'reports', label: 'Relatórios', icon: 'reports' },
    { key: 'categories', id: 'catalogs', label: 'Categorias', icon: 'catalogs' },
    { key: 'goals', id: 'budgets', label: 'Metas', icon: 'analytics' },
  ]},
  { key: 'finance', items: [
    { key: 'accounts', id: 'catalogs', label: 'Contas', icon: 'receivables' },
    { key: 'payables', id: 'payables', label: 'Pendências', icon: 'payables' },
    { key: 'settings', id: 'settings', label: 'Configurações', icon: 'settings' },
  ]},
];

export function WebNextSidebar({
  route,
  collapsed,
  pendingCount,
  brandSrc,
  onNavigate,
  onCollapse,
  onLogout,
}: {
  route: WebNextRoute;
  collapsed: boolean;
  pendingCount: number;
  brandSrc?: string;
  onNavigate: (route: WebNextRoute) => void;
  onCollapse: () => void;
  onLogout: () => void;
}) {
  return <aside className="mnx-sidebar" aria-label="Menu principal">
    <div className="mnx-brand">
      <span className="mnx-brand-mark" aria-hidden="true">{brandSrc ? <img src={brandSrc} alt="" /> : 'M'}</span>
      <span className="mnx-brand-copy"><strong>MEG</strong><small>FINANCE SYSTEM</small></span>
    </div>

    <nav className="mnx-nav">
      {sections.map((section) => <section className="mnx-nav-section" key={section.key}>
        {section.items.map((item) => <button
          className={`mnx-nav-item ${route === item.id && item.key === 'home' ? 'is-active' : ''}`}
          type="button"
          key={item.key}
          title={collapsed ? item.label : undefined}
          aria-current={route === item.id && item.key === 'home' ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="mnx-nav-icon"><WebNextIcon name={item.icon} aria-hidden="true" /></span>
          <span className="mnx-nav-text">{item.label}</span>
          {item.key === 'payables' && pendingCount > 0 ? <span className="mnx-nav-badge">{pendingCount > 99 ? '99+' : pendingCount}</span> : null}
        </button>)}
      </section>)}
    </nav>

    <footer className="mnx-side-footer">
      {!collapsed ? <button className="mnx-collapse-hint" type="button" onClick={onCollapse}><span>«</span><strong>Recolher menu</strong></button> : null}
      <div className="mnx-environment"><i /><span><strong>Ambiente financeiro</strong><small>Sincronização protegida</small></span></div>
      <button className="mnx-logout" type="button" onClick={onLogout}><WebNextIcon name="logout" aria-hidden="true" /><span>Sair</span></button>
    </footer>
  </aside>;
}
