import { type ReactNode, useState } from 'react';
import { WebNextSidebar, type WebNextRoute } from '../components/WebNextSidebar';
import { WebNextTopbar } from '../components/WebNextTopbar';
import '../styles/tokens.css';
import '../styles/shell.css';

export function WebNextShell({
  route,
  userName,
  periodLabel,
  pendingCount = 0,
  children,
  onNavigate,
  onSearch,
  onPeriod,
  onProfile,
  onLogout,
}: {
  route: WebNextRoute;
  userName: string;
  periodLabel: string;
  pendingCount?: number;
  children: ReactNode;
  onNavigate: (route: WebNextRoute) => void;
  onSearch: () => void;
  onPeriod: () => void;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return <div className={`meg-next-root ${collapsed ? 'is-sidebar-collapsed' : ''}`} data-web-next="shell" data-web-next-route={route}>
    <WebNextSidebar
      route={route}
      collapsed={collapsed}
      pendingCount={pendingCount}
      onNavigate={onNavigate}
      onSearch={onSearch}
      onLogout={onLogout}
    />
    <main className="mnx-main">
      <WebNextTopbar
        userName={userName}
        periodLabel={periodLabel}
        pendingCount={pendingCount}
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((value) => !value)}
        onSearch={onSearch}
        onPeriod={onPeriod}
        onPayables={() => onNavigate('payables')}
        onProfile={onProfile}
      />
      <div className="mnx-content" data-web-next-content>
        {children}
      </div>
    </main>
  </div>;
}
