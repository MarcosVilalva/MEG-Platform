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
    id: 'benefit', title: 'Benefício', subtitle: 'Usar ou recarregar benefício',
    icon: 'benefit', enabled: false,
    tags: [
      { label: 'Saldo', icon: 'payment' },
      { label: 'Consumo', icon: 'status' },
    ],
  },
];

/* Ilustrações em SVG, sem informação monetária, dados simulados ou gráficos de
 * saldo. As linhas são exclusivamente ornamentais, conforme o print oficial. */
function HeroArt() {
  return (
    <svg className="meg-choice__hero-art" viewBox="0 0 540 335" preserveAspectRatio="xMidYMax slice"
      aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="meg-choice-mountains" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#074c53"/><stop offset=".7" stopColor="#02343c"/>
          <stop offset="1" stopColor="#00171f"/>
        </linearGradient>
        <linearGradient id="meg-choice-bars" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor="#005d64"/><stop offset="1" stopColor="#21f1e1"/>
        </linearGradient>
        <filter id="meg-choice-light"><feGaussianBlur stdDeviation="5"/></filter>
      </defs>
      <path d="m0 287 74-77 51 35 83-135 77 112 45-50 62 70 71-110 77 98v105H0Z"
        fill="url(#meg-choice-mountains)"/>
      <path d="m0 300 72-65 50 28 85-112 80 95 47-49 55 64 73-103 78 86"
        fill="none" stroke="#07898d" strokeWidth="1.1" opacity=".7"/>
      <g stroke="#108f93" strokeWidth=".7" opacity=".45">
        <path d="M0 312h540M0 282h540M0 252h540M0 222h540"/>
        <path d="M60 200v135M132 200v135M204 160v175M276 160v175M348 160v175M420 160v175"/>
      </g>
      <g fill="url(#meg-choice-bars)" opacity=".83">
        <rect x="296" y="266" width="22" height="69" rx="2"/>
        <rect x="332" y="244" width="22" height="91" rx="2"/>
        <rect x="368" y="215" width="22" height="120" rx="2"/>
        <rect x="404" y="185" width="22" height="150" rx="2"/>
        <rect x="440" y="157" width="22" height="178" rx="2"/>
      </g>
      <path d="M0 298C54 291 88 243 130 256S196 280 238 220 301 225 344 191 415 186 468 115"
        fill="none" stroke="#15fff0" strokeWidth="13" opacity=".26" filter="url(#meg-choice-light)"/>
      <path d="M0 298C54 291 88 243 130 256S196 280 238 220 301 225 344 191 415 186 468 115"
        fill="none" stroke="#2dfef0" strokeWidth="2.8"/>
      <g fill="#b2fff9" stroke="#0cf1e5" strokeWidth="3">
        <circle cx="130" cy="256" r="4"/><circle cx="238" cy="220" r="4"/>
        <circle cx="344" cy="191" r="4"/><circle cx="468" cy="115" r="4"/>
      </g>
    </svg>
  );
}

function OptionArt({ type }: { type: LaunchOption['id'] }) {
  switch (type) {
    case 'expense':
      return <svg viewBox="0 0 190 105" aria-hidden="true" focusable="false">
        <g fill="none" stroke="#ff5c75" strokeWidth="2" strokeLinejoin="round" opacity=".75">
          <path d="m32 20 13 2 13 48h87l16-40H47M66 78a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm62 0a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/>
          <path d="m63 37 85 2M70 51l72 2" opacity=".5"/>
        </g>
      </svg>;
    case 'income':
      return <svg viewBox="0 0 190 105" aria-hidden="true" focusable="false">
        <defs><linearGradient id="meg-choice-coins" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0cf8e7"/><stop offset="1" stopColor="#07585b"/></linearGradient></defs>
        <g stroke="#12cfc6" strokeWidth="1.5" fill="url(#meg-choice-coins)" fillOpacity=".27">
          <path d="M20 74v17c0 7 35 7 35 0V74M20 74a17.5 6 0 1 0 35 0 17.5 6 0 1 0-35 0Z"/>
          <path d="M73 54v37c0 7 35 7 35 0V54M73 54a17.5 6 0 1 0 35 0 17.5 6 0 1 0-35 0Z"/>
          <path d="M126 32v59c0 7 35 7 35 0V32M126 32a17.5 6 0 1 0 35 0 17.5 6 0 1 0-35 0Z"/>
        </g>
        <path d="m37 45 44-19 27 8 49-26m-15 0h15v15" fill="none" stroke="#3ffff0" strokeWidth="3"/>
      </svg>;
    case 'transfer':
      return <svg viewBox="0 0 190 105" aria-hidden="true" focusable="false">
        <g fill="none" stroke="#4aa7ff" strokeWidth="2">
          <path d="m7 49 35-27 35 27M12 49h60M16 88h52M19 54v29m14-29v29m17-29v29m14-29v29M111 49l35-27 35 27m-69 0h68m-64 39h61m-57-34v29m14-29v29m17-29v29m14-29v29"/>
          <path d="M70 69h49m-8-8 8 8-8 8" stroke="#2be7ff"/>
        </g>
      </svg>;
    case 'benefit':
      return <svg viewBox="0 0 190 105" aria-hidden="true" focusable="false">
        <g transform="rotate(-11 95 55)">
          <rect x="29" y="12" width="132" height="81" rx="9" fill="#142923" stroke="#b59b47" strokeWidth="1.7"/>
          <rect x="41" y="41" width="23" height="18" rx="4" fill="#8f7b37" stroke="#d9bb54"/>
          <path d="M41 50h23M51 41v18" stroke="#e8ce67" opacity=".7"/>
          <path d="M97 69q9-9 19 0t20 0" stroke="#eed36a" fill="none" strokeWidth="2"/>
        </g>
      </svg>;
  }
}

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
          <HeroArt/>
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
              <span className="meg-choice__option-art"><OptionArt type={option.id}/></span>
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
