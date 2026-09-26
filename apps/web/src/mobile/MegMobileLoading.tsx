import './meg-mobile-loading.css';

type MegMobileLoadingProps = {
  progress: number;
  stageLabel?: string;
};

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
      data-meg-loading-reference="approved-static-art"
      aria-live="polite"
      aria-busy={normalized < 100}
      aria-label={`${stageLabel}. ${progressLabel}% concluído.`}
    >
      <div className="meg-loading-static-art" aria-hidden="true" />
      <section className="meg-loading-progress-shell" aria-label="Progresso do carregamento">
        <div className="meg-loading-track" aria-hidden="true">
          <span className={progressLabel >= 100 ? 'complete' : ''} style={{ width: `${normalized}%` }} />
        </div>
        <div className="meg-loading-progress-copy">
          <span>{statusText}</span>
          <strong>{progressLabel}%</strong>
        </div>
      </section>
    </main>
  );
}
