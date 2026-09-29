import { MegIcon } from './MegMobileIcon';
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
      <div className="meg-loading-grid" aria-hidden="true"/>
      <section className="meg-loading-layout">
        <div className="meg-loading-center">
          <img className="meg-loading-brand" src={asset('brand/meg-loading-lockup.svg')} alt="MEG Finanças"/>
          <p className="meg-loading-slogan">SUAS FINANÇAS<br/>EM UM SÓ LUGAR</p>

          <div className="meg-loading-progress">
            <div className="meg-loading-track" aria-hidden="true"><span style={{ width: `${normalized}%` }}/></div>
            <div className="meg-loading-progress-copy"><span>Carregando sua experiência...</span><b>{Math.round(normalized)}%</b></div>
          </div>

          <div className="meg-loading-benefits">
            <span><MegIcon name="bolt" size={18}/><b>MAIS<br/>CONTROLE</b></span>
            <span><MegIcon name="chart" size={18}/><b>MAIS<br/>ORGANIZAÇÃO</b></span>
            <span><MegIcon name="check" size={18}/><b>MAIS<br/>TRANQUILIDADE</b></span>
            <span><MegIcon name="trend" size={18}/><b>MAIS<br/>RESULTADOS</b></span>
          </div>
        </div>

        <p className="meg-loading-status">Carregando seus dados...</p>
        <p className="meg-loading-footer">Organizando suas finanças<br/>para o seu dia a dia.</p>
      </section>
    </main>
  );
}
