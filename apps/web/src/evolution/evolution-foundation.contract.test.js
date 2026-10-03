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
  './styles/global.css',
  './styles/tokens.css',
  './styles/loading.css',
  './styles/login.css',
  './styles/home.css',
  './styles/launch-modal.css',
  './styles/movements.css',
  './styles/preview.css'
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
assert.match(loginScreen,/data-evolution-login-fidelity="approved-2026-10-03"/);
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
assert.match(home,/data-evolution-home-fidelity="approved-2026-10-03"/);
assert.match(home,/Saldo disponível/);
assert.match(home,/Fluxo do mês/);
assert.match(home,/Contas a pagar/);
assert.match(home,/Faturas de cartões/);
assert.match(home,/Benefícios Verocard/);
assert.match(home,/Ações rápidas/);
assert.match(home,/Últimas movimentações/);
assert.match(home,/Próximos vencimentos/);
assert.match(home,/financeClient\.getSummary/,'Home deve usar dados financeiros reais quando autenticada.');
assert.match(home,/cardsClient\.list/,'Home deve usar cartões reais quando autenticada.');
assert.match(home,/financeClient\.getCashflow/,'Home deve usar fluxo diário real quando autenticada.');
assert.match(home,/payablesClient\.list/,'Home deve usar vencimentos reais quando autenticada.');
assert.match(home,/EvolutionLaunchModal/,'Home deve integrar o modal Evolution de lançamento.');
assert.match(home,/evo-home-add/,'Home deve exibir a ação Incluir.');
assert.doesNotMatch(home,/Plano Premium|Upgrade agora/,'Home não deve exibir oferta Premium nesta fase.');
assert.match(home,/EvolutionCards/,'Home deve integrar o módulo real de Cartões.');
assert.match(home,/EvolutionPayables/,'Home deve integrar o módulo real de Pendentes.');
assert.match(home,/EvolutionBenefits/,'Home deve integrar o módulo real de Benefícios.');
assert.match(home,/hasLoadedReal/,'Home autenticada não deve expor fixture enquanto os dados reais carregam.');
assert.match(home,/plotPoints/,'Gráficos devem derivar geometria dos dados reais.');
assert.doesNotMatch(home,/metricSparks/,'Sparklines decorativas fixas não devem substituir dados reais.');
assert.match(home,/trendMonthLabel/,'Rótulos do fluxo devem interpretar competências ISO corretamente.');
assert.match(home,/\.\/brand\/meg-loading-lockup\.svg/,'Home e Login devem compartilhar a mesma marca canônica.');

const transfer=fs.readFileSync(new URL('./screens/EvolutionTransferModal.tsx',import.meta.url),'utf8');
assert.match(transfer,/financeClient\.createTransfer/,'Transferência deve usar a API financeira real.');
assert.match(transfer,/financeClient\.getMonetaryBalance/,'Transferência deve validar saldo de origem.');
assert.match(transfer,/Saldo insuficiente/,'Transferência deve bloquear insuficiência de saldo.');

const payables=fs.readFileSync(new URL('./screens/EvolutionPayables.tsx',import.meta.url),'utf8');
assert.match(payables,/data-evolution-screen="payables"/);
assert.match(payables,/financeClient\.getMonetaryBalance/,'Baixa deve validar saldo monetário na data selecionada.');
assert.match(payables,/payablesClient\.pay/,'Pendentes oficiais devem usar a API real de baixa.');
assert.match(payables,/financeClient\.settleEvent/,'Pendentes originados de evento devem usar settlement real.');
assert.match(payables,/cardsClient\.payStatement/,'Faturas selecionadas em Pendentes devem usar pagamento real de fatura.');
assert.match(payables,/Saldo insuficiente|Faltam/,'Baixa deve bloquear e informar insuficiência de saldo.');

const cardsScreen=fs.readFileSync(new URL('./screens/EvolutionCards.tsx',import.meta.url),'utf8');
assert.match(cardsScreen,/data-evolution-screen="cards"/);
assert.match(cardsScreen,/data-evolution-screen="card-center"/);
assert.match(cardsScreen,/cardsClient\.payStatement/,'Pagamento de fatura deve usar API real.');
assert.match(cardsScreen,/financeClient\.getMonetaryBalance/,'Pagamento de fatura deve validar saldo monetário.');
assert.match(cardsScreen,/Pagar fatura/);
assert.match(cardsScreen,/Central do/);

const benefitsScreen=fs.readFileSync(new URL('./screens/EvolutionBenefits.tsx',import.meta.url),'utf8');
assert.match(benefitsScreen,/data-evolution-screen="benefits"/);
assert.match(benefitsScreen,/financeClient\.getBenefitSummary/,'Benefícios deve usar saldo real.');
assert.match(benefitsScreen,/financeClient\.createEvent/,'Recarga deve ser persistida como evento para aparecer no histórico.');
assert.match(benefitsScreen,/Registrar recarga/);
assert.match(benefitsScreen,/RECARGA VEROCARD/);

const launch=fs.readFileSync(new URL('./screens/EvolutionLaunchModal.tsx',import.meta.url),'utf8');
assert.match(launch,/Novo Lançamento/);
assert.match(launch,/À Vista/);
assert.match(launch,/Crédito/);
assert.match(launch,/Crediário/,'Crediário deve existir no Novo Lançamento conforme a referência aprovada.');
assert.match(launch,/payablesClient\.create/,'Crediário deve criar obrigações reais em Pendentes.');
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
assert.match(launch,/Escolha o tipo de lançamento/,'Abertura deve começar pela escolha do tipo.');
assert.match(launch,/Transferência/,'Abertura deve oferecer Transferência.');
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
assert.match(movements,/Buscar lançamentos/);
assert.match(movements,/evo-movement-table-approved/,'Desktop deve aproveitar tabela ampla conforme a referência aprovada.');
assert.match(movements,/Editar lançamento/,'Lançamentos deve integrar edição real.');
assert.match(movements,/cardsClient\.updatePurchase/,'Edição de compra no cartão deve preservar o domínio de cartões.');
assert.doesNotMatch(movements,/MegMobile|meg-mobile-/,'Lançamentos Evolution não pode reutilizar visual Mobile.');

const movementsCss=fs.readFileSync(new URL('./styles/movements.css',import.meta.url),'utf8');
assert.match(movementsCss,/evo-movement-layout-approved/,'Desktop deve manter tabela e detalhe lado a lado.');
assert.match(movementsCss,/evo-movement-table-approved \.rows/,'Lista densa deve rolar internamente.');

const launchCss=fs.readFileSync(new URL('./styles/launch-modal.css',import.meta.url),'utf8');
assert.match(launchCss,/\.evo-launch-backdrop/);
assert.match(launchCss,/backdrop-filter:blur/);
assert.match(launchCss,/\.evo-home-add/);
assert.match(launchCss,/\.evo-picker-grid/,'Picker visual deve usar grid próprio no Web.');
assert.match(launchCss,/\.evo-launch-choice-cards/,'Seleção do tipo deve usar cartões funcionais próprios.');
assert.match(launchCss,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'Modalidades de pagamento devem exibir as quatro opções aprovadas em desktop.');
assert.match(launchCss,/grid-template-columns:minmax\(0,1\.15fr\) minmax\(330px,\.85fr\)/,'Web deve ampliar o formulário em duas áreas funcionais, sem esticar a folha mobile.');
assert.match(launchCss,/\.evo-launch-history/,'Autocomplete visual deve ter superfície própria.');

const homeCss=fs.readFileSync(new URL('./styles/home.css',import.meta.url),'utf8');
assert.match(homeCss,/grid-template-columns:214px minmax\(0,1fr\)/,'Desktop deve preservar sidebar integrada.');
assert.match(homeCss,/height:100dvh/,'Home deve ocupar o viewport.');
assert.match(homeCss,/overflow:hidden/,'Home não deve depender de scroll geral.');
assert.match(homeCss,/evo-home-scroll/,'Listas densas devem usar scroll interno.');
assert.match(homeCss,/@media\(max-width:900px\)/,'Home precisa recompor a experiência em viewport estreito.');
assert.match(homeCss,/PASS 15 \/ DIMENSIONAMENTO REAL/,'Home deve ter regra explícita para dimensionamento do viewport desktop real.');
assert.match(homeCss,/PASS 16 \/ OFFICIAL NORTH/,'Home deve preservar o passe visual oficial orientado a produto.');

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
const previewCss=fs.readFileSync(new URL('./styles/preview.css',import.meta.url),'utf8');
assert.match(preview,/meg-finance-system-mark-transparent\.svg/,'Prévia do sistema deve usar a mesma arte de marca do App.');
assert.match(preview,/evo-app-home/,'Home da galeria deve usar a prancha-mãe fiel ao App.');
assert.match(previewCss,/APP FIDELITY MASTER/,'Galeria deve declarar explicitamente a camada de fidelidade ao App.');
assert.match(previewCss,/grid-template-columns:88px minmax\(0,1fr\)/,'Navegação desktop deve evoluir o Dock do App sem criar sidebar genérica.');
for(const token of ['#002e2f','#001f22','#20e7e0','#f5fbfb','#a8c7c7','#ff6278','#48f2c6','#ffd752','#53bcff']){
  assert.ok(previewCss.toLowerCase().includes(token),'Token visual real do App ausente na prancha-mãe: '+token);
}
assert.match(previewCss,/linear-gradient\(145deg,rgba\(5,74,74,\.84\),rgba\(2,49,52,\.94\)\)/,'Cards da Home-mãe devem preservar o acabamento real do App.');
