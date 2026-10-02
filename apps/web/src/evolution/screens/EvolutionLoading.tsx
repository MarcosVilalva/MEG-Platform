import '../styles/loading.css';
import part0 from '../artwork/loading-master.part-0';
import part1 from '../artwork/loading-master.part-1';
import part2 from '../artwork/loading-master.part-2';
import part3 from '../artwork/loading-master.part-3';
import part4 from '../artwork/loading-master.part-4';
import part5 from '../artwork/loading-master.part-5';
import part6 from '../artwork/loading-master.part-6';
import part7 from '../artwork/loading-master.part-7';

type EvolutionLoadingProps = {
  progress?: number;
  message?: string;
};

const loadingMasterArtwork='data:image/webp;base64,'+
  part0+part1+part2+part3+part4+part5+part6+part7;

export function EvolutionLoading({
  progress=42,
  message='Organizando suas finanças para o seu dia a dia.',
}:EvolutionLoadingProps){
  const normalized=Math.max(0,Math.min(100,progress));

  return <main
    className="evo-loading"
    data-evolution-screen="loading"
    data-evolution-loading-fidelity="master-artwork"
    aria-live="polite"
    aria-busy={normalized < 100}
  >
    <div className="evo-loading-backdrop" aria-hidden="true">
      <img src={loadingMasterArtwork} alt=""/>
    </div>

    <section className="evo-loading-artboard">
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
    </section>
  </main>;
}
