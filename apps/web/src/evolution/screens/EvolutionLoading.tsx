import '../styles/loading.css';

type EvolutionLoadingProps = {
  progress?: number;
  message?: string;
};

const loadingSquare='./evolution/artwork/loading-master.webp';
const loadingWide='./evolution/artwork/loading-master-wide.webp';
const loadingUltraWide='./evolution/artwork/loading-master-ultrawide.webp';
const loadingTall='./evolution/artwork/loading-master-tall.webp';

export function EvolutionLoading({
  progress=42,
  message='Organizando suas finanças para o seu dia a dia.',
}:EvolutionLoadingProps){
  const normalized=Math.max(0,Math.min(100,progress));

  return <main
    className="evo-loading"
    data-evolution-screen="loading"
    data-evolution-loading-fidelity="master-artwork-responsive-fullscreen"
    aria-live="polite"
    aria-busy={normalized < 100}
  >
    <picture className="evo-loading-picture" aria-hidden="true">
      <source media="(min-aspect-ratio: 2/1)" srcSet={loadingUltraWide}/>
      <source media="(min-aspect-ratio: 4/3)" srcSet={loadingWide}/>
      <source media="(max-aspect-ratio: 3/4)" srcSet={loadingTall}/>
      <img className="evo-loading-master" src={loadingSquare} alt="" draggable={false}/>
    </picture>

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
