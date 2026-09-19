import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const phoenixApp = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('./PhoenixSidebar.tsx', import.meta.url), 'utf8');
const navIcon = readFileSync(new URL('./PhoenixNavIcon.tsx', import.meta.url), 'utf8');
const profileAvatar = readFileSync(new URL('./profile-avatar.tsx', import.meta.url), 'utf8');
const commandPalette = readFileSync(new URL('./PhoenixCommandPalette.tsx', import.meta.url), 'utf8');
const screens = readFileSync(new URL('./screens/PhoenixReadScreens.tsx', import.meta.url), 'utf8');
const movementScreen = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const cardsGrid = readFileSync(new URL('./screens/PhoenixCardsGrid.tsx', import.meta.url), 'utf8');
const cardsPremiumCss = readFileSync(new URL('./phoenix-cards-premium.css', import.meta.url), 'utf8');
const cardsWowCss = readFileSync(new URL('./phoenix-cards-wow.css', import.meta.url), 'utf8');
const cardsFidelityCss = readFileSync(new URL('./phoenix-cards-fidelity-v6.css', import.meta.url), 'utf8');
const cardsResponsiveCss = readFileSync(new URL('./phoenix-cards-responsive-v61.css', import.meta.url), 'utf8');
const cardIdentity = readFileSync(new URL('./card-identity.ts', import.meta.url), 'utf8');
const simpleEventBridge = readFileSync(new URL('./simple-event-form-bridge.ts', import.meta.url), 'utf8');
const launchBusinessRules = readFileSync(new URL('./launch-business-rules-bridge.ts', import.meta.url), 'utf8');
const operationalHome = readFileSync(new URL('./PhoenixOperationalMobileHome.tsx', import.meta.url), 'utf8');
const operationalCss = readFileSync(new URL('./phoenix-operational-mobile.css', import.meta.url), 'utf8');
const nativeNotifications = readFileSync(new URL('./phoenix-native-notifications.ts', import.meta.url), 'utf8');
const gridFilter = readFileSync(new URL('./PhoenixGridFilter.tsx', import.meta.url), 'utf8');
const gridCss = readFileSync(new URL('./phoenix-grid.css', import.meta.url), 'utf8');
const launchDynamicCss = readFileSync(new URL('./phoenix-launch-dynamic.css', import.meta.url), 'utf8');
const launchWriteControl = readFileSync(new URL('./components/PhoenixLaunchWriteControl.tsx', import.meta.url), 'utf8');
const bulkEventUxEnhancements = readFileSync(new URL('./bulk-event-ux-enhancements.ts', import.meta.url), 'utf8');
const homeDashboard = readFileSync(new URL('./screens/PhoenixHomeDashboard.tsx', import.meta.url), 'utf8');
const homeNowCss = readFileSync(new URL('./phoenix-home-now.css', import.meta.url), 'utf8');
const periodCss = readFileSync(new URL('./phoenix-period.css', import.meta.url), 'utf8');
const homeAllTime = readFileSync(new URL('./screens/PhoenixHomeAllTime.tsx', import.meta.url), 'utf8');
const homePeriodSummary = readFileSync(new URL('./home-period-summary.ts', import.meta.url), 'utf8');
const webScreens = readFileSync(new URL('./screens/PhoenixWebScreens.tsx', import.meta.url), 'utf8');
const history = readFileSync(new URL('./screens/PhoenixHistory.tsx', import.meta.url), 'utf8');
const users = readFileSync(new URL('./screens/PhoenixUsers.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./screens/PhoenixSettings.tsx', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./data/load-phoenix-read-model.ts', import.meta.url), 'utf8');
const previewMain = readFileSync(new URL('./preview-main.tsx', import.meta.url), 'utf8');
const phoenixHtml = readFileSync(new URL('../../phoenix.html', import.meta.url), 'utf8');
const productionHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const styles = `${readFileSync(new URL('./phoenix-v15.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-parity-v15.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-period.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-sidebar.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-screens.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-home-dashboard.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-cards-premium.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-cards-wow.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-cards-fidelity-v6.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-cards-responsive-v61.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-operational-mobile.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-history.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-users.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-settings.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-web-screens.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-overlays.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-launch.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./preview.css', import.meta.url), 'utf8')}`;
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const phoenixSource = `${phoenixApp}\n${sidebar}\n${navIcon}\n${profileAvatar}\n${commandPalette}\n${screens}\n${movementScreen}\n${cardsGrid}\n${homeDashboard}\n${homeAllTime}\n${homePeriodSummary}\n${webScreens}\n${history}\n${users}\n${settings}\n${previewMain}`;
const readOnlyScreens = `${screens}\n${movementScreen}\n${cardsGrid}\n${homeDashboard}\n${homeAllTime}\n${webScreens}\n${history}\n${users}\n${settings}\n${sidebar}\n${commandPalette}`;

for (const forbidden of ['global.css', 'v15-contract.css', 'meg-v15.css']) {
  assert.doesNotMatch(phoenixSource, new RegExp(forbidden.replace('.', '\\.')),
    `Phoenix não pode importar ${forbidden}`);
}

assert.doesNotMatch(phoenixSource, /\.\.\/modules\//,
  'Phoenix não deve reutilizar componentes visuais da interface antiga');
assert.doesNotMatch(loader, /method\s*:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/,
  'Bootstrap Phoenix deve permanecer sem mutações explícitas');
assert.doesNotMatch(readOnlyScreens, /import\s+(?!type\b)[^;]*from\s+['"][^'"]*app\/(?:finance-client|cards-client|payables-client|receivables-client|app-state-client)['"]/,
  'Telas Phoenix não podem acessar clientes mutáveis em runtime durante a paridade');
assert.doesNotMatch(readOnlyScreens, /patchCloudTransactions|createEvent|updateEvent|archiveEvent|createPurchase|payStatement|createReceivable|receive\(|saveBudget|deleteBudget|changeUserAccess|deleteManagedUser/,
  'Telas Phoenix não podem invocar gateways de escrita durante a paridade');
assert.match(simpleEventBridge, /preparePhoenixBenefitEvent/,
  'Drawer de lançamento deve preparar conta de Benefício Alimentação pelo writer específico.');
assert.match(simpleEventBridge, /runPhoenixBenefitEventWrite/,
  'Drawer de lançamento deve confirmar Benefício Alimentação pelo writer protegido.');
assert.match(simpleEventBridge, /benefit\.isBenefit && benefit\.isVerocard/,
  'Conta Benefício + VEROCARD deve ser reconhecida diretamente sem modalidade legada.');
assert.doesNotMatch(simpleEventBridge, /benefit\.isVerocard[\s\S]{0,180}modality === 'ALIMENTACAO'/,
  'Fluxo do benefício pode usar modalidade apenas como sinal auxiliar; nunca como requisito para liberar VEROCARD.');
assert.match(movementScreen, /selectedAccount\?\.type === 'benefit' \|\| isBenefitAccount\(selectedAccount\?\.name\)/,
  'Benefício Alimentação deve ser reconhecido pelo tipo canônico da conta, não apenas pelo nome visível.');
assert.match(movementScreen, /data-account-type=\{item\.type\}/,
  'Opção de conta deve expor seu tipo canônico para as bridges de compatibilidade.');
assert.match(simpleEventBridge, /accountType === 'BENEFIT'/,
  'Bridge de gravação deve reconhecer conta de benefício pelo tipo canônico exposto no formulário.');
assert.match(launchBusinessRules, /option\.dataset\.accountType[\s\S]*=== 'BENEFIT'/,
  'Modalidade ALIMENTAÇÃO deve localizar a conta pelo tipo canônico benefit, não pelo rótulo.');
assert.match(launchBusinessRules, /setPaymentLock\(root, verocard, true\)/,
  'Modalidade ALIMENTAÇÃO deve selecionar e travar VEROCARD automaticamente.');
assert.match(launchBusinessRules, /setAccountLock\(root, benefitAccount, true\)/,
  'Modalidade ALIMENTAÇÃO deve selecionar e travar a conta de benefício automaticamente.');
assert.match(movementScreen, /launchPreset === 'benefit'/,
  'Aplicativo operacional deve possuir atalho direto para lançamento de Alimentação.');
assert.match(movementScreen, /canonicalVerocardPayment/,
  'Drawer React deve reforçar VEROCARD quando a conta canônica é benefit.');


assert.match(loader, /const previewPath = `\/finance\/phoenix-preview\?month=\$\{encodeURIComponent\(month\)\}`/,
  'Núcleo financeiro Phoenix deve declarar um único endpoint mensal de snapshot.');
assert.match(loader, /authenticatedRequest<PhoenixPreviewCoreRead>\([\s\S]*previewPath/,
  'Núcleo financeiro Phoenix deve vir de um único snapshot mensal somente leitura');
assert.doesNotMatch(loader, /financeClient\.getSummary\(month\)|financeClient\.getBenefitSummary\(month\)|financeClient\.getAnalytics\(month\)|financeClient\.getCashflow\(month\)|financeClient\.listEventsForMonth\(month\)|cardsClient\.list\(month\)|payablesClient\.list\(month\)/,
  'Bootstrap Phoenix não deve voltar a fragmentar o núcleo mensal em múltiplas leituras');
assert.match(loader, /fetchAllFinancialEvents/,
  'Modo Tudo deve possuir leitura global explícita e isolada do bootstrap mensal');
assert.match(loader, /\/finance\/phoenix-preview\/events/,
  'Modo Tudo deve usar o endpoint dedicado de leitura completa em vez de dezenas de páginas HTTP');
assert.doesNotMatch(loader, /Math\.ceil\(first\.total \/ 100\)|for \(let page = 2;/,
  'Histórico completo não deve voltar à paginação HTTP sequencial do cliente');
assert.match(loader, /STATIC_CACHE_TTL/,
  'Leituras estáticas não devem ser repetidas a cada troca de mês');
assert.match(loader, /loadStaticContext/,
  'Bootstrap deve separar contexto estático do snapshot mensal');
assert.match(loader, /PHOENIX_PREVIEW_MONTH_MISMATCH/,
  'Snapshot Phoenix deve falhar fechado se o backend responder outro período');
assert.match(loader, /financeClient\.listBudgets\(month\)/);
assert.match(loader, /receivablesClient\.listCustomers\(\)/);
assert.match(loader, /receivablesClient\.listReceivables\(\)/);
assert.match(loader, /normalization-preview/);
assert.match(loader, /authenticatedRequest<SharedStateRead>\('\/app-state'\)/,
  'Histórico legado deve continuar disponível pela leitura real do AppState');
assert.match(loader, /app-state-activity-log-legacy/,
  'ActivityLog deve permanecer explicitamente marcado como fonte legada');
assert.match(loader, /finance-audit-log/,
  'Auditoria normalizada deve ser declarada como fonte principal financeira');
assert.match(loader, /finance-domain-month/,
  'Fonte de lançamentos Phoenix deve declarar a leitura mensal completa');
assert.match(loader, /authenticatedRequest<ManagedUsersRead>\('\/auth\/users'\)/,
  'Usuários Phoenix devem vir da rota administrativa oficial');
assert.match(history, /Trilha protegida/,
  'Histórico deve comunicar auditoria protegida sem expor detalhes técnicos na interface principal.');
assert.match(history, /Finance AuditLog/);
assert.match(history, /AppState\.activityLog/);
assert.match(history, /Integridade confirmada pelo backend/,
  'Histórico Phoenix deve exibir snapshots before/after somente para a auditoria financeira estrutural');
assert.match(history, /Histórico legado/,
  'Histórico anterior à auditoria normalizada deve permanecer preservado');
assert.match(history, /Exportar filtrado/);
assert.match(users, /Somente leitura/);
assert.match(users, /Gerenciar acesso/);
assert.match(settings, /Saúde do sistema/);
assert.match(settings, /não consultada/,
  'Configurações Phoenix não pode inventar estado de recursos nativos não consultados');
assert.match(settings, /Restaurar backup/);
assert.match(settings, /disabled/,
  'Restauração deve permanecer bloqueada durante a fase read-only');
assert.match(settings, /Meu perfil/,
  'Configurações V15 deve expor uma área clara de perfil pessoal');
assert.match(settings, /Escolher foto/,
  'Perfil deve permitir escolher foto sem simular gravação na API');
assert.match(settings, /Avatares MEG/,
  'Perfil deve oferecer avatares pré-selecionados');
assert.match(settings, /Monte sua Home/,
  'Personalização do dashboard deve permanecer dentro das Configurações V15');
assert.match(profileAvatar, /meg\.profile\.avatar\./,
  'Avatar visual deve ficar isolado por usuário no armazenamento local enquanto não houver contrato backend');
assert.match(profileAvatar, /imageFileToAvatarDataUrl/,
  'Upload de foto deve normalizar a imagem antes de armazenar a preferência local');
assert.ok((profileAvatar.match(/id: '/g) || []).length >= 10,
  'Biblioteca de avatares deve manter variedade suficiente de estilos prontos');
assert.match(webScreens, /Títulos e recebimentos em aberto/);
assert.match(webScreens, /Origem e evolução das entradas/);
assert.match(webScreens, /Fechamento realizado e projetado/);
assert.match(webScreens, /Tendências e comparações históricas/);
assert.match(webScreens, /Planejamento financeiro/);
assert.match(webScreens, /Conciliação ainda não liberada na Phoenix/,
  'Conciliação não pode fingir dados sem contrato oficial');
assert.doesNotMatch(webScreens, /Math\.random|mock|demo/i,
  'Web completo não pode fabricar dados de demonstração');
assert.match(commandPalette, /Buscar tela, lançamento, cartão, conta, cliente ou usuário/);
assert.match(commandPalette, /data\.events\.items/);
assert.match(commandPalette, /data\.cards/);
assert.match(commandPalette, /data\.accounts/);
assert.match(commandPalette, /data\.customers/);
assert.match(commandPalette, /event\.target === event\.currentTarget/,
  'Busca deve fechar ao clicar fora do painel');

assert.match(movementScreen, /Novo lançamento/);
assert.match(movementScreen, /launchRequest/,
  'Drawer de lançamento deve aceitar abertura controlada pelo shell global');
assert.match(movementScreen, /px-movement-tool-button/,
  'Busca, filtros, período e conta devem permanecer compactos e expansíveis na tela mais usada');
assert.match(movementScreen, /toolPanel === 'search'/,
  'Busca deve abrir sob demanda sem reservar altura fixa');
assert.match(movementScreen, /closeOnOutside/,
  'Painéis de consulta devem recolher ao clicar fora');
assert.match(movementScreen, /filtered\.length} resultado\(s\)/,
  'Busca expandida deve refletir a quantidade real da visão filtrada');
assert.match(movementScreen, /pageSize/,
  'Lançamentos deve oferecer paginação real sem alongar a página inteira');
assert.match(movementScreen, /expandedList/,
  'Usuário deve poder expandir os registros dentro da própria grade');
assert.match(movementScreen, /visibleEvents\.map/,
  'A tabela deve renderizar apenas a página ou lista expandida escolhida');
assert.match(movementScreen, /MovementIcon/,
  'Comandos principais devem usar uma família vetorial consistente em vez de caracteres soltos');
assert.match(movementScreen, /px-table-pagination/,
  'Paginação deve permanecer no rodapé da grade');
assert.match(movementScreen, /px-table-toolbar-shell/,
  'Comandos de consulta devem compartilhar a mesma toolbar das ações da grade');
assert.doesNotMatch(movementScreen, /px-movements-overview[\s\S]*px-movement-tools[\s\S]*<\/section>\s*<section className="px-card px-table-card">/,
  'Cabeçalho financeiro não deve reservar uma segunda faixa só para consulta');
assert.match(movementScreen, /px-description-ellipsis/,
  'Descrição deve permanecer compacta com elipse para preservar espaço horizontal');
assert.match(movementScreen, /title=\{event\.description\}/,
  'Descrição completa deve continuar acessível ao passar o mouse');
assert.match(movementScreen, /<option value="all">Todos<\/option>/,
  'Paginação deve oferecer a opção Todos sem criar scroll da página');
assert.doesNotMatch(movementScreen, /window\.confirm|window\.alert/,
  'Fluxo de Lançamentos não pode voltar a usar alertas nativos do navegador');
assert.match(movementScreen, /px-meg-confirm-dialog/,
  'Alterações não salvas devem usar confirmação visual MEG');
assert.match(gridFilter, /visualViewport/,
  'Filtros da grade devem calcular posição com base no viewport real do navegador');
assert.match(gridFilter, /maxHeight: position\.maxHeight/,
  'Filtros da grade devem receber limite explícito de altura do viewport');
assert.match(gridCss, /grid-template-rows:auto auto minmax\(0,1fr\) auto/,
  'Filtro deve manter cabeçalho, ordenação e rodapé fixos com conteúdo rolável');
assert.match(gridCss, /px-grid-filter-body[\s\S]*overscroll-behavior:contain/,
  'Somente o conteúdo interno dos filtros deve rolar');
assert.match(launchDynamicCss, /px-meg-confirm-overlay/,
  'Confirmação MEG precisa possuir overlay próprio');
assert.match(launchDynamicCss, /align-self:start[\s\S]*max-height:100%/,
  'Grade deve eliminar área morta e limitar-se ao espaço disponível');

assert.match(movementScreen, /Despesa/);
assert.match(movementScreen, /Receita/);
assert.match(movementScreen, /Transferência/);
assert.match(movementScreen, /Possível duplicidade:/,
  'Alerta de duplicidade deve aparecer somente quando houver correspondência real');
assert.match(movementScreen, /PhoenixLaunchWriteControl/,
  'Drawer Phoenix deve separar revisão visual da confirmação protegida de escrita');
assert.match(launchWriteControl, /getPhoenixRuntimeWriteCapabilities\(true\)/,
  'Confirmação financeira deve consultar o gate de runtime antes de gravar');
assert.match(launchWriteControl, /duplicateAccepted/,
  'Possível duplicidade deve exigir confirmação explícita antes da escrita');
assert.match(launchWriteControl, /runPhoenixSimpleEventWrite/,
  'Escrita simples deve passar exclusivamente pelo gateway protegido e idempotente');
assert.match(movementScreen, /Classificação da receita \(opcional\)/,
  'Receita pode manter classificação opcional, sem exigir grupo');
assert.match(movementScreen, /draft\.type === 'expense' && !draft\.classification/,
  'Despesa deve exigir classificação antes do grupo');
assert.match(movementScreen, /Escolha a classificação primeiro/,
  'Grupo da despesa deve depender da classificação selecionada');
assert.match(movementScreen, /expenseGroups/,
  'Grupos disponíveis devem ser derivados da classificação real dos Cadastros');
assert.match(movementScreen, /sourcePurchaseDate/,
  'Data da compra deve usar purchaseDate real quando o sourcePayload possuir a informação');
assert.match(movementScreen, /purchaseDate: sourcePurchaseDate\(event\)/,
  'Filtro da coluna Data da compra não pode reutilizar o vencimento');
assert.match(movementScreen, /cardDueDate/,
  'Drawer deve respeitar fechamento e vencimento reais do cartão');
assert.match(movementScreen, /purchaseDay > closingDay/,
  'Fechamento da fatura deve seguir a mesma regra da API de cartões');
assert.match(movementScreen, /dueDay <= closingDay/,
  'Vencimento visual deve respeitar o ciclo cadastrado do cartão');
assert.match(movementScreen, /max=\{credit \? 48 : 120\}/,
  'Compra no cartão deve respeitar o limite de 48 parcelas do contrato atual da API');
assert.match(movementScreen, /data\.events\.items\.find/,
  'Proteção de duplicidade deve continuar comparando com dados reais já carregados');
assert.match(bulkEventUxEnhancements, /data-grid-help/,
  'Ajuda deve permanecer acessível na barra operacional da grade sem ocupar o cabeçalho');
assert.match(bulkEventUxEnhancements, /data-column-visibility/,
  'Seletor de colunas deve permanecer integrado à barra operacional');
assert.match(bulkEventUxEnhancements, /COLUMN_STORAGE_KEY/,
  'Preferência de visibilidade das colunas deve persistir localmente');
assert.match(bulkEventUxEnhancements, /eyeOff/,
  'Seletor de colunas deve usar o padrão visual de olho aberto\/fechado');
assert.match(bulkEventUxEnhancements, /px-grid-utility-backdrop/,
  'Seletor de colunas deve abrir como modal contido no viewport, como os filtros da grade');
assert.match(movementScreen, /data-col="description"/,
  'Colunas da grade devem possuir identidade estável para mostrar e ocultar em tempo real');
assert.match(movementScreen, /invalidField\('descrição'\)/,
  'Campos obrigatórios devem possuir validação inline contextual');
assert.doesNotMatch(movementScreen, /Os campos marcados com \* são obrigatórios/,
  'O editor não deve voltar a abrir com instruções fixas ocupando a área de preenchimento');
assert.doesNotMatch(movementScreen, /method\s*:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/,
  'Tela de Lançamentos não deve incorporar requisições de escrita diretamente');

assert.match(homeDashboard, /Última atividade/,
  'Home corrente deve preservar uma leitura resumida da atividade financeira recente.');
assert.match(homeDashboard, /data\.activities/,
  'Home deve usar o histórico legado como compatibilidade quando necessário');
assert.match(homeDashboard, /Prioridades de agora/,
  'Agenda da Home deve priorizar compromissos acionáveis do período.');
assert.match(homeDashboard, /Fatura \$\{item\.cardLabel/,
  'Cartões devem ser agrupados por identidade e vencimento na agenda');
assert.match(homeDashboard, /px-home-drawer/,
  'Detalhes de vencimento devem abrir drawer na própria Home');
assert.match(homeDashboard, /Revisar pagamento/,
  'Drawer da Home deve permitir selecionar itens para revisão de pagamento');
assert.match(cardsGrid, /data-cards-layout="fidelity-v6"/,
  'Cartões deve usar a composição V6 baseada diretamente no mockup aprovado.');
assert.match(cardsGrid, /Seus cartões/,
  'Tela principal deve manter os cartões como protagonistas.');
assert.match(cardsGrid, /Duplo clique para abrir a central do cartão/,
  'Tela principal deve explicar o acesso à central por duplo clique.');
assert.match(cardsGrid, /onDoubleClick=\{\(\) => openCardCommand/,
  'Duplo clique no cartão deve abrir a central detalhada.');
assert.match(cardsGrid, /CENTRAL DO CARTÃO/,
  'Cartões deve oferecer uma central detalhada por cartão.');
assert.match(cardsGrid, /Limite total/,
  'Cada cartão deve exibir o limite total com leitura imediata.');
assert.match(cardsGrid, /Limite disponível/,
  'Resumo do cartão selecionado deve destacar o limite disponível.');
assert.match(cardsGrid, /Melhor dia de compra/,
  'Cartão selecionado deve destacar o melhor dia estimado de compra.');
assert.match(cardsGrid, /Memória do limite/,
  'Central deve manter memória explícita do cálculo do limite.');
assert.match(cardsGrid, /Próximas faturas/,
  'Cartões deve permitir navegar pelas próximas competências.');
assert.match(cardsGrid, /commandSearch/,
  'Central detalhada deve possuir busca própria.');
assert.match(cardsGrid, /commandMonth/,
  'Central detalhada deve filtrar por competência.');
assert.match(cardsGrid, /commandStatus/,
  'Central detalhada deve filtrar por situação.');
assert.match(cardsGrid, /commandGroup/,
  'Central detalhada deve filtrar por grupo.');
assert.match(cardsGrid, /commandSort/,
  'Central detalhada deve permitir ordenar a tabela.');
assert.match(cardsGrid, /exportCardStatement\('xlsx'\)/,
  'Central do cartão deve exportar a visão filtrada para Excel.');
assert.match(cardsGrid, /exportCardStatement\('pdf'\)/,
  'Central do cartão deve exportar a visão filtrada para PDF.');
assert.match(cardsGrid, /data-meg-export-native="true"/,
  'Tabela do modal deve usar somente a exportação nativa da central.');
assert.match(cardsGrid, /setDetailRow/,
  'Movimentações do cartão devem abrir detalhe contextual em vez de botão inerte.');
assert.match(cardsWowCss, /\.px-cards-approved-grid/,
  'Tela aprovada deve possuir grade visual própria para os cartões.');
assert.match(cardsWowCss, /\.px-card-command-approved/,
  'Central detalhada deve possuir modal responsivo próprio.');
assert.match(cardsWowCss, /\.px-card-command-approved-filters/,
  'Filtros da central detalhada devem possuir composição premium.');
assert.match(cardsWowCss, /\.px-cards-approved-progress/,
  'Uso do limite deve possuir leitura visual destacada.');
assert.match(cardsPremiumCss, /\.px-card-detail-drawer/,
  'Detalhe de compra deve abrir em drawer responsivo.');
assert.match(cardsWowCss, /\.px-main-cards\{[\s\S]*height:100dvh[\s\S]*overflow:hidden/,
  'Tela principal de Cartões deve permanecer travada no viewport sem rolagem vertical.');
assert.match(cardsWowCss, /\.px-card-command-approved\{[\s\S]*overflow:hidden[\s\S]*grid-template-rows:auto auto auto minmax\(0,1fr\)/,
  'Modal da central deve permanecer fixo no viewport sem scroll geral.');
assert.match(cardsWowCss, /\.px-card-command-approved-table-wrap\{[\s\S]*overflow:auto/,
  'Somente a área da tabela do modal deve possuir rolagem.');
assert.match(cardsGrid, /Acesse detalhes, faturas, limites e muito mais\./,
  'Texto de orientação deve reproduzir fielmente o mockup aprovado.');
assert.match(cardsGrid, /Total da fatura/,
  'Resumo do modal deve usar o texto aprovado Total da fatura.');
assert.match(cardsGrid, /createPortal\(<div className="px-card-command-backdrop px-card-command-approved-backdrop"[\s\S]*document\.body\)/,
  'Central do cartão deve ocupar o viewport real por portal, fora do container da tela.');
assert.match(cardsGrid, /function CardUiIcon/,
  'Cartões V6 deve usar iconografia vetorial consistente em vez de glifos soltos.');
assert.match(cardsGrid, /px-cards-approved-progress-row/,
  'Percentual de uso deve estar em uma linha estrutural própria e nunca quebrar verticalmente.');
assert.match(cardsGrid, /px-card-command-group/,
  'Tabela da central deve recuperar iconografia visual por grupo.');
assert.match(cardIdentity, /assets\/cards\/latam-user-model-v61\.svg/,
  'LATAM deve usar a arte baseada diretamente no modelo enviado pelo usuário.');
assert.match(cardIdentity, /assets\/cards\/approved-v6\/mercado\.webp/,
  'Mercado Pago deve usar a arte do mockup aprovado.');
assert.match(cardIdentity, /assets\/cards\/approved-v6\/azul\.webp/,
  'Azul deve usar a arte do mockup aprovado.');
assert.match(cardIdentity, /assets\/cards\/approved-v6\/riachuelo\.webp/,
  'Riachuelo deve usar a arte do mockup aprovado.');
assert.match(cardsFidelityCss, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/,
  'Desktop deve manter os quatro cartões protagonistas em uma única linha.');
assert.match(cardsFidelityCss, /\.px-card-command-approved-table-wrap[\s\S]*overflow:auto!important/,
  'Na central V6 somente a área da tabela deve rolar.');
assert.match(cardsFidelityCss, /\.px-card-command-approved-table-foot\{display:none!important\}/,
  'Rodapé técnico da tabela não deve aparecer no modal fiel ao mockup.');
assert.match(cardsGrid, /const haystack = normalize\(\[[\s\S]*tx\.paymentMethod[\s\S]*tx\.account[\s\S]*tx\.modality[\s\S]*tx\.notes/,
  'Compatibilidade do cartão deve considerar conjuntamente forma, conta, modalidade e observações.');
assert.match(cardsGrid, /resolveActiveCardMonth/,
  'Central do cartão deve escolher a competência efetiva da fatura quando o snapshot global estiver vazio.');
assert.match(cardsGrid, /currentCardMonth/,
  'Fatura atual, exportação e filtro do modal devem usar a competência efetiva do cartão.');
assert.doesNotMatch(cardsGrid, /px-card-command-approved-backdrop" role="presentation" onMouseDown=/,
  'Backdrop da central não pode fechar o modal por clique acidental.');
assert.match(cardsGrid, /Feche a central pressionando Escape/,
  'A central deve comunicar fechamento intencional por ESC.');
assert.match(cardsResponsiveCss, /font-size:clamp\(7\.5px,[\s\S]*9px\)!important/,
  'Responsividade deve preservar um piso legível em vez de reduzir tudo a microtipografia.');
assert.match(cardsResponsiveCss, /@media \(max-width:1050px\)/,
  'Central deve se reorganizar quando zoom ou viewport reduzirem a largura útil.');
assert.match(cardsResponsiveCss, /@media \(min-width:761px\) and \(max-height:680px\)/,
  'Telas baixas devem compactar espaço sem destruir legibilidade.');
assert.match(cardsResponsiveCss, /px-card-command-approved-table-wrap[\s\S]*overflow:auto!important/,
  'Mesmo responsiva, somente a tabela da central deve rolar.');




assert.match(homeDashboard, /Benefício alimentação · disponível/,
  'Home deve preservar o indicador de benefício do V15');
assert.match(homeDashboard, /Consolidado realizado/,
  'Home deve preservar o consolidado realizado do V15');
assert.match(screens, /conta\(s\) selecionada\(s\)/,
  'Pendentes deve mostrar barra contextual ao selecionar contas');
assert.match(screens, /Revisar e confirmar baixa/,
  'Pendentes deve abrir a revisão protegida da seleção');
assert.match(screens, /PHOENIX_PENDING_WRITE_ENABLED/,
  'Writer real de Pendentes deve permanecer protegido por feature flag');
assert.match(screens, /selectedItems\.length !== 1/,
  'Confirmação real deve exigir exatamente um compromisso por operação');
assert.match(screens, /Baixa em lote ainda protegida/,
  'Seleção múltipla pode ser revisada, mas não pode gerar baixa parcial em lote');
assert.match(screens, /Confirmar baixa real/,
  'Writer de baixa deve exigir confirmação explícita antes da gravação');

assert.match(homeAllTime, /Histórico completo/,
  'Modo Tudo deve possuir uma Home própria para a trajetória completa');
assert.match(homeAllTime, /Saldo monetário atual/,
  'Modo Tudo não pode transformar eventos futuros em saldo disponível hoje');
assert.match(homeAllTime, /Saldo livre após compromissos/,
  'Home completa deve explicitar o dinheiro livre depois das obrigações abertas');
assert.match(homeAllTime, /Projeção final da base/,
  'Home completa deve mostrar o efeito conjunto de receitas previstas e compromissos');
assert.match(homePeriodSummary, /event\.status === 'planned'/,
  'Consolidação histórica deve separar eventos planejados dos realizados');
assert.match(homePeriodSummary, /event\.type !== 'transfer'/,
  'Transferências não podem alterar o patrimônio consolidado no modo Tudo');
assert.match(homePeriodSummary, /VEROCARD/,
  'Benefício deve permanecer separado do caixa monetário no histórico completo');

assert.match(styles, /--bg:#f3f7f7/);
assert.match(styles, /--nav:#071727/);
assert.match(styles, /--brand:#19b990/);
assert.match(styles, /container-type:inline-size/);
assert.match(styles, /@container phoenix-workspace/);
assert.match(styles, /\.px-top-quick-launch/,
  'Shell Phoenix deve preservar o quick launch do V15');
assert.match(styles, /\.px-period-modes/,
  'Seletor de período deve preservar os modos Mês, Intervalo e Tudo do V15');
assert.match(periodCss, /\.px-period-head/,
  'Seletor de período deve usar cabeçalho contextual premium.');
assert.match(periodCss, /\.px-period-month-stepper/,
  'Seleção mensal deve permitir navegação interativa por competência.');
assert.match(periodCss, /\.px-period-popover-v15[\s\S]*animation:px-period-enter/,
  'Seletor de período deve ter entrada visual fluida.');
assert.match(periodCss, /\.px-period-progress/,
  'Carregamento de período deve ser comunicado dentro do próprio seletor.');
assert.match(styles, /@media \(min-width:681px\) and \(max-width:980px\)/,
  'Web estreito deve manter sidebar em vez de assumir navegação móvel');
assert.match(styles, /\.px-premium-balance/);
assert.match(styles, /\.px-launch-drawer/);
assert.match(styles, /\.px-detail-drawer/);
assert.match(styles, /\.px-side-footer/,
  'Menu Lateral deve separar navegação do rodapé de saída');
assert.match(styles, /overflow-y:(?:auto|scroll)/,
  'Menu Lateral deve manter rolagem própria quando houver mais módulos que altura disponível');
assert.match(styles, /overflow-x:hidden!important/,
  'Menu Lateral recolhido não pode criar rolagem horizontal');
assert.match(styles, /\.px-user-chevron\s*\{\s*display:none!important;/,
  'Topbar não deve exibir chevron sem menu de perfil funcional');
assert.match(styles, /\.px-home-scroll-list/,
  'Agenda e histórico da Home devem possuir rolagem interna controlada');
assert.match(homeDashboard, /data-home-layout="premium-v1"/,
  'Home deve expor o marcador do cockpit premium.');
assert.match(homeDashboard, /Seu dinheiro, agora/,
  'Home deve abrir com uma leitura executiva e imediata.');
assert.match(homeDashboard, /Saldo disponível/);
assert.match(homeDashboard, /Pendências abertas/);
assert.match(homeDashboard, /Próximos 7 dias/);
assert.match(homeDashboard, /A receber/);
assert.match(homeDashboard, /Resumo executivo/);
assert.match(homeDashboard, /px-home-benefit-chip/,
  'Home deve mostrar o saldo do benefício no hero sem criar um quinto KPI.');
assert.match(homeDashboard, /setBenefitOpen\(true\)/,
  'Chip do benefício deve abrir o acompanhamento detalhado.');
assert.match(homeDashboard, /Evolução do saldo/,
  'Modal de benefício deve mostrar evolução de saldo.');
assert.match(homeDashboard, /Saldo inicial/);
assert.match(homeDashboard, /Utilizado/);
assert.match(homeDashboard, /Movimentações/);
assert.match(homeDashboard, /Créditos no período/,
  'Modal de benefício deve separar crédito, utilização e saldo final sem depender de gráfico.');
assert.doesNotMatch(homeDashboard, /px-home-benefit-chart/,
  'Gráfico do benefício não deve voltar a ocupar espaço sem acrescentar leitura operacional.');
assert.match(homeNowCss, /\.px-home-benefit-modal/,
  'Acompanhamento do benefício deve possuir modal dedicado.');
assert.match(homeAllTime, /data-home-alltime-layout="period-intelligence-v2"/,
  'Home analítica deve compartilhar um layout próprio para Tudo e períodos históricos.');
assert.match(homeAllTime, /Comparação com o saldo real/,
  'Períodos históricos devem ser comparados explicitamente com o saldo monetário real de hoje.');
assert.match(homeAllTime, /Saldo inicial/,
  'Leitura histórica deve explicitar a posição imediatamente anterior ao recorte.');
assert.match(homeAllTime, /Saldo final do período/,
  'Leitura histórica deve explicitar como o período terminou.');
assert.match(homeNowCss, /\.px-main-home-all[\s\S]*overflow:hidden/,
  'Home Tudo deve manter o shell estável.');
assert.match(homeNowCss, /\.px-content-home\.px-content-home-all[\s\S]*overflow-y:auto !important/,
  'Home Tudo deve permitir rolagem vertical do conteúdo extenso.');
assert.match(homeNowCss, /\.px-main-home-all > \.px-content-home\.px-content-home-all[\s\S]*inset:64px 0 0 0 !important/,
  'Home Tudo deve começar imediatamente abaixo da topbar, sem compensação vertical duplicada.');
assert.match(homeNowCss, /\.px-home-alltime > \.px-page-head[\s\S]*padding:0 2px 2px !important/,
  'Cabeçalho da Home Tudo não deve reservar faixa vazia no topo.');
assert.match(homeDashboard, /benefício permanece separado do saldo monetário/i,
  'Benefício deve permanecer visualmente separado do saldo monetário.');
assert.match(homeNowCss, /\.px-home-benefit-chip/,
  'Chip de benefício deve possuir estilo próprio no hero.');
assert.match(homeNowCss, /grid-template-rows:72px 82px 68px minmax\(0,1fr\)/,
  'Home desktop deve distribuir hero, KPIs, prioridade e workspace em faixas explícitas.');
assert.match(homeNowCss, /\.px-home-priority-list[\s\S]*overflow-y:auto/,
  'Lista de prioridades deve concentrar a rolagem operacional.');
assert.match(homeNowCss, /\.phoenix-v15 \.px-main-home[\s\S]*height:100dvh/,
  'Home deve operar como cockpit fixo no desktop.');
assert.doesNotMatch(styles, /@import/,
  'Contrato Phoenix deve ser autocontido e não importar CSS legado');

assert.match(sidebar, /Buscar no MEG/);
assert.match(sidebar, /px-search-icon[^>]*aria-hidden="true">⌘</,
  'Busca retraída deve usar um único símbolo de comando centralizado');
assert.doesNotMatch(sidebar, /PhoenixNavIcon name="search"/,
  'Busca do rail não deve voltar a duplicar lupa e símbolo de comando');
assert.doesNotMatch(sidebar, /<kbd>/,
  'Atalho de teclado não deve ficar exposto visualmente dentro do campo de busca');
assert.doesNotMatch(sidebar, /<details/,
  'Módulos do Menu Lateral não podem voltar a ficar escondidos em um details fechado');
assert.doesNotMatch(sidebar, /px-side-user/,
  'Perfil não deve se repetir no rodapé do Menu Lateral');
assert.match(sidebar, /title=\{collapsed \? item\.label/,
  'Menu Lateral retraído deve expor o nome do módulo por hover nativo');
assert.match(sidebar, /px-side-footer/,
  'Navegação deve ficar separada do rodapé de saída');
for (const label of ['Início', 'Lançamentos', 'Histórico', 'Pendentes', 'Cartões', 'Cadastros', 'Usuários e permissões', 'Contas a receber', 'Receitas', 'Fluxo de caixa', 'Conciliação', 'Análises', 'Orçamentos e metas', 'Configurações']) {
  assert.ok(sidebar.includes(label), `Módulo ausente no Menu Lateral: ${label}`);
}
for (const icon of ['home', 'movements', 'history', 'payables', 'cards', 'catalogs', 'users', 'receivables', 'revenues', 'cashflow', 'reconcile', 'analytics', 'budgets', 'settings', 'logout']) {
  assert.ok(navIcon.includes(`name === '${icon}'`) || sidebar.includes(`icon: '${icon}'`) || sidebar.includes(`name="${icon}"`), `Ícone SVG do Menu Lateral ausente: ${icon}`);
}
assert.notEqual(sidebar.indexOf("icon: 'history'"), sidebar.indexOf("icon: 'payables'"),
  'Histórico e Pendentes devem manter ícones semanticamente distintos');

assert.match(phoenixApp, /PhoenixOperationalMobileHome/,
  'APK deve substituir a home pesada por uma home operacional focada em lançamentos.');
assert.match(phoenixApp, /syncPhoenixLocalDueNotifications/,
  'APK deve sincronizar alertas locais após carregar a base real.');
assert.match(operationalHome, /Alimentação/,
  'Home operacional deve oferecer atalho protegido para Benefício Alimentação.');
assert.match(operationalHome, /Despesa[\s\S]*Receita/,
  'Home operacional deve priorizar receitas e despesas.');
assert.match(operationalCss, /body\.meg-operational-mobile \.px-launch-drawer[\s\S]*width:100vw!important/,
  'Drawer Android deve ocupar a tela e se adaptar ao aparelho.');
assert.match(nativeNotifications, /Contas vencidas|contas vencidas|Conta vencida/,
  'Notificações Android devem cobrir compromissos vencidos.');
assert.match(nativeNotifications, /Conta vence amanhã[\s\S]*Conta vence hoje/,
  'Notificações Android devem cobrir contas a vencer.');
assert.match(main, /meg-operational-mobile/,
  'Build móvel deve marcar o runtime operacional antes de montar a Phoenix.');

assert.match(phoenixApp, /px-top-quick-launch/,
  'Topbar Phoenix deve expor o novo lançamento global do V15');
assert.match(phoenixApp, /requestLaunch/,
  'Quick launch e dock móvel devem compartilhar a mesma abertura do drawer');
assert.match(phoenixApp, /PhoenixHomeDashboard/,
  'Home corrente deve usar o dashboard acionável consolidado');
assert.match(phoenixApp, /ctrlKey \|\| event\.metaKey/,
  'Atalho Ctrl\/Cmd+K deve abrir a busca global');
assert.match(phoenixApp, /setRefreshKey\(\(value\) => value \+ 1\)/,
  'Sincronização manual deve refazer somente leituras reais');
assert.match(phoenixApp, /periodDraftMode === 'range'/,
  'Intervalo V15 deve possuir aplicação real, não somente aparência');
assert.match(phoenixApp, /loadPhoenixAllEvents/,
  'Modo Tudo deve usar leitura real completa');
assert.match(phoenixApp, /view === 'home' && periodMode !== 'month'/,
  'Intervalo e Tudo devem permanecer aplicados na Home principal em modo analítico.');
assert.match(phoenixApp, /analyticalMonth = periodMode === 'month' && month !== currentMonth\(\)/,
  'Somente o mês atual deve usar a Home operacional; outros meses devem abrir a leitura analítica.');
assert.match(phoenixApp, /realizedPeriodBounds/,
  'Saldo histórico deve ser reconstruído a partir do saldo real atual e dos movimentos realizados.');
assert.match(phoenixApp, /const baseMonth = currentMonth\(\)/,
  'Modo Tudo deve usar o mês atual como base do saldo monetário realizado');
assert.match(phoenixApp, /Histórico completo/,
  'O seletor deve explicar claramente o escopo global do modo Tudo');
assert.match(phoenixApp, /peekPhoenixReadModel/,
  'Troca de mês deve aproveitar fotografia já carregada');
assert.match(phoenixApp, /monthlySnapshotMatches/,
  'Troca mensal deve validar coerência entre mês, resumo, análises e fluxo antes de publicar a fotografia');
assert.match(phoenixApp, /applyMonthlyPeriod/,
  'Seleção mensal deve aguardar a fotografia completa antes de trocar o período visível');
assert.match(phoenixApp, /periodRequestRef/,
  'Respostas atrasadas de trocas anteriores não podem sobrescrever a seleção mais recente');
assert.match(phoenixApp, /prefetchPhoenixReadModel/,
  'Shell deve pré-aquecer o mês escolhido e meses vizinhos para reduzir a espera percebida.');
assert.match(phoenixApp, /Promise\.all\(\[\s*loadPhoenixReadModel\(baseMonth[\s\S]*loadPhoenixAllEvents/,
  'Modo Tudo deve carregar snapshot-base e eventos completos em paralelo.');
assert.match(phoenixApp, /quickRange/,
  'Atalhos de intervalo devem aplicar o período em um clique.');
assert.match(phoenixApp, /quickMonth/,
  'Atalhos mensais devem aplicar o período em um clique.');
assert.match(phoenixApp, /px-period-progress/,
  'Troca de período deve exibir progresso contextual sem desmontar a tela.');
assert.doesNotMatch(phoenixApp, /setMonth\(end\.slice\(0,\s*7\)\)/,
  'Intervalo de Lançamentos não pode alterar silenciosamente o mês oficial da Home');
for (const screen of ['PhoenixMovementsV15', 'PhoenixHomeDashboard', 'PhoenixHomeAllTime', 'PhoenixHistory', 'PhoenixPayables', 'PhoenixCards', 'PhoenixCatalogs', 'PhoenixUsers', 'PhoenixSettings', 'PhoenixReceivables', 'PhoenixRevenues', 'PhoenixCashflow', 'PhoenixReconciliation', 'PhoenixAnalytics', 'PhoenixBudgets', 'PhoenixCommandPalette', 'PhoenixSidebar']) {
  assert.ok(phoenixApp.includes(screen), `Tela Phoenix não conectada: ${screen}`);
}
assert.match(phoenixApp, /onLogout/,
  'Phoenix deve expor saída de sessão ao preview isolado');

assert.match(phoenixHtml, /src\/phoenix\/preview-main\.tsx/,
  'Preview Phoenix deve usar sua própria entrada');
assert.match(phoenixHtml, /phoenix-home-dashboard\.css/,
  'Preview deve carregar o refinamento acionável da Home');
assert.doesNotMatch(phoenixHtml, /src\/app\/main\.tsx/,
  'Preview Phoenix não deve apontar para a entrada de produção');
assert.match(productionHtml, /src\/app\/main\.tsx/,
  'Entrada de produção deve continuar apontando para o sistema atual');
assert.doesNotMatch(productionHtml, /src\/phoenix\/preview-main\.tsx/,
  'Produção não deve apontar para o preview Phoenix');
assert.match(previewMain, /PhoenixApp/);
assert.match(previewMain, /login\(/,
  'Preview deve autenticar pelo contrato existente sem reutilizar a tela de login antiga');
assert.match(previewMain, /logout\(/,
  'Preview deve revogar a sessão pelo contrato de autenticação existente');
assert.match(previewMain, /onLogout=/,
  'Preview deve conectar a ação de sair da Phoenix');

assert.doesNotMatch(main, /PhoenixApp/,
  'Phoenix ainda não deve estar ligada à entrada de produção durante a fase somente leitura isolada');

console.log('Contrato clean-room da Phoenix V15 validado.');
