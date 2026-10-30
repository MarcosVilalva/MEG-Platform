import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readSession, refreshAuthSession, validateSession, clearSession, logout, type AuthSession } from '../app/auth-client';
import './styles/tokens.css';
import './styles/base.css';
import { AppShell } from './shell/AppShell';
import { LoginScreen } from './auth/LoginScreen';
import { CreateAccountScreen } from './auth/CreateAccountScreen';
import { RecoverPasswordScreen } from './auth/RecoverPasswordScreen';
import { LoadingScreen } from './auth/LoadingScreen';
import { HomeScreen } from './home/HomeScreen';

type AuthDestination = 'login' | 'create-account' | 'recover-password' | 'loading';

function currentAuthDestination(): AuthDestination {
  const query = new URLSearchParams(window.location.search).get('auth');
  return query === 'create-account' || query === 'recover-password' || query === 'loading' ? query : 'login';
}

function todayMonth() {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date());
  return (parts.find(p=>p.type==='year')?.value||'2026')+'-'+(parts.find(p=>p.type==='month')?.value||'01');
}

function AuthGateway() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [selectedMonth,setSelectedMonth]=useState(todayMonth);
  const [searchQuery,setSearchQuery]=useState('');
  const [operationNotice,setOperationNotice]=useState('');
  const navigateHome=(label:string)=>{
    if(label==='Início'||label==='Home'){setOperationNotice('');return;}
    setOperationNotice('A seção "'+label+'" ainda não foi implementada na nova Web. Nenhuma operação financeira foi executada.');
  };
  const actionName:Record<string,string>={
    lancamentos:'Lançamentos',pendentes:'Pendentes',cartoes:'Cartões',
    beneficios:'Benefícios',novo:'Novo lançamento',transferencia:'Transferência',
    relatorios:'Relatórios',metas:'Configurar metas',
  };
  const handleLogout=()=>{
    const current=readSession();
    if(!window.confirm('Deseja encerrar sua sessão no MEG Finanças?'))return;
    clearSession();
    setSession(null);
    setSearchQuery('');
    setOperationNotice('');
    navigate('login');
    if(current) void logout(current).catch(()=>undefined);
  };
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
    } catch {
      // Uma validação malsucedida não libera o shell.
      setSession(null);
      navigate('login');
    } finally {
      setCheckingSession(false);
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
      selectedMonth={selectedMonth}
      onMonthChange={(month)=>{setSelectedMonth(month);setOperationNotice('');}}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      userName={session.user.name}
      homeContext
      onLogout={handleLogout}
      onNewTransaction={()=>navigateHome('Novo lançamento')}
      onNavigate={navigateHome}
    >
      {operationNotice&&<div className="meg-home-operation-notice" role="status">{operationNotice} <button type="button" onClick={()=>setOperationNotice('')} aria-label="Dispensar aviso">Fechar</button></div>}
      <HomeScreen selectedMonth={selectedMonth} searchQuery={searchQuery} onNavigate={action=>navigateHome(actionName[action]||action)}/>
    </AppShell>
  );

  if (destination === 'create-account') {
    return <CreateAccountScreen onNavigateLogin={() => navigate('login')} onAuthenticated={() => { void handleAuthenticated(); }} />;
  }

  if (destination === 'recover-password') {
    return <RecoverPasswordScreen onNavigateLogin={() => navigate('login')} />;
  }

  if (destination === 'loading') return <LoadingScreen onNavigateLogin={() => navigate('login')} />;

  return <LoginScreen onAuthenticated={() => { void handleAuthenticated(); }} onNavigate={navigate} />;
}

const root = document.getElementById('meg-web-evolution-root');
if (!root) throw new Error('MEG_WEB_EVOLUTION_ROOT_NOT_FOUND');

createRoot(root).render(
  <React.StrictMode>
    <AuthGateway />
  </React.StrictMode>
);
