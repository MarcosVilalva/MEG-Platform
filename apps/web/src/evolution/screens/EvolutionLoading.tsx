import '../styles/loading.css';

type EvolutionLoadingProps = {
  progress?: number;
  message?: string;
};

export function EvolutionLoading({progress=42,message='Organizando suas finanças para o seu dia a dia.'}:EvolutionLoadingProps){
  const normalized=Math.max(0,Math.min(100,progress));
  return <main className="evo-loading" data-evolution-screen="loading" aria-live="polite" aria-busy={normalized < 100}>
    <div className="evo-loading-orb evo-loading-orb-a" aria-hidden="true"/>
    <div className="evo-loading-orb evo-loading-orb-b" aria-hidden="true"/>
    <section className="evo-loading-stage">
      <div className="evo-loading-logo">
        <img src="./evolution/brand/meg-mark.svg" alt="MEG Finanças"/>
      </div>

      <div className="evo-loading-visual" aria-hidden="true">
        <span className="evo-loading-chip evo-loading-chip-a">↗</span>
        <span className="evo-loading-chip evo-loading-chip-b">◎</span>
        <span className="evo-loading-chip evo-loading-chip-c">▥</span>
        <div className="evo-loading-chart">
          <div className="evo-loading-grid"/>
          <div className="evo-loading-bars"><i/><i/><i/><i/><i/><i/></div>
          <svg viewBox="0 0 560 220" preserveAspectRatio="none">
            <path d="M10 188 C68 174 83 144 126 151 C169 158 181 118 224 126 C269 135 284 86 330 91 C376 97 396 53 441 60 C482 67 508 31 548 23"/>
            <circle cx="548" cy="23" r="7"/>
          </svg>
        </div>
      </div>

      <div className="evo-loading-copy">
        <h1>Carregando seus dados...</h1>
        <p>{message}</p>
      </div>

      <div className="evo-loading-progress" aria-label={`Carregamento ${normalized}%`}>
        <div><span style={{width:`${normalized}%`}}/></div>
        <small>{normalized}%</small>
      </div>
    </section>
  </main>;
}
