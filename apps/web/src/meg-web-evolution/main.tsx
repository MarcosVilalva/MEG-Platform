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
import { LaunchesScreen } from './launches/LaunchesScreen';

type AuthDestination = 'login' | 'create-account' | 'recover-password' | 'loading';

function currentAuthDestination(): AuthDestination {
  const query = new URLSearchParams(window.location.search).get('auth');
  return query === 'create-account' || query === 'recover-password' || query === 'loading' ? query : 'login';
}

function AuthGateway() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [financialView, setFinancialView] = useState<'launches' | 'home'>('launches');
  const [newLaunchToken, setNewLaunchToken] = useState(0);
  const [destination, setDestination] = useState<AuthDestination>(currentAuthDestination);
  const [checkingSession, setCheckingSession] = useState(
    () => currentAuthDestination() !== 'loading' && Boolean(readSession())
  );

  const authRevision = React.useRef(0);
  const logoutPending = React.useRef(false);

  // Reutiliza a mesma validação enquanto a montagem StrictMode ainda está pendente.
  // Não armazena resultados nem altera o contrato da API.
  const validationInFlight = React.useRef<{
    accessToken: string;
    refreshToken: string;
    promise: ReturnType<typeof validateSession>;
  } | null>(null);

  const validateSessionOnce = (candidate: AuthSession) => {
    const current = validationInFlight.current;
    if (current && current.accessToken === candidate.accessToken
      && current.refreshToken === candidate.refreshToken) return current.promise;

    const promise = validateSession(candidate);
    validationInFlight.current = {
      accessToken: candidate.accessToken,
      refreshToken: candidate.refreshToken,
      promise,
    };
    const clearPending = () => {
      if (validationInFlight.current?.promise === promise) {
        validationInFlight.current = null;
      }
    };
    void promise.then(clearPending, clearPending);
    return promise;
  };
  const [focusLoginAfterLogout, setFocusLoginAfterLogout] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState('');

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Preparando acesso...');

  const reportProgress = (progress: number, message: string) => {
    setLoadingProgress(progress);
    setLoadingMessage(message);
  };

  const handleAuthenticated = async () => {
    const current = readSession();
    if (!current) return;
    const revision = authRevision.current;
    setCheckingSession(true);
    reportProgress(25, 'Sessão encontrada. Validando seu acesso...');
    try {
      await validateSessionOnce(current);
      if (revision !== authRevision.current) return;
      reportProgress(100, 'Acesso validado. Abrindo seu espaço...');
      setLogoutNotice('');
      setFocusLoginAfterLogout(false);
      logoutPending.current = false;
      setSession(current);
    } catch {
      // Uma validação malsucedida não libera o shell.
      if (revision !== authRevision.current) return;
      setSession(null);
      setFocusLoginAfterLogout(true);
      navigate('login');
    } finally {
      if (revision === authRevision.current) setCheckingSession(false);
    }
  };

  const navigate = (next: AuthDestination, replace = false) => {
    const url = new URL(window.location.href);
    if (next === 'login') url.searchParams.delete('auth');
    else url.searchParams.set('auth', next);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
    setDestination(next);
  };

  const handleLogout = () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    authRevision.current += 1;
    const revision = authRevision.current;
    const activeSession = session ?? readSession();

    // O estado React é encerrado imediatamente; a rede não deve prender o usuário no Shell.
    setSession(null);
    setCheckingSession(false);
    setLogoutNotice('');
    setFocusLoginAfterLogout(true);
    navigate('login', true);

    if (!activeSession) {
      clearSession();
      logoutPending.current = false;
      return;
    }

    void logout(activeSession)
      .catch(() => {
        // O logout local já ocorreu; a revogação remota não pode ser garantida.
        if (revision === authRevision.current && !readSession()) {
          setLogoutNotice('Você saiu deste navegador. Não foi possível confirmar o encerramento da sessão no servidor.');
        }
      })
      .finally(() => { logoutPending.current = false; });
  };

  React.useEffect(() => {
    // A prévia visual permanece isolada, mesmo com sessão armazenada.
    if (currentAuthDestination() === 'loading') return;
    const existing = readSession();
    if (!existing) return;
    let cancelled = false;
    let authenticated = false;
    const revision = authRevision.current;
    const isCurrent = () => !cancelled && revision === authRevision.current;
    const checkSession = async () => {
      if (isCurrent()) {
        reportProgress(25, 'Sessão encontrada. Validando seu acesso...');
      }
      try {
        await validateSessionOnce(existing);
        if (isCurrent()) {
          reportProgress(100, 'Acesso validado. Abrindo seu espaço...');
          authenticated = true;
          setSession(existing);
        }
      } catch (cause) {
        const status = Number(
          (cause as { status?: number } | null)?.status || 0
        );
        // Não renovar automaticamente diante de falhas de rede/servidor.
        if (status === 401 || status === 403) {
          try {
            if (isCurrent()) {
              reportProgress(50, 'Renovando sua sessão...');
            }
            const refreshed = await refreshAuthSession();
            if (!isCurrent()) return;
            if (!refreshed) {
              throw new Error('MEG_AUTH_SESSION_REFRESH_EMPTY');
            }
            reportProgress(75, 'Sessão renovada. Confirmando seu acesso...');
            await validateSessionOnce(refreshed);
            if (isCurrent()) {
              reportProgress(100, 'Acesso validado. Abrindo seu espaço...');
              authenticated = true;
              setSession(refreshed);
            }
          } catch {
            // Sem validação bem-sucedida, não há acesso ao shell.
          }
        }
      } finally {
        if (isCurrent()) {
          // Após falha, devolver o foco ao primeiro controle de recuperação do Login.
          if (!authenticated) setFocusLoginAfterLogout(true);
          setCheckingSession(false);
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
      onLogout={handleLogout}
      userName={session.user.name}
      activeView={financialView}
      onNavigate={setFinancialView}
      canCreate={session.user.role !== 'VIEWER'}
      onNewLaunch={() => { setFinancialView('launches'); setNewLaunchToken(n => n + 1); }}
    >
      {financialView === 'launches' ? (
        <LaunchesScreen key={session.user.id} userId={session.user.id} userName={session.user.name} canCreate={session.user.role !== 'VIEWER'} newLaunchToken={newLaunchToken} />
      ) : (
        <section className="meg-shell-stage" aria-label="Início financeiro">
          <p>O panorama financeiro será disponibilizado após a integração dos indicadores canônicos. Consulte seus lançamentos pelo menu.</p>
        </section>
      )}
    </AppShell>
  );

  if (destination === 'create-account') {
    return <CreateAccountScreen onNavigateLogin={() => navigate('login')} onAuthenticated={() => { void handleAuthenticated(); }} />;
  }

  if (destination === 'recover-password') {
    return <RecoverPasswordScreen onNavigateLogin={() => navigate('login')} />;
  }

  if (destination === 'loading') return <LoadingScreen onNavigateLogin={() => navigate('login')} />;

  return <LoginScreen
    onAuthenticated={() => { void handleAuthenticated(); }}
    onNavigate={navigate}
    focusOnMount={focusLoginAfterLogout}
    sessionNotice={logoutNotice}
  />;
}

const root = document.getElementById('meg-web-evolution-root');
if (!root) throw new Error('MEG_WEB_EVOLUTION_ROOT_NOT_FOUND');

createRoot(root).render(
  <React.StrictMode>
    <AuthGateway />
  </React.StrictMode>
);
