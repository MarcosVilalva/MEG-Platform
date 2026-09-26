import './meg-mobile-loading.css';

type MegMobileLoadingProps = {
  progress: number;
  stageLabel?: string;
};

function asset(path: string) {
  const configuredBase = import.meta.env.BASE_URL || '/';
  const base = configuredBase.endsWith('/') ? configuredBase : configuredBase + '/';
  const relative = base + path.replace(/^\/+/, '');
  try {
    return typeof document !== 'undefined' ? new URL(relative, document.baseURI).href : relative;
  } catch {
    return relative;
  }
}

export function MegMobileLoading({ progress, stageLabel = 'Carregando seus dados' }: MegMobileLoadingProps) {
  const normalized = Math.max(6, Math.min(100, Number.isFinite(progress) ? progress : 12));

  return (
    <main
      className="meg-loading-screen"
      data-meg-loading="validated-cleanroom"
      aria-live="polite"
      aria-busy={normalized < 100}
      aria-label={`${stageLabel}. ${normalized}% concluído.`}
    >
      <section className="meg-loading-layout">
        <div className="meg-loading-center">
          <img
            className="meg-loading-brand"
            src={asset('brand/meg-loading-lockup.svg')}
            alt="MEG Finanças"
          />

          <div className="meg-loading-progress" aria-hidden="true">
            <div className="meg-loading-track">
              <span style={{ width: `${normalized}%` }} />
            </div>
          </div>

          <p className="meg-loading-status">Carregando seus dados...</p>
        </div>

        <p className="meg-loading-footer">
          Organizando suas finanças<br />
          para o seu dia a dia.
        </p>
      </section>
    </main>
  );
}
