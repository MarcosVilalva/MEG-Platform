import { type ReactNode, useState } from 'react';
import { WebNextSidebar, type WebNextRoute } from '../components/WebNextSidebar';
import { WebNextTopbar } from '../components/WebNextTopbar';
import { WebNextConfirm } from '../components/WebNextModal';
import { WebNextLaunchSelector, type WebNextLaunchPreset } from '../components/WebNextLaunchSelector';
import '../styles/tokens.css';
import '../styles/shell.css';

export function WebNextShell({
  route,
  userName,
  brandSrc,
  periodLabel,
  pendingCount = 0,
  children,
  onNavigate,
  onSearch,
  onLaunch,
  onPeriod,
  onProfile,
  onLogout,
}: {
  route: WebNextRoute;
  userName: string;
  brandSrc?: string;
  periodLabel: string;
  pendingCount?: number;
  children: ReactNode;
  onNavigate: (route: WebNextRoute) => void;
  onSearch: () => void;
  onLaunch: (preset: WebNextLaunchPreset) => void;
  onPeriod: () => void;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [launchSelectorOpen, setLaunchSelectorOpen] = useState(false);

  return <div className={`meg-next-root ${collapsed ? 'is-sidebar-collapsed' : ''}`} data-web-next="shell" data-web-next-route={route}>
    <WebNextSidebar
      route={route}
      collapsed={collapsed}
      pendingCount={pendingCount}
      brandSrc={brandSrc}
      onNavigate={onNavigate}
      onCollapse={() => setCollapsed(true)}
      onLogout={() => setLogoutConfirmOpen(true)}
    />
    <main className="mnx-main">
      <WebNextTopbar
        userName={userName}
        periodLabel={periodLabel}
        pendingCount={pendingCount}
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((value) => !value)}
        onSearch={onSearch}
        onAdd={() => setLaunchSelectorOpen(true)}
        onPeriod={onPeriod}
        onPayables={() => onNavigate('payables')}
        onProfile={onProfile}
      />
      <div className="mnx-content" data-web-next-content>
        {children}
      </div>
    </main>
    <WebNextLaunchSelector
      open={launchSelectorOpen}
      onClose={() => setLaunchSelectorOpen(false)}
      onSelect={onLaunch}
    />
    <WebNextConfirm
      open={logoutConfirmOpen}
      title="Deseja sair do MEG?"
      message="Sua sessão será encerrada neste navegador. Seus dados financeiros permanecem protegidos."
      confirmLabel="Sim, sair"
      cancelLabel="Continuar no MEG"
      tone="danger"
      onCancel={() => setLogoutConfirmOpen(false)}
      onConfirm={() => { setLogoutConfirmOpen(false); onLogout(); }}
    />
  </div>;
}
