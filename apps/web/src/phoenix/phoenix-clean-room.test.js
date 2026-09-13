import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const phoenixApp = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const commandPalette = readFileSync(new URL('./PhoenixCommandPalette.tsx', import.meta.url), 'utf8');
const screens = readFileSync(new URL('./screens/PhoenixReadScreens.tsx', import.meta.url), 'utf8');
const movementScreen = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const webScreens = readFileSync(new URL('./screens/PhoenixWebScreens.tsx', import.meta.url), 'utf8');
const history = readFileSync(new URL('./screens/PhoenixHistory.tsx', import.meta.url), 'utf8');
const users = readFileSync(new URL('./screens/PhoenixUsers.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./screens/PhoenixSettings.tsx', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./data/load-phoenix-read-model.ts', import.meta.url), 'utf8');
const previewMain = readFileSync(new URL('./preview-main.tsx', import.meta.url), 'utf8');
const phoenixHtml = readFileSync(new URL('../../phoenix.html', import.meta.url), 'utf8');
const productionHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const styles = `${readFileSync(new URL('./phoenix-v15.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-parity-v15.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-period.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-screens.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-history.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-users.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-settings.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-web-screens.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-overlays.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./phoenix-launch.css', import.meta.url), 'utf8')}\n${readFileSync(new URL('./preview.css', import.meta.url), 'utf8')}`;
const main = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const phoenixSource = `${phoenixApp}\n${commandPalette}\n${screens}\n${movementScreen}\n${webScreens}\n${history}\n${users}\n${settings}\n${previewMain}`;
const readOnlyScreens = `${screens}\n${movementScreen}\n${webScreens}\n${history}\n${users}\n${settings}\n${commandPalette}`;

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
assert.match(loader, /Math\.ceil\(first\.total \/ 100\)/,
  'Modo Tudo deve calcular todas as páginas em vez de aceitar somente os primeiros 100 eventos');
assert.match(loader, /for \(let page = 2; page <= pages; page \+= 6\)/,
  'Histórico completo deve ser paginado em lotes controlados');
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
assert.match(movementScreen, /Lançamentos no período/,
  'Resumo de lançamentos deve refletir a quantidade completa do período');
assert.match(movementScreen, /Despesa/);
assert.match(movementScreen, /Receita/);
assert.match(movementScreen, /Transferência/);
assert.match(movementScreen, /Proteção contra duplicidade/);
assert.match(movementScreen, /Revisar lançamento · sem gravar/,
  'Drawer Phoenix deve validar o fluxo sem liberar escrita');
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
assert.match(movementScreen, /Possível duplicidade real encontrada/,
  'Proteção de duplicidade deve comparar com dados reais já carregados');
assert.doesNotMatch(movementScreen, /method\s*:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/,
  'Drawer de lançamento deve permanecer sem escrita nesta etapa');

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
assert.doesNotMatch(styles, /@import/,
  'Contrato Phoenix deve ser autocontido e não importar CSS legado');

assert.match(phoenixApp, /⌘ Buscar no MEG/);
assert.match(phoenixApp, /px-top-quick-launch/,
  'Topbar Phoenix deve expor o novo lançamento global do V15');
assert.match(phoenixApp, /requestLaunch/,
  'Quick launch e dock móvel devem compartilhar a mesma abertura do drawer');
assert.match(phoenixApp, /Benefício alimentação · disponível/,
  'Home deve preservar o indicador de benefício do V15');
assert.match(phoenixApp, /Consolidado realizado/,
  'Home deve preservar o consolidado realizado do V15');
assert.match(phoenixApp, /ctrlKey \|\| event\.metaKey/,
  'Atalho Ctrl\/Cmd+K deve abrir a busca global');
assert.match(phoenixApp, /setRefreshKey\(\(value\) => value \+ 1\)/,
  'Sincronização manual deve refazer somente leituras reais');
assert.match(phoenixApp, /periodDraftMode === 'range'/,
  'Intervalo V15 deve possuir aplicação real, não somente aparência');
assert.match(phoenixApp, /loadPhoenixAllEvents/,
  'Modo Tudo deve usar leitura real paginada');
assert.match(phoenixApp, /peekPhoenixReadModel/,
  'Troca de mês deve aproveitar fotografia já carregada');
assert.match(phoenixApp, /prefetchPhoenixReadModel/,
  'Meses adjacentes devem ser preparados silenciosamente');
for (const glyph of ['⌂', '▦', '◷', '▣', '≡', '♙', '⚙']) {
  assert.ok(phoenixApp.includes(glyph), `Ícone V15 ausente: ${glyph}`);
}
for (const screen of ['PhoenixMovementsV15', 'PhoenixHistory', 'PhoenixPayables', 'PhoenixCards', 'PhoenixCatalogs', 'PhoenixUsers', 'PhoenixSettings', 'PhoenixReceivables', 'PhoenixRevenues', 'PhoenixCashflow', 'PhoenixReconciliation', 'PhoenixAnalytics', 'PhoenixBudgets', 'PhoenixCommandPalette']) {
  assert.ok(phoenixApp.includes(screen), `Tela Phoenix não conectada: ${screen}`);
}
assert.match(phoenixApp, /onLogout/,
  'Phoenix deve expor saída de sessão ao preview isolado');

assert.match(phoenixHtml, /src\/phoenix\/preview-main\.tsx/,
  'Preview Phoenix deve usar sua própria entrada');
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