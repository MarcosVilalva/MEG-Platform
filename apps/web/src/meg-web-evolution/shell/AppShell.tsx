import { useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { IconButton, PrimaryButton } from '../components/primitives';
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

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="meg-evolution-bg meg-shell">
      <aside className={`meg-sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
        <div className="meg-brand" aria-label="MEG Finanças">
          <span className="meg-brand-mark" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
          <span className="meg-brand-copy"><strong>MEG</strong><small>FINANÇAS</small></span>
        </div>

        <nav className="meg-nav">
          {navigation.map(([icon, label], index) => (
            <button key={label} className={`meg-nav-item ${index === 0 ? 'is-active' : ''}`} type="button">
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <PrimaryButton className="meg-new-button" type="button">
          <Icon name="plus" />
          <span>Novo</span>
        </PrimaryButton>
      </aside>

      {drawerOpen && <button className="meg-drawer-scrim" aria-label="Fechar menu" onClick={() => setDrawerOpen(false)} />}

      <div className="meg-shell-body">
        <header className="meg-topbar">
          <IconButton label="Abrir menu" className="meg-menu-button" onClick={() => setDrawerOpen(true)}>
            <Icon name="menu" />
          </IconButton>

          <label className="meg-search">
            <Icon name="search" />
            <span className="sr-only">Buscar</span>
            <input placeholder="Buscar movimentações, contas, cartões, relatórios..." />
          </label>

          <div className="meg-topbar-actions">
            <button type="button" className="meg-period">
              <Icon name="calendar" />
              <span>Outubro de 2026</span>
              <Icon name="chevronDown" />
            </button>

            <IconButton label="Notificações" className="meg-notification">
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
    </div>
  );
}
