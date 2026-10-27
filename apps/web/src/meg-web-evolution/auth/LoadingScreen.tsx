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

const base = import.meta.env.BASE_URL;
const artwork = base + 'meg-web-evolution/visual-loading/';

/**
 * Tela 01 da revisão visual: arte decorativa separada da interface.
 * A API/roteador continua responsável por determinar quando termina o
 * carregamento. Não inventar percentuais, saldos, login nem timers de sucesso.
 */
export function LoadingScreen({
  onNavigateLogin,
  preview = true,
  progress = 0,
  message,
}: Props) {
  const value = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  const description = message ?? (
    preview
      ? 'Organizando suas finanças para o seu dia a dia.'
      : 'Organizando suas finanças para o seu dia a dia.'
  );
  const state = preview ? readPreviewState() : 'loading';

  if (state !== 'loading') {
    const failed = state === 'error';
    return (
      <main className="meg-login meg-loading-alt" aria-label={failed ? 'Falha no carregamento' : 'Nenhum dado para carregar'}>
        <section className="meg-login-panel meg-loading-state" role="status" aria-live="polite">
          <img src={artwork + 'logo.webp'} alt="MEG Finanças" width="160" height="130"/>
          <h1>{failed ? 'Não foi possível carregar os dados' : 'Nenhum dado para carregar'}</h1>
          <p>{failed
            ? 'Confira a conexão. Nenhuma operação financeira foi executada.'
            : 'Não há dados disponíveis para esta visualização.'}</p>
          <button type="button" className="meg-login-submit" onClick={onNavigateLogin}>Voltar ao login</button>
        </section>
      </main>
    );
  }

  return (
    <main className="meg-loading-screen"
      data-meg-loading={preview ? 'preview-only' : 'runtime'}
      aria-label="Carregando seus dados">
      <div className="meg-loading-background" aria-hidden="true" />
      <section className="meg-loading-composition" aria-labelledby="meg-loading-title">
        <img className="meg-loading-brand" src={artwork + 'logo.webp'} alt="MEG Finanças" />
        <img className="meg-loading-illustration" src={artwork + 'hologram.webp'} alt="" aria-hidden="true" />
        <div className="meg-loading-progress">
          <div className="meg-loading-track" role="progressbar"
            aria-label="Carregamento de dados"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={preview ? undefined : value}
            aria-valuetext={preview ? 'Prévia visual, sem consulta de dados' : value + '%'}>
            <span className="meg-loading-fill" style={preview ? undefined : { transform: `scaleX(${value / 100})` }} />
          </div>
          <h1 id="meg-loading-title">Carregando seus dados...</h1>
          <p>{description}</p>
        </div>
      </section>
      <span className="meg-loading-a11y" role="status" aria-live="polite">
        {preview ? 'Prévia visual de carregamento, sem consulta financeira.' : `Carregamento: ${value}%. ${description}`}
      </span>
    </main>
  );
}
