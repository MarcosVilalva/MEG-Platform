import { WebNextIcon, type WebNextIconName } from './WebNextIcon';

export type WebNextRoute =
  | 'home' | 'movements' | 'history' | 'payables' | 'cards'
  | 'catalogs' | 'receivables' | 'cashflow'
  | 'analytics' | 'budgets' | 'reports' | 'settings';

type NavItem = { id: WebNextRoute; label: string; icon: WebNextIconName };
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  { label: 'Principal', items: [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'movements', label: 'Lançamentos', icon: 'movements' },
    { id: 'history', label: 'Histórico', icon: 'history' },
    { id: 'payables', label: 'Pendentes', icon: 'payables' },
    { id: 'cards', label: 'Cartões', icon: 'cards' },
  ]},
  { label: 'Gestão', items: [
    { id: 'catalogs', label: 'Cadastros', icon: 'catalogs' },
    { id: 'receivables', label: 'Contas a receber', icon: 'receivables' },
    { id: 'cashflow', label: 'Fluxo de caixa', icon: 'cashflow' },
  ]},
  { label: 'Inteligência', items: [
    { id: 'analytics', label: 'Análises', icon: 'analytics' },
    { id: 'budgets', label: 'Orçamentos e metas', icon: 'budgets' },
    { id: 'reports', label: 'Relatórios', icon: 'reports' },
  ]},
  { label: 'Sistema', items: [
    { id: 'settings', label: 'Configurações', icon: 'settings' },
  ]},
];

export function WebNextSidebar({
  route,
  collapsed,
  pendingCount,
  onNavigate,
  onSearch,
  onLogout,
}: {
  route: WebNextRoute;
  collapsed: boolean;
  pendingCount: number;
  onNavigate: (route: WebNextRoute) => void;
  onSearch: () => void;
  onLogout: () => void;
}) {
  return <aside className="mnx-sidebar" aria-label="Menu principal">
    <div className="mnx-brand">
      <span className="mnx-brand-mark" aria-hidden="true">M</span>
      <span className="mnx-brand-copy"><strong>MEG</strong><small>FINANCE SYSTEM</small></span>
    </div>

    <button className="mnx-search" type="button" onClick={onSearch}>
      <WebNextIcon name="search" aria-hidden="true" />
      <span>Buscar no MEG</span>
      <kbd>⌘K</kbd>
    </button>

    <nav className="mnx-nav">
      {sections.map((section) => <section className="mnx-nav-section" key={section.label}>
        <span className="mnx-nav-label">{section.label}</span>
        {section.items.map((item) => <button
          className={`mnx-nav-item ${route === item.id ? 'is-active' : ''}`}
          type="button"
          key={item.id}
          title={collapsed ? item.label : undefined}
          aria-current={route === item.id ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="mnx-nav-icon"><WebNextIcon name={item.icon} aria-hidden="true" /></span>
          <span className="mnx-nav-text">{item.label}</span>
          {item.id === 'payables' && pendingCount > 0 ? <b className="mnx-nav-badge">{pendingCount > 99 ? '99+' : pendingCount}</b> : null}
        </button>)}
      </section>)}
    </nav>

    <footer className="mnx-side-footer">
      <div className="mnx-environment"><i /><span><strong>Ambiente financeiro</strong><small>Sincronização protegida</small></span></div>
      <button className="mnx-logout" type="button" onClick={onLogout}><WebNextIcon name="logout" aria-hidden="true" /><span>Sair</span></button>
    </footer>
  </aside>;
}
