import { useEffect, useState } from 'react';
import { AppShell } from '../layouts/AppShell';
import { Dashboard } from '../modules/dashboard/Dashboard';
import { Transactions } from '../modules/transactions/Transactions';
import { Analytics } from '../modules/analytics/Analytics';
import { Cashflow } from '../modules/cashflow/Cashflow';
import { Settings } from '../modules/settings/Settings';
import { Platform } from '../modules/platform/Platform';
import { DecisionCenter } from '../modules/decision/DecisionCenter';
import { FinancialCatalogs } from '../modules/catalogs/FinancialCatalogs';
import { UserManagement } from '../modules/admin/UserManagement';
import { TransactionModal } from '../modules/transactions/TransactionModal';
import { CommandPalette } from './CommandPalette';
import { useAppStore } from './store';
import type { LegacyTransaction } from '@core/finance/events';

export function App() {
  const [view, setView] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LegacyTransaction | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const theme = useAppStore((state) => state.theme);

  function openNewTransaction() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditTransaction(transaction: LegacyTransaction) {
    setEditing(transaction);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
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
      <AppShell active={view} onNavigate={setView} onOpenCommand={() => setCommandOpen(true)}>
        {view === 'decision' && <DecisionCenter onNavigate={setView} />}
        {view === 'dashboard' && <Dashboard onNewTransaction={openNewTransaction} />}
        {view === 'transactions' && <Transactions onNewTransaction={openNewTransaction} onEditTransaction={openEditTransaction} />}
        {view === 'catalogs' && <FinancialCatalogs />}
        {view === 'users' && <UserManagement />}
        {view === 'analytics' && <Analytics />}
        {view === 'cashflow' && <Cashflow />}
        {view === 'platform' && <Platform />}
        {view === 'settings' && <Settings />}
      </AppShell>

      <TransactionModal open={modalOpen} editing={editing} onClose={closeModal} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={setView} onNewTransaction={openNewTransaction} />
    </>
  );
}