import { useState } from 'react';
import { App } from './App';
import { LoginScreen } from '../modules/auth/LoginScreen';
import { clearSession, logout, readSession, type AuthSession } from './auth-client';

export function AuthenticatedApp() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  function handleLogout() {
    const current = session;
    clearSession();
    setSession(null);
    if (current) void logout(current).catch(() => undefined);
  }

  if (!session) return <LoginScreen onAuthenticated={setSession} />;
  return <App onLogout={handleLogout} />;
}