import type { CSSProperties } from 'react';
import './login.css';
import './auth-screens.css';
import './loading.css';

type PreviewState = 'loading' | 'empty' | 'error';
type Props = {
  onNavigateLogin: () => void;
  preview?: boolean;
  progress?: number;
  message?: string;
};

function readPreviewState(): PreviewState {
  const state = new URLSearchParams(window.location.search).get('state');
  return state === 'error' || state === 'empty' ? state : 'loading';
}

export function LoadingScreen({
  onNavigateLogin,
  preview = true,
  progress = 0,
  message,
}: Props) {
  const value = Math.max(0, Math.min(100, progress));
  const description = message ?? (
    preview
      ? 'Prévia visual. Nenhum carregamento real está em execução.'
      : 'Preparando seu acesso...'
  );
  // Estados demonstrativos são exclusivos da rota de prévia.
  const state = preview ? readPreviewState() : 'loading';
  if (state !== 'loading') {
    const failed = state === 'error';
    return (
      <main className="meg-login meg-loading-alt" aria-label={failed ? 'Falha no carregamento' : 'Nenhum dado para carregar'}>
        <section className="meg-login-panel meg-loading-state" aria-live="polite" role="status">
          <img src={`${import.meta.env.BASE_URL}brand/logo-meg-financas.svg`} alt="MEG Finanças" width="120" height="118" />
          <h1>{failed ? 'Não foi possível carregar os dados' : 'Nenhum dado para carregar'}</h1>
          <p>{failed ? 'Confira a conexão. Este é um estado demonstrativo, sem operações financeiras.' : 'Estado vazio de demonstração. Nenhuma consulta financeira foi realizada.'}</p>
          <button type="button" className="meg-login-submit" onClick={onNavigateLogin}>Voltar ao login</button>
        </section>
      </main>
    );
  }

  return (
    <main className="meg-loading-screen" aria-label="Carregando seus dados" data-meg-loading={preview ? "preview-only" : "runtime"} style={{ "--meg-loading-art": `url(${import.meta.env.BASE_URL}meg-web-evolution/loading-master.png)` } as CSSProperties}>
      <img className="meg-loading-art" src={`${import.meta.env.BASE_URL}meg-web-evolution/loading-master.png`} alt="" aria-hidden="true" />
      <div className="meg-loading-mobile-copy" aria-hidden="true">
        <div className="meg-loading-mobile-track">
          <span style={{ transform: `scaleX(${value / 100})` }} />
        </div>
        <h1>Carregando seus dados...</h1>
        <p>{description}</p>
      </div>
      <p className="meg-loading-a11y" role="status" aria-live="polite">{description}</p>
      <div
        className="meg-loading-a11y"
        role="progressbar"
        aria-label="Inicialização do acesso"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% — ${description}`}
      />
    </main>
  );
}
