/** Prévia isolada PR #654: versão refinada a partir da PR #648.
 * Quatro tipos e seus estados financeiros preservados.
 * SVGs, alinhamento e imagem continuam decorativos, sem gravação. */
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
    id: 'benefit', title: 'Benefício', subtitle: 'Usar ou recarregar Verocard',
    tags: [{ label: 'Saldo' }, { label: 'Consumo' }],
    enabled: false,
  },
];
const features = [
  ['Dimensionamento automático', 'O layout se adapta à largura da sua tela.'],
  ['Tipografia ampliada', 'Mais legibilidade e conforto visual.'],
  ['Responsivo para Web', 'Mais espaço e organização.'],
] as const;


// SVGs decorativos específicos desta etapa; nunca representam dado financeiro.
function ChoiceTagGlyph({label}: {label:string}) {
  const isCard = label === 'Cartão' || label === 'Saldo';
  const isBank = label === 'Conta' || label === 'Entre contas';
  const isFlow = label === 'Recorrência' || label === 'Origem e destino';
  return <svg className="meg-choice__tag-icon" viewBox="0 0 24 24"
    aria-hidden="true" focusable="false" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {isCard ? <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></> :
      isBank ? <><path d="M3 9 12 4l9 5M4 9h16M6 10v9m6-9v9m6-9v9M3 20h18"/></> :
      isFlow ? <><path d="M4 8h14l-3-3M20 16H6l3 3M18 8l-3 3M6 16l3-3"/></> :
      <><path d="M3 18h18M6 15l4-5 3 2 5-6"/></>}
  </svg>;
}
function ChoiceActionGlyph({available}: {available:boolean}) {
  return <svg className="meg-choice__action-glyph" viewBox="0 0 24 24"
    aria-hidden="true" focusable="false" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {available ? <path d="m9 5 7 7-7 7"/> :
      <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>}
  </svg>;
}
function ChoiceFeatureGlyph({index}: {index:number}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"
    fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round">
    {index === 0 ? <><rect x="3" y="4.5" width="18" height="13" rx="2"/><path d="M8 21h8m-4-3.5V21"/></> :
      index === 1 ? <><path d="m4 18 5-12 5 12M6 14h6m4 3h5m-2.5-9v9"/></> :
      <><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9h17m-11 0v11"/></>}
  </svg>;
}

export function LaunchTypePicker({
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
      <footer className="meg-choice__footer" aria-label="Informações sobre a experiência Web">
        {features.map(([title, description], index) => (
          <div className="meg-choice__feature" key={title}>
            <span className="meg-choice__feature-icon" aria-hidden="true"><ChoiceFeatureGlyph index={index}/></span>
            <span className="meg-choice__feature-copy"><strong>{title}</strong><small>{description}</small></span>
          </div>
        ))}
        <button type="button" className="meg-choice__back-action" onClick={onBack}>
          <span aria-hidden="true" className="meg-choice__back-arrow"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6"/></svg></span>
          Voltar
        </button>
      </footer>
    </div>
  );
}
