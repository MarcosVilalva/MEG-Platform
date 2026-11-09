import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { clearSession, logout, readSession, refreshAuthSession, validateSession, type AuthSession } from '../app/auth-client';
import './styles/tokens.css';
import './styles/base.css';
import { AppShell } from './shell/AppShell';
import { LoginScreen } from './auth/LoginScreen';
import { CreateAccountScreen } from './auth/CreateAccountScreen';
import { RecoverPasswordScreen } from './auth/RecoverPasswordScreen';
import { LoadingScreen } from './auth/LoadingScreen';
import { HomeDashboard } from './home/HomeDashboard';
import { OperationalLaunches } from './launches/OperationalLaunches';

type AuthDestination = 'login' | 'create-account' | 'recover-password' | 'loading';

function currentAuthDestination(): AuthDestination {
  const query = new URLSearchParams(window.location.search).get('auth');
  return query === 'create-account' || query === 'recover-password' || query === 'loading' ? query : 'login';
}

function AuthGateway() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutWarning, setLogoutWarning] = useState('');
  // Link direto de validação operacional da Etapa 09. Não altera a prévia visual.
  const [section, setSection] = useState<'home' | 'launches'>(
    () => new URLSearchParams(window.location.search).get('tela') === 'lancamentos'
      ? 'launches'
      : 'home'
  );
  const [destination, setDestination] = useState<AuthDestination>(currentAuthDestination);
  const [checkingSession, setCheckingSession] = useState(
    () => currentAuthDestination() !== 'loading' && Boolean(readSession())
  );

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Preparando acesso...');

  const reportProgress = (progress: number, message: string) => {
    setLoadingProgress(progress);
    setLoadingMessage(message);
  };

  const handleAuthenticated = async () => {
    const current = readSession();
    if (!current) return;
    setCheckingSession(true);
    reportProgress(25, 'Sessão encontrada. Validando seu acesso...');
    try {
      await validateSession(current);
      reportProgress(100, 'Acesso validado. Abrindo seu espaço...');
      setSession(current);
      setLogoutWarning('');
    } catch {
      // Uma validação malsucedida não libera o shell.
      setSession(null);
      navigate('login');
    } finally {
      setCheckingSession(false);
    }
  };

  const handleLogout = async () => {
    if (!session || loggingOut) return;
    setLoggingOut(true);
    let remoteRevocationFailed = false;
    try {
      await logout(session);
    } catch {
      // logout() limpa a sessão local no finally. Não afirmar revogação
      // remota se a API não conseguiu processar o token de renovação.
      remoteRevocationFailed = true;
    } finally {
      clearSession();
      setSession(null);
      setSection('home');
      setCheckingSession(false);
      navigate('login');
      setLogoutWarning(remoteRevocationFailed
        ? 'Sua sessão foi encerrada neste navegador. Não foi possível confirmar a revogação no servidor. Faça login para revisar as sessões ativas.'
        : '');
      setLoggingOut(false);
    }
  };

  const navigate = (next: AuthDestination) => {
    const url = new URL(window.location.href);
    if (next === 'login') url.searchParams.delete('auth');
    else url.searchParams.set('auth', next);
    window.history.pushState({}, '', url);
    setDestination(next);
  };

  React.useEffect(() => {
    // A prévia visual permanece isolada, mesmo com sessão armazenada.
    if (currentAuthDestination() === 'loading') return;
    const existing = readSession();
    if (!existing) return;
    let cancelled = false;
    const checkSession = async () => {
      if (!cancelled) {
        reportProgress(25, 'Sessão encontrada. Validando seu acesso...');
      }
      try {
        await validateSession(existing);
        if (!cancelled) {
          reportProgress(100, 'Acesso validado. Abrindo seu espaço...');
          setSession(existing);
        }
      } catch (cause) {
        const status = Number(
          (cause as { status?: number } | null)?.status || 0
        );
        // Não renovar automaticamente diante de falhas de rede/servidor.
        if (status === 401 || status === 403) {
          try {
            if (!cancelled) {
              reportProgress(50, 'Renovando sua sessão...');
            }
            const refreshed = await refreshAuthSession();
            if (cancelled) return;
            if (!refreshed) {
              throw new Error('MEG_AUTH_SESSION_REFRESH_EMPTY');
            }
            reportProgress(75, 'Sessão renovada. Confirmando seu acesso...');
            await validateSession(refreshed);
            if (!cancelled) {
              reportProgress(100, 'Acesso validado. Abrindo seu espaço...');
              setSession(refreshed);
            }
          } catch {
            // Sem validação bem-sucedida, não há acesso ao shell.
          }
        }
      } finally {
        if (!cancelled) setCheckingSession(false);
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

  if (checkingSession) {
    return (
      <LoadingScreen
        preview={false}
        progress={loadingProgress}
        message={loadingMessage}
        onNavigateLogin={() => navigate('login')}
      />
    );
  }

  if (session) return (
    <AppShell
      activeSection={section}
      onNavigate={setSection}
      onLogout={()=>{ void handleLogout(); }}
      logoutPending={loggingOut}
      profileName={session.user.name}
      periodLabel={new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date()).replace(/^./,letter=>letter.toLocaleUpperCase('pt-BR'))}
    >
      {section==='launches'
        ? <OperationalLaunches key={session.user.id} userId={session.user.id} userName={session.user.name} onHome={()=>setSection('home')}/>
        : <HomeDashboard />}
    </AppShell>
  );

  if (destination === 'create-account') {
    return <CreateAccountScreen onNavigateLogin={() => navigate('login')} onAuthenticated={() => { void handleAuthenticated(); }} />;
  }

  if (destination === 'recover-password') {
    return <RecoverPasswordScreen onNavigateLogin={() => navigate('login')} />;
  }

  if (destination === 'loading') return <LoadingScreen onNavigateLogin={() => navigate('login')} />;

  return <>
    <LoginScreen onAuthenticated={() => { void handleAuthenticated(); }} onNavigate={navigate} />
    {logoutWarning&&<p className="meg-auth-logout-warning" role="alert">{logoutWarning}</p>}
  </>;
}

const root = document.getElementById('meg-web-evolution-root');
if (!root) throw new Error('MEG_WEB_EVOLUTION_ROOT_NOT_FOUND');

createRoot(root).render(
  <React.StrictMode>
    <AuthGateway />
  </React.StrictMode>
);
