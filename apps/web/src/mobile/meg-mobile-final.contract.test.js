import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const mobile = readFileSync(new URL('./MegMobileFinal.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('./MegMobileHome.tsx', import.meta.url), 'utf8');
const homeCss = readFileSync(new URL('./meg-mobile-home.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-final.css', import.meta.url), 'utf8');
const runtimeCss = readFileSync(new URL('./meg-mobile-runtime.css', import.meta.url), 'utf8');
const phoenix = readFileSync(new URL('../phoenix/PhoenixApp.tsx', import.meta.url), 'utf8');
const previewMain = readFileSync(new URL('../phoenix/preview-main.tsx', import.meta.url), 'utf8');
const phoenixWebStyles = readFileSync(new URL('../phoenix/PhoenixWebStyles.ts', import.meta.url), 'utf8');
const authCss = readFileSync(new URL('../phoenix/preview-auth-flow.css', import.meta.url), 'utf8');
const coreScreens = readFileSync(new URL('./MegMobileCoreScreens.tsx', import.meta.url), 'utf8');
const launchSheet = readFileSync(new URL('./MegMobileLaunchSheet.tsx', import.meta.url), 'utf8');
const coreCss = readFileSync(new URL('./meg-mobile-core-screens.css', import.meta.url), 'utf8');
const launchCss = readFileSync(new URL('./meg-mobile-launch-sheet.css', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./MegMobileSettings.tsx', import.meta.url), 'utf8');
const settingsCss = readFileSync(new URL('./meg-mobile-settings.css', import.meta.url), 'utf8');
const cardCenter = readFileSync(new URL('./MegMobileCardCenter.tsx', import.meta.url), 'utf8');
const benefitModal = readFileSync(new URL('./MegMobileBenefitModal.tsx', import.meta.url), 'utf8');
const source = mobile + '\n' + home + '\n' + homeCss + '\n' + css + '\n' + runtimeCss + '\n' + coreScreens + '\n' + launchSheet + '\n' + coreCss + '\n' + launchCss + '\n' + settings + '\n' + settingsCss + '\n' + cardCenter + '\n' + benefitModal;

assert.doesNotMatch(source, /\bpx-[a-z0-9-]+/i,
  'Reconstrução mobile final não pode reutilizar classes visuais .px-* do Phoenix legado.');
assert.doesNotMatch(mobile, /Phoenix(?:Sidebar|NavIcon|Reference|OperationalMobileHome|HomeDashboard|CardsGrid|Payables)/,
  'Reconstrução mobile final não pode importar componentes visuais Phoenix anteriores.');
assert.doesNotMatch(phoenix, /PhoenixMobileReferenceScreens/,
  'Shell não pode reintroduzir a implementação intermediária das três telas.');
assert.match(phoenix, /if \(nativeOperational && viewData\)[\s\S]*const nativeView[\s\S]*<MegMobileFinal[\s\S]*return <div className="phoenix-v15"/,
  'Qualquer rota com dados no APK deve permanecer na árvore mobile clean-room antes do shell Phoenix antigo.');
assert.match(phoenix, /VITE_MOBILE_APP === 'true' \|\| capacitorNative/,
  'Detecção do APK deve ter fallback nativo e não depender apenas da variável de build.');
assert.doesNotMatch(phoenix, /if \(nativeOperational && viewData && \[[^\]]+\]\.includes\(view\)\)/,
  'Android não pode voltar ao shell Phoenix por cair numa rota fora da lista mobile.');
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
  'Assets do APK devem resolver contra document.baseURI para funcionar dentro do WebView.');

for (const relative of [
  '../../public/assets/cards/approved-v6/mercado.webp',
  '../../public/assets/cards/latam-pass-platinum.webp',
  '../../public/assets/cards/approved-v6/azul.webp',
  '../../public/assets/cards/riachuelo-mastercard-visual.svg',
]) {
  assert.equal(existsSync(new URL(relative, import.meta.url)), true,
    `Arte de cartão obrigatória ausente: ${relative}`);
}

assert.match(
  mobile,
  /mercado.*meli[\s\S]*approved-v6\/mercado\.webp[\s\S]*latam-pass-platinum\.webp[\s\S]*approved-v6\/azul\.webp[\s\S]*riachuelo.*midway[\s\S]*riachuelo-mastercard-visual\.svg/i,
  'Carrossel deve resolver nomes reais e apelidos para artes horizontais estáveis.',
);
assert.match(homeCss, /\.meg-home-screen\{[\s\S]*height:100dvh[\s\S]*overflow:hidden/,
  'Home clean-room deve ocupar o viewport sem rolagem geral.');
assert.match(homeCss, /@media\(max-height:760px\)[\s\S]*@media\(max-height:680px\)/,
  'Home clean-room deve reduzir densidade conforme a altura do aparelho.');
assert.match(css, /\.meg2-user strong\{[\s\S]*display:block!important/,
  'Nome do usuário não pode desaparecer em aparelhos menores.');
assert.match(css, /MEG PREMIUM MOBILE — referência visual aprovada/,
  'Árvore mobile deve declarar explicitamente a identidade visual aprovada.');

assert.doesNotMatch(
  main + '\n' + previewMain,
  /classList\.add\([^\n]*meg-operational-mobile|classList\.add\([^\n]*native-mobile/,
  'Runtime Android não pode mais ativar marcadores visuais legados.',
);
assert.match(
  main,
  /document\.documentElement\.classList\.add\('meg-cleanroom-mobile'\)[\s\S]*document\.body\.classList\.add\('meg-cleanroom-mobile'\)/,
  'Bootstrap Android deve nascer diretamente no namespace clean-room.',
);
assert.match(
  previewMain,
  /document\.documentElement\.classList\.add\('meg-cleanroom-mobile'\)/,
  'Raiz do WebView deve declarar o runtime clean-room.',
);
assert.doesNotMatch(
  phoenix,
  /import ['"]\.\.\/mobile\/meg-mobile-premium\.css['"]/,
  'Shell Phoenix não pode importar a camada visual mobile legada.',
);
assert.doesNotMatch(
  previewMain,
  /classList\.add\('meg-operational-mobile'\)/,
  'Runtime do APK não pode voltar a ativar seletores visuais Phoenix antigos.',
);
assert.doesNotMatch(
  phoenix,
  /import ['"]\.\/phoenix-(?:v15|parity-v15|period|sidebar|operational-mobile|home-period-mobile|home-fidelity-v12|home-fidelity-v13|layers)\.css['"]/,
  'PhoenixApp não pode importar estaticamente CSS visual legado no bundle do APK.',
);
assert.match(
  previewMain,
  /else if \(!MEG_MOBILE_RUNTIME\) \{[\s\S]*import\('\.\/PhoenixWebStyles'\)/,
  'CSS Phoenix deve ser carregado apenas quando o runtime não é o APK.',
);
assert.match(
  phoenix,
  /if \(nativeOperational \|\| loadState\.status !== 'ready' \|\| view !== 'home'\) return;[\s\S]*warmFrequentScreens/,
  'APK não pode pré-carregar módulos visuais Phoenix antigos em segundo plano.',
);
assert.match(
  phoenixWebStyles,
  /phoenix-overlays\.css[\s\S]*phoenix-grid\.css[\s\S]*phoenix-launch-editor-polish\.css/,
  'CSS de componentes Web compartilhados deve permanecer centralizado no módulo exclusivo da Web.',
);
assert.match(
  phoenixWebStyles,
  /phoenix-v15\.css[\s\S]*phoenix-layers\.css/,
  'Página Web deve preservar seus estilos através do módulo Web isolado.',
);
assert.doesNotMatch(
  authCss,
  /body\.meg-operational-mobile/,
  'Fluxo de autenticação móvel não pode depender do marcador visual legado.',
);
assert.match(
  authCss,
  /body\.meg-cleanroom-mobile/,
  'Transição biométrica deve acompanhar o runtime clean-room.',
);
assert.match(
  runtimeCss,
  /OTA clean-room[\s\S]*\.meg-update-overlay[\s\S]*\.meg-update-dialog[\s\S]*\.meg-update-success-toast/,
  'OTA deve ter estilo próprio no runtime clean-room após remover o CSS premium legado.',
);
assert.match(
  runtimeCss,
  /html\.meg-cleanroom-mobile[\s\S]*body\.meg-cleanroom-mobile[\s\S]*overflow:hidden/,
  'Runtime clean-room deve controlar viewport e overflow sem depender do Phoenix.',
);
assert.doesNotMatch(
  homeCss + '\n' + css + '\n' + coreCss + '\n' + launchCss + '\n' + settingsCss,
  /(?:-webkit-)?backdrop-filter\s*:|(^|[;{])\s*filter\s*:/m,
  'CSS clean-room não pode depender de filtros de composição instáveis no Android WebView.',
);
assert.match(
  home,
  /Situação atual[\s\S]*monthLabel\(data\.month\)[\s\S]*Saldo disponível[\s\S]*Entradas no mês[\s\S]*Saídas no mês[\s\S]*Resultado do mês/,
  'Home atual deve seguir a composição final aprovada e usar o nome completo da competência.',
);
assert.match(
  mobile,
  /semanticIcon\(item\.description\)[\s\S]*meg2-pending-icon/,
  'Pendentes deve escolher ícone pelo conteúdo, não por posição arbitrária na lista.',
);
assert.match(
  coreCss,
  /\.meg3-kpis strong\{[\s\S]*text-overflow:clip[\s\S]*font-size:clamp\(10px,3\.05vw,15px\)/,
  'KPIs de Lançamentos devem reduzir tipografia em vez de truncar valores monetários.',
);
assert.match(
  css,
  /CONTRATO DE VIEWPORT FIXO[\s\S]*\.meg2-scroll\{[\s\S]*overflow:hidden!important/,
  'Cartões e Pendentes ainda devem usar viewport fixo enquanto aguardam reconstrução.',
);
assert.match(home,/data-meg-home="approved-four-periods"/,'Home deve declarar o checkpoint visual dos quatro períodos aprovados.');
assert.match(home,/meg-home-\$\{name\}\.svg/,'Ícones da Home devem ser resolvidos como assets externos estáveis no Android.');
assert.doesNotMatch(home,/<svg\b/,'Home não pode voltar a SVG inline no WebView.');
assert.match(homeCss,/\.meg-home-header\{[\s\S]*min-height:66px[\s\S]*grid-template-columns:46px minmax\(0,1fr\) 104px/,'Cabeçalho da Home deve preservar filtro compacto sem truncar o nome do usuário em telefones normais.');
assert.match(homeCss,/@media\(max-height:760px\)[\s\S]*\.meg-home-header\{min-height:60px[\s\S]*\.meg-home-dock\{min-height:58px/,'Telas baixas devem compactar a Home, nunca ampliar o cabeçalho ou o dock.');

assert.match(home,/Benefício Alimentação[\s\S]*Ações rápidas[\s\S]*Cartões[\s\S]*Pagar conta[\s\S]*Fluxo de caixa[\s\S]*Ver relatórios/,'Home deve preservar os blocos funcionais aprovados.');
assert.equal((home.match(/<QuickActions onNavigate=\{onNavigate\}\/?>/g)||[]).length,4,'Todos os estados devem reutilizar Ações rápidas para preservar a mesma base visual.');

assert.match(homeCss,/\.meg-home-quick\{height:82px;min-height:82px/,'Ações rápidas deve manter altura fixa compacta como na referência final.');

assert.match(home,/Resumo do mês[\s\S]*Saldo inicial[\s\S]*Saldo final[\s\S]*Contas pagas/,'Mês passado deve preservar a leitura histórica validada.');
assert.match(home,/data-home-state=\{state\}/,'Home deve expor o estado visual corrente para mês passado, atual, futuro, intervalo e tudo.');
assert.match(home,/Veja como foi o seu mês em uma visão simples\.[\s\S]*Receitas realizadas[\s\S]*Despesas realizadas[\s\S]*Resultado do mês[\s\S]*Saldo inicial[\s\S]*Saldo final[\s\S]*Contas pagas/,'Mês passado deve seguir a composição aprovada de seis indicadores.');

assert.match(home,/Projeção mensal[\s\S]*Saldo inicial projetado[\s\S]*Saldo após compromissos[\s\S]*Receitas previstas[\s\S]*Total de compromissos[\s\S]*Faturas de cartões[\s\S]*Outras pendências/,'Mês futuro deve preservar a projeção validada completa.');
assert.match(home,/Histórico completo[\s\S]*Saldo atual \(consolidado\)[\s\S]*Total de receitas[\s\S]*Total de despesas[\s\S]*Resultado consolidado[\s\S]*Total de lançamentos[\s\S]*Média mensal de receita[\s\S]*Média mensal de despesa/,'Tudo deve usar o painel histórico completo aprovado, sem virar um resumo vazio.');
assert.match(homeCss,/\.meg-home-content\.is-current,[\s\S]*display:grid[\s\S]*align-content:start/,'Todos os estados da Home devem usar composição compacta determinística, sem stretch vertical.');
assert.match(homeCss,/\.meg-home-past-grid\{[\s\S]*grid-template-rows:repeat\(3,72px\)/,'Mês passado deve usar seis cartões compactos, sem slabs elásticos.');
assert.match(homeCss,/\.meg-home-future-grid\{[\s\S]*grid-template-rows:repeat\(3,82px\)/,'Mês futuro deve manter o mesmo ritmo compacto da Home base.');
assert.doesNotMatch(home,/meg-home-title[\s\S]{0,220}<i>/,'Título da Home não pode reintroduzir o tile decorativo que gerava fragmentos no WebView.');

assert.match(mobile,/view === 'home' \? <MegMobileHome[\s\S]*: <div className=\{'meg2-shell/,'Home deve sair do shell meg2 antes das demais telas em reconstrução.');
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
  runtimeCss,
  /\[data-meg-scroll-region="true"\][\s\S]*overflow:auto/,
  'Runtime deve permitir rolagem somente em regiões internas explicitamente marcadas.',
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

assert.match(
  coreScreens,
  /MegMobileMovements[\s\S]*MegMobileHistory[\s\S]*MegMobileCashflow[\s\S]*MegMobileAnalytics/,
  'Lançamentos, Histórico, Fluxo e Relatórios devem possuir implementações mobile clean-room próprias.',
);
assert.match(
  coreScreens,
  /Visão do fluxo de caixa[\s\S]*Evolução diária[\s\S]*Tipo de relatório[\s\S]*meg3-donut[\s\S]*Evolução mensal/,
  'Fluxo e Relatórios devem oferecer painéis visuais completos, filtros e comparativo mensal.',
);
assert.match(launchSheet, /MegMobileLaunchSheet/,
  'Novo e edição devem usar formulário mobile clean-room próprio.');
assert.match(launchSheet, /runPhoenixSimpleEventWrite/,
  'Novo lançamento deve usar o writer de domínio.');
assert.match(launchSheet, /runPhoenixSimpleEventEdit/,
  'Edição deve usar o writer de domínio.');
assert.match(launchSheet, /runPhoenixSimpleEventArchive/,
  'Exclusão deve usar o writer de domínio.');
assert.match(
  launchSheet,
  /Usar valor negativo/,
  'Formulário clean-room deve oferecer troca explícita de sinal.',
);
assert.match(
  launchSheet,
  /negative && mode !== 'benefit' \? -parseAmount\(amount\) : parseAmount\(amount\)/,
  'Troca de sinal deve preservar o valor negativo no writer financeiro.',
);
assert.match(
  launchSheet,
  /cardStatementMonthForPurchase[\s\S]*cardDueDateForStatement[\s\S]*Visualizar parcelas/,
  'Parcelamento no cartão deve exibir prévia calculada pela regra real de fechamento e vencimento.',
);
assert.doesNotMatch(
  launchSheet + '\n' + coreScreens,
  /className=["'`]px-/,
  'Telas e formulário clean-room não podem reutilizar classes visuais Phoenix.',
);
assert.match(
  launchCss,
  /\.meg3-form-sheet\{[\s\S]*grid-template-rows:auto minmax\(0,1fr\) auto[\s\S]*overflow:hidden/,
  'Formulário mobile deve manter cabeçalho e ações fixos, com rolagem apenas no corpo.',
);
assert.match(
  settings,
  /MegMobileSettings[\s\S]*savePhoenixAvatarPreferenceCloud[\s\S]*getBiometricLoginStatus[\s\S]*notifications\/test-channels/,
  'Configurações do APK devem ter implementação clean-room funcional para perfil, biometria e notificações.',
);
assert.match(
  settings,
  /togglePaymentMethod[\s\S]*deactivatePaymentMethod[\s\S]*updatePaymentMethod/,
  'Configurações deve ativar e desativar formas de pagamento na base real.',
);
assert.match(
  settings,
  /toggleCard[\s\S]*cardsClient\.deactivate[\s\S]*cardsClient\.reactivate/,
  'Configurações deve ativar e desativar cartões na base real.',
);
assert.match(
  settingsCss,
  /\.meg4-settings\{[\s\S]*overflow:hidden[\s\S]*grid-template-rows:auto auto minmax\(0,1fr\)/,
  'Configurações deve manter viewport fixo e workspace interno rolável.',
);
assert.match(
  cardCenter,
  /MegMobileCardCenter[\s\S]*exportExcel[\s\S]*exportPdf/,
  'Central do cartão deve oferecer exportação Excel e PDF no fluxo clean-room.',
);
assert.match(
  mobile,
  /Lançamentos da fatura[\s\S]*setCenterOpen\(true\)[\s\S]*setSelectedRow\(row\)[\s\S]*DETALHE DA COMPRA/,
  'Cartões deve abrir a central e o detalhe funcional de cada compra.',
);
assert.match(
  cardCenter,
  /artUrl[\s\S]*meg3-cardcenter-hero[\s\S]*lastFour/,
  'Central do cartão deve preservar a arte real e a identidade do cartão selecionado.',
);
assert.match(
  benefitModal,
  /MegMobileBenefitModal[\s\S]*isPhoenixBenefitEvent/,
  'Benefício Alimentação deve usar modal clean-room ligado aos lançamentos reais.',
);
assert.match(
  mobile,
  /fromDate[\s\S]*toDate[\s\S]*meg2-pending-filter-sheet[\s\S]*meg2-pending-detail/,
  'Pendentes deve ter filtro de data funcional e modal de detalhes antes da edição.',
);
assert.match(
  mobile,
  /<dt>Categoria<\/dt>[\s\S]*<dt>Conta<\/dt>[\s\S]*<dt>Pagamento<\/dt>/,
  'Detalhe de Pendentes deve preservar categoria, conta e forma de pagamento.',
);


console.log('Contrato da reconstrução mobile final validado.');

assert.doesNotMatch(css,/^:root\s*\{/m,'Tokens do app móvel não podem vazar para :root.');
assert.match(css,/body\.meg-cleanroom-mobile\s*\{[\s\S]*--meg2-bg:/,'Tokens do app móvel devem ficar presos ao runtime clean-room.');
