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

type LoadingIconName = 'bars' | 'card' | 'home' | 'pie' | 'control' | 'shield' | 'trophy';

function LoadingIcon({ name }: { name: LoadingIconName }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'bars') return <svg {...common}><path d="M4 20V12M9.5 20V8M15 20v-5.5M20.5 20V4"/></svg>;
  if (name === 'card') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M7 15h4"/></svg>;
  if (name === 'home') return <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/></svg>;
  if (name === 'pie') return <svg {...common}><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.6A9 9 0 0 1 20.4 9H15z"/></svg>;
  if (name === 'control') return <svg {...common}><path d="m13 2-7 11h5l-1 9 8-12h-5z"/></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 3 5 6v5c0 4.6 2.7 8.1 7 10 4.3-1.9 7-5.4 7-10V6z"/><path d="m9.2 12 1.8 1.8 3.8-4"/></svg>;
  return <svg {...common}><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M9 15h6M12 13v6M8 21h8M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4"/></svg>;
}

const features = [
  { icon: 'control' as const, second: 'CONTROLE' },
  { icon: 'bars' as const, second: 'ORGANIZAÇÃO' },
  { icon: 'shield' as const, second: 'TRANQUILIDADE' },
  { icon: 'trophy' as const, second: 'RESULTADOS' },
];

export function MegMobileLoading({
  progress,
  stageLabel = 'Carregando sua experiência',
}: MegMobileLoadingProps) {
  const normalized = Math.max(6, Math.min(100, Number.isFinite(progress) ? progress : 12));
  const progressLabel = Math.round(normalized);
  const statusText = progressLabel >= 100 ? 'Tudo pronto' : 'Carregando sua experiência...';

  return (
    <main
      className="meg-loading-screen"
      data-meg-loading="validated-cleanroom"
      data-meg-loading-reference="approved-neon-built"
      aria-live="polite"
      aria-busy={normalized < 100}
      aria-label={`${stageLabel}. ${progressLabel}% concluído.`}
    >
      <div className="meg-loading-atmosphere" aria-hidden="true">
        <span className="beam beam-a" />
        <span className="beam beam-b" />
        <span className="beam beam-c" />
        <span className="beam beam-d" />
        <span className="spark spark-a" />
        <span className="spark spark-b" />
        <span className="spark spark-c" />
        <span className="spark spark-d" />
      </div>

      <section className="meg-loading-layout">
        <header className="meg-loading-brand-stage">
          <img className="meg-loading-brand" src={asset('brand/meg-loading-lockup.svg')} alt="MEG Finanças" />
          <p className="meg-loading-tagline">SUAS FINANÇAS<br/>EM UM SÓ LUGAR</p>
        </header>

        <section className="meg-loading-scene" aria-hidden="true">
          <div className="meg-loading-wave wave-back" />
          <div className="meg-loading-wave wave-front" />
          <div className="meg-loading-tile tile-bars"><LoadingIcon name="bars" /></div>
          <div className="meg-loading-tile tile-card"><LoadingIcon name="card" /></div>
          <div className="meg-loading-tile tile-home"><LoadingIcon name="home" /></div>
          <div className="meg-loading-tile tile-pie"><LoadingIcon name="pie" /></div>
        </section>

        <section className="meg-loading-progress-shell" aria-label="Progresso do carregamento">
          <div className="meg-loading-track" aria-hidden="true">
            <span className={progressLabel >= 100 ? 'complete' : ''} style={{ width: `${normalized}%` }} />
          </div>
          <div className="meg-loading-progress-copy">
            <span>{statusText}</span>
            <strong>{progressLabel}%</strong>
          </div>
        </section>

        <footer className="meg-loading-features" aria-label="Benefícios do MEG Finanças">
          {features.map((feature) => (
            <div className="meg-loading-feature" key={feature.second}>
              <span><LoadingIcon name={feature.icon} /></span>
              <p><b>MAIS</b><strong>{feature.second}</strong></p>
            </div>
          ))}
        </footer>
      </section>
    </main>
  );
}
