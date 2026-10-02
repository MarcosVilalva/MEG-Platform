import '../styles/loading.css';

type EvolutionLoadingProps = {
  progress?: number;
  message?: string;
};

function DonutIcon(){
  return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="28" className="ring-base"/><path d="M50 22a28 28 0 0 1 25 40" className="ring-a"/><path d="M75 62a28 28 0 0 1-45 8" className="ring-b"/></svg>;
}

function ListIcon(){
  return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="24" cy="30" r="4"/><circle cx="24" cy="50" r="4"/><circle cx="24" cy="70" r="4"/><path d="M38 30h35M38 50h29M38 70h20"/></svg>;
}

function TrendIcon(){
  return <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M20 68 43 48l17 12 22-28"/><path d="M70 32h12v12"/></svg>;
}

function TargetIcon(){
  return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="46" cy="56" r="24"/><circle cx="46" cy="56" r="14"/><circle cx="46" cy="56" r="5"/><path d="M63 39 82 20M72 20h10v10"/></svg>;
}

export function EvolutionLoading({progress=42,message='Organizando suas finanças para o seu dia a dia.'}:EvolutionLoadingProps){
  const normalized=Math.max(0,Math.min(100,progress));

  return <main className="evo-loading" data-evolution-screen="loading" aria-live="polite" aria-busy={normalized < 100}>
    <div className="evo-loading-aurora evo-loading-aurora-top" aria-hidden="true"/>
    <div className="evo-loading-aurora evo-loading-aurora-side" aria-hidden="true"/>
    <div className="evo-loading-arc evo-loading-arc-a" aria-hidden="true"/>
    <div className="evo-loading-arc evo-loading-arc-b" aria-hidden="true"/>

    <svg className="evo-loading-terrain evo-loading-terrain-left" viewBox="0 0 700 260" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 206 70 172 118 151 166 159 218 118 259 130 312 92 353 121 405 86 452 101 515 59 582 109 626 91 700 154 700 260 0 260Z"/>
      <path d="M0 214 93 180 167 191 226 151 302 164 361 132 425 151 487 114 558 154 626 132 700 173" className="terrain-edge"/>
    </svg>
    <svg className="evo-loading-terrain evo-loading-terrain-right" viewBox="0 0 700 260" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 172 66 131 123 144 179 105 238 126 288 85 347 111 397 67 453 99 514 63 571 110 622 88 700 135 700 260 0 260Z"/>
      <path d="M0 184 73 145 139 158 197 121 258 142 314 101 373 128 428 86 487 116 546 82 611 127 700 151" className="terrain-edge"/>
    </svg>

    <section className="evo-loading-stage">
      <div className="evo-loading-logo">
        <img src="./evolution/brand/meg-mark.svg" alt="MEG Finanças"/>
      </div>

      <div className="evo-loading-scene" aria-hidden="true">
        <div className="evo-floating-card evo-card-donut"><DonutIcon/></div>
        <div className="evo-floating-card evo-card-list"><ListIcon/></div>
        <div className="evo-floating-card evo-card-trend"><TrendIcon/></div>
        <div className="evo-floating-card evo-card-target"><TargetIcon/></div>

        <div className="evo-holo-column evo-holo-column-a"/>
        <div className="evo-holo-column evo-holo-column-b"/>
        <div className="evo-holo-column evo-holo-column-c"/>

        <div className="evo-holo-frame">
          <div className="evo-holo-grid"/>
          <div className="evo-holo-bars">
            <i/><i/><i/><i/><i/><i/>
          </div>
          <svg className="evo-holo-line" viewBox="0 0 560 250" preserveAspectRatio="none">
            <path d="M16 214 C58 198 83 169 116 174 C151 180 163 135 201 142 C240 150 256 104 295 111 C333 118 353 82 388 88 C432 96 452 54 492 62 C519 67 532 38 548 29"/>
            <circle cx="548" cy="29" r="8"/>
          </svg>
          <div className="evo-holo-point"/>
        </div>

        <div className="evo-holo-platform">
          <i/><i/><i/>
        </div>
      </div>

      <div className="evo-loading-progress" aria-label={`Carregamento ${normalized}%`}>
        <div><span style={{width:`${normalized}%`}}/></div>
        <small>{normalized}%</small>
      </div>

      <div className="evo-loading-copy">
        <h1>Carregando seus dados...</h1>
        <p>{message}</p>
      </div>
    </section>
  </main>;
}
