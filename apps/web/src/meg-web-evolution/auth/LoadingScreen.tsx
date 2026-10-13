import './login.css';
import './auth-screens.css';
import './loading.css';

type PreviewState = 'loading' | 'empty' | 'error';
type Props = { onNavigateLogin: () => void };

function readPreviewState(): PreviewState {
  const state = new URLSearchParams(window.location.search).get('state');
  return state === 'error' || state === 'empty' ? state : 'loading';
}

export function LoadingScreen({ onNavigateLogin }: Props) {
  // Prévia visual isolada. TODO: integrar somente quando o ciclo real de inicialização for autorizado.
  const state = readPreviewState();
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
    <main className="meg-loading-screen" aria-label="Carregando seus dados" data-meg-loading="preview-only">
      <img className="meg-loading-art" src={`${import.meta.env.BASE_URL}meg-web-evolution/loading-master.png`} alt="" aria-hidden="true" />
      <p className="meg-loading-a11y" role="status" aria-live="polite">Carregando seus dados. Organizando suas finanças para o seu dia a dia.</p>
      <div className="meg-loading-a11y" role="progressbar" aria-label="Carregamento de dados" aria-valuetext="Carregando" />
    </main>
  );
}
