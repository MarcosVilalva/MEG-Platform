import { useEffect, useState } from 'react';
import { App } from './App';
import { LoginScreen } from '../modules/auth/LoginScreen';
import { clearSession, logout, readSession, type AuthSession } from './auth-client';
import { readCloudState } from './app-state-client';
import { useAppStore } from './store';

export function AuthenticatedApp() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [dataReady, setDataReady] = useState<boolean | null>(null);
  const [loadMessage, setLoadMessage] = useState('Conectando à sua base financeira');
  const [retryKey, setRetryKey] = useState(0);
  const replaceTransactions = useAppStore((state) => state.replaceTransactions);

  useEffect(() => {
    if (!session) { setDataReady(null); return; }
    let active = true;
    setDataReady(null);
    const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    void (async () => {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3 && active; attempt += 1) {
        try {
          setLoadMessage(attempt === 0 ? 'Conectando à sua base financeira' : 'A base está acordando. Aguarde mais um instante');
          setLoadMessage('Carregando seus lançamentos reais');
          const cloud = await readCloudState(AbortSignal.timeout(20_000));
          if (!active) return;
          replaceTransactions(cloud.state.transactions);
          setDataReady(true);
          return;
        } catch (error) {
          lastError = error;
          if ((error as { status?: number }).status === 401) {
            clearSession();
            if (active) setSession(null);
            return;
          }
          await wait(1_500);
        }
      }
      if (active) {
        console.error('Não foi possível carregar a base financeira após novas tentativas.', lastError);
        setDataReady(false);
      }
    })();
    return () => { active = false; };
  }, [session, retryKey, replaceTransactions]);

  function handleLogout() {
    if (!window.confirm('Deseja sair do MEG Finanças? Sua sessão será encerrada com segurança.')) return;
    const current = session;
    clearSession();
    setSession(null);
    if (current) void logout(current).catch(() => undefined);
  }

  if (!session) return <LoginScreen onAuthenticated={setSession} />;
  if (dataReady !== true) return (
    <main className="meg-loading-screen">
      <div className="meg-loading-card">
        <img className="loading-logo" src="./brand/meg-finance-system-mark.svg" alt="MEG Finance System" />
        <h1>Organize. Entenda. Planeje.</h1>
        <p>{dataReady === null ? loadMessage : 'A conexão com a base não foi concluída. Seus dados permanecem protegidos.'}</p>
        {dataReady === null ? <span className="meg-loading-spinner" aria-label="Carregando" /> : <div className="meg-loading-actions"><button onClick={() => setRetryKey((value) => value + 1)}>Tentar novamente</button><button className="secondary" onClick={handleLogout}>Sair</button></div>}
      </div>
    </main>
  );
  return <App onLogout={handleLogout} />;
}
