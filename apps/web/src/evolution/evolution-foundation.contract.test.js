import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const paths=[
  './main.tsx',
  './app/EvolutionApp.tsx',
  './screens/EvolutionLoading.tsx',
  './screens/EvolutionLogin.tsx',
  './screens/EvolutionHome.tsx',
  './screens/EvolutionLaunchModal.tsx',
  './screens/EvolutionMovements.tsx',
  './screens/EvolutionPreview.tsx',
  './components/EvolutionFinancialIcon.tsx',
  './components/EvolutionPicker.tsx',
  './components/EvolutionSmartGridFilter.tsx',
  './styles/global.css',
  './styles/tokens.css',
  './styles/loading.css',
  './styles/login.css',
  './styles/home.css',
  './styles/launch-modal.css',
  './styles/movements.css',
  './styles/preview.css',
  './screens/EvolutionSystem.tsx',
  './screens/EvolutionActionDialog.tsx',
  './screens/EvolutionPurchaseDialog.tsx',
  './screens/EvolutionParityPanels.tsx',
  './app/system-domain.ts',
  './components/SystemUI.tsx',
  './styles/system.css',
  './styles/evolution-parity.css',
  './styles/smart-grid.css'
];

for(const filePath of paths){
  const content=fs.readFileSync(new URL(filePath,import.meta.url),'utf8');
  assert.doesNotMatch(content,/\.\.\/phoenix|\/phoenix\/|PhoenixApp|phoenix-/i,'Evolution não pode depender do visual Phoenix');
  assert.doesNotMatch(content,/web-next/i,'Evolution não pode depender do Web Next anterior');
  assert.doesNotMatch(content,/from\s+['\"][^'\"]*\/mobile\//i,'Evolution não pode importar componentes visuais Mobile.');
}

const html=fs.readFileSync(new URL('../../evolution.html',import.meta.url),'utf8');
assert.match(html,/data-meg-shell="evolution"/);
assert.match(html,/\/src\/evolution\/main\.tsx/);
assert.doesNotMatch(html,/phoenix/i);

const loading=fs.readFileSync(new URL('./screens/EvolutionLoading.tsx',import.meta.url),'utf8');
assert.match(loading,/data-evolution-loading-fidelity="master-artwork-fullscreen"/);
assert.match(loading,/\.\/evolution\/artwork\/loading-master\.webp/);
assert.match(loading,/role="progressbar"/);
assert.match(loading,/aria-valuenow=\{normalized\}/);
assert.match(loading,/Carregando seus dados/);
assert.match(loading,/Organizando suas finanças/);

const artwork=fs.readFileSync(new URL('../../public/evolution/artwork/loading-master.webp',import.meta.url));
assert.ok(artwork.length > 50000,'Artwork mestre não pode ser substituído por placeholder.');
assert.equal(
  crypto.createHash('sha256').update(artwork).digest('hex'),
  'a1f092a27506e96dd499d13e2a686bb34048bdf5b2ae7a4096e96f69096e4de3',
  'Artwork mestre do Loading foi alterado sem nova validação visual.'
);

const app=fs.readFileSync(new URL('./app/EvolutionApp.tsx',import.meta.url),'utf8');
assert.match(app,/forcedScreen\|\|'login'/,'Acesso normal ao Evolution deve começar no Login.');
assert.match(app,/onAuthenticated=\{\(\)=>\{/,'Login deve disparar a etapa de carregamento após autenticação.');
assert.match(app,/setPhase\('loading'\)/,'Autenticação deve levar ao Loading.');
assert.match(app,/setPhase\('system'\)/,'Loading deve levar ao sistema.');
assert.match(app,/phase==='system'\)return <EvolutionHome\/>/,'Sistema deve abrir a Home Evolution.');
assert.doesNotMatch(app,/EvolutionSystemEntry/,'Porta técnica temporária deve sair do fluxo.');
assert.match(app,/screen==='login'\|\|screen==='loading'\|\|screen==='system'\|\|screen==='preview'/,'QA precisa permitir acesso direto às fases e à galeria de prévias.');
assert.match(app,/phase==='preview'\)return <EvolutionPreview\/>/,'Galeria de prévias deve ter rota isolada do sistema real.');

const loginScreen=fs.readFileSync(new URL('./screens/EvolutionLogin.tsx',import.meta.url),'utf8');
assert.match(loginScreen,/data-evolution-login-fidelity="product-v2"/);
assert.match(loginScreen,/Bem-vindo de volta/);
assert.match(loginScreen,/Entrar no MEG/);
assert.match(loginScreen,/login\(email\.trim\(\),password\)/,'Login Evolution deve usar autenticação real.');
assert.match(loginScreen,/\.\/brand\/meg-loading-lockup\.svg/,'Login deve usar a marca canônica do MEG.');
assert.doesNotMatch(loginScreen,/evolution\/brand\/meg-mark\.svg/,'A versão interpretada da marca não pode voltar ao Login.');

const loadingCss=fs.readFileSync(new URL('./styles/loading.css',import.meta.url),'utf8');
assert.match(loadingCss,/\.evo-loading-artboard\{[\s\S]*width:100vw;[\s\S]*height:100dvh;/,'Loading deve ocupar todo o viewport.');
assert.match(loadingCss,/filter:blur\(13px\) brightness\(\.68\)/,'Extensão visual deve preencher a tela sem criar um quadrado destacado.');
assert.match(loadingCss,/mask-image:linear-gradient/,'Artwork central deve se fundir ao cenário estendido.');

const loginCss=fs.readFileSync(new URL('./styles/login.css',import.meta.url),'utf8');
assert.match(loginCss,/input:-webkit-autofill/,'Login deve neutralizar o fundo automático do navegador nos campos preenchidos.');
assert.match(loginCss,/background-clip:text/,'Autofill não deve pintar um bloco atrás do texto.');
assert.match(loginCss,/evo-login-orbit,[\s\S]*evo-login-storyline\{display:none!important\}/,'Linhas decorativas do Login não podem cruzar o conteúdo.');

const home=fs.readFileSync(new URL('./screens/EvolutionHome.tsx',import.meta.url),'utf8');
assert.match(home,/EvolutionSystem/,'Home deve abrir o sistema funcional do conjunto de referências.');
const system=fs.readFileSync(new URL('./screens/EvolutionSystem.tsx',import.meta.url),'utf8');
for(const name of ['Lançamentos','Contas a pagar','Cartões de crédito','Benefícios','Relatórios'])assert.ok(system.includes(name),'Módulo obrigatório ausente: '+name);
assert.doesNotMatch(system,/Plano Premium|Upgrade agora/);
assert.match(system,/loadSystem/,'Produto autenticado deve carregar dados reais.');
assert.match(system,/operações financeiras desativadas/,'Prévia deve se identificar e bloquear gravações.');
assert.match(system,/EvolutionActionDialog/);
assert.match(system,/EvolutionPurchaseDialog/);
assert.match(system,/meg-loading-lockup\.svg/,'Marca canônica deve ser compartilhada.');
const domain=fs.readFileSync(new URL('./app/system-domain.ts',import.meta.url),'utf8');
assert.match(domain,/settlementSources/,'Faturas devem resolver vínculos reais de origem.');
assert.match(domain,/financeClient\.getSummary/);
assert.match(domain,/cardsClient\.list/);
assert.match(domain,/payablesClient\.list/);
assert.doesNotMatch(domain,/status==='fulfilled'.*fixture/,'Falhas reais não podem retornar dados ilustrativos.');
const actions=fs.readFileSync(new URL('./screens/EvolutionActionDialog.tsx',import.meta.url),'utf8');
assert.match(actions,/pending\/batch\/settle/,'Seleção deve usar a baixa atômica do servidor.');
assert.match(actions,/getMonetaryBalance/,'Saldo deve considerar a data escolhida.');
assert.match(actions,/benefit-events/,'Recarga deve preservar o fluxo de benefício.');
assert.match(actions,/idFor/,'Repetir a mesma tentativa deve preservar operationId.');

const launch=fs.readFileSync(new URL('./screens/EvolutionLaunchModal.tsx',import.meta.url),'utf8');
assert.match(launch,/Novo Lançamento/);
assert.match(launch,/À Vista/);
assert.match(launch,/Crédito/);
assert.doesNotMatch(launch,/Crediário|paymentMode==='installment'/,'Crediário está aposentado para novos lançamentos Web.');
assert.match(launch,/Benefício/);
assert.match(launch,/financeClient\.createEvent/,'Lançamento comum deve usar API financeira real.');
assert.match(launch,/cardsClient\.createPurchase/,'Compra no crédito deve usar API real de cartões.');
assert.match(launch,/Math\.min\(48/,'Crédito continua aceitando parcelamento até 48 vezes.');
assert.match(launch,/financeClient\.listEvents\(1,12,description\.trim\(\)\)/,'Descrição deve consultar histórico real para autocomplete.');
assert.match(launch,/uniqueCategories/,'Categorias legadas duplicadas devem ser deduplicadas na apresentação.');
assert.match(launch,/EvolutionPicker/,'Categorias, contas e formas devem usar picker visual próprio.');
assert.match(launch,/Classificação da conta/,'Novo Lançamento Web deve exibir classificação real de conta.');
assert.match(launch,/Contas gerais/,'Classificação deve incluir contas gerais.');
assert.match(launch,/Investimentos/,'Classificação deve incluir investimentos.');
assert.match(launch,/Conta monetária/,'Tipo de conta deve incluir conta monetária.');
assert.match(launch,/Conta benefício/,'Tipo de conta deve incluir conta benefício.');
assert.match(launch,/accountClassificationOf/,'Classificação deve filtrar contas reais, não ser apenas decoração.');
assert.match(launch,/evo-launch-summary-detailed/,'Novo Lançamento deve manter resumo detalhado antes de salvar.');
assert.match(launch,/evo-launch-category-shortcuts/,'Novo Lançamento deve oferecer atalhos visuais de categoria.');
assert.match(launch,/LaunchStep='choose'\|'form'\|'success'/,'Novo Lançamento deve seguir seleção do tipo, formulário e confirmação como no app.');
assert.match(launch,/Escolha o tipo de lançamento/,'Abertura deve começar pela escolha Despesa, Receita ou Alimentação.');
assert.match(launch,/Campos automáticos/,'Benefício deve manter conta, forma e situação automáticas.');
assert.match(launch,/Visualizar parcelas/,'Crédito deve preservar prévia de parcelas.');
assert.doesNotMatch(launch,/<select className="evo-launch-more"/,'Categorias não podem voltar ao seletor nativo do navegador.');
assert.doesNotMatch(launch,/MegMobile|phoenix-/i,'Evolution Launch não pode reutilizar visual Mobile/Phoenix.');

const launchControlCss=fs.readFileSync(new URL('./styles/launch-modal.css',import.meta.url),'utf8');
assert.match(launchControlCss,/MEG CONTROL 3D v1/,'Novo Lançamento deve preservar a camada visual 3D aprovada.');
assert.match(launchControlCss,/clamp\(/,'Novo Lançamento deve dimensionar tipografia e controles de forma responsiva.');
assert.match(launchControlCss,/grid-template-columns:minmax\(0,1\.48fr\) minmax\(360px,\.86fr\)/,'Desktop largo deve usar composição espacial própria.');
assert.match(launchControlCss,/@media\(max-width:920px\)/,'Novo Lançamento deve recompor colunas automaticamente em viewports menores.');

const movements=fs.readFileSync(new URL('./screens/EvolutionMovements.tsx',import.meta.url),'utf8');
assert.match(movements,/data-evolution-screen="movements"/);
assert.match(movements,/financeClient\.listEventsForMonth/,'Lançamentos deve usar eventos reais do período.');
assert.match(movements,/financeClient\.listAccounts/);
assert.match(movements,/financeClient\.listCategories/);
assert.match(movements,/financeClient\.listPaymentMethods/);
assert.match(movements,/Receitas/);
assert.match(movements,/Despesas/);
assert.match(movements,/Benefício/);
assert.match(movements,/Buscar por descrição, categoria, conta ou forma de pagamento/);
assert.match(movements,/evo-movement-table/,'Desktop deve aproveitar tabela ampla em vez de esticar a lista mobile.');
assert.doesNotMatch(movements,/MegMobile|meg-mobile-/,'Lançamentos Evolution não pode reutilizar visual Mobile.');

const movementsCss=fs.readFileSync(new URL('./styles/movements.css',import.meta.url),'utf8');
assert.match(movementsCss,/grid-template-columns:202px minmax\(0,1fr\)/,'Desktop deve manter filtros e tabela lado a lado.');
assert.match(movementsCss,/\.evo-movement-scroll/,'Lista densa deve rolar internamente.');

const launchCss=fs.readFileSync(new URL('./styles/launch-modal.css',import.meta.url),'utf8');
assert.match(launchCss,/\.evo-launch-backdrop/);
assert.match(launchCss,/backdrop-filter:blur/);
assert.match(launchCss,/\.evo-home-add/);
assert.match(launchCss,/\.evo-picker-grid/,'Picker visual deve usar grid próprio no Web.');
assert.match(launchCss,/\.evo-launch-choice-cards/,'Seleção do tipo deve usar os três cartões funcionais do app.');
assert.match(launchCss,/grid-template-columns:minmax\(0,1\.15fr\) minmax\(330px,\.85fr\)/,'Web deve ampliar o formulário em duas áreas funcionais, sem esticar a folha mobile.');
assert.match(launchCss,/\.evo-launch-history/,'Autocomplete visual deve ter superfície própria.');

const homeCss=fs.readFileSync(new URL('./styles/system.css',import.meta.url),'utf8');
assert.match(homeCss,/height:100dvh/);
assert.match(homeCss,/overflow:hidden/);
assert.match(homeCss,/meg-scroll/);
assert.match(homeCss,/@media\(max-width:720px\)/);
assert.match(homeCss,/clamp\(/);

const tokens=fs.readFileSync(new URL('./styles/tokens.css',import.meta.url),'utf8');
for(const color of ['#071321','#0a1728','#0d1d2d','#53cf8d','#71dda4','#4bbac7']){
  assert.ok(tokens.toLowerCase().includes(color),'paleta oficial ausente');
}

console.log('MEG Evolution auth -> loading -> Home Command Center contract OK');


const preview=fs.readFileSync(new URL('./screens/EvolutionPreview.tsx',import.meta.url),'utf8');
assert.match(preview,/data-evolution-screen="preview"/);
for(const key of ['home','movements','launch','payables','settlement','cards','card-center','benefit','cashflow','analytics','history','settings','period','menu']){
  assert.ok(preview.includes("'"+key+"'"),'Prévia obrigatória ausente: '+key);
}
assert.doesNotMatch(preview,/from\s+['"][^'"]*\/mobile\//i,'Galeria Web não pode importar componentes visuais Mobile.');
assert.match(preview,/EvolutionSystem/,'Galeria deve usar os componentes funcionais atuais em modo consulta.');


const parity=fs.readFileSync(new URL('./screens/EvolutionParityPanels.tsx',import.meta.url),'utf8');
const parityCss=fs.readFileSync(new URL('./styles/evolution-parity.css',import.meta.url),'utf8');
assert.match(system,/PeriodMode/,'Evolution deve preservar o seletor de período completo do App.');
assert.match(system,/applyRangePeriod[\s\S]*applyAllPeriod/,'Evolution deve suportar Intervalo e Tudo além do mês.');
assert.match(system,/EvolutionHistory/,'Histórico de auditoria do App deve existir no Evolution.');
assert.match(system,/EvolutionCardCenter/,'Central completa do cartão deve existir no layout validado.');
assert.match(system,/EvolutionSettings/,'Configurações operacionais do App devem existir no Evolution.');
assert.match(system,/EvolutionBenefitLedger/,'Benefício deve preservar filtros próprios de entradas e saídas.');
assert.match(parity,/CardTab='summary'\|'current'\|'upcoming'\|'installments'\|'history'/,'Central do cartão deve preservar Resumo, Atual, Próximas, Parcelas e Histórico.');
assert.match(parity,/exportExcel[\s\S]*exportPdf/,'Central do cartão Web deve preservar exportações Excel e PDF.');
assert.match(parity,/deactivatePaymentMethod[\s\S]*updatePaymentMethod/,'Configurações Web devem ativar e desativar formas de pagamento reais.');
assert.match(parity,/cardsClient\.deactivate[\s\S]*cardsClient\.reactivate/,'Configurações Web devem ativar e desativar cartões reais.');
assert.match(parity,/notifications\/test-channels/,'Diagnóstico de canais do App deve estar disponível na Web.');
assert.match(parity,/profileAvatars[\s\S]*patchCloudStateProperties/,'Avatar deve permanecer sincronizado pela nuvem sem importar visual Phoenix.');
assert.match(parity,/Biometria Android preservada/,'Paridade deve declarar honestamente o limite nativo de biometria.');
assert.match(parity,/Atualização OTA do APK/,'Paridade deve manter OTA como capacidade nativa, sem simulação Web.');
assert.match(domain,/loadAllEvents[\s\S]*financeClient\.listEvents/,'Período Tudo deve carregar o histórico financeiro completo.');
assert.match(domain,/financeClient\.listAudit/,'Domínio Evolution deve carregar auditoria para Histórico.');
assert.match(domain,/cardsClient\.listManagement/,'Domínio Evolution deve carregar cartões inativos para gerenciamento.');
assert.match(parityCss,/evo-card-center-legacy-hide/,'Central nova deve substituir a tabela simplificada quando estiver aberta.');
assert.doesNotMatch(parity,/from\s+['"][^'"]*\/mobile\//i,'Paridade funcional não pode copiar o visual Mobile.');
assert.doesNotMatch(parity,/\.\.\/phoenix|\/phoenix\//i,'Paridade funcional deve continuar clean-room.');
console.log('MEG Evolution Android functional parity contract OK');


const finalFidelityCss=fs.readFileSync(new URL('./styles/evolution-parity.css',import.meta.url),'utf8');
const smartGrid=fs.readFileSync(new URL('./components/EvolutionSmartGridFilter.tsx',import.meta.url),'utf8');
const smartGridCss=fs.readFileSync(new URL('./styles/smart-grid.css',import.meta.url),'utf8');
const movementGrid=system.slice(system.indexOf('function MovementGrid'),system.indexOf('function NotificationsDialog'));
assert.match(system,/MovementGrid/,'Lançamentos finais devem usar grid próprio com filtros por coluna.');
assert.match(movementGrid,/EvolutionSmartGridFilter label="Data"[\s\S]*label="Descrição"[\s\S]*label="Categoria"[\s\S]*label="Conta"[\s\S]*label="Forma"[\s\S]*label="Status"[\s\S]*label="Valor"/,'Todas as colunas analíticas devem usar filtro integrado ao cabeçalho.');
assert.doesNotMatch(movementGrid,/<select\b/,'MEG Smart Grid não pode voltar a usar select nativo nos filtros.');
assert.match(smartGrid,/Pesquisar valores[\s\S]*Selecionar tudo/,'Filtro múltiplo deve oferecer pesquisa e checkboxes.');
assert.match(smartGrid,/Menor → maior[\s\S]*Maior → menor/,'Valores devem possuir ordenação numérica.');
assert.match(smartGrid,/Mais antiga → recente[\s\S]*Mais recente → antiga/,'Datas devem possuir ordenação cronológica.');
assert.match(smartGridCss,/evo-smart-filter-popover[\s\S]*border-radius:20px/,'Popover do Smart Grid deve preservar o acabamento premium arredondado.');
assert.match(system,/meg-home-status[\s\S]*meg-home-metrics[\s\S]*meg-home-bottom/,'Home final deve preservar as três faixas do layout aprovado.');
assert.match(system,/Cartões[\s\S]*Benefício Alimentação[\s\S]*Ações rápidas/,'Faixa inferior da Home deve preservar Cartões, Benefício e Ações rápidas.');
assert.match(system,/meg-pending-toolbar/,'Pendentes deve manter filtros e seleção no próprio grid.');
assert.match(system,/meg-cards-showcase[\s\S]*Fatura atual[\s\S]*Próximas faturas/,'Cartões deve preservar carrossel, fatura atual e futuras.');
assert.match(finalFidelityCss,/meg-home-grid\.meg-home-final/);
assert.match(smartGridCss,/evo-smart-filter-trigger/);
assert.match(finalFidelityCss,/meg-cards-lower/);

assert.match(system,/NotificationsDialog/,'Notificações finais devem ter superfície própria, não apenas resumo numérico.');
assert.match(system,/A pagar[\s\S]*Pagas[\s\S]*Sistema/,'Modal de notificações deve preservar os filtros aprovados.');
assert.match(system,/evo-period-month-grid/,'Seletor de período deve usar grade mensal visual.');
assert.match(finalFidelityCss,/evo-notification-list/);
assert.match(finalFidelityCss,/evo-period-month-grid/);

assert.match(system,/meg-period-entry[\s\S]*meg-global-search[\s\S]*meg-top-actions/,'Cabeçalho final deve manter período à esquerda, busca ao centro e ações à direita.');
assert.match(parity,/Despesas[\s\S]*Receitas[\s\S]*Fluxo de caixa[\s\S]*Categorias/,'Relatórios devem preservar as quatro visões da referência final.');
assert.match(parity,/evo-report-bars/,'Relatórios finais devem priorizar comparação gráfica em barras.');
assert.match(finalFidelityCss,/evo-report-tabs/);
assert.match(finalFidelityCss,/evo-report-summary/);
