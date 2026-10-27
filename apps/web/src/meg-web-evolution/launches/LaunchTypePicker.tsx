import { LaunchVisualIcon, type LaunchVisualIconName } from './LaunchVisualIcon';

/**
 * Seleção visual oficial do Novo Lançamento.
 * Exclusivamente apresentação: o formulário e os writers canônicos permanecem
 * em NewLaunchForm. Fluxos sem contrato habilitado não recebem ação.
 */
type EnabledLaunchType = 'expense' | 'income';
type LaunchOption = {
  id: EnabledLaunchType | 'transfer' | 'benefit';
  title: string;
  subtitle: string;
  icon: LaunchVisualIconName;
  tags: { label: string; icon: LaunchVisualIconName; future?: boolean }[];
  enabled: boolean;
};

const options: LaunchOption[] = [
  {
    id: 'expense', title: 'Despesa', subtitle: 'Saídas, compras e gastos',
    icon: 'expense', enabled: true,
    tags: [
      { label: 'Conta', icon: 'account' },
      { label: 'Cartão', icon: 'payment', future: true },
      { label: 'Parcelas', icon: 'installments', future: true },
    ],
  },
  {
    id: 'income', title: 'Receita', subtitle: 'Entradas e recebimentos',
    icon: 'income', enabled: true,
    tags: [
      { label: 'Conta', icon: 'account' },
      { label: 'Recorrência', icon: 'arrow', future: true },
    ],
  },
  {
    id: 'transfer', title: 'Transferência', subtitle: 'Mover entre contas',
    icon: 'transfer', enabled: false,
    tags: [
      { label: 'Origem e destino', icon: 'transfer' },
      { label: 'Entre contas', icon: 'account' },
    ],
  },
  {
    id: 'benefit', title: 'Benefício', subtitle: 'Usar ou recarregar Verocard',
    icon: 'benefit', enabled: false,
    tags: [
      { label: 'Saldo', icon: 'payment' },
      { label: 'Consumo', icon: 'status' },
    ],
  },
];

/* A arte cenográfica é carregada de arquivos SVG externos como imagens
 * ilustrativas. Os botões, rótulos e estados permanecem componentes reais.
 * As imagens não contêm saldo, parcelas nem dados de usuários. */
function FooterFeature({
  name, title, description,
}: { name: LaunchVisualIconName; title: string; description: string }) {
  return <div className="meg-choice__feature">
    <span className="meg-choice__feature-icon"><LaunchVisualIcon name={name} width={24} height={24}/></span>
    <span className="meg-choice__feature-copy"><strong>{title}</strong><small>{description}</small></span>
  </div>;
}

export function LaunchTypePicker({ onChoose }: { onChoose: (type: EnabledLaunchType) => void }) {
  return (
    <div className="meg-choice" data-testid="new-launch-types">
      <div className="meg-choice__body">
        <div className="meg-choice__hero">
          <div className="meg-choice__hero-copy">
            <span className="meg-choice__eyebrow">NOVO LANÇAMENTO</span>
            <h3>Mais controle para o seu dia a dia</h3>
            <p>Escolha o tipo de lançamento e preencha as informações no formulário inteligente.
              O layout da versão Web se adapta à largura da sua tela.</p>
          </div>
          <span className="meg-choice__hero-art" aria-hidden="true"/>
        </div>
        <div className="meg-choice__options" role="group" aria-label="Tipos de lançamento">
          {options.map(option => (
            <button key={option.id} type="button"
              className={'meg-choice__option is-' + option.id}
              aria-label={option.enabled ? 'Escolher ' + option.title : option.title + ' indisponível'}
              disabled={!option.enabled}
              onClick={() => {
                if (option.id === 'income' || option.id === 'expense') onChoose(option.id);
              }}>
              <span className="meg-choice__option-icon">
                <LaunchVisualIcon name={option.icon} width={42} height={42}/>
              </span>
              <span className="meg-choice__option-text">
                <strong>{option.title}</strong>
                <small>{option.subtitle}</small>
                <span className="meg-choice__tags">
                  {option.tags.map(tag => (
                    <span className={'meg-choice__tag' + (tag.future ? ' is-future' : '')}
                      key={tag.label} title={tag.future ? 'Recurso específico indisponível neste formulário' : undefined}>
                      <LaunchVisualIcon name={tag.icon} width={15} height={15}/>
                      {tag.label}
                    </span>
                  ))}
                  {!option.enabled && <span className="meg-choice__tag is-unavailable">
                    <LaunchVisualIcon name="lock" width={14} height={14}/>Indisponível
                  </span>}
                </span>
              </span>
              <span className="meg-choice__option-art" aria-hidden="true"/>
              <span className="meg-choice__option-next"><LaunchVisualIcon name={option.enabled ? 'arrow' : 'lock'} width={23} height={23}/></span>
            </button>
          ))}
        </div>
      </div>
      <div className="meg-choice__footer" aria-label="Informações sobre o formulário">
        <FooterFeature name="monitor" title="Dimensionamento automático"
          description="Adapta-se à largura da sua tela."/>
        <FooterFeature name="typography" title="Tipografia ampliada"
          description="Mais legibilidade e conforto visual."/>
        <FooterFeature name="layout" title="Responsivo para Web"
          description="Aproveite melhor o espaço disponível."/>
        <FooterFeature name="arrow" title="Escolha uma opção"
          description="Selecione para continuar com segurança."/>
      </div>
    </div>
  );
}
