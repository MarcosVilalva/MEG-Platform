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

type BootState = 'loading' | 'ready' | 'error';

export function App({ onLogout }: AppProps) {
  const [view, setView] = useState('dashboard');
  const [commandOpen, setCommandOpen] = useState(false);
  const [bootState, setBootState] = useState<BootState>('loading');
  const [bootMessage, setBootMessage] = useState('Preparando sua base financeira...');
  const [bootAttempt, setBootAttempt] = useState(0);
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

  /*
   * A V15 só é liberada depois que a fonte compartilhada foi lida de verdade.
   * O prefetch aquece as demais consultas (contas, cartões, resumos, análises),
   * evitando que cada troca de tela repita a mesma espera de rede.
   */
  useEffect(() => {
    let active = true;

    async function boot() {
      setBootState('loading');
      setBootMessage('Carregando lançamentos, contas, cartões e regras...');
      const month = useAppStore.getState().selectedMonth;
      try {
        invalidateAuthenticatedCache();
        const statePromise = readCloudState();
        const preloadPromise = prefetchAuthenticatedData(month);
        const result = await statePromise;
        if (!active) return;
        replaceTransactions(result.state.transactions);
        setBootMessage('Base confirmada. Preparando a interface...');
        await preloadPromise;
        if (active) setBootState('ready');
      } catch {
        if (!active) return;
        setBootMessage('Não foi possível confirmar a base financeira compartilhada.');
        setBootState('error');
      }
    }

    void boot();
    return () => { active = false; };
  }, [bootAttempt, replaceTransactions]);

  /* Ao trocar o período, aquece o próximo conjunto de telas sem bloquear a UI. */
  useEffect(() => {
    if (bootState !== 'ready') return;
    void prefetchAuthenticatedData(selectedMonth);
  }, [selectedMonth, bootState]);

  /* Mantém o estado compartilhado atualizado sem recarregar a tela atual. */
  useEffect(() => {
    if (bootState !== 'ready') return;
    let active = true;
    const synchronize = (fresh = false) => {
      if (fresh) invalidateAuthenticatedCache('/app-state');
      return void readCloudState()
        .then((result) => { if (active) replaceTransactions(result.state.transactions); })
        .catch(() => undefined);
    };
    const timer = window.setInterval(() => synchronize(true), 15_000);
    const refresh = () => { if (document.visibilityState === 'visible') synchronize(true); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [bootState, replaceTransactions]);

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

  if (bootState !== 'ready') {
    return (
      <main className="meg-boot-screen" role="status" aria-live="polite" aria-busy={bootState === 'loading'}>
        <section className="meg-boot-card">
          <img src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" />
          <strong>{bootState === 'error' ? 'Base financeira indisponível' : 'Carregando MEG Finanças'}</strong>
          <small>{bootMessage}</small>
          {bootState === 'loading' ? (
            <div className="meg-boot-progress" aria-hidden="true" />
          ) : (
            <button className="btn meg-boot-retry" type="button" onClick={() => setBootAttempt((value) => value + 1)}>
              Tentar novamente
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <>
      <AppShell active={view} onNavigate={setView} onOpenCommand={() => setCommandOpen(true)} onLogout={onLogout} onNewTransaction={openNewTransaction}>
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
        {view === 'budgets' && <section id="budgets" className="page meg-screen"><header className="page-head screen-heading"><div><span>ORÇAMENTOS E METAS</span><h1>Planejamento</h1><p>Orçamento por competência e categoria. Realizado usa eventos efetivados; projetado pode incluir previstos. Simulações nunca alteram os dados reais.</p></div></header><BudgetPanel /></section>}
        {view === 'settings' && <Settings />}
      </AppShell>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={setView} onNewTransaction={openNewTransaction} />
    </>
  );
}
