import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readSession, refreshAuthSession, validateSession, type AuthSession } from '../app/auth-client';
import './styles/tokens.css';
import './styles/base.css';
import { AppShell } from './shell/AppShell';
import { LoginScreen } from './auth/LoginScreen';

type AuthDestination = 'login' | 'create-account' | 'recover-password';

function currentAuthDestination(): AuthDestination {
  const query = new URLSearchParams(window.location.search).get('auth');
  return query === 'create-account' || query === 'recover-password' ? query : 'login';
}

function AuthGateway() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [destination, setDestination] = useState<AuthDestination>(currentAuthDestination);

  const navigate = (next: AuthDestination) => {
    const url = new URL(window.location.href);
    if (next === 'login') url.searchParams.delete('auth');
    else url.searchParams.set('auth', next);
    window.history.pushState({}, '', url);
    setDestination(next);
  };

  React.useEffect(() => {
    const existing = readSession();
    if (!existing) return;
    let cancelled = false;
    const checkSession = async () => {
      try {
        await validateSession(existing);
        if (!cancelled) setSession(existing);
      } catch {
        try {
          const refreshed = await refreshAuthSession();
          if (!cancelled) setSession(refreshed);
        } catch {
          // A falha de rede nunca concede acesso à área autenticada.
        }
      }
    };
    void checkSession();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    const syncDestination = () => setDestination(currentAuthDestination());
    window.addEventListener('popstate', syncDestination);
    return () => window.removeEventListener('popstate', syncDestination);
  }, []);

  if (session) return (
    <AppShell>
      <section className="meg-shell-stage" aria-label="Área de conteúdo da nova Web" />
    </AppShell>
  );

  if (destination !== 'login') {
    return (
      <main className="meg-login meg-login-unavailable" aria-label="Navegação de autenticação">
        <section className="meg-auth-pending" aria-live="polite">
          <img src={`${import.meta.env.BASE_URL}brand/logo-meg-financas.svg`} width="100" height="98" alt="MEG Finanças" />
          <h1>{destination === 'create-account' ? 'Criar conta' : 'Recuperar senha'}</h1>
          <p>Esta tela será implementada após a validação visual do Login.</p>
          <button type="button" onClick={() => navigate('login')}>Voltar ao login</button>
        </section>
      </main>
    );
  }

  return <LoginScreen onAuthenticated={() => setSession(readSession())} onNavigate={navigate} />;
}

const root = document.getElementById('meg-web-evolution-root');
if (!root) throw new Error('MEG_WEB_EVOLUTION_ROOT_NOT_FOUND');

createRoot(root).render(
  <React.StrictMode>
    <AuthGateway />
  </React.StrictMode>
);
