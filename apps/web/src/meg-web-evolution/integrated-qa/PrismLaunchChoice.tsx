import {LaunchIcon,type LaunchIconName} from '../launches/LaunchIcon';
import './prism-launch-choice.css';

/**
 * MEG Prism 2.0, seletor visual exclusivo da QA unificada da Etapa 10.
 * O LaunchTypePicker homologado anteriormente permanece inalterado na origem.
 * Somente Despesa/Receita podem ser escolhidas; nenhum writer é executado.
 */
type EnabledType='expense'|'income';
type Option={
 id:EnabledType|'transfer'|'benefit';
 name:string;subtitle:string;icon:LaunchIconName;
 tags:readonly string[];enabled:boolean;
};
const options:readonly Option[]=[
 {id:'expense',name:'Despesa',subtitle:'Saídas, compras e gastos',icon:'exit3d',tags:['Conta','Cartão','Parcelas'],enabled:true},
 {id:'income',name:'Receita',subtitle:'Entradas e recebimentos',icon:'entry3d',tags:['Conta','Recorrência'],enabled:true},
 {id:'transfer',name:'Transferência',subtitle:'Movimentar valores entre contas',icon:'projection3d',tags:['Origem e destino','Entre contas'],enabled:false},
 {id:'benefit',name:'Benefício',subtitle:'Utilizar ou recarregar cartão benefício',icon:'wallet3d',tags:['Saldo','Recarga','Consumo'],enabled:false},
];

function StatusGlyph({locked}:{locked:boolean}){
 return <svg viewBox="0 0 24 24" width="21" height="21" fill="none"
  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  aria-hidden="true" focusable="false">
  {locked?<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>:
   <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>}
 </svg>;
}
export function PrismLaunchChoice({onChoose,onBack}:{onChoose:(type:EnabledType)=>void;onBack:()=>void}){
 return <div className="meg-prism-choice" data-testid="new-launch-types" aria-label="Escolha do tipo de lançamento MEG Prism">
  <div className="meg-prism-choice__body">
   <aside className="meg-prism-choice__intro">
    <div className="meg-prism-choice__intro-art" aria-hidden="true"/>
    <div className="meg-prism-choice__intro-content">
     <span className="meg-prism-choice__eyebrow">MEG PRISM 2.0</span>
     <div className="meg-prism-choice__hero-symbol" aria-hidden="true"><LaunchIcon name="projection3d"/></div>
     <h3>Organize cada <em>movimento.</em></h3>
     <p>Escolha como deseja registrar sua movimentação. Tudo começa pelo tipo certo de lançamento.</p>
     <span className="meg-prism-choice__intro-foot">Dados claros, decisões melhores.</span>
    </div>
   </aside>
   <div className="meg-prism-choice__options" role="group" aria-label="Tipos de lançamento">
    {options.map(option=><button key={option.id} type="button"
      className={'meg-prism-choice__card is-'+option.id}
      disabled={!option.enabled}
      aria-label={option.enabled?'Escolher '+option.name:option.name+' indisponível'}
      title={option.enabled?'Abrir '+option.name:'Disponível em uma etapa futura'}
      onClick={()=>{if(option.id==='expense'||option.id==='income')onChoose(option.id);}}>
      <span className="meg-prism-choice__card-art" aria-hidden="true"/>
      <span className="meg-prism-choice__card-top">
       <span className="meg-prism-choice__card-icon" aria-hidden="true"><LaunchIcon name={option.icon}/></span>
       <span className="meg-prism-choice__status">{option.enabled?'DISPONÍVEL':'EM BREVE'}</span>
      </span>
      <span className="meg-prism-choice__card-copy">
       <strong>{option.name}</strong>
       <small>{option.subtitle}</small>
      </span>
      <span className="meg-prism-choice__card-bottom">
       <span className="meg-prism-choice__tags" aria-hidden="true">{option.tags.map(tag=><span key={tag}>{tag}</span>)}</span>
       <span className="meg-prism-choice__go" aria-hidden="true"><StatusGlyph locked={!option.enabled}/></span>
      </span>
     </button>)}
   </div>
  </div>
  <footer className="meg-prism-choice__footer">
   <span><span className="meg-prism-choice__footer-dot" aria-hidden="true"/> Selecione Despesa ou Receita para continuar.</span>
   <button type="button" className="meg-prism-choice__back" onClick={onBack}>
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2"
     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m14 6-6 6 6 6"/><path d="M8 12h12"/></svg>
    Voltar
   </button>
  </footer>
 </div>;
}
