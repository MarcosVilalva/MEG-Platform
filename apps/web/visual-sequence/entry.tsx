import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingScreen } from '../src/meg-web-evolution/auth/LoadingScreen';
import { LoginScreen } from '../src/meg-web-evolution/auth/LoginScreen';
import { CreateAccountScreen } from '../src/meg-web-evolution/auth/CreateAccountScreen';
import { RecoverPasswordScreen } from '../src/meg-web-evolution/auth/RecoverPasswordScreen';
import './preview.css';

/**
 * Fluxo da DEMONSTRAÇÃO VISUAL: Carregamento → Login.
 * A sequência NÃO altera o aplicativo autenticado, onde o carregamento
 * permanece depois do login. Nenhuma credencial é enviada à API.
 *
 * ?tela=fluxo (padrão): progride de 0 a 100% e só então avança.
 * ?tela=carregamento: inspecionar arte sem avanço automático.
 * ?tela=login: abrir login diretamente, também sem autenticação.
 * ?tela=cadastro: formulário existente em modo visual, sem gravar dados.
 * ?tela=recuperar-senha: recuperação de senha temporária, sem enviar e-mails.
 */
const requestedView = new URLSearchParams(window.location.search).get('tela');
const autoAdvance = requestedView !== 'login' && requestedView !== 'carregamento' && requestedView !== 'cadastro' && requestedView !== 'recuperar-senha';
type PreviewScreen = 'loading' | 'login' | 'create-account' | 'recover-password';

function Preview() {
  const [screen, setScreen] = useState<PreviewScreen>(() =>
    requestedView === 'cadastro' ? 'create-account' : requestedView === 'recuperar-senha' ? 'recover-password' : requestedView === 'login' ? 'login' : 'loading');
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState(0);
  const loading = screen === 'loading';

  useEffect(() => {
    if (!loading) return;
    // APENAS PREVIEW: contagem ilustrativa. Nunca é progresso da API.
    const durationMs = 4500;
    const startedAt = window.performance.now();
    setProgress(0);
    const interval = window.setInterval(() => {
      const elapsed = window.performance.now() - startedAt;
      const percentage = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setProgress(percentage);
    }, 50);
    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    // Navegação exige barra 100% completa. Segurar por 550 ms para
    // que a conclusão seja perceptível antes de mudar de tela.
    if (!loading || !autoAdvance || progress !== 100) return;
    const timer = window.setTimeout(() => setScreen('login'), 550);
    return () => window.clearTimeout(timer);
  }, [loading, progress]);

  const goToLogin = () => {
    // O bloqueio até 100% vale somente durante o carregamento.
    // O retorno do Cadastro deve funcionar mesmo em acesso direto via URL.
    if (screen === 'loading' && progress !== 100) return;
    setNotice('');
    setScreen('login');
  };
  const reviewLoading = () => {
    setNotice('');
    setProgress(0);
    setScreen('loading');
  };
  const goToRegister = () => { setNotice(''); setScreen('create-account'); };
  const goToRecover = () => { setNotice(''); setScreen('recover-password'); };

  return (
    <div className="meg-sequence-preview"
      data-preview-screen={loading ? 'carregamento' : screen === 'create-account' ? 'cadastro' : screen === 'recover-password' ? 'recuperar-senha' : 'login'}
      data-preview-mode="static-only"
      data-preview-autoadvance={autoAdvance ? 'true' : 'false'}>
      {loading ? (
        <LoadingScreen preview progress={progress} onNavigateLogin={goToLogin} />
      ) : screen === 'recover-password' ? (
        <RecoverPasswordScreen previewOnly onNavigateLogin={goToLogin} />
      ) : screen === 'create-account' ? (
        <CreateAccountScreen previewOnly
          onNavigateLogin={goToLogin}
          onAuthenticated={() => setNotice('Prévia visual: nenhum cadastro foi efetuado.')} />
      ) : (
        <LoginScreen previewOnly onReviewLoading={reviewLoading}
          onAuthenticated={() => setNotice('Prévia visual: autenticação não executada.')}
          onNavigate={destination => {
            if (destination === 'create-account') goToRegister();
            else if (destination === 'recover-password') goToRecover();
          }} />
      )}
      {loading && (
        <nav className="meg-sequence-preview__navigation" aria-label="Navegação da prévia visual">
          <button type="button" onClick={goToLogin} disabled={progress < 100}>
            {progress === 100 ? 'Continuar para o Login' : `Carregando... ${progress}%`}
            {progress === 100 && <span aria-hidden="true">→</span>}
          </button>
        </nav>
      )}
      <span className={'meg-sequence-preview__notice' + (notice ? ' is-alert' : '')} role="status" aria-live="polite">
        {notice || (loading
          ? (autoAdvance ? 'Prévia ilustrativa • somente avançará após 100%' : 'Tela 01 • carregamento ilustrativo')
          : screen === 'create-account'
            ? 'Tela 03 • cadastro visual • somente dados fictícios'
            : screen === 'recover-password'
              ? 'Tela 04 • recuperação visual • nenhum e-mail é enviado'
              : 'Tela 02 • preview visual • não informe senha real')}
      </span>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
