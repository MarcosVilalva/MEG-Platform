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
    data-evolution-loading-fidelity="master-artwork-fullscreen"
    data-evolution-loading-structure="viewport-artboard-v1"
    aria-live="polite"
    aria-busy={normalized < 100}
  >
    <div className="evo-loading-backdrop" aria-hidden="true">
      <img src={loadingMasterArtwork} alt=""/>
    </div>

    <section className="evo-loading-artboard">
      <div className="evo-loading-core">
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
      </div>

      <p className="evo-loading-a11y">
        MEG Finanças. Carregando seus dados. {message} {normalized}%.
      </p>
    </section>
  </main>;
}
