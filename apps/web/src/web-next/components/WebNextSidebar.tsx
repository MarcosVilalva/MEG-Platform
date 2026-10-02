import { WebNextIcon, type WebNextIconName } from './WebNextIcon';

export type WebNextRoute =
  | 'home' | 'movements' | 'history' | 'payables' | 'cards'
  | 'catalogs' | 'receivables' | 'cashflow'
  | 'analytics' | 'budgets' | 'reports' | 'settings';

type NavItem = { key: string; id: WebNextRoute; label: string; caption: string; icon: WebNextIconName };
type NavSection = { key: string; label: string; items: NavItem[] };

const sections: NavSection[] = [
  { key: 'principal', label: 'Visão financeira', items: [
    { key: 'home', id: 'home', label: 'Início', caption: 'Resumo e prioridades', icon: 'home' },
    { key: 'movements', id: 'movements', label: 'Lançamentos', caption: 'Receitas e despesas', icon: 'movements' },
    { key: 'cards', id: 'cards', label: 'Cartões', caption: 'Faturas e limites', icon: 'cards' },
    { key: 'planning', id: 'budgets', label: 'Planejamento', caption: 'Orçamento do período', icon: 'budgets' },
    { key: 'reports', id: 'reports', label: 'Relatórios', caption: 'Leitura gerencial', icon: 'reports' },
  ]},
  { key: 'finance', label: 'Organização', items: [
    { key: 'categories', id: 'catalogs', label: 'Categorias', caption: 'Classificação financeira', icon: 'catalogs' },
    { key: 'goals', id: 'budgets', label: 'Metas', caption: 'Objetivos e progresso', icon: 'analytics' },
    { key: 'accounts', id: 'catalogs', label: 'Contas', caption: 'Carteira financeira', icon: 'receivables' },
    { key: 'payables', id: 'payables', label: 'Pendências', caption: 'O que exige atenção', icon: 'payables' },
    { key: 'settings', id: 'settings', label: 'Configurações', caption: 'Preferências do MEG', icon: 'settings' },
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
  const isActive = (item: NavItem) => item.key === 'home' ? route === 'home' : route === item.id;

  return <aside className="mnx-sidebar" aria-label="Menu principal">
    <div className="mnx-brand">
      <span className="mnx-brand-mark" aria-hidden="true">{brandSrc ? <img src={brandSrc} alt="" /> : 'M'}</span>
      <span className="mnx-brand-copy"><strong>MEG</strong><small>FINANCE SYSTEM</small></span>
      {!collapsed ? <i className="mnx-brand-live" title="Sistema online" aria-label="Sistema online" /> : null}
    </div>

    <div className="mnx-sidebar-status" aria-hidden={collapsed}>
      <span><i /> VISÃO FINANCEIRA ATIVA</span>
      <small>Seu painel está sincronizado</small>
    </div>

    <nav className="mnx-nav">
      {sections.map((section) => <section className="mnx-nav-section" key={section.key}>
        <span className="mnx-nav-section-label">{section.label}</span>
        {section.items.map((item) => <button
          className={`mnx-nav-item ${isActive(item) ? 'is-active' : ''}`}
          type="button"
          key={item.key}
          title={collapsed ? `${item.label} · ${item.caption}` : undefined}
          aria-current={isActive(item) ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="mnx-nav-icon"><WebNextIcon name={item.icon} aria-hidden="true" /></span>
          <span className="mnx-nav-copy"><strong>{item.label}</strong><small>{item.caption}</small></span>
          {item.key === 'payables' && pendingCount > 0 ? <span className="mnx-nav-badge">{pendingCount > 99 ? '99+' : pendingCount}</span> : null}
          {isActive(item) ? <span className="mnx-nav-active-dot" aria-hidden="true" /> : null}
        </button>)}
      </section>)}
    </nav>

    <footer className="mnx-side-footer">
      {!collapsed ? <button className="mnx-collapse-hint" type="button" onClick={onCollapse}><span>«</span><strong>Recolher menu</strong></button> : null}
      <div className="mnx-environment"><i /><span><strong>Ambiente financeiro</strong><small>Protegido e sincronizado</small></span></div>
      <button className="mnx-logout" type="button" onClick={onLogout}><WebNextIcon name="logout" aria-hidden="true" /><span>Sair com segurança</span></button>
    </footer>
  </aside>;
}
