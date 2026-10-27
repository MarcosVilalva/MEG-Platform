/**
 * PR #648. Seletor de Novo Lançamento.
 * Arte em imagens WebP, controles nativos e sem mutação financeira nesta etapa.
 * Os arquivos reais são instalados em apps/web/public/meg-assets e não contêm
 * texto de interface, valores bancários nem ações clicáveis.
 */
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

export function LaunchTypePicker({
  onChoose, onBack,
}: { onChoose: (type: EnabledLaunchType) => void; onBack: () => void }) {
  return (
    <div className="meg-choice meg-choice--photo" data-testid="new-launch-types">
      <div className="meg-choice__body">
        <div className="meg-choice__hero">
          <span className="meg-choice__hero-photo" aria-hidden="true"/>
          <div className="meg-choice__hero-copy">
            <h3>Mais <em>controle</em> para o seu <em>dia a dia</em></h3>
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
                      {tag.label}
                    </span>
                  ))}
                  {!option.enabled && <span className="meg-choice__tag is-unavailable">Indisponível</span>}
                </span>
              </span>
              <span className="meg-choice__option-next" aria-hidden="true">
                <span className={option.enabled ? 'meg-choice__chevron' : 'meg-choice__padlock'}/>
              </span>
            </button>
          ))}
        </div>
      </div>
      <footer className="meg-choice__footer" aria-label="Informações sobre a experiência Web">
        {features.map(([title, description], index) => (
          <div className="meg-choice__feature" key={title}>
            <span className="meg-choice__feature-icon" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="meg-choice__feature-copy"><strong>{title}</strong><small>{description}</small></span>
          </div>
        ))}
        <button type="button" className="meg-choice__back-action" onClick={onBack}>
          <span aria-hidden="true" className="meg-choice__back-arrow">✓</span>
          Voltar
        </button>
      </footer>
    </div>
  );
}
