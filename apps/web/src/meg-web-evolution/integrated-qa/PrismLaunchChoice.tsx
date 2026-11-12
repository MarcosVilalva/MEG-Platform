import {useId} from 'react';
/** QA Etapa 10: DOM, conteúdo e classes idênticos ao seletor fotográfico oficial.
 * Apenas SVGs receberam acabamento Prism 2.0. Não modifica o componente aprovado de origem. */
type EnabledLaunchType = 'expense' | 'income';
type LaunchOption = {
  id: EnabledLaunchType | 'transfer' | 'benefit';
  title: string;
  subtitle: string;
  tags: { label: string; future?: boolean }[];
  enabled: boolean;
};
const options: LaunchOption[] = [
  {
    id: 'expense', title: 'Despesa', subtitle: 'Saídas, compras e gastos',
    tags: [{ label: 'Conta' }, { label: 'Cartão', future: true }, { label: 'Parcelas', future: true }],
    enabled: true,
  },
  {
    id: 'income', title: 'Receita', subtitle: 'Entradas e recebimentos',
    tags: [{ label: 'Conta' }, { label: 'Recorrência', future: true }],
    enabled: true,
  },
  {
    id: 'transfer', title: 'Transferência', subtitle: 'Mover entre contas',
    tags: [{ label: 'Origem e destino' }, { label: 'Entre contas' }],
    enabled: false,
  },
  {
    id: 'benefit', title: 'Benefício', subtitle: 'Usar ou recarregar cartão benefício',
    tags: [{ label: 'Saldo' }, { label: 'Recarga' }, { label: 'Consumo' }],
    enabled: false,
  },
];
/** Três passos reais, sem publicidade sobre a tecnologia da interface. */
const features = [
  ['01 · Escolha', 'Selecione o tipo de movimentação.'],
  ['02 · Preencha', 'Informe os dados do lançamento.'],
  ['03 · Confira', 'Revise o resumo antes de continuar.'],
] as const;



/** Ícones semânticos dimensionais. IDs exclusivos por instância para evitar colisões SVG. */
function ChoiceTagGlyph({label}:{label:string}){
 const uid=useId().replace(/:/g,'');
 const stroke='meg-prism-choice-tag-'+uid;
 const isCard=label==='Cartão'||label==='Saldo';
 const isBank=label==='Conta'||label==='Entre contas';
 const isFlow=label==='Recorrência'||label==='Origem e destino'||label==='Recarga';
 return <svg className="meg-choice__tag-icon" viewBox="0 0 24 24" aria-hidden="true"
  focusable="false" fill="none" stroke={'url(#'+stroke+')'} strokeWidth="2.05"
  strokeLinecap="round" strokeLinejoin="round" data-meg-prism="icon-2">
  <defs><linearGradient id={stroke} x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stopColor="#f6fffc"/><stop offset=".42" stopColor="#79f8e8"/>
   <stop offset="1" stopColor="#0ba7b5"/></linearGradient></defs>
  {isCard?<><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18"/></>:
   isBank?<><path d="M3 9 12 4l9 5M4 9h16M6 10v9m6-9v9m6-9v9M3 20h18"/></>:
   isFlow?<><path d="M4 8h14l-3-3M20 16H6l3 3M18 8l-3 3M6 16l3-3"/></>:
   <><path d="M3 18h18M6 15l4-5 3 2 5-6"/></>}
 </svg>;
}
function ChoiceActionGlyph({available}:{available:boolean}){
 const uid=useId().replace(/:/g,'');
 const gradient='meg-prism-choice-action-'+uid;
 return <svg className="meg-choice__action-glyph" viewBox="0 0 24 24"
  aria-hidden="true" focusable="false" fill="none" stroke={'url(#'+gradient+')'}
  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" data-meg-prism="icon-2">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stopColor="#ffffff"/><stop offset=".5" stopColor={available?'#93fff6':'#d0e9e8'}/>
   <stop offset="1" stopColor={available?'#28d6cb':'#719aa3'}/></linearGradient></defs>
  {available?<><path d="m8 4 8 8-8 8"/><path d="m10 6 6 6-6 6" opacity=".27" strokeWidth="4"/></>:
   <><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1" fill="#c4e5e8" stroke="none"/></>}
 </svg>;
}
function ChoiceFeatureGlyph({index}:{index:number}){
 const uid=useId().replace(/:/g,'');
 const gradient='meg-prism-choice-feature-'+uid;
 return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none"
  stroke={'url(#'+gradient+')'} strokeWidth="2" strokeLinecap="round"
  strokeLinejoin="round" data-meg-prism="icon-2">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stopColor="#fff"/><stop offset=".45" stopColor="#91fff1"/>
   <stop offset="1" stopColor="#04b8bc"/></linearGradient></defs>
  {index===0?<><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12 3 3 5-6"/></>:
   index===1?<><path d="M7 3.5h8l4 4v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-14A2 2 0 0 1 7 3.5Z"/><path d="M14.5 3.5v4h4M8 12h8m-8 4h5"/></>:
   <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m7 10 1.5 1.5L11 9m2 1h4M7 16l1.5 1.5L11 15m2 1h4"/></>}
 </svg>;
}
function ChoiceBackGlyph(){
 const uid=useId().replace(/:/g,'');
 const gradient='meg-prism-choice-back-'+uid;
 return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
  focusable="false" fill="none" stroke={'url(#'+gradient+')'} strokeWidth="2.6"
  strokeLinecap="round" strokeLinejoin="round" data-meg-prism="icon-2">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stopColor="#f6fffd"/><stop offset=".6" stopColor="#08474c"/>
   <stop offset="1" stopColor="#001f2b"/></linearGradient></defs>
  <path d="m4 12 5 5L20 6"/>
 </svg>;
}
export function PrismCloseGlyph(){
 const uid=useId().replace(/:/g,'');
 const gradient='meg-prism-close-'+uid;
 return <svg className="meg-prism-close-glyph" viewBox="0 0 24 24" width="25" height="25"
  fill="none" stroke={'url(#'+gradient+')'} strokeWidth="2.55"
  strokeLinecap="round" aria-hidden="true" focusable="false" data-meg-prism="icon-2">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stopColor="#ffffff"/><stop offset=".48" stopColor="#a3fff4"/>
   <stop offset="1" stopColor="#1ccbc6"/></linearGradient></defs>
  <path d="M5 5 19 19M19 5 5 19"/>
 </svg>;
}

export function PrismLaunchChoice({
  onChoose, onBack,
}: { onChoose: (type: EnabledLaunchType) => void; onBack: () => void }) {
  return (
    <div className="meg-choice meg-choice--photo" data-testid="new-launch-types">
      <div className="meg-choice__body">
        <div className="meg-choice__hero">
          <span className="meg-choice__hero-photo" aria-hidden="true"/>
          <div className="meg-choice__hero-copy">
            <h3>Mais <em>controle</em><span>para o seu</span><em>dia a dia</em></h3>
            <p>Escolha o tipo de lançamento e preencha as informações no formulário inteligente.
              O layout da versão Web se adapta automaticamente à largura da sua tela,
              oferecendo mais espaço, organização e agilidade.</p>
          </div>
        </div>
        <div className="meg-choice__options" role="group" aria-label="Tipos de lançamento">
          {options.map(option => (
            <button key={option.id} type="button"
              className={'meg-choice__option is-' + option.id}
              aria-label={option.enabled ? 'Escolher ' + option.title : option.title + ' indisponível'}
              disabled={!option.enabled}
              onClick={() => {
                if (option.id === 'expense' || option.id === 'income') onChoose(option.id);
              }}>
              <span className="meg-choice__option-photo" aria-hidden="true"/>
              <span className="meg-choice__option-text">
                <strong>{option.title}</strong>
                <small>{option.subtitle}</small>
                <span className="meg-choice__tags">
                  {option.tags.map(tag => (
                    <span className={'meg-choice__tag' + (tag.future ? ' is-future' : '')}
                      key={tag.label}
                      title={tag.future ? 'Recurso específico ainda não habilitado neste formulário' : undefined}>
                      <ChoiceTagGlyph label={tag.label}/>{tag.label}
                    </span>
                  ))}
                  {!option.enabled && <span className="meg-choice__tag is-unavailable">Indisponível</span>}
                </span>
              </span>
              <span className="meg-choice__option-next" aria-hidden="true">
                <ChoiceActionGlyph available={option.enabled}/>
              </span>
            </button>
          ))}
        </div>
      </div>
      <footer className="meg-choice__footer" aria-label="Como registrar um lançamento">
        {features.map(([title, description], index) => (
          <div className="meg-choice__feature" key={title}>
            <span className="meg-choice__feature-icon" aria-hidden="true"><ChoiceFeatureGlyph index={index}/></span>
            <span className="meg-choice__feature-copy"><strong>{title}</strong><small>{description}</small></span>
          </div>
        ))}
        <button type="button" className="meg-choice__back-action" onClick={onBack}>
          <span aria-hidden="true" className="meg-choice__back-arrow"><ChoiceBackGlyph/></span>
          Voltar
        </button>
      </footer>
    </div>
  );
}
