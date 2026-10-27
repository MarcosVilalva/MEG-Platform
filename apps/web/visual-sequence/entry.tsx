import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingScreen } from '../src/meg-web-evolution/auth/LoadingScreen';
import { LoginScreen } from '../src/meg-web-evolution/auth/LoginScreen';
import './preview.css';

/**
 * Fluxo da DEMONSTRAÇÃO VISUAL: Carregamento → Login.
 * A sequência NÃO altera o aplicativo autenticado, onde o carregamento
 * permanece depois do login. Nenhuma credencial é enviada à API.
 *
 * ?tela=fluxo (padrão): progride de 0 a 100% e só então avança.
 * ?tela=carregamento: inspecionar arte sem avanço automático.
 * ?tela=login: abrir login diretamente, também sem autenticação.
 */
const requestedView = new URLSearchParams(window.location.search).get('tela');
const autoAdvance = requestedView !== 'login' && requestedView !== 'carregamento';

function Preview() {
  const [screen, setScreen] = useState<'loading' | 'login'>(() =>
    requestedView === 'login' ? 'login' : 'loading');
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
    if (progress !== 100) return;
    setNotice('');
    setScreen('login');
  };
  const reviewLoading = () => {
    setNotice('');
    setProgress(0);
    setScreen('loading');
  };

  return (
    <div className="meg-sequence-preview"
      data-preview-screen={loading ? 'carregamento' : 'login'}
      data-preview-mode="static-only"
      data-preview-autoadvance={autoAdvance ? 'true' : 'false'}>
      {loading ? (
        <LoadingScreen preview progress={progress} onNavigateLogin={goToLogin} />
      ) : (
        <LoginScreen previewOnly
          onAuthenticated={() => setNotice('Prévia visual: autenticação não executada.')}
          onNavigate={destination =>
            setNotice(destination === 'create-account'
              ? 'Criar Conta será avaliada na etapa correspondente.'
              : 'Recuperação de Senha será avaliada na etapa correspondente.')} />
      )}
      <nav className="meg-sequence-preview__navigation" aria-label="Navegação da prévia visual">
        {loading ? (
          <button type="button" onClick={goToLogin} disabled={progress < 100}>
            {progress === 100 ? 'Continuar para o Login' : `Carregando... ${progress}%`}
            {progress === 100 && <span aria-hidden="true">→</span>}
          </button>
        ) : (
          <button type="button" onClick={reviewLoading}><span aria-hidden="true">←</span> Rever carregamento</button>
        )}
      </nav>
      <span className={'meg-sequence-preview__notice' + (notice ? ' is-alert' : '')} role="status" aria-live="polite">
        {notice || (loading
          ? (autoAdvance ? 'Prévia ilustrativa • somente avançará após 100%' : 'Tela 01 • carregamento ilustrativo')
          : 'Tela 02 • preview visual • não informe senha real')}
      </span>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
