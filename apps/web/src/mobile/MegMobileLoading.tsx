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
        <span className="meg-loading-beam meg-loading-beam-a" />
        <span className="meg-loading-beam meg-loading-beam-b" />
        <span className="meg-loading-beam meg-loading-beam-c" />
        <span className="meg-loading-beam meg-loading-beam-d" />
        <span className="meg-loading-spark meg-loading-spark-a" />
        <span className="meg-loading-spark meg-loading-spark-b" />
        <span className="meg-loading-spark meg-loading-spark-c" />
        <span className="meg-loading-spark meg-loading-spark-d" />
      </div>

      <section className="meg-loading-layout">
        <header className="meg-loading-brand-stage">
          <div className="meg-loading-brand-lockup" aria-label="MEG Finanças">
            <img className="meg-loading-brand-symbol" src={asset('brand/meg-loading-lockup.svg')} alt="" aria-hidden="true" />
            <div className="meg-loading-wordmark" aria-hidden="true"><b>M</b><b>E</b><b className="accent">G</b></div>
            <div className="meg-loading-financas" aria-hidden="true">FINANÇAS</div>
          </div>
          <p className="meg-loading-tagline">SUAS FINANÇAS<br/>EM UM SÓ LUGAR</p>
        </header>

        <section className="meg-loading-scene" aria-hidden="true">
          <svg className="meg-loading-energy-grid" viewBox="0 0 420 250" preserveAspectRatio="none">
            <g className="meg-loading-grid-glow">
              <path d="M-20 88 C55 20 125 152 205 78 S350 35 445 94" />
              <path d="M-18 104 C70 36 120 170 215 94 S345 48 446 108" />
              <path d="M-15 121 C70 56 135 181 218 111 S350 66 444 124" />
              <path d="M-10 139 C75 76 145 192 225 129 S355 83 440 141" />
              <path d="M-4 158 C88 92 150 200 232 147 S360 101 435 158" />
              <path d="M10 177 C94 115 160 205 240 165 S355 123 425 176" />
              <path d="M34 195 C110 142 170 211 250 184 S350 145 404 194" />
            </g>
            <g className="meg-loading-grid-fine">
              <path d="M-20 70 C65 5 128 130 208 62 S350 17 445 76" />
              <path d="M-18 96 C66 28 132 156 213 85 S352 39 445 101" />
              <path d="M-12 132 C72 66 140 184 223 120 S354 75 442 135" />
              <path d="M0 169 C88 102 153 207 238 157 S355 114 430 168" />
              <path d="M20 207 C105 153 176 218 257 197 S350 164 410 205" />
              <path d="M42 25 L185 225" />
              <path d="M108 9 L248 233" />
              <path d="M182 6 L307 229" />
              <path d="M255 8 L366 214" />
              <path d="M331 24 L420 188" />
            </g>
            <g className="meg-loading-grid-nodes">
              <circle cx="54" cy="89" r="2.2"/><circle cx="96" cy="117" r="1.8"/>
              <circle cx="143" cy="90" r="2"/><circle cx="186" cy="136" r="2.2"/>
              <circle cx="230" cy="106" r="2"/><circle cx="279" cy="128" r="1.9"/>
              <circle cx="326" cy="94" r="2.2"/><circle cx="370" cy="124" r="1.8"/>
              <circle cx="78" cy="159" r="1.9"/><circle cx="124" cy="177" r="2.2"/>
              <circle cx="178" cy="165" r="1.8"/><circle cx="244" cy="174" r="2.1"/>
              <circle cx="307" cy="158" r="1.9"/><circle cx="355" cy="176" r="2.2"/>
            </g>
          </svg>
          <div className="meg-loading-tile meg-loading-tile-bars"><LoadingIcon name="bars" /></div>
          <div className="meg-loading-tile meg-loading-tile-card"><LoadingIcon name="card" /></div>
          <div className="meg-loading-tile meg-loading-tile-home"><LoadingIcon name="home" /></div>
          <div className="meg-loading-tile meg-loading-tile-pie"><LoadingIcon name="pie" /></div>
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
