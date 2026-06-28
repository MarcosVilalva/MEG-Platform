import type { ReactNode } from 'react';
import { useAppStore } from '../app/store';
import { FinancialControlBar } from './FinancialControlBar';

interface AppShellProps {
  active: string;
  onNavigate: (view: string) => void;
  onOpenCommand: () => void;
  children: ReactNode;
}

const navItems = [
  ['decision', 'Decision Center', '◆'],
  ['dashboard', 'Cockpit Financeiro', '⌂'],
  ['transactions', 'Movimentações', '▦'],
  ['analytics', 'Inteligência', '⌁'],
  ['cashflow', 'Fluxo', '↔'],
  ['platform', 'Platform', '◈'],
  ['settings', 'Configurações', '⚙']
];

export function AppShell({ active, onNavigate, onOpenCommand, children }: AppShellProps) {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return (
    <div className={`app-shell ${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MEG</strong>
            <small>Financial OS</small>
          </div>
        </div>

        <button className="command-trigger" onClick={onOpenCommand}>⌘ Buscar ou comando</button>

        <nav>
          {navItems.map(([id, label, icon]) => (
            <button
              key={id}
              className={active === id ? 'active' : ''}
              onClick={() => onNavigate(id)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Alpha 0.2</span>
          <small>Core + UX Sprint</small>
          <button onClick={toggleTheme}>Alternar tema</button>
        </div>
      </aside>

      <main className="content"><FinancialControlBar />{children}</main>
    </div>
  );
}
