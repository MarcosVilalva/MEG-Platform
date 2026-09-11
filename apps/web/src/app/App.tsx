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
import { DecisionCenter } from '../modules/decision/DecisionCenter';
import { FinancialCatalogs } from '../modules/catalogs/FinancialCatalogs';
import { UserManagement } from '../modules/admin/UserManagement';
import { History } from '../modules/history/History';
import { Revenues } from '../modules/revenues/Revenues';
import { Reconciliation } from '../modules/reconcile/Reconciliation';
import { BudgetPanel } from '../modules/analytics/BudgetPanel';
import { CommandPalette } from './CommandPalette';
import { useAppStore } from './store';
import { invalidateAuthenticatedCache, prefetchAuthenticatedData } from './auth-client';
import { readCloudState } from './app-state-client';

interface AppProps { onLogout: () => void; }

export function App({ onLogout }: AppProps) {
  const [view, setView] = useState('dashboard');
  const [commandOpen, setCommandOpen] = useState(false);
  const theme = useAppStore((state) => state.theme);
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const replaceTransactions = useAppStore((state) => state.replaceTransactions);

  function openNewTransaction() {
    setView('transactions');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('meg:open-transaction')), 0);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;
    const synchronize = (fresh = false) => { if (fresh) invalidateAuthenticatedCache('/app-state'); return void readCloudState().then((result) => { if (active) replaceTransactions(result.state.transactions); }).catch(() => undefined); };
    void prefetchAuthenticatedData(selectedMonth).then(() => synchronize());
    const timer = window.setInterval(() => synchronize(true), 15_000);
    const refresh = () => { if (document.visibilityState === 'visible') synchronize(true); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [selectedMonth, replaceTransactions]);

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
      <AppShell active={view} onNavigate={setView} onOpenCommand={() => setCommandOpen(true)} onLogout={onLogout} onNewTransaction={openNewTransaction}>
        {view === 'decision' && <DecisionCenter onNavigate={setView} />}
        {view === 'dashboard' && <Dashboard />}
        {view === 'transactions' && <PersistentTransactions />}
        {view === 'history' && <History />}
        {view === 'receivables' && <Receivables />}
        {view === 'revenues' && <Revenues />}
        {view === 'cards' && <CreditCards />}
        {view === 'payables' && <Payables />}
        {view === 'catalogs' && <FinancialCatalogs />}
        {view === 'users' && <UserManagement />}
        {view === 'analytics' && <Analytics />}
        {view === 'cashflow' && <Cashflow />}
        {view === 'reconcile' && <Reconciliation />}
        {view === 'budgets' && <section className="meg-screen"><header className="screen-heading"><div><span>ORÇAMENTOS E METAS</span><h1>Planejamento</h1><p>Orçamento por competência e categoria, preservando os dados reais.</p></div></header><BudgetPanel /></section>}
        {view === 'settings' && <Settings />}
      </AppShell>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={setView} onNewTransaction={openNewTransaction} />
    </>
  );
}
