import { useState } from 'react';
import { App } from './App';
import { LoginScreen } from '../modules/auth/LoginScreen';
import { UserManagement } from '../modules/admin/UserManagement';
import { logout, readSession, type AuthSession } from './auth-client';

export function AuthenticatedApp() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [adminOpen, setAdminOpen] = useState(false);

  async function handleLogout() {
    if (session) await logout(session);
    setSession(null);
  }

  if (!session) return <LoginScreen onAuthenticated={setSession} />;

  return (
    <div className="authenticated-app">
      <div className="session-bar">
        <div><strong>{session.user.name}</strong><span>{session.user.role}</span></div>
        <div className="session-actions">
          {session.user.role === 'ADMIN' && <button type="button" onClick={() => setAdminOpen((value) => !value)}>Usuários e permissões</button>}
          <button type="button" onClick={handleLogout}>Sair</button>
        </div>
      </div>
      {adminOpen ? <UserManagement session={session} onClose={() => setAdminOpen(false)} /> : <App />}
    </div>
  );
}