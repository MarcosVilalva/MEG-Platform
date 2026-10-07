import { useEffect, useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/primitives';
import './shell.css';

const navigation = [
  ['home', 'Início'],
  ['list', 'Lançamentos'],
  ['card', 'Cartões'],
  ['clock', 'Pendentes'],
  ['gift', 'Benefícios'],
  ['chart', 'Relatórios'],
  ['settings', 'Configurações'],
] as const;

type TooltipPlacement = 'right' | 'bottom';
type TooltipState = { label: string; x: number; y: number; placement: TooltipPlacement } | null;

const SIDEBAR_PREFERENCE_KEY = 'meg-web-evolution:sidebar-collapsed';

function readSidebarPreference() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === 'true';
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarPreferenceCollapsed, setSidebarPreferenceCollapsed] = useState(readSidebarPreference);
  const [isDesktopWide, setIsDesktopWide] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  );
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');

    const syncSidebarState = () => {
      setIsDesktopWide(media.matches);
      setSidebarPreferenceCollapsed(readSidebarPreference());
      setTooltip(null);
    };

    syncSidebarState();

    const handleChange = () => syncSidebarState();
    const handlePageShow = () => syncSidebarState();
    const handleFocus = () => syncSidebarState();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncSidebarState();
    };

    media.addEventListener('change', handleChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      media.removeEventListener('change', handleChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const showTooltip = (
    event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
    label: string,
    placement: TooltipPlacement,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      label,
      placement,
      x: placement === 'right' ? rect.right + 10 : rect.left + rect.width / 2,
      y: placement === 'right' ? rect.top + rect.height / 2 : rect.bottom + 8,
    });
  };

  const hideTooltip = () => setTooltip(null);
  const sidebarCollapsed = isDesktopWide ? sidebarPreferenceCollapsed : true;

  return (
    <div className={`meg-evolution-bg meg-shell ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <div className="meg-sidebar-wrap">
        <aside className={`meg-sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
        <div className="meg-brand" aria-label="MEG Finanças">
          <div className="meg-brand-stack" aria-hidden="true">
            <img
              className="meg-brand-logo meg-brand-logo--expanded"
              src={`${import.meta.env.BASE_URL}brand/logo-meg-financas.svg`}
              alt=""
            />
            <img
              className="meg-brand-logo meg-brand-logo--collapsed"
              src={`${import.meta.env.BASE_URL}brand/logo-meg-financas.svg`}
              alt=""
            />
          </div>
        </div>

        <nav className="meg-nav">
          {navigation.map(([icon, label], index) => (
            <button
              key={label}
              className={`meg-nav-item ${index === 0 ? 'is-active' : ''}`}
              type="button"
              aria-label={label}
              data-tooltip={label}
              onMouseEnter={(event) => sidebarCollapsed && showTooltip(event, label, 'right')}
              onMouseLeave={hideTooltip}
              onFocus={(event) => sidebarCollapsed && showTooltip(event, label, 'right')}
              onBlur={hideTooltip}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__art" aria-hidden="true">
          <svg viewBox="0 0 208 320" role="presentation" focusable="false">
            <defs>
              <linearGradient id="sidebarBarFront" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0fbba9" stopOpacity=".18" />
                <stop offset="100%" stopColor="#18e2c5" stopOpacity=".52" />
              </linearGradient>
              <linearGradient id="sidebarBarSide" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#063d3c" stopOpacity=".44" />
                <stop offset="100%" stopColor="#0b6a63" stopOpacity=".24" />
              </linearGradient>
              <linearGradient id="sidebarBarTop" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3cf7de" stopOpacity=".44" />
                <stop offset="100%" stopColor="#0b7f75" stopOpacity=".16" />
              </linearGradient>
              <linearGradient id="sidebarArc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#14e3c8" stopOpacity=".16" />
                <stop offset="45%" stopColor="#37f2db" stopOpacity=".72" />
                <stop offset="100%" stopColor="#14e3c8" stopOpacity=".20" />
              </linearGradient>
              <linearGradient id="sidebarFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="26%" stopColor="white" stopOpacity=".35" />
                <stop offset="48%" stopColor="white" stopOpacity=".82" />
                <stop offset="100%" stopColor="white" stopOpacity="1" />
              </linearGradient>
              <mask id="sidebarFadeMask">
                <rect width="208" height="320" fill="url(#sidebarFade)" />
              </mask>
            </defs>

            <g mask="url(#sidebarFadeMask)">
              <g transform="translate(27 0)">
                <polygon points="15,258 31,244 31,320 15,320" fill="url(#sidebarBarFront)" />
                <polygon points="31,244 37,238 37,314 31,320" fill="url(#sidebarBarSide)" />
                <polygon points="15,258 21,252 37,238 31,244" fill="url(#sidebarBarTop)" />

                <polygon points="52,218 68,202 68,320 52,320" fill="url(#sidebarBarFront)" />
                <polygon points="68,202 75,195 75,313 68,320" fill="url(#sidebarBarSide)" />
                <polygon points="52,218 59,211 75,195 68,202" fill="url(#sidebarBarTop)" />

                <polygon points="91,157 108,140 108,320 91,320" fill="url(#sidebarBarFront)" />
                <polygon points="108,140 115,132 115,312 108,320" fill="url(#sidebarBarSide)" />
                <polygon points="91,157 98,149 115,132 108,140" fill="url(#sidebarBarTop)" />

                <polygon points="132,91 149,73 149,320 132,320" fill="url(#sidebarBarFront)" />
                <polygon points="149,73 157,65 157,312 149,320" fill="url(#sidebarBarSide)" />
                <polygon points="132,91 140,83 157,65 149,73" fill="url(#sidebarBarTop)" />
              </g>

              <path
                d="M-28 238 C 20 198, 70 176, 122 176 C 155 176, 187 184, 236 210"
                fill="none"
                stroke="url(#sidebarArc)"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <path
                d="M-24 242 C 24 202, 72 181, 123 181 C 158 181, 190 189, 238 214"
                fill="none"
                stroke="#12a99a"
                strokeOpacity=".12"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        <div className="meg-sidebar-footer">
          <button
            type="button"
            className="meg-nav-item meg-logout-button"
            aria-label="Sair"
            data-tooltip="Sair"
            onMouseEnter={(event) => sidebarCollapsed && showTooltip(event, 'Sair', 'right')}
            onMouseLeave={hideTooltip}
            onFocus={(event) => sidebarCollapsed && showTooltip(event, 'Sair', 'right')}
            onBlur={hideTooltip}
          >
            <Icon name="logOut" width={20} height={20} strokeWidth={1.75} />
            <span>Sair</span>
          </button>
        </div>

        </aside>
      </div>

      {drawerOpen && <button className="meg-drawer-scrim" aria-label="Fechar menu" onClick={() => setDrawerOpen(false)} />}

      <div className="meg-shell-body">
        <header className="meg-topbar">
          <IconButton label="Abrir menu" className="meg-menu-button" onClick={() => setDrawerOpen(true)}>
            <Icon name="menu" />
          </IconButton>

          <div className="meg-topbar-launchers" aria-label="Ações rápidas">
            <button
              type="button"
              className="meg-topbar-launcher meg-sidebar-toggle-topbar"
              aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!sidebarCollapsed}
              aria-hidden={!isDesktopWide}
              tabIndex={isDesktopWide ? 0 : -1}
              data-tooltip={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              onMouseEnter={(event) => isDesktopWide && showTooltip(event, sidebarCollapsed ? 'Expandir menu' : 'Recolher menu', 'bottom')}
              onMouseLeave={hideTooltip}
              onFocus={(event) => isDesktopWide && showTooltip(event, sidebarCollapsed ? 'Expandir menu' : 'Recolher menu', 'bottom')}
              onBlur={hideTooltip}
              onClick={() => {
                if (!isDesktopWide) return;
                hideTooltip();
                setSidebarPreferenceCollapsed((value) => {
                  const nextValue = !value;
                  window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(nextValue));
                  return nextValue;
                });
              }}
            >
              <Icon
                name={sidebarCollapsed ? 'chevronsRight' : 'chevronsLeft'}
                width={18}
                height={18}
                strokeWidth={1.75}
              />
            </button>

            <button
              type="button"
              className="meg-topbar-launcher meg-topbar-new"
              aria-label="Novo lançamento"
              data-tooltip="Novo lançamento"
              onMouseEnter={(event) => showTooltip(event, 'Novo lançamento', 'bottom')}
              onMouseLeave={hideTooltip}
              onFocus={(event) => showTooltip(event, 'Novo lançamento', 'bottom')}
              onBlur={hideTooltip}
            >
              <Icon name="plus" width={22} height={22} strokeWidth={1.85} />
            </button>
          </div>

          <label className="meg-search">
            <Icon name="search" />
            <span className="sr-only">Buscar</span>
            <input aria-label="Buscar" placeholder="Buscar movimentações, contas, cartões, relatórios..." />
          </label>

          <div className="meg-topbar-actions">
            <button type="button" className="meg-period">
              <Icon name="calendar" />
              <span>Outubro&nbsp;de&nbsp;2026</span>
              <Icon name="chevronDown" />
            </button>

            <IconButton
              label="Notificações"
              className="meg-notification"
              data-tooltip="Notificações"
              onMouseEnter={(event) => showTooltip(event, 'Notificações', 'bottom')}
              onMouseLeave={hideTooltip}
              onFocus={(event) => showTooltip(event, 'Notificações', 'bottom')}
              onBlur={hideTooltip}
            >
              <Icon name="bell" />
              <span className="meg-notification-dot" aria-hidden="true" />
            </IconButton>

            <button type="button" className="meg-profile">
              <span className="meg-avatar">MV</span>
              <span className="meg-profile-name">Marcos de Andrade Vilalva</span>
              <Icon name="chevronDown" />
            </button>
          </div>
        </header>

        <main className="meg-main">{children}</main>
      </div>

      {tooltip && createPortal(
        <div
          className={`meg-global-tooltip is-${tooltip.placement}`}
          role="tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.label}
        </div>,
        document.body,
      )}
    </div>
  );
}
