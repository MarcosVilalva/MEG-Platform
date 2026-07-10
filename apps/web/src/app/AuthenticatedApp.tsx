import { useState } from 'react';
import { App } from './App';
import { LoginScreen } from '../modules/auth/LoginScreen';
import { logout, readSession, type AuthSession } from './auth-client';

export function AuthenticatedApp() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  async function handleLogout() {
    if (session) await logout(session);
    setSession(null);
  }

  if (!session) {
    return <LoginScreen onAuthenticated={setSession} />;
  }

  return (
    <div className="authenticated-app">
      <div className="session-bar">
        <div>
          <strong>{session.user.name}</strong>
          <span>{session.user.role}</span>
        </div>
        <button type="button" onClick={handleLogout}>Sair</button>
      </div>
      <App />
    </div>
  );
}
