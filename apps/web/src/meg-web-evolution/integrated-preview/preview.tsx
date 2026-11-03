import React, {useEffect, useState, type MouseEvent} from 'react';
import {createRoot} from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import {LoadingScreen} from '../auth/LoadingScreen';
import {LoginScreen} from '../auth/LoginScreen';
import {CreateAccountScreen} from '../auth/CreateAccountScreen';
import {RecoverPasswordScreen} from '../auth/RecoverPasswordScreen';
import {AppShell} from '../shell/AppShell';
import {Icon} from '../components/Icon';
import {HomeDashboard} from '../home/HomeDashboard';
import {homePreviewFixture} from '../home/preview.fixture';
import {LaunchTypePicker} from '../launches/LaunchTypePicker';
import '../launches/new-launch.css';
import '../launches/launch-type-picker.css';
import './integrated-preview.css';

/**
 * PREVIA VISUAL ISOLADA, SEM API:
 * - Telas 01-04 da PR #649, Home refinada da PR #653 (ainda candidata, nao homologada);
 * - Escolha do Novo Lancamento da PR #648, com os arquivos e WebPs originais.
 * Nunca envia credenciais, grava transacoes ou substitui o gateway real.
 */
type Screen = 'loading-entry' | 'login' | 'register' | 'recover' | 'loading-initial' | 'home' | 'new-launch';
const urlScreen = new URLSearchParams(window.location.search).get('tela');
const initialScreen: Screen =
  urlScreen === 'login' ? 'login' :
  urlScreen === 'home' ? 'home' :
  urlScreen === 'novo' ? 'new-launch' :
  urlScreen === 'cadastro' ? 'register' :
  urlScreen === 'recuperar-senha' ? 'recover' :
  urlScreen === 'carregamento-inicial' ? 'loading-initial' : 'loading-entry';

function FlowPreview() {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState('');
  const isLoading = screen === 'loading-entry' || screen === 'loading-initial';

  useEffect(() => {
    if (!isLoading) return;
    setProgress(0);
    const started = window.performance.now();
    let nextScreenTimer: number | undefined;
    const interval = window.setInterval(() => {
      const percentage = Math.min(100, Math.floor((window.performance.now() - started) / 2600 * 100));
      setProgress(percentage);
      if (percentage === 100) {
        window.clearInterval(interval);
        nextScreenTimer = window.setTimeout(() => {
          setScreen(screen === 'loading-entry' ? 'login' : 'home');
        }, 450);
      }
    }, 45);
    return () => {
      window.clearInterval(interval);
      if (nextScreenTimer !== undefined) window.clearTimeout(nextScreenTimer);
    };
  }, [screen, isLoading]);

  const handleShellCapture = (event: MouseEvent<HTMLDivElement>) => {
    const element = event.target;
    if (!(element instanceof Element)) return;
    const button = element.closest('button');
    if (!button) return;
    if (button.getAttribute('aria-label') === 'Novo lançamento') {
      event.stopPropagation();
      setNotice('');
      setScreen('new-launch');
    }
    if (button.classList.contains('meg-logout-button')) {
      event.stopPropagation();
      setScreen('login');
    }
  };

  const goHome = () => { setNotice(''); setScreen('home'); };

  if (isLoading) {
    return <div className="meg-integrated-preview" data-preview-view={screen}>
      <LoadingScreen preview progress={progress} onNavigateLogin={() => setScreen('login')} />
      <span className="meg-integrated-preview__sr" role="status">Simulação visual. Nenhuma consulta à API.</span>
    </div>;
  }
  if (screen === 'login') {
    return <div className="meg-integrated-preview" data-preview-view="login">
      <LoginScreen previewOnly onAuthenticated={() => setScreen('loading-initial')}
        onReviewLoading={() => setScreen('loading-entry')}
        onNavigate={destination => setScreen(destination === 'create-account' ? 'register' : 'recover')}/>
      <button type="button" className="meg-integrated-preview__demo-login"
        onClick={() => setScreen('loading-initial')}>Entrar em modo demonstração (sem autenticar)</button>
    </div>;
  }
  if (screen === 'register') {
    return <div className="meg-integrated-preview" data-preview-view="cadastro">
      <CreateAccountScreen previewOnly onNavigateLogin={() => setScreen('login')} onAuthenticated={() => setScreen('login')}/>
    </div>;
  }
  if (screen === 'recover') {
    return <div className="meg-integrated-preview" data-preview-view="recuperar-senha">
      <RecoverPasswordScreen previewOnly onNavigateLogin={() => setScreen('login')}/>
    </div>;
  }

  return <div className="meg-integrated-preview" data-preview-view={screen}
    onClickCapture={handleShellCapture}>
    <AppShell>
      <HomeDashboard previewData={homePreviewFixture} month="2026-10"
        onNavigate={target => {
          if (target === 'novo') { setNotice(''); setScreen('new-launch'); }
          else setNotice('Demonstração visual: esta ação não consulta nem grava dados financeiros.');
        }}/>
    </AppShell>
    {screen === 'new-launch' && <div className="meg-new-launch__overlay is-choice-overlay meg-integrated-preview__choice-overlay">
      <section className="meg-new-launch is-choose" role="dialog" aria-modal="true" aria-labelledby="meg-integrated-new-title">
        <header className="meg-new-launch__header">
          <button className="meg-new-launch__back-icon" aria-label="Voltar à Home" type="button" onClick={goHome}>
            <Icon name="chevronLeft" width={25} height={25}/>
          </button>
          <div className="meg-new-launch__headline">
            <h2 id="meg-integrated-new-title">Novo lançamento</h2>
            <p>Escolha o tipo de lançamento e siga com um formulário inteligente para Web.</p>
          </div>
          <button className="meg-new-launch__close" aria-label="Fechar novo lançamento" type="button" onClick={goHome}>×</button>
        </header>
        <LaunchTypePicker
          onChoose={type => setNotice(type === 'expense'
            ? 'Despesa escolhida. O formulário protegido da PR #648 não é executado nesta prévia sem API.'
            : 'Receita escolhida. O formulário protegido da PR #648 não é executado nesta prévia sem API.')}
          onBack={goHome}/>
      </section>
    </div>}
    {notice && <output className="meg-integrated-preview__notice" role="status">{notice}
      <button type="button" aria-label="Fechar aviso" onClick={() => setNotice('')}>×</button>
    </output>}
    {screen === 'home' && <button type="button" className="meg-integrated-preview__restart"
      onClick={() => setScreen('loading-entry')}>Rever sequência</button>}
  </div>;
}

const root = document.getElementById('meg-fluxo-integrado-root');
if (!root) throw new Error('MEG_INTEGRATED_PREVIEW_ROOT_MISSING');
createRoot(root).render(<React.StrictMode><FlowPreview/></React.StrictMode>);
