import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const phoenixApp = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('./PhoenixSidebar.tsx', import.meta.url), 'utf8');
const navIcon = readFileSync(new URL('./PhoenixNavIcon.tsx', import.meta.url), 'utf8');
const profileAvatar = readFileSync(new URL('./profile-avatar.tsx', import.meta.url), 'utf8');
const commandPalette = readFileSync(new URL('./PhoenixCommandPalette.tsx', import.meta.url), 'utf8');
const screens = readFileSync(new URL('./screens/PhoenixReadScreens.tsx', import.meta.url), 'utf8');
const movementScreen = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const launchWriteControl = readFileSync(new URL('./components/PhoenixLaunchWriteControl.tsx', import.meta.url), 'utf8');
const homeDashboard = readFileSync(new URL('./screens/PhoenixHomeDashboard.tsx', import.meta.url), 'utf8');
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
const styles = `${readFileSync(new URL('./phoenix-v15.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-parity-v15.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-period.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-sidebar.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-screens.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-home-dashboard.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-history.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-users.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-settings.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-web-screens.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-overlays.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-launch.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./preview.css', import.meta.url), 'utf8')}`;
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const phoenixSource = `${phoenixApp}\n${sidebar}\n${navIcon}\n${profileAvatar}\n${commandPalette}\n${screens}\n${movementScreen}\n${homeDashboard}\n${homeAllTime}\n${homePeriodSummary}\n${webScreens}\n${history}\n${users}\n${settings}\n${previewMain}`;
const readOnlyScreens = `${screens}\n${movementScreen}\n${homeDashboard}\n${homeAllTime}\n${webScreens}\n${history}\n${users}\n${settings}\n${sidebar}\n${commandPalette}`;

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
assert.match(loader, /authenticatedRequest<PhoenixPreviewCoreRead>\(`\/finance\/phoenix-preview\?month=\$\{encodeURIComponent\(month\)\}`\)/,
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
assert.match(history, /Fonte principal:/);
assert.match(history, /\/finance\/audit/);
assert.match(history, /AppState\.activityLog/);
assert.match(history, /Antes \/ depois confirmado pelo backend/,
  'Histórico Phoenix deve exibir snapshots before/after somente para a auditoria financeira estrutural');
assert.match(history, /Histórico legado/,
  'Histórico anterior à auditoria normalizada deve permanecer preservado');
assert.match(history, /Exportar histórico filtrado/);
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
assert.match(movementScreen, /data-col="description"/,
  'Colunas da grade devem possuir identidade estável para mostrar e ocultar em tempo real');
assert.match(movementScreen, /invalidField\('descrição'\)/,
  'Campos obrigatórios devem possuir validação inline contextual');
assert.doesNotMatch(movementScreen, /Os campos marcados com \* são obrigatórios/,
  'O editor não deve voltar a abrir com instruções fixas ocupando a área de preenchimento');
assert.doesNotMatch(movementScreen, /method\s*:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/,
  'Tela de Lançamentos não deve incorporar requisições de escrita diretamente');

assert.match(homeDashboard, /Últimos 20 eventos/,
  'Home corrente deve manter feed recente rolável em vez de depender apenas da auditoria nova');
assert.match(homeDashboard, /data\.activities/,
  'Home deve usar o histórico legado como compatibilidade quando necessário');
assert.match(homeDashboard, /Vencimentos de/,
  'Agenda da Home deve listar o período selecionado por vencimento');
assert.match(homeDashboard, /Fatura \$\{item\.cardLabel/,
  'Cartões devem ser agrupados por identidade e vencimento na agenda');
assert.match(homeDashboard, /px-home-drawer/,
  'Detalhes de vencimento devem abrir drawer na própria Home');
assert.match(homeDashboard, /Revisar pagamento/,
  'Drawer da Home deve permitir selecionar itens para revisão de pagamento');
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
assert.match(phoenixApp, /view === 'home' && periodMode === 'all'/,
  'Modo Tudo deve permanecer aplicado na Home principal, não apenas em Lançamentos');
assert.match(phoenixApp, /const baseMonth = currentMonth\(\)/,
  'Modo Tudo deve usar o mês atual como base do saldo monetário realizado');
assert.match(phoenixApp, /Tudo permanece ativo entre Home e Lançamentos/,
  'O seletor deve explicar o escopo global do modo Tudo');
assert.match(phoenixApp, /peekPhoenixReadModel/,
  'Troca de mês deve aproveitar fotografia já carregada');
assert.match(phoenixApp, /monthlySnapshotMatches/,
  'Troca mensal deve validar coerência entre mês, resumo, análises e fluxo antes de publicar a fotografia');
assert.match(phoenixApp, /applyMonthlyPeriod/,
  'Seleção mensal deve aguardar a fotografia completa antes de trocar o período visível');
assert.match(phoenixApp, /periodRequestRef/,
  'Respostas atrasadas de trocas anteriores não podem sobrescrever a seleção mais recente');
assert.doesNotMatch(phoenixApp, /prefetchPhoenixReadModel/,
  'Shell não deve pré-carregar meses adjacentes enquanto o endpoint mensal continuar custoso');
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
