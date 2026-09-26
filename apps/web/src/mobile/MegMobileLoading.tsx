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

type FeatureIconName = 'control' | 'organization' | 'security' | 'results';

function FeatureIcon({ name }: { name: FeatureIconName }) {
  const base = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'control') {
    return <svg {...base}><path d="m13 2-7 11h5l-1 9 8-12h-5z"/></svg>;
  }
  if (name === 'organization') {
    return <svg {...base}><path d="M4 20V11M10 20V7M16 20v-5M22 20V4"/></svg>;
  }
  if (name === 'security') {
    return <svg {...base}><path d="M12 3 5 6v5c0 4.6 2.7 8.1 7 10 4.3-1.9 7-5.4 7-10V6z"/><path d="m9.2 12 1.8 1.8 3.8-4"/></svg>;
  }
  return <svg {...base}><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M9 15h6M12 13v6M8 21h8M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4"/></svg>;
}

const loadingFeatures: Array<{ icon: FeatureIconName; first: string; second: string }> = [
  { icon: 'control', first: 'MAIS', second: 'CONTROLE' },
  { icon: 'organization', first: 'MAIS', second: 'ORGANIZAÇÃO' },
  { icon: 'security', first: 'MAIS', second: 'TRANQUILIDADE' },
  { icon: 'results', first: 'MAIS', second: 'RESULTADOS' },
];

export function MegMobileLoading({
  progress,
  stageLabel = 'Carregando sua experiência',
}: MegMobileLoadingProps) {
  const normalized = Math.max(6, Math.min(100, Number.isFinite(progress) ? progress : 12));
  const progressLabel = Math.round(normalized);
  const statusText = progressLabel >= 100 ? 'Tudo pronto' : `${stageLabel}...`;

  return (
    <main
      className="meg-loading-screen"
      data-meg-loading="validated-cleanroom"
      data-meg-loading-reference="approved-neon-final"
      aria-live="polite"
      aria-busy={normalized < 100}
      aria-label={`${stageLabel}. ${progressLabel}% concluído.`}
    >
      <div className="meg-loading-background" aria-hidden="true">
        <span className="meg-loading-line line-a" />
        <span className="meg-loading-line line-b" />
        <span className="meg-loading-line line-c" />
        <span className="meg-loading-glow glow-a" />
        <span className="meg-loading-glow glow-b" />
      </div>

      <section className="meg-loading-layout">
        <div className="meg-loading-brand-stage">
          <img
            className="meg-loading-brand"
            src={asset('brand/meg-loading-lockup.svg')}
            alt="MEG Finanças"
          />
          <p className="meg-loading-tagline">
            SUAS FINANÇAS<br />
            EM UM SÓ LUGAR
          </p>
        </div>

        <div className="meg-loading-floating" aria-hidden="true">
          <span className="tile tile-chart"><FeatureIcon name="organization" /></span>
          <span className="tile tile-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M7 15h4"/>
            </svg>
          </span>
          <span className="tile tile-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/>
            </svg>
          </span>
          <span className="tile tile-pie">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.6A9 9 0 0 1 20.4 9H15z"/>
            </svg>
          </span>
        </div>

        <div className="meg-loading-progress-block">
          <div className="meg-loading-track" aria-hidden="true">
            <span className={progressLabel >= 100 ? 'complete' : ''} style={{ width: `${normalized}%` }} />
          </div>
          <div className="meg-loading-progress-copy">
            <span>{statusText}</span>
            <strong>{progressLabel}%</strong>
          </div>
        </div>

        <div className="meg-loading-features" aria-label="Benefícios do MEG Finanças">
          {loadingFeatures.map((feature) => (
            <div className="meg-loading-feature" key={feature.second}>
              <span><FeatureIcon name={feature.icon} /></span>
              <p><b>{feature.first}</b><strong>{feature.second}</strong></p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
