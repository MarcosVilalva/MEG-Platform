import { useEffect, useState } from 'react';
import { App } from './App';
import { LoginScreen } from '../modules/auth/LoginScreen';
import { clearSession, getApiHealth, logout, readSession, type AuthSession } from './auth-client';

export function AuthenticatedApp() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [dataReady, setDataReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) { setDataReady(null); return; }
    let active = true;
    void getApiHealth()
      .then((health) => { if (active) setDataReady(health.dataRepair?.status === 'completed'); })
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
    <main className="data-migration-screen">
      <div className="data-migration-card">
        <div className="brand-mark">M</div>
        <span>Proteção de integridade</span>
        <h1>{dataReady === null ? 'Verificando sua base financeira' : 'Atualização dos dados pendente'}</h1>
        <p>O MEG não exibirá saldos ou indicadores até a API confirmar que todos os lançamentos antigos foram reconstruídos corretamente.</p>
        <button onClick={() => window.location.reload()}>Verificar novamente</button>
        <button className="secondary" onClick={handleLogout}>Sair</button>
      </div>
    </main>
  );
  return <App onLogout={handleLogout} />;
}
