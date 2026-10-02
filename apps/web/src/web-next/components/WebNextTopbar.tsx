import { WebNextIcon } from './WebNextIcon';

export function WebNextTopbar({
  userName,
  periodLabel,
  pendingCount,
  collapsed,
  onToggleSidebar,
  onSearch,
  onPeriod,
  onPayables,
  onProfile,
}: {
  userName: string;
  periodLabel: string;
  pendingCount: number;
  collapsed: boolean;
  onToggleSidebar: () => void;
  onSearch: () => void;
  onPeriod: () => void;
  onPayables: () => void;
  onProfile: () => void;
}) {
  const firstName = userName.trim().split(/\s+/)[0] || 'MEG';
  const initial = firstName.slice(0, 1).toUpperCase();

  return <header className="mnx-topbar">
    <div className="mnx-topbar-intro">
      <button className="mnx-icon-button mnx-sidebar-toggle" type="button" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} onClick={onToggleSidebar}>
        <WebNextIcon name="menu" aria-hidden="true" />
      </button>
      <div className="mnx-greeting"><small>MEG FINANÇAS</small><strong>Olá, {firstName}!</strong><span>Aqui está o resumo da sua vida financeira.</span></div>
    </div>

    <div className="mnx-topbar-actions">
      <button className="mnx-icon-button" type="button" aria-label="Buscar" onClick={onSearch}><WebNextIcon name="search" aria-hidden="true" /></button>
      <button className="mnx-icon-button mnx-alert-button" type="button" aria-label="Pendências" onClick={onPayables}>
        <WebNextIcon name="bell" aria-hidden="true" />
        {pendingCount > 0 ? <b>{pendingCount > 99 ? '99+' : pendingCount}</b> : null}
      </button>
      <button className="mnx-period" type="button" onClick={onPeriod}><WebNextIcon name="calendar" aria-hidden="true" /><strong>{periodLabel}</strong><WebNextIcon name="chevron" aria-hidden="true" /></button>
      <button className="mnx-profile" type="button" onClick={onProfile}><span>{initial}</span><strong>{firstName}</strong></button>
    </div>
  </header>;
}
