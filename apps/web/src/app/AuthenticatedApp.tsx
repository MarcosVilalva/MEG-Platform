import { useEffect, useState } from 'react';
import { App } from './App';
import { LoginScreen } from '../modules/auth/LoginScreen';
import { clearSession, getApiHealth, logout, readSession, type AuthSession } from './auth-client';
import { readCloudState } from './app-state-client';
import { useAppStore } from './store';

export function AuthenticatedApp() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [dataReady, setDataReady] = useState<boolean | null>(null);
  const replaceTransactions = useAppStore((state) => state.replaceTransactions);

  useEffect(() => {
    if (!session) { setDataReady(null); return; }
    let active = true;
    void getApiHealth()
      .then(async (health) => {
        if (health.dataRepair?.status !== 'completed') return false;
        const cloud = await readCloudState();
        if (active) replaceTransactions(cloud.state.transactions);
        return true;
      })
      .then((ready) => { if (active) setDataReady(ready); })
      .catch(() => { if (active) setDataReady(false); });
    return () => { active = false; };
  }, [session]);

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
        <p>{dataReady === null ? 'Carregando sua base financeira com segurança' : 'Não foi possível confirmar a integridade dos dados'}</p>
        {dataReady === null ? <span className="meg-loading-spinner" aria-label="Carregando" /> : <div className="meg-loading-actions"><button onClick={() => window.location.reload()}>Verificar novamente</button><button className="secondary" onClick={handleLogout}>Sair</button></div>}
      </div>
    </main>
  );
  return <App onLogout={handleLogout} />;
}
