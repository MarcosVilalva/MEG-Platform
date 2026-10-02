import { WebNextIcon } from './WebNextIcon';
import '../styles/launcher.css';

export type WebNextLaunchPreset = 'expense' | 'income' | 'benefit';

export function WebNextLaunchSelector({
  open,
  onClose,
  onSelect,
}:{
  open:boolean;
  onClose:()=>void;
  onSelect:(preset:WebNextLaunchPreset)=>void;
}) {
  if(!open) return null;

  const select=(preset:WebNextLaunchPreset)=>{
    onClose();
    onSelect(preset);
  };

  return <div className="mnx-launcher-overlay" data-web-next-overlay="launcher">
    <button className="mnx-launcher-backdrop" type="button" aria-label="Fechar" onClick={onClose}/>
    <section className="mnx-launcher" role="dialog" aria-modal="true" aria-labelledby="mnx-launcher-title">
      <header>
        <div className="mnx-launcher-title-icon"><WebNextIcon name="plus"/></div>
        <div><span>NOVO MOVIMENTO</span><h2 id="mnx-launcher-title">O que deseja lançar?</h2><p>Escolha o tipo para abrir somente os campos necessários.</p></div>
        <button type="button" className="mnx-launcher-close" aria-label="Fechar" onClick={onClose}>×</button>
      </header>
      <div className="mnx-launcher-options">
        <button type="button" className="mnx-launch-option is-expense" onClick={()=>select('expense')}>
          <span><WebNextIcon name="payables"/></span>
          <div><strong>Despesa</strong><small>Saídas e gastos</small></div>
          <WebNextIcon name="chevron"/>
        </button>
        <button type="button" className="mnx-launch-option is-income" onClick={()=>select('income')}>
          <span><WebNextIcon name="receivables"/></span>
          <div><strong>Receita</strong><small>Entradas e recebimentos</small></div>
          <WebNextIcon name="chevron"/>
        </button>
        <button type="button" className="mnx-launch-option is-benefit" onClick={()=>select('benefit')}>
          <span><WebNextIcon name="food"/></span>
          <div><strong>Alimentação</strong><small>Usa o benefício Verocard</small></div>
          <WebNextIcon name="chevron"/>
        </button>
      </div>
      <footer>O MEG aplica automaticamente as regras financeiras do tipo escolhido.</footer>
    </section>
  </div>;
}
