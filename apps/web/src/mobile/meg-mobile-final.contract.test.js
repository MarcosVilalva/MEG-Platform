import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mobile = readFileSync(new URL('./MegMobileFinal.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-final.css', import.meta.url), 'utf8');
const premiumCss = readFileSync(new URL('./meg-mobile-premium.css', import.meta.url), 'utf8');
const phoenix = readFileSync(new URL('../phoenix/PhoenixApp.tsx', import.meta.url), 'utf8');
const previewMain = readFileSync(new URL('../phoenix/preview-main.tsx', import.meta.url), 'utf8');
const movements = readFileSync(new URL('../phoenix/screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const source = mobile + '\n' + css;

assert.doesNotMatch(source, /\bpx-[a-z0-9-]+/i,
  'Reconstrução mobile final não pode reutilizar classes visuais .px-* do Phoenix legado.');
assert.doesNotMatch(mobile, /Phoenix(?:Sidebar|NavIcon|Reference|OperationalMobileHome|HomeDashboard|CardsGrid|Payables)/,
  'Reconstrução mobile final não pode importar componentes visuais Phoenix anteriores.');
assert.doesNotMatch(phoenix, /PhoenixMobileReferenceScreens/,
  'Shell não pode reintroduzir a implementação intermediária das três telas.');
assert.match(phoenix, /if \(nativeOperational && viewData && \(view === 'home' \|\| view === 'cards' \|\| view === 'payables'\)\)[\s\S]*<MegMobileFinal[\s\S]*return <div className="phoenix-v15"/,
  'Home, Cartões e Pendentes do APK devem retornar a árvore mobile nova antes do shell Phoenix antigo.');
assert.match(mobile, /cards\.concat\(cards, cards\)/,
  'Carrossel de cartões deve possuir cópias circulares para rolagem infinita real.');
assert.match(mobile, /index < cards\.length[\s\S]*scrollLeft \+=[\s\S]*index >= cards\.length \* 2[\s\S]*scrollLeft \+=/,
  'Carrossel deve recircular para frente e para trás sem travar nas extremidades.');
assert.match(mobile, /scroll-snap|scrollIntoView/,
  'Carrossel deve manter interação por gesto e centralização visual.');
assert.match(css, /\.meg2-app\{[\s\S]*position:fixed;inset:0/,
  'Nova interface deve possuir viewport próprio e independente do shell anterior.');
assert.match(css, /@media\(max-width:390px\)/,
  'Nova interface deve adaptar composição para telefones menores.');
assert.match(css, /@media\(max-width:340px\)/,
  'Nova interface deve possuir fallback para resoluções estreitas.');
assert.match(css, /env\(safe-area-inset-top\)/,
  'Cabeçalho deve respeitar safe area do Android/iOS.');
assert.match(css, /env\(safe-area-inset-bottom\)/,
  'Dock deve respeitar safe area inferior.');
assert.match(mobile, /PeriodSheet[\s\S]*Mês[\s\S]*Intervalo[\s\S]*Tudo/,
  'Filtro de período final deve ser novo e preservar Mês, Intervalo e Tudo.');
assert.doesNotMatch(source, /phoenix-mobile-reference\.css|PhoenixMobileReferenceScreens/,
  'Arquivos intermediários removidos não podem voltar a ser dependência da reconstrução final.');
assert.match(mobile, /new URL\(relative, document\.baseURI\)\.href/,
  'Assets reais do APK devem resolver contra document.baseURI para funcionar dentro do WebView.');
assert.match(mobile, /approved-v6\/mercado\.webp[\s\S]*approved-v6\/latam\.webp[\s\S]*approved-v6\/azul\.webp[\s\S]*approved-v6\/riachuelo\.webp/,
  'Carrossel deve usar as imagens reais aprovadas dos cartões.');
assert.match(css, /\.meg2-view-home \.meg2-scroll\{overflow:hidden\}/,
  'Home corrente deve caber no viewport sem rolagem geral.');
assert.match(css, /@media \(max-height:850px\)[\s\S]*@media \(max-height:760px\)/,
  'Home deve reduzir densidade também conforme a altura do aparelho.');
assert.match(css, /\.meg2-user strong\{[\s\S]*display:block!important/,
  'Nome do usuário não pode desaparecer em aparelhos menores.');
assert.match(css, /MEG PREMIUM MOBILE — referência visual aprovada/,
  'Nova árvore mobile deve declarar explicitamente a camada premium aprovada.');
assert.match(premiumCss, /\.px-launch-drawer[\s\S]*\.px-field input[\s\S]*\.px-meg-confirm-dialog/,
  'Formulários, campos e modais funcionais devem compartilhar o padrão premium do APK.');
assert.match(premiumCss, /\.px-mobile-movement-card[\s\S]*box-shadow/,
  'Lançamentos deve receber cartões premium com profundidade e contraste.');
assert.match(premiumCss, /meg-update-overlay[\s\S]*meg-update-dialog/,
  'Fluxo OTA deve usar a mesma identidade premium dos demais modais.');
assert.match(
  premiumCss,
  /\.px-top-left-home-compact[\s\S]*grid-template-columns:44px minmax\(0,1fr\) 82px/,
  'Cabeçalho das telas internas deve reservar espaço fixo para logo e usuário sem esmagar o filtro de período.',
);
assert.match(
  premiumCss,
  /\.px-native-home-period-copy strong[\s\S]*text-overflow:ellipsis/,
  'Filtro de período interno deve truncar com segurança sem sair do cabeçalho.',
);
assert.match(
  premiumCss,
  /\.px-home-user-identity strong[\s\S]*white-space:nowrap/,
  'Nome do usuário deve permanecer visível e estável no cabeçalho interno.',
);
assert.match(
  premiumCss,
  /\.px-mobile-movement-card[\s\S]*grid-template-columns:48px minmax\(0,1fr\) auto/,
  'Card de lançamento deve usar composição responsiva com coluna central elástica.',
);
assert.match(
  previewMain,
  /document\.body\.classList\.add\('meg-operational-mobile'\)/,
  'Runtime Android deve ativar explicitamente a classe que habilita o CSS premium.',
);
assert.match(
  previewMain,
  /document\.documentElement\.classList\.add\('meg-operational-mobile'\)/,
  'Raiz do WebView também deve declarar o runtime premium móvel.',
);
assert.match(
  mobile,
  /const title = periodMode === 'all'[\s\S]*compactMonth\(data\.month\)/,
  'Home do mês atual deve usar competência compacta como na prévia validada.',
);
assert.match(
  movements,
  /nativeOperational \? 'Lançamentos' : 'Controle financeiro'/,
  'No APK, Lançamentos deve usar o título aprovado em vez do título web antigo.',
);
assert.match(
  mobile,
  /semanticIcon\(item\.description\)[\s\S]*meg2-pending-icon/,
  'Pendentes deve escolher ícone pelo conteúdo, não por posição arbitrária na lista.',
);

assert.match(
  css,
  /CONTRATO DE VIEWPORT FIXO[\s\S]*\.meg2-scroll\{[\s\S]*overflow:hidden!important/,
  'Home, Cartões e Pendentes devem usar viewport fixo sem rolagem da tela inteira.',
);
assert.match(
  css,
  /\.meg2-statement-list\{[\s\S]*overflow-y:auto/,
  'Cartões deve rolar somente a lista de lançamentos da fatura.',
);
assert.match(
  css,
  /\.meg2-pending-list\{[\s\S]*overflow-y:auto/,
  'Pendentes deve rolar somente a lista de compromissos.',
);
assert.match(
  premiumCss,
  /CONTRATO GLOBAL DO APK: VIEWPORT FIXO \+ SCROLL INTERNO[\s\S]*body\.meg-operational-mobile \.px-content\{[\s\S]*overflow:hidden!important/,
  'Shell Phoenix móvel deve bloquear rolagem da tela inteira.',
);
assert.match(
  premiumCss,
  /\.px-content-movements \.px-mobile-movement-list\{[\s\S]*overflow-y:auto!important/,
  'Lançamentos deve rolar somente a lista interna.',
);
assert.match(
  premiumCss,
  /\.px-launch-drawer \.px-launch-form\{[\s\S]*overflow-y:auto!important/,
  'Formulário deve manter o drawer fixo e rolar somente o corpo do formulário.',
);
assert.match(
  premiumCss,
  /\.px-history-feed[\s\S]*overflow-y:auto!important/,
  'Histórico deve rolar a linha do tempo internamente.',
);
assert.match(
  premiumCss,
  /\.px-settings-workspace\{[\s\S]*overflow-y:auto!important/,
  'Configurações deve manter a tela fixa e rolar apenas o workspace interno.',
);
assert.match(
  mobile,
  /data-meg-fixed-screen="true"/,
  'As telas mobile principais devem declarar explicitamente o contrato de tela fixa.',
);
assert.match(
  mobile,
  /data-meg-scroll-region="true"/,
  'Listas móveis roláveis devem ser identificadas como regiões internas de scroll.',
);

console.log('Contrato da reconstrução mobile final validado.');
