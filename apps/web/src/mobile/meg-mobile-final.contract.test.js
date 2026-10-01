import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const mobile = readFileSync(new URL('./MegMobileFinal.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-mobile-final.css', import.meta.url), 'utf8');
const runtimeCss = readFileSync(new URL('./meg-mobile-runtime.css', import.meta.url), 'utf8');
const phoenix = readFileSync(new URL('../phoenix/PhoenixApp.tsx', import.meta.url), 'utf8');
const previewMain = readFileSync(new URL('../phoenix/preview-main.tsx', import.meta.url), 'utf8');
const phoenixWebStyles = readFileSync(new URL('../phoenix/PhoenixWebStyles.ts', import.meta.url), 'utf8');
const authCss = readFileSync(new URL('../phoenix/preview-auth-flow.css', import.meta.url), 'utf8');
const coreScreens = readFileSync(new URL('./MegMobileCoreScreens.tsx', import.meta.url), 'utf8');
const launchSheet = readFileSync(new URL('./MegMobileLaunchSheet.tsx', import.meta.url), 'utf8');
const mobileHistory = readFileSync(new URL('./meg-mobile-description-history.ts', import.meta.url), 'utf8');
const picker = readFileSync(new URL('./MegMobilePicker.tsx', import.meta.url), 'utf8');
const pickerCss = readFileSync(new URL('./meg-mobile-picker.css', import.meta.url), 'utf8');
const mobileIcons = readFileSync(new URL('./MegMobileIcon.tsx', import.meta.url), 'utf8');
const coreCss = readFileSync(new URL('./meg-mobile-core-screens.css', import.meta.url), 'utf8');
const launchCss = readFileSync(new URL('./meg-mobile-launch-sheet.css', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./MegMobileSettings.tsx', import.meta.url), 'utf8');
const settingsCss = readFileSync(new URL('./meg-mobile-settings.css', import.meta.url), 'utf8');
const cardCenter = readFileSync(new URL('./MegMobileCardCenter.tsx', import.meta.url), 'utf8');
const cardCenterCss = readFileSync(new URL('./meg-mobile-card-center.css', import.meta.url), 'utf8');
const benefitModal = readFileSync(new URL('./MegMobileBenefitModal.tsx', import.meta.url), 'utf8');
const benefitCss = readFileSync(new URL('./meg-mobile-benefit.css', import.meta.url), 'utf8');
const writeGateway = readFileSync(new URL('../phoenix/data/phoenix-write-gateway.ts', import.meta.url), 'utf8');
const pendingWriteGateway = readFileSync(new URL('../phoenix/data/phoenix-pending-write-gateway.ts', import.meta.url), 'utf8');
const previewSnapshot = readFileSync(new URL('../../../api/src/modules/finance/phoenix-preview-snapshot.ts', import.meta.url), 'utf8');
const eventMutation = readFileSync(new URL('../../../api/src/modules/finance/event-mutation.ts', import.meta.url), 'utf8');
const source = mobile + '\n' + css + '\n' + runtimeCss + '\n' + coreScreens + '\n' + launchSheet + '\n' + mobileHistory + '\n' + picker + '\n' + pickerCss + '\n' + mobileIcons + '\n' + coreCss + '\n' + launchCss + '\n' + settings + '\n' + settingsCss + '\n' + cardCenter + '\n' + benefitModal;

assert.doesNotMatch(source, /\bpx-[a-z0-9-]+/i,
  'Reconstrução mobile final não pode reutilizar classes visuais .px-* do Phoenix legado.');
assert.doesNotMatch(mobile, /Phoenix(?:Sidebar|NavIcon|Reference|OperationalMobileHome|HomeDashboard|CardsGrid|Payables)/,
  'Reconstrução mobile final não pode importar componentes visuais Phoenix anteriores.');
assert.doesNotMatch(phoenix, /PhoenixMobileReferenceScreens/,
  'Shell não pode reintroduzir a implementação intermediária das três telas.');
assert.match(phoenix, /if \(nativeOperational && viewData && \['home','movements','cards','payables','history','cashflow','analytics','settings'\]\.includes\(view\)\)[\s\S]*<MegMobileFinal[\s\S]*return <div className="phoenix-v15"/,
  'Telas operacionais do APK devem retornar a árvore mobile clean-room antes do shell Phoenix antigo.');
assert.match(mobile, /items\.concat\(items, items\)/,
  'Carrossel de cartões deve possuir cópias circulares para rolagem infinita real.');
assert.match(mobile, /index < items\.length[\s\S]*scrollLeft \+=[\s\S]*index >= items\.length \* 2[\s\S]*scrollLeft \+=/,
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
assert.match(
  css,
  /MEG MOBILE CLEANROOM V2[\s\S]*grid-template-rows:auto minmax\(0,1fr\) calc\(var\(--meg-dock-height\) \+ var\(--meg-dock-gap\)\)/,
  'Shell clean-room deve reservar faixa própria para conteúdo e dock.',
);
assert.match(
  css,
  /\.meg2-dock\{[\s\S]*height:var\(--meg-dock-height\)!important[\s\S]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/,
  'Dock canônico deve ter altura única e cinco colunas iguais.',
);
assert.match(
  css,
  /\.meg2-dock>\.meg2-new[\s\S]*grid-column:3!important[\s\S]*\.meg2-dock>\.meg2-new>span:first-child\{[\s\S]*left:50%!important[\s\S]*width:50px!important[\s\S]*height:50px!important[\s\S]*aspect-ratio:1\/1!important/,
  'Botão Novo deve permanecer na terceira coluna com círculo 50x50 e proporção fixa.',
);
assert.match(
  mobile,
  /className="meg2-brand"[\s\S]*onClick=\{onHome\}[\s\S]*aria-label="Voltar para a Home"/,
  'Marca MEG no cabeçalho deve ser um atalho permanente para a Home.',
);
assert.match(
  css,
  /\.meg2-brand\{[\s\S]*background:transparent!important[\s\S]*\.meg2-brand img\{[\s\S]*object-fit:contain!important/,
  'Marca MEG deve aparecer sem card de fundo e manter proporção integral.',
);
assert.match(mobile, /PeriodSheet[\s\S]*Mês[\s\S]*Intervalo[\s\S]*Tudo/,
  'Filtro de período final deve ser novo e preservar Mês, Intervalo e Tudo.');
assert.doesNotMatch(source, /phoenix-mobile-reference\.css|PhoenixMobileReferenceScreens/,
  'Arquivos intermediários removidos não podem voltar a ser dependência da reconstrução final.');
assert.match(mobile, /new URL\(relative, document\.baseURI\)\.href/,
  'Assets do APK devem resolver contra document.baseURI para funcionar dentro do WebView.');

for (const relative of [
  '../../public/assets/cards/mercado-pago-visa-v662.svg',
  '../../public/assets/cards/latam-user-model-v61.svg',
  '../../public/assets/cards/azul-itau-platinum-v659.svg',
  '../../public/assets/cards/riachuelo-mastercard-visual.svg',
  '../../public/assets/cards/verocard-alimentacao-v659.svg',
]) {
  assert.equal(existsSync(new URL(relative, import.meta.url)), true,
    `Arte de cartão obrigatória ausente: ${relative}`);
}

assert.match(
  mobile,
  /mercado.*meli[\s\S]*mercado-pago-visa-v662\.svg[\s\S]*latam-user-model-v61\.svg[\s\S]*azul-itau-platinum-v659\.svg[\s\S]*riachuelo.*midway[\s\S]*riachuelo-mastercard-visual\.svg/i,
  'Carrossel deve usar artes recortadas e estáveis para preencher os cartões ativos.',
);

assert.match(
  launchSheet,
  /function cardImage[\s\S]*latam-user-model-v61\.svg[\s\S]*azul-itau-platinum-v659\.svg[\s\S]*mercado-pago-visa-v662\.svg[\s\S]*riachuelo-mastercard-visual\.svg/,
  'Seletor de cartão da despesa deve reutilizar exatamente as artes finais aprovadas no módulo Cartões.',
);
assert.doesNotMatch(
  launchSheet,
  /cardImage[\s\S]{0,900}approved-v6\/(?:latam|azul|mercado|riachuelo)\.webp/,
  'Seletor de cartão não pode voltar às artes antigas ou quebradas de approved-v6.',
);
assert.match(
  launchSheet,
  /imageKind: cardImage\(card\.name\) \? 'card' : undefined/,
  'Opções de cartão devem sinalizar thumbnail com proporção própria de cartão.',
);
assert.match(
  picker,
  /imageKind\?: 'card' \| 'square'[\s\S]*meg5-picker-option-icon image \$\{item\.imageKind === 'card' \? 'card' : 'square'\}/,
  'Picker deve suportar thumbnail específica de cartão sem afetar outras imagens.',
);
assert.match(
  pickerCss,
  /CARD PICKER V1[\s\S]*\.meg5-picker-option-icon\.image\.card\{[\s\S]*width:62px[\s\S]*height:39px[\s\S]*object-fit:cover[\s\S]*grid-template-columns:62px minmax\(0,1fr\)/,
  'Miniaturas de cartão devem manter proporção horizontal, enquadramento central e linha alinhada.',
);
assert.match(css, /CONTRATO DE VIEWPORT FIXO[\s\S]*\.meg2-scroll\{[\s\S]*overflow:hidden!important/,
  'Home corrente deve caber no viewport sem rolagem geral.');
assert.match(css, /@media \(max-height:820px\)[\s\S]*@media \(max-height:700px\)/,
  'Home deve reduzir densidade também conforme a altura do aparelho.');
assert.match(css, /\.meg2-user strong\{[\s\S]*display:block!important/,
  'Nome do usuário não pode desaparecer em aparelhos menores.');
assert.doesNotMatch(css, /MEG PREMIUM MOBILE — referência visual aprovada|FIDELIDADE FINAL — referência aprovada/,
  'CSS mobile canônico não pode reintroduzir camadas visuais históricas concorrentes.');

assert.match(
  previewMain,
  /document\.body\.classList\.remove\('meg-operational-mobile'\)[\s\S]*document\.body\.classList\.add\('meg-cleanroom-mobile'\)/,
  'Runtime Android deve remover o marcador visual legado e ativar apenas o clean-room.',
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
  css + '\n' + coreCss + '\n' + launchCss + '\n' + settingsCss,
  /(?:-webkit-)?backdrop-filter\s*:|(^|[;{])\s*filter\s*:/m,
  'CSS clean-room não pode depender de filtros de composição instáveis no Android WebView.',
);
assert.match(
  mobile,
  /if \(periodMode === 'all'\) return <AllHistoryHome[\s\S]*const title = periodMode === 'range'[\s\S]*monthLabel\(data\.month\)/,
  'Home deve separar o histórico completo da competência mensal sem perder o nome do mês no corpo da tela.',
);
assert.match(
  mobile,
  /function AllHistoryHome[\s\S]*Histórico completo[\s\S]*Total de receitas[\s\S]*Total de despesas[\s\S]*Resultado consolidado[\s\S]*Ver detalhamento do histórico/,
  'Filtro Tudo deve possuir visão consolidada própria conforme a referência visual aprovada.',
);
assert.match(
  mobile,
  /semanticIcon\(item\.description, item\.category\)[\s\S]*meg2-pending-icon/,
  'Pendentes deve escolher ícone pela classificação/categoria antes do fallback textual.',
);
assert.match(
  coreCss,
  /\.meg3-kpis strong\{[\s\S]*text-overflow:clip[\s\S]*font-size:clamp\(10px,3\.05vw,15px\)/,
  'KPIs de Lançamentos devem reduzir tipografia em vez de truncar valores monetários.',
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
  /meg3-value-sign[\s\S]*Marcar como estorno/,
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
  /\.meg3-form-sheet\.meg3-launch-flow\{[\s\S]*grid-template-rows:auto auto minmax\(0,1fr\) auto var\(--meg-dock-height[\s\S]*overflow:hidden/,
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
  /Lançamentos da fatura[\s\S]*openActiveCenter[\s\S]*setSelectedRow\(creditRow\)[\s\S]*DETALHE DA COMPRA/,
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


assert.match(
  mobile,
  /preparePhoenixPendingBatchSettlement[\s\S]*runPhoenixPendingBatchSettlement[\s\S]*Baixar lote[\s\S]*Revisar baixa[\s\S]*Confirmar e dar baixa/,
  'Pendentes deve revisar e confirmar explicitamente a baixa atômica em lote pelo gateway idempotente.',
);
assert.match(
  mobile,
  /settlementSuccess[\s\S]*BAIXA CONFIRMADA[\s\S]*Data[\s\S]*Conta[\s\S]*Pagamento/,
  'Baixa de Pendentes deve apresentar confirmação com dados efetivos da operação.',
);
assert.match(
  mobile,
  /financeClient\.getMonetaryBalance[\s\S]*settlementMissing[\s\S]*Falta para baixar/,
  'Baixa deve consultar saldo real da conta e informar exatamente quanto falta quando insuficiente.',
);
assert.match(
  mobile,
  /setSelected\(null\)[\s\S]*setSettlementItems\(items\)[\s\S]*setSettlementStep\('form'\)/,
  'Ao iniciar a baixa, o detalhe deve sair do caminho e abrir um fluxo próprio para um ou vários itens.',
);
assert.match(
  mobile,
  /Confirme antes de movimentar o saldo[\s\S]*Saldo antes[\s\S]*Saldo após/,
  'Confirmação final deve mostrar data, conta, forma e impacto no saldo antes da gravação.',
);
assert.match(
  css,
  /PENDENTES BAIXA V2[\s\S]*z-index:2147482320!important[\s\S]*\.meg2-pending-balance-card\.danger[\s\S]*\.meg2-pending-confirm/,
  'Modal de baixa deve ficar acima do detalhe e exibir proteção visual de saldo e confirmação premium.',
);
assert.match(
  mobile,
  /isProjectedCardPending[\s\S]*cardGroups[\s\S]*statementMonth[\s\S]*itemCount[\s\S]*cardLines/,
  'Pendentes deve consolidar parcelas de cartão por cartão/fatura antes da baixa.',
);
assert.equal(
  mobile.includes('meg2-pending-date-heading') &&
  mobile.includes('batchSelected') &&
  mobile.includes('Baixar lote'),
  true,
  'Pendentes deve agrupar visualmente por vencimento e permitir seleção múltipla.',
);
assert.match(
  mobile,
  /DETALHES DA FATURA[\s\S]*meg2-pending-card-lines[\s\S]*semanticIcon/,
  'Fatura agrupada deve abrir detalhe com seus lançamentos e ícones semânticos antes da baixa.',
);
assert.match(
  css,
  /PENDENTES V3[\s\S]*\.meg2-pending-batchbar[\s\S]*\.meg2-pending-card-lines[\s\S]*place-items:start center!important/,
  'Pendentes V3 deve manter barra de lote, detalhe de fatura e modais alinhados ao topo.',
);
assert.match(
  css,
  /\.meg2-pending-settle>footer \.secondary\{[\s\S]*background:linear-gradient[\s\S]*color:#cce5e2!important/,
  'Cancelar da baixa deve seguir o padrão secundário teal e nunca voltar ao botão branco.',
);
assert.match(
  launchSheet,
  /visibleAccounts[\s\S]*mode === 'income' \? true[\s\S]*benefitIncome[\s\S]*isVerocard/,
  'Receita deve permitir selecionar conta Benefício e restringir a forma a Verocard quando aplicável.',
);
assert.match(
  launchSheet,
  /benefitIncome[\s\S]*runPhoenixBenefitEventWrite[\s\S]*type: 'income'/,
  'Crédito do Verocard deve usar o writer especializado de benefício como receita realizada.',
);
assert.match(
  mobileHistory,
  /if \(event\.type === 'income'\) return 'income'[\s\S]*primeMegMobileHistorySuggestions[\s\S]*prewarmMegMobileHistorySuggestions/,
  'Histórico deve incluir receitas de benefício e ter índice rápido pré-aquecido.',
);
assert.match(
  launchSheet,
  /primeMegMobileHistorySuggestions\(data\.events\.items\)[\s\S]*prewarmMegMobileHistorySuggestions\(\)[\s\S]*}, 20\);/,
  'Busca do histórico mobile deve responder primeiro pelo snapshot local e usar debounce curto.',
);
assert.match(
  launchSheet,
  /event\?\.categoryId \|\| event\?\.category\?\.id[\s\S]*event\?\.paymentMethodId \|\| event\?\.paymentMethod\?\.id/,
  'Edição deve hidratar categoria e forma de pagamento também pelos objetos do read model.',
);
assert.match(
  launchSheet,
  /selectedCategory[\s\S]*fixo[\s\S]*setStatus\('paid'\)/i,
  'Categoria Fixo deve marcar a despesa como realizada automaticamente.',
);


assert.match(
  launchSheet,
  /ExpensePaymentMode[\s\S]*À Vista[\s\S]*Crédito/,
  'Novo lançamento deve preservar as modalidades À vista e Crédito.',
);
assert.doesNotMatch(launchSheet, />Crediário<\/button>/, 'Crediário legado não deve aparecer na criação de novos lançamentos.');
assert.match(
  launchSheet,
  /isPixMethod[\s\S]*expensePaymentMode === 'cash'[\s\S]*setPaymentMethodId\(pixMethod\?\.id/,
  'À vista deve preferir PIX automaticamente sem impedir troca da forma de pagamento.',
);


assert.ok(
  mobileIcons.includes("type === 'income'") &&
  mobileIcons.includes("signed > 0") &&
  mobileIcons.includes("return 'banknote'"),
  'Receita deve usar ícone de dinheiro com prioridade sobre categoria ou descrição.',
);
assert.ok(
  mobileIcons.includes('context.categoryName') &&
  mobileIcons.includes('context.categoryGroup') &&
  mobileIcons.includes('context.sourceGroup') &&
  mobileIcons.indexOf('byClassification') < mobileIcons.indexOf('context.paymentName') &&
  mobileIcons.indexOf('context.paymentName') < mobileIcons.indexOf('byDescription'),
  'Ícone financeiro deve priorizar categoria e grupo antes de forma de pagamento e descrição.',
);

console.log('Contrato da reconstrução mobile final validado.');

assert.match(
  mobile,
  /VEROCARD_ART_URL[\s\S]*benefit-verocard[\s\S]*Verocard Alimentação[\s\S]*benefitBalance[\s\S]*benefitCredits[\s\S]*benefitUsed/,
  'Cartões deve incluir Verocard como cartão-benefício com saldo, recargas e consumo reais.',
);
assert.match(
  mobile,
  /data\.cards\.filter\(\(card\) => card\.isActive !== false\)[\s\S]*carouselCards/,
  'Carrossel deve usar somente cartões de crédito ativos do cadastro.',
);
assert.match(
  cardCenter,
  /Resumo[\s\S]*>Atual<\/button>[\s\S]*Próximas[\s\S]*Parcelas[\s\S]*Histórico/,
  'Central do cartão de crédito deve preservar as visões validadas de fatura e histórico.',
);
assert.match(
  cardCenter,
  /MegMobileBenefitCardCenter[\s\S]*Saldo disponível[\s\S]*Recargas no mês[\s\S]*Consumo no mês[\s\S]*Entradas[\s\S]*Saídas/,
  'Central do Verocard deve usar regra própria de benefício, sem limite ou fatura futura.',
);
assert.doesNotMatch(
  mobile,
  /<dt>Forma de pagamento<\/dt><dd>Cartão de crédito<\/dd>/,
  'Detalhe da compra não deve repetir forma de pagamento quando o cartão já é a fonte da verdade.',
);
assert.match(
  mobile,
  /Fatura \/ competência[\s\S]*Vencimento[\s\S]*Parcelamento/,
  'Detalhe da compra deve informar competência, vencimento e parcelamento.',
);

assert.match(
  cardCenter,
  /Limite total[\s\S]*MegIcon name="wallet"[\s\S]*Disponível|MegIcon name="wallet"[\s\S]*Limite total/,
  'Central deve usar iconografia semântica nos KPIs.',
);
assert.match(
  cardCenter,
  /aria-label="Exportar Excel"[\s\S]*MegIcon name="list"[\s\S]*aria-label="Exportar PDF"[\s\S]*MegIcon name="file"/,
  'Exportações Excel e PDF devem usar ações compactas por ícone.',
);
assert.match(
  css,
  /\.meg2-card-art>img\{[\s\S]*object-fit:cover[\s\S]*padding:0[\s\S]*background:transparent/,
  'Carrossel deve usar a arte do cartão em full-bleed, ocupando todo o card sem moldura interna.',
);
assert.match(
  cardCenterCss,
  /\.meg3-cardcenter-hero img\{[\s\S]*object-fit:cover[\s\S]*padding:0[\s\S]*background:transparent[\s\S]*\.meg3-cardcenter-hero\.verocard img\{object-fit:cover/,
  'Central deve usar todos os cartões em full-bleed, preservando o padrão visual validado do Verocard.',
);
assert.match(
  cardCenterCss,
  /\.meg3-cardcenter-kpis article>svg[\s\S]*\.meg3-cardcenter-kpis strong[\s\S]*overflow:visible/,
  'KPIs devem apresentar ícones e valores completos sem ellipsis.',
);

assert.match(
  mobile,
  /LATAM PASS Itaú Mastercard Platinum[\s\S]*Azul Itaú Visa Infinite[\s\S]*Riachuelo Midway Mastercard/,
  'Rótulos visuais dos cartões devem refletir as variantes cadastradas com clareza.',
);

assert.doesNotMatch(
  css + '\n' + cardCenterCss,
  /meg2-card-art>img[\s\S]{0,180}object-fit:contain|meg3-cardcenter-hero img[\s\S]{0,180}object-fit:contain/,
  'Cartões não podem voltar ao enquadramento interno desconexo após a validação full-bleed.',
);

assert.match(
  cardCenter,
  /resolveFinancialIcon[\s\S]*meg3-cardcenter-row-icon[\s\S]*meg3-cardcenter-row-copy/,
  'Central deve padronizar lançamentos com os mesmos ícones semânticos do restante do sistema.',
);
assert.match(
  cardCenterCss,
  /grid-template-columns:36px minmax\(0,1fr\) auto 14px[\s\S]*\.meg3-cardcenter-row-icon/,
  'Lista da central deve reservar coluna própria para o ícone de cada lançamento.',
);
assert.doesNotMatch(
  css + '\n' + cardCenterCss,
  /img\[alt\*="LATAM"\][\s\S]{0,180}transform:scale\(/,
  'LATAM deve usar a mesma geometria full-card das demais artes, sem zoom exclusivo.',
);
assert.doesNotMatch(
  css + '\n' + cardCenterCss,
  /Mercado Pago[^\n]*[\s\S]{0,180}transform:scale\(/,
  'Mercado Pago não pode receber zoom artificial que corte VISA ou a composição lateral.',
);
assert.match(
  mobile,
  /mercado-pago-visa-v662\.svg/,
  'Mercado Pago deve usar a nova arte horizontal local, não a imagem anterior problemática.',
);
assert.match(
  readFileSync(new URL('../../public/assets/cards/mercado-pago-visa-v662.svg', import.meta.url), 'utf8'),
  /isotipo oficial integrado ao próprio SVG[\s\S]*Símbolo Mercado Pago/,
  'Símbolo do Mercado Pago deve estar integrado na própria arte base, não sobreposto por CSS.',
);
assert.match(
  css,
  /data-card-identity\^="Mercado Pago"[^\{]*\{[\s\S]{0,140}object-position:center!important[\s\S]{0,80}transform:none!important/,
  'Mercado Pago deve permanecer centralizado no carrossel sem recorte adicional.',
);
assert.match(
  cardCenterCss,
  /data-card-identity\^="Mercado Pago"[^\{]*\{[\s\S]{0,140}object-position:center!important[\s\S]{0,80}transform:none!important/,
  'Mercado Pago deve permanecer centralizado também na Central do Cartão.',
);
assert.match(
  cardCenterCss,
  /@media\(max-width:560px\)[\s\S]*\.meg3-cardcenter-top\{[\s\S]*grid-template-columns:1fr[\s\S]*\.meg3-cardcenter-hero\{[\s\S]*aspect-ratio:1\.586\/1/,
  'Central móvel deve empilhar a arte do cartão em largura total antes dos KPIs.',
);

assert.doesNotMatch(
  mobile,
  /latamairlines\.com|voeazul\.com\.br|plusdin\.com\.br|mlstatic\.com/,
  'Cartões do APK não podem depender de imagens remotas sujeitas a placeholder no WebView.',
);
assert.doesNotMatch(
  mobile + '\n' + cardCenter,
  /category:\s*purchase\?\.category\?\.name\s*\|\|\s*['"]Outros['"]|category:\s*purchase\.category\?\.name\s*\|\|\s*['"]Outros['"]/,
  'Ausência de categoria não pode ser mascarada por "Outros", pois a descrição precisa definir o ícone semântico.',
);
assert.match(
  cardCenter,
  /function transactionIcon[\s\S]*resolveFinancialIcon\(\{ description, categoryName: category \}\)/,
  'Lançamentos da Central devem resolver ícone pela categoria real e, na ausência dela, pela descrição.',
);

assert.match(
  previewMain,
  /signedInVisualReady[\s\S]*requestAnimationFrame[\s\S]*PhoenixBootScreen stage="ready"/,
  'Loading validado deve permanecer sobre o primeiro frame da Home para impedir flash intermediário.',
);
assert.match(
  css,
  /\.meg2-user strong\{[\s\S]*overflow:visible!important[\s\S]*text-overflow:clip!important/,
  'Cabeçalho deve reservar o primeiro nome completo ao lado do avatar, sem reticências.',
);
assert.match(
  cardCenterCss,
  /\.meg3-cardcenter-tabs button\{[\s\S]*white-space:nowrap[\s\S]*overflow:hidden/,
  'Abas da Central devem manter cada rótulo dentro da própria segmentação.',
);
assert.match(
  cardCenterCss,
  /\.meg3-cardcenter>footer\{[\s\S]*min-height:70px[\s\S]*\.meg3-cardcenter-total/,
  'Rodapé da Central deve preservar total e ação Fechar com acabamento e altura próprios.',
);
assert.match(
  cardCenter,
  /meg3-cardcenter-row-icon icon-\$\{icon\}/,
  'Ícones da Central devem carregar a identidade visual da classificação resolvida.',
);

assert.match(
  mobile,
  /VEROCARD_ART_URL = asset\('assets\/cards\/verocard-alimentacao-v659\.svg'\)/,
  'Verocard deve usar arte local horizontal para não depender de imagem remota esticada.',
);
assert.doesNotMatch(
  mobile,
  /verocard\.com\.br\/wp-content\/uploads/i,
  'APK não pode voltar a usar a arte remota vertical do Verocard.',
);
assert.match(
  cardCenter,
  /data-card-identity=\{cardLabel\}[\s\S]*data-card-identity="Verocard Alimentação"/,
  'Central deve identificar a arte ativa para enquadramento individual por cartão.',
);
assert.match(
  cardCenterCss,
  /CENTRAL V10[\s\S]*width:min\(100vw,620px\)!important[\s\S]*max-width:100vw!important[\s\S]*overflow-x:hidden!important/,
  'Central de qualquer cartão deve ficar rigidamente contida no viewport.',
);
assert.equal(
  cardCenterCss.includes('.meg3-cardcenter>header h2{') &&
  cardCenterCss.includes('-webkit-line-clamp:2') &&
  cardCenterCss.includes('overflow-wrap:anywhere'),
  true,
  'Títulos longos da Central devem caber sem expulsar o botão fechar.',
);
assert.match(
  css,
  /CARTÕES V10[\s\S]*\.meg2-card-detail\{[\s\S]*width:min\(100vw,560px\)!important[\s\S]*overflow-x:hidden!important/,
  'Modal de detalhe da compra deve obedecer ao viewport em qualquer cartão.',
);
assert.match(
  benefitCss,
  /BENEFÍCIO V10[\s\S]*width:min\(100vw,620px\)!important[\s\S]*overflow-x:hidden!important/,
  'Modal do benefício também deve seguir a mesma regra responsiva dos cartões.',
);

assert.match(
  mobile + '\n' + cardCenter,
  /statement\?\.netAmount[\s\S]*statementAmount/,
  'Fatura atual deve exibir o valor integral da competência, não apenas o saldo ainda pagável.',
);
assert.equal(mobileIcons.includes('game ?pass') && mobileIcons.includes("return 'gamepad'"), true,
  'Resolvedor semântico deve reconhecer jogos e assinaturas gamer.');
assert.equal(mobileIcons.includes('capilar') && mobileIcons.includes("return 'sparkles'"), true,
  'Resolvedor semântico deve reconhecer beleza e cuidados pessoais.');
assert.equal(mobileIcons.includes('microondas') && mobileIcons.includes("return 'appliance'"), true,
  'Resolvedor semântico deve reconhecer eletrodomésticos.');
assert.equal(mobileIcons.includes('shopee') && mobileIcons.includes("return 'shopping-bag'"), true,
  'Resolvedor semântico deve reconhecer e-commerce.');
assert.match(
  cardCenterCss,
  /-webkit-text-size-adjust:100%[\s\S]*\.meg3-cardcenter-tabs button\{[\s\S]*font-size:[^;]+!important[\s\S]*letter-spacing:-\.035em/,
  'Abas da Central devem resistir ao autoajuste de texto do WebView e permanecer contidas.',
);
assert.doesNotMatch(
  css + '\n' + cardCenterCss,
  /\.meg2-card-art>img\{[\s\S]{0,260}transform:scale|\.meg3-cardcenter-hero img\{[\s\S]{0,260}transform:scale/,
  'Artes finais não devem depender de zoom artificial para preencher o cartão.',
);


/* MEG 2.0.666 · contratos da rodada final de acabamento. */
assert.equal(
  coreScreens.includes('meg3-movement-sort') &&
  coreScreens.includes('dateDescending') &&
  !coreScreens.includes('<section className="meg3-movement-toolbar"') &&
  !coreScreens.includes('className="meg3-movement-new"'),
  true,
  'Lançamentos deve remover comandos rápidos duplicados e manter apenas ordenação simples por data no cabeçalho da lista.',
);
assert.equal(
  mobile.includes('cardGroups') &&
  mobile.includes('isProjectedCardPending') &&
  mobile.includes('meg2-pending-date-total') &&
  mobile.includes('Total selecionado'),
  true,
  'Pendentes deve consolidar as fontes de cartão da competência do vencimento, totalizar por data e refletir o lote selecionado no resumo.',
);
assert.equal(
  mobile.includes("subtitle:'Pagamento instantâneo'") &&
  mobile.includes("icon:'pix'") &&
  mobile.includes("icon:'barcode'") &&
  mobile.includes("icon:'coins'") &&
  mobile.includes("icon:'bank-transfer'") &&
  mobile.includes('searchable={false}'),
  true,
  'Baixa deve expor somente as formas operacionais com iconografia SVG própria.',
);
assert.equal(
  mobileIcons.includes("| 'pix' | 'barcode' | 'coins' | 'bank-transfer'") &&
  mobileIcons.includes("key === 'pix'") &&
  mobileIcons.includes("key === 'barcode'") &&
  mobileIcons.includes("key === 'coins'") &&
  mobileIcons.includes("key === 'bank-transfer'"),
  true,
  'Ícones de PIX, boleto, dinheiro e transferência devem ser SVGs nativos do MEG.',
);
assert.match(
  css,
  /Pendentes V4[\s\S]*\.meg2-pending-date-total[\s\S]*\.meg2-pending-settle>footer \.apply[\s\S]*\.meg2-pending-success>button\.apply/,
  'Pendentes V4 deve destacar totais por data e CTAs de revisão, confirmação e conclusão.',
);


/* MEG 2.0.667 · fatura é uma obrigação visual única, inclusive para histórico legado. */
assert.equal(
  mobile.includes('legacyPendingCardForEvent') &&
  mobile.includes('groupedLegacyEventIds') &&
  mobile.includes("displayKind:'card'") &&
  mobile.includes('settlementParts'),
  true,
  'Pendentes deve reconhecer lançamentos legados pelo cartão e convertê-los em uma única obrigação visual de fatura.',
);
assert.match(
  mobile,
  /settlementItems\.flatMap[\s\S]*item\.settlementParts[\s\S]*source: item\.source/,
  'Baixa de uma fatura agrupada deve expandir suas fontes internas somente no payload atômico enviado ao servidor.',
);
assert.equal(
  mobile.includes('meg2-pending-card-inline') &&
  mobile.includes('Selecionar fatura') &&
  mobile.includes('Fatura selecionada') &&
  mobile.includes('aria-expanded'),
  true,
  'Toque na fatura deve expandir os lançamentos na própria lista e a seleção deve ocorrer no nível da fatura.',
);
assert.match(
  mobile,
  /!groupedLegacyEventIds\.has\(item\.id\)/,
  'Lançamentos legados já agrupados no cartão não podem reaparecer como pendências individuais.',
);
assert.match(
  css,
  /MEG 2\.0\.667[\s\S]*\.meg2-pending-card-inline[\s\S]*\.meg2-pending-card-inline-lines[\s\S]*\.meg2-pending-card-inline>footer/,
  'A fatura expandida deve possuir layout próprio dentro da lista de Pendentes.',
);


/* MEG 2.0.668 · badges devem ter área reservada e nunca sobrepor rótulos. */
assert.equal(
  mobile.includes("' has-count'") &&
  css.includes('.meg2-payables .meg2-tabs button.has-count') &&
  css.includes('.meg2-pending-metrics article.selected>small') &&
  css.includes('.meg2-pending-metrics article.selected>span'),
  true,
  'Contadores das abas e do total selecionado devem reservar espaço próprio sem cobrir o texto.',
);
assert.match(
  css,
  /MEG 2\.0\.668[\s\S]*button\.has-count>b[\s\S]*position:absolute[\s\S]*article\.selected>small[\s\S]*max-width:calc\(100% - 31px\)[\s\S]*\.meg2-badge-wrap b/,
  'Microacabamento dos badges deve manter posicionamento responsivo nas abas, resumo e dock.',
);


/* MEG 2.0.669 · fechamento de UX do editor e seletores globais. */
assert.equal(
  launchSheet.includes('onGoHome?: () => void') &&
  launchSheet.includes('onClick={onGoHome || onClose}>Voltar para Início') &&
  mobile.includes("onGoHome={() => { setLaunchSheet(null); navigateMobile('home'); }}"),
  true,
  'Tela de sucesso do lançamento deve voltar de fato para a Home quando o usuário escolhe Voltar para Início.',
);
assert.equal(
  mobile.includes("document.documentElement.style.setProperty('--meg-visual-height'") &&
  picker.includes("if (event.key !== 'Escape') return") &&
  pickerCss.includes("var(--meg-visual-height,100dvh)") &&
  pickerCss.includes('body.meg-picker-open'),
  true,
  'Pickers globais devem respeitar o visualViewport real, travar o fundo e permitir fechamento por Escape.',
);


/* MEG 2.0.670 · fechamento do Benefício e da sessão. */
assert.equal(
  benefitModal.includes('const evolution=useMemo') &&
  benefitModal.includes('EVOLUÇÃO DO SALDO') &&
  benefitModal.includes('meg3-benefit-chart') &&
  benefitModal.includes('Saldo inicial') &&
  benefitModal.includes('Saldo atual'),
  true,
  'Benefício deve exibir evolução real do saldo a partir das movimentações do período.',
);
assert.match(
  benefitCss,
  /BENEFÍCIO V11[\s\S]*\.meg3-benefit-evolution[\s\S]*\.meg3-benefit-chart[\s\S]*\.meg3-benefit-chart \.line/,
  'Evolução do Verocard deve possuir apresentação compacta própria sem substituir a lista rolável.',
);
assert.equal(
  mobile.includes("useState<'logout'|'close'|null>") &&
  mobile.includes("setConfirm('logout')") &&
  mobile.includes("Deseja sair da sua conta?") &&
  settings.includes('setLogoutConfirm(true)') &&
  settings.includes('Confirmar saída da conta'),
  true,
  'Todos os caminhos visíveis de logout mobile devem exigir confirmação antes de encerrar a sessão.',
);
assert.match(
  settingsCss,
  /MEG 2\.0\.670[\s\S]*\.meg4-confirm-overlay[\s\S]*\.meg4-confirm-card[\s\S]*button\.danger/,
  'Configurações deve usar confirmação de logout consistente com os modais mobile.',
);


/* MEG 2.0.671 · acabamento textual do Benefício. */
assert.equal(
  benefitModal.includes("events.length===1?'movimentação':'movimentações'") &&
  benefitModal.includes('aria-label="Fechar acompanhamento do benefício"'),
  true,
  'Benefício deve manter plural correto e botão de fechar identificado para acessibilidade.',
);


/* MEG 2.0.672 · baixa em lote acionável e caminho crítico de gravação reduzido. */
assert.equal(
  mobile.includes("className={selectedRows.length ? 'selected batch-action' : ''}") &&
  mobile.includes("onClick={selectedRows.length ? () => openSettlement(selectedRows) : undefined}") &&
  mobile.includes("tabIndex={selectedRows.length ? 0 : undefined}") &&
  css.includes('.meg2-pending-metrics article.batch-action'),
  true,
  'Total selecionado deve abrir a baixa em lote somente quando houver seleção ativa.',
);
assert.equal(
  writeGateway.includes('invalidatePhoenixReadModelMonth') &&
  writeGateway.includes('publishOptimisticEvent') &&
  writeGateway.includes('refreshSnapshotInBackground') &&
  !writeGateway.includes('clearPhoenixReadModelCache();'),
  true,
  'Gravações devem invalidar apenas o mês, publicar estado otimista e reconciliar o snapshot em segundo plano.',
);
assert.equal(
  launchSheet.includes("if (result.status === 'error') throw new Error(result.code);") &&
  launchSheet.includes("if (result.status === 'confirmed') dispatchSnapshot(result.snapshot);"),
  true,
  'Editor deve liberar sucesso após aceite real da API e nunca mascarar erro de gravação como sucesso.',
);
assert.match(
  previewSnapshot,
  /Promise\.all\(\[[\s\S]*loadCoreEvents[\s\S]*listCards\(dataOwnerId, month\)[\s\S]*financialAuditReadOnly\(context\)[\s\S]*\]\)/,
  'Snapshot Phoenix deve iniciar cartões e auditoria na mesma janela paralela das leituras financeiras.',
);
assert.equal(
  eventMutation.includes("include: { account: true, category: true, paymentMethod: true }") &&
  eventMutation.includes("const result = { ...event, ledgerEntries: ledgerEntry ? [ledgerEntry] : [] };"),
  true,
  'Criação de evento deve reutilizar o retorno do INSERT em vez de reler o mesmo evento do banco.',
);
assert.match(
  pendingWriteGateway,
  /A baixa já está confirmada pelo servidor[\s\S]*void \(async \(\) =>[\s\S]*publishCommittedSnapshot\(snapshot\)/,
  'Baixa confirmada deve liberar o comprovante sem aguardar a releitura mensal completa.',
);
