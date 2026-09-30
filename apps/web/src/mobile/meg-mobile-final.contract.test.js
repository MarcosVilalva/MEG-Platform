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
const mobileIcons = readFileSync(new URL('./MegMobileIcon.tsx', import.meta.url), 'utf8');
const coreCss = readFileSync(new URL('./meg-mobile-core-screens.css', import.meta.url), 'utf8');
const launchCss = readFileSync(new URL('./meg-mobile-launch-sheet.css', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./MegMobileSettings.tsx', import.meta.url), 'utf8');
const settingsCss = readFileSync(new URL('./meg-mobile-settings.css', import.meta.url), 'utf8');
const cardCenter = readFileSync(new URL('./MegMobileCardCenter.tsx', import.meta.url), 'utf8');
const cardCenterCss = readFileSync(new URL('./meg-mobile-card-center.css', import.meta.url), 'utf8');
const benefitModal = readFileSync(new URL('./MegMobileBenefitModal.tsx', import.meta.url), 'utf8');
const source = mobile + '\n' + css + '\n' + runtimeCss + '\n' + coreScreens + '\n' + launchSheet + '\n' + mobileIcons + '\n' + coreCss + '\n' + launchCss + '\n' + settings + '\n' + settingsCss + '\n' + cardCenter + '\n' + benefitModal;

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
  '../../public/assets/cards/approved-v6/mercado.webp',
  '../../public/assets/cards/latam-pass-platinum.webp',
  '../../public/assets/cards/approved-v6/azul.webp',
  '../../public/assets/cards/approved-v6/riachuelo.webp',
]) {
  assert.equal(existsSync(new URL(relative, import.meta.url)), true,
    `Arte de cartão obrigatória ausente: ${relative}`);
}

assert.match(
  mobile,
  /mercado.*meli[\s\S]*mlstatic\.com[\s\S]*latamairlines\.com[\s\S]*voeazul\.com\.br[\s\S]*riachuelo.*midway[\s\S]*plusdin\.com\.br/i,
  'Carrossel deve resolver cartões ativos para artes reais de alta resolução.',
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
  /preparePhoenixPendingSettlement[\s\S]*runPhoenixPendingSettlement[\s\S]*Dar baixa[\s\S]*Confirmar baixa/,
  'Pendentes deve executar a baixa real pelo gateway idempotente antes de retirar o compromisso da tela.',
);
assert.match(
  mobile,
  /settlementSuccess[\s\S]*BAIXA CONFIRMADA[\s\S]*Data[\s\S]*Conta[\s\S]*Pagamento/,
  'Baixa de Pendentes deve apresentar confirmação com dados efetivos da operação.',
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
