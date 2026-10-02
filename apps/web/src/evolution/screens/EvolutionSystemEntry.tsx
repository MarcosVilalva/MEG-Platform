import '../styles/system-entry.css';

export function EvolutionSystemEntry(){
  return <main className="evo-system-entry" data-evolution-screen="system-entry">
    <div className="evo-system-entry-glow" aria-hidden="true"/>
    <section>
      <img src="./evolution/brand/meg-mark.svg" alt="MEG Finanças"/>
      <span>FLUXO VALIDADO</span>
      <h1>O MEG está pronto para abrir o sistema.</h1>
      <p>Esta tela é apenas a porta técnica temporária. O Shell Evolution será construído aqui na próxima etapa.</p>
      <div><i/>LOGIN <b>→</b> LOADING <b>→</b> SISTEMA</div>
    </section>
  </main>;
}
