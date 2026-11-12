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
import {homeP0QaPreviewFixture} from '../home/home-p0-qa.preview.fixture';
import {LaunchTypePicker} from '../launches/LaunchTypePicker';
import {LaunchesStage09} from '../launches/LaunchesStage09';
import '../launches/new-launch.css';

import './integrated-preview.css';
import './home-refinement.css';
import './choice-refinement.css';

/**
 * PREVIA VISUAL ISOLADA, SEM API:
 * - Home P0 validada na PR #669;
 * - Lançamentos no modo operacional visual da PR #656, com fixture sintética;
 * - Modo legado exclusivo para testes da PR #656 (não para homologação nova).
 * - Escolha de Novo Lançamento preservada, sem formulário financeiro.
 * Nunca envia credenciais, grava transacoes ou substitui o gateway real.
 */
type Screen = 'loading-entry' | 'login' | 'register' | 'recover' | 'loading-initial' | 'home-legacy' | 'home-p0' | 'launches' | 'launches-legacy' | 'new-launch';
const urlScreen = new URLSearchParams(window.location.search).get('tela');
const initialScreen: Screen =
  urlScreen === 'login' ? 'login' :
  urlScreen === 'home' || urlScreen === 'home-p0' ? 'home-p0' :
  urlScreen === 'home-legado' ? 'home-legacy' :
  urlScreen === 'lancamentos' ? 'launches' :
  urlScreen === 'lancamentos-legado' ? 'launches-legacy' :
  urlScreen === 'novo' ? 'new-launch' :
  urlScreen === 'cadastro' ? 'register' :
  urlScreen === 'recuperar-senha' ? 'recover' :
  urlScreen === 'carregamento-inicial' ? 'loading-initial' : 'loading-entry';

function FlowPreview() {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  // Home P0 da PR #669 e seu fixture original são o destino autorizado.
  // A Home legada só existe para regressões históricas internas.
  const [returnScreen,setReturnScreen] = useState<'home-p0'|'home-legacy'|'launches'|'launches-legacy'>('home-p0');
  const operationalLaunches=screen==='launches'||(screen==='new-launch'&&returnScreen==='launches');
  const legacyLaunches=screen==='launches-legacy'||(screen==='new-launch'&&returnScreen==='launches-legacy');
  const launchesVisible=operationalLaunches||legacyLaunches;
  const activeHome = screen === 'home-legacy' || (screen === 'new-launch' && returnScreen === 'home-legacy')
    ? 'home-legacy' : 'home-p0';
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
          setScreen(screen === 'loading-entry' ? 'login' : 'home-p0');
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
      event.stopPropagation(); setNotice('');
      setReturnScreen(screen==='launches'||screen==='launches-legacy'?screen:activeHome);
      setScreen('new-launch');
    }
    if (button.classList.contains('meg-logout-button')) {
      event.stopPropagation();
      setScreen('login');
    }
  };

  const goHome = () => { setNotice(''); setScreen('home-p0'); };
  const closeNew = () => { setNotice(''); setScreen(returnScreen); };

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
    <AppShell
      periodLabel={activeHome === 'home-p0' ? 'Novembro de 2026' : undefined}
      activeSection={operationalLaunches?'launches':'home'}
      onNavigate={legacyLaunches?undefined:(section)=>{setNotice('');setScreen(section==='home'?'home-p0':'launches');}}
      visualVariant={launchesVisible?'launches':'home'}
    >
      {operationalLaunches
        ? <LaunchesStage09 data={homeP0QaPreviewFixture} mode="live" periodMonth="2026-11"
            userId="qa-visual-only-stage09" exportUserName="Usuário fictício"
            onRefresh={()=>setNotice('Amostra fictícia atualizada, sem consulta à API.')}
            onNew={() => {setNotice('');setReturnScreen('launches');setScreen('new-launch');}}
            onHome={goHome}/>
        : legacyLaunches
        ? <LaunchesStage09 data={homePreviewFixture} mode="preview"
            onNew={()=>{setNotice('');setReturnScreen('launches-legacy');setScreen('new-launch');}}
            onHome={goHome}/>
        : <HomeDashboard previewData={activeHome === 'home-p0' ? homeP0QaPreviewFixture : homePreviewFixture}
            month={activeHome === 'home-p0' ? '2026-11' : '2026-10'}
            onNavigate={target => {
              if (target === 'novo') {
                setNotice(''); setReturnScreen(activeHome); setScreen('new-launch');
              } else if (target === 'lancamentos') {
                setNotice(''); setScreen('launches');
              } else setNotice('Demonstração visual: esta ação não consulta nem grava dados financeiros.');
            }}/>}
    </AppShell>
    {screen === 'new-launch' && <div className="meg-new-launch__overlay is-choice-overlay meg-integrated-preview__choice-overlay">
      <section className="meg-new-launch is-choose" role="dialog" aria-modal="true" aria-labelledby="meg-integrated-new-title">
        <header className="meg-new-launch__header">
          <button className="meg-new-launch__back-icon" aria-label="Voltar à Home" type="button" onClick={closeNew}>
            <Icon name="chevronLeft" width={25} height={25}/>
          </button>
          <div className="meg-new-launch__headline">
            <h2 id="meg-integrated-new-title">Novo lançamento</h2>
            <p>Escolha o tipo de lançamento e siga com um formulário inteligente para Web.</p>
          </div>
          <button className="meg-new-launch__close" aria-label="Fechar novo lançamento" type="button" onClick={closeNew}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 5 19 19M19 5 5 19"/></svg></button>
        </header>
        <LaunchTypePicker
          onChoose={type => setNotice(type === 'expense'
            ? 'Despesa escolhida. O formulário protegido da PR #648 não é executado nesta prévia sem API.'
            : 'Receita escolhida. O formulário protegido da PR #648 não é executado nesta prévia sem API.')}
          onBack={closeNew}/>
      </section>
    </div>}
    {notice && <output className="meg-integrated-preview__notice" role="status">{notice}
      <button type="button" aria-label="Fechar aviso" onClick={() => setNotice('')}>×</button>
    </output>}
    {screen === 'launches' && <output className="meg-p0-qa-label" role="status"
      style={{position:'fixed',bottom:14,left:14,zIndex:80,background:'#082a29',border:'1px solid #28cbb6',color:'#e6fffb',fontSize:11,padding:'7px 10px',borderRadius:8,maxWidth:'calc(100vw - 28px)'}}>
      QA visual Lançamentos · Dados fictícios · Sem conexão com API
    </output>}
    {screen === 'home-p0' && <output className="meg-p0-qa-label" role="status"
      style={{position:'fixed',bottom:14,left:14,zIndex:80,background:'#082a29',border:'1px solid #28cbb6',color:'#e6fffb',fontSize:11,padding:'7px 10px',borderRadius:8,maxWidth:'calc(100vw - 28px)'}}>
      QA visual P0 · Dados fictícios · Sem conexão com API
    </output>}
    {screen === 'home-legacy' && <button type="button" className="meg-integrated-preview__restart"
      onClick={() => setScreen('loading-entry')}>Rever sequência</button>}
  </div>;
}

const root = document.getElementById('meg-fluxo-integrado-root');
if (!root) throw new Error('MEG_INTEGRATED_PREVIEW_ROOT_MISSING');
createRoot(root).render(<React.StrictMode><FlowPreview/></React.StrictMode>);
