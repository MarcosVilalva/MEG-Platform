import type { ReactNode } from 'react';
import { useAppStore } from '../app/store';
import { readSession } from '../app/auth-client';
import { FinancialControlBar } from './FinancialControlBar';

interface AppShellProps {
  active: string;
  onNavigate: (view: string) => void;
  onOpenCommand: () => void;
  onLogout: () => void;
  children: ReactNode;
}

const baseNavItems = [
  ['decision', 'Decision Center', '◆'],
  ['dashboard', 'Cockpit Financeiro', '⌂'],
  ['transactions', 'Movimentações', '▦'],
  ['receivables', 'Contas a Receber', '◫'],
  ['payables', 'Contas a Pagar', '▤'],
  ['cards', 'Cartões de Crédito', '▣'],
  ['catalogs', 'Cadastros', '▤'],
  ['analytics', 'Inteligência', '⌁'],
  ['cashflow', 'Fluxo', '↔'],
  ['platform', 'Platform', '◈'],
  ['settings', 'Configurações', '⚙']
];

export function AppShell({ active, onNavigate, onOpenCommand, onLogout, children }: AppShellProps) {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const session = readSession();
  const navItems = session?.user.role === 'ADMIN'
    ? [...baseNavItems.slice(0, 5), ['users', 'Usuários e Permissões', '♙'], ...baseNavItems.slice(5)]
    : baseNavItems;

  return (
    <div className={`app-shell ${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div><strong>MEG</strong><small>Financial OS</small></div>
        </div>

        <button className="command-trigger" onClick={onOpenCommand}>⌘ Buscar ou comando</button>

        <nav>
          {navItems.map(([id, label, icon]) => (
            <button key={id} className={active === id ? 'active' : ''} onClick={() => onNavigate(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user"><strong>{session?.user.name}</strong><small>{session?.user.role}</small></div>
          <button onClick={toggleTheme}>Alternar tema</button>
          <button className="sidebar-logout" onClick={onLogout}>Sair com segurança</button>
        </div>
      </aside>

      <main className="content"><FinancialControlBar />{children}</main>
    </div>
  );
}