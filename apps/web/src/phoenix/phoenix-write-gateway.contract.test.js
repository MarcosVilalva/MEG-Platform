import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync(new URL('./data/phoenix-write-gateway.ts', import.meta.url), 'utf8');
const transferGateway = readFileSync(new URL('./data/phoenix-transfer-write-gateway.ts', import.meta.url), 'utf8');
const pendingGateway = readFileSync(new URL('./data/phoenix-pending-write-gateway.ts', import.meta.url), 'utf8');
const movements = readFileSync(new URL('./screens/PhoenixMovementsV15.tsx', import.meta.url), 'utf8');
const payables = readFileSync(new URL('./screens/PhoenixPayablesV15.tsx', import.meta.url), 'utf8');
const writeControl = readFileSync(new URL('./components/PhoenixLaunchWriteControl.tsx', import.meta.url), 'utf8');
const appShell = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('./simple-event-form-bridge.ts', import.meta.url), 'utf8');
const previewServer = readFileSync(new URL('../../phoenix-preview-server.mjs', import.meta.url), 'utf8');
const readModel = readFileSync(new URL('./data/load-phoenix-read-model.ts', import.meta.url), 'utf8');
const persistentSnapshot = readFileSync(new URL('./data/phoenix-persistent-snapshot.ts', import.meta.url), 'utf8');
const pendingStyles = readFileSync(new URL('./phoenix-pending-v15.css', import.meta.url), 'utf8');
const mainEntry = readFileSync(new URL('../app/main.tsx', import.meta.url), 'utf8');
const cardProjection = readFileSync(new URL('./data/card-movement-projection.ts', import.meta.url), 'utf8');
const cardDates = readFileSync(new URL('./data/card-dates.ts', import.meta.url), 'utf8');
const operationalCss = readFileSync(new URL('./phoenix-operational-mobile.css', import.meta.url), 'utf8');

assert.match(gateway, /simpleEvent:\s*true/,
  'Writer frontend de receita/despesa simples deve refletir a capacidade liberada no fluxo Phoenix.');
assert.match(gateway, /cardPurchase:\s*true/,
  'Writer frontend de compra no cartão deve refletir a capacidade específica liberada no fluxo Phoenix.');
assert.match(gateway, /benefitEvent:\s*true/,
  'Writer frontend de benefício deve refletir a capacidade específica liberada no fluxo Phoenix.');
assert.match(gateway, /existingOperationId\s*\|\|\s*operationId\(\)/,
  'Retry do mesmo comando deve poder reutilizar o mesmo operationId.');
assert.match(gateway, /operationId:\s*prepared\.operationId/,
  'Envio deve usar exatamente o operationId preparado antes da primeira tentativa.');
assert.match(gateway, /financeClient\.createEvent/,
  'Writer simples deve usar o domínio financeiro oficial.');
assert.match(gateway, /cardsClient\.createPurchase/,
  'Compra no crédito deve usar o domínio oficial de cartões, e não criar despesa monetária comum.');
assert.match(gateway, /export async function runPhoenixCardPurchaseEdit[\s\S]*cardsClient\.updatePurchase/,
  'Edição visual comum de cartão deve continuar recalculando parcelas pelo backend oficial de cartões.');
assert.match(gateway, /export async function runPhoenixCardPurchaseCancel[\s\S]*cardsClient\.cancelPurchaseProtected/,
  'Exclusão visual comum deve cancelar a compra pelo backend oficial, sem arquivar evento sintético.');
assert.match(gateway, /cardEditRequestKey[\s\S]*pendingCardEditOperations/,
  'Retry de edição do cartão deve manter operationId estável para o mesmo conteúdo.');
assert.match(gateway, /authenticatedRequest<FinancialEvent>\('\/finance\/benefit-events'/,
  'Benefício deve usar endpoint próprio em vez de cair no writer simples.');
assert.match(gateway, /operationId\('phoenix-benefit'\)/,
  'Movimentação do benefício deve nascer com operationId próprio para retry idempotente.');
assert.match(gateway, /operationId\('phoenix-card-purchase'\)/,
  'Compra no cartão deve nascer com operationId próprio para retry idempotente.');
assert.match(gateway, /status:\s*'accepted'; operationId: string; event: FinancialEvent/,
  'Receita, despesa e benefício devem distinguir aceite do servidor da releitura visual.');
assert.match(gateway, /snapshotAfterAccepted\(refreshMonth, 'simple-event-refresh-pending'\)/,
  'Lançamento simples não pode manter o formulário bloqueado esperando snapshot indefinidamente.');
assert.match(gateway, /snapshotAfterAccepted\(refreshMonth, 'benefit-event-refresh-pending'\)/,
  'Benefício deve liberar a interface após aceite e reler o saldo em segundo plano.');
assert.match(gateway, /onAccepted\?\.\(event\)/,
  'Edição deve possuir callback explícito de aceite antes da releitura.');
assert.match(gateway, /onAccepted\?\.\(\)/,
  'Exclusão deve possuir callback explícito de aceite antes da releitura.');
assert.match(gateway, /runtimeCapabilities\.benefitWrite/,
  'Writer do benefício deve exigir capacidade efetiva do ambiente imediatamente antes da mutação.');
assert.match(gateway, /runtimeCapabilities\.cardPurchaseWrite/,
  'Writer de cartão deve exigir capacidade efetiva do ambiente imediatamente antes da mutação.');
assert.match(gateway, /getPhoenixBenefitEventEligibility/,
  'Fluxo de benefício deve possuir elegibilidade própria, sem relaxar o writer simples.');
assert.match(gateway, /getPhoenixCardPurchaseEligibility/,
  'Fluxo de cartão deve possuir elegibilidade própria, sem relaxar as proteções do writer simples.');
assert.match(gateway, /PHOENIX_BENEFIT_NOT_IN_SIMPLE_FLOW:\s*'Movimentações de benefício usam o writer protegido do Benefício Alimentação\.'/,
  'Mensagem do writer simples deve encaminhar benefício ao writer específico já disponível.');
assert.match(gateway, /PHOENIX_CARD_NOT_IN_SIMPLE_FLOW:\s*'Compras no crédito são gravadas pelo writer protegido de cartões e faturas\.'/,
  'Mensagem do writer simples deve encaminhar crédito ao writer específico já disponível.');
assert.match(gateway, /flow\.manualDue[\s\S]*PHOENIX_CARD_MANUAL_DUE_NOT_SUPPORTED/,
  'Vencimento manual deve continuar protegido enquanto o contrato do domínio de cartões não suportar a exceção.');
assert.match(gateway, /input\.installments < 1 \|\| input\.installments > 48/,
  'Writer de cartão deve respeitar o limite de parcelas homologado pela API.');
assert.match(gateway, /input\.status !== 'paid'/,
  'Writer do benefício deve exigir situação realizada.');
assert.match(gateway, /clearPhoenixReadModelCache\(\)/);
assert.match(gateway, /loadPhoenixReadModel\(refreshMonth,\s*\{ force: true \}\)/,
  'Snapshot só deve ser recarregado depois da confirmação do servidor.');
assert.match(gateway, /input\.amount\s*===\s*0/,
  'Writer simples deve rejeitar zero e preservar valores negativos usados para estorno/reversão.');
assert.doesNotMatch(gateway, /getPhoenixSimpleEventEligibility[\s\S]{0,600}PHOENIX_REVERSAL_NOT_IN_SIMPLE_FLOW/,
  'Receita/despesa simples deve aceitar valor negativo; somente fluxos especializados mantêm proteção própria.');
assert.match(gateway, /type:\s*'income'\s*\|\s*'expense'/,
  'Gateway simples deve continuar restrito a receita/despesa; transferência usa contrato atômico próprio.');
assert.match(gateway, /status:\s*'planned'\s*\|\s*'paid'/,
  'Writer simples deve limitar a situação ao contrato explicitamente homologado.');
assert.match(gateway, /if \(!PHOENIX_WRITE_CAPABILITIES\.simpleEvent\)/,
  'Gateway deve continuar falhando fechado se a capacidade frontend for revogada.');
assert.match(gateway, /if \(!PHOENIX_WRITE_CAPABILITIES\.benefitEvent\)/,
  'Gateway de benefício deve falhar fechado se a capacidade frontend for revogada.');
assert.match(gateway, /if \(!PHOENIX_WRITE_CAPABILITIES\.cardPurchase\)/,
  'Gateway de cartão deve falhar fechado se a capacidade frontend for revogada.');
assert.match(gateway, /runPhoenixSimpleEventEdit/,
  'Edição simples deve permanecer encapsulada no gateway protegido da Phoenix.');
assert.match(gateway, /runPhoenixBenefitEventEdit/,
  'Edição do Vale Alimentação deve permanecer encapsulada no gateway protegido da Phoenix.');
assert.match(gateway, /\/finance\/benefit-events\/\$\{eventId\}/,
  'Alteração do benefício deve usar endpoint próprio do domínio.');
assert.match(gateway, /operationId\('phoenix-benefit-edit'\)/,
  'Retry de edição do benefício deve conservar identidade própria.');
assert.match(gateway, /expectedUpdatedAtById:\s*expectedUpdatedAt \? \{ \[eventId\]: expectedUpdatedAt \} : undefined/,
  'Edição deve enviar ao servidor a versão que estava aberta no dispositivo.');
assert.match(gateway, /FINANCIAL_EVENT_STALE_VERSION/,
  'Gateway deve explicar conflito concorrente sem sobrescrever silenciosamente.');
assert.match(gateway, /editRequestKey\(eventId, input, expectedUpdatedAt\)/,
  'Retry idempotente da edição deve ser separado pela versão esperada.');
assert.match(gateway, /runPhoenixSimpleEventArchive/,
  'Exclusão individual deve permanecer encapsulada no gateway protegido da Phoenix.');
assert.match(gateway, /archiveRequestKey = \`\$\{eventId\}:\$\{expectedUpdatedAt \|\| 'unknown'\}\`/,
  'Retry idempotente da exclusão deve respeitar a versão aberta no dispositivo.');
assert.match(gateway, /financeClient\.bulkArchiveEvents/,
  'Exclusão deve usar o endpoint idempotente de arquivamento, sem DELETE direto da tela.');
assert.match(gateway, /operationId\('phoenix-event-archive'\)/,
  'Exclusão deve possuir identidade explícita de mutação para permitir retry seguro.');
assert.match(gateway, /const snapshot = await confirmedSnapshot\(refreshMonth\)/,
  'Após excluir, a interface só pode atualizar depois da releitura confirmada.');
assert.match(gateway, /runtimeCapabilities\.bulkEventWrite/,
  'Edição deve exigir a capacidade bulk homologada no ambiente.');
assert.match(gateway, /financeClient\.bulkUpdateEvents/,
  'Edição deve usar o writer bulk idempotente, e não PATCH direto da tela.');
assert.match(gateway, /operationId\('phoenix-event-edit'\)/,
  'Cada edição deve possuir identidade explícita de mutação.');
assert.match(gateway, /const snapshot = await confirmedSnapshot\(refreshMonth\)/,
  'Edição só deve atualizar a interface depois da releitura confirmada.');

assert.match(transferGateway, /PHOENIX_TRANSFER_WRITE_ENABLED\s*=\s*true/,
  'Transferência deve possuir writer explícito em vez de mutação escondida no bridge.');
assert.match(transferGateway, /runtimeCapabilities\.transferWrite/,
  'Transferência deve exigir a capacidade efetiva do ambiente imediatamente antes da mutação.');
assert.match(transferGateway, /authenticatedRequest<PhoenixTransferResult>\('\/finance\/transfers'/,
  'Gateway de transferência deve usar exclusivamente o endpoint atômico oficial.');
assert.match(transferGateway, /input\.sourceAccountId === input\.destinationAccountId/,
  'Writer deve rejeitar transferência para a mesma conta.');
assert.match(transferGateway, /prepared\.operationId/,
  'Retry de transferência deve preservar o operationId preparado.');
assert.match(transferGateway, /status:\s*'accepted'; operationId: string; result: PhoenixTransferResult/,
  'Transferência deve distinguir aceite atômico da releitura visual.');
assert.match(transferGateway, /PHOENIX_TRANSFER_REFRESH_TIMEOUT/,
  'Transferência não pode manter o drawer preso se a releitura posterior atrasar.');
assert.match(writeControl, /state\.status !== 'accepted'[\s\S]*onAccepted\?\.\(\)/,
  'Controle de lançamento deve fechar após aceite de qualquer writer especializado.');
assert.match(writeControl, /onBusyChange\?\.\(commitState === 'saving'\)/,
  'Drawer deve saber quando a mutação está realmente em voo para impedir descarte acidental.');
assert.match(movements, /launchWriteBusy[\s\S]*aguarda a confirmação do servidor/,
  'Fechamento durante uma mutação em voo deve explicar o bloqueio sem perder o rascunho.');
assert.match(transferGateway, /clearPhoenixReadModelCache\(\)/);
assert.match(transferGateway, /loadPhoenixReadModel\(refreshMonth,\s*\{ force: true \}\)/,
  'Transferência deve reler o snapshot real antes de ser tratada como concluída.');

assert.match(pendingGateway, /PHOENIX_SNAPSHOT_COMMITTED_EVENT\s*=\s*'meg:phoenix-snapshot-committed'/,
  'Baixa confirmada deve publicar uma fotografia oficial para o shell sem depender de novo GET.');
assert.match(pendingGateway, /publishCommittedSnapshot\(snapshot\)/,
  'Snapshot de Pendentes deve ser publicado somente depois da releitura confirmada.');
assert.match(pendingGateway, /new CustomEvent\(PHOENIX_SNAPSHOT_COMMITTED_EVENT,\s*\{ detail: \{ snapshot \} \}\)/,
  'Evento de commit deve transportar a mesma fotografia já confirmada pelo gateway.');
assert.doesNotMatch(payables, /window\.confirm|window\.alert/,
  'Pendentes não pode usar confirmação nativa do navegador depois da revisão MEG.');
assert.match(payables, /Confirmar baixa de \$\{selectedItems\.length\}/,
  'Modal de revisão deve exigir confirmação explícita antes de enviar o lote.');
assert.match(pendingGateway, /AbortSignal\.timeout\(10_000\)/,
  'Baixa em lote deve limitar a espera direta e migrar para confirmação por recibo quando necessário.');
assert.match(pendingGateway, /PHOENIX_PENDING_CONNECTION_INTERRUPTED/,
  'Falha de transporte deve orientar retry idempotente em vez de erro genérico.');
assert.match(pendingGateway, /recoverPendingConfirmation/,
  'Falha incerta deve consultar o recibo idempotente antes de declarar a baixa como não confirmada.');
assert.match(pendingGateway, /maxWaitMs = 20_000/,
  'Recuperação deve cobrir a janela transacional restante antes de declarar o lote não confirmado.');
assert.match(pendingGateway, /PENDING_CHANGED_RETRY/,
  'Mudança concorrente de pendência deve consultar o recibo da tentativa antes de exibir falha.');
assert.match(pendingGateway, /FINANCIAL_EVENT_NOT_PENDING/,
  'Retry concorrente de evento já baixado deve permitir recuperar a confirmação original.');
assert.match(pendingGateway, /\/finance\/pending\/operations\//,
  'Confirmação de baixa deve possuir endpoint de consulta por operationId.');
assert.match(pendingGateway, /cache:\s*'no-store'/,
  'Polling de confirmação não pode reutilizar resposta GET em cache.');
assert.match(pendingGateway, /onCommitted\?\.\(result\)/,
  'Baixa deve refletir na interface assim que o servidor confirmar, antes da releitura completa.');
assert.match(pendingGateway, /status:\s*'confirmed'.*result/s,
  'Confirmação do servidor deve existir mesmo se a releitura posterior falhar.');
assert.match(payables, /locallySettled/,
  'Pendentes confirmados devem sair imediatamente da grade enquanto a releitura ocorre em segundo plano.');

assert.doesNotMatch(payables, /setLocallySettled\(new Set\(\)\)/,
  'Snapshot posterior não pode liberar imediatamente a proteção local e ressuscitar pendências já confirmadas.');
assert.match(payables, /snapshotOpenIds/,
  'Proteção local deve ser reconciliada somente quando a fotografia autoritativa deixar de listar os itens.');
assert.match(payables, /px-pending-confirm-modal/,
  'Baixa deve usar modal MEG próprio para confirmação financeira.');
assert.match(payables, /px-pending-success-modal/,
  'Servidor confirmado deve gerar modal visual de sucesso da operação.');
assert.doesNotMatch(payables, /px-pending-attention/,
  'Layout definitivo não deve reintroduzir a faixa redundante de atenção entre cabeçalho e KPIs.');
assert.match(payables, /px-pending-commandbar/,
  'Busca, filtros de prioridade e agrupamento devem permanecer na mesma barra operacional.');
assert.match(payables, /px-pending-command-tabs/,
  'Filtros rápidos de Pendentes devem permanecer integrados à barra de busca.');
assert.match(payables, /px-pending-agenda-head/,
  'Lista deve possuir cabeçalho próprio para os lançamentos pendentes.');
assert.match(payables, /Lançamentos pendentes/,
  'Módulo operacional deve manter o título definitivo aprovado.');
assert.doesNotMatch(payables, /Leitura consolidada:/,
  'Aviso técnico de leitura consolidada não deve ocupar espaço na interface operacional.');
assert.match(readModel, /forceNetwork:\s*Boolean\(options\.force\)/,
  'Releitura forçada pós-baixa deve atravessar o cache do cliente.');
assert.match(readModel, /cache:\s*'no-store'/,
  'Snapshot pós-baixa deve consultar a API sem cache.');
assert.match(readModel, /invalidatePhoenixReadModelMonth/,
  'Mês alterado deve possuir invalidação explícita de cache.');

assert.match(readModel, /readModelGeneration/,
  'Fotografias em segundo plano devem usar geração para não sobrescrever uma baixa posterior.');
assert.match(readModel, /generation !== generationForMonth\(month\)/,
  'Revalidação antiga deve ser descartada quando uma mutação financeira avançar a geração do mês.');
assert.match(readModel, /supplementalScheduled/,
  'Hidratação auxiliar agendada deve participar da invalidação pós-baixa.');
assert.match(persistentSnapshot, /deletePhoenixPersistentSnapshot/,
  'Fotografia IndexedDB anterior à baixa deve ser removível.');
assert.match(pendingStyles, /px-pending-cockpit[\s\S]*px-pending-kpis/,
  'Tela deve manter o cockpit visual e seus indicadores de prioridade.');
assert.match(pendingStyles, /px-pending-commandbar[\s\S]*grid-template-columns/,
  'Toolbar definitiva deve organizar busca, filtros e agrupamento em uma linha de comando.');
assert.match(pendingStyles, /px-pending-agenda[\s\S]*px-pending-agenda-head/,
  'Agenda deve possuir container premium e cabeçalho visual próprio.');
assert.match(pendingStyles, /px-pending-kpi-icon/,
  'KPIs definitivos devem manter iconografia contextual.');
assert.match(pendingStyles, /\.px-pending-kpis \.px-pending-kpi-icon[\s\S]*display:grid/,
  'Badge de KPI deve preservar grid próprio mesmo diante da regra genérica de spans.');
assert.match(pendingStyles, /place-items:center;[\s\S]*place-content:center;/,
  'Badges de ícones devem centralizar o glifo nos dois eixos.');
assert.match(pendingStyles, /px-pending-kpi-icon > svg[\s\S]*display:block/,
  'SVG dos badges deve sair do baseline inline para centralização óptica estável.');
assert.match(pendingStyles, /\.phoenix-v15 \.px-main-payables[\s\S]*position:relative !important[\s\S]*height:100dvh !important/,
  'Workspace de Pendentes deve possuir âncora geométrica explícita no viewport.');
assert.match(pendingStyles, /grid-template-rows:72px 82px 54px minmax\(0,1fr\)/,
  'Desktop deve possuir quatro faixas explícitas: hero, KPIs, toolbar e agenda flexível.');
assert.match(pendingStyles, /padding:8px 16px 10px(?: !important)?;/,
  'Conteúdo deve começar imediatamente abaixo da topbar com respiro curto e previsível.');
assert.match(pendingStyles, /grid-template-columns:minmax\(360px,1fr\) auto 1px minmax\(190px,220px\) auto/,
  'Toolbar deve distribuir busca, filtros, agrupamento e contador em proporções explícitas.');
assert.match(pendingStyles, /px-pending-agenda-head[\s\S]*min-height:58px/,
  'Cabeçalho da agenda deve manter altura compacta e previsível.');
assert.match(pendingStyles, /px-pending-date-cluster-head[\s\S]*min-height:60px/,
  'Grupos por data devem manter ritmo vertical consistente.');
assert.equal((pendingStyles.match(/\.px-main-payables\s*\{/g) || []).length, 1,
  'Layout canônico deve ter uma única regra desktop de px-main-payables; mobile apenas neutraliza o comportamento sem duplicar a camada estrutural.');
assert.doesNotMatch(pendingStyles, /Cockpit de Pendentes|Pendentes em modo cockpit fixo|Refinamento de composição/,
  'Arquivo de Pendentes não pode reter gerações visuais antigas concorrendo na cascata.');
assert.doesNotMatch(pendingStyles, /\.px-pending-attention(?:\s|\{|\.)/,
  'Faixa de atenção removida não deve permanecer como CSS legado.');
assert.match(payables, /data-pending-layout="canonical-v3"/,
  'Tela deve expor o marcador da geometria canônica v3.');
assert.match(pendingStyles, /\.phoenix-v15 \.px-main-payables > \.px-content-payables[\s\S]*inset:64px 0 0 0 !important/,
  'Conteúdo de Pendentes deve ficar ancorado exatamente abaixo da topbar.');
assert.match(pendingStyles, /grid-template-rows:72px 82px 54px minmax\(0,1fr\) !important/,
  'Hero, KPIs, toolbar e agenda devem ocupar faixas explícitas sem sobreposição.');
assert.match(pendingStyles, /\.px-pending-hero[\s\S]*grid-row:1 !important/,
  'Hero deve permanecer exclusivamente na primeira faixa.');
assert.match(pendingStyles, /\.px-pending-kpis[\s\S]*grid-row:2 !important/,
  'KPIs devem permanecer exclusivamente na segunda faixa.');
assert.match(pendingStyles, /\.px-pending-commandbar[\s\S]*grid-row:3 !important/,
  'Toolbar deve permanecer exclusivamente na terceira faixa.');
assert.match(pendingStyles, /\.px-pending-layout[\s\S]*grid-row:4 !important/,
  'Agenda deve ocupar somente a quarta faixa e todo o espaço restante.');

assert.match(appShell, /px-main-payables/,
  'Shell deve isolar o viewport apenas quando a aba Pendentes estiver ativa.');
assert.match(appShell, /px-content-payables/,
  'Conteúdo de Pendentes deve possuir classe própria para travar o scroll global sem afetar outras telas.');
assert.match(payables, /px-pending-scroll-region/,
  'Somente a agenda de compromissos deve possuir região própria de rolagem.');
assert.match(payables, /pendingScrollRef/,
  'A rolagem operacional deve possuir referência explícita para mouse e teclado.');
assert.match(payables, /ArrowDown[\s\S]*ArrowUp[\s\S]*PageDown[\s\S]*PageUp[\s\S]*Home[\s\S]*End/,
  'Pendentes deve aceitar setas, Page Up/Down e Home/End na agenda rolável.');
assert.match(payables, /routeWheelToPendingList/,
  'Rodinha fora da agenda deve ser redirecionada para a lista sem mover a página inteira.');
assert.match(pendingStyles, /\.phoenix-v15 \.px-main-payables\s*\{[\s\S]*height:100dvh !important[\s\S]*overflow:hidden !important/,
  'Desktop de Pendentes deve travar o scroll do workspace inteiro.');
assert.match(pendingStyles, /\.px-pending-scroll-region\s*\{[\s\S]*overflow-y:auto;[\s\S]*overscroll-behavior:contain;/,
  'Lista de compromissos deve concentrar a rolagem vertical e impedir encadeamento para a página.');
assert.match(pendingStyles, /@media \(max-width:760px\)[\s\S]*\.px-main-payables[\s\S]*overflow:visible/,
  'Mobile deve manter rolagem natural para evitar aprisionamento do viewport.');

assert.doesNotMatch(movements, /submitPhoenixSimpleEvent|runPhoenixSimpleEventWrite|cardsClient\.createPurchase|\/finance\/benefit-events/,
  'Tela React base não deve acionar criação diretamente; a confirmação fica isolada no controle protegido.');
assert.doesNotMatch(movements, /financeClient\.updateEvent|financeClient\.bulkUpdateEvents|clearPhoenixReadModelCache|loadPhoenixReadModel\(data\.month/,
  'Tela de Lançamentos não pode administrar diretamente a mutação e releitura.');
assert.match(movements, /runPhoenixSimpleEventEdit/,
  'Tela deve encaminhar a edição ao gateway Phoenix em vez de acessar cliente mutável.');
assert.match(movements, /editingEventUpdatedAt/,
  'Editor deve preservar a versão do lançamento carregado antes de permitir salvar ou excluir.');
assert.match(movements, /event\.updatedAt \|\| null/,
  'Versão inicial da edição deve vir do updatedAt real do servidor.');
assert.match(movements, /runPhoenixSimpleEventArchive/,
  'Editor deve encaminhar a exclusão ao gateway protegido.');
assert.match(movements, /Excluir lançamento/,
  'Editor deve expor a ação de excluir o lançamento.');
assert.match(movements, /Deseja excluir este lançamento\?/,
  'Exclusão financeira deve exigir confirmação explícita.');
assert.match(movements, /Deseja realmente baixar a pendência\?/,
  'Troca de Pendente para Pago deve exigir confirmação explícita antes da baixa.');
assert.match(movements, /editingEvent\.status === 'planned' && effectiveSituation === 'paid'/,
  'Confirmação de baixa deve ser acionada somente quando uma pendência existente passa a Pago.');
assert.match(movements, /isPixMethod[\s\S]*Pagamento via Pix é imediato e fica como Pago\./,
  'Despesa paga por Pix deve assumir situação Paga automaticamente.');
assert.match(movements, /runPhoenixBenefitEventEdit/,
  'Edição do Vale Alimentação deve usar seu writer protegido.');
assert.match(movements, /data-phoenix-generic-delete[\s\S]*Excluir lançamento/,
  'Detalhes do lançamento devem permitir exclusão direta sem obrigar a entrada no editor.');
assert.match(movements, />Cancelar<\//,
  'Editor deve expor cancelamento explícito além de salvar e excluir.');
assert.match(movements, /isCardDomainEvent\(detailEvent\)/,
  'A tela deve reconhecer apenas a projeção técnica do cartão para atualizar parcelas vinculadas.');
assert.match(movements, /function openEventForEdit\(event: FinancialEvent\) \{[\s\S]*openLaunch\(event\);/,
  'Cartão deve abrir o mesmo editor visual usado pelos lançamentos comuns.');
assert.match(movements, /runPhoenixCardPurchaseEdit/,
  'Salvar um lançamento projetado de cartão deve usar o writer protegido que recalcula a fatura.');
assert.match(movements, /runPhoenixCardPurchaseCancel/,
  'Excluir um lançamento projetado de cartão deve cancelar a compra e suas parcelas vinculadas.');
assert.match(movements, /patchCardPurchaseInReadModel/,
  'Edição do cartão deve aplicar o retorno confirmado imediatamente antes da releitura completa.');
assert.match(movements, /removeCardPurchaseFromReadModel/,
  'Exclusão de cartão deve retirar a compra da projeção imediatamente após aceite do servidor.');
assert.match(movements, /Somente no pagamento da fatura/,
  'Compra no cartão não deve exigir uma conta monetária no momento da compra.');
assert.match(movements, /Data da compra \*/,
  'Formulário de cartão deve distinguir explicitamente data da compra de vencimento.');
assert.match(movements, /Competência nos Lançamentos/,
  'Editor deve mostrar a competência calculada pelo vencimento antes de salvar.');
assert.match(movements, /Salvar alterações/,
  'Edição deve possuir uma ação direta de salvar sem etapa obrigatória de revisão.');
assert.doesNotMatch(movements, /Revisar alterações/,
  'Edição não deve exigir ciclo redundante Revisar alterações → Salvar alterações.');
assert.match(operationalCss, /\.px-edit-launch-actions\{[\s\S]*position:sticky!important/,
  'Ações da edição mobile devem acompanhar o formulário sem cobrir permanentemente os campos.');
assert.doesNotMatch(operationalCss, /\.px-edit-launch-actions,\s*\nbody\.meg-operational-mobile \.px-launch-write-panel/,
  'Rodapé de edição não pode voltar ao mesmo bloco fixed usado pelo writer de criação.');
assert.match(movements, /cardPaymentMethodId[\s\S]*cardId: cardLink\?\.card\.id[\s\S]*installments:/,
  'Editor comum deve recuperar cartão, forma de pagamento e parcelamento da compra projetada.');
assert.doesNotMatch(movements, /DOMÍNIO DE CARTÕES\/FATURAS|Editar compra no cartão/,
  'Lançamentos não devem expor um editor ou linguagem de domínio paralelo para cartões.');
assert.doesNotMatch(mainEntry, /card-event-form-bridge|card-purchase-edit-bridge|card-movement-readonly-bridge/,
  'Runtime oficial não deve carregar bridges legados que interceptam cartões com telas paralelas.');
assert.doesNotMatch(cardProjection, /Domínio de cartões\/faturas/,
  'A projeção mensal do cartão deve aparecer ao usuário como lançamento comum.');
assert.match(cardProjection, /cardId:[\s\S]*purchaseId:[\s\S]*purchaseDate/,
  'A projeção deve preservar IDs técnicos para que o editor comum atualize a compra correta.');
assert.match(cardProjection, /dueCompetence = cardCompetenceFromDueDate\(dueDate\)/,
  'Competência do lançamento de cartão deve vir do vencimento final.');
assert.match(cardDates, /nextWeekdayCardDueDate/,
  'Regra visual deve compartilhar o ajuste de fim de semana do vencimento.');
assert.match(movements, /data\.user\.role === 'ADMIN' \|\| data\.user\.role === 'MANAGER'/,
  'Ação de exclusão deve respeitar a mesma permissão administrativa da API.');
assert.doesNotMatch(movements, /financeClient\.bulkArchiveEvents|financeClient\.archiveEvent/,
  'Tela não pode acessar cliente mutável diretamente para excluir.');
assert.match(movements, /amount:\s*\(negative \? -1 : 1\) \* amountCents \/ 100/,
  'Edição/criação simples deve enviar o sinal escolhido ao domínio financeiro.');
assert.match(movements, /px-sign-toggle[\s\S]*\+ Positivo[\s\S]*Negativo \/ estorno/,
  'Web e Android devem oferecer controle explícito para trocar o sinal do lançamento.');
assert.match(movements, /setNegative\(value\.includes\('-'\)\)/,
  'Remover o sinal negativo no campo deve realmente voltar o lançamento para positivo.');
assert.match(movements, /setNegative\(cardLink \? false : displayEffect\(event\) < 0\)/,
  'Ao editar, o sinal inicial deve vir do efeito financeiro; compras de cartão permanecem positivas e alocadas na fatura.');
assert.doesNotMatch(movements, /draft\.type === 'transfer' \|\| negative \|\| benefit/,
  'Troca de sinal em receita/despesa simples não pode ser bloqueada pela edição protegida.');
assert.match(movements, /PhoenixLaunchWriteControl/,
  'Primeira etapa visual deve revisar e delegar a segunda etapa ao controle protegido de confirmação.');
assert.match(movements, /cardInput=\{cardWriteInput\}/,
  'Compra no crédito deve entregar um comando de cartão ao controle protegido, sem mutar o domínio diretamente.');
assert.match(movements, /refreshMonth=\{data\.month\}/,
  'Após a compra, a releitura deve preservar a competência atualmente aberta no shell.');
assert.match(movements, /onDataCommitted\?\.\(snapshot\)/,
  'Snapshot confirmado deve ser propagado imediatamente ao shell global.');
assert.match(movements, /event\.category\?\.name \|\| event\.sourceDetails\?\.group/,
  'Grade deve priorizar a categoria normalizada após uma edição confirmada.');
assert.match(movements, /eventStatus\(event\.status\) \|\| event\.sourceDetails\?\.situation/,
  'Situação exibida deve priorizar o status normalizado confirmado pelo backend.');
assert.match(appShell, /function commitSnapshot\(snapshot: PhoenixReadModel\)/,
  'Shell deve incorporar a fotografia confirmada sem exigir nova consulta.');
assert.match(appShell, /onDataCommitted=\{commitSnapshot\}/,
  'Lançamentos deve entregar a fotografia confirmada ao shell global.');
assert.match(appShell, /addEventListener\(PHOENIX_SNAPSHOT_COMMITTED_EVENT,\s*handleCommittedSnapshot/,
  'Shell deve incorporar também a fotografia confirmada por baixas em Pendentes.');
assert.match(appShell, /event\?\.type === 'focus' && !event\.isTrusted/,
  'Focus sintético legado não pode provocar uma segunda leitura após a baixa já confirmada.');
assert.match(writeControl, /getPhoenixRuntimeWriteCapabilities\(true\)/,
  'Controle de confirmação deve verificar o gate de runtime antes de habilitar a ação final.');
assert.match(writeControl, /runPhoenixSimpleEventWrite/,
  'Controle de confirmação deve usar exclusivamente o gateway financeiro protegido para lançamento simples.');
assert.match(writeControl, /runPhoenixBenefitEventWrite/,
  'Controle deve rotear conta de benefício para o writer protegido do Benefício Alimentação.');
assert.match(writeControl, /runPhoenixCardPurchaseWrite/,
  'Controle deve rotear crédito para o writer protegido de cartões.');
assert.match(writeControl, /capabilities\.benefitWrite/,
  'A ação de benefício só pode ser habilitada quando o runtime declarar a capacidade específica.');
assert.match(writeControl, /capabilities\.cardPurchaseWrite/,
  'A ação de cartão só pode ser habilitada quando o runtime declarar a capacidade específica.');
assert.match(writeControl, /const benefitFlow = Boolean\(flow\.benefit/,
  'Conta de benefício deve ter precedência sobre o roteamento de cartão.');
assert.match(writeControl, /const cardFlow = Boolean\(flow\.credit && !benefitFlow/,
  'Pagamento selecionado por engano não pode desviar uma conta benefit para o domínio de cartões.');
assert.match(writeControl, /projectedCardEvent/,
  'Após confirmação, o controle deve localizar a projeção da parcela no snapshot quando ela pertence ao mês visível.');
assert.match(writeControl, /benefitFlow \? !benefitInput : cardFlow \? !cardInput : !input/,
  'O controle não pode entrar em estado saving quando não há comando válido para o fluxo selecionado.');
assert.match(writeControl, /duplicateAccepted/,
  'Possível duplicidade deve exigir aceite explícito antes da confirmação.');
assert.match(writeControl, /preparedBenefitRef/,
  'Retry de benefício após falha incerta deve preservar o comando preparado e o operationId.');
assert.match(writeControl, /preparedCardRef/,
  'Retry de cartão após falha incerta deve preservar o comando preparado e o operationId.');
assert.match(gateway, /status:\s*'accepted'/,
  'Compra no cartão deve distinguir aceite autoritativo da releitura posterior da tela.');
assert.match(gateway, /onState\?\.\(accepted\)/,
  'Writer de cartão deve avisar a interface assim que a API aceitar a compra.');
assert.match(gateway, /PHOENIX_CARD_REFRESH_TIMEOUT/,
  'Releitura de cartão deve possuir limite para não prender o modal indefinidamente.');
assert.match(gateway, /reason:\s*'card-refresh-pending'/,
  'Compra aceita deve solicitar atualização em segundo plano se a releitura imediata atrasar.');
assert.match(writeControl, /state\.status !== 'accepted'[\s\S]*onAccepted\?\.\(\)/,
  'Controle de lançamento deve permitir fechar o drawer após aceite real do cartão.');
assert.match(movements, /onAccepted=\{\(\) => \{[\s\S]*setLaunchOpen\(false\)/,
  'Drawer deve fechar após a compra ser aceita, sem aguardar a fotografia completa.');
assert.match(appShell, /addEventListener\('meg:data-invalidated', refreshAfterMutation\)/,
  'Shell deve reagir às mutações confirmadas e atualizar a fotografia em segundo plano.');
assert.match(writeControl, /preparedRef/,
  'Retry após falha incerta deve preservar o comando preparado e o operationId.');

assert.match(bridge, /preparePhoenixSimpleEvent/,
  'Bridge homologado deve preparar o comando simples antes do envio.');
assert.match(bridge, /runPhoenixSimpleEventWrite/,
  'Bridge homologado deve executar o gateway oficial e aguardar confirmação.');
assert.match(bridge, /preparePhoenixTransfer/,
  'Bridge deve delegar a preparação da transferência ao gateway protegido.');
assert.match(bridge, /runPhoenixTransferWrite/,
  'Bridge deve delegar a mutação e releitura da transferência ao gateway protegido.');
assert.doesNotMatch(bridge, /authenticatedRequest\('\/finance\/transfers'/,
  'Bridge visual não pode mais gravar transferências diretamente na API.');
assert.match(bridge, /meg:phoenix-snapshot-committed/,
  'Transferência e lançamento simples confirmados devem publicar a fotografia já relida ao shell.');
assert.match(bridge, /state\.operationId\s*=\s*prepared\.operationId/,
  'Bridge deve preservar operationId para retry idempotente.');
assert.match(bridge, /result\.status !== 'confirmed'/,
  'Bridge não pode tratar uma gravação como concluída sem confirmação do servidor.');
assert.match(bridge, /payablesClient\.createRecurring/,
  'Recorrência de despesa deve usar o domínio oficial de contas a pagar.');
assert.match(bridge, /const amount = parseMoney/,
  'Receita/despesa simples deve preservar o sinal digitado para estornos.');
assert.match(bridge, /const cardFlow = Boolean\(root\.querySelector\('\.px-card-box'\)\)[\s\S]*if \(editing \|\| cardFlow\) return;/,
  'Bridge legado não pode interceptar edição nem criação de cartão já controladas pela Phoenix React.');
assert.doesNotMatch(bridge, /Cartão e crediário usam o writer específico do domínio de faturas/,
  'Interface não deve expor linguagem técnica de writer/domínio para o usuário.');
assert.match(bridge, /SALVAR COMO MODELO/);
assert.match(bridge, /label\.hidden\s*=\s*true/,
  'Função sem contrato backend não deve ser oferecida como gravação disponível.');

assert.match(previewServer, /simpleEventWriteEnabled\s*=\s*process\.env\.PHOENIX_SIMPLE_EVENT_WRITE\s*===\s*'enabled'/,
  'Proxy deve exigir flag explícita além da capacidade frontend.');
assert.match(previewServer, /cardPurchaseWriteEnabled\s*=\s*process\.env\.PHOENIX_CARD_PURCHASE_WRITE\s*===\s*'enabled'/,
  'Proxy de cartão deve exigir flag própria para liberar criação de compras.');
assert.match(previewServer, /benefitWriteEnabled\s*=\s*process\.env\.PHOENIX_BENEFIT_WRITE\s*===\s*'enabled'/,
  'Proxy de benefício deve exigir flag própria para liberar movimentações.');
assert.match(previewServer, /transferWriteEnabled\s*=\s*process\.env\.PHOENIX_TRANSFER_WRITE\s*===\s*'enabled'/,
  'Proxy de transferência deve exigir flag própria para liberar a operação atômica.');
assert.match(previewServer, /allowedBenefitPosts\s*=\s*new Set\(\['\/finance\/benefit-events'\]\)/,
  'Proxy de benefício deve limitar criação ao endpoint protegido específico.');
assert.match(previewServer, /allowedTransferPosts\s*=\s*new Set\(\['\/finance\/transfers'\]\)/,
  'Proxy de transferência deve limitar criação ao endpoint atômico específico.');
assert.match(previewServer, /allowedCardPurchasePosts\s*=\s*new Set\(\['\/cards\/purchases'\]\)/,
  'Proxy de cartão deve limitar criação ao endpoint oficial de compras.');
assert.match(previewServer, /isAllowedCardPurchaseWrite\(method, pathname\)/,
  'POST/PATCH/DELETE de compra devem passar pelo gate específico de cartão.');
assert.match(previewServer, /benefitWrite:\s*benefitWriteEnabled/,
  'Preview-health deve publicar a capacidade de benefício usada pelo frontend.');
assert.match(previewServer, /transferWrite:\s*transferWriteEnabled/,
  'Preview-health deve publicar a capacidade de transferência usada pelo frontend.');
assert.match(previewServer, /cardPurchaseWrite:\s*cardPurchaseWriteEnabled/,
  'Preview-health deve publicar a capacidade de cartão usada pelo frontend.');
assert.match(previewServer, /allowedFinancialPosts\s*=\s*new Set\(\['\/finance\/events'\]\)/,
  'Proxy isolado do writer simples deve aceitar somente o endpoint exato de criação quando a flag estiver ligada.');
assert.match(previewServer, /simpleEventWriteEnabled\s*&&\s*allowedFinancialPosts\.has\(pathname\)/,
  'Allowlist financeira simples não pode funcionar com a flag do ambiente desligada.');
assert.match(previewServer, /benefitWriteEnabled\s*&&\s*allowedBenefitPosts\.has\(pathname\)/,
  'Allowlist do benefício não pode funcionar com a flag do ambiente desligada.');
assert.match(previewServer, /transferWriteEnabled\s*&&\s*allowedTransferPosts\.has\(pathname\)/,
  'Allowlist de transferência não pode funcionar com a flag do ambiente desligada.');
assert.match(previewServer, /bulkEventWriteEnabled\s*&&\s*allowedBulkEventPosts\.has\(pathname\)/,
  'Edição no preview deve permanecer atrás da flag bulk explícita.');
assert.match(previewServer, /PREVIEW_READ_ONLY/,
  'Mutações não habilitadas no ambiente isolado devem continuar bloqueadas pelo proxy.');

console.log('Writers Phoenix validados: criação simples, Benefício Alimentação, compra real no cartão, transferência atômica, edição protegida, baixa com snapshot imediato e preview gated.');
