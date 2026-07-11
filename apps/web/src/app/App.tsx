import { useEffect, useState } from 'react';
import { AppShell } from '../layouts/AppShell';
import { Dashboard } from '../modules/dashboard/Dashboard';
import { PersistentTransactions } from '../modules/transactions/PersistentTransactions';
import { Receivables } from '../modules/receivables/Receivables';
import { CreditCards } from '../modules/cards/CreditCards';
import { Payables } from '../modules/payables/Payables';
import { Analytics } from '../modules/analytics/Analytics';
import { Cashflow } from '../modules/cashflow/Cashflow';
import { Settings } from '../modules/settings/Settings';
import { Platform } from '../modules/platform/Platform';
import { DecisionCenter } from '../modules/decision/DecisionCenter';
import { FinancialCatalogs } from '../modules/catalogs/FinancialCatalogs';
import { UserManagement } from '../modules/admin/UserManagement';
import { CommandPalette } from './CommandPalette';
import { useAppStore } from './store';

interface AppProps { onLogout: () => void; }

export function App({ onLogout }: AppProps) {
  const [view, setView] = useState('dashboard');
  const [commandOpen, setCommandOpen] = useState(false);
  const theme = useAppStore((state) => state.theme);

  function openNewTransaction() {
    setView('transactions');
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        openNewTransaction();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <AppShell active={view} onNavigate={setView} onOpenCommand={() => setCommandOpen(true)} onLogout={onLogout}>
        {view === 'decision' && <DecisionCenter onNavigate={setView} />}
        {view === 'dashboard' && <Dashboard onNewTransaction={openNewTransaction} />}
        {view === 'transactions' && <PersistentTransactions />}
        {view === 'receivables' && <Receivables />}
        {view === 'cards' && <CreditCards />}
        {view === 'payables' && <Payables />}
        {view === 'catalogs' && <FinancialCatalogs />}
        {view === 'users' && <UserManagement />}
        {view === 'analytics' && <Analytics />}
        {view === 'cashflow' && <Cashflow />}
        {view === 'platform' && <Platform />}
        {view === 'settings' && <Settings />}
      </AppShell>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={setView} onNewTransaction={openNewTransaction} />
    </>
  );
}