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
 * ?tela=fluxo (padrão): splash demonstrativo com avanço automático.
 * ?tela=carregamento: inspecionar arte sem avanço automático.
 * ?tela=login: abrir login diretamente, também sem autenticação.
 */
const requestedView = new URLSearchParams(window.location.search).get('tela');
const autoAdvance = requestedView !== 'login' && requestedView !== 'carregamento';

function Preview() {
  const [screen, setScreen] = useState<'loading' | 'login'>(() =>
    requestedView === 'login' ? 'login' : 'loading');
  const [notice, setNotice] = useState('');
  const loading = screen === 'loading';

  useEffect(() => {
    if (!loading || !autoAdvance) return;
    // Somente demonstração de sequência. Não representa dados carregados.
    const timer = window.setTimeout(() => setScreen('login'), 4500);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const goToLogin = () => { setNotice(''); setScreen('login'); };
  const reviewLoading = () => { setNotice(''); setScreen('loading'); };

  return (
    <div className="meg-sequence-preview"
      data-preview-screen={loading ? 'carregamento' : 'login'}
      data-preview-mode="static-only"
      data-preview-autoadvance={autoAdvance ? 'true' : 'false'}>
      {loading ? (
        <LoadingScreen preview progress={0} onNavigateLogin={goToLogin} />
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
          <button type="button" onClick={goToLogin}>Ir para o Login <span aria-hidden="true">→</span></button>
        ) : (
          <button type="button" onClick={reviewLoading}><span aria-hidden="true">←</span> Rever carregamento</button>
        )}
      </nav>
      <span className={'meg-sequence-preview__notice' + (notice ? ' is-alert' : '')} role="status" aria-live="polite">
        {notice || (loading
          ? (autoAdvance ? 'Prévia visual • avançará automaticamente para o Login' : 'Tela 01 • carregamento visual')
          : 'Tela 02 • preview visual • não informe senha real')}
      </span>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
