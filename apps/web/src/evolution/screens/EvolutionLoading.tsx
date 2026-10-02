import '../styles/loading.css';

type EvolutionLoadingProps = {
  progress?: number;
  message?: string;
};

const loadingMasterArtwork='./evolution/artwork/loading-master.webp';

export function EvolutionLoading({
  progress=42,
  message='Organizando suas finanças para o seu dia a dia.',
}:EvolutionLoadingProps){
  const normalized=Math.max(0,Math.min(100,progress));

  return <main
    className="evo-loading"
    data-evolution-screen="loading"
    data-evolution-loading-fidelity="master-artwork-fluid-viewport"
    aria-live="polite"
    aria-busy={normalized < 100}
  >
    <div className="evo-loading-atmosphere" aria-hidden="true">
      <i className="evo-loading-arc evo-loading-arc-top"/>
      <i className="evo-loading-arc evo-loading-arc-bottom"/>
      <i className="evo-loading-terrain evo-loading-terrain-left"/>
      <i className="evo-loading-terrain evo-loading-terrain-right"/>
    </div>

    <img
      className="evo-loading-master"
      src={loadingMasterArtwork}
      alt=""
      aria-hidden="true"
      draggable={false}
    />

    <div
      className="evo-loading-progress"
      role="progressbar"
      aria-label="Carregamento do MEG Finanças"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalized}
    >
      <span style={{width:normalized+'%'}}/>
    </div>

    <p className="evo-loading-a11y">
      MEG Finanças. Carregando seus dados. {message} {normalized}%.
    </p>
  </main>;
}
